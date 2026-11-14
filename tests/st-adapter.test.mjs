import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarkerResult, registerDisplayFilter, registerMessageCapture, registerPromptFilter } from '../lib/ilbm-bridge.js';

function emitter() {
  const map = new Map();
  return { map, on(name, fn) { map.set(name, fn); }, async run(name, ...args) { return map.get(name)?.(...args); } };
}

test('display formatter hook returns cleaned render text and leaves caller string unchanged', () => {
  const hooks=[];
  const formatter={stage:{BEFORE_REGEX:'beforeRegex'},order:{EARLY:10},addHook(fn,opts){hooks.push({fn,opts});}};
  assert.equal(registerDisplayFilter(formatter).ok,true);
  const raw='public (((ILBM)))';
  const shown=hooks[0].fn(raw,{isSystem:false});
  assert.equal(shown,'public ');
  assert.equal(raw,'public (((ILBM)))');
});

test('Chat Completion event filters copied request history but does not trigger extraction', async () => {
  const src=emitter(), stored={role:'assistant',content:'stored (((ILBM)))'};
  // ST ChatCompletion.getChat() returns a new flattened array and message objects.
  const requestChat=[{...stored}];
  const persisted=[];
  registerPromptFilter(src,{CHAT_COMPLETION_PROMPT_READY:'ready'},undefined,payload=>persisted.push(payload));
  await src.run('ready',{chat:requestChat,dryRun:false});
  assert.equal(requestChat[0].content,'stored ');
  assert.equal(stored.content,'stored (((ILBM)))');
  assert.equal(persisted.length,0);
});

test('GENERATE_AFTER_DATA filters only prompt/input and never emits memory callbacks', async () => {
  const src=emitter(), seen=[];
  registerPromptFilter(src,{GENERATE_AFTER_DATA:'afterData'},undefined,payload=>seen.push(payload));
  const data={prompt:'x (((ILBM)))',other:'untouched'};
  await src.run('afterData',data,false);
  assert.equal(data.prompt,'x ');
  assert.equal(data.other,'untouched');
  assert.equal(seen.length,0);
  const preview={input:'preview (((ILBM)))'};
  await src.run('afterData',preview,true);
  assert.equal(preview.input,'preview ');
  assert.equal(seen.length,0);
});

test('MESSAGE_RECEIVED captures only the new assistant message with source key', () => {
  const src=emitter(), seen=[];
  registerMessageCapture(src,'received',()=>({chatId:'c1',marker:'(((ILBM)))',getChat:()=>[
    {is_user:true,mes:'user (((ILBM)))'},
    {is_user:false,mes:'assistant (((ILBM)))',swipe_id:2},
  ]}),payload=>seen.push(payload));
  src.map.get('received')(0,'user');
  src.map.get('received')(1,'normal');
  assert.equal(seen.length,1);
  assert.equal(seen[0].message.mes,'assistant (((ILBM)))');
  assert.match(seen[0].sourceKey,/^ilbm:c1:1:2:[0-9a-f]+$/);
});

test('bad generation data and exceptions fail open', async () => {
  const src=emitter();
  registerPromptFilter(src,{GENERATE_AFTER_DATA:'afterData'},()=>({marker:'['}),()=>{throw new Error('storage failed');});
  const bad={prompt:'keep (((ILBM)))'};
  await src.run('afterData',bad,false);
  assert.equal(bad.prompt,'keep (((ILBM)))');
  await src.run('afterData',null,false);
  assert.equal(createMarkerResult(null).ok,false);
});
