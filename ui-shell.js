import { buildEntityRows, buildEventRows, filterEventRows, formatEntityRow, formatEntityTimeline, formatEventRow, formatRecordDetail, formatStateCards } from './lib/memory-view.js';

function cleanupLegacyDebugUI(documentObject) {
  const legacyNodes = documentObject.querySelectorAll?.('#ilbm-debug-root, .ilbm-debug-toggle') ?? [];
  for (const node of legacyNodes) {
    try { node.remove?.(); } catch { node.hidden = true; node.style = node.style ?? {}; node.style.display = 'none'; }
  }
  try { documentObject.getElementById?.('ilbm-debug-style')?.remove?.(); } catch { /* legacy style cleanup is best effort */ }
}

export function section(documentObject, title, ...children) { const box = documentObject.createElement('section'); box.className = 'ilbm-shell-section'; const heading = documentObject.createElement('h3'); heading.textContent = title; box.append(heading, ...children); return box; }



export function mountILBMShell({ version = '0.7.0', status = () => ({}), api: contentApi = null, documentObject = globalThis.document, mobile = false } = {}) {
  if (!documentObject?.body) return { ok: false, reason: 'document unavailable' };
  cleanupLegacyDebugUI(documentObject);
  const existing = documentObject.getElementById('ilbm-shell');
  if (existing?.__ilbmShell) return existing.__ilbmShell;
  const root = documentObject.createElement(mobile ? 'dialog' : 'section');
  root.id = 'ilbm-shell'; root.className = mobile ? 'ilbm-shell ilbm-shell-mobile' : 'ilbm-shell ilbm-shell-desktop';
  root.hidden = true; root.setAttribute('hidden', ''); root.setAttribute('aria-hidden','true'); root.setAttribute('data-ilbm-open','false'); 
  root.classList?.add?.('hidden');
  // 只设置基本隐藏，让CSS规则处理显示/隐藏
  const head = documentObject.createElement('header'); head.className = 'ilbm-shell-head';
  const title = documentObject.createElement('strong'); title.textContent = `ILB-Memory ${version}`;
  const close = documentObject.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', '关闭'); close.className = 'ilbm-shell-close';
  const body = documentObject.createElement('main'); body.className = 'ilbm-shell-body';
  const statusText = documentObject.createElement('pre'); statusText.className = 'ilbm-shell-status'; statusText.textContent = 'ILBM 已加载，面板功能正在接入。';
  const debugDetails = documentObject.createElement('details'); debugDetails.className = 'ilbm-shell-debug';
  const debugSummary = documentObject.createElement('summary'); debugSummary.textContent = '调试状态（JSON，默认收起）';
  debugDetails.append(debugSummary, statusText);
  const meta = documentObject.createElement('p'); meta.className = 'ilbm-shell-meta'; meta.textContent = 'ILBM 记忆管理';
  const feature = documentObject.createElement('div'); feature.className = 'ilbm-shell-feature';
  const drawer = documentObject.createElement('details'); drawer.className = 'ilbm-shell-drawer'; const drawerSummary = documentObject.createElement('summary'); drawerSummary.textContent = '功能分区'; const drawerNav = documentObject.createElement('nav'); drawerNav.className = 'ilbm-shell-nav'; drawer.append(drawerSummary, drawerNav);
  const markerHelp = documentObject.createElement('button'); markerHelp.textContent = '标记测试说明'; markerHelp.title = '严格 v2 语法：(((ILBM:[entity:实体] 动作 [entity:实体] ...)))';
  const markerInput = documentObject.createElement('textarea'); markerInput.value = '正文 (((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙])))'; markerInput.rows = 3;
  const markerResult = documentObject.createElement('pre'); markerResult.textContent = '尚未测试';
  const errorHelp = documentObject.createElement('button'); errorHelp.textContent = '错误处理说明'; errorHelp.title = '解析失败不会阻塞聊天；错误会显示在这里并进入失败日志。';
  const markerRun = documentObject.createElement('button'); markerRun.textContent = '测试标记';
  const memoryHelp = documentObject.createElement('button'); memoryHelp.textContent = '记忆说明'; memoryHelp.title = '显示当前状态和历史回放；默认只预览，不自动注入模型';
  const memoryResult = documentObject.createElement('pre'); memoryResult.textContent = '尚未读取';
  const memoryRun = documentObject.createElement('button'); memoryRun.textContent = '读取记忆状态';
  const recordList = documentObject.createElement('div'); recordList.className = 'ilbm-shell-status ilbm-shell-list'; recordList.textContent = '尚无事件记录';
  const recordHelp = documentObject.createElement('button'); recordHelp.textContent = '事件说明'; recordHelp.title = '事件可能处于 pending、valid 或 invalid；pending 不参与注入，下一层用户消息后确认。';
  const recordRun = documentObject.createElement('button'); recordRun.textContent = '查看事件记录';
  const recordFilterInput = documentObject.createElement('input'); recordFilterInput.placeholder = '按实体短名或 ID 过滤';
  const recordFilterRun = documentObject.createElement('button'); recordFilterRun.textContent = '筛选';
  const recordFilterClear = documentObject.createElement('button'); recordFilterClear.textContent = '清除筛选';
  const recordStatusToggle = documentObject.createElement('button'); recordStatusToggle.textContent = '显示全部状态'; recordStatusToggle.setAttribute('aria-pressed', 'false');
  const entityHelp = documentObject.createElement('button'); entityHelp.textContent = '实体说明'; entityHelp.title = '实体是有稳定身份的对象；同名实体会由程序自动编号。';
  const entityInput = documentObject.createElement('input'); entityInput.placeholder = '实体短名，例如：短剑';
  const entityTagsInput = documentObject.createElement('input'); entityTagsInput.placeholder = '标签，逗号分隔，例如：item, sentient';
  const entityAdd = documentObject.createElement('button'); entityAdd.textContent = '注册实体';
  const entityResult = documentObject.createElement('pre'); entityResult.className = 'ilbm-shell-status'; entityResult.textContent = '尚未注册实体';
  const entityList = documentObject.createElement('div'); entityList.className = 'ilbm-shell-status ilbm-shell-list'; entityList.textContent = '尚无实体';
  const entityListRun = documentObject.createElement('button'); entityListRun.textContent = '刷新实体列表';
  const cardRun = documentObject.createElement('button'); cardRun.textContent = '查看分类状态卡';
  const cardResult = documentObject.createElement('pre'); cardResult.className = 'ilbm-shell-status'; cardResult.textContent = '尚未读取状态卡';
  const timelineInput = documentObject.createElement('input'); timelineInput.placeholder = '实体短名或实体 ID';
  const timelineRun = documentObject.createElement('button'); timelineRun.textContent = '查看实体时间线';
  const timelineResult = documentObject.createElement('pre'); timelineResult.className = 'ilbm-shell-status'; timelineResult.textContent = '尚未读取实体时间线';
  const detailInput = documentObject.createElement('input'); detailInput.placeholder = '记录 ID';
  const detailRun = documentObject.createElement('button'); detailRun.textContent = '查看事件详情';
  const detailResult = documentObject.createElement('pre'); detailResult.className = 'ilbm-shell-status'; detailResult.textContent = '尚未读取事件详情';
  const confirmRun = documentObject.createElement('button'); confirmRun.textContent = '确认上一层待确认事件';
  const confirmResult = documentObject.createElement('pre'); confirmResult.className = 'ilbm-shell-status'; confirmResult.textContent = '尚未执行确认';
  const invalidateInput = documentObject.createElement('input'); invalidateInput.type = 'number'; invalidateInput.placeholder = '从楼层作废';
  const invalidateRun = documentObject.createElement('button'); invalidateRun.textContent = '作废该楼层及之后';
  const invalidateResult = documentObject.createElement('pre'); invalidateResult.className = 'ilbm-shell-status'; invalidateResult.textContent = '尚未执行作废';
  const manualFloor = documentObject.createElement('input'); manualFloor.type = 'number'; manualFloor.placeholder = '楼层';
  const manualText = documentObject.createElement('textarea'); manualText.rows = 2; manualText.placeholder = '手动事件文本，例如：甲将短剑交给乙';
  const manualAction = documentObject.createElement('input'); manualAction.placeholder = '动作词（可空）：转移 / 移动 / 建立关系…';
  const manualEntities = documentObject.createElement('input'); manualEntities.placeholder = '实体短名，逗号分隔，例如：甲,短剑,乙';
  const manualAdd = documentObject.createElement('button'); manualAdd.textContent = '新增手动记录';
  const manualResult = documentObject.createElement('pre'); manualResult.className = 'ilbm-shell-status'; manualResult.textContent = '手动记录直接有效并触发状态重算。';
  const editRecordId = documentObject.createElement('input'); editRecordId.placeholder = '要编辑的记录 ID';
  const editText = documentObject.createElement('textarea'); editText.rows = 2; editText.placeholder = '新的事件文本';
  const editAction = documentObject.createElement('input'); editAction.placeholder = '新的动作词（可空）';
  const editSave = documentObject.createElement('button'); editSave.textContent = '保存记录修改';
  const editResult = documentObject.createElement('pre'); editResult.className = 'ilbm-shell-status'; editResult.textContent = '编辑只修改字段，不改变记录 ID。';
  const extractionMode = documentObject.createElement('select');
  for (const [value, label] of [['direct', '直出（模式 A）'], ['post', '事后提取（模式 B）']]) { const option = documentObject.createElement('option'); option.value = value; option.textContent = label; extractionMode.append(option); }
  const postBaseUrl = documentObject.createElement('input'); postBaseUrl.placeholder = 'API Base URL，例如 https://api.openai.com/v1';
  const postApiKey = documentObject.createElement('input'); postApiKey.type = 'password'; postApiKey.placeholder = 'API Key（保存在当前聊天变量）';
  const postModel = documentObject.createElement('input'); postModel.placeholder = '模型名称，例如 gpt-4o-mini';
  const postContextRounds = documentObject.createElement('input'); postContextRounds.type = 'number'; postContextRounds.value = '2'; postContextRounds.min = '1'; postContextRounds.max = '10'; postContextRounds.placeholder = '上下文档数';
  const postTimeout = documentObject.createElement('input'); postTimeout.type = 'number'; postTimeout.value = '3000'; postTimeout.min = '500'; postTimeout.max = '60000'; postTimeout.placeholder = '软超时 ms';
  const postPrompt = documentObject.createElement('textarea'); postPrompt.rows = 3; postPrompt.placeholder = '提取提示词；留空使用内置提示词';
  const extractionSave = documentObject.createElement('button'); extractionSave.textContent = '保存提取设置';
  const extractionResult = documentObject.createElement('pre'); extractionResult.className = 'ilbm-shell-status'; extractionResult.textContent = '提取模式与 API 配置保存在当前聊天。';
  const postTest = documentObject.createElement('button'); postTest.textContent = '对最近楼层试提取';
  const postTestResult = documentObject.createElement('pre'); postTestResult.className = 'ilbm-shell-status'; postTestResult.textContent = '试提取不会阻塞聊天；3 秒后先返回。';
  const failsRun = documentObject.createElement('button'); failsRun.textContent = '刷新失败日志';
  const failsClear = documentObject.createElement('button'); failsClear.textContent = '清空失败日志';
  const failsList = documentObject.createElement('div'); failsList.className = 'ilbm-shell-status ilbm-shell-list'; failsList.textContent = '尚无失败日志';
  const settingsStyle = documentObject.createElement('select');
  for (const [value, label] of [['compact', '紧凑（状态卡+原文）'], ['narrative', '叙事（自然句）']]) { const option = documentObject.createElement('option'); option.value = value; option.textContent = label; settingsStyle.append(option); }
  const settingsActive = documentObject.createElement('input'); settingsActive.type = 'number'; settingsActive.value = '5'; settingsActive.min = '2'; settingsActive.max = '1000'; settingsActive.placeholder = '活跃窗口层数';
  const settingsReplay = documentObject.createElement('input'); settingsReplay.type = 'number'; settingsReplay.value = '10'; settingsReplay.min = '0'; settingsReplay.max = '10000'; settingsReplay.placeholder = '回放窗口层数';
  const settingsRelationWidth = documentObject.createElement('input'); settingsRelationWidth.type = 'number'; settingsRelationWidth.value = '3'; settingsRelationWidth.min = '0'; settingsRelationWidth.max = '20'; settingsRelationWidth.placeholder = '关系线宽度';
  const settingsTimelineDepth = documentObject.createElement('input'); settingsTimelineDepth.type = 'number'; settingsTimelineDepth.value = '20'; settingsTimelineDepth.min = '0'; settingsTimelineDepth.max = '1000'; settingsTimelineDepth.placeholder = '时间线深度';
  const settingsSave = documentObject.createElement('button'); settingsSave.textContent = '保存检索设置';
  const settingsResult = documentObject.createElement('pre'); settingsResult.className = 'ilbm-shell-status'; settingsResult.textContent = '活跃窗口 / 回放窗口 / 关系线宽度 / 时间线深度';
  const injectionPreview = documentObject.createElement('button'); injectionPreview.textContent = '预览本轮注入';
  const injectionEnable = documentObject.createElement('button'); injectionEnable.textContent = '开启记忆注入';
  const injectionApply = documentObject.createElement('button'); injectionApply.textContent = '立即应用注入';
  const injectionDisable = documentObject.createElement('button'); injectionDisable.textContent = '关闭并清除注入';
  const injectionResult = documentObject.createElement('pre'); injectionResult.className = 'ilbm-shell-status'; injectionResult.textContent = '记忆注入默认关闭；预览不会修改请求。';
  const sections = [section(documentObject, '标记处理', markerHelp, errorHelp, markerInput, markerRun, markerResult), section(documentObject, '记忆状态与回放', memoryHelp, memoryRun, cardRun, memoryResult, cardResult), section(documentObject, '事件记录', recordHelp, recordRun, recordFilterInput, recordFilterRun, recordFilterClear, recordStatusToggle, recordList, detailInput, detailRun, confirmRun, invalidateInput, invalidateRun, detailResult, confirmResult, invalidateResult, manualFloor, manualText, manualAction, manualEntities, manualAdd, manualResult, editRecordId, editText, editAction, editSave, editResult), section(documentObject, '实体管理', entityHelp, entityInput, entityTagsInput, entityAdd, entityResult, entityListRun, entityList, timelineInput, timelineRun, timelineResult), section(documentObject, '检索与注入', settingsActive, settingsReplay, settingsRelationWidth, settingsTimelineDepth, settingsStyle, settingsSave, settingsResult, injectionPreview, injectionEnable, injectionApply, injectionDisable, injectionResult), section(documentObject, '提取设置', extractionMode, postBaseUrl, postApiKey, postModel, postContextRounds, postTimeout, postPrompt, extractionSave, extractionResult, postTest, postTestResult), section(documentObject, '失败日志', failsRun, failsClear, failsList)]; feature.append(...sections); sections.forEach((node,index)=>{const navButton=documentObject.createElement('button');navButton.type='button';navButton.textContent=node.querySelector?.('h3')?.textContent??`分区${index+1}`;navButton.addEventListener('click',()=>{sections.forEach(item=>{item.hidden=true;item.setAttribute('data-ilbm-section-active','false');item.style.display='none'});node.hidden=false;node.setAttribute('data-ilbm-section-active','true');node.style.display='flex';drawer.open=false;});drawerNav.append(navButton);}); sections.forEach((node,index)=>{node.hidden=index!==0;node.setAttribute('data-ilbm-section-active',index===0?'true':'false');});
  body.append(meta, drawer, feature, debugDetails); head.append(title, close); root.append(head, body); documentObject.body.append(root);
  const style = documentObject.createElement('style'); style.textContent = `.ilbm-shell{box-sizing:border-box!important;color:#f5f7fb!important;background:#171d27!important;border:1px solid #7f95ad!important;border-radius:10px!important;box-shadow:0 12px 40px #0009;font-family:system-ui,sans-serif}
.ilbm-shell[hidden],.ilbm-shell.hidden{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important}
.ilbm-shell-desktop{position:fixed!important;display:none!important;right:20px!important;bottom:80px!important;width:min(560px,calc(100vw - 40px))!important;max-width:560px!important;min-width:0!important;max-height:75vh!important;overflow-x:hidden!important;z-index:2147483000!important}
.ilbm-shell-tags{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:4px 0}.ilbm-shell-tag-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#2d4864;border:1px solid #91a9c4;color:#f5f7fb;font-size:.85em;line-height:1.4}.ilbm-shell-tag-chip-empty{opacity:.7}.ilbm-shell-tags-label{font-size:.85em;opacity:.8}.ilbm-shell-tag-input{min-width:12em}.ilbm-shell-desktop:not([hidden]){display:block!important}.ilbm-shell-desktop *{max-width:100%!important;box-sizing:border-box!important;overflow-wrap:anywhere!important}.ilbm-shell-mobile{overflow-x:hidden!important}.ilbm-shell-desktop .ilbm-shell-head{display:flex!important}.ilbm-shell-desktop .ilbm-shell-body{display:block!important;width:100%!important;box-sizing:border-box!important}.ilbm-shell-mobile{position:fixed!important;display:none!important;flex-direction:column!important;inset:0!important;width:100%!important;height:100dvh!important;max-width:100vw!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;padding:0!important}.ilbm-shell-mobile:not([hidden]){display:flex!important}.ilbm-shell-mobile .ilbm-shell-body{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}.ilbm-shell-mobile::backdrop{background:#000b}.ilbm-shell-head{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;width:100%!important;box-sizing:border-box!important;padding:14px!important;background:#202c3b!important;border-bottom:1px solid #8da2bb!important}.ilbm-shell-head strong{display:block!important;flex:1 1 auto!important;min-width:0!important;text-align:left!important}.ilbm-shell-close{flex:0 0 auto!important;margin-left:auto!important}.ilbm-shell-close{appearance:none!important;background:#9e2f3b!important;color:#fff!important;border:1px solid #ffc3ca!important;border-radius:6px!important;font-size:22px;min-width:42px;min-height:38px;cursor:pointer}.ilbm-shell-close:hover{background:#c74455!important}.ilbm-shell-body{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;padding:16px!important;overflow:auto!important;overflow-x:hidden!important}.ilbm-shell-status,.ilbm-shell-section pre{max-width:100%!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important}.ilbm-shell-drawer{margin:0 0 12px;border:1px solid #8194aa;border-radius:6px;background:#202c3b;color:#fff}.ilbm-shell-drawer summary{cursor:pointer;padding:10px;font-weight:600}.ilbm-shell-nav{display:flex!important;position:static!important;flex-wrap:wrap!important;gap:6px!important;padding:8px!important;align-items:stretch!important}.ilbm-shell-nav button{flex:0 1 auto!important}.ilbm-shell-nav button{appearance:none!important;background:#2d4864!important;color:#fff!important;border:1px solid #b5c8dc!important;border-radius:6px!important;padding:7px 10px!important}.ilbm-shell-feature{display:flex!important;flex-direction:column!important;gap:12px!important}.ilbm-shell-section[data-ilbm-section-active='false']{display:none!important;visibility:hidden!important}.ilbm-shell-section[data-ilbm-section-active='true']{display:flex!important;visibility:visible!important}.ilbm-shell-section{display:flex;flex-direction:column;gap:8px;border-top:1px solid #8194aa;padding-top:12px}.ilbm-shell-section h3{margin:0;color:#fff}.ilbm-shell button,.ilbm-shell-nav button{all:unset!important;appearance:none!important;position:static!important;float:none!important;transform:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;vertical-align:middle!important;box-sizing:border-box!important;inset:auto!important;background:#2d4864!important;color:#fff!important;border:1px solid #b5c8dc!important;border-radius:6px!important;padding:8px 12px!important;min-height:38px!important;min-width:0!important;max-width:100%!important;line-height:1.25!important;white-space:normal!important;cursor:pointer!important}.ilbm-shell-section button{appearance:none!important;background:#2d4864!important;color:#fff!important;border:1px solid #b5c8dc!important;border-radius:6px!important;padding:8px 12px!important;min-height:38px;cursor:pointer}.ilbm-shell-section button:hover{background:#47739d!important}.ilbm-shell-section textarea{box-sizing:border-box;width:100%;background:#0b111a!important;color:#fff!important;border:1px solid #98abc0!important;padding:8px;border-radius:6px}.ilbm-shell-status{white-space:pre-wrap;color:#f5f7fb;background:#0b111a;padding:12px;border-radius:6px}.ilbm-shell-meta{color:#dce6f2}.ilbm-shell-list{display:flex;flex-direction:column;gap:6px}.ilbm-shell-row{display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px;border-bottom:1px solid #34465c;padding:6px 0}.ilbm-shell-row-text{flex:1 1 220px;min-width:0}.ilbm-shell-detail{flex:1 1 100%;margin:0;padding:8px;background:#0b111a;border-radius:6px;white-space:pre-wrap}`; documentObject.head?.append(style);
  const formStyle = documentObject.createElement('style');
  formStyle.textContent = `.ilbm-shell-section input,.ilbm-shell-section select{box-sizing:border-box!important;width:100%!important;background:#0b111a!important;color:#fff!important;border:1px solid #98abc0!important;padding:8px!important;border-radius:6px!important;min-height:34px!important;font:inherit}.ilbm-shell-section textarea{min-height:64px}.ilbm-shell-section input[type=password]{letter-spacing:.08em}`;
  documentObject.head?.append(formStyle);
  const readMemorySnapshot = () => { try { return globalThis.ILBM_MEMORY?.inspect?.() ?? {}; } catch { return {}; } };
  const clearContainer = node => { if (typeof node.replaceChildren === 'function') { node.replaceChildren(); return; } node.textContent = ''; if (Array.isArray(node.children)) node.children.length = 0; };
  const eventView = { filter: '', showStatus: false, open: new Set() };
  const renderEventList = () => {
    try {
      const data = readMemorySnapshot();
      const rows = filterEventRows(buildEventRows(data), eventView.filter);
      clearContainer(recordList);
      if (!rows.length) { const empty = documentObject.createElement('div'); empty.textContent = eventView.filter ? '没有符合筛选条件的事件记录' : '尚无事件记录'; recordList.append(empty); return []; }
      for (const row of rows) {
        const item = documentObject.createElement('div'); item.className = 'ilbm-shell-row'; item.setAttribute('data-record-id', row.id);
        const textNode = documentObject.createElement('span'); textNode.className = 'ilbm-shell-row-text'; textNode.textContent = formatEventRow(row, { showStatus: eventView.showStatus });
        const detailButton = documentObject.createElement('button'); detailButton.type = 'button'; detailButton.textContent = '详情'; detailButton.setAttribute('aria-expanded', String(eventView.open.has(row.id)));
        const detail = documentObject.createElement('pre'); detail.className = 'ilbm-shell-detail'; detail.hidden = !eventView.open.has(row.id); detail.textContent = formatRecordDetail(row);
        detailButton.addEventListener('click', () => { const next = !eventView.open.has(row.id); if (next) eventView.open.add(row.id); else eventView.open.delete(row.id); detail.hidden = !next; detailButton.setAttribute('aria-expanded', String(next)); });
        item.append(textNode, detailButton, detail); recordList.append(item);
      }
      return rows;
    } catch (error) {
      clearContainer(recordList); const failed = documentObject.createElement('div'); failed.textContent = `事件列表失败：${error?.message ?? error}`; recordList.append(failed); return [];
    }
  };
  const showTimeline = (query) => {
    try {
      const data = readMemorySnapshot(); const text = String(query ?? '').trim().toLowerCase();
      const entity = (data.entities ?? []).find(item => item.id === String(query ?? '') || String(item.name ?? '').toLowerCase() === text);
      const records = entity ? (data.records ?? []).filter(record => (record.entityIds ?? []).includes(entity.id)).sort((a, b) => a.floor - b.floor || a.sequence - b.sequence) : [];
      timelineResult.textContent = formatEntityTimeline(entity, records, { entities: data.entities ?? [] });
      return entity ?? null;
    } catch (error) { timelineResult.textContent = `失败：${error?.message ?? error}`; return null; }
  };
  const renderEntityList = () => {
    try {
      const data = readMemorySnapshot();
      const rows = buildEntityRows(data, { currentState: data.currentState ?? null });
      clearContainer(entityList);
      if (!rows.length) { const empty = documentObject.createElement('div'); empty.textContent = '尚无实体'; entityList.append(empty); return []; }
      for (const row of rows) {
        const item = documentObject.createElement('div'); item.className = 'ilbm-shell-row'; item.setAttribute('data-entity-id', row.id);
        const textNode = documentObject.createElement('span'); textNode.className = 'ilbm-shell-row-text'; textNode.textContent = formatEntityRow(row);
        const timelineButton = documentObject.createElement('button'); timelineButton.type = 'button'; timelineButton.textContent = '时间线';
        timelineButton.addEventListener('click', () => { timelineInput.value = row.name; showTimeline(row.name); });
        const chips = documentObject.createElement('span'); chips.className = 'ilbm-shell-tags';
        const tagValues = Array.isArray(row.tags) ? row.tags : [];
        const tagLabels = Array.isArray(row.tagLabels) ? row.tagLabels : tagValues;
        const chipLabel = documentObject.createElement('span'); chipLabel.className = 'ilbm-shell-tags-label'; chipLabel.textContent = '标签：'; chips.append(chipLabel);
        if (tagLabels.length) {
          tagLabels.forEach((label, index) => {
            const chip = documentObject.createElement('span'); chip.className = 'ilbm-shell-tag-chip'; chip.textContent = String(label);
            chip.setAttribute?.('data-tag', String(tagValues[index] ?? label)); chips.append(chip);
          });
        } else { const emptyChip = documentObject.createElement('span'); emptyChip.className = 'ilbm-shell-tag-chip ilbm-shell-tag-chip-empty'; emptyChip.textContent = '无'; chips.append(emptyChip); }
        const tagInput = documentObject.createElement('input'); tagInput.className = 'ilbm-shell-tag-input'; tagInput.placeholder = '标签，逗号分隔'; tagInput.value = tagValues.join(', ');
        const tagSave = documentObject.createElement('button'); tagSave.type = 'button'; tagSave.textContent = '保存标签';
        tagSave.addEventListener('click', () => {
          try {
            const tags = tagInput.value.split(/[,，、\s]+/).map(tag => tag.trim()).filter(Boolean);
            const updated = globalThis.ILBM_MEMORY?.setEntityTags?.(row.id, tags);
            entityResult.textContent = updated
              ? `${updated.name} · 标签：${(updated.tags ?? []).join('、') || '无'} · 主类型：${updated.type}`
              : '实体标签保存失败：memory API unavailable';
            renderEntityList();
          } catch (error) { entityResult.textContent = `保存标签失败：${error?.message ?? error}`; }
        });
        item.append(textNode, timelineButton, chips, tagInput, tagSave); entityList.append(item);
      }
      return rows;
    } catch (error) {
      clearContainer(entityList); const failed = documentObject.createElement('div'); failed.textContent = `实体列表失败：${error?.message ?? error}`; entityList.append(failed); return [];
    }
  };
  const renderFailures = () => {
    try {
      const failures = globalThis.ILBM_MEMORY?.inspect?.()?.failures ?? [];
      clearContainer(failsList);
      if (!failures.length) { const empty = documentObject.createElement('div'); empty.textContent = '尚无失败日志'; failsList.append(empty); return []; }
      for (const failure of failures.slice().reverse()) {
        const item = documentObject.createElement('div'); item.className = 'ilbm-shell-row';
        const text = documentObject.createElement('span'); text.className = 'ilbm-shell-row-text';
        text.textContent = `第${failure.floor ?? '?'}层 · ${failure.stage ?? '提取'} · ${failure.reason ?? '未知原因'}${failure.sourceMessageId ? ` · 消息 ${failure.sourceMessageId}` : ''}`;
        item.append(text); failsList.append(item);
      }
      return failures;
    } catch (error) { clearContainer(failsList); const failed = documentObject.createElement('div'); failed.textContent = `失败日志读取失败：${error?.message ?? error}`; failsList.append(failed); return []; }
  };
  markerRun.addEventListener('click', () => { try { markerResult.textContent = JSON.stringify(activeApi?.processMarker?.(markerInput.value) ?? { ok: false, error: 'ILBM API unavailable' }, null, 2); } catch (error) { markerResult.textContent = `失败：${error?.message ?? error}`; } });
  memoryRun.addEventListener('click', () => { try { const data = globalThis.ILBM_MEMORY?.inspect?.() ?? {}; const records = data.records ?? []; const valid = records.filter(record => record.status === 'valid' && record.valid !== false).length; const pending = records.filter(record => record.status === 'pending').length; const settings = data.settings ?? {}; memoryResult.textContent = [`实体 ${(data.entities ?? []).length} · 记录 ${records.length}（有效 ${valid} / 待确认 ${pending}）`, `活跃窗口 ${settings.activeWindowLayers ?? 5} 层 · 回放 ${settings.replayLayers ?? 10} 层 · 关系线 ${settings.relationLineWidth ?? 3} · 时间线 ${settings.timelineDepth ?? 20}`].join('\n'); } catch (error) { memoryResult.textContent = `失败：${error?.message ?? error}`; } });
  recordRun.addEventListener('click', () => { renderEventList(); });
  recordFilterRun.addEventListener('click', () => { eventView.filter = recordFilterInput.value; renderEventList(); });
  recordFilterClear.addEventListener('click', () => { recordFilterInput.value = ''; eventView.filter = ''; renderEventList(); });
  recordStatusToggle.addEventListener('click', () => { eventView.showStatus = !eventView.showStatus; recordStatusToggle.textContent = eventView.showStatus ? '隐藏状态列' : '显示全部状态'; recordStatusToggle.setAttribute('aria-pressed', String(eventView.showStatus)); renderEventList(); });
  recordHelp.addEventListener('click', () => { detailResult.textContent = '事件状态：pending=待下一层用户消息确认；valid=参与状态/注入；invalid=保留历史但跳过。direct=内联标记，post=事后提取，manual=手动记录。列表默认只显示楼层、序号、实体、动作、提取模式；状态在详情中查看。'; });
  entityAdd.addEventListener('click', () => { try { const tags = String(entityTagsInput.value ?? '').split(/[,，、\s]+/).map(tag => tag.trim()).filter(Boolean); const result = globalThis.ILBM_MEMORY?.registerEntity?.({ name: entityInput.value, tags }); entityResult.textContent = result ? `${result.name} · 标签：${(result.tags ?? []).join('、') || '无'} · 主类型：${result.type}` : '注册失败：memory API unavailable'; renderEntityList(); } catch (error) { entityResult.textContent = `失败：${error?.message ?? error}`; } });
  entityHelp.addEventListener('click', () => { entityResult.textContent = '实体短名用于识别同一个人物、物品或地点；同名不会自动合并，程序会追加编号。'; });
  cardRun.addEventListener('click', () => { try { cardResult.textContent = formatStateCards(globalThis.ILBM_MEMORY?.inspect?.()?.currentState?.cards ?? {}); } catch (error) { cardResult.textContent = `失败：${error?.message ?? error}`; } });
  timelineRun.addEventListener('click', () => { showTimeline(timelineInput.value); });
  entityListRun.addEventListener('click', () => { renderEntityList(); });
  detailRun.addEventListener('click', () => { try { const data = globalThis.ILBM_MEMORY?.inspect?.() ?? {}; const rows = buildEventRows(data); const row = rows.find(item => item.id === detailInput.value); detailResult.textContent = row ? formatRecordDetail(row) : '未找到该记录 ID'; } catch (error) { detailResult.textContent = `失败：${error?.message ?? error}`; } });
  confirmRun.addEventListener('click', () => { try { const floor = Number(globalThis.ILBM_MEMORY?.inspect?.()?.records?.reduce((max, record) => Math.max(max, record.floor), 0) ?? 0); const result = globalThis.ILBM_MEMORY?.confirmPending?.(floor); confirmResult.textContent = JSON.stringify(result ?? { error: 'memory API unavailable' }, null, 2); } catch (error) { confirmResult.textContent = `失败：${error?.message ?? error}`; } });
  invalidateRun.addEventListener('click', () => { try { const result = globalThis.ILBM_MEMORY?.invalidateFromMessage?.({ floor: Number(invalidateInput.value) }); invalidateResult.textContent = JSON.stringify(result ?? { error: 'memory API unavailable' }, null, 2); } catch (error) { invalidateResult.textContent = `失败：${error?.message ?? error}`; } });
  settingsSave.addEventListener('click', () => { try { const state = globalThis.ILBM_MEMORY?.setSettings?.({ activeWindowLayers: Number(settingsActive.value), replayLayers: Number(settingsReplay.value), relationLineWidth: Number(settingsRelationWidth.value), timelineDepth: Number(settingsTimelineDepth.value), injectionStyle: settingsStyle.value || 'compact' }); settingsResult.textContent = JSON.stringify(state?.settings ?? state ?? { error: 'memory API unavailable' }, null, 2); } catch (error) { settingsResult.textContent = `设置失败：${error?.message ?? error}`; } });
  manualAdd.addEventListener('click', () => { try { const action = String(manualAction.value ?? '').trim(); const entities = String(manualEntities.value ?? '').split(/[,，、\s]+/).map(item => item.trim()).filter(Boolean); const record = globalThis.ILBM_MEMORY?.addManualRecord?.({ floor: Number(manualFloor.value) || 0, text: manualText.value, action, entities }); manualResult.textContent = record ? `已新增：${record.id} · 第${record.floor}层 · ${record.action ?? '无动作'}` : '新增失败：memory API unavailable'; renderEventList(); } catch (error) { manualResult.textContent = `新增失败：${error?.message ?? error}`; } });
  editSave.addEventListener('click', () => { try { const id = String(editRecordId.value ?? '').trim(); if (!id) { editResult.textContent = '请填写记录 ID'; return; } const patch = { text: editText.value }; if (String(editAction.value ?? '').trim()) patch.action = String(editAction.value).trim(); const record = globalThis.ILBM_MEMORY?.updateRecord?.(id, patch); editResult.textContent = record ? `已保存：${record.id} · ${record.text}` : '保存失败：memory API unavailable'; renderEventList(); } catch (error) { editResult.textContent = `保存失败：${error?.message ?? error}`; } });
  extractionSave.addEventListener('click', () => { try { const state = globalThis.ILBM_MEMORY?.setSettings?.({ extractionMode: extractionMode.value || 'direct', injectionStyle: settingsStyle.value || 'compact', postApi: { baseUrl: postBaseUrl.value, apiKey: postApiKey.value, model: postModel.value, prompt: postPrompt.value, contextRounds: Number(postContextRounds.value) || 2, timeoutMs: Number(postTimeout.value) || 3000 } }); extractionResult.textContent = JSON.stringify(state?.settings ?? state ?? { error: 'memory API unavailable' }, null, 2); } catch (error) { extractionResult.textContent = `保存失败：${error?.message ?? error}`; } });
  postTest.addEventListener('click', async () => { try { const data = globalThis.ILBM_MEMORY?.inspect?.() ?? {}; const floor = (data.records ?? []).reduce((max, record) => Math.max(max, Number(record.floor) || 0), 0); const result = await globalThis.ILBM_MEMORY?.postExtract?.({ floor }); postTestResult.textContent = JSON.stringify({ ok: result?.ok, skipped: result?.skipped, timedOut: result?.timedOut, accepted: result?.accepted?.length ?? 0, rejected: result?.rejected?.length ?? 0, error: result?.error, reason: result?.reason }, null, 2); renderEventList(); } catch (error) { postTestResult.textContent = `试提取失败：${error?.message ?? error}`; } });
  failsRun.addEventListener('click', () => { renderFailures(); });
  failsClear.addEventListener('click', () => { try { globalThis.ILBM_MEMORY?.clearFailures?.(); renderFailures(); failsList.textContent = '失败日志已清空'; } catch (error) { failsList.textContent = `清空失败：${error?.message ?? error}`; } });
  injectionPreview.addEventListener('click', () => { try { const api = globalThis.ILBM_MEMORY; const result = api?.previewCurrentTurn?.({ tokenBudget: 2000 }) ?? api?.buildMemoryText?.({ tokenBudget: 2000 }); const { text, ...meta } = result ?? {}; injectionResult.textContent = text ? `${text}\n\n---\n${JSON.stringify(meta, null, 2)}` : JSON.stringify(result ?? { error: 'memory API unavailable' }, null, 2); } catch (error) { injectionResult.textContent = `预览失败：${error?.message ?? error}`; } });
  injectionEnable.addEventListener('click', () => { try { const enabled = globalThis.ILBM_MEMORY?.injection?.enable?.(); injectionResult.textContent = enabled ? '记忆注入已开启；请预览后点击“立即应用注入”。' : '无法开启记忆注入。'; } catch (error) { injectionResult.textContent = `开启失败：${error?.message ?? error}`; } });
  injectionApply.addEventListener('click', () => { try { injectionResult.textContent = JSON.stringify(globalThis.ILBM_MEMORY?.injection?.apply?.() ?? { error: 'memory API unavailable' }, null, 2); } catch (error) { injectionResult.textContent = `应用失败：${error?.message ?? error}`; } });
  injectionDisable.addEventListener('click', () => { try { globalThis.ILBM_MEMORY?.injection?.disable?.(); globalThis.ILBM_MEMORY?.injection?.clear?.(); injectionResult.textContent = '记忆注入已关闭并清除。'; } catch (error) { injectionResult.textContent = `关闭失败：${error?.message ?? error}`; } });
  markerHelp.addEventListener('click', () => { markerResult.textContent = '严格 v2 语法：(((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙])))；只识别 (((ILBM:...))) 内部的 [entity:名称]，一句话多个动作请拆成多个标记。'; });
  errorHelp.addEventListener('click', () => { markerResult.textContent = '错误不会阻塞正常聊天。常见错误：缺少 [entity:名称]、动作不在白名单、候选格式无效。错误会保留诊断，修正输入后可重新测试。'; });
  memoryHelp.addEventListener('click', () => { memoryResult.textContent = '记忆状态由有效事件重算；回放按活跃窗口/回放窗口设置预览。AI 候选必须先预览，再确认导入。'; });
  const closeShell = () => { 
    try { root.close?.(); } catch {} 
    root.removeAttribute('open'); 
    root.hidden = true; 
    root.setAttribute('hidden', ''); 
    root.setAttribute('aria-hidden','true'); 
    root.setAttribute('data-ilbm-open','false'); 
    root.classList?.remove?.('open','active','expanded','show'); 
    root.classList?.add?.('hidden');
    // 移除绝对定位，让CSS中的[hidden]规则生效
    root.style.cssText = '';
  };
  const openShell = () => { 
    root.hidden = false; 
    root.removeAttribute('hidden'); 
    root.removeAttribute('aria-hidden'); 
    root.setAttribute('data-ilbm-open','true'); 
    root.classList?.remove?.('open','active','expanded','show','hidden'); 
    root.style.cssText = '';
    if (mobile) { 
      try { root.showModal?.(); } catch {} 
    }
    statusText.textContent = JSON.stringify(status(), null, 2); 
    try { const settings = globalThis.ILBM_MEMORY?.inspect?.()?.settings; if (settings) { settingsActive.value = String(settings.activeWindowLayers ?? 5); settingsReplay.value = String(settings.replayLayers ?? 10); settingsRelationWidth.value = String(settings.relationLineWidth ?? 3); settingsTimelineDepth.value = String(settings.timelineDepth ?? 20); settingsStyle.value = settings.injectionStyle ?? 'compact'; extractionMode.value = settings.extractionMode ?? 'direct'; const post = settings.postApi ?? {}; postBaseUrl.value = post.baseUrl ?? ''; postApiKey.value = post.apiKey ?? ''; postModel.value = post.model ?? ''; postPrompt.value = post.prompt ?? ''; postContextRounds.value = String(post.contextRounds ?? 2); postTimeout.value = String(post.timeoutMs ?? 3000); } } catch { /* settings display is best effort */ }
    renderEventList(); renderEntityList(); renderFailures();
  };
  close.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); closeShell(); }); root.addEventListener('cancel', closeShell); root.addEventListener('close', closeShell);
  let activeApi = contentApi;
  const setApi = next => { activeApi = next; };
  const api = { root, head, body, open: openShell, close: closeShell, setApi, isOpen: () => root.hidden === false && (!mobile || root.open === true), update: () => { statusText.textContent = JSON.stringify(status(), null, 2); }, renderEventList, renderEntityList, renderFailures, controls: { markerHelp, markerInput, markerRun, markerResult, settingsActive, settingsReplay, settingsRelationWidth, settingsTimelineDepth, settingsStyle, settingsSave, settingsResult, extractionMode, postBaseUrl, postApiKey, postModel, postContextRounds, postTimeout, postPrompt, extractionSave, extractionResult, postTest, postTestResult, failsRun, failsClear, failsList, injectionPreview, injectionEnable, injectionApply, injectionDisable, injectionResult, recordRun, recordFilterInput, recordFilterRun, recordFilterClear, recordStatusToggle, recordList, manualFloor, manualText, manualAction, manualEntities, manualAdd, manualResult, editRecordId, editText, editAction, editSave, editResult, entityInput, entityTagsInput, entityAdd, entityResult, entityListRun, entityList, timelineInput, timelineRun, timelineResult, detailInput, detailRun, detailResult } };
  root.__ilbmShell = api; return api;
}
