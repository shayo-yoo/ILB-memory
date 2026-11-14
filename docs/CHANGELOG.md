# ILBM Change Log

## CHG-20261114-019 — ILBM public API contract docs and tests

- Type: API / DOCS / TEST
- Date: 2026-11-14
- Documented `window.ILBM_MEMORY` methods, derived status shape, candidate/import semantics and opt-in injection behavior.
- Added API contract tests for inspect/currentState/replay/event adapter and memory text preview metadata.
- Verification: Node suite 50/50.
- Commit: pending in this cycle.

---

## CHG-20261114-018 — Entity and record filtering in debug UI

- Type: UI / FEATURE / TEST
- Date: 2026-11-14
- Added query filter across entity name/type, event text/floor/source message ID and a “只看有效记录” toggle.
- Filtering only affects readable/raw debug views; storage and state calculation remain unchanged.
- Verification: Node suite 48/48.
- Commit: pending in this cycle.

---

## CHG-20261114-017 — Memory backup import/export

- Type: FEATURE / DATA / UI / TEST
- Date: 2026-11-14
- Added `ilbm-memory` schema v1 backup export/import; malformed, wrong-kind, and future versions reject without replacement.
- Debug panel offers export JSON and explicit import replacement; no automatic overwrite.
- Verification: Node suite 48/48.
- Commit: pending in this cycle.

---

## CHG-20261114-016 — Optional memory prompt injector

- Type: FEATURE / INJECTION / CONFIG / TEST
- Date: 2026-11-14
- Added: `createMemoryInjector` and debug controls for “开启记忆注入 / 立即应用注入 / 关闭并清除注入”.
- Injection is disabled by default; only explicit enable + apply writes an extension prompt. Disable clears it.
- Verification: Node suite 46/46; no automatic prompt modification occurs while disabled.
- Commit: pending in this cycle.

---

## CHG-20261114-015 — Readable memory injection preview

- Type: FEATURE / INJECTION / UI / TEST
- Date: 2026-11-14
- Added pure `buildMemoryText()` combining derived current state with replay records, applying a conservative character/token budget and oldest-first history trimming.
- Added debug-panel “预览记忆注入文本”; preview only, no automatic prompt injection.
- Verification: Node suite 44/44.
- Commit: pending in this cycle.

---

## CHG-20261114-014 — Failure log cleanup control

- Type: UI / DATA / TEST
- Date: 2026-11-14
- Added: debug panel “清除失败日志” action; failure history remains bounded and explicitly user-clearable.
- Verification: Node suite 41/41.
- Commit: pending in this cycle.

---

## CHG-20261114-013 — Candidate extraction failure logs

- Type: FEATURE / DATA / UI / TEST
- Date: 2026-11-14
- Added: bounded per-chat failure log for parse/validation/extraction failure; entries include floor, source message ID, stage, reason and timestamp.
- Failure logs never become memory records and are visible in the debug panel.
- Verification: Node suite 41/41.
- Commit: pending in this cycle.

---

## CHG-20261114-012 — Candidate event preview before import

- Type: FEATURE / DATA / UI / TEST
- Date: 2026-11-14
- Added: “预览候选事件（不保存）” alongside explicit import/commit; preview runs the same validation but keeps storage unchanged.
- This enforces the requirement that AI output is a candidate, not final memory truth.
- Verification: Node suite 39/39.
- Commit: pending in this cycle.

---

## CHG-20261114-011 — Configurable AI extraction adapter

- Type: FEATURE / API / TEST / UI
- Date: 2026-11-14
- Added: `runCandidateExtraction(text, {extract, timeoutMs})`; no adapter means skipped, adapter errors/timeouts fail closed, successful string/object responses enter existing candidate parser.
- Added: debug panel “模拟 AI 提取” action; it explicitly reports that no model call is configured by default.
- Verification: Node suite 38/38.
- Commit: pending in this cycle.

---

## CHG-20261114-010 — AI candidate response parser

- Type: FEATURE / API / TEST / UI
- Date: 2026-11-14
- Added: parser for plain JSON, fenced JSON and `{events: []}` AI responses; prose/malformed/empty responses fail closed with diagnostic error.
- Added: debug panel action “解析 AI 候选响应” that feeds parsed output into the existing validator/store path; no model call is made.
- Verification: Node suite 35/35.
- Commit: pending in this cycle.

---

## CHG-20261114-009 — Candidate event validation and manual import

- Type: FEATURE / DATA / UI / TEST
- Date: 2026-11-14
- Added: candidate event JSON validation with `fact/state/relation` kinds, entity-reference validation, source floor/message/swipe metadata, partial acceptance and rejected-item reasons.
- Added: debug panel JSON textarea and “导入候选事件 JSON” action; this does not call AI, it tests the future extraction result path.
- Verification: Node suite 31/31.
- Commit: pending in this cycle.

---

## CHG-20261114-008 — Manual entity and record removal controls

- Type: FEATURE / DATA / UI / TEST
- Date: 2026-11-14
- Added: debug panel controls to remove one record or entity by ID; state/replay outputs refresh after removal.
- No AI extraction or automatic record deletion was added; manual removal is explicit and history/state rules remain visible.
- Verification: Node suite 28/28; syntax checks pass.
- Commit: pending in this cycle.

---

## CHG-20261114-007 — Readable state and replay view

- Type: UI / FEATURE / TEST
- Date: 2026-11-14
- Added: readable Chinese current-state cards and replay rows in the debug panel; raw JSON remains available below for diagnostics.
- Verification: Node suite 28/28.
- Commit: pending in this cycle.

---

## CHG-20261114-006 — Replay window controls in debug UI

- Type: FEATURE / CONFIG / UI / TEST
- Date: 2026-11-14
- Added: debug controls for active-window layer count and replay-window layer count; settings persist per chat via memory store.
- Current state and replay output remain derived from normalized valid history; no duplicated state table introduced.
- Verification: Node suite 28/28; syntax checks pass.
- Commit: pending in this cycle.

---

## CHG-20261114-005 — ST message lifecycle adapter

- Type: FEATURE / EVT / TEST
- Date: 2026-11-14
- Added: tolerant ST adapter for `MESSAGE_EDITED`, `MESSAGE_DELETED`, `MESSAGE_SWIPED`, and `MESSAGE_SWIPE_DELETED`.
- Integer message events use floor invalidation with a visible degraded diagnostic when no stable source ID is available; object-shaped events preserve message IDs when provided.
- Swipe events invalidate non-selected branch records without deleting history.
- Verification: Node suite 28/28; no real chat messages or model calls were used for event tests.
- Commit: pending in this cycle.

---

## CHG-20261114-004 — Message invalidation and Swipe branch controls

- Type: FEATURE / DATA / TEST / UI
- Date: 2026-11-14
- Added: `invalidateFromMessage` invalidates records at an edited/deleted floor and all later records while retaining history; `invalidateSwipeBranch` invalidates non-selected swipe records without deletion.
- Added: debug panel inputs/actions for source message ID, swipe ID, “从此楼层作废后续记录” and “保留指定 Swipe，作废其它分支”.
- State remains derived through full recomputation; no incremental patching is used.
- Verification: Node suite 25/25, syntax checks pass. Real ST UI probe for these two new controls is pending; previous debug panel probe passed.
- Commit: pending in this cycle.

---

## CHG-20261114-003 — Manual memory store, state replay and user debug controls

- Type: FEATURE / DATA / TEST / UI
- Date: 2026-11-14
- Added: entity registration with same-name numbering; stable event record IDs; floor/sequence ordering; validity flags; source message/swipe fields; manual localStorage-backed memory store.
- Added: current state recomputation from valid records and closed-interval replay window before the active chat window.
- Added: debug UI controls for adding entities and manual events, plus state/replay inspection.
- Kept out of scope: AI extraction, automatic entity resolution, branch invalidation listeners, relation expansion, and production memory UI.
- Verification: Node suite 23/23; syntax and manifest validation; prior real ST debug UI probe passed. No real model call or automatic memory extraction was run.
- Commit: pending in this cycle.

---

## CHG-20261114-002 — Second-stage debug UI and Git baseline

- Type: FEATURE / TEST / BUILD / DOCS
- Date: 2026-11-14
- State: Implemented locally; no remote repository configured.
- Added: `ui.js` debug panel with visible `ILBM` button, marker test textarea, JSON result display, runtime status display, and close/refresh controls.
- Added: local Git repository and initial baseline commit `256d39f`; UI changes are the next commit.
- Verification: Node suite 19/19; real ST 1.19.0 UI probe opened panel and returned marker result/status JSON; test install and isolated browser profile removed after verification.
- Not implemented: event extraction, storage, entities, state/replay UI.

---

## CHG-20261114-001 — First-cycle framework and text-processing bridge

- Type: FEATURE / ARCH / API / TEST / DOCS
- Date: 2026-11-14
- State: Implemented; awaiting human verification of actual model request/display and branch edits.
- First-cycle implementation is present in `index.js`, `manifest.json`, `lib/`, `tests/`, and project docs; test-only ST install was removed after probe; rollback copy is retained at `backup/ILBM-ST-install-before-probe-update`. No Git repository exists in this workspace, so there is no commit/push.
- Motivation: Implement the confirmed ILBM/ILBR split without modifying ST core, official Regex, or ILB internals.
- Added: Independent ST extension shell; ILBR pure regex engine; ILBM marker result bridge; public `window.ILBM` and additive `window.ILB_SERIES.memory`; ST display formatter hook; Chat Completion prompt-ready adapter; generic string generate-data adapter.
- Callback semantics: `onMarked` runs only for non-dry-run assistant Chat Completion messages. Generic `GENERATE_AFTER_DATA` only sanitizes strings and does not trigger persistence because it lacks stable message identity. A temporary `sourceKey` is supplied for the prompt hook, not a durable record ID; historical messages may recur in each request and persistence idempotency still needs stable message/swipe IDs.
- Data/API: No durable memory schema and no ILB API change. ILBR 1.0.0 rules are call-supplied; ILBM API 0.1.0.
- Compatibility: No global regex scripts are installed or toggled. Unsupported multimodal message payloads remain unchanged. Failures are fail-open for normal chat. `dryRun` does not invoke the memory callback.
- Verification: `node --test tests/*.test.mjs` 17/17; local ST 1.19.0 synthetic CDP probe passed display filtering, prompt-ready filtering, generate-data string filtering, sentinel preservation, and original message preservation. No real model request was sent.
- Risks/unverified: Non-OpenAI backend payloads beyond string prompt/input; real provider request inspection; user-visible UI/manual display; edit/swipe branch invalidation; ILB series-to-series integration while ILB is not installed in this test instance.
- Decision: D-ILBM-001 in `docs/decisions.md`; legacy baseline `docs/LEGACY-BASELINE.md`.
