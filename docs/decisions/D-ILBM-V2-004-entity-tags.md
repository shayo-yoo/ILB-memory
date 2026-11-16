# D-ILBM-V2-004 · 实体标签化与 schema v2

- 日期：2026-11-16
- 状态：Accepted（代码级）；真实 ST 验收待完成
- 依据：`ILBMemory需求文档v2.md` §2.1、§3.1、§3.2、§9.5

## 背景

v2 早期实体只有单一 `type`（person/item/place/organization/other），无法表达“有意识武器”“会说话的地点”等多重身份；同时自动注册实体默认 `other`，导致状态卡不显示，待确认记录确认后也不会立即推导标签。

## 决策

1. **`tags[]` 是实体身份的事实来源。**
   - 受控 kind 标签：`person`、`item`、`place`、`organization`。
   - 其余标签为自由标签（如 `sentient`、`quest-item`），只作显示/扩展提示。
   - `type` 保留为兼容字段，由第一个 kind 标签派生；不再限制实体能力。

2. **状态字段按标签并集计算，按字段 key 去重。**
   - 多标签实体同时获得各 kind 的默认字段集。
   - 未知/自定义字段继续显示，不得静默丢弃。
   - 无 kind 标签、组织、自定义标签实体归入 `others` 状态卡，仍参与注入。

3. **标签只增不删。**
   - 有效记录的动作与 `stateChanges` 推导 kind 标签；pending/invalid 记录不参与。
   - 标签一旦由历史事实产生，不因后续分支作废而回退，避免已注入事实消失。

4. **迁移与备份。**
   - schema_version 升为 2；旧实体 `type` 自动转为 `tags`。
   - 备份导出 schema 2，导入兼容 schema 1；未来版本仍拒绝。

5. **手动编辑。**
   - `setEntityTags(id, tags)` 显式覆盖标签；空数组回到 `other`。
   - 标签推导是只增规则，手动清空后若历史仍能推导出 kind，会在下一次规范化时重新出现；这是“历史事实优先”的有意行为。

## 影响

- `lib/memory-model.js`：实体规范化、`getPrimaryKind`、`setEntityTags`、行为标签推导、`others` 分组。
- `lib/state-schema.js`：kind 标签、字段并集、未知字段回退。
- `lib/memory-store.js` / `index.js`：标签编辑 API。
- `ui-shell.js` / `lib/memory-view.js`：标签 chips 与编辑。
- 测试：`tests/state-cards.test.mjs`、`tests/state-schema.test.mjs`、`tests/memory-backup.test.mjs`、`tests/memory-model.test.mjs`。

## 已知限制

- 标签推导来自动作/字段启发式，不是语义理解；自定义动作不会补标签。
- 手动清空标签不能永久覆盖历史推导（见上）。
- 真实 ST 中多标签实体的布局与注入可读性待验收。
