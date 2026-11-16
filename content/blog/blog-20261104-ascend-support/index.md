---
id: blog-20261104-ascend-support
title: ModelSphere 全面支持昇腾算力：从部署到推理性能优化
summary: ModelSphere 模型目录新增昇腾部署方案。本文以 GLM-5.3-Flash 在昇腾 950DT 上的测试为例，介绍并行策略、通信与编译优化，以及特定负载下的吞吐量结果和测试边界。
kind: internal
slug: ascend-support
publishedAt: 2026-11-06
updatedAt: 2026-11-06T17:19:00+08:00
evidenceIds: []
categoryId: performance
tagIds:
  - ascend
  - vllm
  - benchmarks
technicalKeywords:
  - GLM-5.3-Flash
  - 950DT
  - MoE
---

## 昇腾部署方案现已收录

**[ModelSphere 模型目录](https://modelsphere.tech/models) 现已全面支持信创算力，目前已经收录昇腾模型部署方案将近 20 个，包括最新的昇腾 950 型号。** 用户可以在目录中查看面向不同模型和硬件的推理配置，了解部署所需的引擎、镜像、资源与参数，并在有性能数据的情况下比较基线方案和优化方案。

以 GLM-5.3-Flash 为例，ModelSphere 已收录基于昇腾 950DT 的基线和优化部署方案。针对推理负载，我们调整了并行策略，并启用了昇腾相关的通信与编译优化。**在相同的 SLO 下，优化方案相较基线的总吞吐量最高提升 53.5%**。

![ModelSphere 模型目录中的昇腾部署方案](modelcatelog.png)

## 让模型部署经验更容易复用

在信创环境中部署大模型，选定模型只是第一步。推理引擎与镜像如何匹配、模型需要多少张卡、并行策略如何设置，以及哪些优化适合实际负载，都会影响部署效率和最终性能。

ModelSphere 将这些信息组织成可浏览的模型部署方案。每个方案围绕特定模型和硬件记录推理引擎、镜像、资源需求及部署参数；对于已有性能调优结果的方案，还可以查看基线、优化版本和对应报告。

用户可以通过[在线目录](https://modelsphere.github.io/model-catalog/)按模型或硬件查找方案，比较不同部署配置。ModelSphere 的部署后端也可以自动同步模型目录中的方案，将这些配置用于模型部署。

随着昇腾方案的加入，使用国产算力的团队可以从已有配置出发，结合自己的硬件环境和业务负载进行验证与调整。

## 优化案例 GLM-5.3-Flash：在昇腾 950DT 上探索更高效的推理配置

GLM-5.3-Flash 的部署案例展示了 ModelSphere 如何沉淀面向具体硬件的优化实践。

本次测试使用 **8 张昇腾最新型号芯片 950DT**，基于 vLLM-Ascend 部署量化后的模型。基线方案采用 TP8、DP1；优化方案调整为 TP2、DP4，并结合专家并行运行模型。在并行配置调整之外，我们还启用了 FlashComm1 序列并行，以及昇腾 NPU 图和 kernel 编译相关优化。这些调整旨在结合硬件特点，改善模型推理过程中的计算与通信效率。如下图所示，在最终的测试结果中，**对于在满足 SLO 的条件下，调优后的 GLM-5.3-Flash 在昇腾 950 上最高可以达成 53.5% 的吞吐提升**（[查看详细报告](https://modelsphere.tech/en/models/recipe?modelId=glm-5.3-flash&recipeId=vllm-dp4-tp2-950dt-optimized&dataVersion=9666e210408d123249852e2d9744bd6f16620cef&returnTo=%2Fmodels%3Fvendor%3Dascend%26hardware%3DAscend-910B4%26hardware%3DAscend-950DT&tab=performance)）。

![image-20261106173417092](glm53.png)

### 调整并行策略：让多卡更好地处理并发请求

基线方案使用 TP8，将注意力层的计算分布在 8 张卡上。张量并行可以让多张卡协同处理同一批计算，但各卡在模型执行过程中需要交换和汇总中间结果，通信开销也会影响效率。

优化方案将注意力层调整为 TP2、DP4：每两张卡组成一个张量并行组，四个数据并行组可以处理不同的请求批次。同时，模型的 MoE 专家层继续使用专家并行，将专家分布到多张卡上。这样可以缩小注意力层的张量并行通信范围，并利用独立请求提高吞吐；代价是需要权衡显存占用、专家间通信以及负载分布。具体收益取决于并发量、请求长度和硬件互联情况。

### 序列并行：减少专家计算中的重复工作

MoE 模型会将 token 路由到不同的专家。在张量并行与专家并行结合时，如果多个并行进程持有相同的 token 数据，就可能在专家路径中产生重复计算和通信。

本次方案通过 FlashComm1 启用序列并行，让不同并行进程处理不同的 token 分片，并在需要时交换和还原数据。其目标是减少专家计算中的重复工作和不必要的数据传输。具体效果还会受到 token 分布和通信开销的影响。更多原理可参考 [vLLM-Ascend 序列并行文档](https://docs.vllm.ai/projects/ascend/en/v0.30.0/user_guide/feature_guide/sequence_parallelism.html)。

### 图与算子优化：降低推理过程中的执行开销

大模型推理由大量算子组成。除了算子本身的计算，频繁的算子启动、调度和中间结果处理也会带来开销。本次方案结合了三项昇腾编译优化：

- **Npugraph_ex** 在图编译阶段优化计算图，并融合部分算子，以减少算子启动等开销。

- **Static Kernel** 针对固定或变化较小的计算形状预编译算子，减少运行时开销；相应地，首次编译可能增加服务启动时间。

- **Super Kernel** 将符合条件的已编译 kernel 组合执行，减少调度等待和启动开销。实际融合范围取决于模型中的算子序列。

这些技术的作用机制可参考 [vLLM-Ascend 图模式文档](https://docs.vllm.ai/projects/ascend/en/v0.30.0/user_guide/feature_guide/graph_mode.html)。本次测试比较的是整套配置与基线的结果，因此不能将性能提升单独归因于其中某一项优化。

| 项目           | 配置或结果                                                                    |
| -------------- | ----------------------------------------------------------------------------- |
| 硬件           | 8 × 昇腾 950DT                                                                |
| 推理引擎       | vLLM-Ascend                                                                   |
| 基线方案       | TP8、DP1                                                                      |
| 优化方案       | TP2、DP4，结合通信与编译优化                                                  |
| 测试负载与结果 | 50k 输入、1.5k 输出：总吞吐量提升 **53.5%**；8k 输入、1k 输出：提升 **11.7%** |

上述结果比较了在首 token 延迟中位数不超过 20 秒、单请求输出速度不低于 5 token/秒的条件下，测试扫描得到的最大并发点的总吞吐量。测试尚未进行模型质量评估或重复验证。

基线和优化配置均已收录在 ModelSphere 中。开发者可以查看[昇腾 950DT 优化方案](https://github.com/modelsphere/model-catalog/blob/master/models/glm-5.3-flash/vllm-dp4-tp2-950dt-optimized.yaml)，并通过[模型元数据](https://github.com/modelsphere/model-catalog/blob/master/models/glm-5.3-flash/metadata.yaml)了解不同负载下的性能记录。

## 开始使用

欢迎访问 [ModelSphere](https://modelsphere.github.io/model-catalog/) 模型目录浏览模型部署方案，也欢迎通过 [GitHub 仓库](https://github.com/modelsphere/model-catalog)了解项目并参与社区贡献，共同完善国产算力上的模型适配与性能优化实践。
