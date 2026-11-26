---
title: 'No Internet in Ascend Data Centers? How to Deploy? ModelSphere K8s Offline Deployment in Practice'
summary: 'Designed for air-gapped, private Ascend deployments, ModelSphere provides an offline Kubernetes installation workflow. Using a four-node Ascend 910B4 server cluster as an example, this guide walks you through offline artifact preparation, cluster bootstrapping, deploying a 4-replica GLM-5.3-Flash service, and verifying unified gateway inference.'
cover:
  src: cover.en.jpg
  alt: 'No Internet in Ascend Data Centers? ModelSphere K8s Offline Deployment in Practice'
  width: 2752
  height: 1536
---

> Designed for air-gapped data centers with no internet access, ModelSphere provides a Kubernetes-based offline deployment solution. Using four Ascend 910B4 servers as a reference architecture, this guide walks you through preparing offline bundles, bootstrapping the cluster, deploying a four-replica GLM-5.3-Flash service via the web console, and verifying end-to-end inference requests.

Following the open-source release of ModelSphere, a clear requirement emerged from the community: teams want to run models on their own Ascend hardware, and many data centers enforce strict air-gapped network isolation with no external internet connectivity.

**Internet-connected environments can follow the standard ModelSphere deployment workflow directly; for these air-gapped scenarios without internet access, ModelSphere provides a dedicated Kubernetes-based offline deployment workflow.** You first prepare all cluster base tools, platform component container images, Helm charts, model catalog snapshots, inference engine images, and model weights on an internet-connected build machine, then transfer these artifacts into the air-gapped data center for installation.

Once inside the data center, container images are pulled from a local registry, components are installed via local Helm charts, and the web console reads directly from an in-cluster model catalog service. With all deployment dependencies served over the intranet, you can create model services through the web UI, expose them via a unified gateway, and manage replica scaling and version upgrades.

Below, using four Ascend 910B4 servers as an example, we will walk step by step from preparing offline artifacts on an online machine to standing up the environment, deploying four independent replicas based on the GLM-5.3-Flash (W8A8) recipe, and verifying that the model serves responses properly through the unified endpoint.

## 01 Understanding the End-to-End Deployment Pipeline

The deployment workflow spans three distinct operational roles: **an internet-connected build machine prepares the offline artifacts, an on-premise bastion/ops machine initializes the nodes, and four Ascend servers run Kubernetes, the ModelSphere platform, and the model workloads.**

| Operational Role           | Responsibilities                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Online Build Machine**   | Downloads base cluster binaries; packages platform images, Helm charts, and model catalog snapshots; separately pulls the inference engine image; and stages model weights and ops dependencies. |
| **On-Premise Ops Machine** | Initializes the four Ascend servers via SSH and Ansible (can be any Linux host inside the data center).                                                                                          |
| **4 Ascend Servers**       | Server 1 acts as the control plane, local container registry, and NPU worker node; the remaining three servers act as NPU worker nodes, each running one 8-NPU (`TP=8`) model replica.           |

After transferring the repository code, offline bundle directory, ops dependencies, and model weights into the data center, the deployment proceeds in three phases: **Set up the local registry and Kubernetes cluster → Install the CNI plugin, Ascend Device Plugin, and ModelSphere platform → Select a recipe in the console to deploy the model.**

![Offline deployment and data center model architecture](offline-k8s-architecture.en.png)

_Caption: The 4 servers house a total of 32 Ascend 910B4 NPUs, with each model replica utilizing all 8 NPUs on a single node. The online build machine prepares platform artifacts and the inference engine image in a two-step workflow before transferring them alongside the source code and model weights into the data center. Ensure adequate disk space is provisioned based on actual build and download sizes._

Note that this guide uses a **streamlined four-node topology with a single control plane** to demonstrate the full offline deployment pipeline with minimal hardware. For high-availability (HA) production environments, two additional architectural considerations are required: first, provision three dedicated control-plane nodes and ensure high availability for the local container registry; second, configure persistent storage—the monitoring stack in this guide uses ephemeral storage by default, meaning Prometheus metrics, Grafana dashboards, and alert silences will be lost if Pods restart or migrate. Refer to the repository documentation to enable persistent storage when long-term retention is required. Below, we focus on this four-node topology and walk through each installation step.

## 02 Preparing the Server Environment and Ops Tools

Before packaging artifacts, verify the baseline specifications of the four Ascend servers in your data center and prepare all required dependencies on the build machine, ops machine, and target nodes.

### Hardware Specs, Example IPs, and Directory Conventions

| Check Item               | Configuration & Preparation Notes                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compute Nodes**        | 4 `aarch64` servers, each equipped with 8 × Ascend 910B4 NPUs (64 GB HBM per card).                                                                                                                              |
| **Operating System**     | Kylin V10 is used in this guide. If using another `aarch64` Linux distribution, verify NPU driver, runtime, and kernel compatibility beforehand.                                                                 |
| **Kernel & cgroup**      | Linux kernel 5.10 or newer with `cgroup v2` enabled.                                                                                                                                                             |
| **CPU & Memory**         | The model recipe requests 32 vCPUs and 64 GiB RAM per replica. Accounting for weight-loading memory spikes, OS page cache, and platform overhead, at least 256 GB RAM per host is recommended.                   |
| **Disk Space**           | Each node stores a copy of the model weights (several hundred GBs) plus space for engine caches and logs. Server 1 also requires extra capacity for the offline bundle and the local container registry storage. |
| **Network Connectivity** | Full intranet connectivity across all four servers; SSH access from the ops machine to all nodes; browser and client access to exposed service ports.                                                            |

Two details regarding memory and disk capacity merit close attention: the `64 GiB` memory request in the recipe is used for Kubernetes scheduling, whereas actual host memory must accommodate OS page cache overhead during model weight loading. Additionally, the GLM-5.3-Flash W8A8 weights used here occupy roughly 311 GB; size your disks based on the actual downloaded weight directory size plus room for unpacked images, the local registry, and runtime caches.

The commands in this guide use the following example IP addresses and paths. Replace them consistently with your site-specific values:

| Node Name   | Example IP  | Node Role                                      |
| ----------- | ----------- | ---------------------------------------------- |
| `ascend-11` | `10.0.0.11` | Control Plane, Local Registry, NPU Worker Node |
| `ascend-12` | `10.0.0.12` | NPU Worker Node                                |
| `ascend-13` | `10.0.0.13` | NPU Worker Node                                |
| `ascend-14` | `10.0.0.14` | NPU Worker Node                                |

The local container registry runs at `10.0.0.11:5000`, the project repository is cloned to `/root/modelsphere`, and model weights are staged under `/data/models/zai-org/GLM-5.3-Flash`.

### Verifying Drivers, Kernel, and cgroup on Each Ascend Server

Log in to each of the four Ascend servers and run the following commands to verify the baseline environment:

```bash
npu-smi info
uname -r
stat -fc %T /sys/fs/cgroup
```

Confirm that `npu-smi` detects all 8 NPUs and that the cgroup filesystem outputs `cgroup2fs`. In our testing, Kylin V10's default 4.19 kernel encountered startup issues with the Cilium CNI plugin, so this guide upgrades to kernel 5.10 or newer; check the [Cilium System Requirements](https://docs.cilium.io/en/stable/operations/system_requirements/) for distribution-specific backport support. To enable `cgroup v2`, have your system administrator add `systemd.unified_cgroup_hierarchy=1` to the kernel boot parameters, reboot, and re-verify.

Each server must also have compatible Ascend NPU drivers, firmware, and `ascend-docker-runtime` pre-installed. During node initialization, the setup scripts will register the Ascend runtime with `containerd` so containers can access the NPUs.

### Staging Build Tools and Ops Machine Ansible Dependencies

In addition to cluster and model artifacts, prepare the runtime dependencies for the build machine, ops machine, and target nodes in advance:

- **Online Build Machine**: Install `git`, `make`, Python with `PyYAML`, `Helm`, `Helmfile`, and `crane`. The build machine can be `x86_64`; simply pass `ARCH=arm64` when packaging for the target architecture.
- **On-Premise Ops Machine**: Install Ansible along with the `community.general` and `ansible.posix` collections. The ModelSphere base toolkit bundles cluster binaries, so the Ansible control environment must be prepared separately **before entering the air-gapped facility**. If you have an internet-connected ops host, install and verify them now:

```bash
ansible-galaxy collection install community.general ansible.posix
ansible --version
ansible-galaxy collection list
```

If the ops machine is permanently air-gapped, package Ansible, Python, and the collections above on an internet-connected host beforehand, transfer them into the data center, and install them on the ops machine.

**Python Compatibility on Ascend Nodes**: Supported Python versions on the Ansible controller and managed nodes depend on your `ansible-core` version; consult the [Ansible Support Matrix](https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html) to verify compatibility. If Kylin's built-in Python does not meet the requirement, leave the system Python untouched for CANN and `npu-smi`, and stage a standalone Python build for Ansible: download the matching `python-build-standalone` (`aarch64` `install_only` tarball) and include it in your offline transfer. If a compatible Python already exists on the target nodes, simply point `inventory.ini` to its path later.

## 03 Building the Offline Bundle on the Online Machine

Once environment prerequisites are verified, generate the offline artifacts on your internet-connected build machine. This involves cloning the repo, downloading base tools, packaging platform components, and pulling the inference engine image separately.

### Cloning the Target Repository Revision

Clone the ModelSphere repository and check out the exact commit used in this guide so your scripts and parameters match:

```bash
git clone https://github.com/modelsphere/modelsphere.git
cd modelsphere
git checkout 3c3e45d06d48aadaa9b770f7d01ddc5c42cb7eb2
```

Run all subsequent packaging commands from inside this repository directory. Once the build completes, save the generated model catalog snapshot, image list, and `MANIFEST` file to verify your artifacts upon arrival at the data center.

If you need to use domestic registry mirrors during download, configure `BUNDLE_FETCH_MIRRORS` before packaging (select mirrors reachable from your network):

```bash
export BUNDLE_FETCH_MIRRORS="docker.io/4pdosc=modelsphere.tencentcloudcr.com/4pdosc docker.io=docker.m.daocloud.io registry.k8s.io=k8s.m.daocloud.io"
```

Mirror mappings only alter the upstream download endpoints; the offline bundle still records original canonical image references internally, ensuring seamless image rewrites during deployment.

### Downloading Base Tools and Control-Plane Images

Run the following command to download base Kubernetes binaries and control-plane images for `arm64` target nodes:

```bash
ARCH=arm64 make offline-tools
```

This step stages `kubeadm`, `kubelet`, `kubectl`, `containerd`, `runc`, CNI plugins, `Helm`, `Helmfile`, `crane`, `nerdctl`, the local registry image, and Kubernetes control-plane images. Upon completion, inspect the script's missing-item and architecture verification report to confirm all required binaries are present for `arm64`.

### Step 1: Packaging Platform Component Images, Charts, and Catalog

Next, package the ModelSphere platform components, local Helm charts, and the model catalog snapshot:

```bash
ARCH=arm64 make offline-bundle \
  ARGS="--set llmGateway.node=ascend-11 --set llmGateway.hostPath=/data/bodylog-sinks --set enabled.ascendDevicePlugin=true \
       --set enabled.gpuOperator=false --set enabled.dcgmCustomMetrics=false \
       --set enabled.networkOperator=false --set enabled.nicClusterPolicy=false"
```

Here, the `llmGateway` flags specify the node and host path for persisting request body logs; `enabled.ascendDevicePlugin=true` bundles the Ascend Device Plugin; and the final four flags disable NVIDIA-specific components unused in this all-Ascend cluster.

This step packages the core platform installation artifacts, while the model inference engine image is pulled separately in the next step. The resulting directory structure looks like this:

```text
offline/
  tools/                    Cluster binaries and control-plane images
  images/                   Platform component images
  charts/                   Local Helm charts
  catalog-snapshot.tar.gz   Model catalog and engine chart snapshot
  MANIFEST                  Platform bundle build manifest
```

`catalog-snapshot.tar.gz` stores the model recipes and engine chart configurations read by the in-cluster console; the corresponding engine container image is staged next.

### Step 2: Pulling the Model Inference Engine Image Separately

This guide uses the `vllm-tp8-910b4-baseline` recipe under `glm-5.3-flash`. Before pulling, verify `image.repository` and `image.tag` in your offline catalog snapshot, then pass the full image reference to `crane`.

The command below corresponds to recipe version `1.0.3` used in this guide, pinning the `vLLM-Ascend` image by digest:

```bash
mkdir -p offline/engine
ENGINE_IMAGE='quay.io/ascend/vllm-ascend:pinned@sha256:7859b75177884252d2b703eff727831ccab4e33a8bde0a9b4ac7563facc98b33'
crane pull --format=oci "$ENGINE_IMAGE" offline/engine/vllm-ascend
```

The pulled image is saved to `offline/engine/vllm-ascend` and transferred into the data center alongside the platform bundle. If your catalog snapshot references a different image version, update both this pull reference and the push target in Section 04 accordingly.

**Image references across pull, push, and the model recipe must match exactly.** Because this image is pinned by digest, `crane pull` preserves the full OCI image index so it remains addressable by the exact same digest after being pushed to the local registry (stripping down to a single-architecture manifest would alter the digest). For images referenced solely by tag, verify `arm64` support and pull using `--platform linux/arm64`.

### Staging Model Weights and Verifying the Transfer Checklist

This guide uses the `Eco-Tech/GLM-5.3-Flash-w8a8` quantized weights. Download the complete model files from your model hub beforehand, verify that the format matches the recipe requirements, and transfer the weights into the data center separately. Your air-gapped transfer checklist should include:

- The entire `modelsphere` repository at the pinned commit, including the complete `offline/` directory (confirming both `offline/images/` and `offline/engine/vllm-ascend` are populated).
- Model weight files, source metadata, and checksum records.
- Ops dependencies including Ansible, collections, and Python (plus the `aarch64` `python-build-standalone` tarball if using a standalone Python).
- The generated `MANIFEST`, catalog snapshot, image list, and the exact engine image reference, digest, and checksums.

Once transferred into the data center, verify all file checksums before proceeding with the offline installation.

## 04 Initializing Nodes and the Local Registry On-Premise

After transferring the artifacts on-site, distribute the code, weights, and runtime environment across the nodes, initialize all four servers, and stand up the local container registry on Server 1.

### Staging Code, Weights, and Standalone Python

Copy the project repository and `offline/` directory to `/root/modelsphere` on all four servers, and stage an identical copy of the model weights on each server at:

```text
/data/models/zai-org/GLM-5.3-Flash/
```

Because the console recipe identifies the model as `zai-org/GLM-5.3-Flash` (which expands via `/data/models/{{name}}`), place your downloaded W8A8 weights directly inside this directory.

If using the standalone Python archive, extract it on each server and verify the binary version (ensure the wildcard matches only your selected tarball):

```bash
mkdir -p /opt/ansible-python
tar -xzf cpython-*-aarch64-unknown-linux-gnu-install_only.tar.gz \
  -C /opt/ansible-python --strip-components=1
/opt/ansible-python/bin/python3 --version
```

### Configuring Passwordless SSH and Ansible Inventory on the Ops Machine

Log in to the ops machine, navigate to the project directory, configure passwordless SSH to all four servers (verifying host key fingerprints on initial connection), and generate `inventory.ini` from the example template:

```bash
for h in 10.0.0.11 10.0.0.12 10.0.0.13 10.0.0.14; do
  ssh-copy-id root@"$h"
done
cp inventory-ascend.ini.example inventory.ini
```

Edit `inventory.ini` with your four nodes' IP addresses and variables. Remove or replace any unreachable internet proxy settings left over from the example file:

```ini
[ascend]
ascend-11 ansible_host=10.0.0.11
ascend-12 ansible_host=10.0.0.12
ascend-13 ansible_host=10.0.0.13
ascend-14 ansible_host=10.0.0.14

[ascend:vars]
k8s_install_method=binary
k8s_version=v1.36.3
k8s_accel_runtime=ascend
ansible_python_interpreter=/opt/ansible-python/bin/python3

[all:vars]
ansible_user=root
```

Next, run the following two commands from the ops machine to install the offline binaries and initialize the nodes:

```bash
ansible -i inventory.ini ascend -m shell \
  -a 'cd /root/modelsphere && make offline-install-tools'
make setup-k8s-offline
```

The first command installs `kubeadm`, `containerd`, and other offline base tools on each server (you can safely ignore any `REGISTRY unset` warning at the end of the output, as the registry and `pause` image will be configured in the next step). The second command configures `/etc/hosts`, disables swap, loads required kernel modules, applies `sysctl` settings, configures `containerd`, and registers the Ascend runtime with `containerd`.

### Starting the Local Registry and Importing Images on Server 1

Log in to Server 1, start the local container registry, and import both the platform images and the inference engine image:

```bash
cd /root/modelsphere
DATA=/data/offline-registry make offline-registry REGISTRY=10.0.0.11:5000
make offline-load REGISTRY=10.0.0.11:5000
crane push offline/engine/vllm-ascend \
  10.0.0.11:5000/vllm-ascend:pinned --insecure
crane digest 10.0.0.11:5000/vllm-ascend:pinned --insecure
```

The local registry listens on port `5000` and persists data to `/data/offline-registry`. First, `offline-load` pushes the control-plane and platform component images into the registry; next, `crane push` uploads the inference engine image separately under the repository name `vllm-ascend`, matching the rewritten image path used by the console.

Verify the pushed engine digest with `crane digest` to confirm it matches `sha256:7859b75177884252d2b703eff727831ccab4e33a8bde0a9b4ac7563facc98b33`. Once both image sets are imported, return to the ops machine to configure node-level registry trust:

```bash
make setup-offline-node REGISTRY=10.0.0.11:5000 MODE=rewrite
```

Because the local registry is served over plain HTTP inside the air-gapped intranet, this command configures `containerd` on every node to trust `10.0.0.11:5000`, points the sandbox (`pause`) image to the local registry, and performs a test pull to verify connectivity. Setting `MODE=rewrite` aligns with `registryMode: rewrite` in the ModelSphere environment configuration later.

## 05 Bootstrapping the Kubernetes Cluster

With the local registry and container runtimes configured, you are ready to initialize the Kubernetes cluster.

### Initializing the Control Plane (Server 1)

On Server 1, write `/root/kubeadm-init.yaml`:

```yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.0.0.11
nodeRegistration:
  name: ascend-11
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v1.36.3
controlPlaneEndpoint: '10.0.0.11:6443'
imageRepository: 10.0.0.11:5000
networking:
  podSubnet: 10.244.0.0/16
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
resolvConf: /etc/resolv.conf
```

Verify three key settings in this manifest: `kubernetesVersion` must match the `kubeadm` binary and control-plane images in your offline bundle (check via `kubeadm version -o short`); `imageRepository` points to your local registry so control-plane images are pulled over the intranet; and `resolvConf` explicitly sets `/etc/resolv.conf` to prevent Pod startup failures on Kylin V10 systems where `systemd-resolved` is disabled.

Initialize the cluster and configure `kubectl`:

```bash
kubeadm init --config /root/kubeadm-init.yaml --skip-phases=addon/kube-proxy
mkdir -p "$HOME/.kube"
cp /etc/kubernetes/admin.conf "$HOME/.kube/config"
kubectl -n kube-system get configmap kubelet-config -o yaml | grep resolvConf
```

Passing `--skip-phases=addon/kube-proxy` omits `kube-proxy`, allowing Cilium (installed in the next section) to handle service routing directly. The `kubelet` configuration is automatically stored in a cluster `ConfigMap` and inherited by worker nodes when they join.

### Joining the Remaining Three Worker Nodes

Save the `kubeadm join` command printed at the end of `kubeadm init`. If you need to regenerate it, run the following on Server 1:

```bash
kubeadm token create --ttl 1h --print-join-command
```

Run the join command on Servers 2, 3, and 4, specifying each server's `--node-name`. For example, on Server 2 (replace `TOKEN` and `CA_HASH` with your actual values):

```bash
kubeadm join 10.0.0.11:6443 --token TOKEN \
  --discovery-token-ca-cert-hash sha256:CA_HASH \
  --node-name ascend-12
```

Repeat on Servers 3 and 4 using `--node-name ascend-13` and `--node-name ascend-14`, ensuring node names match the labels and gateway settings in subsequent steps.

### Labeling Nodes and Allowing Workloads on the Control Plane

Once all four nodes have joined, return to Server 1 and apply the required Ascend node labels across all nodes:

```bash
for n in ascend-11 ascend-12 ascend-13 ascend-14; do
  kubectl label node "$n" --overwrite \
    accelerator=huawei-Ascend910 \
    workerselector=dls-worker-node \
    accelerator/huawei-ascend910=Ascend-910B4 \
    node.modelsphere.dev/accelerator=ascend-910b
done
```

Here, `workerselector` allows the Ascend Device Plugin to select target nodes, while `accelerator/huawei-ascend910` identifies the specific NPU model for console discovery and workload scheduling.

Because our four-node topology requires `ascend-11` to run a model replica alongside control-plane components—and `kubeadm` applies the `node-role.kubernetes.io/control-plane:NoSchedule` taint by default—inspect its taints:

```bash
kubectl describe node ascend-11 | grep Taints
```

If the taint is present, remove it for this converged topology so model Pods can schedule onto `ascend-11`:

```bash
kubectl taint node ascend-11 node-role.kubernetes.io/control-plane:NoSchedule-
```

_(Note: If you deploy a dedicated control-plane topology in production, keep the control-plane taint intact and size your worker pool accordingly. Refer to the [Kubernetes kubeadm documentation](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/) for details on default taints.)_

At this stage, `kubectl get nodes` will show all four nodes as `NotReady`. This is expected until Cilium is installed in the next section.

## 06 Installing ModelSphere Platform Components

Run all commands in this section from `/root/modelsphere` on Server 1.

### Creating the Offline Environment Configuration

Copy the offline environment template:

```bash
cp environments/offline.yaml.example environments/offline-rewrite.yaml
```

Edit `environments/offline-rewrite.yaml`, keeping the base offline defaults while updating the following key fields to match your environment:

```yaml
registry: 10.0.0.11:5000
registryMode: rewrite
chartsDir: /root/modelsphere/offline/charts
catalogSnapshot: /root/modelsphere/offline/catalog-snapshot.tar.gz
name: 'B4'

enabled:
  cilium: true
  catalogMirror: true
  gpuOperator: false
  dcgmCustomMetrics: false
  ascendDevicePlugin: true
  networkOperator: false
  nicClusterPolicy: false

storage:
  persistence: false

cilium:
  clusterName: offline
  clusterId: 1
  k8sServiceHost: 10.0.0.11
  k8sServicePort: 6443
  podCIDR: 10.244.0.0/16
  operatorReplicas: 2
  serviceMonitors: false
  gatewayAPI: true

llmGateway:
  node: ascend-11
  hostPath: /data/bodylog-sinks
  memoryLimit: 8Gi
  serviceMonitor: false

swiss:
  siteName: b4
  modelPathTemplate: /data/models/{{name}}
```

This configuration ties together all local dependencies prepared earlier:

- **Image Registry**: `registry` and `registryMode: rewrite` point to the local registry populated in Section 04.
- **Local Artifacts**: `chartsDir` and `catalogSnapshot` must be absolute paths pointing to your local Helm charts and model catalog snapshot.
- **Catalog & Weight Paths**: `catalogMirror` serves the offline model catalog in-cluster, while `swiss.modelPathTemplate` defines the host path template for model weights (expanding to `/data/models/zai-org/GLM-5.3-Flash`).
- **Networking & Feature Flags**: Cilium's API endpoint and Pod CIDR align with your `kubeadm` configuration, and enabled components match the flags used when building the offline bundle in Section 03.

### Installing the CNI Plugin First, Then Remaining Platform Components

Prepare the offline `helm-diff` plugin, Gateway API CRDs, and priority classes, then install Cilium first:

```bash
make helm-deps
make helm-bootstrap
make helm-apply ENV=offline-rewrite SELECTOR=name=cilium MODELS= SKIP_DEPS=1
kubectl get nodes
```

Wait until all four nodes transition to `Ready`, then deploy the remaining platform components:

```bash
make helm-apply ENV=offline-rewrite MODELS= SKIP_DEPS=1
```

Setting `SKIP_DEPS=1` skips upstream Helm repository updates and installs directly from your local charts. This deploys the LLM gateway, CART (Cache-Aware Routing), request body logging, the Volcano scheduler, the Ascend Device Plugin, the monitoring/alerting stack, the web console, and the model catalog service.

### Verifying Nodes, Components, and the Offline Catalog

Once installation finishes, run the following checks before opening the web console:

```bash
kubectl get pods -A
kubectl get nodes -o custom-columns='NAME:.metadata.name,NPU:.status.allocatable.huawei\.com/Ascend910'
curl -s "http://$(kubectl -n console get svc catalog-mirror -o jsonpath='{.spec.clusterIP}')/status.json"
```

Confirm three things:

1. In `kubectl get pods -A`, all long-running platform Pods are `Running`/`Ready` and one-off Jobs show `Completed`.
2. Every node reports `8` allocatable NPUs.
3. The catalog service `/status.json` endpoint returns `"source": "snapshot"` with `"ok": true` for both `catalog` and `charts`.

## 07 Deploying a 4-Replica GLM-5.3-Flash Service via the Console

With platform components healthy, you can deploy and scale the model directly from the ModelSphere web console.

### Opening the Console and Selecting a Recipe

Retrieve the console's `NodePort` URL:

```bash
NODE_PORT=$(kubectl -n console get svc console-console -o jsonpath='{.spec.ports[0].nodePort}')
echo "http://10.0.0.11:$NODE_PORT/"
```

Open the URL in your browser and log in with the default credentials (`admin` / `P@88w0rd`), updating the password when prompted.

> **Note**: The console screenshots below were captured in a demo environment to illustrate navigation flows; always rely on the recipe version included in your offline snapshot. Status indicators shown in the screenshots (such as "0 Available", "Loading 0/1", or grayed-out items) reflect the demo environment's transient state—validate your deployment against your actual cluster resources and readiness checks.

**Step 1: Navigate to "Inference Services" and click "Deploy Model" in the top-right corner.**

![Navigate to Deploy Model from Inference Services](deploy-1-services.en.png)

**Step 2: Search for `GLM-5.3-Flash` in the Model Library and open its model card.**

![Search for GLM-5.3-Flash](deploy-2-library.en.png)

**Step 3: Select `vllm-tp8-910b4-baseline` and click "Deploy".** This is a single-node, 8-NPU (`TP=8`) recipe for Ascend 910B4. Before deploying, verify the weight, engine, and resource definitions in your snapshot and confirm the matching engine image digest is in your local registry.

![Select the Ascend 910B4 Variant](deploy-3-variants.en.png)

_Caption: The screenshot shows recipe version `1.0.2`, whereas the pull/push commands in this guide correspond to version `1.0.3` of the [910B4 recipe](https://github.com/modelsphere/model-catalog/blob/4b8b3a177be8a54be4cf4f6e91f9245d2b1a28d8/models/glm-5.3-flash/vllm-tp8-910b4-baseline.yaml). Always select the version matching your offline bundle and verify node resource availability._

This recipe is configured for a 1M-token maximum context window; actual supported concurrency and context lengths depend on available NPU HBM for KV cache and runtime load.

### Configuring the Service, Reviewing the Plan, and Setting 4 Replicas

**Step 4: Fill in basic service details.** The model and variant are pre-populated. Set the service name to `glm-5-3-flash`, set the namespace to `models`, and enable automatic namespace creation and route publishing. The service name is used for the Helm release, gateway route, and SLO configuration—double-check it before proceeding.

![Enter Service Name and Namespace](deploy-4-basic.en.png)

**Step 5: Under "Resources & Scheduling", select `Ascend-910B4`.** Confirm that matching nodes are detected with 8 allocatable NPUs and sufficient CPU/RAM.

![Select Ascend-910B4 Resource](deploy-5-resources.en.png)

_Caption: The UI label currently reads "GPU", though it schedules Ascend NPUs under the hood. If an insufficient resource warning appears, check node labels, control-plane taints, and existing resource allocations._

**Step 6: Click "Generate Plan", review the deployment manifest preview, and click "Confirm Deploy".** Verify that the engine image points to your local registry and the weight mount path matches your host directory.

![Preview and Confirm Deployment Plan](deploy-6-plan.en.png)

**Step 7: Configure replica count in the pop-up SLO panel.** On the `Bounds` row, set the scaling type to `replica`, set both `Min` and `Max` to `4`, and click Save. Each replica requests 8 NPUs, placing one replica on each of our four schedulable nodes.

![Set Min and Max Replicas to 4](deploy-7-slo.en.png)

_Caption: This guide fixes the replica count at 4. Leave TTFT and OTPS at their defaults, or configure latency/throughput targets later as needed._

Once confirmed, the console reads the recipe from the in-cluster catalog, rewrites the engine image reference to your local registry, and installs the release via Helm—all without external internet access. Each replica then loads model weights from its local node disk and initializes the inference engine.

### Waiting for All Four Replicas to Become Ready

Monitor "Installation Progress" and "Instances" on the service details page, or watch Pod status directly from Server 1:

```bash
kubectl -n models get pods -o wide -w
```

Your acceptance criteria: **Instances reach `4/4` Ready, with one replica scheduled per node, and the service route published to the gateway.** Startup duration depends on disk read speed, OS page cache warm-up, engine initialization, and graph compilation.

![View Installation Progress and Instance Status](deploy-9-status.en.png)

_Caption: The demo screenshot captures a transient "Loading 0/1" state with a scaling warning to illustrate the UI layout. In your deployment, resolve any Pod events or log errors before running inference tests._

## 08 Sending a Live Request via the Unified Gateway

Once all four replicas are ready, send a live request through the gateway to verify end-to-end routing and inference.

On the service details page, switch to the **Service Check** tab. Click `Check service` to validate gateway routing, then click `Send request` under **Health check** to send a live prompt and inspect the model response.

![Check Route and Send Live Request](deploy-10-check.en.png)

You can also open **Playground → Chat** from the left navigation bar and select `glm-5-3-flash` for interactive testing.

![Select Model Service in Playground](deploy-11-playground.en.png)

_Caption: In the demo screenshot, the GLM entry is grayed out because its route had not yet been published. Once your service is Ready and routed, it will be selectable._

To integrate with external applications or test via CLI, copy the endpoint URL and sample payload from the **Access** section at the bottom of the service **Overview** tab:

![Copy Service Access URL and Request Sample](deploy-12-access.en.png)

Using the endpoint from the screenshot as an example (replace with the actual URL shown in your console):

```bash
curl http://10.0.0.11:32446/glm-5-3-flash/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"GLM-5.3-Flash","messages":[{"role":"user","content":"What is 17 times 19? Reply with the number only."}],"max_tokens":64,"chat_template_kwargs":{"thinking":false}}'
```

This example assumes gateway API key authentication is disabled. If authentication is enabled in your environment, include an `Authorization: Bearer` header with your configured key (`$SWISS_API_KEY` in the UI snippet is a placeholder; see the [Gateway Documentation](https://github.com/modelsphere/modelsphere/blob/3c3e45d06d48aadaa9b770f7d01ddc5c42cb7eb2/docs/openresty.md) for setup details).

Confirm that the response `content` returns `323` and that the Service Check passes. You can now point any OpenAI-compatible client or SDK to the service's `/v1` base URL to run your own workloads.

## 09 Day-2 Operations in the Console

Once the model service is live, routine monitoring, scaling, parameter upgrades, uninstallation, and new model deployments can all be managed from the web console.

### Checking Status and Scaling Replicas

The **Inference Services** list displays all deployed services and their rollout status; click into any service to inspect ready instance counts and active routes.

![Inference Services List](ops-9-1-list.en.png)

_Caption: An "Applied" status indicates that the configuration has been dispatched; verify actual availability via instance readiness and endpoint checks._

The **Overview** page summarizes service health, resource allocation, and node availability across the cluster:

![View Cluster Operational Overview](ops-9-1-overview.en.png)

_Caption: Captured from an 8-node demo cluster prior to the GLM service becoming ready; node counts, model counts, and allocation metrics reflect demo data._

The top-right corner of the service details page provides quick actions for **Edit SLO**, **Upgrade**, and **Uninstall**:

![Service Management Action Menu](ops-9-2-header.en.png)

To adjust the replica count, click **Edit SLO**, update the min/max values on the `Bounds` row, and save. Ensure your maximum replica count does not exceed your available schedulable nodes (at 8 NPUs per replica).

![Modify Replica Min and Max Bounds](ops-9-2-slo.en.png)

### Upgrading Parameters or Uninstalling a Service

Click **Upgrade** to switch recipe versions or modify resources, routing, and advanced parameters, then generate a plan, preview the diff, and apply. In air-gapped environments, ensure any updated Helm charts and container images are already imported into your offline bundle and local registry.

![Select Upgrade Target and Preview Plan](ops-9-3-upgrade.en.png)

To free up NPU resources, click **Uninstall** and type the service name to confirm. Uninstalling deletes the model Pods; redeploying later will require reloading weights from disk.

![Enter Service Name to Confirm Uninstall](ops-9-4-uninstall.en.png)

### Deploying Additional Models and Supplementing Offline Artifacts

To deploy additional models later, search for the target model in the **Model Library** and choose a recipe matching your hardware:

![Find Other Models in the Model Library](ops-9-5-catalog.en.png)

Adding a new model in an air-gapped environment follows the same two-step artifact workflow:

1. On the online build machine, generate an updated catalog snapshot containing the target model recipe and engine chart (updating platform artifacts if needed).
2. Pull the model's inference engine image separately with `crane pull` and download the matching model weights.

Transfer the files into the data center, import platform updates with `make offline-load`, push the engine image with `crane push` to the path expected by the console, and update the in-cluster catalog service so the recipe, local registry image, and node weight directories remain aligned.

### Viewing Logs, Monitoring, and Upgrading the Platform

To troubleshoot model runtime issues, open the **Logs** tab on the service details page to inspect stdout/stderr filtered by Pod, container, and line count:

![View Logs by Pod and Container](ops-9-6-logs.en.png)

_Caption: The demo screenshot shows an empty log stream; when diagnosing startup failures, inspect both the Events tab and instance statuses alongside logs._

For CLI troubleshooting, list your Pods and inspect logs or events directly:

```bash
kubectl -n models get pods -o wide
kubectl -n models logs POD_NAME
kubectl -n models describe pod POD_NAME
```

Grafana is deployed in the `monitoring` namespace. To access dashboards, query the Grafana `Service` name in that namespace and forward its port locally using `kubectl port-forward`.

To upgrade the ModelSphere platform itself, re-package the target release code, platform images, charts, and catalog snapshot on your online build machine, review any environment configuration changes, and transfer the bundle on-site. Import the updated platform images on Server 1 and apply the configuration (if upgrading a model engine simultaneously, push the new engine image separately as covered in Sections 03 and 04):

```bash
make offline-load REGISTRY=10.0.0.11:5000
make helm-apply ENV=offline-rewrite MODELS= SKIP_DEPS=1
```

## 10 Troubleshooting Along the Dependency Chain

Because offline deployments span multiple layers, troubleshoot failures systematically following the dependency order: **Node Environment → Local Registry → Catalog Service → Model Instances → Gateway Endpoint.**

| Symptom                                                               | Primary Investigation Steps                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cilium crash-looping; nodes stuck in `NotReady`**                   | Inspect Cilium Pod events and logs; verify host kernel version (≥ 5.10), `cgroup v2`, and Cilium's `k8sServiceHost`/`k8sServicePort` settings.                |
| **Pods failing with missing DNS config file errors**                  | Verify kubelet's `resolvConf` points to an existing `/etc/resolv.conf` on the host and check the `kubelet-config` ConfigMap.                                  |
| **Pods stuck in `ContainerCreating`**                                 | Inspect Pod events; check the `pause` image reference, local registry reachability, and `containerd` status.                                                  |
| **Image pull fails with `server gave HTTP response to HTTPS client`** | Ensure `setup-offline-node` was run on the affected node to configure insecure HTTP access for the local registry.                                            |
| **`kubeadm init` preflight fails on missing control-plane images**    | Confirm that `kubeadm`, `kubernetesVersion` in `kubeadm-init.yaml`, and the images imported into the local registry match in version.                         |
| **Pods enter `ImagePullBackOff`**                                     | Verify the exact image tag, digest, and repository path in the local registry, and ensure the catalog snapshot matches your image manifest.                   |
| **Nodes report `0` allocatable NPUs**                                 | Check host NPU drivers, `ascend-docker-runtime`, Ascend Device Plugin Pods, and the `workerselector=dls-worker-node` node label.                              |
| **Console "Model Library" is empty**                                  | Verify `catalogMirror` is enabled, `catalogSnapshot` is set to a valid absolute path, and the catalog service `/status.json` returns healthy.                 |
| **Fewer than 4 replicas scheduled or Pods stuck `Pending`**           | Check Pod events for NPU, CPU, memory, affinity, or taint constraints; for this 4-node topology, verify the control-plane taint was removed from `ascend-11`. |
| **Model Pod fails to find weight files on startup**                   | Verify weight directory contents and permissions across all four nodes, and confirm `swiss.modelPathTemplate` expands to the exact path.                      |
| **Instances are `Ready`, but inference requests fail**                | Run **Service Check** to inspect gateway routes, backend endpoints, and API key authentication headers.                                                       |
| **Node `INTERNAL-IP` mismatches the cluster network**                 | On multi-homed hosts, verify kubelet's `--node-ip` flag is bound to the intended intranet interface.                                                          |

If the online packaging script reports missing items, determine which component they belong to: if a required `arm64` image for an enabled component or your target model recipe is missing, adjust your version or feature flags and re-package; if the script skipped an unused component, verify against your manifest and proceed.

## Getting Started with This Offline Setup

With your local container registry, Kubernetes cluster, and ModelSphere console up and running inside your air-gapped data center—and all four replicas verified through the unified gateway—you can now serve GLM-5.3-Flash in production and manage scaling, monitoring, and upgrades directly from the web UI.

To deploy ModelSphere in your own Ascend environment, start with the walkthrough below to prepare your nodes, offline bundles, and model weights:

👉 **Ascend Offline Deployment Guide**: [ModelSphere 910B4 K8s Walkthrough](https://github.com/modelsphere/modelsphere/blob/3c3e45d06d48aadaa9b770f7d01ddc5c42cb7eb2/docs/offline-ascend-walkthrough.md)

👉 **Additional Configuration Guides**: [Offline Installation](https://github.com/modelsphere/modelsphere/blob/3c3e45d06d48aadaa9b770f7d01ddc5c42cb7eb2/docs/offline-install.md) · [Adding Ascend Nodes](https://github.com/modelsphere/modelsphere/blob/3c3e45d06d48aadaa9b770f7d01ddc5c42cb7eb2/docs/add-ascend-node.md) · [Console Operations](https://github.com/modelsphere/modelsphere/blob/3c3e45d06d48aadaa9b770f7d01ddc5c42cb7eb2/docs/console.md)

If you encounter issues or have insights to share during deployment, please open an issue on the [ModelSphere GitHub Repository](https://github.com/modelsphere/modelsphere) along with your hardware specs, commit hash, bundle manifest, and relevant logs. If you find this guide helpful, consider giving **ModelSphere a Star ⭐** on GitHub to support ongoing model and hardware integrations.
