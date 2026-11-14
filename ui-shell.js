export function section(documentObject, title, ...children) { const box = documentObject.createElement('section'); box.className = 'ilbm-shell-section'; const heading = documentObject.createElement('h3'); heading.textContent = title; box.append(heading, ...children); return box; }



export function mountILBMShell({ version = '0.1.0', status = () => ({}), api: contentApi = null, documentObject = globalThis.document, mobile = false } = {}) {
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
  const meta = documentObject.createElement('p'); meta.className = 'ilbm-shell-meta'; meta.textContent = 'ILBM 记忆管理';
  const feature = documentObject.createElement('div'); feature.className = 'ilbm-shell-feature';
  const markerHelp = documentObject.createElement('button'); markerHelp.textContent = '标记测试说明'; markerHelp.title = '(((ILBM:{内容}))) 会触发候选记忆处理，旧的 (((ILBM))) 也兼容';
  const markerInput = documentObject.createElement('textarea'); markerInput.value = '测试文本 (((ILBM:短剑交给甲)))'; markerInput.rows = 3;
  const markerResult = documentObject.createElement('pre'); markerResult.textContent = '尚未测试';
  const markerRun = documentObject.createElement('button'); markerRun.textContent = '测试标记';
  const memoryHelp = documentObject.createElement('button'); memoryHelp.textContent = '记忆说明'; memoryHelp.title = '显示当前状态和历史回放；默认只预览，不自动注入模型';
  const memoryResult = documentObject.createElement('pre'); memoryResult.textContent = '尚未读取';
  const memoryRun = documentObject.createElement('button'); memoryRun.textContent = '读取记忆状态';
  feature.append(section(documentObject, '标记处理', markerHelp, markerInput, markerRun, markerResult), section(documentObject, '记忆状态与回放', memoryHelp, memoryRun, memoryResult));
  body.append(meta, feature, statusText); head.append(title, close); root.append(head, body); documentObject.body.append(root);
  const style = documentObject.createElement('style'); style.textContent = `.ilbm-shell{box-sizing:border-box;color:#f5f7fb;background:#171d27;border:1px solid #7f95ad;border-radius:10px;box-shadow:0 12px 40px #0009;font-family:system-ui,sans-serif}.ilbm-shell-desktop{position:fixed;right:20px;bottom:80px;width:min(560px,calc(100vw - 40px));max-height:75vh;z-index:2147483000}.ilbm-shell-mobile{position:fixed;inset:0;width:100%;height:100dvh;max-width:none;max-height:none;margin:0;border:0;border-radius:0;padding:0;flex-direction:column}.ilbm-shell-mobile::backdrop{background:#000b}.ilbm-shell-head{display:flex;align-items:center;justify-content:space-between;padding:14px;background:#202c3b;border-bottom:1px solid #8da2bb}.ilbm-shell-close{appearance:none!important;background:#9e2f3b!important;color:#fff!important;border:1px solid #ffc3ca!important;border-radius:6px!important;font-size:22px;min-width:42px;min-height:38px;cursor:pointer}.ilbm-shell-close:hover{background:#c74455!important}.ilbm-shell-body{padding:16px;overflow:auto}.ilbm-shell-feature{display:flex;flex-direction:column;gap:12px}.ilbm-shell-section{display:flex;flex-direction:column;gap:8px;border-top:1px solid #8194aa;padding-top:12px}.ilbm-shell-section h3{margin:0;color:#fff}.ilbm-shell-section button{appearance:none!important;background:#2d4864!important;color:#fff!important;border:1px solid #b5c8dc!important;border-radius:6px!important;padding:8px 12px!important;min-height:38px;cursor:pointer}.ilbm-shell-section button:hover{background:#47739d!important}.ilbm-shell-section textarea{box-sizing:border-box;width:100%;background:#0b111a!important;color:#fff!important;border:1px solid #98abc0!important;padding:8px;border-radius:6px}.ilbm-shell-status{white-space:pre-wrap;color:#f5f7fb;background:#0b111a;padding:12px;border-radius:6px}.ilbm-shell-meta{color:#dce6f2}`; documentObject.head?.append(style);
  markerRun.addEventListener('click', () => { try { markerResult.textContent = JSON.stringify(contentApi?.processMarker?.(markerInput.value) ?? { ok: false, error: 'ILBM API unavailable' }, null, 2); } catch (error) { markerResult.textContent = `失败：${error?.message ?? error}`; } });
  memoryRun.addEventListener('click', () => { try { memoryResult.textContent = JSON.stringify(globalThis.ILBM_MEMORY?.inspect?.() ?? { error: 'memory API unavailable' }, null, 2); } catch (error) { memoryResult.textContent = `失败：${error?.message ?? error}`; } });
  markerHelp.addEventListener('click', () => { markerResult.textContent = '语法：(((ILBM:{内容})))；例如 (((ILBM:短剑交给甲)))。旧格式 (((ILBM))) 仍兼容。'; });
  memoryHelp.addEventListener('click', () => { memoryResult.textContent = '记忆状态由有效事件重算；回放按活跃窗口/回放窗口设置预览。AI 候选必须先预览，再确认导入。'; });
  const closeShell = () => { try { root.close?.(); } catch {} root.removeAttribute('open'); root.hidden = true; root.setAttribute('hidden', ''); root.style.display = 'none'; };
  const openShell = () => { root.hidden = false; root.removeAttribute('hidden'); root.style.display = 'flex'; if (mobile) { try { root.showModal?.(); } catch {} } statusText.textContent = JSON.stringify(status(), null, 2); };
  close.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); closeShell(); }); root.addEventListener('cancel', closeShell); root.addEventListener('close', closeShell);
  const api = { root, head, body, open: openShell, close: closeShell, isOpen: () => root.hidden === false && (!mobile || root.open === true), update: () => { statusText.textContent = JSON.stringify(status(), null, 2); } };
  root.__ilbmShell = api; return api;
}
