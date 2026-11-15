# ILBM 当前项目状态

- 日期：2026-11-16
- 版本：ILBM `0.4.0`（`index.js` / `manifest.json`）；ILBR API `1.0.0`。
- 项目阶段：v2 阶段六（关系线补充）代码级完成；阶段七/八与真实环境验收未完成。
- 自动验证：`node --test tests/*.test.mjs` **98/98**；CDP-free 代码级验证 `tests/lightweight-verification.mjs` 退出码 0。
- Git：本地仓库 + `https://github.com/shayo-yoo/ILB-memory.git`；当前工作区在每次变更后提交，避免不可回滚的混合修改。
- 环境级验证仍受阻：ST 运行于 `http://127.0.0.1:8001`，CDP 端口 9222/9227 未开放，无法捕获最终 provider payload。

## 本阶段已完成（0.4.0）

- **主节点提及识别**：`lib/mention-resolver.js` 纯文本识别实体短名/别名；按文本位置排序、同位最长匹配；`lib/memory-retrieval.js` 支持显式 ID/短名或 `mentionText`。
- **关系线补充（§2.3）**：`collectRelationLine()` 从主节点的一跳候选实体中只返回当前状态摘要；按“直接同事件 → 同互动/同楼层 → 实时入度”排序；默认宽度 3，可配置。
- **主节点时间线**：`retrieveMainNodeTimeline()` 向过去追溯被提及实体的记录，受 `timelineDepth`（默认 20 条）限制；活跃区间不重复注入；不含未来楼层。
- **合并与去重（§2.4）**：`buildMemoryText()` 合并当前状态、回放、主节点时间线、同互动记录；记录按 ID 去重，状态卡按实体 ID 去重，事件按 `(楼层, 楼内序号)` 排序。
- **预算裁剪**：先砍关系线间接实体，再砍最早的非保护回放记录；主节点时间线与同事件分组记录受保护；受保护内容超预算时返回 `overBudget`，不静默丢失。
- **状态卡可读输出**：三类卡始终输出 §2.1 最小字段集；未知值显示 `未知`，不推断为事实。
- **运行时注入**：`memoryInjector` 生成文本时使用当前聊天最后一条用户消息作为提及文本、当前楼层作为时间上界；注入仍默认关闭、需手动应用（D-ILBM-011）。
- **新增 API**：`window.ILBM_MEMORY.previewCurrentTurn(options)`；`buildMemoryText()` 新增 `mentionText / relationLine / relationLineWidth / timelineDepth / activeWindowLayers / replayLayers` 选项。
- **设置项**：`relationLineWidth`（默认 3）、`timelineDepth`（默认 20）。可通过 `setSettings` 修改；可视化入口尚未接入。

## 未完成 / 待真实验收

- **阶段七**：延迟确认已实现 helper 和 MESSAGE_RECEIVED 调用，但真实编辑/删除/重新生成/Swipe 分支后的有效性未做人工 UI 验收；`MESSAGE_*` 稳定参数仍按宽容降级处理。
- **阶段八**：事件列表/实体列表/详情页/设置页尚未在正式 shell 完整实现；当前 `ui-shell.js` 只有基础调试入口，且尚未提供 `relationLineWidth`、`timelineDepth`、提取模式/API 配置的可视化控件。
- **提取**：模式 A 直出已接入；模式 B 事后 OpenAI 兼容 API、3 秒超时和晚到结果规则仍未实现（GAP-008）。
- **指针**：关系线按同实体/同互动/同楼层实时推导，未持久化指针；入度查询时计算。需确认需求是否要求落库（ADR D-ILBM-V2-003）。
- **时间线深度语义**：当前按“最近 N 条记录”解释，需求未给单位，需真实对话实验验证（GAP-011）。
- **存储继承**：ILB chat 变量备份/分叉/切换行为未验证（GAP-001）。
- **上下文可见范围**：真实 provider payload 未捕获，活跃窗口排除仅为代码级约束（GAP-007）。
- **真实模型/手机**：未发送真实模型请求；真实手机 WebView、主题覆盖相关问题（BUG-003/004/005/006）待验收。
- **ILB/ILBR 协作**：外部 ILB-regex 优先调用尚未切换；ILB 触发条件复用未验证（GAP-009/010）。

## 建议下一步

1. 在真实 ST 聊天中按 `docs/MANUAL_ACCEPTANCE.md` 走一遍：提及短剑 → 检查主节点时间线、甲/乙状态摘要、活跃区间不重复、预算裁剪。
2. 接入阶段八最小 UI：事件列表（楼层/序号/实体/动作/模式）、实体列表、详情、关系线宽度与时间线深度设置。
3. 实现/验证模式 B 事后提取与 3 秒超时（GAP-008），保持“失败不阻塞聊天”。
4. 关闭前置闸门后再扩大功能面；不得在未验证接口上假设能力存在（§8）。
