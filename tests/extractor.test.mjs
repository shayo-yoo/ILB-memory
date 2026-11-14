import test from 'node:test';
import assert from 'node:assert/strict';
import { runCandidateExtraction } from '../lib/extractor.js';

test('extractor is skipped when no model adapter is configured', async () => {
  const result = await runCandidateExtraction('text');
  assert.equal(result.ok, false);
  assert.equal(result.skipped, true);
  assert.match(result.error, /未配置/);
});

test('extractor parses adapter response and reports elapsed time', async () => {
  const result = await runCandidateExtraction('text', { extract: async () => '```json\n[{"text":"事件"}]\n```' });
  assert.equal(result.ok, true);
  assert.equal(result.value[0].text, '事件');
  assert.equal(typeof result.elapsedMs, 'number');
});

test('extractor times out without throwing', async () => {
  const result = await runCandidateExtraction('text', { timeoutMs: 5, extract: () => new Promise(() => {}) });
  assert.equal(result.ok, false);
  assert.match(result.error, /超时/);
});
