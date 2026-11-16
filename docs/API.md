# ILBM / ILBR API（v2 需求对齐）

> 当前需求依据为 `../ILBMemory需求文档v2.md`；本文旧接口记录仅作为已实现能力参考，不代表 v2 目标均已完成。

接口版本：ILBR 1.0.0；ILBM 0.7.0。第一周期范围仅供 ILB 系列扩展调用。

## ILBR

```js
import { createIlbrService, createIlbmMarkerRule } from './lib/ilbr-engine.js';
const ilbr = createIlbrService();
const result = ilbr.processText(rawText, [createIlbmMarkerRule()], { scope: 'prompt' });
```

`processText(text, rules, {scope})` 同步返回：

```js
{ ok, original, text, matched, matches:[{ruleId,count,captures:[{value,index,groups,namedGroups}]}], errors:[] }
```

规则字段：`id`、`enabled?`、`scope? ('all'|'display'|'prompt')`、`pattern`、`flags?`、`replacement`。规则由调用方传入；引擎不保存、不监听、不注入。坏规则逐项报错并跳过，不阻塞聊天。

## ILBM

`window.ILBM` 提供 `processText`、`processMarker`、`status`；ILB 系列可监听 `ilb-series:ready`，或查 `window.ILB_SERIES.memory`。ILBM 不修改 `window.ILB`。

`processMarker(text)` 返回：

- `original`: 未改原文；
- `triggered`: 是否包含 `(((ILBM)))`；
- `extractionText`: 去标记正文，只供提取器读取；
- `displayText`: 展示副本；
- `promptText`: 提示词副本；
- `matches/errors`: 诊断信息。

`onMarked` 回调仅在 Chat Completion `prompt-ready` 事件的 assistant 消息、且非 dry-run 时触发；附带临时 `sourceKey`（聊天 ID/数组索引/内容哈希）供调用方本次处理幂等参考。该 key 不是永久记录 ID；稳定 message/swipe ID 未完成接口验证前，不可将其当存储主键。`GENERATE_AFTER_DATA` 当前只做字符串净化，不触发记忆持久化。

## ILBM Memory API

`window.ILBM_MEMORY`（以及 `window.ILBM_MEMORY` 的 `ILB_SERIES` 适配）提供当前聊天的记忆管理能力：

- `inspect()`：返回 entities、records、settings、failures、currentState、replay、lastChange 和 eventAdapter。
- `registerEntity({name,type?,tags?,aliases?})`：注册实体，同名自动编号；旧 `type` 会迁移为 kind 标签。
- `setEntityTags(id, tags)`：显式编辑实体标签；kind 标签决定默认字段集，实体可同时拥有多个 kind/自由标签。
- `addRecord(record)`：添加手动事件记录；程序生成稳定记录 ID。
- `addManualRecord({text,floor,action?,entities?,description?})`：手动新增记录；短名会解析/注册，动作字符串按白名单推导 `stateChanges`，直接有效。
- `updateRecord(id, patch)`：字段级修改记录，记录 ID 不变；`action` 字符串会重新推导状态变更，手动编辑直接有效。
- `postExtract({floor?,sourceMessageId?,swipeId?})`：模式 B 事后提取（需 `extractionMode='post'` 与 `postApi` 配置）；返回本轮结果，`pending` 为完整请求 promise，软超时后仍会写入存储。
- `postExtraction()`：返回当前提取模式与进行中的消息键。
- `exportBackup()` / `importBackup(payload)`：备份 schema v2；可导入 schema v1 并将 `type` 迁移为 `tags`；包含 `extractionMarks` 与提取设置。
- `previewCandidates(payload, meta?)`：校验候选事件但不保存。
- `importCandidates(payload, meta?)`：校验并保存合法候选事件；`meta` 支持 `status`、`extractionMode`、`resolveEntities`。
- `importCandidateResponse(raw, meta?)`：解析 AI 文本后再进入候选校验。
- `extractCandidates(text, {extract?,timeoutMs?})`：可注入 AI 适配器；默认不调用模型。
- `buildMemoryText({currentFloor?,tokenBudget?,mentionedEntityIds?,mentionText?,relationLine?,relationLineWidth?,timelineDepth?,activeWindowLayers?,replayLayers?,style?})`：生成合并后的记忆文本与诊断元数据。
  - `style`：`compact`（默认）或 `narrative`；未提供时读取 `settings.injectionStyle`。
  - `mentionedEntityIds` 可传实体 ID 或短名；`mentionText` 传本轮文本由程序识别主节点；两者都未提供时退化为全量状态卡预览。
  - 返回 `text`、`style`、`usedRecords`、`truncated`、`injectedEntityIds`、`mainEntityIds`、`relationEntityIds`、`timelineRecordIds`、`protectedRecordIds`、`droppedRecords`、`overBudget` 等。
  - 裁剪顺序：关系线间接实体 → 最早的非保护回放记录；主节点时间线与同事件分组记录不裁剪。
- `previewCurrentTurn(options?)`：使用当前聊天最后一条用户消息和当前楼层生成注入预览。
- `markerPrompt({language?})`：返回模式 A 的标记提示词文本（`zh` 默认 / `en`）；用于放入 ILB 提示词注入、ST 系统提示词或世界书。
- `markerPromptInfo()`：返回中英文提示词、语法参考和“不会自动注入”的说明。
- `markerPromptInjection.{enable,apply,disable,clear}()`：可选的独立 extension prompt 注入，默认关闭；使用 `setExtensionPrompt` 的 `ILBM_MARKER_PROMPT` key。
- `setSettings({activeWindowLayers?,replayLayers?,relationLineWidth?,timelineDepth?,injectionStyle?,extractionMode?,postApi?})`：修改当前 chat 的检索/提取/注入配置；`postApi` 为深合并对象（`baseUrl`、`apiKey`、`model`、`prompt`、`contextRounds`、`timeoutMs`、`requestTimeoutMs`）。
- `injection.enable()` / `injection.apply()` / `injection.disable()`：记忆 extension prompt 注入；默认关闭，只有用户明确操作才写入。运行时注入文本会在应用时按当前最后一轮用户消息重新生成。
- `removeRecord(id)`、`removeEntity(id)`、`reset()`：显式管理数据。

失败时返回诊断或抛出可读错误；失败不会阻塞聊天。候选事件必须先预览/校验，AI 不直接拥有最终存储权。

### 关系数据结构

实体状态中的关系为有向边：

```js
{ fromId, toId, type, role, establishedAt }
```

- `type` 使用关系类型码（如 `MASTER_SERVANT`），未知词为自定义类型；
- `role` 是角色词（`主人`/`仆人`/`丈夫`/`妻子`…）；
- 读取层兼容旧记录 `{ targetId, type }`；
- 对称类型（朋友/敌人/盟友/家人/恋人）由一条记录补反向边；不对称类型必须两条记录。

## ST 适配时序

- 显示：`getContext().messageFormatter.addHook()`，`beforeRegex`、early 顺序。只返回展示转换字符串，不保存到 chat。
- Chat Completion：监听 `CHAT_COMPLETION_PROMPT_READY`，处理事件载荷 chat 的纯文本 content。ST `ChatCompletion.getChat()` 将内部集合展平成新数组/新消息对象，事件在 `prepareOpenAIMessages()` 返回发送调用方前触发，故修改只作用请求副本，不改 `context.chat`。
- 其它生成路径：监听 `GENERATE_AFTER_DATA`，只处理 `generate_data.prompt` 或 `input` 字符串；不处理其它字段，不会改原始聊天。此路径与不同 completion backend 的载荷覆盖仍需版本实测。
- Chat Completion `onMarked` 仅对非 dry-run assistant 消息调用；`sourceKey` 是聊天 ID/请求数组索引/内容哈希的短期提示，不是记录主键。历史消息随每轮重复出现在 prompt 中，因此持久层之后必须用稳定 message/swipe ID 去重。
- `GENERATE_AFTER_DATA` 目前仅净化字符串 prompt/input，不调用 `onMarked`；通用 backend 未取得稳定消息身份前不触发记忆写入。
- `dryRun === true` 可净化预览，但不得调用记忆写入回调。
- 多模态消息仅支持单 text block；带图片/音频/工具等复杂 content 保持原样，不能保证这些形态隐藏标记。
