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

## 回归测试

- `node --test tests/*.test.mjs`：55/55 通过。
- 这些测试验证当前原型不回归，不等于 v2 前置环境全部完成。

## 尚未完成/不能据此宣称通过

- chat 变量随真实 chat 备份、分叉、切换继承；
- 每个 MESSAGE_* 事件的真实参数形状和稳定消息/Swipe ID；
- Chat Completion 最终发送上下文的实际可见范围；
- ILB-regex 外部网络安装后的发现/调用交接；
- ILB 触发条件结果传递给 ILBM；
- post OpenAI 兼容 API、API Key 边界和 3 秒超时；
- 真实手机 WebView；
- 延迟确认的 N/N+1 消息时序。

## 清理

临时 ILBM 安装、Chrome profile 和 probe 进程已清理；没有写入用户正式聊天数据。
