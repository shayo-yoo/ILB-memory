# LEGACY-BASELINE

- 日期：2026-11-14
- 工作区：`D:\DSH\ILB-Memory`
- 基线：仅有用户提供的 `ILBMemory需求文档.md`，目录不是 Git 仓库；没有代码提交历史。
- 已确认技术/宿主：SillyTavern ESM 第三方扩展；当前本机 ST 源码在 `D:\1\APP\SillyTavern`。
- 既定上游：ILB 独立项目在 `D:\文档\1\DSH\ILB`，对外 API 当前源码版本 1.4；本周期不预设需要修改该 API。
- 未知项：WebUI 安装是否对应此源码；其它 completion backend 是否发相同 prompt-ready 事件；Chat Completion 事件载荷中可能存在的多模态数据如何保真。
- 本记录不声称审核历史提交；此前无仓库历史。
- 第一周期测试时将 ILBM 临时安装到 ST third-party 目录，验证后已移除；覆盖前副本保留在 `backup/ILBM-ST-install-before-probe-update`。ST 与隔离 Chrome 已停止，CDP profile 已清理。
