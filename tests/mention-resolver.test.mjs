import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMentions } from '../lib/mention-resolver.js';

const ENTITIES = [
  { id: 'e-sword', name: '短剑', aliases: [] },
  { id: 'e-sword2', name: '短剑01', aliases: [] },
  { id: 'e-jia', name: '甲', aliases: ['阿甲'] },
  { id: 'e-yi', name: '乙', aliases: [] },
];

test('提及识别优先匹配更长的实体名', () => {
  const result = resolveMentions('甲拿起短剑01。', ENTITIES);
  assert.deepEqual(result.entityIds, ['e-jia', 'e-sword2']);
  assert.equal(result.matches[0].label, '甲');
});

test('提及识别支持别名，且同一实体只返回一次', () => {
  const result = resolveMentions('阿甲说：甲来了。', ENTITIES);
  assert.deepEqual(result.entityIds, ['e-jia']);
});

test('提及识别按出现位置排序', () => {
  const result = resolveMentions('乙把短剑交给甲。', ENTITIES);
  assert.deepEqual(result.entityIds, ['e-yi', 'e-sword', 'e-jia']);
});

test('提及识别遵守实体数量上限', () => {
  const result = resolveMentions('乙把短剑交给甲。', ENTITIES, { maxEntities: 2 });
  assert.deepEqual(result.entityIds, ['e-yi', 'e-sword']);
});

test('空文本或无实体时返回空结果', () => {
  assert.deepEqual(resolveMentions('', ENTITIES).entityIds, []);
  assert.deepEqual(resolveMentions('短剑', []).entityIds, []);
});
