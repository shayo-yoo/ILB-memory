# D-ILBM-V2-006 · 注入风格与模式 B 事后提取

- 日期：2026-11-17
- 状态：Accepted（代码级）；真实 API/ST 验收待完成
- 依据：`ILBMemory需求文档v2.md` §5.2、§5.4、§6.2、§6.3、§7.7

## 决策

### 1. 注入风格

- `settings.injectionStyle`：`compact`（默认）与 `narrative`。
- `compact`：状态卡 `实体：字段=值`，历史 `第N层：原文`；保持既有接口与测试兼容。
- `narrative`：状态卡改写为自然句（持有者/位置/状态、位置/持续状态/关系、在场列表），历史用动词模板生成（转移→“将…交给…”、移动→“移动到…”等），无模板时回退清洗后的原文。
- 两种风格都不得输出 JSON、内部记录 ID 或 `[entity:...]` 标记；未知字段必须保留为可读句。

### 2. 模式 B 事后提取

- `settings.extractionMode`：`direct`（默认）/ `post`；模式 B 需要 `postApi` 配置（Base URL、API Key、模型、提示词、上下文档数、软/硬超时）。
- 触发：`MESSAGE_RECEIVED` 的 assistant 消息；模式 B 下过滤标记但不解析，异步调用 OpenAI 兼容 `/chat/completions`。
- 出口：候选事件复用 `validateCandidatePayload` → `addRecord`，保存为 `pending`，下一层用户消息确认后才参与状态与注入。
- 去重：`extractionMarks` 按 `消息 ID#Swipe` 记录 `started/done/failed`；同一消息已有任意模式记录时跳过，满足“同一条消息只允许一种模式提取”。
- 超时：3 秒软超时只影响本轮注入，请求继续；晚到结果仍写入存储，不回溯注入。硬超时（默认 30s）中止请求。
- 失败：HTTP/解析/校验失败写失败日志（楼层、原因、来源消息），不阻塞聊天。
- 编辑/删除/Swipe：作废楼层或未选中分支的提取标记，允许重新提取。

## 影响

- 新增 `lib/injection-format.js`、`lib/post-extractor.js`。
- `lib/memory-model.js`：设置规范化、`extractionMarks`、`updateRecord`、标记作废。
- `lib/candidate-events.js`：短名解析、动作字符串推导、关系短名/角色、pending 状态。
- `lib/memory-store.js` / `index.js`：`postExtract`、`addManualRecord`、`updateRecord`、设置深合并。
- `ui-shell.js`：提取设置、失败日志、手动新增/编辑、注入风格。
- 测试：`tests/post-extractor.test.mjs`、`tests/injection-style.test.mjs`、`tests/candidate-events.test.mjs`、`tests/manual-edit.test.mjs`、`tests/settings-extraction.test.mjs`、`tests/ui-shell.test.mjs`。

## 已知限制

- 真实 OpenAI 兼容 API、3 秒超时后的晚到写入、ST 最终 provider payload 尚未真实验收。
- 模式 B 的指代消解依赖外部模型；提示词只提供短名清单与当前/前 N 轮对话。
- API Key 随 chat 变量保存并进入备份；这是本地扩展的便利性取舍，未做加密。
- 触发条件仍委托 ILB 本体，ILBM 不实现独立关键词引擎。
