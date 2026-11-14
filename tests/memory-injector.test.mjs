import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryInjector } from '../lib/memory-injector.js';

test('memory injector is disabled by default and never writes until enabled', () => {
  const calls = [];
  const injector = createMemoryInjector({ getContext: () => ({ setExtensionPrompt: (...args) => calls.push(args) }), getText: () => '记忆文本' });
  assert.equal(injector.apply().skipped, true); assert.equal(calls.length, 0);
  injector.setEnabled(true); assert.equal(injector.apply().ok, true); assert.equal(calls.length, 1); assert.equal(calls[0][1], '记忆文本');
  injector.setEnabled(false); assert.equal(calls.length, 2); assert.equal(calls[1][1], '');
});

test('memory injector degrades when host injection API is unavailable', () => {
  const injector = createMemoryInjector({ getContext: () => ({}), getText: () => 'x' });
  injector.setEnabled(true); assert.equal(injector.apply().ok, false);
});
