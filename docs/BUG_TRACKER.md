# ILBM BUG / 问题追踪

> 用复选框维护。未验证的问题不能标记为已修复；需求差距、环境阻塞和设计澄清也在此记录。每次修复需关联 Git commit 和测试证据。

## 当前未关闭问题

- [ ] **BUG-001** 双重设置入口/旧面板残留风险
  - 现象：历史版本曾出现两个 ILBM 折叠入口、两个面板状态不同。
  - 当前状态：代码已改为单一入口、新 shell 不再挂载旧业务面板；需要真实 ST 更新安装后确认旧 DOM 是否清理。
  - 验收：页面只存在一个 `#ilbm-settings-entry`、一个 `#ilbm-shell`。
  - 关联：`3ea5204`、`c34b7fd`。

- [ ] **BUG-002** 旧版面板关闭状态残留
  - 现象：旧 dialog/section 自动展开或 X 无法关闭。
  - 当前状态：新 shell 有独立 close 状态机；旧 DOM 清理和真实移动 WebView 仍需验收。
  - 验收：启动默认关闭，点击打开后 X 可关闭，关闭后 `hidden=true/open=false/display=none`。
  - 关联：`436de14`、`05241cc`、`3ea5204`。

- [ ] **BUG-003** ST 主题覆盖导致白底白字
  - 现象：按钮背景被主题覆盖，文字不可读。
  - 当前状态：新 shell 使用内联高对比样式；需真实 PC/手机主题验收。
  - 验收：按钮文字与背景对比清晰，hover/active/focus 可见。
  - 关联：`39d52b5`、`3ea5204`。

- [ ] **BUG-004** 手机真实 WebView 行为未验证
  - 本轮增加 mobile max-width/overflow-x 保护；真实设备仍需验收。
  - 现象：桌面移动视口已通过，但真实手机端曾出现入口和关闭异常。
  - 当前状态：待真实设备验收。
  - 验收：手机设置入口、全屏 dialog、关闭、返回键均通过。

- [ ] **BUG-005** PC shell 标题栏布局异常
  - 宽度/几何修复已推送到 `612c80e`；本轮继续增加 root/body max-width 和横向溢出保护，待真实可见主题确认。
  - 修复方案：shell root/header/body 使用独立强制几何规则，header 横向排列、body block；探针确认 `display:flex`/`flex-direction:row`，但 headless 布局尺寸为 0，需真实可见 PC 主题人工确认。
  - 版本：0.1.2；commit `612c80e`。
  - 现象：标题未保持在管理面板标题栏，关闭按钮随之错位。
  - 当前状态：待复现和修复；需要在 PC ST 主题下检查 shell header 的 flex/grid 覆盖。
  - 验收：标题在标题栏左侧、关闭按钮在右侧同一行，面板主体从下一行开始。

- [ ] **BUG-006** 扩展设置入口按钮白底白字
  - 修复方案：设置卡片和入口按钮使用局部内联高对比样式；探针确认背景 `rgb(45,72,100)`、文字 `rgb(255,255,255)`，待真实手机/主题人工确认。
  - 现象：ILBM 折叠菜单展开后的入口按钮被主题渲染为白底，文字不可读。
  - 当前状态：待修复；需要对 `#ilbm-settings-entry` 下按钮做局部高对比样式，不依赖 shell 样式。
  - 验收：按钮背景、文字、hover/focus 在当前 ST 主题下均清晰。

## v2 需求差距（不是传统运行时 BUG，但必须跟踪）

- [ ] **GAP-001** 记忆存储仍以 localStorage 为主，未迁移至 `window.ILB.api.set/get`。
  - 已新增适配器并接入 memory-store：ILB backend 优先、legacy fallback；真实 chat 继承仍未验证。
  - 已验证：ILB 1.4 的 `set/snapshot/remove` 临时往返成功；源码显示落点为 `extension_settings.independent_lorebook.chatStates[chatId].__vars`，未验证真实 chat 备份/分叉/切换继承，且不能直接等同 ST chat metadata。
  - 前置动作：先完成 `docs/V2_INTERFACE_CONTRACT.md` 中 ILB `set/snapshot` 真实联动探针，再设计迁移。
- [ ] **GAP-002** 未实现 `direct/post/manual` 统一提取模式和记录字段。
- [ ] **GAP-003** 未实现 v2 `[entity:...]` 内联标记解析、动作白名单和实体绑定。
  - 已完成基础 parser：可提取 entity/action、清理正文并输出 pending EventRecord；实体 ID 绑定和完整语义拆分仍未完成。
- [ ] **GAP-004** 未实现待确认→有效的第 N+1 层延迟确认机制。
  - 已完成基础 lifecycle helper：上一楼层 pending 可确认，非选中 Swipe pending 可作废；尚未接入 ST 消息时序监听。
- [ ] **GAP-005** 当前状态尚未完整覆盖物品/角色/地点三类 MVP 状态卡。
- [ ] **GAP-006** 未实现一跳关系线补充、宽度预算和入度排序。
- [ ] **GAP-007** 未完成 ST 实际上下文可见范围和活跃窗口排除验证。
  - 当前基础能力：ST `setExtensionPrompt`、`CHAT_COMPLETION_PROMPT_READY` 和 `ctx.generate` 均可用；未发送真实模型请求或捕获最终 provider payload。
- [ ] **GAP-008** 未实现真实 post OpenAI 兼容 API、3 秒超时和晚到结果规则。
- [ ] **GAP-009** ILB 触发条件复用尚未形成验证证据。
- [ ] **GAP-010** 外部 ILB-regex 协作接口尚未在网络安装形态验证。
  - 网络 raw manifest/index 已 HTTP 200；三者同时安装时 ST 加载和 `ILB_SERIES.regex` 已通过；外部优先/兼容降级决策已记录，ILBM 尚未切换为调用外部 ILBR。

## 已关闭问题

- [x] **BUG-000** 本地 Git 仓库和远程 GitHub 仓库缺失 —— 已建立并推送 ILBM/ILBR。
- [x] **BUG-010** ILBM 设置页入口 `panel.root` undefined —— `f1692ec`，ILBM 51/51。
- [x] **BUG-011** ILBM 设置面板被宿主 CSS 隐藏 —— `cef8953`/`cebe1e6`，真实 ST probe 通过。
- [x] **BUG-012** ILB 关闭时 aria-hidden 焦点警告 —— `7360cb3`，ILB 402/402。

## 前置完成门槛

以下条目全部关闭前，禁止将项目状态改为“进入 v2 功能开发”：

- [ ] GAP-001 chat 变量备份/分叉/切换行为
- [ ] GAP-004 延迟确认时序
- [ ] GAP-007 最终上下文可见范围
- [ ] GAP-008 post API 与超时边界
- [ ] BUG-004 真实手机 WebView
- [ ] 稳定 message/Swipe 身份与完整 MESSAGE_* 参数

## 记录规则

1. 新问题先勾选 `[ ]`，不得直接写成已修复。
2. 修复必须记录 commit、测试命令和真实验收结果。
3. “已实现但未真实验证”保持未关闭。
4. v2 文档变化优先更新审计报告，再决定是否进入开发。
