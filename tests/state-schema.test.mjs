import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  STATE_ENUMS, 
  STATE_FIELDS, 
  getStateFieldsForEntityType,
  formatStateCard,
  validateStateChange 
} from '../lib/state-schema.js';

test('状态枚举定义', () => {
  // 存储码为稳定英文值，显示标签单独维护
  assert.ok(STATE_ENUMS.ITEM_STATUS.INTACT === 'intact');
  assert.ok(STATE_ENUMS.ITEM_STATUS.DAMAGED === 'damaged');
  assert.ok(STATE_ENUMS.ITEM_STATUS_LABEL.intact === '完好');
  assert.ok(STATE_ENUMS.ITEM_STATUS_LABEL.destroyed === '已销毁');
  assert.ok(STATE_ENUMS.CONTINUOUS_STATUS.INJURED === '受伤');
  assert.ok(STATE_ENUMS.RELATION_TYPES.FRIEND === '朋友');
});

test('根据实体类型获取状态字段', () => {
  // 物品类型
  const itemFields = getStateFieldsForEntityType('item');
  assert.ok(itemFields.OWNER.label === '持有者');
  assert.ok(itemFields.LOCATION.label === '位置');
  assert.ok(itemFields.STATUS.label === '状态');
  
  // 角色类型  
  const personFields = getStateFieldsForEntityType('person');
  assert.ok(personFields.LOCATION.label === '位置');
  assert.ok(personFields.CONTINUOUS_STATUS.label === '持续状态');
  assert.ok(personFields.RELATIONS.label === '当前有效关系');
  
  // 地点类型
  const placeFields = getStateFieldsForEntityType('place');
  assert.ok(placeFields.CHARACTERS_PRESENT.label === '在场角色');
  assert.ok(placeFields.ITEMS_PRESENT.label === '在场物品');
  
  // 未知类型
  const otherFields = getStateFieldsForEntityType('other');
  assert.deepEqual(otherFields, {});
});

test('状态卡格式化', () => {
  // 测试物品状态格式化
  const item = { id: 'item-1', name: '短剑', type: 'item' };
  const itemState = {
    ownerId: 'person-1',
    locationId: 'place-1',
    status: STATE_ENUMS.ITEM_STATUS.INTACT
  };
  
  const itemFormatted = formatStateCard(item, itemState);
  assert.ok(itemFormatted.includes('持有者='));
  assert.ok(itemFormatted.includes('位置='));
  assert.ok(itemFormatted.includes('状态=完好'));
  
  // 测试角色状态格式化
  const person = { id: 'person-1', name: '角色A', type: 'person' };
  const personState = {
    locationId: 'place-1',
    continuousStatus: [STATE_ENUMS.CONTINUOUS_STATUS.INJURED],
    relations: [
      { targetId: 'person-2', type: 'FRIEND', establishedAt: Date.now() }
    ]
  };
  
  const personFormatted = formatStateCard(person, personState);
  assert.ok(personFormatted.includes('位置='));
  assert.ok(personFormatted.includes('持续状态=受伤'));
  assert.ok(personFormatted.includes('当前有效关系=朋友'));
  
  // 无状态记录时仍按 §2.1 最小字段集输出，且不得把未知值推断成事实
  const emptyState = {};
  const emptyFormatted = formatStateCard(person, emptyState);
  assert.equal(emptyFormatted, '位置=未知，持续状态=无，当前有效关系=无');

  const emptyItem = formatStateCard(item, {});
  assert.equal(emptyItem, '持有者=未知，位置=未知，状态=未知');
});

test('状态变更验证', () => {
  // 有效的物品状态变更
  const validItemStatus = validateStateChange('item', 'status', STATE_ENUMS.ITEM_STATUS.DAMAGED);
  assert.ok(validItemStatus.valid);
  assert.ok(validItemStatus.fieldDef.key === 'status');
  
  // 无效的物品状态值
  const invalidItemStatus = validateStateChange('item', 'status', '未知状态');
  assert.ok(!invalidItemStatus.valid);
  assert.ok(invalidItemStatus.error.includes('不在允许的枚举中'));
  
  // 有效的连续状态数组
  const validContinuous = validateStateChange('person', 'continuousStatus', ['受伤', '疲惫']);
  assert.ok(validContinuous.valid);
  
  // 无效的连续状态值
  const invalidContinuous = validateStateChange('person', 'continuousStatus', ['未知状态']);
  assert.ok(!invalidContinuous.valid);
  
  // 实体引用验证
  const validOwner = validateStateChange('item', 'ownerId', 'person-123');
  assert.ok(validOwner.valid);
  
  const validLocation = validateStateChange('item', 'locationId', null);
  assert.ok(validLocation.valid);
  
  // 未定义的字段
  const undefinedField = validateStateChange('item', 'unknownField', 'value');
  assert.ok(!undefinedField.valid);
  assert.ok(undefinedField.error.includes('未定义'));
});

test('状态字段默认值', () => {
  // 物品状态默认值
  const itemStatusField = STATE_FIELDS.ITEM.STATUS;
  assert.equal(itemStatusField.defaultValue, STATE_ENUMS.ITEM_STATUS.INTACT);
  
  // 关系列表默认值
  const relationsField = STATE_FIELDS.PERSON.RELATIONS;
  assert.deepEqual(relationsField.defaultValue, []);
  
  // 在场物品默认值
  const itemsPresentField = STATE_FIELDS.PLACE.ITEMS_PRESENT;
  assert.deepEqual(itemsPresentField.defaultValue, []);
});

console.log('✅ 状态字段定义测试通过');