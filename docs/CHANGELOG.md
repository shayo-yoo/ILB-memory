# ILBM Change Log

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
