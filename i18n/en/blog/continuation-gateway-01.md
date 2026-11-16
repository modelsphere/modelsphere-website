---
title: 'ModelSphere deep dive: Seamless In-Flight Generation Recovery'
summary: 'When a streaming response is cut off, how does ModelSphere pick up where it left off without the client noticing? This post takes apart the design behind the continuation gateway.'
---

## Background

Anyone who has run LLM inference in production has probably seen this: halfway through a long streamed reply, the inference instance runs out of memory, gets rescheduled, has its connection reset, or, more subtly, stays alive but stops emitting tokens. The client is left with a truncated reply that has no `finish_reason`. The usual remedy is the only one available: retry the whole request. The thousands of tokens already generated (especially the reasoning of a long-thinking model) are wasted, and the user waits all over again. One of ModelSphere's core features is Seamless In-Flight Generation Recovery. It sits between the client and the OpenAI-compatible inference service (SGLang / vLLM). When it detects that a stream has stalled or dropped mid-way, it automatically sends a continuation request that uses the content already sent to the client as an assistant prefix, so the model keeps generating from there. The client still sees one continuous, complete stream.

---

### 1. Architecture: a stateful orchestration layer, not a transparent proxy

#### 1.1 Where it sits

Client → upstream entry layer (authentication / rate limiting) → continuation_gateway → downstream routing gateway → inference instances (SGLang / vLLM)

The gateway talks to a single URL, the downstream routing gateway, and keeps no list of instances or their health. Choosing an instance and avoiding a failed one is the routing layer's job. Continuation requests go to the same downstream address by default, so they will very likely be routed to a healthy instance. You can also send continuations to a separate cluster with `CONTINUATION_URL` (for example, the first attempt on vLLM and the continuation on SGLang).

#### 1.2 Two legs

Inside the gateway, a request is split into at most two "legs":

- **leg1**: the downstream streaming response to the client's original request. The gateway forwards it chunk by chunk while parsing the SSE incrementally and accumulating the reasoning and content already sent.

- **leg2**: the continuation request the gateway sends on its own when leg1 ends before the answer is finished. Its output is rewritten and appended after what leg1 has already forwarded.

![Flow of in-flight generation recovery: leg1 forwards the original request through continuation_gateway and the downstream routing gateway to an inference instance; when it stalls or drops, leg2 sends a continuation request with the prefix and its output is appended after leg1](overview.jpg)

Note: **the service is stateful within a request and stateless across requests**. Continuation has to remember what has been forwarded, parse SSE semantics, send extra requests and rewrite usage in place, so it cannot be a transparent byte forwarder. But all state lives in the coroutine of a single request and nothing is shared between replicas, so the gateway scales horizontally and needs no sticky sessions.

#### 1.3 How to tell that a stream is unfinished

Two things here are easy to get wrong.

**First, `[DONE]` is not the signal.** With `stream_options.include_usage` turned on, the `finish_reason` chunk is followed by a usage-only chunk and only then by `[DONE]`. If the connection drops after any of these three, the content is in fact complete. So our criterion is **whether a chunk with `finish_reason` has been seen**.

**Second, an idle timeout does not mean it is time to act.** There are three triggers: a per-chunk idle timeout (the timer starts only after at least one chunk has arrived and resets on every chunk, so it is not confused with time-to-first-token queueing), a downstream connection error, and a clean EOF without a `finish_reason`. But an idle timeout stops leg1 only when all three of the following hold:

- no tool_call has appeared yet (inference engines cannot continue in that case, as explained later)

- some reasoning or content has accumulated that can be recovered

- continuation is switched on

Otherwise the gateway keeps waiting and behaves as if it were not there. The reason is simple: if the gateway cut off a connection that was actually still alive just to "detect" a problem, the client would lose its stream with nothing recovered, which is worse than having no gateway at all. A real disconnect or EOF ends reading in any state, because there are no more bytes to read.

#### 1.4 Design principles throughout

- **Orchestrate at the gateway; leave the engine alone.** This is the premise of the whole project.

- **Conservative first: when in doubt, pass through.** If any condition is not met, the gateway behaves exactly as if it were not there: it does not hang up, swallow errors or rewrite responses.

- **One continuation, at most two legs.** If leg2 fails too, no third leg is sent and the request ends as it stands, which is no worse than having no gateway. This also lets the usage correction assume exactly two legs.

- **The gateway must not become a point of failure.** Any unexpected error during continuation is only logged, never raised, and content already sent to the client is unaffected.

- **Invisible to the client.** The `id` and the reasoning field name stay the same across the stream; the recovered part counts toward usage; and the continuation request's `max_tokens` is reduced by what has already been generated, so it never exceeds the original budget.

---

### 2. How the continuation request is built

#### 2.1 The basic idea: turn what has been sent into an unfinished assistant message (the chat-continue path)

LLMs are autoregressive. To make one "keep writing", the end of the prompt it sees must be exactly the part already written, and must **not** be followed by an end-of-turn marker.

In the OpenAI-compatible API, both SGLang and vLLM support a pair of parameters for this:

```JSON
{
  "messages": [
    ...original messages...,
    {"role": "assistant", "content": "<prefix already sent>"}
  ],
  "continue_final_message": true,
  "add_generation_prompt": false,
  "stream": true,
  "stream_options": {"include_usage": true}
}
```

- `continue_final_message: true`: when the chat template is rendered, the final assistant message is left open (no end-of-turn), and the model continues from its end.

- `add_generation_prompt: false`: do not append a new "assistant starts" prompt; otherwise the model treats this as a brand-new answer rather than a continuation.

- All other parameters (`temperature`, `tools`, and so on) are inherited from the original request.

This is how we continue in most cases. We call it the **chat-continue** path.

#### 2.2 Building the prefix

For reasoning models, an assistant message has two parts, reasoning and content, and each model family wraps them in different control tokens. The gateway dispatches to a builder for the model the deployment actually serves. That model is set by the `CONTINUATION_MODEL` environment variable, not by the `model` field in the request, which can be any name. The core distinction is whether any content chunk has arrived by the time continuation is triggered, which gives two cases: `thinking-partial` and `content-done`.

The default, generic format:

```
With content (reasoning closed, content-done):     <think>{reasoning}</think>{content}
No content (may still be reasoning, thinking-partial): <think>{reasoning}
```

Some models need their own control tokens, which we work out from their chat template and by experiment. For example, these are the control tokens we use for Kimi-K3:

```
With content:  <|open|>think<|sep|>{reasoning}<|close|>think<|sep|><|open|>response<|sep|>{content}
No content:    <|open|>think<|sep|>{reasoning}
```

One trade-off here matters a lot to us: **when content is empty, the think tag is left open.**

When the gateway sees empty content and non-empty reasoning, it cannot tell whether the model is still thinking or has just finished thinking and not yet emitted its first content. The cost of guessing wrong is asymmetric:

- If we close the tag but the model had not finished thinking → its reasoning is cut short, an **irreversible** error;

- If we leave it open but the model had finished → the model emits a closing tag and moves on to the answer, which is a **natural continuation** for the model.

So we pick the lesser evil: leave it open, and let the model decide whether to stop thinking.

#### 2.3 Turn thinking off for content-done

Once content has started, the thinking phase is long over. The continuation request then merges a "thinking off" switch into the client's existing `chat_template_kwargs`, so the model does not start a new round of thinking while continuing.

The switch's key depends on the model: Qwen3.6's template reads `enable_thinking`, while other models (Kimi-K3, GLM-5.3, DeepSeek-V4-Flash and others) use `thinking`. We **send only one key per model**: some models that receive a switch they do not recognize leak reasoning into content. For now, details like this can only be worked out by repeated experiments.

#### 2.4 Budget, id and usage: keeping it invisible to the client

Building the request is only half the job; the other half is making leg2's response look like a continuation of leg1.

**Reducing max_tokens.** The inference engine does not know this request continues an earlier leg; to it, `max_tokens` is the budget for this request. Without a reduction, every continuation would hand the model a fresh budget. So:

```
remaining budget = original budget - estimated tokens of recovered reasoning + content
```

We change only the fields the client **actually sent** (if both `max_tokens` and `max_completion_tokens` were sent, both are changed). If the remaining budget is ≤ 0, we do not continue. If the client sent neither (meaning no limit), we do not invent a default.

**Aligning the id and field names.** Downstream assigns leg2 a new completion id; the gateway rewrites the `id` on every line back to leg1's value, because most OpenAI-compatible clients assume one id per stream. Likewise, SGLang names the reasoning field `reasoning_content` while vLLM names it `reasoning`, and leg2 may be routed to the other engine, so the gateway renames the field to whatever leg1 used.

**Correcting usage.** leg1 never reports usage because its connection broke; leg2 reports only what it generated itself, not the recovered prefix. Forwarded as is, the client would see an abnormally small `completion_tokens`. Our approach:

```
completion_tokens = leg2's reported value + estimate for recovered reasoning + estimate for recovered content
token estimate    = ceil(CJK characters / 1.6 + other characters / 4.0)
```

The recovered part is estimated from character counts rather than the downstream `/v1/tokenize`, because that endpoint adds load to the cluster and, more importantly, fails outright for some models. The principle is **only ever add, and do not chase exact precision**: a small error is better than the risk of a completely wrong count. Multimodal requests are the exception: images, audio and video have no characters to count and the estimate would be far too low, so we use leg2's actually tokenized `prompt_tokens` minus the estimate for the prefix text.

#### 2.5 Fallback: the render-generate path when chat-continue cannot work on vLLM

This path is a low-priority fallback. The gateway's default is always chat-continue, and when we hit a problem, our first move is to adjust how the messages are built so that chat-continue works. Only when a model on vLLM has a renderer that does not accept `continue_final_message` at all, so that no adjustment can make continuation work, do we consider this path. At present only a few combinations are marked as needing it.

It ranks low because it costs noticeably more: it depends on vLLM's fairly new `--enable-scale-out` feature (off by default), requires the continuation address and any router in between to forward four endpoints, takes several more calls per continuation, and leaves the gateway with many more details to handle (see 2.7).

The idea is that if the engine's renderer cannot render a continuation prompt for us, we assemble it ourselves at the **token level**. The continuation leg calls four endpoints on the same continuation address in turn:

1. **`/v1/chat/completions/render`**: renders the prompt's token ids from the client's **original request** (including `chat_template_kwargs` and `tools`). At this point the prompt already ends with the reasoning channel open (or closed); the gateway tells which from the trailing tokens rather than guessing from whether reasoning is empty.

2. **`v1/tokenize`**: joins the reasoning/content already sent to the client into prefix text, encodes it into token ids and appends them to the prompt. Note that this prefix has **no opening tag**: it is exactly the raw text the model would have written after the generation prompt.

3. **`/inference/v1/generate`**: tokens in, tokens out, streamed back with no parsing.

4. **`/v1/chat/completions/derender`**: turns the generated token ids back into OpenAI-format chunks; the server-side parser splits them into reasoning, content and tool_calls.

#### 2.6 Why not just use `/v1/completions`

Another way around the chat template is to call `/v1/completions` with tokens or text directly. But it returns raw text with no split into reasoning, content and tool_calls. To rebuild the chat stream the client expects, the gateway would have to implement a reasoning parser and a tool-call parser for every model, and handle markers split across streamed chunks and tool-call arguments arriving piece by piece. That amounts to reimplementing vLLM's parsers inside the continuation gateway, which is not practical.

The derender endpoint packages vLLM's server-side output parsing (parsers plus streaming state) on its own: the gateway sends only token ids and `stream_state` and gets standard chunks back, parsed the same way as an ordinary chat request, with no wheel reinvented in the gateway.

These endpoints depend on vLLM's `--enable-scale-out` (fairly new, off by default). It was designed to deploy preprocessing and output parsing separately from pure GPU generation; for us, the gateway plays exactly that front-end role. **The continuation address must expose all four endpoints, and any router in between must forward them.**

#### 2.7 Engineering problems in render-generate and how we solved them

**derender's quadratic cost, and batching.** generate emits one SSE chunk per engine step, holding only a few tokens. Each derender call makes the server create a new parser and **replay every output token so far**, and the request body carries the token ids of the whole prompt. Calling it chunk by chunk makes the total cost grow **quadratically** with output length. So the gateway calls derender once every `DERENDER_BATCH_CHUNKS` chunks (8 by default), and sends the rest in one go when the final chunk with `finish_reason` arrives. The client sees output in larger blocks, but content and order are unaffected.

**Model-specific handling remains.** Like chat-continue, render-generate runs into model-specific issues. The chunks from generate usually hold only a few tokens, and each model composes its control and reasoning markers differently, so a marker may be split across two chunks. How the decoder and parser on the derender side handle half a marker does not necessarily line up with how the gateway batches, and if it goes wrong, half a marker leaks into reasoning or content, and once it is sent to the client it cannot be taken back. So before sending each batch, the gateway checks the state at the end of the batch for the specific model and, when needed, holds the last few tokens back for the next batch. In other words, even though this path bypasses the chat template, **building requests and post-processing output still depend on the model**, and the path as a whole is more complex than chat-continue, which is one more reason it comes last.

**Splitting the output.** A batch of tokens can span reasoning, content and tool_calls at once, and the parser merges them into one delta; but in the standard streaming chat API, a chunk carries only one kind of content. So the gateway splits it into several chunks in the order reasoning → content → tool_calls before writing to the client, one chunk per tool call, with `finish_reason` only on the last one.

**Usage.** The same formula as chat-continue in section 2.4. The only difference is `reasoning_tokens`: neither generate nor derender reports it on this path, so it is estimated from the reasoning text derender returns.

### 3. Building continuations for each model: adaptation required

The default chat-continue construction above already covers most models. But covering most is not covering all, and **which models break where only becomes clear once you actually run them**.

Here is a typical example we ran into.

#### 3.1 Case: Qwen3.6-35B-A3B + vLLM rejects content-done with a 400

With the default construction, we join reasoning and content into one string and put it in the `content` of the final assistant message:

```json
{ "role": "assistant", "content": "<think>{reasoning}</think>{content}" }
```

This works on SGLang. But on **vLLM + Qwen3.6-35B-A3B**, the **content-done** case is rejected by the engine outright with **HTTP 400**.

The cause lies in how `continue_final_message` is implemented: after rendering the chat template, vLLM checks that the final message's content appears **verbatim** in the rendered output, and uses that to decide where to cut and continue. Qwen3.6's chat template, however, takes `<think>R</think>C` in the content apart and reassembles it, adding newlines after `<think>` and around `</think>` and trimming leading and trailing whitespace. So the string we passed in **no longer appears verbatim** in the rendered prompt, the check fails, and the request gets a 400.

#### 3.2 The fix: send a structured message

The fix we confirmed by experiment is to send, for content-done with this combination, a **structured message with reasoning and content separated**:

```json
{ "role": "assistant", "reasoning": "{reasoning}", "content": "{content}" }
```

The template then renders the reasoning part from `reasoning`, and `content` holds only the answer text, which appears **verbatim** in the rendered output, with the cut point exactly at its end. The check passes and continuation works.

#### 3.3 What this tells us

The point of this example is not that Qwen has a pitfall, but a more general fact:

> **Every model × engine combination may differ in its chat template, in how continue_final_message is validated, in its reasoning parser and in its thinking switch. Continuation strategies have to be validated per combination; they cannot be inferred from experience.**

So our continuation gateway is really two things at once: a gateway, and a set of **validated continuation strategies**. The README currently includes part of the compatibility matrix we have validated. Models not in the matrix are handled with the generic format and trigger a warning at startup: they may work, but are not yet validated. We are still adding compatible models and iterating on continuation strategies, and **we will next add validation on heterogeneous AI chips**.

---

### 4. What is not supported yet, and why we chose not to force it

#### 4.1 json_object / json_schema structured output

When a request sets `response_format: json_object` or `json_schema`, the JSON constrained by guided decoding streams out in content chunks just like ordinary content, and **there is no separate signal** to tell them apart. Detecting that a piece of content is constrained and then deciding how to rebuild the prefix is not worth the complexity.

Fortunately this can be determined from the original request alone, so the gateway excludes these requests up front and passes them straight through.

#### 4.2 After tool_call content has appeared

In the standard semantics of `continue_final_message`, the `tool_calls` field means the turn is over and the tool role should reply next. **There is no state for "tool_call still being generated".** So half a tool_call that has already streamed to the client cannot be continued in leg2. Real support would need the engine to provide that state; the gateway layer cannot solve it.

The default policy is therefore: once a tool_call chunk has appeared on leg1, there is no continuation, and the request ends as it stands.

#### 4.3 An optional workaround: `BUFFER_TOOL_CALLS`

We provide a **configurable** gateway-level workaround: make the non-continuable state, a tool_call already streamed to the client, **never happen**.

- On leg1, from the first line containing `tool_calls`, that line and every line after it are held in gateway memory instead of being forwarded;

- When `finish_reason` (the tool_call is complete) or `[DONE]` arrives, the whole batch is released at once;

- If leg1 stalls or drops while lines are held: **the whole batch is discarded**, and an ordinary continuation is made from the thinking-partial / content-done state before the first tool_call. leg2 regenerates and may produce a tool_call again. Because the client never received a tool_call, the "cannot continue" state never arises.

This has costs: tool_call arguments no longer stream chunk by chunk but arrive all at once after the tool_call completes, and the held content stays in gateway memory until the tool_call ends (there is currently no byte limit). It also assumes continuation is switched on: with continuation off, holding lines buys no recovery and only adds latency. So it is off by default, and each deployment decides based on its use case.

#### 4.4 Other boundaries

- Requests where the client set `continue_final_message` itself: no continuation is layered on top.

- Failures before the first chunk, or with nothing recoverable: these are not continuation cases; they are raised as is, and the upper layer decides whether to retry.

- If leg2 fails too: no third leg is sent.

- Whether the continued text is perfectly coherent at the break point: there is no automated guarantee, only spot checks. Usage is also an estimate.

### 5. Summary and next steps

Back to the original question: when an inference instance crashes, can a streamed reply keep going?

- Yes, but it takes a **stateful orchestration layer** to monitor, keep track, build requests and align responses;

- How to build the continuation request is far from a fixed formula: **the same default construction can fail on different model × engine combinations because of differences in chat templates, validation and parsers**, so each combination has to be tested;

- Only when chat-continue cannot work at all on vLLM (the renderer does not accept `continue_final_message`) do we fall back to the token level and finish the continuation with render → tokenize → generate → derender;

- Where it cannot be done, we stay conservative and pass through.

Next, we will:

- validate more model × engine combinations and record the results in the compatibility matrix;

- **add validation on heterogeneous AI chips**;

- keep improving end-to-end tests and the fault-injection workflow.

The project is open source under the Apache-2.0 license. Give it a try.

> Repository: `github.com/modelsphere/continuation_gateway`
