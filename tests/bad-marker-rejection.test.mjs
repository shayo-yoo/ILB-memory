import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDirectMarkers } from '../lib/direct-parser.js';
import { extractActionAndEntities, deriveStateChanges } from '../lib/action-state.js';

const good = '(((ILBM:[entity:甲] 转移 [entity:物品A] 给 [entity:乙])))';
const bad = '<mem>[entity：甲] <转移> [entity：物品A] <to> [entity：乙]</mem>\n<mem>[entity：甲] <建立关系：朋友> [entity：乙]</mem>';

test('正确标记可解析为转移记录', () => {
  const result = parseDirectMarkers(good, { floor: 1, resolveEntities: () => ({ entityIds: ['甲', '物品A', '乙'] }) });
  assert.equal(result.ok, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].action, '转移');
  assert.equal(result.records[0].entityIds.length, 3);
  assert.equal(result.records[0].stateChanges[0].field, 'ownerId');
});

test('模型使用 XML 标签与尖括号动作时：解析失败但不产生任何记录', () => {
  const result = parseDirectMarkers(bad, { floor: 1, resolveEntities: () => ({ entityIds: [] }) });
  assert.equal(result.triggered, false);
  assert.equal(result.records.length, 0);
  assert.equal(result.cleanedText, bad, '非法文本不会被静默改写或误删');
});

test('提取器要求半角冒号，拒绝全角冒号与尖括号包装', () => {
  const extraction = extractActionAndEntities('[entity：甲] <转移> [entity：物品A] <to> [entity：乙]');
  assert.deepEqual(extraction.entities, [], '全角冒号不被当作 [entity:...]');
  assert.equal(extraction.action, '<转移>');
  assert.equal(deriveStateChanges(extraction.action, extraction.entities).length, 0);
});

test('关系动作读取标记尾部角色', () => {
  const result = parseDirectMarkers('(((ILBM:[entity:甲] 建立关系 [entity:乙] 朋友)))', { floor: 2 });
  assert.equal(result.ok, true);
  assert.equal(result.records[0].stateChanges[0].after.type, 'FRIEND');
  assert.equal(result.records[0].stateChanges[0].after.role, '朋友');
});
