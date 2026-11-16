import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCandidatePayload } from '../lib/candidate-events.js';
import { createMemoryState, registerEntity } from '../lib/memory-model.js';
import { createEntityResolver } from '../lib/entity-resolver.js';

function setup() {
  let state = createMemoryState();
  const jia = registerEntity(state, { name: '甲', type: 'person' }); state = jia.state;
  const yi = registerEntity(state, { name: '乙', type: 'person' }); state = yi.state;
  const sword = registerEntity(state, { name: '短剑', type: 'item' }); state = sword.state;
  const resolver = createEntityResolver({ list: () => state.entities, register: (input) => { const result = registerEntity(state, input); state = result.state; return result.entity; } });
  return { get state() { return state; }, set state(next) { state = next; }, jia: jia.entity, yi: yi.entity, sword: sword.entity, resolver };
}

test('候选事件支持实体短名与动作字符串，并推导 stateChanges', () => {
  const t = setup();
  const result = validateCandidatePayload(
    { events: [{ text: '乙获得短剑', entities: ['乙', '短剑'], action: '获得' }] },
    { state: t.state, floor: 5, status: 'pending', extractionMode: 'post', resolveEntities: (names) => t.resolver.resolve(names) },
  );
  assert.equal(result.ok, true);
  const record = result.accepted[0];
  assert.equal(record.status, 'pending');
  assert.equal(record.extractionMode, 'post');
  assert.equal(record.entityIds.length, 2);
  assert.equal(record.stateChanges[0].field, 'ownerId');
  assert.equal(record.stateChanges[0].after, t.yi.id);
});

test('候选事件的关系 stateChanges 支持短名与角色', () => {
  const t = setup();
  const result = validateCandidatePayload(
    { events: [{ text: '甲成为乙的主人', entities: ['甲', '乙'], stateChanges: [{ entityId: '甲', field: 'relations', after: { toId: '乙', type: 'MASTER_SERVANT', role: '主人', active: true } }] }] },
    { state: t.state, floor: 6, resolveEntities: (names) => t.resolver.resolve(names) },
  );
  assert.equal(result.ok, true);
  const change = result.accepted[0].stateChanges[0];
  assert.equal(change.entityId, t.jia.id);
  assert.equal(change.after.toId, t.yi.id);
  assert.equal(change.after.role, '主人');
});

test('候选事件引用不存在的实体时整条拒绝', () => {
  const t = setup();
  const result = validateCandidatePayload(
    { events: [{ text: '未知实体做了某事', entities: ['不存在的人'], action: '获得' }] },
    { state: t.state, floor: 7, resolveEntities: null },
  );
  assert.equal(result.ok, false);
  assert.match(result.rejected[0].reason, /不存在的实体/);
});

test('候选事件未知动作按自由叙事动作保存，不产生状态变更', () => {
  const t = setup();
  const result = validateCandidatePayload(
    { events: [{ text: '甲望向远方', entities: ['甲'], action: '眺望' }] },
    { state: t.state, floor: 8, resolveEntities: (names) => t.resolver.resolve(names) },
  );
  assert.equal(result.ok, true);
  assert.equal(result.accepted[0].stateChanges.length, 0);
});
