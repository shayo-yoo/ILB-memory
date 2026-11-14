# ILBM Change Log

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
