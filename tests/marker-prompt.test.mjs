import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarkerPrompt, getMarkerPromptInfo, MARKER_PROMPT_EN, MARKER_PROMPT_ZH, MARKER_SYNTAX_REFERENCE } from '../lib/marker-prompt.js';

test('中文标记提示词包含外层语法、动作白名单与关系规则', () => {
  assert.match(MARKER_PROMPT_ZH, /\(\(\(ILBM:/);
  assert.match(MARKER_PROMPT_ZH, /\[entity:主体\]/);
  assert.match(MARKER_PROMPT_ZH, /转移/);
  assert.match(MARKER_PROMPT_ZH, /建立关系/);
  assert.match(MARKER_PROMPT_ZH, /不对称关系必须写两条/);
  assert.match(MARKER_PROMPT_ZH, /没有值得记录的变化时不要输出标记/);
});

test('英文提示词可用且语法一致', () => {
  assert.match(MARKER_PROMPT_EN, /\(\(\(ILBM:/);
  assert.match(MARKER_PROMPT_EN, /one action per marker/i);
  assert.equal(buildMarkerPrompt({ language: 'en' }), MARKER_PROMPT_EN);
  assert.equal(buildMarkerPrompt(), MARKER_PROMPT_ZH);
});

test('语法参考与提示词信息可用于 UI/API', () => {
  assert.equal(MARKER_SYNTAX_REFERENCE.wrapper, '(((ILBM:[entity:主体] 动作 [entity:客体] [entity:接收者] 补充说明)))');
  assert.ok(MARKER_SYNTAX_REFERENCE.actions.includes('转移'));
  assert.ok(MARKER_SYNTAX_REFERENCE.roles.includes('主人'));
  const info = getMarkerPromptInfo();
  assert.equal(info.autoInjection, false);
  assert.match(info.note, /ILB/);
});
