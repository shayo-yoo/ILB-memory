# ILBM v2 前置接口契约

日期：2026-11-15  
状态：Draft / Preflight only  
依据：`ILBMemory需求文档v2.md`

> 本文是开发前置契约，不代表所有接口已经接入。`confirmed` 表示有源码或测试证据；`pending` 表示必须通过真实运行探针或用户确认。

## 1. ILBM 对外公共接口

### `window.ILBM`

| 方法/字段 | 约定 | 当前状态 |
|---|---|---|
| `id` | `ILBM` | confirmed |
| `version` | 语义版本，每次发布/修复递增 | confirmed（当前 0.1.1） |
| `status()` | 返回启动、过滤、记忆和降级诊断 | confirmed |
| `processMarker(text, options?)` | 返回原文、触发、display/prompt/extraction 副本和错误 | confirmed；v2 内部 entity 解析 pending |
| `processText(text, rules, options?)` | 仅作为兼容诊断接口，不持有规则 | confirmed |

### `window.ILBM_MEMORY`

当前已暴露但需要 v2 对齐：

- `inspect()`
- `registerEntity()`
- `addRecord()`
- `previewCandidates()` / `importCandidates()`
- `importCandidateResponse()`
- `extractCandidates()`
- `buildMemoryText()`
- `injection.enable/apply/disable/clear`
- `exportBackup()` / `importBackup()`
- `reset()`

v2 前置要求：后续正式存储接口必须围绕统一 `EventRecord` schema，不允许 UI 直接修改内部 state。

## 2. 统一事件记录契约（草案）

```js
{
  recordId: string,                 // 稳定、程序生成
  entityIds: string[],
  action: string,
  stateChanges: [{
    entityId: string,
    field: string,
    before: unknown,
    after: unknown
  }],
  floor: number,
  sequence: number,
  sourceMessageId: string | null,
  swipeId: string | number | null,
  interactionId: string | null,
  extractionMode: 'direct' | 'post' | 'manual',
  status: 'pending' | 'valid' | 'invalid',
  storyTime: unknown | null,
  pointers: [{ targetRecordId: string, type?: string }]
}
```

约束：

- `status=pending` 不参与状态计算、回放或注入；
- `status=invalid` 保留历史但所有查询跳过；
- `valid` 不是第二份状态表；状态必须从有效记录线性扫描；
- `recordId` 不得由楼层号替代；
- `sequence` 由程序分配；
- AI 只能提交候选，程序负责补齐身份、时间、状态和来源字段。

## 3. ST 环境适配契约

当前 ST `getContext()` 源码确认提供：

- `chat`
- `chatMetadata`
- `getCurrentChatId()`
- `eventSource`
- `eventTypes`
- `setExtensionPrompt()`
- `getTokenCount()` / `getTokenCountAsync()`
- `maxContext`
- `saveChat()` / `saveMetadata()`

ILBM 允许依赖的公开适配边界：

1. 消息捕获只通过 `eventSource` 和 `eventTypes`；
2. prompt 注入只通过 `setExtensionPrompt`；
3. chat 记忆持久化优先通过 ILB 公开 API，而不是直接修改 ST 内部 chat；
4. token 预算优先使用 ST token API，字符数只能作为降级估算；
5. 失败不得阻塞普通聊天。

## 4. ILB 公共接口契约

根据 ILB `runtime/api.js` 源码，已确认：

- `window.ILB.api.version`
- `window.ILB.api.caps`
- `window.ILB.api.snapshot()`
- `window.ILB.api.set(name, value)`
- `window.ILB.api.remove(name)`
- `window.ILB.api.ui.openPanel(tab)`
- `window.ILB.api.ui.close()`

ILBM v2 计划使用：

```js
window.ILB.api.set('ilbm_memory', serializedMemory)
window.ILB.api.snapshot()

// 当前 ILB 1.4 实际实现：变量写入 extension_settings.independent_lorebook.chatStates[chatId].__vars，
// 由 ILB repository 调用扩展设置持久化；不能直接称为 ST 原生 chat_metadata 变量。
```

但以下仍需真实 ST + ILB 联动验证：

- ILB 是否已加载后 ILBM 才初始化；
- `set` 是否随 chat 备份、分叉和切换继承；
- chat 切换时 ILBM 是否收到可可靠监听的刷新时机；
- 序列化大小与变量值类型限制。

## 5. ILB-regex 契约

- ILBR 是独立仓库：`https://github.com/shayo-yoo/ILB-regex`；
- `createIlbrService().processText()` 是同步、按调用提供规则的纯处理接口；
- ILBM 不应重新实现通用正则规则存储；
- v2 正式目标是由 ILB-regex 识别/过滤内联标记，再把匹配结果交给 ILBM 解析器；
- 外部扩展网络安装后的发现和调用仍为 pending。

## 6. 事件契约

ST 事件名称已从 `events.js` 源码确认：

- `CHAT_COMPLETION_PROMPT_READY`
- `GENERATE_AFTER_DATA`
- `MESSAGE_RECEIVED`
- `MESSAGE_EDITED`
- `MESSAGE_DELETED`
- `MESSAGE_SWIPED`
- `MESSAGE_SWIPE_DELETED`

待验证项：参数结构、稳定消息 ID、Swipe 版本、编辑/删除楼层语义和确认时序。

## 7. 事后提取契约（post）

预期接口：

```js
extract({ messages, prompt, baseUrl, apiKey, model, timeoutMs: 3000 })
  -> Promise<CandidateEvent[] | { events: CandidateEvent[] }>
```

硬约束：

- 超时不阻塞聊天；
- 晚到结果不回溯当前注入；
- 结果必须走与 direct 相同的候选验证和存储入口；
- API Key 不写入聊天记录；
- 当前尚未实现，禁止在前置阶段假设可用。

## 8. 前置完成标准

前置工作只有在以下项目有证据后才结束：

- [x] ST + ILB 真实环境中 `ILB.api.set/snapshot` 往返成功；证据：`docs/V2_PREFLIGHT_RESULTS.md`。
- [ ] chat 切换、备份、分叉的记忆继承行为已记录；
- [ ] ILB-regex 外部服务发现/调用成功或明确替代方案；
- [ ] 每个 MESSAGE_* 事件参数形状有 probe 记录；
- [ ] Chat Completion 最终上下文可见范围有证据；
- [ ] post API 调用路径和超时/密钥边界已确定；
- [ ] 统一事件 schema 获得确认；
- [ ] BUG_TRACKER 和 V2_GAP_AUDIT 已同步更新。
