import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, calculateCurrentState, createMemoryState, registerEntity, updateRecord } from '../lib/memory-model.js';
import { createMemoryStore } from '../lib/memory-store.js';

function fixture() {
  let state = createMemoryState();
  const sword = registerEntity(state, { name: '短剑', type: 'item' }); state = sword.state;
  const jia = registerEntity(state, { name: '甲', type: 'person' }); state = jia.state;
  const yi = registerEntity(state, { name: '乙', type: 'person' }); state = yi.state;
  state = addRecord(state, { id: 'r1', text: '甲持有短剑', floor: 3, status: 'valid', action: { entityId: sword.entity.id, ownerId: jia.entity.id }, entityIds: [sword.entity.id, jia.entity.id] }).state;
  return { get state() { return state; }, set state(next) { state = next; }, sword, jia, yi };
}

test('updateRecord 保留记录 ID，手动编辑直接有效并触发状态重算', () => {
  const t = fixture();
  const result = updateRecord(t.state, 'r1', { text: '乙持有短剑', action: { entityId: t.sword.id, ownerId: t.yi.id } });
  assert.equal(result.record.id, 'r1');
  assert.equal(result.record.extractionMode, 'manual');
  assert.equal(result.record.status, 'valid');
  const cards = calculateCurrentState(result.state).cards;
  assert.equal(cards.items[0].state.ownerId, t.yi.id);
  assert.equal(calculateCurrentState(result.state).recordsApplied.length, 1);
});

test('updateRecord 拒绝不存在的记录', () => {
  const t = fixture();
  assert.throws(() => updateRecord(t.state, 'missing', { text: 'x' }), /record not found/);
});

test('store.updateRecord 持久化修改', () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const store = createMemoryStore({ storage, chatId: 'edit-test' });
  const entity = store.registerEntity({ name: '短剑', tags: ['item'] });
  store.addRecord({ id: 'r1', text: '旧文本', floor: 1, action: { entityId: entity.id, status: 'intact' }, entityIds: [entity.id] });
  store.updateRecord('r1', { text: '新文本', action: { entityId: entity.id, status: 'damaged' } });
  const reloaded = createMemoryStore({ storage, chatId: 'edit-test' }).inspect();
  assert.equal(reloaded.records[0].text, '新文本');
  assert.equal(reloaded.records[0].extractionMode, 'manual');
  assert.equal(createMemoryState(reloaded).records[0].id, 'r1');
});
