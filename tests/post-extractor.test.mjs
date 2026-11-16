import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../lib/memory-store.js';
import { createEntityResolver } from '../lib/entity-resolver.js';
import { createPostExtractor, buildPostTranscript, messageExtractionKey } from '../lib/post-extractor.js';

function setup({ fetchImpl, settings = {} } = {}) {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const store = createMemoryStore({ storage, chatId: 'post-test' });
  store.setSettings({
    extractionMode: 'post',
    postApi: { baseUrl: 'https://api.example/v1', model: 'test-model', contextRounds: 2, timeoutMs: 3000, ...settings },
  });
  const resolver = createEntityResolver({ list: () => store.inspect().entities, register: (input) => store.registerEntity(input) });
  const extractor = createPostExtractor({
    store,
    getSettings: () => store.inspect().settings,
    getChat: () => [
      { is_user: true, mes: '甲拿起短剑。' },
      { is_user: false, mes: '甲把短剑交给乙。' },
    ],
    getEntities: () => store.inspect().entities,
    fetchImpl,
    resolveEntities: (names) => resolver.resolve(names),
  });
  return { store, extractor, resolver };
}

function jsonResponse(events) {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({ events }) } }] }),
  });
}

test('模式 B：成功提取候选事件，使用短名解析实体并保存为待确认', async () => {
  const { store, extractor } = setup({
    fetchImpl: jsonResponse([{ text: '乙获得短剑', entities: ['乙', '短剑'], action: '获得' }]),
    settings: { timeoutMs: 5000 },
  });
  const result = await extractor.extract({ floor: 1, sourceMessageId: 'm1', swipeId: 0 });
  assert.equal(result.ok, true);
  const records = store.inspect().records;
  assert.equal(records.length, 1);
  assert.equal(records[0].status, 'pending');
  assert.equal(records[0].extractionMode, 'post');
  assert.equal(records[0].entityIds.length, 2);
  assert.ok(records[0].stateChanges.length > 0);
  assert.equal(records[0].stateChanges[0].entityId, records[0].entityIds[1]);
  assert.equal(store.inspect().entities.length, 2);
  // 待确认记录不参与状态计算。
  assert.equal(store.inspect().records[0].valid, false);
});

test('模式 B：同一消息只提取一次', async () => {
  let calls = 0;
  const { extractor } = setup({
    fetchImpl: async () => { calls += 1; return { ok: true, json: async () => ({ choices: [{ message: { content: '{"events":[]}' } }] }) }; },
    settings: { timeoutMs: 5000 },
  });
  await extractor.extract({ floor: 1, sourceMessageId: 'same', swipeId: 0 });
  const second = await extractor.extract({ floor: 1, sourceMessageId: 'same', swipeId: 0 });
  assert.equal(second.skipped, true);
  assert.equal(calls, 1);
});

test('模式 B：3 秒软超时先返回，晚到结果仍写入存储', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetchImpl = async () => {
    await gate;
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ events: [{ text: '甲获得短剑', entities: ['甲', '短剑'], action: '获得' }] }) } }] }) };
  };
  const { store, extractor } = setup({ fetchImpl, settings: { timeoutMs: 5 } });
  const result = await extractor.extract({ floor: 2, sourceMessageId: 'late', swipeId: 0 });
  assert.equal(result.timedOut, true);
  assert.equal(store.inspect().records.length, 0, '超时时本轮不等待写入');
  release();
  await result.pending;
  assert.equal(store.inspect().records.length, 1, '晚到结果仍写入存储');
  assert.equal(store.inspect().records[0].status, 'pending');
});

test('模式 B：未配置 API 或解析失败时写失败日志且不阻塞', async () => {
  const missing = setup({ fetchImpl: jsonResponse([]), settings: { baseUrl: '' } });
  const missingResult = await missing.extractor.extract({ floor: 1, sourceMessageId: 'n1' });
  assert.equal(missingResult.ok, false);
  assert.match(missingResult.error, /未配置/);
  assert.ok(missing.store.inspect().failures.some((failure) => failure.stage === 'post'));

  const broken = setup({
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '没有 JSON' } }] }) }),
    settings: { timeoutMs: 5000 },
  });
  const brokenResult = await broken.extractor.extract({ floor: 1, sourceMessageId: 'n2' });
  assert.equal(brokenResult.ok, false);
  assert.ok(broken.store.inspect().failures.some((failure) => failure.stage === 'post'));
});

test('模式 B：直出模式不触发外部调用', async () => {
  let calls = 0;
  const { store, extractor } = setup({ fetchImpl: async () => { calls += 1; return { ok: true, json: async () => ({}) }; } });
  store.setSettings({ extractionMode: 'direct' });
  const result = await extractor.extract({ floor: 1, sourceMessageId: 'd1' });
  assert.equal(result.skipped, true);
  assert.equal(calls, 0);
});

test('事后提取辅助函数：消息键与上下文档数', () => {
  assert.equal(messageExtractionKey({ sourceMessageId: 'm', swipeId: 2, floor: 3 }), 'm#2');
  assert.equal(messageExtractionKey({ floor: 3 }), 'floor:3#0');
  const chat = [
    { is_user: true, mes: 'u0' }, { is_user: false, mes: 'a0' },
    { is_user: true, mes: 'u1' }, { is_user: false, mes: 'a1' },
    { is_user: true, mes: 'u2' }, { is_user: false, mes: 'a2' },
  ];
  const transcript = buildPostTranscript(chat, { floor: 5, rounds: 2 });
  assert.ok(transcript.includes('用户：u1'));
  assert.ok(transcript.includes('角色：a2'));
  assert.ok(!transcript.includes('u0'));
});
