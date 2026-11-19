---
title: 'How Does ModelSphere Run on Ascend? Get It Up and Running with Docker'
summary: 'To help community developers get started quickly, ModelSphere offers a Docker-based deployment option that brings model startup, request routing, and unified API access together in a single configuration workflow. Using Ascend 910B4 and GLM-5.3-Flash as an example, this guide walks you through preparing the environment, model weights, and container images, then sending a successful request to the model.'
---

To help community developers get started quickly, ModelSphere offers a Docker-based deployment option that brings model startup, request routing, and unified API access together in a single configuration workflow. For production use, we still strongly recommend the Kubernetes deployment, which provides the full feature set along with greater stability and performance.

Using Ascend 910B4 and GLM-5.3-Flash as an example, this guide walks you through preparing the environment, model weights, and container images, then sending a successful request to the model.

Since ModelSphere was open-sourced, community members have asked for a simpler way to try it out. Some have only a small number of machines available; others want to get a model running in their existing environment before exploring the project's capabilities.

To meet this need, we've added a Docker deployment option alongside the existing open-source Kubernetes solution. Docker is intended for quick evaluation by developers; Kubernetes remains the recommended option for production. Once the environment, model weights, and images are ready, developers can start the model with a configuration file and try out routing, authentication, and rate limiting.

The example below uses four Ascend 910B4 servers, each equipped with eight NPUs, to deploy four GLM-5.3-Flash instances. It walks through the complete request flow across multiple instances. Here are the deployment steps:

## 01 One Instance per Server, with a Shared Routing Layer

Client requests first reach the OpenResty gateway on the control node. After authentication and rate-limit checks, requests are passed to CART, which selects an inference instance on one of the servers. The control node also reads the configuration, runs local startup commands, and manages the other servers over SSH.

![GLM-5.3-Flash deployment across four servers](07_docker_deployment_architecture_EN.png)

Figure: Server 1 also acts as the control node. Each of the four servers runs an independent TP8 instance. The dashed line shows the fallback path in which the gateway connects directly to an engine if CART becomes unavailable.

The deployment has three layers:

- **Engine layer**: Each server runs a vLLM-Ascend container using its eight local NPUs with TP=8. Each server hosts a complete copy of the model, forming four independent instances.

- **Routing layer**: CART selects an instance based on the cache status of the request prefix, aiming to reuse previously computed results. Cache hits and the resulting gains depend on the request content and workload.

- **Gateway layer**: OpenResty provides a unified, Chat Completions-compatible endpoint and applies API key authentication and rate limiting according to the configuration.

The control node runs the deployment scripts and manages the gateway and CART through Docker Compose. It can be any regular server; in this guide, Server 1 takes on that role:

![Servers and their roles](05_server_roles_EN.png)

If health checks mark CART as unavailable, the gateway can switch to a healthy engine backend and continue accepting new requests. Requests already in flight along the failed path may still fail and must be handled by the client. Both the gateway and CART run on Server 1.

## 02 Check Each Server Before Deployment

Prepare the host drivers, container runtime, model weights, and network first. The deployment scripts will start the services afterward. You'll need access to the relevant code repositories and image registries to clone the code and pull the images. The checks below are grouped into tasks for every server and tasks specific to the control node.

### 2.1 Hardware, Storage, and Networking

![Hardware, storage, and networking](06_hardware_and_network_requirements_EN.png)

In this setup, model collective communication takes place within each server. Cross-server traffic is mainly used by the gateway and router to distribute requests. Check that the required ports are available before deployment, then verify connectivity from the control node to each engine after startup.

### 2.2 On Every Server: Drivers and Docker

Run:

```bash

npu-smi info

docker version

```

Make sure all eight NPUs are detected, the drivers are healthy, and Docker is available. Then install Ascend Docker Runtime and check that Docker has registered a runtime named `ascend`:

```bash

docker info | grep -i runtimes

```

The output should include `ascend`. If the runtime is installed but has not been registered, **merge** the following fields into the existing `/etc/docker/daemon.json`, keeping the existing configuration. Use the path that matches the actual installation on your machine:

```json

{

  "runtimes": {

    "ascend": {

      "path": "/usr/local/Ascend/Ascend-Docker-Runtime/ascend-docker-runtime"

    }

  }

}

```

After making the change, restart Docker with a user that has the required permissions, then check the registered runtimes again. If the machine is already running containers, schedule the restart accordingly:

```bash

systemctl restart docker

docker info | grep -i runtimes

```

### 2.3 On the Control Node: Compose and Passwordless SSH

The control node needs Git, the Docker Compose plugin, and an SSH client. If you use the model-weight synchronization method below, rsync must also be installed on both ends.

```bash

git --version

docker compose version

```

The deployment user must be able to run Docker directly and read the model directory. The examples below use `root` as the user. If you use a different account, update both the SSH commands and the `.env` file's `SSH_USER`.

If you don't already have an SSH key for deployment, create one. Otherwise, skip this step:

```bash

ssh-keygen -t ed25519

```

Copy the public key to the other three servers, then verify that passwordless SSH works:

```bash

for h in 10.0.0.12 10.0.0.13 10.0.0.14; do

ssh-copy-id root@"$h"

done

for h in 10.0.0.12 10.0.0.13 10.0.0.14; do

ssh -o BatchMode=yes root@"$h" hostname

done

```

If passwordless SSH is configured correctly, the command should print the hostnames of the three remote servers without prompting for a password. When the control node targets its own address, the script runs the command locally.

### 2.4 On Every Server: Model Weights and Images

This guide uses the following directory:

```text

/data/models/GLM-5.3-Flash-w8a8

```

This example uses the W8A8 export specified by the deployment recipe. Check the weight format and model directory before syncing the files to the other servers, and make sure all four machines use the same version. Other formats, such as MXFP8, require their own hardware and configuration checks.

If the weights are already on Server 1, you can sync them to the other three servers from the control node. First, make sure the `/data/models/` directory exists on each target server:

```bash

for h in 10.0.0.12 10.0.0.13 10.0.0.14; do

ssh root@"$h" 'mkdir -p /data/models'

rsync -a --progress /data/models/GLM-5.3-Flash-w8a8 root@"$h":/data/models/

done

```

Pull the engine image on all four servers:

```bash

docker pull quay.io/ascend/vllm-ascend:v0.30.0rc2

```

On the control node, pull the gateway and CART images as well. This example uses the Tencent Cloud image registry provided by the project:

```bash

docker pull modelsphere.tencentcloudcr.com/4pdosc/llm-openresty:0.1.31

docker pull modelsphere.tencentcloudcr.com/4pdosc/cache_aware_router:0.6.6

```

## 03 Two Files to Configure Four Instances

### 3.1 Get the Scripts and Example Configuration

Run the following commands on the control node. To keep the setup reproducible and avoid differences introduced by later repository updates, this guide checks out a specific commit:

```bash

git clone https://github.com/modelsphere/modelsphere.git

cd modelsphere

git checkout 319c05ecfb6ed12788affa69aa27e32c025372de

cd docker

```

Run all subsequent script commands from `modelsphere/docker/`. It contains `up.sh` and `status.sh` and `down.sh` and `render.sh` and the example configuration files.

### 3.2 `.env`: Start with the Ascend Example

```bash

cp examples/glm-5.3-flash-910b4.env .env

```

Open `.env` in an editor, check the model path, and set the two routing-layer images to the addresses used in this example:

```text

MODEL_PATH=/data/models/GLM-5.3-Flash-w8a8

OPENRESTY_IMAGE=modelsphere.tencentcloudcr.com/4pdosc/llm-openresty:0.1.31

CART_IMAGE=modelsphere.tencentcloudcr.com/4pdosc/cache_aware_router:0.6.6

```

The example already includes the engine and NPU-related parameters. For your first deployment, keep these settings and focus on checking the deployment layout:

```text

DEVICES_PER_NODE=8

NODES_PER_INSTANCE=1

TP=8

PP=1

```

`NODES_PER_INSTANCE=1` means one instance per server. The recipe sets `max-model-len` to 1,048,576 tokens, along with the corresponding memory settings. **The maximum context length sets the limit for an individual request; concurrency depends on the available KV cache pool and the length of each request.** After startup, check the KV cache capacity in the logs and use it to plan concurrency.

### 3.3 `hosts`: One Server per Line

Create `hosts` in the current directory:

```bash

cat > hosts <<'EOF'

10.0.0.11

10.0.0.12

10.0.0.13

10.0.0.14

EOF

```

At this point, the two configuration files are in place: `.env` defines how the model runs, while `hosts` lists the machines on which it runs. Once the environment and paths have been checked, you're ready to start the service.

## 04 Start the Service and Verify It in Two Steps

### 4.1 Start the Service

```bash

./up.sh

```

The script generates the configuration and startup commands for each server. It starts the engines locally or over SSH, waits for each instance to respond to `/v1/models` then sends a warm-up request to each ready instance. Finally, it starts the gateway and CART and prints the service endpoint.

Loading the weights, compiling the graphs, and warming up the first request all take time. In the example documented here, the initial startup and loading process took about 18 minutes. Actual startup time depends on disk performance, cache state, and host resources. Deployment proceeds through container startup, engine readiness, and warm-up. Verify application requests only after these steps are complete.

To skip the waiting stage in the script, run:

```bash

./up.sh --no-wait

```

This mode skips the default wait and warm-up steps. After running it, use the status check and test request below to confirm that the service is ready to receive traffic.

### 4.2 Step One: Check the Instances and Routing Layer

```bash

./status.sh

```

Make sure all four instances show `serving` and that OpenResty and CART are running normally, the gateway responds, and the script exits with code 0. `loading` means the container is running but the engine is not ready yet. If the status remains at this stage for too long, check the engine logs on the relevant server to identify issues with weight loading, device initialization, or compilation.

Run this command on the relevant server:

```bash

docker logs --tail 200 engine-glm-5.3-flash

```

### 4.3 Step Two: Send a Real Request Through the Gateway

Before enabling authentication, test the service using the example endpoint:

```bash

curl -sS http://10.0.0.11:8080/glm-5.3-flash/v1/chat/completions \

-H 'Content-Type: application/json' \

-d '{"model":"glm-5.3-flash","messages":[{"role":"user","content":"Introduce yourself in one sentence."}],"max_tokens":256}'

```

Once you receive a valid response, connect an SDK or application that supports the corresponding Chat Completions protocol:

```text

base_url = http://10.0.0.11:8080/glm-5.3-flash/v1

model = glm-5.3-flash

```

If you use a different IP address, port, or route name, follow the endpoint printed by `up.sh`. The status check confirms that the deployment is ready; the test request verifies the full request path from the client through the gateway and router to the engine. Both checks are necessary.

## 05 Configure Authentication and Rate Limiting Before Connecting Your Application

### 5.1 Enable API Key Authentication

By default, if no key file is present, the gateway does not enforce API key authentication. To enable it, create a key file in the `docker/` directory on the control node. The following is only an example of the file format; replace it with your actual key before use:

```bash

mkdir -p keys

printf '%s\n' 'sk-replace-with-your-key:team-a' > keys/keys

./up.sh

```

The file format is `key:consumer`, with multiple entries separated by commas. Once authentication is enabled, requests must include a valid Bearer token:

```bash

curl -sS http://10.0.0.11:8080/glm-5.3-flash/v1/chat/completions \

-H 'Content-Type: application/json' \

-H 'Authorization: Bearer sk-replace-with-your-key' \

-d '{"model":"glm-5.3-flash","messages":[{"role":"user","content":"Hello"}],"max_tokens":256}'

```

To rotate a key, add the new key and reload the gateway first. Then remove the old key and reload it again. A key-only change triggers a graceful gateway reload; the existing engines keep running.

API key authentication is enforced at the gateway. The engine also exposes a direct API on port 8050 by default, so access to that port should be restricted to the internal networks that need it. Clients should access the service through the authenticated gateway, while network policies protect the backend port.

### 5.2 Enable Rate Limiting for Your Expected Workload

Rate limiting is disabled by default. To enable it, change the following setting in `.env`:

```text

RATE_LIMIT=true

```

Apply the configuration:

```bash

./up.sh

```

The main parameters control different limits:

![Rate-limiting parameters](01_rate_limit_parameters_EN.png)

New requests rejected by the gateway receive an immediate 429 response. The example value `MAX_CONCURRENCY=100` is a permissive default. Set concurrency for your workload based on actual input lengths, KV cache capacity, time to first token, and generation speed. The single-instance results in the next section illustrate the trade-off between concurrency and the experience of an individual request, and can serve as a starting point for your own tests.

## 06 Performance Reference: Understand What Was Measured

The recipe used in this guide records a set of **single-server, single-instance, direct-to-engine** results. One 910B4 server uses eight NPUs with a 1M context length. Each request contains 50K input tokens and generates 1.5K output tokens. These results show the capacity and response characteristics of a single instance. The overall performance of the four-instance service must be measured separately through the shared gateway. The test conditions are shown below:

![Single-instance performance results](02_single_instance_performance_EN.png)

In this test, increasing concurrency from 1 to 16 raised total throughput from 544.9 to 3,547.5 tokens/s, while the output speed per request fell from 17.0 to 6.7 tokens/s. These figures provide different starting points for retesting batch workloads and interactive applications. Total throughput in the table includes both input and output tokens; the per-request output speed reflects how quickly each response is generated.

The test used a host with 192 CPU cores and 1 TiB of memory. The container had a CPU quota of 32 and a memory limit of 768 GiB. These limits need to be configured for your own test environment; by default, the example makes the host resources available to the engine. The recipe also records 2,789.7 tokens/s at concurrency 16 on another server with the same configuration. The reason for the difference has not yet been determined.

After deploying across all four servers, run another test through the shared endpoint. Record the throughput of each server, routing decisions, and request distribution. Use these measurements to determine the capacity of the complete service.

The TTFT values in the table were recorded under steady-state conditions. The first batch of long-input requests handled by a newly started instance may take longer. In your own tests, measure both the first requests after startup and the steady-state phase, then set latency targets according to your application's requirements.

## 07 Before Changing the Configuration, Understand the Impact

Routine operations still start with `.env` and `hosts` and the deployment scripts, but different changes take effect in different ways:

![Configuration changes and their impact](03_configuration_operations_EN.png)

For routine changes, update `.env` and `hosts` as the source of truth. The scripts then generate the runtime configuration in `generated/`. Keep this directory in place while the service is running, as the routing containers continue to read from it.

This Docker-based setup turns a small group of servers into a callable service. The number of instances is managed through `hosts`; configuration changes are applied by the scripts. If an engine exits, an operator must investigate and rerun `./up.sh`. Automatic failure recovery, autoscaling, rolling updates, high availability for the routing layer, and monitoring and alerting require additional implementation and can be planned as the workload grows.

## 08 Troubleshoot with Status Checks and Logs

![Symptoms and troubleshooting steps](04_troubleshooting_EN.png)

## 09 Give It a Try and Join the Discussion

If you'd like to run GLM-5.3-Flash in your own Ascend environment, prepare the environment, model weights, and images, then follow the deployment guide and model configuration below.

👉 **ModelSphere Docker deployment scripts:**

[https://ourl.cn/fuhByx](https://ourl.cn/fuhByx)

👉 **GLM-5.3-Flash W8A8 / 910B4 model configuration:**

[https://ourl.cn/dRZTgG](https://ourl.cn/dRZTgG)

If you run into issues, feel free to open an issue on GitHub. We'd also love to hear about your deployment experience and suggestions for improvement as we make the getting-started process smoother for everyone.

If this guide has been helpful, please consider giving **ModelSphere a Star ⭐** to support the project and help more developers discover it.

👉 **ModelSphere on GitHub:**

[https://github.com/modelsphere/modelsphere](https://github.com/modelsphere/modelsphere)

## About Us

**ModelSphere** is an open-source community building production-grade infrastructure for large language model inference. Co-founded by PHANCY and RiseUnion, it brings together heterogeneous compute support, cloud-native cluster orchestration, and performance optimization to help move LLMs from working in the lab to running reliably in production.
