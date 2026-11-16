# ILBM / ILBR 第一周期架构

```text
ST MessageFormatter ──> ILBM display adapter ──> ILBR.processText ──> render-only string
ST CHAT_COMPLETION_PROMPT_READY ──> ILBM prompt adapter ──> ILBR.processText ──> request-copy chat
ST GENERATE_AFTER_DATA ──> ILBM string adapter ──> ILBR.processText ──> request payload string
ILBM mark callback (currently no storage implementation) ──> future extractor/storage
```

## Ownership

- `lib/ilbr-engine.js`: pure computation only. No DOM, ST imports, event subscriptions, persistence, or global state.
- `lib/ilbm-bridge.js`: marker policy and ST hook registration; catches failures so normal chat continues.
- `lib/memory-model.js`: pure entity/record normalization, additive entity-kind tag derivation, multi-tag state recomputation and replay window.
- `lib/state-schema.js`: canonical kind-tag definitions, field-set union, enum validation and readable state-card formatting.
- `lib/memory-store.js`: chat-scoped persistence port with fail-open localStorage behavior; forwards explicit tag edits.
- `ui.js`: non-technical debug/control UI; calls memory store API but does not implement state logic.
- `index.js`: browser bootstrap, memory store assembly and additive API publication. Does not mutate `window.ILB`.
- `tests/`: Node unit/contract tests and optional local-ST CDP probe.

## Data rules

- Display formatting receives source text and returns a rendering string; it never writes `context.chat`.
- Chat Completion hook receives a flattened copy created by `ChatCompletion.getChat()`; mutations affect prompt request copy only.
- Prompt hook only mutates `generate_data.prompt/input` string fields.
- Multimodal message arrays with non-text blocks are passed through unchanged.
- Marker callback is currently a seam only; no event/entity persistence is implemented in this cycle.

## ST source evidence (local 1.19.0)

- `public/scripts/message-formatter.js`: synchronous `BEFORE_REGEX` stage; hook error is caught and original text continues.
- `public/scripts/openai.js`: `prepareOpenAIMessages()` emits `CHAT_COMPLETION_PROMPT_READY` with `{chat,dryRun}` before returning `chat`; `ChatCompletion.getChat()` builds new message objects.
- `public/lib/eventemitter.js`: `emit()` serially awaits registered listeners.
- `public/script.js`: emits `GENERATE_AFTER_DATA(generate_data,dryRun)` after backend-specific request assembly and before generation execution.

## Explicit non-claims

- No verified universal filter for every backend. `GENERATE_AFTER_DATA` is only transformed when payload contains string `prompt` or `input` and does not emit the memory callback because that payload lacks stable message identity.
- No true model request was sent in automatic testing; actual provider-side payload still requires human verification.
