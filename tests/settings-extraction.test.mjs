import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryState, invalidateFromFloor, invalidateSwipeBranch, markExtraction } from '../lib/memory-model.js';
import { createMemoryStore } from '../lib/memory-store.js';
import { exportMemory, importMemory } from '../lib/memory-backup.js';

test('设置包含提取模式、注入风格与模式 B 配置的默认值', () => {
  const state = createMemoryState();
  assert.equal(state.settings.extractionMode, 'direct');
  assert.equal(state.settings.injectionStyle, 'compact');
  assert.equal(state.settings.postApi.contextRounds, 2);
  assert.equal(state.settings.postApi.timeoutMs, 3000);
  assert.equal(state.settings.postApi.baseUrl, '');
});

test('setSettings 深合并 postApi 并校验枚举', () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const store = createMemoryStore({ storage, chatId: 'settings-test' });
  store.setSettings({ extractionMode: 'post', injectionStyle: 'narrative', postApi: { baseUrl: 'https://api.example/v1' } });
  store.setSettings({ postApi: { model: 'm1' } });
  const settings = store.inspect().settings;
  assert.equal(settings.extractionMode, 'post');
  assert.equal(settings.injectionStyle, 'narrative');
  assert.equal(settings.postApi.baseUrl, 'https://api.example/v1');
  assert.equal(settings.postApi.model, 'm1');
  // 非法值回退默认，不写坏数据。
  store.setSettings({ extractionMode: 'bogus', injectionStyle: 'bogus' });
  assert.equal(store.inspect().settings.extractionMode, 'direct');
  assert.equal(store.inspect().settings.injectionStyle, 'compact');
});

test('提取标记去重并随备份 roundtrip', () => {
  let state = createMemoryState();
  state = markExtraction(state, { key: 'm1#0', floor: 1, sourceMessageId: 'm1', mode: 'post', status: 'done', at: 1 });
  state = markExtraction(state, { key: 'm1#0', floor: 1, sourceMessageId: 'm1', mode: 'post', status: 'failed', reason: 'x', at: 2 });
  assert.equal(state.extractionMarks.length, 1);
  assert.equal(state.extractionMarks[0].status, 'failed');

  const backup = exportMemory(state);
  const imported = importMemory(backup);
  assert.equal(imported.ok, true);
  assert.equal(imported.state.extractionMarks[0].key, 'm1#0');
});

test('旧版 schema 1 备份导入后使用新设置默认值', () => {
  const result = importMemory({ kind: 'ilbm-memory', schema_version: 1, memory: { entities: [{ id: 'e1', name: '短剑', type: 'item' }], records: [] } });
  assert.equal(result.ok, true);
  assert.equal(result.state.settings.extractionMode, 'direct');
  assert.deepEqual(result.state.extractionMarks, []);
});

test('编辑楼层与切换 Swipe 作废对应提取标记，允许重新提取', () => {
  let state = createMemoryState();
  state = markExtraction(state, { key: 'm1#0', floor: 1, sourceMessageId: 'm1', swipeId: 0, status: 'done' });
  state = markExtraction(state, { key: 'm2#0', floor: 2, sourceMessageId: 'm2', swipeId: 0, status: 'done' });
  state = markExtraction(state, { key: 'm2#1', floor: 2, sourceMessageId: 'm2', swipeId: 1, status: 'done' });

  const edited = invalidateFromFloor(state, 2);
  assert.deepEqual(edited.extractionMarks.map((mark) => mark.key), ['m1#0']);

  const swiped = invalidateSwipeBranch(state, { sourceMessageId: 'm2', selectedSwipeId: 1 });
  assert.deepEqual(swiped.extractionMarks.map((mark) => mark.key).sort(), ['m1#0', 'm2#1']);
});
