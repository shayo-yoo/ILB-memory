# D-ILBM-V2-005 · 有向关系边与角色标签

- 日期：2026-11-17
- 状态：Accepted（代码级）；真实 ST 验收待完成
- 依据：`ILBMemory需求文档v2.md` §2.1、§5.3、§9.4

## 背景

旧实现把关系存成 `{ targetId, type: 'ALLY' }`，并默认视为双向；这无法表达主仆、夫妻、看守/俘虏、宠物/主人等双方称呼不同的关系，也会把单一 bidirectional 推断当成事实。

## 决策

1. **关系是有向边：`fromId → toId: type（role）`。**
   - 状态仍挂在源实体的 `state.relations[]` 上，每条为 `{ fromId, toId, type, role, establishedAt }`。
   - `toId` 是新字段；读取层同时兼容旧 `targetId`。

2. **关系类型注册表。**
   - 对称：朋友、敌人、盟友、家人、恋人。
   - 不对称：主仆（主人/仆人）、夫妻（丈夫/妻子）、亲子（父母/子女）、俘虏（看守/俘虏）、主宠（主人/宠物）。
   - 未知词作为自定义关系（类型与角色都使用该词），不自动双向。

3. **标记语法。**
   - 动作仍是 `建立关系` / `解除关系`；实体按“主动方、被动方”排列。
   - 尾部描述解析角色：`主仆:主人` 显式写法可消除“主人”在主仆/主宠间的歧义。
   - 不对称关系必须写两条标记；程序不推断反向角色。
   - 对称关系允许写一条，程序补反向边；重复写入按 `(toId, type)` 去重。
   - 解除关系未写角色时移除该目标上的全部关系；写了类型/角色时只移除匹配边。

4. **关系显示。**
   - 状态卡：`当前有效关系=对乙：主人`。
   - 叙事注入：`甲是乙的主人`。
   - 事件列表动作列：`建立关系（主人）`。

## 影响

- 新增 `lib/relation-model.js`（纯函数：解析、标签、句子、匹配）。
- `lib/action-state.js`：关系动作读取标记尾部描述。
- `lib/memory-model.js`：`applyRelationChange` 有向边、对称镜像、解除匹配。
- `lib/state-schema.js`、`lib/memory-retrieval.js`、`lib/memory-view.js`、`lib/injection-format.js`：显示与关系线目标识别。
- 测试：`tests/relation-model.test.mjs`、`tests/relation-line.test.mjs`、`tests/injection-style.test.mjs`、`tests/state-cards.test.mjs`。

## 已知限制

- 角色描述只解析标记尾部第一个可识别词；复杂自然语言仍需模型按提示词输出规范角色。
- 关系强度、语义指针、关系结束时间未实现。
- 对称关系补反向边是派生行为，不写两条记录；导出/备份只保存记录，重新计算即可恢复。
