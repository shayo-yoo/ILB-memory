import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, calculateCurrentState, createMemoryState, getActiveWindowBoundary, invalidateFromMessage, invalidateSwipeBranch, registerEntity, replayRecords } from '../lib/memory-model.js';
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

test('editing a floor invalidates that floor and every later record but preserves history', () => {
  let state = createMemoryState();
  state = addRecord(state, { id: 'a', text: 'old', floor: 3, sourceMessageId: 'm3' }).state;
  state = addRecord(state, { id: 'b', text: 'later', floor: 5, sourceMessageId: 'm5' }).state;
  const next = invalidateFromMessage(state, { floor: 3, sourceMessageId: 'm3' });
  assert.equal(next.records.length, 2);
  assert.equal(next.records.every(record => record.valid === false), true);
});

test('swipe invalidation keeps selected branch and invalidates other branch', () => {
  let state = createMemoryState();
  state = addRecord(state, { id: 's1', text: 'left', floor: 4, sourceMessageId: 'm4', swipeId: 0 }).state;
  state = addRecord(state, { id: 's2', text: 'right', floor: 4, sourceMessageId: 'm4', swipeId: 1 }).state;
  const next = invalidateSwipeBranch(state, { sourceMessageId: 'm4', selectedSwipeId: 1 });
  assert.equal(next.records.find(record => record.id === 's1').valid, false);
  assert.equal(next.records.find(record => record.id === 's2').valid, true);
});

test('active window cannot be configured below two layers (§4.3)', () => {
  const state = createMemoryState({ settings: { activeWindowLayers: 1, replayLayers: 3 } });
  assert.equal(state.settings.activeWindowLayers, 2);
  assert.equal(getActiveWindowBoundary(state, { currentFloor: 10, activeWindowLayers: 0 }).activeLayers, 2);
  assert.equal(getActiveWindowBoundary(state, { currentFloor: 10 }).activeStart, 9);
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
