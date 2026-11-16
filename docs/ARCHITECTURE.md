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
- `lib/relation-model.js`: pure directed-relation registry, role parsing, display and natural-language sentences.
- `lib/action-state.js`: action whitelist → `stateChanges` derivation (including relation type/role from marker tail).
- `lib/injection-format.js`: compact/narrative rendering; verb templates; never emits JSON, record IDs or marker syntax.
- `lib/post-extractor.js`: mode-B extraction adapter (OpenAI-compatible, soft timeout, late write, dedupe, failure log).
- `lib/marker-prompt.js`: copyable mode-A instruction text (zh/en) and syntax reference; ILBM does not auto-inject it unless the user enables the optional prompt injector.
- `lib/memory-store.js`: chat-scoped persistence port with fail-open localStorage behavior; forwards explicit tag edits, record edits and extraction marks.
- `ui.js`: non-technical debug/control UI; calls memory store API but does not implement state logic.
- `ui-shell.js`: management shell (events/entities/state/settings/extraction/failures); view-only, no state derivation.
- `index.js`: browser bootstrap, memory store assembly and additive API publication. Does not mutate `window.ILB`.
- `tests/`: Node unit/contract tests and optional local-ST CDP probe.

## Data rules

- Display formatting receives source text and returns a rendering string; it never writes `context.chat`.
- Chat Completion hook receives a flattened copy created by `ChatCompletion.getChat()`; mutations affect prompt request copy only.
- Prompt hook only mutates `generate_data.prompt/input` string fields.
- Multimodal message arrays with non-text blocks are passed through unchanged.
- Marker callback is currently a seam only; no event/entity persistence is implemented in this cycle.
- Relations are directed edges `fromId → toId: type (role)`; symmetric types mirror one reverse edge, asymmetric types require two explicit records.
- Injection never emits JSON, internal record IDs or `[entity:...]`; compact and narrative styles share the same merge/budget pipeline.
- Mode-B extraction writes results as `pending`; late results never retroactively change the current turn's injection.
- Extraction marks are chat-scoped and invalidated by message edit/delete/swipe so re-extraction remains possible.

## ST source evidence (local 1.19.0)

- `public/scripts/message-formatter.js`: synchronous `BEFORE_REGEX` stage; hook error is caught and original text continues.
- `public/scripts/openai.js`: `prepareOpenAIMessages()` emits `CHAT_COMPLETION_PROMPT_READY` with `{chat,dryRun}` before returning `chat`; `ChatCompletion.getChat()` builds new message objects.
- `public/lib/eventemitter.js`: `emit()` serially awaits registered listeners.
- `public/script.js`: emits `GENERATE_AFTER_DATA(generate_data,dryRun)` after backend-specific request assembly and before generation execution.

## Explicit non-claims

- No verified universal filter for every backend. `GENERATE_AFTER_DATA` is only transformed when payload contains string `prompt` or `input` and does not emit the memory callback because that payload lacks stable message identity.
- No true model request was sent in automatic testing; actual provider-side payload still requires human verification.
