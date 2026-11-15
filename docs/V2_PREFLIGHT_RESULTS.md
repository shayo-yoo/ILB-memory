# v2 前置环境验证结果

日期：2026-11-15
探针：`tests/v2-preflight-probe.mjs`
环境：本机 ST，隔离 Chrome CDP，临时安装 ILBM，验证后清理。

## 已验证

| 能力 | 结果 | 证据 |
|---|---|---|
| ILBM 加载 | 通过 | probe `ilbm: true` |
| ILB 加载 | 通过 | probe `ilb: true` |
| ILB API 版本 | 通过 | `1.4` |
| `ILB.api.set` | 通过 | 临时变量 `__ilbm_preflight__` 写入成功 |
| `ILB.api.snapshot` | 通过 | 写入前后快照发生变化 |
| `ILB.api.remove` | 通过 | 临时变量移除成功 |
| ST chat 对象 | 通过 | `ctx.chat` 存在 |
| ST 当前 chat ID | 限制 | 当前空测试聊天返回 `null`，不能据此证明真实 chat 切换继承 |
| `setExtensionPrompt` | 通过 | 临时 `ILBM_PREFLIGHT` 注入对象出现，随后清空 |
| 生命周期事件名称 | 通过 | received/edited/deleted/swiped/swipeDeleted/promptReady 均返回明确名称 |
| ILBM 与 ILB 同时加载 | 通过 | 两个全局 API 同时存在 |
| ILB + ILBM + ILBR 网络/扩展共存 | 通过 | 三个全局 API 同时存在；`ILB_SERIES.regex`/`memory` 均存在；ILBR `processText` 处理通过 |
| ILB-regex GitHub 网络文件 | 通过 | raw manifest/index 均 HTTP 200；尚未在 ST 中作为外部依赖加载 |
| ILB 变量内部存储 | 已知限制 | ILB `api.set` 写入 `extension_settings.independent_lorebook.chatStates[chatId].__vars` 并调用扩展设置持久化；这不是已证明的 ST chat metadata 变量 |
| ST EventEmitter 顺序 | 通过 | `emit()` 按注册顺序串行 await listener，异常被宿主捕获后继续 |

## Trial runtime probe

`tests/trial-runtime-probe.mjs` passed in isolated ST with ILB, ILBM and ILBR installed together:

- direct parser: `ok=true`;
- marker cleaned to `正文 `;
- one pending direct EventRecord generated;
- one state change generated;
- entity registration returned stable ID;
- state card groups `items/persons/places` present;
- temporary extension installs/profile cleaned; no formal chat data written.

## Context probe

`tests/context-network-probe.mjs` 真实 ST probe confirmed `CHAT_COMPLETION_PROMPT_READY`, `setExtensionPrompt` and `ctx.generate` are available. It did not send a model request or capture a final provider network payload, so final context visibility remains open.

## 回归测试

- `node --test tests/*.test.mjs`：55/55 通过。
- 这些测试验证当前原型不回归，不等于 v2 前置环境全部完成。

## 前置完成度

当前前置工作完成度：**基础接口/共存验证已完成，真实行为验证未完成**。

可标记为“已验证”的范围仅包括：

- ILB/ILBM/ILBR 同时加载；
- ILB 1.4 set/snapshot/remove 临时往返；
- ST chat/context 对象存在；
- setExtensionPrompt 临时注入；
- EventEmitter 串行/容错；
- prompt-ready 的源码时序；
- ILBR raw 网络文件和独立 processText。

以下项目仍是前置完成门槛，全部完成前不得进入正式 v2 功能开发：

- chat 备份/分叉/切换继承行为；
- 生命周期事件稳定身份和真实参数；
- 最终网络请求上下文；
- post API 稳定边界和超时；
- 真实手机 WebView；
- 延迟确认时序。

## 尚未完成/不能据此宣称通过

- chat 变量随真实 chat 备份、分叉、切换继承；ILB 源码显示变量位于 extension_settings 的 chatStates 桶，不能直接等同于 ST chat metadata；ST 源码显示 chat 文件加载时从 `data[0].chat_metadata` 读取元数据、通过 `saveMetadata()`/`saveMetadataDebounced()` 写回，但尚未证明 ILB 的 extension_settings 变量随同一 chat 文件复制。
- 每个 MESSAGE_* 事件的真实参数形状和稳定消息/Swipe ID；源码仅确认部分调用以楼层整数和来源字符串发出，例如 `MESSAGE_RECEIVED(index, source)`、`MESSAGE_EDITED(index)`；
- Chat Completion 最终发送上下文的实际可见范围；源码确认 `prepareOpenAIMessages()` 在 `getChat()` 后发出 `CHAT_COMPLETION_PROMPT_READY`，随后发送层继续使用生成参数，但仍需网络层 probe 捕获最终请求；
- ILB-regex 外部网络安装后的发现/调用交接；三者共存和 `ILB_SERIES.regex` 已通过，能力协商决策已记录，但 ILBM 当前仍使用自身兼容引擎，尚未把处理调用切换为外部 ILBR；
- ILB 触发条件结果传递给 ILBM；
- post OpenAI 兼容 API、API Key 边界和 3 秒超时；ST 源码已有 `custom-request.js` 和 `sendGenerationRequest`/`sendStreamingRequest`，但没有确认适合 ILBM 独立外部提取的稳定公开适配接口；
- 真实手机 WebView；
- 延迟确认的 N/N+1 消息时序。

## 清理

临时 ILBM 安装、Chrome profile 和 probe 进程已清理；没有写入用户正式聊天数据。
