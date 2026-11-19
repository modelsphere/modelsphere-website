---
id: ascend-docker-deploy-glm-53-flash
title: 'ModelSphere 在昇腾上表现如何？先用 Docker 跑起来看看'
summary: '为方便社区开发者快速上手，ModelSphere 提供基于 Docker 的部署方式，将模型启动、请求路由与统一调用组织到一套配置流程中。本文以昇腾 910B4 与 GLM-5.3-Flash 为例，带你在完成环境、权重与镜像准备后，跑通模型调用。'
kind: internal
slug: ascend-docker-deploy-glm-53-flash
publishedAt: '2026-11-19'
updatedAt: '2026-11-19T15:54:00+08:00'
author: '张浩'
cover:
  src: cover.png
  alt: '封面：ModelSphere 在昇腾上表现如何？先用 Docker 跑起来看看'
  width: 1672
  height: 941
evidenceIds: []
categoryId: engineering
tagIds:
  - ascend
technicalKeywords:
  - GLM-5.3-Flash
  - Docker
  - vLLM-Ascend
  - CART
  - OpenResty
---

为方便社区开发者快速上手，ModelSphere 提供基于 Docker 的部署方式，将模型启动、请求路由与统一调用组织到一套配置流程中。对于希望在正式环境中使用，我们依然强烈推荐使用 k8s 版本以获得功能、稳定性、性能等完整体验。

本文以昇腾 910B4 与 GLM-5.3-Flash 为例，带你在完成环境、权重与镜像准备后，跑通模型调用。

ModelSphere 项目开源后，我们收到了来自社区的试用需求：有的开发者手头机器不多，有的则希望先在现有环境中把模型跑起来，简单体验项目的能力。

为此，我们在原有 Kubernetes 开源方案的基础上，新增了 Docker 部署方式（Docker 部署路径面向开发者快速试用，生产环境推荐采用 Kubernetes 形态）开发者完成环境、权重与镜像准备后，即可通过配置文件启动模型，体验路由、鉴权与限流。

下面就以使用四台昇腾 910B4，每台 8 张 NPU，部署四个 GLM-5.3-Flash 的实例，向你展示多实例的完整调用流程。以下是具体的部署步骤：

## 01 每台一个实例，前面统一路由

客户端请求先到控制机上的 OpenResty 网关，经过鉴权与限流策略后交给 CART，再由 CART 选择一台服务器上的推理实例。控制机同时负责读取配置、执行本机启动命令，并通过 SSH 管理其余服务器。

![GLM-5.3-Flash Docker 部署架构：控制机（服务器 1 兼任）上的 OpenResty 网关与 CART 路由，将请求分发到四台 910B4 服务器上的独立 TP8 vLLM-Ascend 实例，虚线为 CART 异常时网关直连引擎的兜底路径](docker-deploy-architecture.png)

图：服务器 1 兼任控制机。四台服务器各运行一个独立 TP8 实例，虚线示意 CART 异常时网关直连引擎的兜底路径。

这套部署分为三层：

- **引擎层**：每台服务器运行一个 vLLM-Ascend 容器，使用本机 8 张 NPU，TP=8。四台服务器各自持有完整模型，组成四个独立实例。

- **路由层**：CART 根据请求前缀的缓存情况选择实例，尽量复用已有计算结果；具体命中与收益取决于请求内容和负载。

- **网关层**：OpenResty 提供统一的 Chat Completions 兼容入口，并按配置执行 API Key 鉴权和限流。

控制机负责执行部署脚本，并通过 Docker Compose 管理网关与 CART。它可以是普通服务器，本教程由服务器 1 兼任：

![四台服务器的示例 IP 与角色：服务器 1 兼任控制机、网关与 CART，其余三台运行推理实例](server-roles-table.png)

当 CART 被健康检查判为不可用时，网关可以转向健康的引擎后端，继续接收新请求。已经进入故障链路的请求仍可能失败，需要由客户端处理。网关和 CART 均运行在服务器 1 上。

## 02 部署前逐台确认环境

先准备宿主机驱动、容器运行时、模型权重与网络，之后再由部署脚本启动服务。获取代码和拉取镜像时，需能访问相应的仓库与镜像地址。下面按“每台服务器”和“控制机”列出检查步骤。

### 2.1 硬件、存储与网络

![部署前准备清单：加速卡、主机内存、模型权重、磁盘与网络端口要求](env-checklist-table.png)

本例的模型集合通信在各自服务器内完成，跨服务器主要通过网关与路由分配请求。部署前确认相关端口空闲，实例启动后再验证控制机到引擎的连通性。

### 2.2 每台服务器：驱动与 Docker

先执行：

```bash

npu-smi info

docker version

```

确认本机 8 张 NPU 都能识别、驱动状态正常，Docker 可用。随后安装昇腾 Ascend Docker Runtime，并检查 Docker 已注册名为 `ascend` 的运行时：

```bash

docker info | grep -i runtimes

```

输出应包含 `ascend`。如果 Runtime 已安装但未注册，将下面字段**合并到**现有 `/etc/docker/daemon.json`，保留原有配置，路径以本机实际安装位置为准：

```json

{

"runtimes": {

"ascend": {

"path": "/usr/local/Ascend/Ascend-Docker-Runtime/ascend-docker-runtime"

}

}

}

```

修改后，以具备权限的用户重启 Docker，再次检查运行时。已有容器业务的机器，应安排好这次重启：

```bash

systemctl restart docker

docker info | grep -i runtimes

```

### 2.3 控制机：Compose 与免密 SSH

控制机需要 Git、Docker Compose 插件和 SSH 客户端；采用下面的权重同步方式时，还需要两侧具备 rsync。

```bash

git --version

docker compose version

```

部署用户要能直接运行 Docker，并读取模型目录。下面以 `root` 为例，使用其他用户时，同时修改 SSH 命令与后文 `.env` 中的 `SSH_USER`。

如果尚无用于部署的 SSH 密钥，先创建，已有密钥则跳过：

```bash

ssh-keygen -t ed25519

```

将公钥安装到另外三台服务器，再验证免密登录：

```bash

for h in 10.0.0.12 10.0.0.13 10.0.0.14; do

ssh-copy-id root@"$h"

done

for h in 10.0.0.12 10.0.0.13 10.0.0.14; do

ssh -o BatchMode=yes root@"$h" hostname

done

```

验证应在免密状态下打印三台服务器的主机名。控制机访问自己的地址时，脚本在本机直接执行。

### 2.4 每台服务器：权重与镜像

本教程使用以下目录：

```text

/data/models/GLM-5.3-Flash-w8a8

```

这里使用配方对应的 W8A8 导出。核对权重格式与模型目录后再同步到其他服务器，确保四台机器使用相同版本；MXFP8 等其他导出需要另行匹配硬件与配置。

如果已将权重放到服务器 1，可从控制机同步到其余三台，先确认各目标服务器的 `/data/models/` 目录存在：

```bash

for h in 10.0.0.12 10.0.0.13 10.0.0.14; do

ssh root@"$h" 'mkdir -p /data/models'

rsync -a --progress /data/models/GLM-5.3-Flash-w8a8 root@"$h":/data/models/

done

```

四台服务器分别预拉取引擎镜像：

```bash

docker pull quay.io/ascend/vllm-ascend:v0.30.0rc2

```

控制机再拉取网关和 CART 镜像。本例采用项目提供的腾讯云镜像地址：

```bash

docker pull modelsphere.tencentcloudcr.com/4pdosc/llm-openresty:0.1.31

docker pull modelsphere.tencentcloudcr.com/4pdosc/cache_aware_router:0.6.6

```

## 03 两个文件，描述四个实例

### 3.1 获取脚本与示例

在控制机执行。为减少后续仓库更新带来的差异，下面固定到本篇核对的提交：

```bash

git clone https://github.com/modelsphere/modelsphere.git

cd modelsphere

git checkout 319c05ecfb6ed12788affa69aa27e32c025372de

cd docker

```

后续脚本命令均在 `modelsphere/docker/` 目录执行。这里包含 `up.sh`、`status.sh`、`down.sh`、`render.sh` 和示例配置。

### 3.2 `.env`：从已适配的昇腾示例开始

```bash

cp examples/glm-5.3-flash-910b4.env .env

```

用编辑器打开 `.env`，确认模型路径，并将两个路由层镜像改为本例使用的地址：

```text

MODEL_PATH=/data/models/GLM-5.3-Flash-w8a8

OPENRESTY_IMAGE=modelsphere.tencentcloudcr.com/4pdosc/llm-openresty:0.1.31

CART_IMAGE=modelsphere.tencentcloudcr.com/4pdosc/cache_aware_router:0.6.6

```

示例已经提供了引擎与 NPU 相关参数。首次部署先保留这组配置，重点核对部署形态：

```text

DEVICES_PER_NODE=8

NODES_PER_INSTANCE=1

TP=8

PP=1

```

`NODES_PER_INSTANCE=1` 表示每台服务器一个实例。配方将 `max-model-len` 配置为 1,048,576 token，并配合相应显存设置，最大上下文决定单条请求可使用的长度，并发容量由实际 KV 缓存池和请求长度共同决定。启动后可从日志查看 KV 容量，再据此规划并发。

### 3.3 `hosts`：每行一台服务器

在当前目录创建 `hosts` 文件：

```bash

cat > hosts <<'EOF'

10.0.0.11

10.0.0.12

10.0.0.13

10.0.0.14

EOF

```

至此，两份配置已经对应起来：`.env` 描述模型如何运行，`hosts` 描述它运行在哪些机器上。环境与路径检查完成后，就可以启动服务。

## 04 启动之后分两步验证

### 4.1 启动服务

```bash

./up.sh

```

脚本会生成配置与各服务器的启动命令，在本机或通过 SSH 启动引擎，等待实例能响应 `/v1/models`，向就绪实例发送预热请求，最后启动网关和 CART 并打印服务地址。

权重加载、图编译和首次请求预热都需要时间。当前示例记录的启动加载过程约需 18 分钟，实际耗时受磁盘、缓存与主机资源影响。部署进度依次经过容器启动、引擎就绪和预热，完成后再验证应用请求。

如果希望跳过脚本等待阶段，可以使用：

```bash

./up.sh --no-wait

```

该模式跳过默认等待与预热分支。执行后，通过下面的状态检查和测试请求确认服务已准备好接收业务。

### 4.2 第一步：检查各实例与路由层

```bash

./status.sh

```

确认四个实例均显示 `serving`，OpenResty 与 CART 运行正常，网关能够响应，脚本返回 0。`loading` 表示容器在运行、引擎仍待就绪。状态长时间停留在这一阶段时，查看对应服务器的引擎日志，定位权重加载、设备或编译环节。

在对应服务器执行：

```bash

docker logs --tail 200 engine-glm-5.3-flash

```

### 4.3 第二步：经过网关发送真实请求

在尚未开启鉴权时，使用示例地址测试：

```bash

curl -sS http://10.0.0.11:8080/glm-5.3-flash/v1/chat/completions \

-H 'Content-Type: application/json' \

-d '{"model":"glm-5.3-flash","messages":[{"role":"user","content":"用一句话介绍一下你自己"}],"max_tokens":256}'

```

确认收到有效响应后，再接入支持相应 Chat Completions 协议的 SDK 或应用：

```text

base_url = http://10.0.0.11:8080/glm-5.3-flash/v1

model = glm-5.3-flash

```

如果使用了不同 IP、端口或路由名，以 `up.sh` 打印的地址为准。状态检查验证部署是否就绪，测试请求验证从客户端到网关、路由与引擎的调用链路，两者都需要完成。

## 05 接入业务前配置鉴权与限流

### 5.1 开启 API Key 鉴权

默认没有密钥文件时，网关不做 API Key 鉴权。需要启用时，在控制机的 `docker/` 目录创建密钥文件；下面仅为格式示例，使用前替换为实际密钥：

```bash

mkdir -p keys

printf '%s\n' 'sk-replace-with-your-key:team-a' > keys/keys

./up.sh

```

文件格式为 `密钥:使用方`，多组之间用逗号分隔。开启后，请求需携带有效 Bearer 密钥：

```bash

curl -sS http://10.0.0.11:8080/glm-5.3-flash/v1/chat/completions \

-H 'Content-Type: application/json' \

-H 'Authorization: Bearer sk-replace-with-your-key' \

-d '{"model":"glm-5.3-flash","messages":[{"role":"user","content":"你好"}],"max_tokens":256}'

```

更换密钥时，可以先加入新密钥并重载，再移除旧密钥并再次重载。仅修改密钥时，网关平滑重载，现有引擎继续运行。

API Key 鉴权作用于网关入口；引擎默认 8050 端口提供直接调用接口，访问范围应限制在所需内部网络。这样，客户端经网关认证后调用服务，后端端口由网络访问策略保护。

### 5.2 按目标负载开启限流

限流默认关闭。需要开启时，在 `.env` 中修改：

```text

RATE_LIMIT=true

```

再应用配置：

```bash

./up.sh

```

主要参数分别控制不同条件：

![限流主要参数：MAX_CONCURRENCY、TTFT_LIMIT_MS、TPS_LIMIT_TPS 与 CART_MAX_LOAD 的含义](rate-limit-params-table.png)

网关拒绝的新请求会立即得到 429。示例的 `MAX_CONCURRENCY=100` 是宽松默认值，业务并发应根据实际输入长度、KV 容量、首字等待和输出速度设定。下一节的单机参考展示了并发与单请求体验之间的取舍，可用于规划复测。

## 06 性能参考：先分清测量范围

本篇所用配方记录了一组**单机、单实例、引擎直连**数据：一台 910B4 服务器使用 8 张 NPU，配置 1M 上下文；请求输入 50K token、输出 1.5K token。这组记录用于观察单个实例的容量与体验，四实例服务的整体表现则通过统一网关单独验证。具体测量条件如下：

![单机单实例性能参考：并发 1/5/16 下的总吞吐、稳态首 token 时间与单请求输出速度](perf-reference-table.png)

在这组测量中，并发从 1 增加到 16，总吞吐从 544.9 提高到 3,547.5 tok/s，单请求出字速度则从 17.0 降至 6.7 tok/s。批量任务与交互业务可以据此选择不同的复测起点。表内总吞吐包含输入与输出，单请求输出速度单独反映回答生成的快慢。

测量使用的是 192 核、1 TiB 内存主机，容器 CPU 配额为 32、内存上限为 768 GiB；这些限制需按复测环境自行配置，示例默认将宿主机资源交给引擎使用。配方还记录，另一台服务器相同配置在 16 并发下测得 2,789.7 tok/s，差异原因尚未明确。

因此，四机部署完成后，应通过统一入口重新测试，记录每台服务器的处理量、路由分配和请求分布，以实际测量确定整套服务的容量。

表内 TTFT 是稳态记录。新实例首次承接一批长输入时，等待时间可能更长；复测时分别观察启动后的首批请求和稳定运行阶段，按业务要求设定延迟目标。

## 07 改配置之前，确认会影响哪些请求

日常操作仍从 `.env`、`hosts` 和脚本开始，但不同修改的生效方式并不相同：

![常见配置操作的方法与影响范围：查看状态、增减服务器、修改限流或引擎参数等](change-impact-table.png)

日常修改以 `.env` 与 `hosts` 为源，再由脚本生成 `generated/` 中的运行配置。服务运行期间保留该目录，供路由容器持续读取。

这套 Docker 方式将少量服务器组织成可调用的服务：实例数由 `hosts` 管理，配置变更由脚本应用，引擎退出后由运维人员排查并重新执行 `./up.sh`。自动故障恢复、自动扩缩容、滚动更新、路由层高可用和监控告警属于需要单独建设的能力，可根据业务规模继续规划。

## 08 问题从状态和日志定位

![常见问题排查表：现象、优先检查项与处理方向](troubleshooting-table.png)

## 09 动手跑起来，欢迎一起交流

如果你也想在自己的昇腾环境中跑通 GLM-5.3-Flash，准备好环境、权重与镜像后，就可以按下面的部署文档和模型配置开始。

👉 **ModelSphere Docker 部署脚本：**

[https://ourl.cn/fuhByx](https://ourl.cn/fuhByx)

👉 **GLM-5.3-Flash W8A8／910B4 模型配置：**

[https://ourl.cn/dRZTgG](https://ourl.cn/dRZTgG)

动手过程中遇到问题，欢迎到 GitHub 提 Issue，也欢迎分享你的部署经验和改进建议，一起把这条上手路径打磨得更顺畅。

如果这篇指南对你有帮助，也欢迎给 **ModelSphere 点个 Star ⭐ **支持项目，让更多开发者发现它。

👉 **ModelSphere GitHub 仓库：**

[https://github.com/modelsphere/modelsphere](https://github.com/modelsphere/modelsphere)

## 关于我们

**模域 ModelSphere** 是由范式智能（PHANCY）与睿思智联（RiseUnion）共同发起，面向大模型推理的开源生产级基础设施社区，打通异构算力适配、云原生集群调度与极限性能调优，让大模型从“实验室能跑”直通“生产好用”。
