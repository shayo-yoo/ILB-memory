export function mountILBMShell({ version = '0.1.0', status = () => ({}), documentObject = globalThis.document, mobile = false } = {}) {
  if (!documentObject?.body) return { ok: false, reason: 'document unavailable' };
  const existing = documentObject.getElementById('ilbm-shell');
  if (existing?.__ilbmShell) return existing.__ilbmShell;
  const root = documentObject.createElement(mobile ? 'dialog' : 'section');
  root.id = 'ilbm-shell'; root.className = mobile ? 'ilbm-shell ilbm-shell-mobile' : 'ilbm-shell ilbm-shell-desktop';
  root.hidden = true; root.setAttribute('hidden', ''); root.style.cssText = mobile ? 'display:none' : 'display:none';
  const head = documentObject.createElement('header'); head.className = 'ilbm-shell-head';
  const title = documentObject.createElement('strong'); title.textContent = `ILB-Memory ${version}`;
  const close = documentObject.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', '关闭'); close.className = 'ilbm-shell-close';
  const body = documentObject.createElement('main'); body.className = 'ilbm-shell-body';
  const statusText = documentObject.createElement('pre'); statusText.className = 'ilbm-shell-status'; statusText.textContent = 'ILBM 已加载，面板功能正在接入。';
  const meta = documentObject.createElement('p'); meta.className = 'ilbm-shell-meta'; meta.textContent = '基础外壳已加载；后续功能会在这里显示。';
  body.append(meta, statusText); head.append(title, close); root.append(head, body); documentObject.body.append(root);
  const style = documentObject.createElement('style'); style.textContent = `.ilbm-shell{box-sizing:border-box;color:#f5f7fb;background:#171d27;border:1px solid #7f95ad;border-radius:10px;box-shadow:0 12px 40px #0009;font-family:system-ui,sans-serif}.ilbm-shell-desktop{position:fixed;right:20px;bottom:80px;width:min(560px,calc(100vw - 40px));max-height:75vh;z-index:2147483000}.ilbm-shell-mobile{position:fixed;inset:0;width:100%;height:100dvh;max-width:none;max-height:none;margin:0;border:0;border-radius:0;padding:0;flex-direction:column}.ilbm-shell-mobile::backdrop{background:#000b}.ilbm-shell-head{display:flex;align-items:center;justify-content:space-between;padding:14px;background:#202c3b;border-bottom:1px solid #8da2bb}.ilbm-shell-close{appearance:none!important;background:#9e2f3b!important;color:#fff!important;border:1px solid #ffc3ca!important;border-radius:6px!important;font-size:22px;min-width:42px;min-height:38px;cursor:pointer}.ilbm-shell-close:hover{background:#c74455!important}.ilbm-shell-body{padding:16px;overflow:auto}.ilbm-shell-status{white-space:pre-wrap;color:#f5f7fb;background:#0b111a;padding:12px;border-radius:6px}.ilbm-shell-meta{color:#dce6f2}`; documentObject.head?.append(style);
  const closeShell = () => { try { root.close?.(); } catch {} root.removeAttribute('open'); root.hidden = true; root.setAttribute('hidden', ''); root.style.display = 'none'; };
  const openShell = () => { root.hidden = false; root.removeAttribute('hidden'); root.style.display = 'flex'; if (mobile) { try { root.showModal?.(); } catch {} } statusText.textContent = JSON.stringify(status(), null, 2); };
  close.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); closeShell(); }); root.addEventListener('cancel', closeShell); root.addEventListener('close', closeShell);
  const api = { root, head, body, open: openShell, close: closeShell, isOpen: () => root.hidden === false && (!mobile || root.open === true), update: () => { statusText.textContent = JSON.stringify(status(), null, 2); } };
  root.__ilbmShell = api; return api;
}
