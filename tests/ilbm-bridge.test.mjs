import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarkerResult, registerDisplayFilter, registerPromptFilter } from '../lib/ilbm-bridge.js';
import { registerILBSeriesAPI, initializeILBM, getILBMStatus, publishGlobalApi } from '../index.js';

function fakeFormatter() {
  const hooks = [];
  return { stage: { BEFORE_REGEX: 'beforeRegex' }, order: { EARLY: 10 }, hooks,
    addHook(fn, options) { hooks.push({ fn, options }); } };
}

function fakeEmitter() {
  const listeners = new Map();
  return { listeners,
    on(name, fn) { listeners.set(name, fn); },
    async emit(name, value) { return listeners.get(name)?.(value); } };
}

test('marker result separates trigger from display/prompt cleanup and extraction text', () => {
  const result = createMarkerResult('甲交出短剑。(((ILBM)))');
  assert.equal(result.triggered, true);
  assert.equal(result.displayText, '甲交出短剑。');
  assert.equal(result.promptText, '甲交出短剑。');
  assert.equal(result.extractionText, '甲交出短剑。');
  assert.equal(result.original, '甲交出短剑。(((ILBM)))');
});

test('display hook filters rendering input only and is idempotently registered', () => {
  const formatter = fakeFormatter();
  assert.equal(registerDisplayFilter(formatter).ok, true);
  assert.equal(registerDisplayFilter(formatter).duplicate, true);
  const hook = formatter.hooks[0].fn;
  assert.equal(hook('visible (((ILBM)))', { isSystem: false }), 'visible ');
  assert.equal(hook('system (((ILBM)))', { isSystem: true }), 'system (((ILBM)))');
});

test('prompt hook filters request copy without treating prompt history as new messages', async () => {
  const source = fakeEmitter();
  const calls = [];
  const options = { marker: '(((ILBM)))' };
  const reg = registerPromptFilter(source, { CHAT_COMPLETION_PROMPT_READY: 'ready' }, () => options, (data) => calls.push(data));
  assert.equal(reg.ok, true);
  const chat = [{ role: 'assistant', content: 'A (((ILBM)))' }, { role: 'user', content: 'ordinary' }];
  await source.emit('ready', { chat, dryRun: false });
  assert.equal(chat[0].content, 'A ');
  assert.equal(chat[1].content, 'ordinary');
  assert.equal(calls.length, 0);

  const dryChat = [{ role: 'assistant', content: 'B (((ILBM)))' }];
  await source.emit('ready', { chat: dryChat, dryRun: true });
  assert.equal(dryChat[0].content, 'B ');
  assert.equal(calls.length, 0);

  const multimodal = [{ role: 'user', content: [{ type: 'text', text: 'keep' }, { type: 'image_url', image_url: { url: 'https://example.invalid/img' } }] }];
  await source.emit('ready', { chat: multimodal, dryRun: false });
  assert.equal(multimodal[0].content[0].text, 'keep');
  assert.equal(multimodal[0].content[1].type, 'image_url');
  await source.emit('ready', { chat: 'bad', dryRun: false });
});

test('ILBM publishes additive series API without mutating ILB API', () => {
  const globalObject = { ILB: { api: Object.freeze({ version: '1.4' }) } };
  const api = { id: 'ILBM', version: '0.1.0' };
  assert.equal(registerILBSeriesAPI(globalObject, api).ok, true);
  assert.equal(globalObject.ILB.api.version, '1.4');
  assert.equal(globalObject.ILB_SERIES.memory, api);
});

test('ILBM global API exposes ILBR and marker processing independently of ILB', () => {
  const globalObject = {};
  const out = initializeILBM({ context: {}, eventSource: null, eventTypes: {}, globalObject });
  const published = publishGlobalApi(globalObject, {}, out);
  assert.equal(published.ok, true);
  assert.equal(globalObject.ILBM.id, 'ILBM');
  assert.equal(globalObject.ILBM.processMarker('x (((ILBM)))').triggered, true);
  assert.equal(globalObject.ILB, undefined);
  assert.equal(getILBMStatus().version, '0.1.1');
});

test('initialize degrades safely when host hooks are absent', () => {
  const out = initializeILBM({ context: {}, eventSource: null, eventTypes: {}, globalObject: {} });
  assert.equal(out.ok, true);
  assert.equal(out.integration.display.ok, false);
  assert.equal(out.integration.prompt.ok, false);
});
