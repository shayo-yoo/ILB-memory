# D-ILBM-V2-002：存储适配器隔离与渐进迁移

- 日期：2026-11-15
- 状态：Accepted
- v2 第一项正式开发基础。

## 决策

记忆业务层不直接依赖 localStorage 或 ILB API，而依赖 `MemoryStorage` 接口：

- `read()`
- `write(memory)`
- `remove()`

实现层提供：

1. ILB storage backend：优先使用 `ILB.api.set/snapshot/remove`；
2. legacy backend：保留现有 localStorage 作为兼容回退；
3. 后续可添加 ST chat metadata backend，不改业务层。

## 统一数据边界

- `memory-schema.js` 负责 schemaVersion、envelope、状态和提取模式；
- `event-record.js` 负责 v2 EventRecord 字段归一化；
- store 通过适配器读写，不直接知道后端实现细节；
- 本轮只建立适配器和契约，暂不替换现有 memory-store，避免未完成迁移造成数据损失。
