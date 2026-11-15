import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemoryText } from '../lib/memory-injection.js';
import { addRecord, createMemoryState, registerEntity } from '../lib/memory-model.js';

test('memory text includes readable state and replay', () => {
  let state = createMemoryState({ settings: { activeWindowLayers: 2, replayLayers: 5 } });
  const entity = registerEntity(state, { name: '短剑', type: 'item' }); state = entity.state;
  state = addRecord(state, { id: 'r1', text: '交给甲', floor: 1, action: { entityId: entity.entity.id, ownerId: '甲' } }).state;
  const result = buildMemoryText(state, { currentFloor: 5, tokenBudget: 2000 });
  assert.match(result.text, /当前状态/);
  assert.match(result.text, /短剑/);
  assert.match(result.text, /历史回放/);
});

test('memory text truncates oldest history under budget', () => {
  let state = createMemoryState({ settings: { activeWindowLayers: 2, replayLayers: 20 } });
  for (let i = 1; i <= 20; i += 1) state = addRecord(state, { id: `r${i}`, text: `历史${i}`.repeat(20), floor: i }).state;
  const result = buildMemoryText(state, { currentFloor: 21, tokenBudget: 20 });
  assert.equal(result.truncated, true);
  assert.match(result.text, /历史19/);
});
