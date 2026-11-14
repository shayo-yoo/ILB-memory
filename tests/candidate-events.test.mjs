import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryState, registerEntity } from '../lib/memory-model.js';
import { validateCandidatePayload } from '../lib/candidate-events.js';

test('candidate payload accepts valid events and assigns source metadata', () => {
  const state = createMemoryState();
  const result = validateCandidatePayload([{ text: '短剑交给甲', kind: 'fact' }], { state, floor: 3, sourceMessageId: 'm3', swipeId: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.accepted[0].floor, 3);
  assert.equal(result.accepted[0].sourceMessageId, 'm3');
  assert.equal(result.accepted[0].swipeId, 1);
});

test('candidate payload rejects malformed events without losing valid ones', () => {
  const result = validateCandidatePayload([{ text: 'ok' }, { text: '', kind: 'fact' }, { text: 'bad', kind: 'rumor' }]);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 2);
});

test('candidate action cannot reference an unknown entity', () => {
  const result = validateCandidatePayload([{ text: 'unknown', action: { entityId: 'missing', ownerId: '甲' } }]);
  assert.equal(result.ok, false);
  assert.match(result.rejected[0].reason, /不存在的实体/);
});
