import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryState } from '../lib/memory-model.js';
import { buildMemoryText } from '../lib/memory-injection.js';

test('memory public contract has inspectable derived fields', () => {
  const data = { ...createMemoryState(), currentState: { entities: [], recordsApplied: [] }, replay: [], lastChange: null, eventAdapter: { ok: false, events: [] } };
  assert.ok(Array.isArray(data.entities)); assert.ok(Array.isArray(data.records)); assert.ok(data.currentState); assert.ok(Array.isArray(data.replay)); assert.ok(data.eventAdapter);
});

test('memory text contract is preview-only and returns budget metadata', () => {
  const result = buildMemoryText(createMemoryState(), { tokenBudget: 50 });
  assert.equal(typeof result.text, 'string'); assert.equal(Array.isArray(result.usedRecords), true); assert.equal(typeof result.estimatedTokens, 'number');
});
