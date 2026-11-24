---
title: 'How Well Do LLMs Perform on the RTX 6000D with ModelSphere?'
summary: 'As LLM inference scales to production, striking the right balance between hardware cost and VRAM capacity has become increasingly critical. ModelSphere conducted in-depth adaptations on the cost-effective NVIDIA RTX 6000D and codified the validated model-and-engine configurations into reusable deployment recipes. Below, we walk through the key engineering bottlenecks we encountered during bring-up and present benchmark results for six model configurations under long-context workloads.'
cover:
  src: cover.en.jpg
  alt: 'Deploying LLMs on the RTX 6000D with ModelSphere: How Well Does It Perform?'
  width: 2750
  height: 1536
---

**The primary reason we chose to adapt and catalog the NVIDIA RTX 6000D is its strong price-performance ratio.** As LLM inference scales up, keeping hardware CapEx in check while satisfying production SLAs is a practical challenge every team faces. For cost-sensitive inference workloads that still demand substantial VRAM to host large-parameter models or long context windows, the RTX 6000D's 84GB-class memory footprint per GPU makes it a compelling hardware option worth serious evaluation.

However, favorable hardware economics are only the starting point. Getting large models to run reliably on this card requires clearing several engineering hurdles. The RTX 6000D comes with specific constraints around kernel support, memory allocation, and inter-GPU communication. Whenever you swap the model, weight format, or inference engine, previously working configurations often have to be re-verified and tuned from scratch.

To address this, ModelSphere systematically adapted and validated multiple weight-and-engine combinations across DeepSeek, GLM, and Kimi, distilling the results into ready-to-use RTX 6000D deployment recipes. Each recipe captures the required container image, GPU and node counts, compute backends, parallelism topology, and memory parameters.

In the sections below, we start with the startup and numerical accuracy issues encountered during bring-up to show how these configurations were derived, followed by long-context benchmark results across six setups. If your workload requires multi-node scaling, we also cover Prefill-Decode (PD) disaggregation setups and RoCE fabric troubleshooting toward the end for direct reference.

## 01 From Startup to First Token: Verify It Runs and Computes Accurately

Before tuning model-specific parameters, you need to understand the hardware's architectural boundaries and verify that the serving engine both initializes cleanly and produces numerically accurate outputs.

### Hardware Environment

Each node in our testbed is equipped with 8× RTX 6000D GPUs (compute capability `sm120`), exposing 85,651 MiB (~83.6 GiB) of usable VRAM per card. Unlike flagship data center GPUs, these 8 cards are interconnected via PCIe rather than NVLink.

These two hardware characteristics directly define the boundaries for all downstream configurations: per-GPU VRAM dictates the combined budget for model weights, the KV cache pool, and temporary workspaces, while inter-GPU PCIe bandwidth caps collective communication efficiency. Under Tensor Parallelism (TP), GPUs must frequently exchange and reduce intermediate activations, meaning your TP degree must be balanced against PCIe bandwidth.

Because NVLink is absent, the inference engine's `custom all-reduce` fast path—which relies on peer-to-peer (P2P) direct memory writes over NVLink topologies—is automatically disabled due to topology and P2P constraints, falling back to NCCL for collective communication. When troubleshooting communication bottlenecks, always inspect the startup logs to confirm which communication backend was actually initialized, then evaluate performance against your physical topology. Exact fallback triggers depend on the specific engine version.

### Stalled at Warmup: Kernel Compatibility vs. VRAM Exhaustion

Once weights are loaded, the engine enters warmup and execution preparation. On vLLM, we encountered two distinct failure modes that cause startup to hang or crash at this stage. Although both occur post-weight-loading, their root causes and remedies are completely different:

| Symptom & Root Cause                                                                                                                                        | Resolution                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Certain fused MoE kernels attempt shapes not compiled for `sm120` during autotuning, stalling startup                                                       | Disable FlashInfer autotune per the model recipe, or skip only the problematic fused kernels while retaining autotuning elsewhere |
| Weights load successfully, but VRAM runs out when allocating temporary workspaces during warmup (one recorded spike required ~1.5 GiB of additional memory) | Recalculate non-weight VRAM allocations and adjust budgets for the KV cache pool, activations, and warmup workspaces              |

When startup stalls, check the logs first to pinpoint the exact phase where the engine halted, then cross-reference remaining free VRAM to quickly determine whether to adjust kernel settings or tighten the memory budget.

### Post-Startup: Run a Deterministic Regression Suite

Once the server is up and passes health checks, you must verify output correctness—a far more insidious risk than a hard crash is **silent numerical corruption**. During testing, we observed models failing basic arithmetic or outputting fragmented strings of digits. Inspecting the raw API response text revealed the exact same corrupted output, confirming the issue originated in the forward pass itself. Further isolation traced the bug to a specific quantized compute path, while other kernel paths within the same library ran cleanly under the tested setup.

To catch silent compute bugs early in deployment, we established a simple, practical smoke-regression workflow: select a handful of deterministic prompts with unambiguous answers, set `temperature=0`, send serial requests at low concurrency, and inspect the raw response text directly.

We re-run this check whenever we change the model, weight format, engine version, or compute backend. Because inference engines dynamically dispatch low-level kernels based on hardware capability and quantization format—often without exposing those choices in CLI flags—only end-to-end validation of the exact runtime stack can guarantee correctness.

Look out for two primary failure signals:

- **Blatantly wrong answers or garbled text**: Halt rollout immediately and run differential checks across weight files, weight loaders, compute kernels, and output post-processing to isolate the root cause.

- **Non-deterministic outputs for identical inputs**: Log the exact reproduction conditions, then investigate batch composition and compute determinism. While `temperature=0` enforces greedy decoding, underlying forward-pass kernels can still exhibit variance as concurrent batch shapes change—which is why serial execution at low concurrency is recommended. For details, see the [vLLM Batch Invariance documentation](https://docs.vllm.ai/en/latest/features/batch_invariance/).

This regression suite serves as a fast pre-flight smoke check to catch obvious compute failures early; comprehensive generation quality should still be evaluated against domain-specific datasets at your target context lengths.

## 02 Match Recipes to Models and Engines, and Align Key Adaptations

After resolving startup and numerical issues, ModelSphere packaged the six validated RTX 6000D setups into standardized deployment recipes. To pick one, align your target model and weight format, choose between SGLang and vLLM, and verify the GPU count, node count, and parallelism layout.

The table below summarizes the runtime topologies and critical adaptation settings for all six combinations. For exact container image tags, CLI flags, and resource specs, refer to the corresponding recipe files:

| Model                        | SGLang          | vLLM           | Key Adaptation Notes                                                                                                      |
| ---------------------------- | --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| DeepSeek-V4-Flash            | TP4 / TP8       | TP4 / TP8      | vLLM: Set KV block size to 256                                                                                            |
| DeepSeek-V4-Flash-0731-NVFP4 | TP4 / TP8       | TP4 / TP8 / PD | SGLang: Use Marlin; vLLM: Disable autotune, set KV block size to 256                                                      |
| DeepSeek-V4-Pro              | TP8 × PP2       | TP8 × PP2      | vLLM: Set KV block size to 256, skip specific autotune kernels                                                            |
| GLM-5.2-NVFP4                | TP8 × PP2 × EP8 | TP8 × PP2      | SGLang: Enable EP8 and specify quantization format; vLLM: Skip specific autotune kernels                                  |
| GLM-5.3-NVFP4                | TP8 × PP2 × EP8 | TP8 × PP2 / PD | SGLang: Enable EP8, specify quantization format, set static memory fraction to 0.72; vLLM: Skip specific autotune kernels |
| Kimi-K3                      | TP8 × PP4       | TP8 × PP4      | SGLang: Use Marlin; vLLM: Disable autotune                                                                                |

Abbreviations used above: `PP` (Pipeline Parallelism) partitions model layers across sequential stages; `EP` (Expert Parallelism) distributes MoE experts across separate ranks; `PD` (Prefill-Decode Disaggregation) separates prompt prefill and token-by-token decode onto dedicated instances, covered in detail in Section 05.

Adaptation notes are listed per model because each model-engine pairing enforces strict constraints on paging granularity, compute backends, and tensor sharding.

### KV Cache Block Size Must Match the Attention Implementation

Our vLLM recipes for the DeepSeek family uniformly set `--block-size=256` to configure KV cache paging granularity. On the sparse attention indexer path tested here, there is virtually no room to deviate from this value: setting the block size to 64 or 128 caused worker initialization to crash outright—in one instance throwing only a division-by-zero error with zero mention of block size in the stack trace.

Consequently, if you hit initialization crashes on this stack, verify the recipe's required block size before debugging further. Note that `256` applies specifically to the DeepSeek models and sparse attention path tested here; other models should follow their respective recipe defaults.

### Same NVFP4 Format, Different Backends and Sharding Strategies

Even when models share the NVFP4 weight format, their required execution paths within the same engine can differ substantially. In SGLang, for example, DeepSeek-V4-Flash-0731-NVFP4 runs on the Marlin backend, whereas GLM-5.3-NVFP4 requires FlashInfer CUTLASS—in our testing, GLM failed immediately during MoE weight loading until the loader and sharding layout were aligned.

The same applies to parallelism strategies. In the SGLang + GLM NVFP4 setup, pure TP sharding triggered a 2× dimension mismatch shape error. The corresponding recipe resolves this by introducing `EP8` to shard experts across ranks while explicitly specifying the `modelopt_fp4` quantization format. For GLM-5.3, we also lowered `--mem-fraction-static` to `0.72` to leave headroom for startup and CUDA Graph capture. You can inspect the full configuration in the [GLM-5.3 recipe](https://github.com/modelsphere/model-catalog/blob/c7219f9091937890ed54f547af94639e26310920/models/glm5.3/sglang-tp8-pp2-ep8-6000d.yaml).

When bringing up a new combination, locking down the exact model, weight format, and engine version first—and then systematically verifying the backend, sharding topology, and memory flags—will save substantial debugging time.

### Multi-Node Parallelism: Intra-Node TP, Inter-Node PP

For models requiring multi-node capacity, our deployments use `TP8 × PP2` on 2-node setups and `TP8 × PP4` on 4-node setups—strictly keeping Tensor Parallelism within a single node and scaling across nodes via Pipeline Parallelism.

This strategy balances communication efficiency against quantized weight-loading constraints. First, as noted in Section 01, intra-node GPUs communicate over PCIe, so extending TP across nodes would incur prohibitive collective communication overhead. Second, certain FP4 checkpoints threw 2× shape mismatch errors under `TP16` sharding due to incompatibilities between packed quantized weight layouts and sharding granularity. Keeping TP confined to the 8 GPUs inside a single host and using PP across nodes—while provisioning communication and execution budgets per pipeline stage—proved to be the most reliable topology. If you adopt a new weight-packing format or engine release, re-verify loader support and inter-node network bandwidth.

## 03 Budget VRAM Across Warmup, Graph Capture, and Runtime

Once you have selected a ModelSphere recipe, memory allocation is the most common failure point when deploying onto physical machines. Beyond resident model weights, each GPU must simultaneously accommodate the KV cache pool, forward activations, temporary workspaces, and runtime execution overhead such as CUDA Graph capture.

Take a ~430 GiB model checkpoint as an example: sharded evenly across 8 GPUs on a single node, weights alone consume ~54 GiB per card. Out of the RTX 6000D's ~83.6 GiB of usable VRAM, less than 30 GiB remains for everything else. While exact shard sizes vary slightly by parallelism strategy, you can use the following inequality for initial capacity planning and refine it using peak memory logs from each execution phase:

`KV Cache + Activations & Temp Workspaces + CUDA Graph Overhead < Usable VRAM − Per-GPU Weights`

### Rule-of-Thumb Memory Fractions Break on Smaller-VRAM Cards

Commonly shared memory fraction heuristics (such as `0.85` or `0.90`) are **ratios**, whereas the memory required for CUDA Graph capture and temporary workspaces is a largely fixed **absolute footprint**. When moving to a GPU with less total VRAM, keeping the same ratio dramatically shrinks the absolute headroom left over.

In our cross-hardware comparison, a model that ran cleanly at `0.85` on a 288 GiB GPU required lowering SGLang's `--mem-fraction-static` to `0.72` just to complete startup on the 83.6 GiB RTX 6000D. Furthermore, SGLang's `mem-fraction-static` and vLLM's `gpu-memory-utilization` cover slightly different memory scopes, so always interpret the numerical value alongside the specific engine's memory allocator semantics.

**Pay close attention to the CUDA Graph capture phase.** During tuning, we lowered the static memory fraction three consecutive times and still saw the engine abort with OOM during graph capture; one recorded trace showed graph capture alone consuming ~6.5 GiB. Actual overhead fluctuates based on capture batch sizes and execution stages, so monitor three metrics simultaneously while tuning: whether graph capture completes, how much capacity remains for the KV cache pool, and whether enough headroom is left once target traffic hits. Because lowering the static memory fraction directly shrinks the KV cache pool, stop reducing it once you find a stable threshold that supports startup and target concurrency, then calculate your maximum supported context length and concurrency from there.

### Multi-Node Startup Crashes: Check the Failing Worker Logs Directly

In multi-node deployments, OOM failures during graph capture can be misleading. We encountered cases where the engine suddenly terminated ~40 seconds after weight loading finished; the head node (leader) logs showed only a generic child-process exit signal with no clear cause, while the actual Python/C++ traceback was buried in the failing worker node's logs.

When this happens, inspect the logs on every worker node to identify which phase failed and check remaining free memory immediately after graph capture. If the server boots cleanly and only triggers allocator OOM warnings once concurrent traffic ramps up, runtime headroom is too tight—lower the memory fraction slightly or cap incoming concurrency.

## 04 Long-Context Benchmarks: How Six Models Perform on the RTX 6000D

With configurations and memory budgets settled, the core question remains: how fast do these models actually run on the RTX 6000D?

All six benchmarks below were run on **vLLM** under a standardized long-context workload: **50K input tokens and 1.5K output tokens** per request, **concurrency 30**, sustained for **600 seconds**. Requests were sent to `/v1/completions` using exact token IDs to strictly control prompt lengths, with **0% prefix cache hit rate** throughout to measure raw uncached compute performance. Because parameter counts, quantization formats, and GPU counts differ across models, these tables serve as reference baselines for each validated configuration.

### Aggregate Throughput

| Model                        | Deployment Topology          | Input Throughput (tok/s) | Output Throughput (tok/s) | Total Throughput (tok/s) |
| ---------------------------- | ---------------------------- | ------------------------ | ------------------------- | ------------------------ |
| DeepSeek-V4-Flash-0731-NVFP4 | 1 Node, 8 GPUs (TP8)         | 9,892                    | 272.7                     | 10,164                   |
| DeepSeek-V4-Flash            | 1 Node, 8 GPUs (TP8)         | 7,734                    | 209.8                     | 7,943                    |
| GLM-5.2-NVFP4                | 2 Nodes, 16 GPUs (TP8 × PP2) | 5,455                    | 128.2                     | 5,584                    |
| DeepSeek-V4-Pro              | 2 Nodes, 16 GPUs (TP8 × PP2) | 5,395                    | 160.1                     | 5,556                    |
| GLM-5.3-NVFP4                | 2 Nodes, 16 GPUs (TP8 × PP2) | 5,335                    | 144.3                     | 5,480                    |
| Kimi-K3                      | 4 Nodes, 32 GPUs (TP8 × PP4) | 4,976                    | 108.3                     | 5,084                    |

Total throughput equals input throughput plus output throughput. Under a prefill-heavy 50K-in / 1.5K-out workload, prompt processing accounts for the vast majority of total tokens. To evaluate user-perceived responsiveness, examine Time to First Token (TTFT) and per-request generation speed in the next table. All values reflect original rounded measurements, so minor rounding differences exist between component sums and totals.

### Per-Request Latency & Per-GPU Efficiency

| Model                        | TTFT   | Per-Request Output Speed | Per-GPU Total Throughput (tok/s) |
| ---------------------------- | ------ | ------------------------ | -------------------------------- |
| DeepSeek-V4-Flash-0731-NVFP4 | 6.4 s  | 10.2 tok/s               | 1,271                            |
| DeepSeek-V4-Flash            | 5.7 s  | 7.7 tok/s                | 993                              |
| GLM-5.2-NVFP4                | 67.2 s | 5.3 tok/s                | 349                              |
| DeepSeek-V4-Pro              | 12.0 s | 5.3 tok/s                | 347                              |
| GLM-5.3-NVFP4                | 36.7 s | 5.3 tok/s                | 343                              |
| Kimi-K3                      | 14.2 s | 4.4 tok/s                | 159                              |

`TTFT` measures the latency from request submission to the first generated output token; per-GPU throughput divides total cluster throughput by the number of GPUs used, providing a normalized view of per-card efficiency across multi-node scales.

Viewing both tables together highlights the classic trade-off between **aggregate throughput** and **per-request user experience**: both Flash variants remain snappy at concurrency 30, delivering TTFTs of 6.4s and 5.7s and per-request speeds of 10.2 and 7.7 tok/s. By contrast, GLM-5.2 and GLM-5.3 see TTFT stretch to 67.2s and 36.7s at the same concurrency; pushing concurrency any higher on those models requires checking request queuing and remaining KV cache capacity first.

Based on these results, we recommend the following starting concurrency baselines when benchmarking on your own workloads:

- **DeepSeek-V4-Flash (both variants)**: Headroom remains at concurrency 30; feel free to scale higher.

- **DeepSeek-V4-Pro**: Start evaluation around concurrency 30.

- **GLM-5.2-NVFP4 / GLM-5.3-NVFP4**: Start testing around concurrency 20 and 24, respectively.

- **Kimi-K3**: Use concurrency 30 when optimizing for batch throughput, or start around concurrency 16 for interactive latency-sensitive workloads.

**Keep in mind that all metrics above were captured at a fixed concurrency of 30; any change in concurrency requires re-benchmarking TTFT and per-request generation speed.** When selecting a model for production, weigh your real-world input/output length distributions, latency SLAs, and task accuracy requirements together.

## 05 Prefill-Decode (PD) Disaggregation: Resource Sizing & KV Transfer

When your traffic is heavily skewed toward **long inputs and short outputs**—making the prefill phase the primary bottleneck—consider **Prefill-Decode (PD) disaggregation**. Separating prompt ingestion (prefill) from autoregressive token generation (decode) onto distinct instance pools allows each stage to scale independently.

However, disaggregation introduces an additional routing layer and a cross-node KV cache transfer fabric, and the ratio of prefill-to-decode instances must closely match your workload profile. In an ablation test under a prefill-heavy workload, cutting the prefill pool in half while keeping decode capacity constant reduced per-GPU throughput by ~20% and nearly doubled TTFT. Always profile your actual input/output token ratios and compute bottlenecks before deploying PD disaggregation in production.

### Two Mandatory Configurations for KV Transfer

- **Explicitly pin the RDMA NIC (HCA) used for KV transfer.** Leaving NIC selection to automatic discovery can cause prefill and decode nodes to pick interfaces on unreachable subnets. This failure mode is deceptive: in our tests, the initial connection handshake succeeded with zero RDMA errors, only for both sides to immediately time out and report peer failure. On the SGLang path, explicitly bind the transfer interface using `--disaggregation-ib-device`, ensuring the flag matches your transfer backend and engine version.

- **Adjust CUDA memory allocator behavior for RDMA registration.** In our testing, registering VRAM allocated via `expandable segments` with the KV transfer backend immediately failed with an `invalid address` error. Our PD recipes therefore set `expandable_segments:False` on the memory allocator. By contrast, TP/PP collective operations use the communication library's own buffer registration path and should be verified separately. See the [SGLang PD documentation](https://docs.sglang.io/docs/advanced_features/pd_disaggregation) for additional transport details.

### Router and Cache Behavior: Pre-Flight Checklist

Below are five behavioral quirks we encountered with our tested router and engine versions. Because disaggregated routers and engines are evolving rapidly, re-verify these behaviors after every version upgrade:

| Verification Area   | Observed Behavior & Workaround                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Input Format        | The router returns HTTP `422` when receiving prompts formatted as raw token IDs. When load-testing through the router, send text prompts and calibrate token lengths externally.                                   |
| Diagnostic Payloads | The router strips token IDs from responses, while bypassing the router to hit the engine directly fails due to missing handshake metadata. Keep diagnostic test paths aligned with production routing.             |
| Metrics Scraping    | The router does not proxy the engine's `/metrics` endpoint (returning `404`). Point Prometheus scrapers and alerting directly at the engine ports.                                                                 |
| Backend Restarts    | During decode instance restarts, router liveness probes failed and triggered cascading router restarts until the backend recovered. Correlate router and engine logs on a unified timeline when debugging outages. |
| Tiered Caching      | The tested decode setup did not support the configured host-memory tiered KV cache. Verify compatibility and active cache tiers against your exact engine version before enabling host offloading.                 |

## 06 Multi-Node RoCE Troubleshooting: Device, Path, and Link Layers

Our multi-node cluster uses RoCE (RDMA over Converged Ethernet) for high-speed inter-node networking, with each server connected to multiple independent 400GbE physical rails. If your cluster runs on RoCE and exhibits cross-node communication failures or degradation, troubleshoot bottom-up across these four layers:

**Step 1: Verify container access to RDMA devices.** We encountered cases where containers running in isolated Pod network namespaces read an all-zero GID (Global Identifier) table; enabling `hostNetwork` on the inference Pods resolved device visibility. When debugging, check `/dev/infiniband` device nodes and network namespace isolation first, then verify RoCE v1/v2 modes and ensure a valid default GID is selected.

**Step 2: Isolate high-speed NICs for both collectives and KV transfer.** Host management NICs are often enumerated alongside compute NICs, even though they sit on a separate out-of-band network. Ensure all inter-node compute traffic is explicitly pinned to your 400GbE fabric: set `NCCL_IB_HCA` for NCCL collectives, and use the engine's explicit device flag for SGLang PD KV transfers. Also check PCIe affinity between GPUs and NICs to avoid cross-socket NUMA detours.

**Step 3: Check physical link stability on intermittent slowdowns or timeouts.** Sudden throughput drops do not always produce hard link-down errors—we traced one intermittent slowdown to a single degraded physical lane on a 400GbE port causing frequent link flapping. Inspect NIC `carrier_changes` counters alongside port error, packet drop, and link speed statistics first.

**Step 4: Audit the PCIe path for GPUDirect RDMA.** Standard host-to-NIC RDMA and GPUDirect RDMA (GPU-to-NIC P2P) must be validated separately. If PCIe Access Control Services (ACS) redirection is enabled in BIOS/OS, P2P traffic between GPUs and NICs gets routed through the CPU root complex, severely degrading throughput or hanging collectives. Note that in our environment, server reboots reset ACS states back to BIOS defaults—always re-verify ACS settings after a reboot. For bare-metal and virtualized remediation steps, consult the [NVIDIA NCCL GPU Troubleshooting Guide](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/gpu_troubleshooting.html).

## 07 Pick a Recipe in ModelSphere and Launch Your Deployment

If you already have ModelSphere installed, open the model catalog, locate your target model, and select the corresponding RTX 6000D deployment recipe. Verify the GPU count, node count, weight format, and container image tag, plug in your local weight paths and network interfaces, and launch.

👉 **Browse all models and deployment recipes**: [ModelSphere Model Catalog](https://modelsphere.tech/models)

For a concrete reference, inspect the [vLLM TP8 configuration](https://github.com/modelsphere/model-catalog/blob/c7219f9091937890ed54f547af94639e26310920/models/deepseek-v4-flash-0731-nvfp4/vllm-tp8-6000d.yaml) for deploying DeepSeek-V4-Flash-0731-NVFP4 on a single 8-GPU node to see how container images, resource requests, KV block sizes, and autotune flags come together. Note that recipe links in this post point to pinned commits; check the catalog for the latest updates before deploying.

When evaluating the RTX 6000D, attractive hardware economics are just the beginning—real-world performance under your production workload is what counts. Once your model boots cleanly, run a quick deterministic regression check to verify numerical accuracy, then benchmark throughput, TTFT, and per-request generation speed at your target sequence lengths and concurrency.

If you run into similar issues during bring-up or discover better tuning parameters, open an issue on GitHub to share your findings. Including your model, weight format, engine version, and relevant logs helps the community diagnose issues much faster.

If you found this guide helpful, please **give ModelSphere a Star ⭐** on GitHub so more teams can discover and reuse these hardware adaptation recipes.

👉 **Code, docs, and community**: [ModelSphere GitHub Repository](https://github.com/modelsphere/modelsphere) · [Deployment Recipe Catalog](https://github.com/modelsphere/model-catalog)
