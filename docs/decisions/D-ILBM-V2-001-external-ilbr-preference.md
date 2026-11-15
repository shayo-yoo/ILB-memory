# D-ILBM-V2-001：v2 优先使用外部 ILBR

- 日期：2026-11-15
- 状态：Accepted（契约决策，不代表已实现）
- 依据：`ILBMemory需求文档v2.md` 第 1.3、5.3、7、8 章；三者共存探针 `tests/ilbr-st-probe.mjs`。

## 决策

ILBM v2 的标记识别与过滤优先调用外部 `window.ILBR` 或 `window.ILB_SERIES.regex`。ILBM 不持有独立的通用正则规则存储。

能力协商顺序：

1. `window.ILB_SERIES.regex` 且 `id === 'ILBR'`；
2. `window.ILBR` 且 `id === 'ILBR'`；
3. 兼容内置引擎仅作为临时降级诊断，不作为 v2 正式依赖路径。

## 约束

- 外部服务缺失时，普通聊天继续；ILBM 记录 `ILBR unavailable` 的可读诊断。
- 外部服务版本/API 不满足时，不静默猜测；进入降级路径并记录能力状态。
- ILBM 业务模块不得直接修改 ILBR 内部规则或存储。
- 该决策不改变当前代码，待 v2 阶段一前置验证全部完成后实施适配。

## 证据

- `docs/V2_PREFLIGHT_RESULTS.md`：ILB/ILBM/ILBR 同时加载，`ILB_SERIES.regex` 和 `ILB_SERIES.memory` 共存，ILBR `processText` 通过。
