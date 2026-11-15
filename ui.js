const STYLE_ID = 'ilbm-debug-style';

export function mountILBMPanel({ api, memory, documentObject = globalThis.document, showToggle = false, mobile = false } = {}) {
  if (!documentObject?.body || !api) return { ok: false, reason: 'document or API unavailable' };
  const existingRoot = documentObject.getElementById('ilbm-debug-root');
  if (existingRoot) {
    const existingToggle = documentObject.querySelector?.('.ilbm-debug-toggle') ?? null;
    const isMobileRoot = existingRoot.tagName === 'DIALOG' || existingRoot.classList?.contains?.('ilbm-debug-mobile');
    const openExisting = () => { existingRoot.hidden = false; existingRoot.removeAttribute?.('hidden'); if (existingRoot.style == null) existingRoot.style = {}; existingRoot.style.display = isMobileRoot ? 'flex' : 'block'; if (isMobileRoot && typeof existingRoot.showModal === 'function' && !existingRoot.open) existingRoot.showModal(); existingToggle?.setAttribute('aria-expanded', 'true'); };
    const closeExisting = () => { try { existingRoot.close?.(); } catch {} existingRoot.removeAttribute?.('open'); existingRoot.hidden = true; existingRoot.setAttribute?.('hidden', ''); if (existingRoot.style == null) existingRoot.style = {}; existingRoot.style.display = 'none'; };
    closeExisting();
    return { ok: true, duplicate: true, root: existingRoot, toggle: existingToggle, open: openExisting, close: closeExisting };
  }
  injectStyle(documentObject);
  const root = el(documentObject, mobile ? 'dialog' : 'section', { id: 'ilbm-debug-root', class: mobile ? 'ilbm-debug-root ilbm-debug-mobile' : 'ilbm-debug-root', hidden: true, style: 'display:none' });
  const toggle = el(documentObject, 'button', { class: 'ilbm-debug-toggle', type: 'button', textContent: 'ILBM' });
  const title = el(documentObject, 'h2', { textContent: 'ILB-Memory 调试面板' });
  const close = el(documentObject, 'button', { class: 'ilbm-debug-close', type: 'button', textContent: '×', title: '关闭' });
  const input = el(documentObject, 'textarea', { class: 'ilbm-debug-input', rows: '4', value: '测试文本 (((ILBM)))' });
  const entityName = el(documentObject, 'input', { class: 'ilbm-debug-input', value: '短剑', placeholder: '实体名称' });
  const entityType = el(documentObject, 'select', {});
  for (const [value, label] of [['item','物品'],['person','人物'],['place','地点'],['organization','组织'],['other','其他']]) entityType.append(el(documentObject, 'option', { value, textContent: label }));
  const recordText = el(documentObject, 'input', { class: 'ilbm-debug-input', value: '铁匠将短剑交给甲。', placeholder: '事件描述' });
  const candidates = el(documentObject, 'textarea', { class: 'ilbm-debug-input', rows: '5', value: '[{"text":"铁匠将短剑交给甲。","kind":"fact"}]' });
  const importCandidates = el(documentObject, 'button', { type: 'button', textContent: '导入候选事件 JSON' });
  const previewCandidates = el(documentObject, 'button', { type: 'button', textContent: '预览候选事件（不保存）' });
  const candidateResponse = el(documentObject, 'textarea', { class: 'ilbm-debug-input', rows: '5', value: '```json\n[{"text":"AI 返回的事件","kind":"fact"}]\n```' });
  const parseResponse = el(documentObject, 'button', { type: 'button', textContent: '解析 AI 候选响应' });
  const extractInput = el(documentObject, 'textarea', { class: 'ilbm-debug-input', rows: '4', value: '请输入需要交给 AI 的正文（当前只做接口模拟，不会自动调用模型）' });
  const simulateExtract = el(documentObject, 'button', { type: 'button', textContent: '模拟 AI 提取' });
  const recordFloor = el(documentObject, 'input', { class: 'ilbm-debug-input', type: 'number', value: '1', min: '0' });
  const sourceMessageId = el(documentObject, 'input', { class: 'ilbm-debug-input', value: '', placeholder: '消息 ID（可选）' });
  const swipeId = el(documentObject, 'input', { class: 'ilbm-debug-input', type: 'number', value: '0', min: '0' });
  const test = el(documentObject, 'button', { type: 'button', textContent: '测试标记处理' });
  const addEntity = el(documentObject, 'button', { type: 'button', textContent: '添加实体' });
  const addRecord = el(documentObject, 'button', { type: 'button', textContent: '添加事件' });
  const invalidateFloor = el(documentObject, 'button', { type: 'button', textContent: '从此楼层作废后续记录' });
  const invalidateSwipe = el(documentObject, 'button', { type: 'button', textContent: '保留指定 Swipe，作废其它分支' });
  const replayLayers = el(documentObject, 'input', { class: 'ilbm-debug-input', type: 'number', value: '10', min: '0', max: '10000' });
  const activeLayers = el(documentObject, 'input', { class: 'ilbm-debug-input', type: 'number', value: '5', min: '0', max: '1000' });
  const refresh = el(documentObject, 'button', { type: 'button', textContent: '刷新状态' });
  const copyStatus = el(documentObject, 'button', { type: 'button', textContent: '复制状态' });
  const memoryQuery = el(documentObject, 'input', { class: 'ilbm-debug-input', placeholder: '筛选实体/事件/楼层…' });
  const validOnly = el(documentObject, 'input', { type: 'checkbox', checked: true });
  const clearFailures = el(documentObject, 'button', { type: 'button', textContent: '清除失败日志' });
  const exportBackup = el(documentObject, 'button', { type: 'button', textContent: '导出记忆备份' });
  const importBackup = el(documentObject, 'button', { type: 'button', textContent: '导入记忆备份' });
  const backupInput = el(documentObject, 'textarea', { class: 'ilbm-debug-input', rows: '3', placeholder: '粘贴 ILBM 记忆备份 JSON；导入会替换当前聊天记忆' });
  const removeId = el(documentObject, 'input', { class: 'ilbm-debug-input', placeholder: '要删除的记录/实体 ID' });
  const removeRecord = el(documentObject, 'button', { type: 'button', textContent: '删除记录' });
  const removeEntity = el(documentObject, 'button', { type: 'button', textContent: '删除实体' });
  const result = el(documentObject, 'pre', { class: 'ilbm-debug-result', textContent: '尚未测试。' });
  const memoryOutput = el(documentObject, 'pre', { class: 'ilbm-debug-result', textContent: '' });
  const memoryReadable = el(documentObject, 'div', { class: 'ilbm-debug-readable', textContent: '还没有记忆数据。' });
  const status = el(documentObject, 'pre', { class: 'ilbm-debug-status', textContent: '' });
  const failures = el(documentObject, 'div', { class: 'ilbm-debug-readable', textContent: '暂无失败日志。' });
  const injection = el(documentObject, 'pre', { class: 'ilbm-debug-result', textContent: '尚未生成记忆注入预览。' });
  const previewInjection = el(documentObject, 'button', { type: 'button', textContent: '预览记忆注入文本' });
  const enableInjection = el(documentObject, 'button', { type: 'button', textContent: '开启记忆注入' });
  const applyInjection = el(documentObject, 'button', { type: 'button', textContent: '立即应用注入' });
  const disableInjection = el(documentObject, 'button', { type: 'button', textContent: '关闭并清除注入' });
  const body = el(documentObject, 'div', { class: 'ilbm-debug-body' });
  const buttons = el(documentObject, 'div', { class: 'ilbm-debug-actions' });
  const mobileNav = mobile ? el(documentObject, 'nav', { class: 'ilbm-debug-mobile-nav', 'aria-label': 'ILBM 页面导航' }) : null;
  buttons.append(test, refresh, copyStatus, clearFailures, exportBackup);
  const memoryActions = el(documentObject, 'div', { class: 'ilbm-debug-actions' }); memoryActions.append(addEntity, addRecord);
  body.append(input, buttons, el(documentObject, 'h3', { textContent: '标记处理结果' }), result, el(documentObject, 'h3', { textContent: '手动记忆测试' }), entityName, entityType, recordText, recordFloor, sourceMessageId, swipeId, memoryQuery, el(documentObject, 'label', { textContent: '只看有效记录' }), validOnly, candidates, previewCandidates, importCandidates, candidateResponse, parseResponse, extractInput, simulateExtract, el(documentObject, 'label', { textContent: '活跃窗口层数' }), activeLayers, el(documentObject, 'label', { textContent: '回放窗口层数' }), replayLayers, memoryActions, backupInput, importBackup, previewInjection, enableInjection, applyInjection, disableInjection, removeId, el(documentObject, 'div', { class: 'ilbm-debug-actions' }), el(documentObject, 'h3', { textContent: '可读记忆视图' }), memoryReadable, el(documentObject, 'h3', { textContent: '原始数据' }), memoryOutput, el(documentObject, 'h3', { textContent: '失败日志' }), failures, el(documentObject, 'h3', { textContent: '记忆注入预览' }), injection, el(documentObject, 'h3', { textContent: '运行状态' }), status);
  const invalidationActions = body.children[body.children.length - 2];
  invalidationActions.append(invalidateFloor, invalidateSwipe, removeRecord, removeEntity);
  const head = el(documentObject, 'header', { class: 'ilbm-debug-head' }); head.append(title, close); close.addEventListener('click', () => show(false)); root.append(head, body); if (mobileNav) { for (const [label, target] of [['状态','status'],['实体','entities'],['事件','records'],['设置','settings']]) { const navButton = el(documentObject, 'button', { type: 'button', textContent: label, 'data-section': target }); navButton.addEventListener('click', () => { root.querySelectorAll?.('[data-debug-section]')?.forEach(node => { node.hidden = node.getAttribute('data-debug-section') !== target; }); }); mobileNav.append(navButton); } root.append(mobileNav); } if (showToggle) documentObject.body.append(toggle); else { toggle.hidden = true; toggle.setAttribute?.('hidden', ''); if (toggle.style == null) toggle.style = {}; toggle.style.display = 'none'; toggle.remove?.(); } documentObject.body.append(root);
  const render = () => { try { const currentStatus = api.status?.() ?? {}; status.textContent = JSON.stringify(currentStatus, null, 2); const data = currentStatus.memory ?? memory?.inspect?.() ?? {}; const query = String(memoryQuery.value ?? '').trim().toLowerCase(); const filtered = { ...data, entities: (data.entities ?? []).filter(entity => !query || `${entity.name} ${entity.type}`.toLowerCase().includes(query)), records: (data.records ?? []).filter(record => (!validOnly.checked || record.valid !== false) && (!query || `${record.text} ${record.floor} ${record.sourceMessageId ?? ''}`.toLowerCase().includes(query))) }; memoryOutput.textContent = JSON.stringify(filtered, null, 2); memoryReadable.innerHTML = renderReadable(documentObject, filtered); failures.textContent = (data.failures?.length ? data.failures.map(item => `第 ${item.floor ?? '?'} 层：${item.reason}（${item.stage}）`).join('\n') : '暂无失败日志。'); } catch (error) { status.textContent = `读取失败：${error?.message ?? error}`; } };
  const show = visible => { root.hidden = !visible; if (root.style == null) root.style = {}; if (visible) { root.removeAttribute?.('hidden'); root.style.display = mobile ? 'flex' : 'block'; if (mobile && typeof root.showModal === 'function' && !root.open) root.showModal(); } else { root.setAttribute?.('hidden', ''); root.style.display = 'none'; if (mobile && typeof root.close === 'function' && root.open) root.close(); } toggle.setAttribute('aria-expanded', String(visible)); };
  const forceClose = () => { try { root.close?.(); } catch {} root.removeAttribute?.('open'); root.hidden = true; root.setAttribute?.('hidden', ''); if (root.style == null) root.style = {}; root.style.display = 'none'; toggle.setAttribute('aria-expanded', 'false'); };
  const closePanel = event => { event?.preventDefault?.(); event?.stopPropagation?.(); forceClose(); };
  toggle.addEventListener('click', () => { show(root.hidden); render(); }); close.addEventListener('click', closePanel); root.addEventListener?.('cancel', closePanel); root.addEventListener?.('close', forceClose); refresh.addEventListener('click', render); copyStatus.addEventListener('click', async () => { try { const text = status.textContent; if (documentObject.defaultView?.navigator?.clipboard?.writeText) await documentObject.defaultView.navigator.clipboard.writeText(text); else { const area = documentObject.createElement('textarea'); area.value = text; documentObject.body.append(area); area.select?.(); documentObject.execCommand?.('copy'); area.remove(); } } catch { /* clipboard unavailable; visible status remains */ } }); memoryQuery.addEventListener('input', render); validOnly.addEventListener('change', render); exportBackup.addEventListener('click', () => { try { const data = memory?.exportBackup?.() ?? {}; injection.textContent = JSON.stringify(data, null, 2); } catch (error) { injection.textContent = `导出失败：${error?.message ?? error}`; } }); importBackup.addEventListener('click', () => { try { const result = memory?.importBackup?.(JSON.parse(backupInput.value)); memoryOutput.textContent = JSON.stringify(result, null, 2); render(); } catch (error) { memoryOutput.textContent = `导入失败：${error?.message ?? error}`; } }); previewInjection.addEventListener('click', () => { try { injection.textContent = JSON.stringify(memory?.buildMemoryText?.({ tokenBudget: 2000 }) ?? {}, null, 2); } catch (error) { injection.textContent = `注入预览失败：${error?.message ?? error}`; } }); enableInjection.addEventListener('click', () => { const result = memory?.injection?.enable?.(); status.textContent = `记忆注入已${result ? '开启' : '关闭'}；请先预览再点击“立即应用注入”。`; render(); }); applyInjection.addEventListener('click', () => { try { status.textContent = JSON.stringify(memory?.injection?.apply?.() ?? {}, null, 2); render(); } catch (error) { status.textContent = `应用注入失败：${error?.message ?? error}`; } }); disableInjection.addEventListener('click', () => { status.textContent = JSON.stringify(memory?.injection?.disable?.() ?? {}, null, 2); render(); }); clearFailures.addEventListener('click', () => { try { memory?.clearFailures?.(); render(); } catch (error) { status.textContent = `清除失败：${error?.message ?? error}`; } });
  test.addEventListener('click', () => { try { result.textContent = JSON.stringify(api.processMarker(input.value), null, 2); render(); } catch (error) { result.textContent = `处理失败：${error?.message ?? error}`; } });
  addEntity.addEventListener('click', () => { try { memory?.registerEntity({ name: entityName.value, type: entityType.value }); render(); } catch (error) { memoryOutput.textContent = `添加实体失败：${error?.message ?? error}`; } });
  addRecord.addEventListener('click', () => { try { memory?.addRecord({ text: recordText.value, floor: Number(recordFloor.value), sourceMessageId: sourceMessageId.value || null, swipeId: Number(swipeId.value) || 0 }); render(); } catch (error) { memoryOutput.textContent = `添加事件失败：${error?.message ?? error}`; } });
  previewCandidates.addEventListener('click', () => { try { const parsed = JSON.parse(candidates.value); const result = memory?.previewCandidates(parsed, { floor: Number(recordFloor.value), sourceMessageId: sourceMessageId.value || null, swipeId: Number(swipeId.value) || 0 }); memoryOutput.textContent = JSON.stringify(result, null, 2); render(); } catch (error) { memoryOutput.textContent = `候选事件预览失败：${error?.message ?? error}`; } });
  importCandidates.addEventListener('click', () => { try { const parsed = JSON.parse(candidates.value); const result = memory?.importCandidates(parsed, { floor: Number(recordFloor.value), sourceMessageId: sourceMessageId.value || null, swipeId: Number(swipeId.value) || 0 }); memoryOutput.textContent = JSON.stringify(result, null, 2); render(); } catch (error) { memoryOutput.textContent = `候选事件 JSON 无法导入：${error?.message ?? error}`; } });
  parseResponse.addEventListener('click', () => { try { const result = memory?.importCandidateResponse(candidateResponse.value, { floor: Number(recordFloor.value), sourceMessageId: sourceMessageId.value || null, swipeId: Number(swipeId.value) || 0 }); memoryOutput.textContent = JSON.stringify(result, null, 2); render(); } catch (error) { memoryOutput.textContent = `AI 响应解析失败：${error?.message ?? error}`; } });
  simulateExtract.addEventListener('click', async () => { try { const result = await memory?.extractCandidates(extractInput.value); memoryOutput.textContent = JSON.stringify(result, null, 2); render(); } catch (error) { memoryOutput.textContent = `AI 提取接口失败：${error?.message ?? error}`; } });
  invalidateFloor.addEventListener('click', () => { try { memory?.invalidateFromMessage({ floor: Number(recordFloor.value), sourceMessageId: sourceMessageId.value || null }); render(); } catch (error) { memoryOutput.textContent = `作废失败：${error?.message ?? error}`; } });
  invalidateSwipe.addEventListener('click', () => { try { memory?.invalidateSwipeBranch({ sourceMessageId: sourceMessageId.value, selectedSwipeId: Number(swipeId.value) || 0 }); render(); } catch (error) { memoryOutput.textContent = `分支处理失败：${error?.message ?? error}`; } });
  activeLayers.addEventListener('change', () => { try { memory?.setSettings({ activeWindowLayers: Number(activeLayers.value) }); render(); } catch (error) { status.textContent = `设置失败：${error?.message ?? error}`; } });
  removeRecord.addEventListener('click', () => { try { memory?.removeRecord(removeId.value); render(); } catch (error) { status.textContent = `删除记录失败：${error?.message ?? error}`; } });
  removeEntity.addEventListener('click', () => { try { memory?.removeEntity(removeId.value); render(); } catch (error) { status.textContent = `删除实体失败：${error?.message ?? error}`; } });
  replayLayers.addEventListener('change', () => { try { memory?.setSettings({ replayLayers: Number(replayLayers.value) }); render(); } catch (error) { status.textContent = `设置失败：${error?.message ?? error}`; } });
  render(); return { ok: true, root, toggle, open: () => { show(true); render(); root.scrollIntoView?.({ block: 'nearest' }); }, close: () => show(false), destroy: () => { root.remove(); toggle.remove(); } };
}

function el(documentObject, tag, props = {}) { const node = documentObject.createElement(tag); for (const [key, value] of Object.entries(props)) { if (key === 'textContent') node.textContent = String(value); else if (key === 'value') node.value = String(value); else if (key === 'hidden') node.hidden = Boolean(value); else if (key in node) node[key] = value; else node.setAttribute(key, String(value)); } return node; }
function renderReadable(documentObject, data) {
  const wrap = documentObject.createElement('div');
  const current = data.currentState ?? { entities: [], recordsApplied: [] };
  const title = documentObject.createElement('strong'); title.textContent = `当前状态（${current.entities?.length ?? 0} 个实体）`; wrap.append(title);
  for (const entity of current.entities ?? []) {
    const line = documentObject.createElement('div');
    const state = Object.entries(entity.state ?? {}).map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`).join('，');
    line.textContent = `${entity.name}（${entity.type}）${state ? `：${state}` : '：暂无状态'}`;
    wrap.append(line);
  }
  const replay = documentObject.createElement('div');
  replay.textContent = `回放记录：${(data.replay ?? []).length} 条`;
  wrap.append(replay);
  for (const record of data.replay ?? []) {
    const row = documentObject.createElement('div'); row.textContent = `第 ${record.floor} 层：${record.text}`; wrap.append(row);
  }
  return wrap.innerHTML;
}

function injectStyle(documentObject) { if (documentObject.getElementById(STYLE_ID)) return; const style = documentObject.createElement('style'); style.id = STYLE_ID; style.textContent = `.ilbm-debug-toggle{position:fixed;right:16px;bottom:112px;z-index:2147483000;border:1px solid #888;border-radius:999px;padding:8px 12px;background:#1d2530;color:#fff;cursor:pointer}.ilbm-debug-root{position:fixed;right:16px;bottom:160px;z-index:2147483001;width:min(560px,calc(100vw - 32px));max-height:min(80vh,720px);overflow:auto;background:var(--SmartThemeBlurTintColor,#20242b);color:var(--SmartThemeBodyColor,#eee);border:1px solid var(--SmartThemeBorderColor,#687080);border-radius:10px;box-shadow:0 12px 36px #0008;padding:0}.ilbm-debug-mobile-nav{display:flex;gap:4px;padding:8px;position:sticky;bottom:0;background:var(--SmartThemeBlurTintColor,#20242b);border-top:1px solid #ffffff22}.ilbm-debug-mobile-nav button{flex:1;padding:8px 4px}.ilbm-debug-mobile{inset:0!important;right:auto!important;bottom:auto!important;width:100%!important;max-width:none!important;height:100dvh!important;max-height:none!important;border-radius:0!important;display:flex!important;flex-direction:column}.ilbm-debug-mobile::backdrop{background:#0009}.ilbm-debug-root button{appearance:none!important;background:#26364a!important;color:#fff!important;border:1px solid #91a9c4!important;border-radius:6px!important;min-height:34px!important;padding:6px 10px!important;text-shadow:none!important;box-shadow:0 1px 2px #0006!important}.ilbm-debug-root button:hover{background:#3b5874!important;color:#fff!important}.ilbm-debug-root button:active{background:#182434!important;color:#fff!important;transform:translateY(1px)}.ilbm-debug-root button:focus-visible{outline:2px solid #ffd166!important;outline-offset:2px}.ilbm-debug-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #ffffff22;position:sticky;top:0;background:var(--SmartThemeBlurTintColor,#20242b)}.ilbm-debug-head h2{font-size:16px;margin:0}.ilbm-debug-close{font-size:20px;background:transparent;color:inherit;border:0;cursor:pointer}.ilbm-debug-body{padding:12px}.ilbm-debug-input{width:100%;box-sizing:border-box;background:#0003;color:inherit;border:1px solid #ffffff44;border-radius:6px;padding:8px;margin:3px 0}.ilbm-debug-actions{display:flex;gap:8px;margin:8px 0;flex-wrap:wrap}.ilbm-debug-actions button{padding:6px 10px;cursor:pointer}.ilbm-debug-result,.ilbm-debug-status{white-space:pre-wrap;overflow:auto;max-height:240px;background:#0005;border-radius:6px;padding:8px;font-size:12px}.ilbm-debug-readable{padding:8px;background:#0003;border-radius:6px;line-height:1.6;max-height:240px;overflow:auto}.ilbm-debug-readable div{border-bottom:1px solid #ffffff12;padding:2px 0}`; documentObject.head?.append(style); }
