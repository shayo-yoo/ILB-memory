const STYLE_ID = 'ilbm-debug-style';

export function mountILBMPanel({ api, documentObject = globalThis.document } = {}) {
  if (!documentObject?.body || !api) return { ok: false, reason: 'document or API unavailable' };
  if (documentObject.getElementById('ilbm-debug-root')) return { ok: true, duplicate: true };
  injectStyle(documentObject);
  const root = el(documentObject, 'section', { id: 'ilbm-debug-root', class: 'ilbm-debug-root', hidden: true });
  const toggle = el(documentObject, 'button', { class: 'ilbm-debug-toggle', type: 'button', textContent: 'ILBM' });
  const title = el(documentObject, 'h2', { textContent: 'ILB-Memory 调试面板' });
  const close = el(documentObject, 'button', { class: 'ilbm-debug-close', type: 'button', textContent: '×', title: '关闭' });
  const input = el(documentObject, 'textarea', { class: 'ilbm-debug-input', rows: '5', value: '测试文本 (((ILBM)))' });
  const test = el(documentObject, 'button', { type: 'button', textContent: '测试标记处理' });
  const refresh = el(documentObject, 'button', { type: 'button', textContent: '刷新状态' });
  const result = el(documentObject, 'pre', { class: 'ilbm-debug-result', textContent: '尚未测试。' });
  const status = el(documentObject, 'pre', { class: 'ilbm-debug-status', textContent: '' });
  const body = el(documentObject, 'div', { class: 'ilbm-debug-body' });
  const buttons = el(documentObject, 'div', { class: 'ilbm-debug-actions' });
  buttons.append(test, refresh);
  body.append(input, buttons, el(documentObject, 'h3', { textContent: '处理结果' }), result, el(documentObject, 'h3', { textContent: '运行状态' }), status);
  const head = el(documentObject, 'header', { class: 'ilbm-debug-head' });
  head.append(title, close);
  root.append(head, body);
  documentObject.body.append(toggle, root);

  const renderStatus = () => {
    try { status.textContent = JSON.stringify(api.status?.() ?? {}, null, 2); }
    catch (error) { status.textContent = `状态读取失败：${error?.message ?? error}`; }
  };
  const show = (visible) => { root.hidden = !visible; toggle.setAttribute('aria-expanded', String(visible)); };
  toggle.addEventListener('click', () => { show(root.hidden); renderStatus(); });
  close.addEventListener('click', () => show(false));
  refresh.addEventListener('click', renderStatus);
  test.addEventListener('click', () => {
    try {
      const value = api.processMarker(input.value);
      result.textContent = JSON.stringify(value, null, 2);
      renderStatus();
    } catch (error) {
      result.textContent = `处理失败：${error?.message ?? error}`;
    }
  });
  renderStatus();
  return { ok: true, root, toggle, close: () => show(false), destroy: () => { root.remove(); toggle.remove(); } };
}

function el(documentObject, tag, props = {}) {
  const node = documentObject.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'textContent') node.textContent = String(value);
    else if (key === 'value') node.value = String(value);
    else if (key === 'hidden') node.hidden = Boolean(value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, String(value));
  }
  return node;
}

function injectStyle(documentObject) {
  if (documentObject.getElementById(STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ilbm-debug-toggle{position:fixed;right:16px;bottom:112px;z-index:2147483000;border:1px solid #888;border-radius:999px;padding:8px 12px;background:#1d2530;color:#fff;cursor:pointer}
    .ilbm-debug-root{position:fixed;right:16px;bottom:160px;z-index:2147483001;width:min(520px,calc(100vw - 32px));max-height:min(75vh,680px);overflow:auto;background:var(--SmartThemeBlurTintColor,#20242b);color:var(--SmartThemeBodyColor,#eee);border:1px solid var(--SmartThemeBorderColor,#687080);border-radius:10px;box-shadow:0 12px 36px #0008;padding:0}
    .ilbm-debug-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #ffffff22;position:sticky;top:0;background:var(--SmartThemeBlurTintColor,#20242b)}
    .ilbm-debug-head h2{font-size:16px;margin:0}.ilbm-debug-close{font-size:20px;background:transparent;color:inherit;border:0;cursor:pointer}.ilbm-debug-body{padding:12px}.ilbm-debug-input{width:100%;box-sizing:border-box;background:#0003;color:inherit;border:1px solid #ffffff44;border-radius:6px;padding:8px}.ilbm-debug-actions{display:flex;gap:8px;margin:8px 0}.ilbm-debug-actions button{padding:6px 10px;cursor:pointer}.ilbm-debug-result,.ilbm-debug-status{white-space:pre-wrap;overflow:auto;max-height:220px;background:#0005;border-radius:6px;padding:8px;font-size:12px}
  `;
  documentObject.head?.append(style);
}
