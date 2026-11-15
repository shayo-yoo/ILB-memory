# ILBM Change Log

## CHG-20261116-071 — Remove legacy debug UI residue

- Type: FIX / UI / TEST
- Added startup compatibility cleanup for legacy `#ilbm-debug-root`, `.ilbm-debug-toggle`, and `#ilbm-debug-style` before mounting the v2 shell.
- Legacy `mountILBMPanel` no longer leaves a floating toggle in the DOM when `showToggle=false`.
- Added regression coverage for removing pre-existing legacy nodes before shell mount.
- Real ST update-install and mobile WebView acceptance remain pending per BUG-001/002/004.
- Commit: pending.

---

## CHG-20261115-022 — Publish ILBM and standalone ILBR repositories

- Type: BUILD / ARCH / DOCS
- Date: 2026-11-15
- Pushed ILBM to `https://github.com/shayo-yoo/ILB-memory.git` and standalone ILBR to `https://github.com/shayo-yoo/ILB-regex.git`.
- ILBR repository owns the pure engine and generic tests; ILBM retains the ILBM marker adapter and memory integration.
- Verified raw GitHub `manifest.json` and `index.js` return HTTP 200 for both repositories.
- ILBM tests: 50/50; ILBR tests: 7/7. No remote history was overwritten.

---

## CHG-20261116-070 — Reset repeated-open shell state

- Type: FIX / UI / TEST
- Repeated open/close now clears shell state classes (`open/active/expanded/show`), `data-ilbm-open`, `aria-hidden`, dialog open state, display and visibility.
- Buttons keep neutral static positioning through open cycles; drawer section state uses explicit data attributes/display rules.
- Node suite: 64/64.
- Commit: pending.

---

## CHG-20261116-069 — Isolate shell buttons from ST perspective/layout

- Type: FIX / UI / TEST
- Shell buttons and nav controls now force static positioning, inline-flex layout, neutral inset/transform/float, controlled wrapping and local high-contrast appearance.
- Targets the reported “only buttons look displaced/perspective” issue without changing pagination logic.
- Node suite: 64/64.
- Commit: pending.

---

## CHG-20261116-067 — Refactor drawer UI and shell lifecycle

- Type: FIX / UI / REFACTOR / TEST
- Shell close now explicitly sets `hidden`, `open`, `display` and `aria-hidden`; shell is created before API publication and receives API via `setApi` after publication.
- Added top expandable “功能分区” drawer with section navigation; hides non-selected sections to avoid long flat scrolling.
- Node suite: 64/64.
- Commit: pending.

---

## CHG-20261115-066 — Finalize v2 trial run evidence

- Type: TEST / DOCS
- Final Node regression: 64/64 passed.
- Workspace clean; direct runtime probe previously passed in isolated ST with ILB/ILBM/ILBR.
- Updated trial guide with final verification evidence.
- Commit: pending.

---

## CHG-20261115-065 — Clarify pure parser and runtime resolver boundary

- Type: DOCS / ARCH / TEST
- Trial probe exposed expected boundary: `parseDirectMarkers()` is pure and does not persist entities; runtime MESSAGE_RECEIVED path injects resolver and binds stable IDs.
- Updated trial guide and BUG tracker to distinguish parser-only validation from full runtime flow.
- No architecture change.
- Commit: pending.

---

## CHG-20261115-064 — Connect entity resolver to runtime direct path

- Type: FEATURE / ARCH / TEST
- Runtime direct marker capture now resolves entity short names through the memory-owned entity resolver before creating pending records.
- Existing entities/aliases are reused; unknown names are registered through the public memory API.
- Node suite: 64/64.
- Commit: pending.

---

## CHG-20261115-063 — Verify direct trial runtime in ST

- Type: TEST / DOCS
- Isolated ST probe passed with ILB, ILBM and ILBR installed together.
- Verified direct parser, cleaned text, pending EventRecord, one derived state change, stable entity registration and state-card groups.
- Temporary installs/profile cleaned; no formal chat data written.
- Commit: pending.

---

## CHG-20261115-062 — Derive state changes from direct actions

- Type: FEATURE / DATA / TEST
- Added `lib/action-state.js` for whitelist action → stateChanges derivation.
- Direct parser now includes stateChanges in pending EventRecords.
- Narrative actions outside the whitelist produce no state changes.
- Node suite: 64/64.
- Commit: pending.

---

## CHG-20261115-061 — Add direct entity resolution adapter

- Type: FEATURE / ARCH / TEST
- Added `lib/entity-resolver.js` to map marker entity short names to stable IDs or register unknown entities through the memory API.
- Direct parser accepts an optional resolver without owning entity storage.
- Node suite: 62/62.
- Commit: pending.

---

## CHG-20261116-068 — Enforce strict v2 marker syntax

- Type: BREAKING / API / TEST / DOCS
- Removed legacy `(((ILBM)))` marker compatibility; only `(((ILBM:[entity:...] 动作 ...)))` is recognized.
- `extractionText` now preserves structured marker content for direct parsing instead of returning only cleaned whitespace.
- `交给` is accepted as a normalized alias of `转移` for practical Chinese input.
- Trial version bumped to `0.3.0`.
- Node suite: 64/64.
- Commit: pending.

---

## CHG-20261115-060 — Add v2 trial run guide

- Type: DOCS / TEST
- Added `docs/TRIAL_RUN.md` with installation, direct marker, entity, pending confirmation, invalidation, state-card and timeline acceptance steps.
- Explicitly lists current limitations and feedback fields.
- Commit: pending.

---

## CHG-20261115-059 — Add event invalidation control to trial UI

- Type: UI / FEATURE / TEST
- Added floor-based “作废该楼层及之后” control for trial validation of edit/delete semantics.
- Uses public `invalidateFromMessage` API; does not directly mutate UI state.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-058 — Add direct parser error help and bump trial version

- Type: UI / DOCS / BUILD / TEST
- Added direct parser error-help guidance to trial UI.
- Bumped ILBM trial version to `0.2.1` for update detection.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-057 — Add pending confirmation control to trial UI

- Type: UI / FEATURE / TEST
- Added “确认上一层待确认事件” control and exposed `confirmPending`/`invalidatePendingBranch` through public memory API.
- UI remains an explicit test/control surface; normal lifecycle still confirms automatically on newly captured assistant message floor.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-056 — Add event detail view to trial UI

- Type: UI / FEATURE / TEST
- Added event detail lookup by record ID, exposing full normalized record fields including status, extractionMode and stateChanges.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-055 — Add entity timeline to trial UI

- Type: UI / FEATURE / TEST
- Added entity timeline query by entity short name or ID; displays matching records ordered by floor/sequence.
- Uses public inspect API; no UI-owned state mutation.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-054 — Add categorized state cards to trial UI

- Type: UI / FEATURE / TEST
- Added “查看分类状态卡” to the new shell; displays `items/persons/places` cards from derived current state.
- UI continues to call the public memory API and does not own storage.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-053 — Enforce pending exclusion from state and replay

- Type: FIX / DATA / TEST
- `calculateCurrentState()` and `replayRecords()` now require both `valid=true` and `status='valid'`.
- Pending direct records remain stored for confirmation but cannot affect current state or injection.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-052 — Add entity management trial UI

- Type: FEATURE / UI / TEST
- Added entity management section to the decoupled shell: entity short-name input, register action, result display and help text.
- Existing memory API remains the storage owner; UI only calls `registerEntity`.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-051 — Connect direct records and trial UI

- Type: FEATURE / UI / TEST
- Direct marker capture now creates pending EventRecords and confirmation API is exposed through the memory store.
- New shell includes an event-record section with help text for pending/valid/invalid and direct/post/manual modes.
- Node suite: 61/61.
- Commit: pending.

---

## CHG-20261115-050 — Add pending confirmation lifecycle foundation

- Type: FEATURE / DATA / TEST
- Added `lib/confirmation.js`: previous-floor pending records become valid on a later user floor; non-selected Swipe pending records become invalid.
- Preserved v2 `status`/`extractionMode` fields through memory normalization.
- Node suite: 61/61.
- ST event timing integration remains later work; no architecture ambiguity encountered.
- Commit: pending.

---

## CHG-20261115-049 — Add v2 direct marker parser foundation

- Type: FEATURE / API / TEST
- Added `lib/direct-parser.js` for v2 `(((ILBM:[entity:...] 动作 ...)))` markers.
- Parser enforces action whitelist, extracts entity short names, cleans marker text, and emits pending `EventRecord` objects.
- Entity identity binding and full semantic action decomposition remain later work.
- Node suite: 59/59.
- Commit: pending.

---

## CHG-20261115-048 — Route memory store through v2 storage adapter

- Type: ARCH / DATA / TEST
- Existing `memory-store` now depends on replaceable `MemoryStorage` adapter.
- ILB backend is preferred; legacy localStorage remains fallback for migration safety.
- Existing business methods and public API remain unchanged.
- Version remains `0.2.0`; no destructive migration performed.
- Node suite: 57/57.
- Commit: pending.

---

## CHG-20261115-047 — Add width guards and v2 storage/schema foundation

- Type: FIX / ARCH / DATA / TEST
- Added PC/mobile max-width and horizontal overflow guards to prevent unreadable horizontal scrolling.
- Added replaceable `lib/memory-storage.js` adapter: ILB backend first, legacy fallback second; existing store not replaced yet.
- Added `lib/event-record.js` v2 record normalization and schema tests.
- Bumped ILBM version to `0.2.0`.
- Node suite: 57/57.
- Added ADR `docs/decisions/D-ILBM-V2-002-storage-adapter.md`.
- Commit: pending.

---

## CHG-20261115-046 — Fix PC shell layout and settings button contrast

- Type: FIX / UI / ARCH / TEST
- PC shell header now has isolated forced flex row layout with title flexing left and close button fixed right.
- Settings entry card/button now has local high-contrast inline styling independent of ST global button theme.
- Added versioned, replaceable `lib/memory-schema.js` envelope/status/mode adapter as v2 storage foundation; not yet connected to persistence.
- Node suite: 55/55; UI probe confirms header flex row and entry button dark background/white text, but headless layout rectangles are zero and need real visible PC manual confirmation.
- Commit: pending.

---

## CHG-20261115-045 — Record PC shell and settings-entry UI bugs

- Type: BUG / DOCS / UI
- Added BUG-005 for PC shell title/close layout misalignment.
- Added BUG-006 for white settings-entry button with unreadable text.
- No code changed in this report-only step.
- Commit: pending.

---

## CHG-20261115-044 — Record context observability probe

- Type: TEST / DOCS
- Real ST probe confirmed prompt-ready, `setExtensionPrompt` and generation entry availability.
- No model request was sent; final provider payload was not captured, so context visibility remains an explicit open gate.
- Temporary browser profile cleaned; no chat data written.
- Commit: pending.

---

## CHG-20261115-043 — Consolidate v2 preflight completion gates

- Type: DOCS / ARCH / TEST
- Separated verified foundation capabilities from unresolved real-behavior gates.
- Added explicit rule: no v2 feature development until chat inheritance, stable message identity, final context, post API, mobile WebView and delayed-confirmation gates close.
- No business feature implementation performed.
- Commit: pending.

---

## CHG-20261115-042 — Decide external ILBR capability negotiation

- Type: ARCH / API / DOCS
- Accepted v2 decision: ILBM will prefer `ILB_SERIES.regex`, then `window.ILBR`, then a diagnostic-only compatibility fallback.
- No implementation change in this preflight step; ordinary chat must continue if external ILBR is unavailable.
- Added ADR `docs/decisions/D-ILBM-V2-001-external-ilbr-preference.md`.
- Commit: pending.

---

## CHG-20261115-041 — Verify ILB/ILBM/ILBR coexistence

- Type: TEST / API / DOCS
- Combined isolated ST probe installed ILB, ILBM and ILBR simultaneously.
- Verified `window.ILB`, `window.ILBM`, `window.ILBR`, `ILB_SERIES.regex`, `ILB_SERIES.memory` and ILBR `processText` all work together.
- ILBM still uses its bundled compatibility engine; external service handoff remains an explicit later decision.
- Temporary installs/profile were cleaned; no chat data written.
- Commit: pending.

---

## CHG-20261115-040 — Audit prompt timing and post-request reuse boundaries

- Type: TEST / API / DOCS
- Confirmed `prepareOpenAIMessages()` emits `CHAT_COMPLETION_PROMPT_READY` after `ChatCompletion.getChat()` and before generation request creation.
- Confirmed ST has `custom-request.js` and generation request services, but no stable ILBM-specific post-extraction API was established.
- Updated preflight and interface contract; no business feature implementation performed.
- Commit: pending.

---

## CHG-20261115-039 — Audit ST chat metadata lifecycle paths

- Type: TEST / DOCS / DATA
- Confirmed ST loads chat metadata from chat-file header `data[0].chat_metadata` and writes via `saveMetadata`/`saveMetadataDebounced`.
- Confirmed ILB variables are stored separately in extension settings `chatStates[chatId].__vars`; inheritance with ST chat file backup/fork remains unproven.
- No business feature implementation performed.
- Commit: pending.

---

## CHG-20261115-038 — Clarify ILB variable persistence boundary

- Type: API / DATA / DOCS
- ILB source audit confirms `api.set` stores variables in `extension_settings.independent_lorebook.chatStates[chatId].__vars` and persists through the extension settings repository.
- This is not yet proven equivalent to ST native `chat_metadata`; v2 backup/fork/switch inheritance remains open.
- Updated preflight, contract and BUG tracker language to avoid overstating the capability.
- No business feature implementation performed.
- Commit: pending.

---

## CHG-20261115-037 — Extend v2 preflight evidence

- Type: TEST / DOCS
- Confirmed ILB-regex GitHub raw install files return HTTP 200.
- Confirmed ST EventEmitter serially awaits listeners and catches listener errors.
- Added source evidence that some MESSAGE events are emitted with floor/index primitives, while complete stable identity semantics remain pending.
- No business feature implementation performed.
- Commit: pending.

---

## CHG-20261115-036 — Record preflight regression suite

- Type: TEST / DOCS
- Recorded ILBM regression suite result: 55/55 passed.
- Clarified that passing prototype tests does not close remaining v2 environment gaps.
- No business feature implementation performed.
- Commit: pending.

---

## CHG-20261115-035 — Verify ILB/ST preflight capabilities

- Type: TEST / DOCS / API
- Added `tests/v2-preflight-probe.mjs` and `docs/V2_PREFLIGHT_RESULTS.md`.
- Real isolated ST probe verified ILBM + ILB coexistence, ILB 1.4 `set/snapshot/remove`, ST chat context, `setExtensionPrompt`, and lifecycle event names.
- Probe used a temporary variable and cleared it; temporary extension/profile were removed afterward.
- Remaining chat inheritance, event payload identity, final context visibility, external ILB-regex handoff, post API and mobile WebView remain pending.
- Commit: pending.

---

## CHG-20261115-034 — Establish v2 interface and environment preflight contract

- Type: API / ARCH / TEST / DOCS
- Added `docs/V2_INTERFACE_CONTRACT.md` defining ILBM, ST, ILB, ILB-regex, event, storage, token and post-extraction boundaries.
- Updated v2 audit, BUG tracker and PROJECT_STATE to mark preflight verification as the gate before feature development.
- No business feature implementation or storage migration performed.
- Commit: pending.

---

## CHG-20261115-033 — Audit project against v2 and add bug tracker

- Type: DOCS / ARCH / TEST
- Added `docs/V2_GAP_AUDIT.md` with phase-by-phase v2 compliance, evidence, gaps, and verification blockers.
- Added `docs/BUG_TRACKER.md` with checkbox-based BUG/GAP lifecycle, acceptance criteria, commit and test evidence rules.
- Updated PROJECT_STATE to mark v2 audit as the current phase.
- No feature implementation performed; only audit and traceability documents changed.
- Commit: pending.

---

## CHG-20261115-032 — Adopt requirements v2 and archive v1

- Type: DOCS / ARCH
- Read `ILBMemory需求文档v2.md` in full and recorded the key changes in `docs/REQUIREMENTS_V2_REVIEW.md`.
- Archived the previous requirements document as `docs/archive/ILBMemory需求文档-v1.md`.
- Updated README, requirements pointer, and PROJECT_STATE to make v2 the sole current development basis.
- No feature implementation was performed under this change.
- Commit: pending.

---

## CHG-20261115-031 — Isolate minimal shell from legacy business panel

- Type: REFACTOR / UI / FIX / TEST
- Removed legacy `mountILBMPanel` startup mounting from the main entry; only the new `ui-shell` is mounted, eliminating two competing panel states.
- New shell uses explicit dark high-contrast inline styling, fixed title/status area and deterministic close state; business panel will be plugged in later as content.
- Node suite: 54/54.
- Commit: pending.

---

## CHG-20261115-030 — Minimal decoupled UI shell

- Type: ARCH / UI / TEST
- Replaced the old business-heavy panel entry with a minimal decoupled shell (`ui-shell.js`).
- Desktop uses a fixed section; mobile uses a full-screen dialog top layer. Both expose deterministic `open/close/isOpen` and duplicate mount returns the same shell.
- The shell initially shows only version/status; existing memory UI content is not coupled into shell state yet.
- Node suite: 54/54.
- Commit: pending.

---

## CHG-20261115-029 — Mobile close interaction and high-contrast controls

- Type: FIX / UI / TEST
- Close button now handles both click and pointerup, prevents propagation, closes dialog/section directly, and has visible hover/active/focus feedback.
- All ILBM buttons use forced high-contrast dark background, white text, border, focus outline and pressed state to resist ST theme overrides.
- Startup remains closed by default.
- Node suite: 51/51.
- Commit: pending.

---

## CHG-20261115-028 — Mobile dialog bottom navigation

- Type: UI / TEST
- Added mobile-only bottom navigation buttons: 状态 / 实体 / 事件 / 设置.
- Desktop section panel remains unchanged; the same API/content remains shared.
- Node suite: 51/51.
- Commit: pending.

---

## CHG-20261115-027 — Independent mobile dialog UI

- Type: UI / ARCH / TEST
- Added independent mobile `dialog` shell for ILBM; desktop uses normal section panel, mobile uses full-screen top-layer dialog.
- Settings entry opens the mobile dialog at 390×844 with `open=true`, `display:flex`, 390×844 bounds; no floating button is restored.
- Node suite: 51/51; real mobile viewport probe passed.
- Commit: pending.

---

## CHG-20261115-026 — Mobile settings entry and delayed host mount

- Mobile ST can use a different settings container or render it after extension startup; ILBM now mounts its settings entry into every available extensions settings host and retries for up to 20 seconds.
- No floating button is restored; panel remains settings-entry driven.
- Verification: Node suite 51/51; mobile real-device probe remains manual due to current CDP desktop limitations.
- Commit: pending.

---

## CHG-20261115-025 — Force visible ILBM panel from settings entry

- Root cause: ST host CSS retained `display:none` even after removing the `hidden` attribute; settings click appeared to do nothing.
- Fix: panel open path now removes `hidden`, sets `hidden=false`, and applies `display:block`; close applies `display:none`.
- Translation: settings card title/button now use Chinese `ILB-Memory 记忆管理` text.
- Verification: Node suite 51/51; real ST probe reports `hidden:false`, no hidden attribute, `display:block` after button click.
- Commit: pending.

---

## CHG-20261115-024 — Fix repeated ILBM panel settings entry and ILB focus warning

- ILBM: duplicate panel mount now returns existing `root/open/close` handles; settings-page button no longer accesses undefined `panel.root`.
- ILBM commit: `f1692ec`, pushed to `https://github.com/shayo-yoo/ILB-memory.git`.
- ILB: focus is restored before applying `aria-hidden`/closing desktop or mobile shell, preventing the browser warning about a focused descendant being hidden.
- ILB commit: `7360cb3`, pushed to `https://github.com/shayo-yoo/ILB.git`.
- ILB full tests: 402/402; ILBM full tests: 51/51.
- `content-runtime.js`/`contextmenuhlpr.js` `wxt/storage` and `sendMessage` errors are from a separate browser extension, not ILB/ILBM.

---

## CHG-20261115-023 — Fix repeated ILBM panel settings entry

- Type: FIX / UI / TEST
- Root cause: a second `mountILBMPanel()` call returned only `duplicate:true`; the settings-page button then accessed missing `panel.root`, causing `Cannot set properties of undefined (setting 'hidden')`.
- Fix: duplicate mount returns existing `root/toggle/open/close` handles; settings entry calls `panel.open()` safely.
- Verification: Node suite 51/51.
- The separate `contextmenuhlpr.js sendMessage` error is not ILBM-owned and remains outside this fix.
- Commit: pending.

---

## CHG-20261114-021 — Move ILBM entry to ST extension settings

- Type: UX / UI / TEST
- Date: 2026-11-14
- Changed ILBM debug panel default entry: no visible floating button is created; ST extension settings receives “打开 ILB-Memory 调试面板”.
- Keeps `window.ILBM` and diagnostic root available, but reduces floating-ball clutter.
- Real ST probe: ILBM loaded, settings button visible, floating toggle hidden, panel root mounted hidden.
- Verification: Node suite 50/50.
- Commit: pending in this cycle.

---

## CHG-20261114-020 — Manual acceptance checklist and status copy

- Type: DOCS / UI / TEST
- Date: 2026-11-14
- Added `docs/MANUAL_ACCEPTANCE.md` with non-technical user steps and explicit unverified boundaries.
- Added “复制状态” button to debug panel for support/reporting without console access.
- Verification: Node suite 50/50; clean Git commits maintained.
- Commit: pending in this cycle.

---

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
