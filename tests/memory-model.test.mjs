import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, calculateCurrentState, createMemoryState, registerEntity, replayRecords } from '../lib/memory-model.js';
import { createMemoryStore } from '../lib/memory-store.js';

test('entity names collide safely and IDs remain stable', () => {
  let state = createMemoryState();
  const first = registerEntity(state, { name: '短剑', type: 'item' }); state = first.state;
  const second = registerEntity(state, { name: '短剑', type: 'item' }); state = second.state;
  assert.equal(first.entity.name, '短剑');
  assert.equal(second.entity.name, '短剑02');
  assert.notEqual(first.entity.id, second.entity.id);
});

test('records are atomic, ordered by floor and sequence, and state is recalculated', () => {
  let state = createMemoryState();
  const entity = registerEntity(state, { name: '短剑', type: 'item' }); state = entity.state;
  state = addRecord(state, { id: 'r2', text: '放在营地', floor: 20, sequence: 1, action: { entityId: entity.entity.id, locationId: 'camp' } }).state;
  state = addRecord(state, { id: 'r1', text: '交给甲', floor: 3, sequence: 1, action: { entityId: entity.entity.id, ownerId: '甲' } }).state;
  state = addRecord(state, { id: 'r3', text: '交给乙', floor: 10, sequence: 1, action: { entityId: entity.entity.id, ownerId: '乙' } }).state;
  const calculated = calculateCurrentState(state);
  assert.equal(calculated.entities[0].state.ownerId, '乙');
  assert.equal(calculated.entities[0].state.locationId, 'camp');
  assert.deepEqual(calculated.recordsApplied, ['r1', 'r3', 'r2']);
});

test('replay uses closed interval before active window', () => {
  let state = createMemoryState({ settings: { activeWindowLayers: 5, replayLayers: 3 } });
  for (let floor = 1; floor <= 10; floor += 1) state = addRecord(state, { id: `r${floor}`, text: String(floor), floor }).state;
  assert.deepEqual(replayRecords(state, { currentFloor: 10 }).map(x => x.floor), [3, 4, 5]);
});

test('store persists independently and degrades when storage fails', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const store = createMemoryStore({ storage, chatId: 'chat-1' });
  store.registerEntity({ name: '营地', type: 'place' });
  assert.equal(store.inspect().entities.length, 1);
  const loaded = createMemoryStore({ storage, chatId: 'chat-1' });
  assert.equal(loaded.inspect().entities[0].name, '营地');
  const broken = createMemoryStore({ storage: { getItem: () => { throw new Error('no storage'); }, setItem: () => { throw new Error('no storage'); } }, chatId: 'x' });
  assert.doesNotThrow(() => broken.registerEntity({ name: '甲', type: 'person' }));
});
