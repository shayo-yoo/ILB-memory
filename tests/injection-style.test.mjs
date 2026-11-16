import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, createMemoryState, registerEntity } from '../lib/memory-model.js';
import { deriveStateChanges } from '../lib/action-state.js';
import { buildMemoryText } from '../lib/memory-injection.js';

function setup() {
  let state = createMemoryState({ settings: { activeWindowLayers: 2, replayLayers: 20, relationLineWidth: 3, timelineDepth: 20 } });
  const add = (name, type) => { const result = registerEntity(state, { name, type }); state = result.state; return result.entity; };
  const record = (input) => { const result = addRecord(state, input); state = result.state; return result.record; };
  const smith = add('铁匠', 'person');
  const sword = add('短剑', 'item');
  const jia = add('甲', 'person');
  const yi = add('乙', 'person');
  const camp = add('营地', 'place');
  record({ id: 'r1', text: '铁匠将短剑交给甲', floor: 3, action: '转移', status: 'valid', entityIds: [smith.id, sword.id, jia.id], stateChanges: deriveStateChanges('转移', [smith.id, sword.id, jia.id]) });
  record({ id: 'r2', text: '甲将短剑交给乙', floor: 10, action: '转移', status: 'valid', entityIds: [jia.id, sword.id, yi.id], stateChanges: deriveStateChanges('转移', [jia.id, sword.id, yi.id]) });
  record({ id: 'r3', text: '乙将短剑放在营地', floor: 20, action: '移动', status: 'valid', entityIds: [sword.id, camp.id], stateChanges: deriveStateChanges('移动', [sword.id, camp.id]) });
  return { get state() { return state; }, smith, sword, jia, yi, camp };
}

test('narrative 风格把状态卡改写成自然句，不使用字段=值结构', () => {
  const t = setup();
  const result = buildMemoryText(t.state, { currentFloor: 30, mentionedEntityIds: [t.sword.id], style: 'narrative' });
  assert.equal(result.style, 'narrative');
  assert.match(result.text, /短剑当前由乙持有/);
  assert.match(result.text, /短剑位于营地/);
  assert.match(result.text, /短剑的状态未知/);
  assert.ok(!result.text.includes('持有者='), result.text);
});

test('narrative 风格用动词模板生成历史句，且不泄漏标记或 JSON', () => {
  const t = setup();
  const result = buildMemoryText(t.state, { currentFloor: 30, mentionedEntityIds: [t.sword.id], style: 'narrative' });
  assert.match(result.text, /第3层：铁匠将短剑交给甲/);
  assert.match(result.text, /第10层：甲将短剑交给乙/);
  assert.match(result.text, /第20层：短剑移动到营地/);
  assert.ok(!result.text.includes('[entity:'));
  assert.ok(!result.text.includes('{"'));
  assert.ok(!result.text.includes('stateChanges'));
});

test('compact 风格保持字段=值与原文回放（默认）', () => {
  const t = setup();
  const result = buildMemoryText(t.state, { currentFloor: 30, mentionedEntityIds: [t.sword.id] });
  assert.equal(result.style, 'compact');
  assert.match(result.text, /【当前状态】/);
  assert.match(result.text, /短剑：持有者=乙/);
  assert.match(result.text, /第3层：铁匠将短剑交给甲/);
});

test('narrative 风格显示有向关系角色', () => {
  let state = createMemoryState({ settings: { activeWindowLayers: 2, replayLayers: 20 } });
  const jia = registerEntity(state, { name: '甲', type: 'person' }); state = jia.state;
  const yi = registerEntity(state, { name: '乙', type: 'person' }); state = yi.state;
  state = addRecord(state, {
    id: 'rel1', text: '甲成为乙的主人', floor: 1, status: 'valid',
    entityIds: [jia.entity.id, yi.entity.id],
    stateChanges: deriveStateChanges('建立关系', [jia.entity.id, yi.entity.id], { description: '主人' }),
  }).state;
  const result = buildMemoryText(state, { currentFloor: 5, mentionedEntityIds: [jia.entity.id], style: 'narrative' });
  assert.match(result.text, /甲是乙的主人/);
  assert.ok(!result.text.includes('当前有效关系='));
});

test('状态卡的未知字段在 narrative 中仍然出现', () => {
  const state = createMemoryState({ settings: { activeWindowLayers: 2, replayLayers: 0 } });
  const sword = registerEntity(state, { name: '有意识短剑', tags: ['item', 'sentient'] }).state;
  const text = buildMemoryText({
    ...sword,
    records: [{ id: 'x', text: '短剑有情绪', floor: 1, sequence: 1, status: 'valid', valid: true, stateChanges: [{ entityId: sword.entities[0].id, field: 'mood', after: '警惕' }], entityIds: [sword.entities[0].id] }],
  }, { currentFloor: 5, mentionedEntityIds: [sword.entities[0].id], style: 'narrative' });
  assert.match(text.text, /警惕/);
});
