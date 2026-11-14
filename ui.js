const STYLE_ID = 'ilbm-debug-style';

export function mountILBMPanel({ api, memory, documentObject = globalThis.document } = {}) {
  if (!documentObject?.body || !api) return { ok: false, reason: 'document or API unavailable' };
  if (documentObject.getElementById('ilbm-debug-root')) return { ok: true, duplicate: true };
  injectStyle(documentObject);
  const root = el(documentObject, 'section', { id: 'ilbm-debug-root', class: 'ilbm-debug-root', hidden: true });
  const toggle = el(documentObject, 'button', { class: 'ilbm-debug-toggle', type: 'button', textContent: 'ILBM' });
  const title = el(documentObject, 'h2', { textContent: 'ILB-Memory 调试面板' });
  const close = el(documentObject, 'button', { class: 'ilbm-debug-close', type: 'button', textContent: '×', title: '关闭' });
  const input = el(documentObject, 'textarea', { class: 'ilbm-debug-input', rows: '4', value: '测试文本 (((ILBM)))' });
  const entityName = el(documentObject, 'input', { class: 'ilbm-debug-input', value: '短剑', placeholder: '实体名称' });
  const entityType = el(documentObject, 'select', {});
  for (const [value, label] of [['item','物品'],['person','人物'],['place','地点'],['organization','组织'],['other','其他']]) entityType.append(el(documentObject, 'option', { value, textContent: label }));
  const recordText = el(documentObject, 'input', { class: 'ilbm-debug-input', value: '铁匠将短剑交给甲。', placeholder: '事件描述' });
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
  const result = el(documentObject, 'pre', { class: 'ilbm-debug-result', textContent: '尚未测试。' });
  const memoryOutput = el(documentObject, 'pre', { class: 'ilbm-debug-result', textContent: '' });
  const status = el(documentObject, 'pre', { class: 'ilbm-debug-status', textContent: '' });
  const body = el(documentObject, 'div', { class: 'ilbm-debug-body' });
  const buttons = el(documentObject, 'div', { class: 'ilbm-debug-actions' });
  buttons.append(test, refresh);
  const memoryActions = el(documentObject, 'div', { class: 'ilbm-debug-actions' }); memoryActions.append(addEntity, addRecord);
  body.append(input, buttons, el(documentObject, 'h3', { textContent: '标记处理结果' }), result, el(documentObject, 'h3', { textContent: '手动记忆测试' }), entityName, entityType, recordText, recordFloor, sourceMessageId, swipeId, el(documentObject, 'label', { textContent: '活跃窗口层数' }), activeLayers, el(documentObject, 'label', { textContent: '回放窗口层数' }), replayLayers, memoryActions, el(documentObject, 'div', { class: 'ilbm-debug-actions' }), memoryOutput, el(documentObject, 'h3', { textContent: '运行状态' }), status);
  const invalidationActions = body.children[body.children.length - 2];
  invalidationActions.append(invalidateFloor, invalidateSwipe);
  const head = el(documentObject, 'header', { class: 'ilbm-debug-head' }); head.append(title, close); root.append(head, body); documentObject.body.append(toggle, root);
  const render = () => { try { const currentStatus = api.status?.() ?? {}; status.textContent = JSON.stringify(currentStatus, null, 2); memoryOutput.textContent = JSON.stringify(currentStatus.memory ?? memory?.inspect?.() ?? {}, null, 2); } catch (error) { status.textContent = `读取失败：${error?.message ?? error}`; } };
  const show = visible => { root.hidden = !visible; toggle.setAttribute('aria-expanded', String(visible)); };
  toggle.addEventListener('click', () => { show(root.hidden); render(); }); close.addEventListener('click', () => show(false)); refresh.addEventListener('click', render);
  test.addEventListener('click', () => { try { result.textContent = JSON.stringify(api.processMarker(input.value), null, 2); render(); } catch (error) { result.textContent = `处理失败：${error?.message ?? error}`; } });
  addEntity.addEventListener('click', () => { try { memory?.registerEntity({ name: entityName.value, type: entityType.value }); render(); } catch (error) { memoryOutput.textContent = `添加实体失败：${error?.message ?? error}`; } });
  addRecord.addEventListener('click', () => { try { memory?.addRecord({ text: recordText.value, floor: Number(recordFloor.value), sourceMessageId: sourceMessageId.value || null, swipeId: Number(swipeId.value) || 0 }); render(); } catch (error) { memoryOutput.textContent = `添加事件失败：${error?.message ?? error}`; } });
  invalidateFloor.addEventListener('click', () => { try { memory?.invalidateFromMessage({ floor: Number(recordFloor.value), sourceMessageId: sourceMessageId.value || null }); render(); } catch (error) { memoryOutput.textContent = `作废失败：${error?.message ?? error}`; } });
  invalidateSwipe.addEventListener('click', () => { try { memory?.invalidateSwipeBranch({ sourceMessageId: sourceMessageId.value, selectedSwipeId: Number(swipeId.value) || 0 }); render(); } catch (error) { memoryOutput.textContent = `分支处理失败：${error?.message ?? error}`; } });
  activeLayers.addEventListener('change', () => { try { memory?.setSettings({ activeWindowLayers: Number(activeLayers.value) }); render(); } catch (error) { status.textContent = `设置失败：${error?.message ?? error}`; } });
  replayLayers.addEventListener('change', () => { try { memory?.setSettings({ replayLayers: Number(replayLayers.value) }); render(); } catch (error) { status.textContent = `设置失败：${error?.message ?? error}`; } });
  render(); return { ok: true, root, toggle, close: () => show(false), destroy: () => { root.remove(); toggle.remove(); } };
}

function el(documentObject, tag, props = {}) { const node = documentObject.createElement(tag); for (const [key, value] of Object.entries(props)) { if (key === 'textContent') node.textContent = String(value); else if (key === 'value') node.value = String(value); else if (key === 'hidden') node.hidden = Boolean(value); else if (key in node) node[key] = value; else node.setAttribute(key, String(value)); } return node; }
function injectStyle(documentObject) { if (documentObject.getElementById(STYLE_ID)) return; const style = documentObject.createElement('style'); style.id = STYLE_ID; style.textContent = `.ilbm-debug-toggle{position:fixed;right:16px;bottom:112px;z-index:2147483000;border:1px solid #888;border-radius:999px;padding:8px 12px;background:#1d2530;color:#fff;cursor:pointer}.ilbm-debug-root{position:fixed;right:16px;bottom:160px;z-index:2147483001;width:min(560px,calc(100vw - 32px));max-height:min(80vh,720px);overflow:auto;background:var(--SmartThemeBlurTintColor,#20242b);color:var(--SmartThemeBodyColor,#eee);border:1px solid var(--SmartThemeBorderColor,#687080);border-radius:10px;box-shadow:0 12px 36px #0008;padding:0}.ilbm-debug-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #ffffff22;position:sticky;top:0;background:var(--SmartThemeBlurTintColor,#20242b)}.ilbm-debug-head h2{font-size:16px;margin:0}.ilbm-debug-close{font-size:20px;background:transparent;color:inherit;border:0;cursor:pointer}.ilbm-debug-body{padding:12px}.ilbm-debug-input{width:100%;box-sizing:border-box;background:#0003;color:inherit;border:1px solid #ffffff44;border-radius:6px;padding:8px;margin:3px 0}.ilbm-debug-actions{display:flex;gap:8px;margin:8px 0;flex-wrap:wrap}.ilbm-debug-actions button{padding:6px 10px;cursor:pointer}.ilbm-debug-result,.ilbm-debug-status{white-space:pre-wrap;overflow:auto;max-height:240px;background:#0005;border-radius:6px;padding:8px;font-size:12px}`; documentObject.head?.append(style); }
