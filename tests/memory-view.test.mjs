import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecord, calculateCurrentState, createMemoryState, registerEntity } from '../lib/memory-model.js';
import {
  buildEntityRows,
  buildEventRows,
  describeRecordAction,
  filterEventRows,
  formatEntityRow,
  formatEventRow,
  formatRecordDetail,
} from '../lib/memory-view.js';
import { parseDirectMarkers } from '../lib/direct-parser.js';

function fixture() {
  let state = createMemoryState();
  const swordResult = registerEntity(state, { id: 'ent-sword', name: '短剑', type: 'item' }); const sword = swordResult.entity; state = swordResult.state;
  const jiaResult = registerEntity(state, { id: 'ent-jia', name: '甲', type: 'person' }); const jia = jiaResult.entity; state = jiaResult.state;
  const yiResult = registerEntity(state, { id: 'ent-yi', name: '乙', type: 'person' }); const yi = yiResult.entity; state = yiResult.state;
  state = addRecord(state, { id: 'r2', text: '甲将短剑交给乙', floor: 10, sequence: 1, action: '转移', extractionMode: 'direct', entityIds: [sword.id, jia.id, yi.id] }).state;
  state = addRecord(state, { id: 'r1', text: '铁匠将短剑交给甲', floor: 3, sequence: 2, action: { entityId: sword.id, ownerId: jia.id }, extractionMode: 'manual', entityIds: [sword.id, jia.id] }).state;
  state = addRecord(state, { id: 'r3', text: '乙将短剑放在营地', floor: 3, sequence: 1, action: { entityId: sword.id, locationId: 'ent-camp' }, extractionMode: 'post', entityIds: [sword.id, yi.id] }).state;
  return { state, sword, jia, yi };
}

test('direct marker action string survives persistence', () => {
  const parsed = parseDirectMarkers('(((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙])))', { floor: 7 });
  assert.equal(parsed.records[0].action, '转移');
  let state = createMemoryState();
  const stored = addRecord(state, parsed.records[0]).record;
  assert.equal(stored.action, '转移');
  state = addRecord(state, { id: 'legacy', text: '旧式动作', floor: 8, action: { entityId: 'e1', ownerId: 'e2' } }).state;
  assert.deepEqual(state.records.at(-1).action, { entityId: 'e1', ownerId: 'e2' });
});

test('event rows sort by floor then sequence and expose default columns only', () => {
  const { state } = fixture();
  const rows = buildEventRows(state);
  assert.deepEqual(rows.map(row => row.id), ['r3', 'r1', 'r2']);
  assert.equal(rows[0].floor, 3);
  assert.equal(rows[0].sequence, 1);
  assert.equal(rows[2].entityNames.join(','), '短剑,甲,乙');
  assert.equal(rows[2].actionText, '转移');
  assert.equal(rows[2].extractionModeLabel, '直出');
  assert.equal(rows[2].statusLabel, '有效');
});

test('event row text hides status by default and shows it on demand', () => {
  const { state } = fixture();
  const row = buildEventRows(state).find(item => item.id === 'r1');
  const defaultText = formatEventRow(row);
  assert.match(defaultText, /第3层 · #2 · 短剑、甲 · 持有者=甲 · 手动/);
  assert.ok(!defaultText.includes('有效'));
  assert.match(formatEventRow(row, { showStatus: true }), /有效/);
});

test('record detail expands every field including status and source', () => {
  const { state } = fixture();
  const row = buildEventRows(state).find(item => item.id === 'r2');
  const detail = formatRecordDetail(row);
  assert.match(detail, /记录 ID：r2/);
  assert.match(detail, /位置：第10层 #1/);
  assert.match(detail, /提取模式：直出/);
  assert.match(detail, /状态：有效/);
  assert.match(detail, /动作：转移/);
  assert.match(detail, /来源消息：无/);
});

test('describeRecordAction prefers string action then state changes then text', () => {
  const nameOf = (id) => ({ e1: '短剑', e2: '乙' }[id] ?? id);
  assert.equal(describeRecordAction({ action: '移动' }, { nameOf }), '移动');
  assert.equal(describeRecordAction({ action: { entityId: 'e1', ownerId: 'e2' } }, { nameOf }), '持有者=乙');
  assert.equal(describeRecordAction({ stateChanges: [{ entityId: 'e1', field: 'ownerId', after: 'e2' }] }, { nameOf }), '持有者=乙');
  assert.equal(describeRecordAction({ text: '没有结构化动作' }, { nameOf }), '没有结构化动作');
});

test('entity rows show name, type, state summary and related event count', () => {
  const { state } = fixture();
  const current = calculateCurrentState(state);
  const rows = buildEntityRows(state, { currentState: current });
  const sword = rows.find(row => row.id === 'ent-sword');
  assert.equal(sword.name, '短剑');
  assert.equal(sword.typeLabel, '物品');
  assert.match(sword.stateSummary, /持有者=甲/);
  assert.equal(sword.eventCount, 3);
  const jia = rows.find(row => row.id === 'ent-jia');
  assert.match(formatEntityRow(jia), /甲 · 角色 · .* · 关联事件 2/);
});

test('entity filter keeps (floor, sequence) order and matches id or name', () => {
  const { state } = fixture();
  const rows = buildEventRows(state);
  assert.deepEqual(filterEventRows(rows, '短剑').map(row => row.id), ['r3', 'r1', 'r2']);
  assert.deepEqual(filterEventRows(rows, 'ent-yi').map(row => row.id), ['r3', 'r2']);
  assert.deepEqual(filterEventRows(rows, '甲').map(row => row.id), ['r1', 'r2']);
  assert.deepEqual(filterEventRows(rows, '').map(row => row.id), ['r3', 'r1', 'r2']);
});
