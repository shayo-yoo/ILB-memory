# ILBM 当前项目状态

- 日期：2026-11-14
- 项目阶段：第二阶段基础 UI/诊断、手动记忆存储、实体注册、事件记录、状态重算和回放窗口已完成；AI 事件提取、关联补充和完整历史 UI 仍未实现。
- 版本：ILBM `0.1.0`；ILBR API `1.0.0`。
- Git：已创建本地 Git 仓库；基线提交 `256d39f`，调试 UI 提交 `82b9011`，手动记忆/状态提交 `8f26855`；工作区当前干净。
- 最终自动验证：`node --test tests/*.test.mjs` 23/23；入口、库与 probe 脚本语法检查通过；manifest JSON 有效；真实 ST synthetic probe 和调试 UI probe 均通过。
- ST 测试安装和隔离 CDP profile 已清理；备份保留。

## 已完成

- 建立独立 ILBM ST 扩展骨架（manifest + ESM entry），不修改 ST 本体、官方 Regex 或 ILB Core。
- ILBR 同步、按需的正则文本引擎：规则调用方传入、结果返回原文/输出/匹配捕获/逐规则错误；有输入、规则数与 pattern 长度上限；单条坏规则跳过，不抛进聊天路径。
- ILBM 标记 bridge：支持 `(((ILBM)))`，返回 `original / triggered / displayText / promptText / extractionText / matches / errors`。
- ST display filter：用 `messageFormatter.addHook(BEFORE_REGEX)` 对渲染副本去标记，不改 chat 数组。
- Chat Completion prompt hook：用 `CHAT_COMPLETION_PROMPT_READY` 处理 ChatCompletion 的扁平副本；ST EventEmitter 串行 await listeners，函数在该同一副本返回请求前变换内容。仅 assistant 标记会调用 `onMarked`；每轮历史中重复出现的旧 assistant 消息仍可能重复回调，需后续结合已验证的稳定 message/swipe ID 实现持久幂等。
- 通用字符串 prompt 适配：`GENERATE_AFTER_DATA` 处理 `prompt` 或 `input`，不改其它字段。
- synthetic 真实 ST probe：formatter 隐藏、prompt-ready 隐藏、generate-data 隐藏、原始消息对象不改、sentinel 保留，全部通过。
- 多模态 content：仅支持单一 text block；有 image/tool/audio 等非文本部分时完全不改，避免破坏数据结构。
- dryRun：过滤可用于 prompt 预览，但不调用 onMarked 记忆回调。
- ILBM API 与 ILBR API 公开为 `window.ILBM` / `window.ILB_SERIES.memory`；未写入 `window.ILB`。

## 未完成 / 人工验收

- 尚无主动 AI 调用和实体语义解析、回放注入或关联补充；已实现可注入的 AI 提取适配器（默认关闭/超时失败）、AI 候选响应 JSON 解析、候选事件预览/确认导入、候选事件校验/部分接受、实体注册、事件存储、状态重算、回放和 MESSAGE_* 失效适配。
- 已新增可视化调试面板：页面右下角 `ILBM` 按钮，可输入文本测试标记处理、添加/删除实体与事件、查看记忆状态、当前状态重算和回放窗口；支持从楼层作废后续记录、按 source message/swipe 保留指定分支；支持修改活跃窗口层数与回放窗口层数；新增可读中文当前状态/回放视图，同时保留原始 JSON。
- 没有发送真实模型请求；需要人工确认用户界面回复和实际模型上下文都看不到标记。
- Classic Completion 与其它 backend 的 `GENERATE_AFTER_DATA` payload 结构需在实际使用 backend 上确认；当前只处理 `prompt`/`input` string。
- 真实编辑、删除、重新生成、swipe 分支后的记录有效性尚未做人工 UI 验收。
- ST `MESSAGE_*` event 参数语义尚未形成正式 ILBM listener/持久化，因此不能声称编辑/branch pipeline 已实现。
- ILB 在 ST third-party 目录未安装，未验证 ILB_SERIES 与真实 ILB 联动；ILBM 当前独立运行。
