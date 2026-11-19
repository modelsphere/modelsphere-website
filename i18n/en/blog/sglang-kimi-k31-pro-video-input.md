---
title: 'ModelSphere Completes the Final Piece of the Puzzle for Kimi-K3.1-Pro Inference on SGLang: Native Video Input'
summary: 'ModelSphere has integrated Kimi-K3.1-Pro video input into SGLang and provides a one-click deployment recipe that can be enabled on the platform. This article breaks down the pipeline, from video ingestion and temporal encoding to visual tokens, explaining how the implementation reuses the existing model and how to deploy an inference service with video support through ModelSphere.'
---

ModelSphere has integrated Kimi-K3.1-Pro video input into SGLang and provides a one-click deployment recipe that can be enabled on the platform. This article breaks down the pipeline, from video ingestion and temporal encoding to visual tokens, explaining how the implementation reuses the existing model and how to deploy an inference service with video support through ModelSphere.

Kimi-K3.1-Pro's official API already supports video input. However, teams that want to deploy the model themselves and use this capability in local applications still need to connect video ingestion to their existing inference services.

In the open-source model and SGLang versions covered by this integration, the existing pipeline already supports text and images, but still lacks several pieces needed for video: video decoding, frame sampling, temporal chunking, and multi-frame inference support. As a result, deploying directly with these versions leaves a gap between their video input capabilities and those available through the official API.

To address this, ModelSphere has completed the processing pipeline from request ingestion to visual feature fusion, packaging the integration as an independent plugin. Once the plugin is installed, text, images, and video can all be handled by the same local inference service. The service reuses the existing vision model, feature projection module, and LLM to generate responses.

This capability is also available as a Kimi-K3.1-Pro video input recipe in the ModelSphere catalog. Once ModelSphere is installed, you can enable the recipe and deploy it with a single click in a production environment.

**ModelSphere packages model integration, temporal processing, and inference framework adaptation as open-source components and a deployment recipe, bringing video input capabilities comparable to those of the official API to local production services.**

Here's how the video input solution works:

## 01 Reusing the Existing Model to Complete the Video Input Pipeline

To understand this extension, let's first look at how text, images, and video are ultimately fed into the LLM.

Text is tokenized and passed through an embedding layer to produce vectors that the language model can process. Images are read and decoded into pixel data. Video is first read and decoded into frames, then sampled and divided into temporal chunks according to the configuration, preserving the order of the sampled frames.

The image pixels and organized video frames then enter a shared image preprocessing pipeline, where they are resized, padded, normalized, and split into patches before being passed through the corresponding visual encoding process. The Projector—the feature projection module—maps the encoded visual features to the language model's hidden dimension.

Finally, text and visual vectors are combined into a single input sequence according to their positions in the prompt.

![Figure 1: Text, image, and video input pipeline for Kimi-K3.1-Pro](input-pipeline-overview.en.png)

_Figure 1: How text, image, and video inputs are processed. Images and video frames share the same image preprocessing pipeline and reuse the same visual encoder weights, although their specific processing flows differ._

The existing image pipeline already supports image preprocessing, visual encoding, feature projection, and response generation. Video input can reuse these components, but three additional steps are needed:

- **Read the video and decode it into frames:** Convert the video content in the request into image data that can be processed.
- **Sample frames and organize them into temporal chunks:** Preserve the order of sampled frames and arrange them for visual encoding.
- **Adapt the visual encoding process for video:** Reuse the existing weights while handling multi-frame input and temporal position information.

Images and video share the same visual model weights, but each follows a processing path suited to its input format. The image path extracts spatial features, while the video path additionally incorporates temporal information across frames.

## 02 Integrating Through a Plugin to Handle Mixed Inputs in One Service

To make the new logic easy to install and update independently, we package the extension as a Python package, distribute it as a wheel, and connect it to the runtime through SGLang's hook mechanism when the service starts.

This approach keeps the extension code separate from the framework source code and uses runtime hooks to integrate with the existing model. Video requests are routed through the new processing logic, while text-only and image requests continue to use the original processing paths.

![Figure 2: Kimi-K3.1-Pro video input architecture](plugin-architecture.en.png)

_Figure 2: The plugin integrates with a single SGLang service. Orange indicates the newly added video ingestion and adaptation components; blue and purple indicate existing processing capabilities and models. TP8, DCP8, DSpark, and HiCache illustrate the configuration of the original pipeline. The specific image and runtime parameters for the one-click deployment recipe are listed on the recipe page._

The plugin handles three main areas of adaptation:

- **Message and position handling:** Receives and validates Base64-encoded video, preserves the order of interleaved text, images, and video in a message, and ensures that each segment of visual features is aligned with the correct position in the prompt.
- **Multi-frame computation:** Organizes video chunks, reuses image preprocessing operators, and aligns the devices and data types used for multi-frame temporal position encoding before feeding the data into the existing visual encoding pipeline.
- **Cache keys and usage statistics:** Generates identifiers for cache matching based on media content and processing settings, and ensures that video-related tokens are correctly categorized in usage statistics.

The independent plugin allows the video extension to be maintained and updated separately from the framework. It covers message processing, multi-frame encoding, feature-position alignment, cache identifiers, and usage statistics, integrating the model capability into the service's full request pipeline. For deployment, use a compatible SGLang version and recheck hook interface compatibility whenever the framework is upgraded.

Plugin source code and version requirements:

[https://github.com/modelsphere/kimi-video](https://github.com/modelsphere/kimi-video)

## 03 From Video Bytes to LLM-Ready Input

The following diagram shows the complete inference pipeline. Video first goes through ingestion and preprocessing, then enters the vision model and Projector. The resulting visual features are ultimately passed to the LLM together with the text.

![Figure 3: Kimi-K3.1-Pro video input inference steps](inference-steps.en.png)

_Figure 3: The complete pipeline, from video preprocessing and visual encoding to feature projection and response generation. Components marked “New” are part of the extension; the decoder, GPU operators, and existing models are reused at their respective stages._

### 3.1 First, Organize the Video into Temporal Chunks

Base64 decoding first converts the request content back into video bytes. A video decoder then reads the frames. These are two separate steps: the first handles the transport format, while the second processes the video content.

The plugin samples frames uniformly according to the configuration and groups them into chunks in chronological order. Each chunk can currently contain up to 4 frames, and a video can consist of multiple chunks. The final chunk proceeds with the number of frames actually available, keeping the sampled frames and their temporal organization consistent.

Next, each frame reuses the existing image preprocessing pipeline for resizing, padding, normalization, and patch splitting. A patch can be understood as a small region of an image. On the video side, the processing budget must also be controlled, and all frames within the same chunk must use a consistent spatial grid.

The processed frame tensors are then packaged together with their temporal and spatial grids and aligned with the visual positions reserved in the prompt. The grid `[T, h, w]` records the number of frames in a chunk, the height of the patch grid, and the width of the patch grid, respectively.

### 3.2 Encode Spatiotemporal Information and Compress the Visual Sequence

Inside the vision model, pixel patches first pass through Patch Embedding, which maps them to feature vectors and adds spatial and temporal positional information.

MoonViT3d then uses spatiotemporal attention within each chunk, allowing features at different positions to incorporate both spatial and temporal context. After encoding, temporal pooling and spatial merging reduce the number of visual tokens passed to the language model.

The Projector maps the merged features to the LLM's hidden dimension. The service inserts these visual embeddings into the corresponding positions in the prompt. Together with the text embeddings, they go through Prefill, after which Decode generates the response one token at a time.

**This pipeline also determines the components of time to first token (TTFT): before the first output token can be returned, the service must process all sampled frames and complete the LLM Prefill that includes the resulting visual information.**

Once frame processing and Prefill are complete, the service can stream its response token by token. The time to the first token includes the overhead of processing the input. With other conditions held roughly constant, more sampled frames or a higher processing resolution will generally increase the visual computation and input size. The processing budget should therefore be configured according to the needs of the application.

## 04 How Are Visual Tokens Formed?

The flowchart explains what happens at each step; tensor shapes show how the data changes along the way.

Assume a video chunk contains 4 frames, with each frame divided into a 4 × 4 patch grid, followed by 2 × 2 spatial merging. These numbers are for illustration only. The actual number of frames, spatial grid, and feature dimensions depend on the input and configuration.

In the diagram, `Dv` represents the visual hidden dimension, `Dl` represents the language model hidden dimension, and `P` is the side length of a pixel patch.

The following sections walk through the shape changes step by step to make the process easier to understand. The actual implementation may combine some operations or use different intermediate tensor layouts.

![Figure 4: Illustration of tensor transformations for Kimi-K3.1-Pro video input](tensor-shapes.en.png)

_Figure 4: An illustrative example with T=4, h=w=4, and 2×2 spatial merging. The colored blocks track frames and spatial groups; actual feature dimensions and values depend on the model and input._

### 4.1 From 64 Pixel Patches to 64 Feature Vectors

Each frame has 16 patches, giving 64 patches across 4 frames. Each RGB pixel patch has the shape `3, P, P`. Together, they form:

```text
64, 3, P, P
```

After Patch Embedding, each patch is mapped to a Dv-dimensional feature vector, producing:

```text
64, Dv
```

You can think of this as a table: each row corresponds to a patch, and each column represents one feature dimension. After MoonViT3d encoding, the table still has 64 rows, each with Dv dimensions, but every vector now incorporates spatiotemporal context from the chunk.

### 4.2 Average Across Time and Merge Across Space

Temporal pooling averages the encoded features of multiple frames at the same spatial position. In this example, the 64 features across 4 frames are reduced to 16:

```text
[64, Dv] → [16, Dv]
```

Each feature participating in the averaging operation has already incorporated spatiotemporal context from the chunk. Temporal pooling further aggregates the representations of multiple frames at the same spatial position to produce an encoded feature for that position.

Spatial merging concatenates the features of adjacent 2 × 2 positions along the channel dimension. Four vectors are combined into one, reducing the number of rows while increasing the length of each row:

```text
[16, Dv] → [4, 4Dv]
```

### 4.3 Project to the Language Model's Hidden Dimension and Restore Prompt Alignment

The Projector maps these four longer vectors to the LLM's hidden dimension:

```text
[4, 4Dv] → [4, Dl]
```

This step changes the vector dimension while keeping the token count at 4. The resulting vectors are placed at the corresponding positions in the prompt and combined with the text and protocol markers to form an input sequence of shape `[L, Dl]`, where `L` is the total sequence length.

In this example, a video chunk containing 4 frames, each with a 4 × 4 patch grid, produces 4 visual tokens after temporal pooling and 2 × 2 spatial merging. For an entire video, the total number of visual tokens accumulates across all chunks and varies with the number of sampled frames, spatial grid, and merging configuration.

## 05 Understand Input and Resource Constraints Before Integration

The current plugin accepts video content in the format `data:video/<format>;base64,<payload>`. **Its processing scope is limited to video frames; audio tracks are not yet parsed.** Text, images, and video can be mixed in a single input. Video duration, sampling density, and per-frame resolution should all be included in the processing budget.

When integrating the plugin, pay particular attention to three areas:

- **Deployment environment compatibility:** The ModelSphere video input recipe includes the corresponding engine image, plugin enablement settings, and runtime parameters. When deploying through the platform, check the hardware and model directory against the recipe. If integrating the plugin yourself, consult the source documentation to confirm the versions of Python, SGLang, and the video decoding dependencies.
- **Whether the input budget fits the application:** More frames provide more sampled visual information, but also increase processing costs. Higher resolution affects the number of patches and the amount of visual computation. Set the sampling strategy and budget according to the visual details and temporal changes that matter to the application, then validate the results.
- **Whether service performance is acceptable under mixed workloads:** Text-only and image requests continue to use the original processing logic, but share CPU, GPU, memory, and data transfer resources with video requests. After enabling video, test the service under the target workload. Check overall throughput, latency for each request type, and resource utilization to determine the right capacity for the mixed workload.

## 06 Get Started

Bringing video input from an official API into a locally deployed production service for an open-source model requires work on video ingestion, temporal organization, visual encoding, and inference service adaptation. ModelSphere has packaged this engineering work as an open-source plugin and a deployment recipe that can be enabled on the platform.

**Install ModelSphere, prepare the compute resources and model weights required by the recipe, and enable the Kimi-K3.1-Pro video input recipe to deploy an inference service with video support in one click.** The recipe includes the corresponding engine image, plugin configuration, and runtime parameters, and supports mixed text, image, and video input.

To get started:

1. In your ModelSphere installation, open the Kimi-K3.1-Pro / sglang-video recipe.
2. Check the compute resources, model weight directory, and runtime configuration required by the recipe. The current recipe is designed for a single machine with 8 B300 GPUs and uses a DFLASH draft model, so make sure to prepare the corresponding weights as well.
3. Enable the recipe to deploy the service. Once the instance is ready, submit video and text requests through the service endpoint to validate the results.

👉 **Deploy Kimi-K3.1-Pro with video input in one click:**

[https://ourl.cn/2jeRpf](https://ourl.cn/2jeRpf)

👉 **Video input plugin source code:**

[https://github.com/modelsphere/kimi-video](https://github.com/modelsphere/kimi-video)

👉 **ModelSphere on GitHub:**

[https://github.com/modelsphere/modelsphere](https://github.com/modelsphere/modelsphere)

We welcome feedback through Issues and PRs. When reporting an issue, include the plugin and SGLang versions, sampling configuration, media dimensions and duration, and relevant logs. This information helps identify problems in input processing, visual encoding, or inference.

## Further Reading

Kimi official visual input documentation:

[https://ourl.cn/2h32gc](https://ourl.cn/2h32gc)

SGLang vision model implementation:

[https://ourl.cn/9GmV3L](https://ourl.cn/9GmV3L)

## About Us

ModelSphere is an open-source, production-grade infrastructure community for large language model inference, jointly initiated by PHANCY and RiseUnion. It connects heterogeneous compute adaptation, cloud-native cluster scheduling, and advanced performance optimization, helping large models move from “running in the lab” to “working reliably in production.”
