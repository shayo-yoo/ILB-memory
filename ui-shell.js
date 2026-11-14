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
  body.append(statusText); head.append(title, close); root.append(head, body); documentObject.body.append(root);
  const closeShell = () => { try { root.close?.(); } catch {} root.removeAttribute('open'); root.hidden = true; root.setAttribute('hidden', ''); root.style.display = 'none'; };
  const openShell = () => { root.hidden = false; root.removeAttribute('hidden'); root.style.display = 'flex'; if (mobile) { try { root.showModal?.(); } catch {} } statusText.textContent = JSON.stringify(status(), null, 2); };
  close.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); closeShell(); }); root.addEventListener('cancel', closeShell); root.addEventListener('close', closeShell);
  const api = { root, head, body, open: openShell, close: closeShell, isOpen: () => root.hidden === false && (!mobile || root.open === true), update: () => { statusText.textContent = JSON.stringify(status(), null, 2); } };
  root.__ilbmShell = api; return api;
}
