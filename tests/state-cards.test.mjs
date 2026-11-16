import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, calculateCurrentState, createMemoryState, registerEntity, setEntityTags } from '../lib/memory-model.js';
import { deriveStateChanges } from '../lib/action-state.js';
import { ITEM_STATUS_CODE } from '../lib/state-schema.js';

// 构建 §2.1 贯穿案例所需的实体图
function buildCase() {
  let state = createMemoryState();
  const add = (name, type) => {
    const result = registerEntity(state, { name, type });
    state = result.state;
    return result.entity;
  };
  const sword = add('短剑', 'item');
  const smith = add('铁匠', 'person');
  const jia = add('甲', 'person');
  const yi = add('乙', 'person');
  const camp = add('营地', 'place');
  return { get state() { return state; }, set state(next) { state = next; }, sword, smith, jia, yi, camp };
}

test('物品卡包含持有者、位置、状态（§2.1 MVP 最小字段集）', () => {
  const c = buildCase();
  c.state = addRecord(c.state, { id: 'i1', text: '铁匠将短剑交给甲', floor: 3, sequence: 1, action: { entityId: c.sword.id, ownerId: c.jia.id } }).state;
  c.state = addRecord(c.state, { id: 'i2', text: '甲将短剑交给乙', floor: 10, sequence: 1, action: { entityId: c.sword.id, ownerId: c.yi.id } }).state;
  c.state = addRecord(c.state, { id: 'i3', text: '乙将短剑放在营地', floor: 20, sequence: 1, action: { entityId: c.sword.id, locationId: c.camp.id, status: ITEM_STATUS_CODE.INTACT } }).state;

  const cards = calculateCurrentState(c.state).cards;
  assert.equal(cards.items.length, 1);
  const item = cards.items[0];
  assert.equal(item.state.ownerId, c.yi.id);
  assert.equal(item.state.locationId, c.camp.id);
  assert.equal(item.state.status, ITEM_STATUS_CODE.INTACT);
  // 状态卡必须以短名+中文标签呈现，便于注入
  assert.ok(item.displayText.includes('持有者=乙'), item.displayText);
  assert.ok(item.displayText.includes('位置=营地'), item.displayText);
  assert.ok(item.displayText.includes('状态=完好'), item.displayText);
});

test('角色卡包含位置与持续状态与当前有效关系', () => {
  const c = buildCase();
  c.state = addRecord(c.state, { id: 'p1', text: '乙前往营地', floor: 5, action: { entityId: c.yi.id, locationId: c.camp.id } }).state;
  c.state = addRecord(c.state, {
    id: 'p2', text: '乙与甲结盟', floor: 6,
    action: { entityId: c.yi.id, relation: { targetId: c.jia.id, type: 'ALLY', establishedAt: 1 } },
  }).state;
  c.state = addRecord(c.state, { id: 'p3', text: '乙受伤', floor: 7, stateChanges: deriveStateChanges('受伤', [c.yi.id]) }).state;

  const cards = calculateCurrentState(c.state).cards;
  const person = cards.persons.find(p => p.entityId === c.yi.id);
  assert.equal(person.state.locationId, c.camp.id);
  assert.deepEqual(person.state.continuousStatus, ['受伤']);
  assert.equal(person.state.relations.length, 1);
  assert.equal(person.state.relations[0].toId, c.jia.id);
  assert.ok(person.displayText.includes('位置=营地'), person.displayText);
  assert.ok(person.displayText.includes('持续状态=受伤'), person.displayText);
  assert.ok(person.displayText.includes('当前有效关系='), person.displayText);
});

test('地点卡包含在场角色与在场物品', () => {
  const c = buildCase();
  c.state = addRecord(c.state, {
    id: 'l1', text: '营地聚集了乙与短剑', floor: 8,
    action: { entityId: c.camp.id, charactersPresent: [c.yi.id], itemsPresent: [c.sword.id] },
  }).state;
  const cards = calculateCurrentState(c.state).cards;
  const place = cards.places[0];
  assert.deepEqual(place.state.charactersPresent, [c.yi.id]);
  assert.deepEqual(place.state.itemsPresent, [c.sword.id]);
  assert.ok(place.displayText.includes('在场角色=乙'), place.displayText);
  assert.ok(place.displayText.includes('在场物品=短剑'), place.displayText);
});

test('stateChanges 参与状态推导，且待确认记录被排除', () => {
  let state = createMemoryState();
  const sword = registerEntity(state, { name: '短剑', type: 'item' }); state = sword.state;
  state = addRecord(state, {
    id: 'd1', text: '短剑损坏', floor: 4, status: 'pending',
    stateChanges: deriveStateChanges('损坏', [sword.entity.id]),
  }).state;
  let calculated = calculateCurrentState(state);
  assert.equal(calculated.entities[0].state.status, undefined, 'pending 记录不得影响状态');

  state = addRecord(state, {
    id: 'd2', text: '短剑损坏（已确认）', floor: 5, status: 'valid',
    stateChanges: deriveStateChanges('损坏', [sword.entity.id]),
  }).state;
  calculated = calculateCurrentState(state);
  assert.equal(calculated.entities[0].state.status, ITEM_STATUS_CODE.DAMAGED);
});

test('状态推导按楼层线性扫描，取最近一次后值', () => {
  let state = createMemoryState();
  const sword = registerEntity(state, { name: '短剑', type: 'item' }); state = sword.state;
  state = addRecord(state, { id: 'o1', text: '甲持有', floor: 2, action: { entityId: sword.entity.id, ownerId: '甲' } }).state;
  state = addRecord(state, { id: 'o2', text: '乙持有', floor: 9, action: { entityId: sword.entity.id, ownerId: '乙' } }).state;
  state = addRecord(state, { id: 'o3', text: '丙持有', floor: 4, action: { entityId: sword.entity.id, ownerId: '丙' } }).state;
  assert.equal(calculateCurrentState(state).entities[0].state.ownerId, '乙');
});

test('无类型实体由有效行为推导 kind 标签，pending 不触发', () => {
  let state = createMemoryState();
  const sword = registerEntity(state, { name: '短剑', type: 'other' }); state = sword.state;
  const jia = registerEntity(state, { name: '甲', type: 'other' }); state = jia.state;
  state = addRecord(state, {
    id: 'pending', text: '甲获得短剑', floor: 1, status: 'pending',
    stateChanges: deriveStateChanges('转移', [jia.entity.id, sword.entity.id]),
  }).state;
  assert.deepEqual(state.entities.find(entity => entity.id === sword.entity.id).tags, []);
  assert.deepEqual(state.entities.find(entity => entity.id === jia.entity.id).tags, []);

  state = addRecord(state, {
    id: 'valid', text: '甲获得短剑', floor: 2, status: 'valid',
    stateChanges: deriveStateChanges('转移', [jia.entity.id, sword.entity.id]),
  }).state;
  assert.deepEqual(state.entities.find(entity => entity.id === sword.entity.id).tags, ['item']);
  assert.deepEqual(state.entities.find(entity => entity.id === jia.entity.id).tags, ['person']);

  const cards = calculateCurrentState(state).cards;
  assert.equal(cards.items.length, 1);
  assert.equal(cards.items[0].entityId, sword.entity.id);
  assert.equal(cards.persons.length, 1);
  assert.equal(cards.persons[0].entityId, jia.entity.id);
  assert.ok(cards.items[0].displayText.includes('持有者=甲'));
});

test('无标签与组织实体进入 others 状态卡，仍可注入摘要', () => {
  let state = createMemoryState();
  const guild = registerEntity(state, { name: '公会', tags: ['organization'] }); state = guild.state;
  const mystery = registerEntity(state, { name: '神秘物', type: 'other' }); state = mystery.state;
  const cards = calculateCurrentState(state).cards;
  assert.deepEqual(cards.others.map(card => card.entityId).sort(), [guild.entity.id, mystery.entity.id].sort());
  assert.deepEqual(cards.others.find(card => card.entityId === guild.entity.id).tags, ['organization']);
  assert.equal(cards.others.find(card => card.entityId === mystery.entity.id).displayText, '暂无状态');
});

test('setEntityTags 支持多标签并派生主类型', () => {
  let state = createMemoryState();
  const dagger = registerEntity(state, { name: '有意识短剑', type: 'other' }); state = dagger.state;
  const result = setEntityTags(state, dagger.entity.id, ['item', 'sentient']);
  assert.deepEqual(result.entity.tags, ['item', 'sentient']);
  assert.equal(result.entity.type, 'item');
  const cards = calculateCurrentState(result.state).cards;
  assert.equal(cards.items[0].tags.includes('sentient'), true);
});
