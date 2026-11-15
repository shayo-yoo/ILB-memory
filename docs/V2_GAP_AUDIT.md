# ILBM v2 需求对齐审计

日期：2026-11-15  
依据：`ILBMemory需求文档v2.md`  版本：ILBM 0.1.1

> 本报告只做审计，不代表未完成项已经实现。结论依据当前代码、测试和已有 probe；没有证据的能力标为“未验证”。

## 总结

- **已部分具备**：基础模块边界、文本过滤、实体/记录原型、线性状态重算、基础回放、失败降级、PC/手机最小 UI shell。
- **与 v2 明确不一致**：持久化仍以 localStorage 为主，尚未切换到 `window.ILB.api.set`；事件结构缺少完整 `direct/post/manual` 和待确认生命周期；关系线未实现；v2 内联 `[entity:...]` 解析未实现。
- **未验证**：ILB-regex 正式外部协作、ILB 触发复用、ST 实际上下文可见范围、稳定消息/Swipe 身份、事后 OpenAI 兼容 API、真实手机 WebView。
- **当前开发闸门**：先完成阶段一接口与环境验证，再改存储结构；不继续按旧版需求追加功能。
- **前置契约**：见 `docs/V2_INTERFACE_CONTRACT.md`，统一事件记录、ST/ILB/ILB-regex/事后提取接口边界。

## 分阶段审计

| v2 阶段 | 结论 | 证据/差距 |
|---|---|---|
| 1 接口与环境验证 | 部分符合 | `tests/ilbm-process-probe.mjs` 验证展示/请求副本过滤；ILB-regex 外部依赖、`window.ILB.api.set`、ILB 触发复用、上下文裁剪、post API 未验证。 |
| 2 实体与事件存储 | 部分符合 | `lib/memory-model.js` 有实体/记录/楼层/序号/ID/失效；缺完整事件结构、状态变更数组、提取模式、待确认、程序指针、chat 变量存储。 |
| 3 direct/post 提取 | 不符合 | 有候选 JSON/parser/extractor adapter，但没有 v2 direct `[entity:...]` 解析、动作白名单、延迟确认，也没有真实 post OpenAI 兼容调用。 |
| 4 当前状态 | 部分符合 | 有 `calculateCurrentState()` 线性重算；未按物品/角色/地点三类 MVP 卡片完整建模。 |
| 5 记忆重放 | 部分符合 | 有活跃窗口、回放窗口、闭区间和预算裁剪；未根据 ST 实际有效消息序列/真实上下文裁剪判定，未完成 v2 待确认/未来楼层完整约束。 |
| 6 关系线 | 未实现 | 未发现主节点、一跳关联、宽度预算、入度排序和关联状态摘要完整模块。 |
| 7 编辑/分支/稳定性 | 部分符合 | 有编辑/删除/Swipe 失效适配；延迟确认、稳定分支身份、`window.ILB.api.set` 随 chat 分叉尚未完成。 |
| 8 界面与优化 | 部分符合 | 新 `ui-shell.js` 已解耦并有 PC/手机 shell；正式事件列表、实体列表、详情页、模式/API 设置、关系线/时间线设置尚未完整接入。 |

## 数据结构审计

### 已存在

- 实体 ID、显示名、类型、aliases 原型；
- 记录 ID、文本、楼层、楼内序号、interactionId 原型；
- source message ID、swipe ID、storyTime 原型；
- valid 失效标记；
- settings 中 active/replay window；
- failure log。

### v2 缺失或需要迁移

- `status: pending | valid`，不能只用 `valid: boolean`；
- `extractionMode: direct | post | manual`；
- 统一 `stateChanges: [{entity, field, before, after}]`；
- 指针及可选 pointer type；
- chat 变量 schema/version；
- 延迟确认元数据；
- 记录字段级编辑协议。

## Marker 审计

当前兼容外层：

```text
(((ILBM:{内容})))
(((ILBM)))
```

v2 正式格式应为：

```text
(((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙])))
```

当前只完成外层过滤兼容，**尚未完成内部 `[entity:...]`、动作主体/客体/接收者解析和动作白名单验证**。

## 存储审计

当前代码入口：`lib/memory-store.js` 使用 `globalThis.localStorage` 和 `ilbm-memory:<chatId>`。

v2 要求：通过 `window.ILB.api.set` 写入聊天变量，使 chat 备份、分叉和切换自然继承。该能力当前为**架构差距/优先级阻塞项**，需要先完成阶段一 API 验证和迁移设计。

## 验证缺口

- [ ] ILB-regex 作为外部服务被 ILBM 调用并接收匹配结果
- [ ] ILB 触发条件复用和触发结果传递
- [x] `window.ILB.api.set/snapshot/remove` 真实接口；`get` 不是当前 ILB 1.4 顶层方法，需通过 snapshot/变量接口读取；证据：`docs/V2_PREFLIGHT_RESULTS.md`
- [ ] 稳定 message ID / swipe ID / 编辑删除参数
- [ ] ST 最终模型上下文实际可见范围
- [ ] OpenAI 兼容 post 提取 API 与 3 秒超时
- [ ] 真实手机 WebView 而非桌面移动视口
- [ ] v2 延迟确认真实消息时序

## 审计结论

当前项目应进入 **v2 阶段一审计和接口验证**，而不是直接继续扩展旧的候选事件或 UI 功能。完成阶段一后，先确定 chat 变量存储和统一事件 schema，再进入 v2 阶段二存储实现。
