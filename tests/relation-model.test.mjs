import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, calculateCurrentState, createMemoryState, registerEntity } from '../lib/memory-model.js';
import { deriveStateChanges } from '../lib/action-state.js';
import { parseRelationSpec, relationLabel, relationTypeLabel, formatRelationSentence, formatRelationTarget } from '../lib/relation-model.js';
import { parseDirectMarkers } from '../lib/direct-parser.js';

test('关系词解析：对称类型、角色词与显式类型:角色', () => {
  assert.deepEqual(parseRelationSpec('朋友'), { type: 'FRIEND', role: '朋友', label: '朋友', symmetric: true, custom: false });
  assert.equal(parseRelationSpec('盟友').type, 'ALLY');
  assert.equal(parseRelationSpec('主人').type, 'MASTER_SERVANT');
  assert.equal(parseRelationSpec('仆人').role, '仆人');
  assert.equal(parseRelationSpec('妻子').type, 'HUSBAND_WIFE');
  assert.equal(parseRelationSpec('俘虏').type, 'CAPTOR_CAPTIVE');
  assert.equal(parseRelationSpec('主宠:主人').type, 'OWNER_PET');
  assert.equal(parseRelationSpec('主宠:主人').role, '主人');
  assert.equal(parseRelationSpec('守护者').custom, true);
  assert.equal(parseRelationSpec(''), null);
});

test('关系显示与自然句', () => {
  const nameOf = (id) => ({ a: '甲', b: '乙' }[id] ?? id);
  const relation = { toId: 'b', type: 'MASTER_SERVANT', role: '主人' };
  assert.equal(relationLabel(relation), '主人');
  assert.equal(relationTypeLabel('MASTER_SERVANT'), '主仆');
  assert.equal(formatRelationTarget(relation, nameOf), '对乙：主人');
  assert.equal(formatRelationSentence('甲', relation, nameOf), '甲是乙的主人');
  assert.equal(formatRelationSentence('甲', { toId: 'b', type: 'FRIEND', role: '朋友' }, nameOf), '甲是乙的朋友');
});

test('对称关系自动补反向边，且只保留一条', () => {
  let state = createMemoryState();
  const jia = registerEntity(state, { name: '甲', type: 'person' }); state = jia.state;
  const yi = registerEntity(state, { name: '乙', type: 'person' }); state = yi.state;
  state = addRecord(state, {
    id: 'r1', text: '甲与乙成为朋友', floor: 1, status: 'valid',
    stateChanges: deriveStateChanges('建立关系', [jia.entity.id, yi.entity.id], { description: '朋友' }),
  }).state;
  // 重复写同一条对称关系不得产生重复边。
  state = addRecord(state, {
    id: 'r2', text: '甲与乙仍是朋友', floor: 2, status: 'valid',
    stateChanges: deriveStateChanges('建立关系', [jia.entity.id, yi.entity.id], { description: '朋友' }),
  }).state;

  const cards = calculateCurrentState(state).cards;
  const jiaCard = cards.persons.find((card) => card.entityId === jia.entity.id);
  const yiCard = cards.persons.find((card) => card.entityId === yi.entity.id);
  assert.equal(jiaCard.state.relations.length, 1);
  assert.equal(yiCard.state.relations.length, 1);
  assert.equal(jiaCard.state.relations[0].toId, yi.entity.id);
  assert.equal(yiCard.state.relations[0].toId, jia.entity.id);
  assert.equal(jiaCard.state.relations[0].role, '朋友');
});

test('不对称关系必须显式写两条标记，角色各自独立', () => {
  let state = createMemoryState();
  const jia = registerEntity(state, { name: '甲', type: 'person' }); state = jia.state;
  const yi = registerEntity(state, { name: '乙', type: 'person' }); state = yi.state;

  // 只写一条：甲是乙的主人，不自动推断乙是甲的仆人。
  state = addRecord(state, {
    id: 'r1', text: '甲成为乙的主人', floor: 1, status: 'valid',
    stateChanges: deriveStateChanges('建立关系', [jia.entity.id, yi.entity.id], { description: '主人' }),
  }).state;
  let cards = calculateCurrentState(state).cards;
  let jiaCard = cards.persons.find((card) => card.entityId === jia.entity.id);
  let yiCard = cards.persons.find((card) => card.entityId === yi.entity.id);
  assert.equal(jiaCard.state.relations.length, 1);
  assert.equal(jiaCard.state.relations[0].role, '主人');
  assert.equal((yiCard.state.relations ?? []).length, 0);
  assert.match(jiaCard.displayText, /当前有效关系=对乙：主人/);

  // 显式补第二条：乙是甲的仆人。
  state = addRecord(state, {
    id: 'r2', text: '乙成为甲的仆人', floor: 2, status: 'valid',
    stateChanges: deriveStateChanges('建立关系', [yi.entity.id, jia.entity.id], { description: '仆人' }),
  }).state;
  cards = calculateCurrentState(state).cards;
  jiaCard = cards.persons.find((card) => card.entityId === jia.entity.id);
  yiCard = cards.persons.find((card) => card.entityId === yi.entity.id);
  assert.equal(jiaCard.state.relations[0].role, '主人');
  assert.equal(yiCard.state.relations[0].role, '仆人');
});

test('解除关系移除指定目标；未写类型时移除该目标全部关系', () => {
  let state = createMemoryState();
  const jia = registerEntity(state, { name: '甲', type: 'person' }); state = jia.state;
  const yi = registerEntity(state, { name: '乙', type: 'person' }); state = yi.state;
  state = addRecord(state, {
    id: 'r1', text: '甲与乙成为朋友', floor: 1, status: 'valid',
    stateChanges: deriveStateChanges('建立关系', [jia.entity.id, yi.entity.id], { description: '朋友' }),
  }).state;
  state = addRecord(state, {
    id: 'r2', text: '甲解除与乙的关系', floor: 2, status: 'valid',
    stateChanges: deriveStateChanges('解除关系', [jia.entity.id, yi.entity.id]),
  }).state;
  const cards = calculateCurrentState(state).cards;
  assert.equal((cards.persons.find((card) => card.entityId === jia.entity.id).state.relations ?? []).length, 0);
  assert.equal((cards.persons.find((card) => card.entityId === yi.entity.id).state.relations ?? []).length, 0);
});

test('内联标记尾部的关系角色写入 stateChanges', () => {
  const byName = new Map([['甲', 'e-jia'], ['乙', 'e-yi']]);
  const result = parseDirectMarkers('正文 (((ILBM:[entity:甲] 建立关系 [entity:乙] 主人)))', {
    floor: 3,
    resolveEntities: (names) => ({ entityIds: names.map((name) => byName.get(name)) }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.records[0].stateChanges[0].field, 'relations');
  assert.equal(result.records[0].stateChanges[0].entityId, 'e-jia');
  assert.equal(result.records[0].stateChanges[0].after.toId, 'e-yi');
  assert.equal(result.records[0].stateChanges[0].after.type, 'MASTER_SERVANT');
  assert.equal(result.records[0].stateChanges[0].after.role, '主人');
});
