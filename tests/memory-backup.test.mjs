import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryState, registerEntity } from '../lib/memory-model.js';
import { exportMemory, importMemory } from '../lib/memory-backup.js';

test('memory backup exports and imports normalized state', () => {
  let state = createMemoryState(); state = registerEntity(state, { name: '短剑', type: 'item' }).state;
  const backup = exportMemory(state); const result = importMemory(backup);
  assert.equal(backup.kind, 'ilbm-memory'); assert.equal(result.ok, true); assert.equal(result.state.entities[0].name, '短剑');
});

test('memory backup rejects wrong kind, future version and malformed payload', () => {
  assert.equal(importMemory({ kind: 'other', memory: { entities: [], records: [] } }).ok, false);
  assert.equal(importMemory({ kind: 'ilbm-memory', schema_version: 2, memory: { entities: [], records: [] } }).ok, false);
  assert.equal(importMemory({ kind: 'ilbm-memory', memory: {} }).ok, false);
});
