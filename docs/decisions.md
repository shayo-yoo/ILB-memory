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

## D-ILBM-005 · 候选事件先校验再落库

- 日期：2026-11-14
- 状态：Accepted
- AI 或用户提交候选 JSON 时，程序先验证文本、事件类型、实体引用和来源元数据，再逐项写入；合法项可以部分接受，非法项返回索引和原因。
- 候选事件不是最终事实；没有通过程序校验的内容不能进入有效历史。
- 否决：让 AI 直接写最终存储、整批失败导致合法项丢失、错误内容静默跳过。

## D-ILBM-006 · AI 响应先解析再进入候选事件校验

- 日期：2026-11-14
- 状态：Accepted
- AI 响应只作为候选 JSON 输入；支持纯数组、`{events: []}` 和 fenced JSON，解释性 prose 不当作事实。
- 解析失败不写入存储，返回错误；解析成功仍必须经过候选事件校验、实体引用验证和部分接受。
- 第一周期/第二阶段不主动调用模型；调试面板只提供手动粘贴测试入口。

## D-ILBM-007 · AI 提取只通过可注入适配器，默认关闭

- 日期：2026-11-14
- 状态：Accepted
- ILBM 提供 `extractCandidates(text, options)` 适配接口；调用方必须显式提供 `extract` 函数，默认不调用模型。
- 适配器有超时、耗时和解析失败结果；失败不阻塞聊天、不写入记忆。
- 候选响应仍必须经过 JSON 解析和候选事件校验，AI 不直接拥有最终存储权。
- 否决：在扩展启动时自动调用用户模型、把模型供应商配置硬编码到记忆扩展、让 AI 直接修改历史。

## LEGACY-BASELINE

See `LEGACY-BASELINE.md`. Initial directory contained only the user-provided requirements document and no Git repository.
