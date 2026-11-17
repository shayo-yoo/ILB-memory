import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARKER_PROMPT_EN, MARKER_PROMPT_ZH } from '../lib/marker-prompt.js';

const doc = readFileSync(new URL('../docs/MARKER_PROMPT.md', import.meta.url), 'utf8');

function extractBlock(heading, language = 'text') {
  const start = doc.indexOf(heading);
  assert.ok(start >= 0, `缺少章节：${heading}`);
  const afterHeading = doc.slice(start);
  const fence = '```' + language;
  const open = afterHeading.indexOf(fence);
  assert.ok(open >= 0, `缺少 ${language} 代码块`);
  const body = afterHeading.slice(open + fence.length);
  const close = body.indexOf('```');
  assert.ok(close >= 0, `代码块未闭合`);
  return body.slice(0, close).trim();
}

test('docs/MARKER_PROMPT.md 的中文复制块与 MARKER_PROMPT_ZH 完全一致', () => {
  const block = extractBlock('## 5. 完整中文提示词');
  assert.equal(block, MARKER_PROMPT_ZH.trim());
});

test('中文提示词规则不重复编号', () => {
  const numbers = [...MARKER_PROMPT_ZH.matchAll(/^(\d+)\. /gm)].map((match) => match[1]);
  assert.equal(new Set(numbers).size, numbers.length, `规则编号重复：${numbers.join(',')}`);
  assert.deepEqual(numbers, ['1', '2', '3', '4', '5', '6', '7', '8']);
});

test('文档字符编码与禁止项完整', () => {
  assert.equal(doc.includes('\uFFFD'), false);
  assert.match(doc, /禁止改写语法/);
  assert.match(doc, /全角冒号/);
  assert.match(MARKER_PROMPT_EN, /Never rewrite the syntax/);
});
