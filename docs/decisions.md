# ILBM Decisions

## D-ILBM-001 · Separate on-demand regex, memory orchestration and host adapters

- Date: 2026-11-14
- Status: Accepted
- ILBR is a synchronous pure processor. Rules are provided per call; it returns original text, transformed text, matches and diagnostics. It does not subscribe to chat, persist, inject or alter ST.
- ILBM owns marker strategy and memory workflow. ST display and prompt filters are separate adapters over text copies.
- ST display uses public `messageFormatter.addHook` at `BEFORE_REGEX`.
- Chat Completion uses `CHAT_COMPLETION_PROMPT_READY`; generic generation uses `GENERATE_AFTER_DATA` only for string prompt/input fields.
- Never mutate stored `context.chat`; never block generation on optional memory processing.
- Expose an ILB-series namespace separately; do not modify `window.ILB` or rely on repository/pipeline internals.
- Rejected: cloning the official Regex editor/engine; patching ST source; globally enabling or changing the user's official Regex rules.
- Cost: other backends and multimodal payloads require more validation; first release leaves unsupported content unchanged.

## LEGACY-BASELINE

See `LEGACY-BASELINE.md`. Initial directory contained only the user-provided requirements document and no Git repository.
