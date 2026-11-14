import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryEventAdapter } from '../lib/memory-events.js';

function source() { const map = new Map(); return { map, on(n, f) { map.set(n, f); }, removeListener(n) { map.delete(n); } }; }

test('message edited integer event invalidates from floor with degraded source fallback', () => {
  const src = source(); const changes = []; const calls = [];
  const store = { invalidateFromMessage(change) { calls.push(change); return { records: [] }; }, invalidateSwipeBranch() { return {}; } };
  const adapter = createMemoryEventAdapter({ eventSource: src, eventTypes: { MESSAGE_EDITED: 'edited' }, getContext: () => ({ chat: [{ mes: 'x' }] }), store, onChange: x => changes.push(x) });
  assert.equal(adapter.ok, true); src.map.get('edited')(0);
  assert.deepEqual(calls[0], { floor: 0, sourceMessageId: null }); assert.equal(changes[0].degraded, true);
});

test('message object event preserves message ID and floor', () => {
  const src = source(); const calls = [];
  const store = { invalidateFromMessage(c) { calls.push(c); return {}; }, invalidateSwipeBranch() { return {}; } };
  createMemoryEventAdapter({ eventSource: src, eventTypes: { MESSAGE_EDITED: 'edited' }, getContext: () => ({ chat: [{ id: 'm1', mes: 'x' }] }), store });
  src.map.get('edited')({ messageId: 0 });
  assert.deepEqual(calls[0], { floor: 0, sourceMessageId: 'm1' });
});

test('swipe event passes selected swipe and source message ID', () => {
  const src = source(); const calls = [];
  const store = { invalidateFromMessage() { return {}; }, invalidateSwipeBranch(c) { calls.push(c); return {}; } };
  createMemoryEventAdapter({ eventSource: src, eventTypes: { MESSAGE_SWIPED: 'swiped' }, getContext: () => ({ chat: [{ id: 'm1', swipe_id: 2, mes: 'x' }] }), store });
  src.map.get('swiped')({ messageId: 0, swipeId: 2 });
  assert.deepEqual(calls[0], { sourceMessageId: 'm1', selectedSwipeId: 2 });
});
