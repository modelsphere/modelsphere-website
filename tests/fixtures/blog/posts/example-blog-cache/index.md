---
id: example-blog-cache
title: KV Cache 与路由：一次请求背后的协作边界
summary: 缓存保存在哪里、请求应该交给哪个实例、资源又由谁分配？这篇示例通过两个假设实例，拆开缓存位置、路由选择与调度之间的协作边界，并整理验证时需要记录的模型版本、请求分布和实验条件。文中图示仅用于解释概念，不提供缓存命中率或性能成绩。
kind: internal
slug: example-blog-cache
publishedAt: 2026-10-17
updatedAt: 2026-10-22T10:00:00+08:00
example: true
evidenceIds: []
author: 示例作者
categoryId: architecture
tagIds:
  - kv-cache
  - kubernetes
technicalKeywords:
  - cache
  - routing
pullRequestRefs: []
cover:
  src: cover.png
  alt: KV Cache 与路由：一次请求背后的协作边界的示意封面；非实测数据
  width: 960
  height: 600
  variants:
    - src: cover-small.png
      width: 480
    - src: cover.png
      width: 960
relatedIds:
  - example-blog-benchmark
  - example-blog-continuity
resources: []
---

## 缓存的位置决定问题的边界

本文是 Mock 阅读材料。假设有两个运行实例，可以分别记录缓存在哪、谁知道它的位置，以及缓存失效后请求如何处理。

## 把路由选择与调度分开记录

路由描述一次请求的目标选择；调度描述资源与实例的位置。这里仅演示概念说明的排版，不声明任何具体缓存命中率或性能提升。

> 先明确问题的输入和限制，再讨论优化目标。

## 验证需要哪些记录

- 固定的模型与运行时版本。
- 明确的请求分布与输入长度。
- 有来源的实验条件与结果。

[阅读首篇示例](/blog/example-blog-platform#明确组件的责任边界)。
