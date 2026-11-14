import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCandidateResponse } from '../lib/candidate-parser.js';

test('parses plain JSON array', () => {
  const result = parseCandidateResponse('[{"text":"事件"}]');
  assert.equal(result.ok, true);
  assert.equal(result.value[0].text, '事件');
});

test('parses fenced JSON from AI prose', () => {
  const result = parseCandidateResponse('我提取到：\n```json\n[{"text":"事件","kind":"fact"}]\n```');
  assert.equal(result.ok, true);
  assert.equal(result.source, 'code-block');
});

test('rejects prose, empty and malformed JSON', () => {
  assert.equal(parseCandidateResponse('').ok, false);
  assert.equal(parseCandidateResponse('没有值得记录的事件').ok, false);
  assert.equal(parseCandidateResponse('```json\n{bad}\n```').ok, false);
});

test('accepts object wrapper with events array', () => {
  const result = parseCandidateResponse('{"events":[{"text":"事件"}]}');
  assert.equal(result.ok, true);
  assert.equal(result.value.events.length, 1);
});
