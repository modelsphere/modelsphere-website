---
title: 'ModelSphere now fully supports Ascend: from deployment to inference optimization'
summary: 'The ModelSphere model catalog now includes deployment recipes for Ascend. Using GLM-5.3-Flash on Ascend 950DT as an example, this post covers the parallelism strategy, communication and compilation optimizations, and the throughput results and test limits for specific workloads.'
---

## Ascend deployment recipes are now in the catalog

**The [ModelSphere model catalog](https://modelsphere.tech/en/models) now fully supports heterogeneous AI chips, with close to 20 Ascend deployment recipes already listed, including the latest Ascend 950 series.** In the catalog you can browse inference configurations for different models and hardware, see the engine, image, resources and parameters each deployment needs, and, where performance data is available, compare the baseline recipe with the optimized one.

Take GLM-5.3-Flash: ModelSphere now lists both a baseline and an optimized recipe for Ascend 950DT. For this inference workload we changed the parallelism strategy and enabled Ascend-specific communication and compilation optimizations. **Under the same SLO, the optimized recipe delivers up to 53.5% higher total throughput than the baseline.**

![Ascend deployment recipes in the ModelSphere model catalog](modelcatelog.png)

## Making deployment know-how easier to reuse

On heterogeneous AI chips, choosing a model is only the first step. Which inference engine and image to pair, how many accelerators the model needs, how to set the parallelism strategy, and which optimizations suit the actual workload all affect how quickly you can deploy and how well the service performs.

ModelSphere organizes this information into deployment recipes you can browse. Each recipe records the inference engine, image, resource requirements and deployment parameters for a specific model on specific hardware. For recipes that already have tuning results, you can also see the baseline, the optimized version and the corresponding report.

In the [online catalog](https://modelsphere.github.io/model-catalog/) you can look up recipes by model or hardware and compare deployment configurations. The ModelSphere deployment backend can also sync recipes from the model catalog automatically and use them to deploy models.

With Ascend recipes added, teams running on heterogeneous AI chips can start from an existing configuration and then validate and adjust it against their own hardware and workloads.

## Optimization case study: a more efficient inference configuration for GLM-5.3-Flash on Ascend 950DT

The GLM-5.3-Flash deployment shows how ModelSphere captures hardware-specific optimization practice.

The test used **eight of Ascend's latest 950DT chips** and served the quantized model with vLLM-Ascend. The baseline recipe uses TP8 and DP1; the optimized recipe switches to TP2 and DP4 and runs the model with expert parallelism. Beyond the parallelism changes, we also enabled FlashComm1 sequence parallelism and the Ascend NPU graph and kernel compilation optimizations. These changes aim to make computation and communication during inference more efficient on this hardware. As the chart below shows, **while meeting the SLO, the tuned GLM-5.3-Flash achieves up to 53.5% higher throughput on Ascend 950** ([see the full report](https://modelsphere.tech/en/models/recipe?modelId=glm-5.3-flash&recipeId=vllm-dp4-tp2-950dt-optimized&dataVersion=9666e210408d123249852e2d9744bd6f16620cef&returnTo=%2Fmodels%3Fvendor%3Dascend%26hardware%3DAscend-910B4%26hardware%3DAscend-950DT&tab=performance)).

![Normalized throughput of the baseline and optimized GLM-5.3-Flash recipes on 8 × Ascend 950DT, each at its best concurrency within the SLO](glm53.png)

### Changing the parallelism strategy so multiple accelerators handle concurrent requests better

The baseline uses TP8, spreading the attention-layer computation across all eight accelerators. Tensor parallelism lets several accelerators work on the same batch together, but they have to exchange and reduce intermediate results as the model runs, and that communication overhead costs efficiency.

The optimized recipe changes the attention layers to TP2 and DP4: each pair of accelerators forms a tensor-parallel group, and the four data-parallel groups can serve different batches of requests. The model's MoE expert layers keep using expert parallelism, spreading the experts across accelerators. This narrows the scope of tensor-parallel communication in the attention layers and uses independent requests to raise throughput. The trade-off is that memory usage, communication between experts and load distribution have to be balanced. The actual gain depends on concurrency, request length and the hardware interconnect.

### Sequence parallelism: reducing duplicated work in expert computation

An MoE model routes each token to different experts. When tensor parallelism is combined with expert parallelism, several parallel ranks can hold the same token data, which can cause duplicated computation and communication along the expert path.

This recipe enables sequence parallelism through FlashComm1, so different ranks process different token shards and exchange and restore data only when needed. The goal is to cut duplicated work and unnecessary data transfer in the expert computation. The actual effect also depends on the token distribution and communication overhead. For details, see the [vLLM-Ascend sequence parallelism documentation](https://docs.vllm.ai/projects/ascend/en/v0.30.0/user_guide/feature_guide/sequence_parallelism.html).

### Graph and operator optimizations: lowering execution overhead during inference

LLM inference runs a large number of operators. Besides the computation in each operator, frequent operator launches, scheduling and intermediate-result handling add overhead. This recipe combines three Ascend compilation optimizations:

- **Npugraph_ex** optimizes the computation graph at graph compile time and fuses some operators to reduce launch overhead.

- **Static Kernel** precompiles operators for fixed or rarely changing shapes to reduce runtime overhead; in exchange, the first compilation can lengthen service startup.

- **Super Kernel** executes eligible compiled kernels together, reducing scheduling waits and launch overhead. How much gets fused depends on the operator sequence in the model.

For how these techniques work, see the [vLLM-Ascend graph mode documentation](https://docs.vllm.ai/projects/ascend/en/v0.30.0/user_guide/feature_guide/graph_mode.html). This test compares the whole configuration against the baseline, so the gain cannot be attributed to any single optimization.

| Item                  | Configuration or result                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| Hardware              | 8 × Ascend 950DT                                                                                 |
| Inference engine      | vLLM-Ascend                                                                                      |
| Baseline recipe       | TP8, DP1                                                                                         |
| Optimized recipe      | TP2, DP4, with communication and compilation optimizations                                       |
| Workloads and results | 50k input, 1.5k output: **53.5%** higher total throughput; 8k input, 1k output: **11.7%** higher |

These results compare total throughput at the highest concurrency found by the test sweep, under the constraints that median time to first token does not exceed 20 seconds and per-request output speed is at least 5 tokens per second. Model quality has not been evaluated and the tests have not yet been repeated.

Both the baseline and the optimized configuration are in ModelSphere. Developers can look at the [Ascend 950DT optimized recipe](https://github.com/modelsphere/model-catalog/blob/master/models/glm-5.3-flash/vllm-dp4-tp2-950dt-optimized.yaml) and see the performance records for each workload in the [model metadata](https://github.com/modelsphere/model-catalog/blob/master/models/glm-5.3-flash/metadata.yaml).

## Get started

Browse deployment recipes in the [ModelSphere](https://modelsphere.github.io/model-catalog/) model catalog, and visit the [GitHub repository](https://github.com/modelsphere/model-catalog) to learn about the project and contribute. Help us improve model support and performance optimization on heterogeneous AI chips.
