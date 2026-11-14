# ILBM Decisions

## D-ILBM-001 · Separate on-demand regex, memory orchestration and host adapters

- Date: 2026-11-14
- Status: Accepted
- ILBR is a synchronous pure processor. Rules are provided per call; it returns original text, transformed text, matches and diagnostics. It does not subscribe to chat, persist, inject or alter ST.
- ILBM owns marker strategy and memory workflow. ST display and prompt filters are separate adapters over text copies.
- ST display uses public `messageFormatter.addHook` at `BEFORE_REGEX`.
- Chat Completion uses `CHAT_COMPLETION_PROMPT_READY`; generic generation uses `GENERATE_AFTER_DATA` only for string prompt/input fields.
- Only `MESSAGE_RECEIVED` assistant messages are capture candidates; prompt history and generic request data do not write memory.
- Never mutate stored `context.chat`; never block generation on optional memory processing.
- Expose an ILB-series namespace separately; do not modify `window.ILB` or rely on repository/pipeline internals.
- Rejected: cloning the official Regex editor/engine; patching ST source; globally enabling or changing the user's official Regex rules.
- Cost: other backends and multimodal payloads require more validation; first release leaves unsupported content unchanged.

## D-ILBM-002 · Current state is derived from valid history

- Date: 2026-11-14
- Status: Accepted
- Entities and event records are stored separately; current state is recalculated from valid records and never maintained as an independent fact table.
- Same-name entities receive a program-generated suffix; record IDs are stable and not floor numbers.
- Replay uses a closed floor interval immediately before the active window; it never deletes out-of-window records.
- AI extraction and branch invalidation are not silently approximated in this cycle.

## D-ILBM-003 · 编辑、删除与 Swipe 采用保留历史的失效标记

- 日期：2026-11-14
- 状态：Accepted
- 编辑/删除第 N 层时，将第 N 层及之后记录标记为 `valid:false`，不物理删除，后续由重新提取补回有效记录。
- Swipe 切换时，仅将同一 source message 的非选中 swipe 记录标记为无效。
- 当前状态始终从有效记录全量重算；本阶段不做局部影响分析。
- 否决：直接删除记录、只作废单条记录、以 floor+sequence 作为永久 ID。

## D-ILBM-004 · ST 消息生命周期事件采用宽容降级适配

- 日期：2026-11-14
- 状态：Accepted
- 订阅 `MESSAGE_EDITED`、`MESSAGE_DELETED`、`MESSAGE_SWIPED`、`MESSAGE_SWIPE_DELETED`；事件参数支持整数楼层和对象形态。
- 能拿到稳定消息 ID 时保留 sourceMessageId；只有楼层时按楼层及以后作废，并标记诊断 degraded。
- 不猜测未提供的 ID，不物理删除历史，不触发 AI 提取。

## LEGACY-BASELINE

See `LEGACY-BASELINE.md`. Initial directory contained only the user-provided requirements document and no Git repository.
