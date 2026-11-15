import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemoryText } from '../lib/memory-injection.js';
import { addRecord, createMemoryState, registerEntity } from '../lib/memory-model.js';

function caseState() {
  let state = createMemoryState({ settings: { activeWindowLayers: 2, replayLayers: 10 } });
  const reg = (name, type) => {
    const result = registerEntity(state, { name, type });
    state = result.state;
    return result.entity;
  };
  const sword = reg('短剑', 'item');
  const jia = reg('甲', 'person');
  const yi = reg('乙', 'person');
  const camp = reg('营地', 'place');
  state = addRecord(state, { id: 'r1', text: '铁匠将短剑交给甲', floor: 3, action: { entityId: sword.id, ownerId: jia.id } }).state;
  state = addRecord(state, { id: 'r2', text: '甲将短剑交给乙', floor: 10, action: { entityId: sword.id, ownerId: yi.id, locationId: camp.id } }).state;
  return { state, sword, jia, yi, camp };
}

test('状态卡按需注入：只注入本轮提及的实体', () => {
  const c = caseState();
  const result = buildMemoryText(c.state, { currentFloor: 15, mentionedEntityIds: [c.sword.id] });
  assert.equal(result.mentionFiltered, true);
  assert.deepEqual(result.injectedEntityIds, [c.sword.id]);
  assert.ok(result.text.includes('短剑：'));
  assert.ok(result.text.includes('持有者=乙'), result.text);
  assert.ok(!result.text.includes('营地：'), '未提及的实体不应注入状态卡');
});

test('未提供提及实体时保持全量注入（兼容人工预览）', () => {
  const c = caseState();
  const result = buildMemoryText(c.state, { currentFloor: 15 });
  assert.equal(result.mentionFiltered, false);
  assert.equal(result.injectedEntityIds.length, 4);
  assert.ok(result.text.includes('短剑：'));
  assert.ok(result.text.includes('营地：'));
});

test('按名称提及同样生效，且状态卡使用中文标签', () => {
  const c = caseState();
  const result = buildMemoryText(c.state, { currentFloor: 15, mentionedEntityIds: ['营地'] });
  assert.deepEqual(result.injectedEntityIds, [c.camp.id]);
  assert.ok(result.text.includes('营地：'));
  assert.ok(!result.text.includes('短剑：'));
});

test('预算裁剪保留当前状态并丢弃最早历史', () => {
  let state = createMemoryState({ settings: { activeWindowLayers: 1, replayLayers: 30 } });
  const sword = registerEntity(state, { name: '短剑', type: 'item' }); state = sword.state;
  state = addRecord(state, { id: 's1', text: '持有', floor: 2, action: { entityId: sword.entity.id, ownerId: '乙' } }).state;
  for (let i = 1; i <= 20; i += 1) state = addRecord(state, { id: `h${i}`, text: `历史${i}`.repeat(20), floor: i + 2 }).state;
  const result = buildMemoryText(state, { currentFloor: 25, tokenBudget: 40 });
  assert.equal(result.truncated, true);
  assert.ok(result.text.includes('【当前状态】'), '当前状态不得被裁剪');
  assert.ok(result.text.includes('持有者=乙'));
});
