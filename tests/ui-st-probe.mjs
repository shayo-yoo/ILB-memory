import { openStPage } from './st-cdp.mjs';
process.env.ST_URL = 'http://127.0.0.1:8001/';
process.env.CDP_PORT = '9223';
const page = await openStPage();
await page.send('Runtime.enable');
await page.send('Page.enable');
await page.send('Network.enable');
await page.send('Network.setCacheDisabled', { cacheDisabled: true });
await page.send('Page.reload', { ignoreCache: true });
for (let i = 0; i < 40; i += 1) {
  if (await page.evaluate('Boolean(globalThis.SillyTavern?.getContext && globalThis.ILBM)')) break;
  await new Promise(resolve => setTimeout(resolve, 500));
}
const report = await page.evaluate(`(() => {
  const toggle = document.querySelector('#ilbm-debug-root')?.previousElementSibling;
  const root = document.querySelector('#ilbm-debug-root');
  const api = globalThis.ILBM;
  if (!toggle || !root || !api) return { ready: false, toggle: !!toggle, root: !!root, api: !!api };
  toggle.click();
  const input = root.querySelector('.ilbm-debug-input');
  const test = [...root.querySelectorAll('button')].find(x => x.textContent.trim() === '测试标记处理');
  input.value = '探针 (((ILBM)))';
  test.click();
  return { ready: true, version: api.version, visible: root.hidden === false, result: root.querySelector('.ilbm-debug-result')?.textContent ?? '', status: root.querySelector('.ilbm-debug-status')?.textContent ?? '' };
})()`);
console.log(JSON.stringify(report));
page.close();
if (!report.ready || report.version !== '0.1.0' || !report.visible || !report.result.includes('triggered') || report.result.includes('"triggered": false')) process.exit(1);
