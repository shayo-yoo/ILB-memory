import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryState, registerEntity } from '../lib/memory-model.js';
import { exportMemory, importMemory } from '../lib/memory-backup.js';

test('memory backup exports and imports normalized state', () => {
  let state = createMemoryState(); state = registerEntity(state, { name: '短剑', type: 'item' }).state;
  const backup = exportMemory(state); const result = importMemory(backup);
  assert.equal(backup.kind, 'ilbm-memory'); assert.equal(backup.schema_version, 2); assert.equal(result.ok, true); assert.equal(result.state.entities[0].name, '短剑');
});

test('memory backup rejects wrong kind, future version and malformed payload', () => {
  assert.equal(importMemory({ kind: 'other', memory: { entities: [], records: [] } }).ok, false);
  assert.equal(importMemory({ kind: 'ilbm-memory', schema_version: 3, memory: { entities: [], records: [] } }).ok, false);
  assert.equal(importMemory({ kind: 'ilbm-memory', memory: {} }).ok, false);
});

test('memory backup migrates schema 1 entity type to tags', () => {
  const result = importMemory({ kind: 'ilbm-memory', schema_version: 1, memory: { entities: [{ id: 'e1', name: '短剑', type: 'item' }], records: [] } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.entities[0].tags, ['item']);
  assert.equal(result.state.entities[0].type, 'item');
  assert.equal(result.state.schema_version, 2);
});
