import { createRequire } from 'node:module';

const ST_DIR = process.env.ST_DIR ?? 'D:/1/APP/SillyTavern';
const CDP_PORT = process.env.CDP_PORT ?? '9222';
const ST_URL = process.env.ST_URL ?? 'http://127.0.0.1:8000/';

function loadWs() {
  const require = createRequire(`${ST_DIR.replace(/\\/g, '/')}/package.json`);
  return require('ws');
}

export async function openStPage() {
  const WebSocket = loadWs();
  const endpoint = `http://127.0.0.1:${CDP_PORT}`;
  const res = await fetch(`${endpoint}/json/new?${encodeURIComponent(ST_URL)}`, { method: 'PUT' });
  if (!res.ok) throw new Error(`CDP new page failed: ${res.status}`);
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  let seq = 0;
  const pending = new Map();
  ws.on('message', raw => {
    const msg = JSON.parse(raw.toString());
    if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise(resolve => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description ?? result.result.exceptionDetails.text);
    return result.result?.result?.value;
  };
  return { send, evaluate, close: () => ws.close() };
}
