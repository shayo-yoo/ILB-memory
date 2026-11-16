import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, createMemoryState, registerEntity } from '../lib/memory-model.js';
import {
  collectRelationLine,
  getRecordEntityIds,
  resolveMainEntityIds,
  retrieveInteractionGroup,
  retrieveMainNodeTimeline,
} from '../lib/memory-retrieval.js';

function buildCase() {
  let state = createMemoryState({ settings: { activeWindowLayers: 5, replayLayers: 10, relationLineWidth: 3, timelineDepth: 20 } });
  const add = (name, type) => {
    const result = registerEntity(state, { name, type });
    state = result.state;
    return result.entity;
  };
  const sword = add('短剑', 'item');
  const smith = add('铁匠', 'person');
  const jia = add('甲', 'person');
  const yi = add('乙', 'person');
  const camp = add('营地', 'place');
  const bing = add('丙', 'person');

  const record = (input) => { state = addRecord(state, input).state; };
  record({ id: 'r1', text: '铁匠将短剑交给甲', floor: 3, interactionId: 'i1', entityIds: [smith.id, sword.id, jia.id] });
  record({ id: 'r2', text: '甲使用短剑与敌人交战', floor: 7, entityIds: [jia.id, sword.id] });
  record({ id: 'r3', text: '甲将短剑交给乙', floor: 10, interactionId: 'i2', entityIds: [jia.id, sword.id, yi.id] });
  record({ id: 'r4', text: '乙使用短剑击败敌人', floor: 15, entityIds: [yi.id, sword.id] });
  record({ id: 'r5', text: '乙将短剑放在营地', floor: 20, entityIds: [yi.id, sword.id, camp.id] });
  // 同 interactionId 但不含主节点的记录：用于验证同组保护与关系线优先级。
  record({ id: 'r6', text: '铁匠整理铺子', floor: 4, interactionId: 'i1', entityIds: [smith.id] });
  // 与主节点无关的丙，只与甲同楼层：不得进入主节点时间线。
  record({ id: 'r7', text: '甲遇见丙', floor: 12, entityIds: [jia.id, bing.id] });
  // 活跃区间内的记录（currentFloor=30, activeWindow=5 -> [26,30]）不得回放/追溯。
  record({ id: 'r8', text: '乙在营地擦拭短剑', floor: 27, entityIds: [yi.id, sword.id, camp.id] });
  // 待确认记录不参与检索。
  record({ id: 'r9', text: '短剑被偷走（待确认）', floor: 13, status: 'pending', entityIds: [sword.id] });

  return { get state() { return state; }, sword, smith, jia, yi, camp, bing };
}

test('getRecordEntityIds 合并 entityIds、action 与 stateChanges 引用', () => {
  const ids = getRecordEntityIds({
    entityIds: ['a'],
    action: { entityId: 'b', ownerId: 'c', locationId: 'd', relation: { targetId: 'e' } },
    stateChanges: [{ entityId: 'f', before: 'g', after: 'h' }, { entityId: 'i', field: 'relations', after: { toId: 'j' } }],
  });
  assert.deepEqual(new Set(ids), new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']));
});

test('resolveMainEntityIds 支持 ID、短名与文本提及', () => {
  const c = buildCase();
  assert.deepEqual(resolveMainEntityIds(c.state, { mentionedEntityIds: [c.sword.id] }), [c.sword.id]);
  assert.deepEqual(resolveMainEntityIds(c.state, { mentionedEntityIds: ['短剑'] }), [c.sword.id]);
  assert.deepEqual(resolveMainEntityIds(c.state, { mentionText: '乙把短剑放在营地' }), [c.yi.id, c.sword.id, c.camp.id]);
});

test('关系线只带出一跳实体，并按直接相关与入度排序', () => {
  const c = buildCase();
  const result = collectRelationLine(c.state, { mainEntityIds: [c.sword.id], currentFloor: 30, maxEntities: 3 });
  assert.equal(result.entities.length, 3);
  const ids = result.entities.map((entity) => entity.entityId);
  assert.ok(ids.includes(c.jia.id), '甲与短剑直接同事件');
  assert.ok(ids.includes(c.yi.id), '乙与短剑直接同事件');
  // 乙参与主节点记录最多（含活跃区间前的第27层），应排在铁匠/营地之前。
  assert.ok(result.candidates[0].directCount >= 3);
  assert.equal(result.entities[0].inDegree >= result.candidates.at(-1).inDegree, true);
  assert.ok(result.excludedCount >= 1);
});

test('关系线通过有向关系边 toId 带出目标实体', () => {
  let state = createMemoryState({ settings: { relationLineWidth: 3 } });
  const jia = registerEntity(state, { name: '甲', type: 'person' }); state = jia.state;
  const yi = registerEntity(state, { name: '乙', type: 'person' }); state = yi.state;
  state = addRecord(state, {
    id: 'rel1', text: '甲与乙结盟', floor: 3, status: 'valid', action: '建立关系',
    entityIds: [jia.entity.id],
    stateChanges: [{ entityId: jia.entity.id, field: 'relations', after: { toId: yi.entity.id, type: 'ALLY', role: '盟友', active: true } }],
  }).state;
  const relation = collectRelationLine(state, { mainEntityIds: [jia.entity.id], currentFloor: 5 });
  assert.ok(relation.entities.some((entity) => entity.entityId === yi.entity.id));
});

test('关系线宽度为 0 时不带出任何实体', () => {
  const c = buildCase();
  const result = collectRelationLine(c.state, { mainEntityIds: [c.sword.id], currentFloor: 30, maxEntities: 0 });
  assert.deepEqual(result.entities, []);
});

test('关系线不继续追溯被触发实体，也不包含待确认记录', () => {
  const c = buildCase();
  const relation = collectRelationLine(c.state, { mainEntityIds: [c.sword.id], currentFloor: 30, maxEntities: 5 });
  const triggered = new Set(relation.entities.map((entity) => entity.entityId));
  assert.ok(triggered.has(c.jia.id));

  // 甲与丙的记录只涉及甲，不涉及短剑，不应进入主节点时间线。
  const timeline = retrieveMainNodeTimeline(c.state, { mainEntityIds: [c.sword.id], currentFloor: 30 });
  assert.ok(!timeline.some((record) => record.id === 'r7'));
  assert.ok(!timeline.some((record) => record.id === 'r9'), '待确认记录不参与检索');
  for (const record of timeline) {
    assert.ok(getRecordEntityIds(record).includes(c.sword.id), '主节点时间线只包含涉及主节点的记录');
  }
});

test('主节点时间线排除活跃区间并按深度截断', () => {
  const c = buildCase();
  const all = retrieveMainNodeTimeline(c.state, { mainEntityIds: [c.sword.id], currentFloor: 30 });
  assert.ok(!all.some((record) => record.id === 'r8'), '活跃区间记录由 ST 原文提供');
  assert.deepEqual(all.map((record) => record.id), ['r1', 'r2', 'r3', 'r4', 'r5']);

  const shallow = retrieveMainNodeTimeline(c.state, { mainEntityIds: [c.sword.id], currentFloor: 30, maxRecords: 2 });
  assert.deepEqual(shallow.map((record) => record.id), ['r4', 'r5']);
});

test('同事件分组检索只返回共享 interactionId 的记录', () => {
  const c = buildCase();
  const group = retrieveInteractionGroup(c.state, { seedRecords: [{ interactionId: 'i1' }], currentFloor: 30 });
  assert.deepEqual(group.map((record) => record.id), ['r1', 'r6']);
});
