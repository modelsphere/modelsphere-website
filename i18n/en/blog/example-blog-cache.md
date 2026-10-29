---
title: KV cache and routing — component responsibilities for a request
summary: Where is the cache stored, which instance should receive a request, and who assigns resources? This example uses two hypothetical instances to distinguish cache location, routing, and scheduling, then lists the versions, request distributions, and experimental conditions needed for validation. It provides no cache-hit rates or benchmark results.
---

## Start by identifying where the cache resides

This is example reading material. For two hypothetical instances, record where the cache resides, which component knows its location, and how requests are handled after the cache is invalidated.

## Document routing and scheduling separately

Routing selects a request’s destination; scheduling determines where resources and instances are placed. This example illustrates how to explain these concepts and makes no claims about cache-hit rates or performance gains.

> Define the inputs and constraints before discussing optimization goals.

## Records needed for validation

- Pinned model and runtime versions.
- Explicit request distribution and input lengths.
- Traceable experimental conditions and results.

[Read the first example](/blog/example-blog-platform#明确组件的责任边界).
