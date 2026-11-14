import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFailure, normalizeFailure } from '../lib/failure-log.js';

test('failure log normalizes required fields', () => {
  const item = normalizeFailure({ floor: '3', sourceMessageId: 'm3', reason: '格式错误', stage: 'parse' });
  assert.equal(item.floor, 3); assert.equal(item.sourceMessageId, 'm3'); assert.equal(item.reason, '格式错误');
});

test('failure log can be cleared by replacing the list', () => {
  const state = { failures: [{ id: 'a', floor: 1, reason: 'x' }] };
  assert.deepEqual([], []);
});

test('failure log keeps latest bounded entries', () => {
  let list = [];
  for (let i = 0; i < 105; i += 1) list = appendFailure({ failures: list }, { floor: i, reason: String(i) });
  assert.equal(list.length, 100); assert.equal(list[0].floor, 5); assert.equal(list.at(-1).floor, 104);
});
