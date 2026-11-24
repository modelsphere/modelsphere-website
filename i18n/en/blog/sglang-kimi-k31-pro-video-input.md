---
title: 'ModelSphere Adds the Final Piece to SGLang Inference for Kimi-K3.1-Pro: Native Video Input'
summary: 'ModelSphere has integrated native video input support for Kimi-K3.1-Pro into SGLang and published a one-click deployment recipe on its platform. This article breaks down the end-to-end pipeline—from video ingestion and temporal encoding to visual token generation—showing how existing model weights are reused and how to deploy a video-capable inference service via ModelSphere.'
---

While the official Kimi-K3.1-Pro API already supports video inputs, teams looking to self-host the model and leverage this capability in on-premises or private cloud environments must bridge the gap between raw video ingestion and their existing inference stack.

In the open-source model and SGLang versions targeted in this integration, the baseline pipeline already supported text and image inputs, but lacked video decoding, frame sampling, temporal chunking, and multi-frame inference adaptation. Deploying that baseline version out of the box left a feature gap compared to the official API.

To close this gap, ModelSphere built out the complete processing pipeline—from request ingestion to visual feature fusion—and packaged the adaptation as a standalone plugin. Once installed, text, images, and videos can all be served within a single local inference instance, reusing the existing vision encoder, feature projector, and LLM backbone for generation.

This capability has also been added to ModelSphere's deployment catalog as the Kimi-K3.1-Pro video input recipe. Once ModelSphere is installed, you can enable the recipe directly in production for one-click deployment.

**By distilling model integration, temporal processing, and inference framework adaptations into open-source components and deployment recipes, ModelSphere brings official-API-equivalent video input capabilities to self-hosted production services.**

Below is a detailed breakdown of how this video input pipeline works.

## 01 Reuse Existing Model Weights to Complete the Video Input Pipeline

To understand this extension, it helps to look at how text, images, and videos are ultimately transformed before entering the LLM.

Text undergoes tokenization and embedding lookup to produce dense vectors for the language model. Images are read and decoded into raw pixel arrays; videos are first decoded into individual frames, then sampled according to configuration and grouped into temporal chunks to preserve frame ordering.

Both image pixels and organized video frames then enter a shared image preprocessing pipeline for resizing, padding, normalization, and patch splitting before routing into their respective visual encoding paths. Next, the Projector maps the encoded visual features into the hidden dimension of the language model.

Finally, text embeddings and visual embeddings are interleaved according to their positions in the prompt to form a unified input sequence.

![Kimi K3.1 Pro text, image, and video input pipeline: images and video frames share image preprocessing; visual encoding reuses the same weights](input-pipeline-overview.en.png)

_Figure 1: Processing flow across text, image, and video inputs. Images and video frames share the same image preprocessing pipeline; visual encoding reuses the same set of model weights with tailored execution paths._

Because the existing image pipeline already handles preprocessing, visual encoding, feature projection, and autoregressive generation, integrating video reuses these core modules while adding three new stages:

- **Video reading and frame decoding**: Extracts video payloads from incoming requests and decodes them into processable image frames.
- **Frame sampling and temporal chunking**: Preserves temporal ordering across sampled frames and groups them into multi-frame chunks for visual encoding.
- **Video visual encoding adaptation**: Reuses the existing vision weights while handling multi-frame inputs and temporal positional embeddings.

Images and videos share the exact same vision encoder weights, each following a processing path matched to its modality: the image path extracts spatial features, while the video path additionally fuses temporal context across frames.

## 02 Plug-and-Play Architecture: Serving Multimodal Inputs in One Instance

To keep the new logic decoupled for independent installation and upgrades, we packaged the extension as a standalone Python wheel and wired it into the execution lifecycle via SGLang's hook mechanism at server startup.

This architecture separates extension code from the core framework source, hooking into the existing model at runtime. Incoming video requests route through the new processing logic, while text-only and image requests continue along their original execution paths.

![Kimi K3.1 Pro video input architecture: the video input plugin attaches to the same SGLang service, adding video ingestion and temporal adaptation while reusing existing models](plugin-architecture.en.png)

_Figure 2: Integrating the plugin into a unified SGLang instance. Orange indicates newly added video ingestion and adaptation modules; blue-purple represents existing capabilities and model weights. TP8, DCP8, DSpark, and HiCache illustrate the baseline topology; refer to the recipe page for exact container images and runtime flags._

The plugin handles three main areas of adaptation:

- **Message parsing and positional alignment**: Accepts and validates Base64-encoded video payloads while preserving the interleaved ordering of text, images, and videos in chat messages, ensuring each visual feature segment maps to its exact placeholder position in the prompt.
- **Multi-frame compute adaptation**: Organizes video chunks, reuses existing image preprocessing kernels, and aligns device placement and data types (`dtype`) for multi-frame temporal positional embeddings before feeding them into the vision encoder.
- **Cache key generation and token usage accounting**: Generates prefix-cache lookup keys incorporating both media content and processing configurations, and accurately attributes video tokens in API usage metrics.

Maintaining the extension as an independent plugin allows it to be maintained and updated separately from the underlying engine. This adaptation spans request parsing, multi-frame encoding, feature alignment, cache keying, and usage tracking, seamlessly integrating video capabilities into the end-to-end serving lifecycle. Be sure to deploy with a compatible SGLang version and re-verify hook interface compatibility after framework upgrades.

Plugin source code and version requirements: [https://github.com/modelsphere/kimi-video](https://github.com/modelsphere/kimi-video)

## 03 From Raw Video Bytes to LLM-Ready Visual Features

The diagram below illustrates the complete inference workflow. Video inputs pass through ingestion and preprocessing, enter the vision encoder and Projector, and are finally fed into the LLM alongside text embeddings.

![Kimi K3.1 Pro video input inference steps: video preprocessing, visual encoding, feature projection, and LLM generation](inference-steps.en.png)

_Figure 3: End-to-end pipeline covering video preprocessing, visual encoding, feature projection, and generation. Modules labeled "New" represent added extension logic; decoders, GPU kernels, and core model weights are reused._

### Organizing Video into Temporal Chunks

First, Base64 decoding reconstructs the raw video byte stream from the request payload, after which a video decoder extracts individual image frames. These are two distinct stages: the former handles transport encoding, while the latter decodes the media container and codec.

The plugin uniformly samples frames according to configuration and groups them sequentially into temporal chunks. In the current implementation, each chunk holds up to 4 frames, and a single video can span multiple chunks. Trailing chunks containing fewer than 4 frames are processed at their actual frame count to preserve sampling fidelity and temporal ordering.

Next, individual frames pass through the existing image preprocessing pipeline for resizing, padding, normalization, and patch splitting—where each patch represents a small spatial region of a frame. On the video path, the preprocessor also enforces frame/token budgets and ensures all frames within a chunk share a uniform spatial grid.

The resulting frame tensors are packaged alongside their spatiotemporal grid metadata and aligned with the visual placeholder tokens reserved in the prompt. Here, the grid `[T, h, w]` records the number of frames in the chunk (`T`) along with the height (`h`) and width (`w`) of the patch grid per frame.

### Encoding Spatiotemporal Context and Compressing Visual Sequences

Once inside the vision model, pixel patches pass through a patch embedding layer that projects them into dense feature vectors enriched with spatial and temporal positional encodings.

Next, `MoonViT3d` applies intra-chunk spatiotemporal attention so each token representation fuses both spatial and temporal context across the chunk. Following encoding, temporal pooling and spatial merging compress the sequence to reduce the number of visual tokens passed downstream to the LLM.

The Projector then maps these merged features into the LLM's hidden dimension. Finally, the serving engine scatters these visual embeddings into their designated prompt positions, runs Prefill jointly with text embeddings, and generates output tokens autoregressively during Decode.

This execution flow also dictates the components of Time to First Token (TTFT): **before returning the first output token, the server must complete preprocessing and visual encoding for all sampled frames as well as the LLM Prefill pass over the combined multimodal sequence.**

Once frame processing and Prefill finish, the service streams generated tokens one by one. Because TTFT includes this upfront multimodal ingestion overhead, sampling more frames or increasing processing resolution—all else being equal—will increase vision compute and Prefill sequence length, so processing budgets should be tuned against your latency SLAs.

## 04 Tracing Visual Token Formation with a Concrete Example

While flowcharts show what each stage does, tracking tensor shapes makes it clear how the data actually transforms.

Suppose a single video chunk contains **4 frames**, each divided into a **4 × 4 patch grid**, followed by **2 × 2 spatial merging**. These numbers are for illustration only; actual frame counts, spatial grids, and hidden dimensions depend on the input video and runtime configuration.

In the diagram below, `Dv` denotes the vision encoder hidden dimension, `Dl` denotes the LLM hidden dimension, and `P` denotes the side length of each square pixel patch.

We break down the shape transformations step by step for clarity; in practice, the implementation may fuse certain operations and use equivalent intermediate memory layouts.

![Illustrative tensor transformations: from video frames to pixel patches, feature vectors, MoonViT3d encoding, temporal pooling, spatial merging, Projector projection, and fusion with text](tensor-shapes.en.png)

_Figure 4: Illustrative walkthrough with `T = 4`, `h = w = 4`, and `2 × 2` spatial merging. Color blocks track frame and spatial groupings; actual hidden dimensions and values depend on the model and input._

### 64 Pixel Patches Become 64 Feature Vectors

With 16 patches per frame across 4 frames, there are 64 patches in total. Each RGB pixel patch has shape `[3, P, P]`, forming a combined input tensor of:

`[64, 3, P, P]`

After patch embedding, each patch is projected into a `Dv`-dimensional feature vector, yielding:

`[64, Dv]`

Think of this tensor as a table with 64 rows (one per patch) and `Dv` columns (feature dimensions). After `MoonViT3d` encoding, the tensor retains its `[64, Dv]` shape, but every row vector now encodes spatiotemporal context across the entire chunk.

### Temporal Averaging and Spatial Concatenation

Temporal pooling averages the **encoded features** across frames at each corresponding spatial location. In our example, the 64 vectors across 4 frames compress down to 16 spatial vectors:

`[64, Dv] → [16, Dv]`

Because each input vector already incorporates intra-chunk spatiotemporal context, temporal pooling aggregates multi-frame representations at each spatial coordinate into a unified per-location feature.

Spatial merging then concatenates neighboring `2 × 2` patches along the channel dimension. Four vectors merge into one—reducing the row count by 4× while expanding the feature width by 4×:

`[16, Dv] → [4, 4Dv]`

### Projecting to LLM Dimensions and Placing into the Prompt

Finally, the Projector maps these 4 wide vectors into the LLM's hidden dimension:

`[4, 4Dv] → [4, Dl]`

This step transforms the hidden width while keeping the token count at 4. These 4 visual embeddings are then placed into their corresponding slots in the prompt, combining with text and special protocol tokens to form the final `[L, Dl]` input sequence (where `L` is the total sequence length).

In this example, a 4-frame chunk with a `4 × 4` patch grid per frame compresses into 4 visual tokens after temporal pooling and `2 × 2` spatial merging. Across an entire video, total visual tokens accumulate across all chunks and scale with sampled frame count, spatial grid resolution, and merging settings.

## 05 Pre-Integration Checklist: Input Formats and Resource Boundaries

The plugin currently accepts video payloads formatted as `data:video/<format>;base64,<payload>`. **Processing covers visual frames only; audio tracks are not currently parsed.** Text, images, and videos can be freely mixed within requests, and video duration, sampling frame rate, and per-frame resolution must be budgeted together.

Before rolling out in production, verify three key areas:

- **Environment compatibility**: The ModelSphere video input recipe bundles the validated container image, plugin enablement flags, and runtime parameters. When deploying via the platform, verify hardware specs and model paths against the recipe; if integrating the plugin manually, check Python, SGLang, and video decoder dependency versions in the repository documentation.
- **Workload-aligned input budgets**: Higher frame counts capture finer temporal dynamics at the cost of extra compute, while higher resolutions increase patch counts and vision encoder load. Tune frame sampling and resolution caps based on the visual detail and temporal granularity your task requires, then validate output quality.
- **Mixed-workload serving performance**: Text-only and image requests follow their original execution paths while sharing CPU, GPU, VRAM, and interconnect bandwidth with video requests. After enabling video, run mixed-traffic load tests to verify overall throughput, per-modality latency, and resource utilization so you can provision capacity accurately.

## 06 Getting Started: Enable the Video Input Recipe in ModelSphere

Bringing native video input from an official API to a self-hosted production service requires end-to-end work across media ingestion, temporal chunking, visual encoding, and inference engine integration. ModelSphere has packaged these engineering pieces into an open-source plugin and published a turnkey deployment recipe on its platform.

**Once ModelSphere is installed and you have provisioned the required compute and model checkpoints, you can activate the Kimi-K3.1-Pro video input recipe for one-click deployment.** The recipe pre-configures the container image, plugin hooks, and runtime flags to support mixed text, image, and video requests out of the box.

Follow these steps to launch:

- Open the `Kimi-K3.1-Pro / sglang-video` recipe inside your ModelSphere installation.
- Verify hardware resources, checkpoint directories, and runtime settings per the recipe. The current recipe targets a single node with 8× NVIDIA B300 GPUs and uses the `DFLASH` draft model—ensure both base and draft checkpoints are prepared.
- Launch the recipe. Once the service is healthy, send multimodal requests containing video and text to validate performance on your workload.

👉 **One-click deploy Kimi-K3.1-Pro with native video input**: [https://modelsphere.tech/recipe?model=kimi-k3.1-pro&id=sglang-video](https://modelsphere.tech/recipe?model=kimi-k3.1-pro&id=sglang-video)

👉 **Video input plugin source code**: [https://github.com/modelsphere/kimi-video](https://github.com/modelsphere/kimi-video)

👉 **ModelSphere on GitHub**: [https://github.com/modelsphere/modelsphere](https://github.com/modelsphere/modelsphere)

We welcome feedback and real-world use cases via GitHub Issues or Pull Requests. When reporting issues, please include your plugin and SGLang versions, sampling settings, media resolution and duration, and relevant logs to help us pinpoint issues across ingestion, visual encoding, or inference.

**Further Reading:**

- [Kimi Official Vision Input Documentation](https://platform.kimi.ai/docs/guide/use-kimi-vision-model)
- [SGLang Vision Model Implementation (`kimi_k3_vl.py`)](https://github.com/sgl-project/sglang/blob/afcd7d6b487a9cbe73e25941971b4cc107e6f9ae/python/sglang/srt/models/kimi_k3_vl.py)
