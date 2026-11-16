---
title: 'From “it runs” to “production-ready”: ModelSphere open-sources its production-grade inference infrastructure'
summary: 'ModelSphere has open-sourced its platform for production LLM inference, bringing model deployment, heterogeneous compute management, autoscaling, and automated tuning together to help teams reduce setup and operational work, launch services faster, and keep them running reliably.'
cover:
  src: architecture.en.png
  alt: 'ModelSphere architecture: applications connect through ModelSphere capabilities and integrated inference engines to heterogeneous AI accelerators'
  width: 3642
  height: 1310
---

In a demo environment, one accelerator, one engine, and one curl command are often enough. Once traffic enters production, the checklist changes: heterogeneous chips need support, Kubernetes needs setup, routing, rate limiting, and scaling need integration, and generation must continue even when a node fails. Many teams get stuck here—the model can answer, but keeping the service reliably on duty is difficult.

vLLM and SGLang have already pushed single-machine throughput a long way forward. But production needs more than a faster engine: it needs the whole fleet to run reliably and economically during peaks. What really consumes people's time is often the scheduling and governance layer outside the engine.

That is why ModelSphere is open-sourcing its platform. It is an open-source platform for production-grade LLM inference. Built on Kubernetes, it brings model deployment, cache-aware routing, SLO-based elastic scaling, observability, Seamless In-Flight Generation Recovery, and a Tuning Agent that keeps looking for better configurations against real workloads into one production-ready inference scheduling system.

## Who we are

ModelSphere wants to help enterprises and developers build less from scratch and turn raw compute into safer, more stable, production-ready model services. The goal: compute comes in, services come out; leave as much of the assembly, scheduling, scaling, monitoring, and alerting in between as possible to the platform.

It does not aim to replace vLLM or SGLang—the inference engine continues to make each instance compute efficiently; ModelSphere makes it manageable and scalable across the cluster, and able to reconnect when something fails.

![The ModelSphere repository on GitHub](repository.webp)

ModelSphere GitHub address:

https://github.com/modelsphere/modelsphere

## What we do

### **Break the constraints of conventional inference engines, moving from “manual per-instance configuration” to “automated cluster coordination”**

If mainstream inference engines such as vLLM and SGLang are high-performance “engines,” ModelSphere is the enterprise “fleet scheduling and management system”—it does not replace the engines, but puts them into vehicles, organizes the fleet, and brings it into production.

Traditionally, going to production means a great deal of manual work: adapting heterogeneous chip drivers, setting up K8s, connecting traffic gateways, and writing scaling scripts. A mistake in any part can bring down the system under high concurrency.

ModelSphere turns these manual operations into automated capabilities:

- From “single-instance optimization” to “cluster coordination”: conventional inference engines address single-node computational efficiency; ModelSphere manages multi-node clusters, using request routing and elastic scaling to ensure business availability under high concurrency.

- From “difficult adaptation” to “unified management”: when inference engines are used in isolation, chip-driver adaptation requires manual work; ModelSphere natively supports heterogeneous compute including Ascend, Iluvatar CoreX, Hygon DCU, and Moore Threads, pooling resources and scheduling them centrally so a heterogeneous K8s cluster can be managed like a single resource.

In one sentence: vLLM and SGLang make a single machine run fast; ModelSphere makes the whole inference cluster run reliably, cost less to manage, and reach production faster.

![ModelSphere architecture: applications connect through ModelSphere capabilities and integrated inference engines to heterogeneous AI accelerators](architecture.en.png)

### **One platform, greater efficiency for AI teams in multiple dimensions**

Whether you are a professional AI R&D team building a large model portfolio or a small compute owner exploring AI-driven business transformation, as long as you have compute—regardless of the hardware vendor—you can use ModelSphere to move efficiently from hardware to services.

- For platform and infrastructure teams: global multi-model deployment, intelligent routing, and runtime management strategies greatly reduce repeated service-layer infrastructure work and improve overall cluster resource utilization.

- For application and algorithm R&D teams: a clear model catalog and visual deployment configuration, with a standardized, unified model-service entry point, let algorithm engineers focus 100% of their attention on model fine-tuning, optimization, and business application innovation.

- For operations and SRE teams: comprehensive health checks, service-metric monitoring, graceful draining, and highly configurable rate limiting, circuit breaking, and scaling mechanisms make it easier to handle sudden traffic surges and everyday operational challenges.

## What our strengths are

### **| Ready to use, straight into production the same day**

With ModelSphere, developers can leave behind hundreds of lines of cumbersome environment configuration and build an inference hub for real business scenarios in minutes with just one command.

```bash
make helm-apply ENV=mycluster
```

ModelSphere natively includes enterprise operational capabilities such as automatic elastic scaling, PD-disaggregated deployment, a three-tier KV cache architecture, service-quality-based dynamic rate limiting, and in-flight generation recovery, ensuring exceptional efficiency and stability for inference services in demanding enterprise environments.

The platform also provides an intuitive, clean graphical control panel, making the management of large, complex heterogeneous K8s clusters as straightforward as ordering takeout.

![The Model Library page in the ModelSphere Console](console.en.jpg)

### **| Continuous automated tuning, multiplying performance**

ModelSphere has continuously evolving low-level performance optimization capabilities. Users can turn low-level optimizations directly into lower inference costs and a more stable production service experience without writing complex tuning code.

Through its built-in AutoTune intelligent model scheduling strategy and hardware-accelerated, adaptive load-balancing scheduling, ModelSphere can deliver several-fold improvements in maximum throughput (Tokens/sec) and time to first token (TTFT), making full use of every bit of compute and greatly reducing inference cost per token.

![Normalized throughput of the baseline and optimized Kimi K3 configurations on 8 × B300 for the Agent long-context and long-document QA workloads](throughput.en.png)

Taking B300 + Kimi K3 (mixed precision) as an example, the experiment compared baseline and optimized configurations under SLO constraints of TTFT p50 ≤ 8,000 ms and per-request generation speed ≥ 15 tok/s. Throughput normalized to eight accelerators was: (1) Agent long-context scenario: from 7,850 tok/s to 12,368 tok/s, an improvement of 57.6%; (2) Document QA scenario: from 8,394 tok/s to 10,189 tok/s, an improvement of 21.4%.

This means that for real production workloads such as Agent long-context tasks and document question answering, ModelSphere can not only “get running” but also “run faster over time” through continuous optimization.

### **| Command heterogeneous compute and break down hardware barriers**

The platform deeply integrates the powerful EngineX inference engine, providing native support and in-depth optimization for a variety of heterogeneous accelerators on the market.

Whether Huawei Ascend, Iluvatar CoreX, Moore Threads, or Hygon DCU, these heterogeneous AI chips can be managed together and scheduled across ModelSphere. Users do not need to rewrite a single line of low-level logic for different chips, giving enterprises “compute freedom” and supply-chain security.

### **| Day-0 integration and optimization of mainstream LLMs**

Keeping pace with leading global open-source communities, the ModelSphere team can complete low-level adaptation and performance tuning for the latest mainstream LLMs as soon as they become available.

The platform is already perfectly adapted by default to popular foundation models including DeepSeek-V4/V4-Flash, Qwen, Kimi, MiniMax, and GLM. Once a model is released, it can go straight into production: “take what you need and deploy immediately.”

![Browsing deployment recipes in the ModelSphere model catalog](model-deployment.gif)

## Join us

ModelSphere's original intention is to turn accumulated systems engineering experience into a public asset that the industry can fork, review, and build together. A contribution or tuning improvement can serve more than one company, crossing hardware barriers to help more users.

Developers, enterprise users, hardware vendors, and ecosystem partners are all welcome to submit issues and PRs, share tuning cases from real workloads, and suggest adaptations for heterogeneous hardware.

Source and quick start: [https://github.com/modelsphere/modelsphere](https://github.com/modelsphere/modelsphere)\
Learn more: [https://modelsphere.tech/](https://modelsphere.tech/)

Open the repository above and follow the documentation for a minimal installation; submit an issue about a problem you have encountered, specifying the environment, chip, model, and original error message; or visit the project and give us a big Star~

:::follow

Follow ModelSphere so you don't miss:

- ModelSphere deployment and tuning practices, sharing real methods and hands-on experience
- In-depth perspectives on new models, engines, and chips through the lens of inference optimization and infrastructure
- Verifiable performance case studies, with hardware, models, and SLOs clearly documented
- Previews and recaps of livestreams, Meetups, and industry conferences—see you online and in person

:::
