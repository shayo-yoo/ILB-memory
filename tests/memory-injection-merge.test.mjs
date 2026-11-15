import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, createMemoryState, registerEntity } from '../lib/memory-model.js';
import { buildMemoryText } from '../lib/memory-injection.js';

function setup(settings = {}) {
  let state = createMemoryState({ settings: { activeWindowLayers: 2, replayLayers: 10, relationLineWidth: 3, timelineDepth: 20, ...settings } });
  const add = (name, type) => {
    const result = registerEntity(state, { name, type });
    state = result.state;
    return result.entity;
  };
  const record = (input) => {
    const result = addRecord(state, input);
    state = result.state;
    return result.record;
  };
  return { get state() { return state; }, set state(next) { state = next; }, add, record };
}

test('§2.4 合并按记录 ID 去重，事件按楼层排序', () => {
  const t = setup();
  const sword = t.add('短剑', 'item');
  const jia = t.add('甲', 'person');
  const yi = t.add('乙', 'person');
  t.state = addRecord(t.state, { id: 'r1', text: '铁匠将短剑交给甲', floor: 3, entityIds: [sword.id, jia.id] }).state;
  t.state = addRecord(t.state, { id: 'r2', text: '甲将短剑交给乙', floor: 10, entityIds: [sword.id, jia.id, yi.id] }).state;
  t.state = addRecord(t.state, { id: 'r3', text: '乙使用短剑', floor: 12, entityIds: [sword.id, yi.id] }).state;
  t.state = addRecord(t.state, { id: 'r4', text: '乙收起短剑', floor: 19, entityIds: [sword.id, yi.id] }).state;

  const result = buildMemoryText(t.state, { currentFloor: 20, mentionedEntityIds: [sword.id] });
  assert.equal(new Set(result.usedRecords).size, result.usedRecords.length, '记录 ID 不得重复');
  assert.equal((result.text.match(/第10层：/g) ?? []).length, 1, '回放与时间线重叠记录只注入一次');
  assert.ok(result.usedRecords.includes('r1'), '主节点时间线带出回放窗口前的记录');
  assert.ok(!result.usedRecords.includes('r4'), '活跃区间记录由 ST 原文提供');
});

test('关系线只注入关联实体状态摘要，不展开其历史', () => {
  const t = setup({ activeWindowLayers: 2, replayLayers: 10 });
  const sword = t.add('短剑', 'item');
  const jia = t.add('甲', 'person');
  const yi = t.add('乙', 'person');
  t.state = addRecord(t.state, { id: 'r1', text: '甲将短剑交给乙', floor: 3, action: { entityId: sword.id, ownerId: yi.id }, entityIds: [sword.id, jia.id, yi.id] }).state;
  // 甲单独发生的事件：甲被关系线带出，但该历史不得展开。
  t.state = addRecord(t.state, { id: 'r2', text: '甲独自回忆往事', floor: 4, entityIds: [jia.id] }).state;

  const result = buildMemoryText(t.state, { currentFloor: 20, mentionedEntityIds: [sword.id] });
  assert.ok(result.relationEntityIds.includes(jia.id));
  assert.ok(result.text.includes('甲：'));
  assert.ok(!result.text.includes('甲独自回忆往事'), '被触发实体不进入时间线追溯');
  assert.ok(!result.usedRecords.includes('r2'));
});

test('关系线宽度预算只保留直接相关实体', () => {
  const t = setup({ relationLineWidth: 1 });
  const sword = t.add('短剑', 'item');
  const jia = t.add('甲', 'person');
  const yi = t.add('乙', 'person');
  t.state = addRecord(t.state, { id: 'r1', text: '甲拿着短剑', floor: 3, entityIds: [sword.id, jia.id] }).state;
  t.state = addRecord(t.state, { id: 'r2', text: '乙拿着短剑', floor: 4, entityIds: [sword.id, yi.id] }).state;

  const result = buildMemoryText(t.state, { currentFloor: 20, mentionedEntityIds: [sword.id] });
  assert.equal(result.relationEntityIds.length, 1);
  assert.equal(result.injectedRelationEntityIds.length, 1);
  const shown = [result.text.includes('甲：'), result.text.includes('乙：')].filter(Boolean);
  assert.equal(shown.length, 1, '宽度预算只带出一个关联实体');
});

test('预算裁剪先砍关系线间接实体，再砍回放历史', () => {
  const t = setup({ activeWindowLayers: 2, replayLayers: 10 });
  const sword = t.add('短剑', 'item');
  const jia = t.add('甲', 'person');
  const yi = t.add('乙', 'person');
  t.state = addRecord(t.state, { id: 'r1', text: '甲拿着短剑', floor: 3, action: { entityId: sword.id, ownerId: jia.id }, entityIds: [sword.id, jia.id] }).state;
  t.state = addRecord(t.state, { id: 'r2', text: '乙拿着短剑', floor: 4, action: { entityId: sword.id, ownerId: yi.id }, entityIds: [sword.id, yi.id] }).state;
  t.state = addRecord(t.state, { id: 'h1', text: '无关历史'.repeat(10), floor: 7 }).state;
  t.state = addRecord(t.state, { id: 'h2', text: '无关历史'.repeat(10), floor: 8 }).state;

  const result = buildMemoryText(t.state, { currentFloor: 10, mentionedEntityIds: [sword.id], tokenBudget: 35 });
  assert.equal(result.truncated, true);
  assert.equal(result.injectedRelationEntityIds.length, 0, '关系线间接实体先被裁剪');
  assert.ok(result.usedRecords.includes('h2'), '回放历史仍保留在预算内');
  assert.ok(result.text.includes('【当前状态】'));
  assert.ok(result.text.includes('短剑：'));
});

test('主节点时间线与同事件分组记录不参与裁剪', () => {
  const t = setup({ activeWindowLayers: 2, replayLayers: 10 });
  const sword = t.add('短剑', 'item');
  t.state = addRecord(t.state, { id: 'p1', text: '主线'.repeat(40), floor: 3, interactionId: 'group-1', entityIds: [sword.id] }).state;
  t.state = addRecord(t.state, { id: 'p2', text: '同组'.repeat(40), floor: 4, interactionId: 'group-1' }).state;
  t.state = addRecord(t.state, { id: 'h1', text: '可裁剪历史', floor: 7 }).state;

  const result = buildMemoryText(t.state, { currentFloor: 10, mentionedEntityIds: [sword.id], tokenBudget: 10 });
  assert.ok(result.usedRecords.includes('p1'));
  assert.ok(result.usedRecords.includes('p2'));
  assert.ok(!result.usedRecords.includes('h1'));
  assert.equal(result.overBudget, true, '受保护内容超预算时不得继续裁剪');
});

test('状态推导与注入不包含当前楼层之后的事件', () => {
  const t = setup();
  const sword = t.add('短剑', 'item');
  const yi = t.add('乙', 'person');
  const bing = t.add('丙', 'person');
  t.state = addRecord(t.state, { id: 'r1', text: '乙持有短剑', floor: 5, action: { entityId: sword.id, ownerId: yi.id }, entityIds: [sword.id, yi.id] }).state;
  t.state = addRecord(t.state, { id: 'r2', text: '丙持有短剑', floor: 11, action: { entityId: sword.id, ownerId: bing.id }, entityIds: [sword.id, bing.id] }).state;

  const result = buildMemoryText(t.state, { currentFloor: 10, mentionedEntityIds: [sword.id] });
  assert.ok(result.text.includes('持有者=乙'), result.text);
  assert.ok(!result.text.includes('持有者=丙'));
  assert.ok(!result.usedRecords.includes('r2'));
});

test('mentionText 自动解析主节点', () => {
  const t = setup();
  const sword = t.add('短剑', 'item');
  const yi = t.add('乙', 'person');
  const camp = t.add('营地', 'place');
  t.state = addRecord(t.state, { id: 'r1', text: '乙将短剑放在营地', floor: 3, entityIds: [yi.id, sword.id, camp.id] }).state;

  const result = buildMemoryText(t.state, { currentFloor: 10, mentionText: '乙把短剑放在营地。' });
  assert.equal(result.mentionFiltered, true);
  assert.deepEqual(result.mainEntityIds, [yi.id, sword.id, camp.id]);
  assert.ok(result.text.includes('短剑：'));
  assert.ok(result.text.includes('乙：'));
  assert.ok(result.text.includes('营地：'));
});
