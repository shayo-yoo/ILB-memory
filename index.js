import { createIlbmBridge, registerDisplayFilter, registerMessageCapture, registerPromptFilter } from './lib/ilbm-bridge.js';
import { createIlbrService } from './lib/ilbr-engine.js';
import { createMarkerResult } from './lib/ilbm-bridge.js';
import { mountILBMPanel } from './ui.js';
import { createMemoryStore } from './lib/memory-store.js';
import { runCandidateExtraction } from './lib/extractor.js';
import { calculateCurrentState, replayRecords } from './lib/memory-model.js';
import { buildMemoryText } from './lib/memory-injection.js';
import { createMemoryInjector } from './lib/memory-injector.js';
import { createMemoryEventAdapter } from './lib/memory-events.js';

export const VERSION = '0.1.0';
export const ILBM_EXTENSION_ID = 'ilb-memory';

let started = false;
let integration = { display: null, prompt: null, ilb: null, ilbr: null };
let lastProcess = null;
let markCount = 0;
let lastMarkAt = 0;
let memoryInjector = null;

/**
 * Initialize the independent extension against public ST/ILB interfaces.
 * This module has no import-time browser side effects and can be tested in Node.
 */
export function initializeILBM({ context, eventSource, eventTypes, globalObject = globalThis, onMarked = () => {} } = {}) {
  if (started) return { ok: true, duplicate: true, integration };
  started = true;
  const ilbr = createIlbrService();
  const bridge = createIlbmBridge({ ilbr, version: VERSION });
  const getOptions = () => ({ marker: ILBM_MARKER });
  const display = registerDisplayFilter(context?.messageFormatter, getOptions);
  const adapterSource = eventSource ?? context?.eventSource;
  const types = eventTypes ?? context?.eventTypes;
  const prompt = registerPromptFilter(adapterSource, types, getOptions);
  const capture = registerMessageCapture(adapterSource, types?.MESSAGE_RECEIVED ?? 'message_received', () => ({
    chatId: context?.getCurrentChatId?.() ?? context?.chatId ?? 'unknown-chat',
    getChat: () => context?.chat,
    marker: ILBM_MARKER,
  }), (payload) => {
    lastProcess = { source: payload.source, sourceKey: payload.sourceKey, triggered: payload.result.triggered, errors: payload.result.errors, at: Date.now() };
    markCount += 1;
    lastMarkAt = lastProcess.at;
    onMarked(payload);
  });

  const chatId = context?.getCurrentChatId?.() ?? context?.chatId ?? 'default';
  const memory = createMemoryStore({ chatId });
  let memoryInjectionEnabled = false;
  memoryInjector = createMemoryInjector({ getContext: () => context, getText: () => buildMemoryText(memory.inspect(), { tokenBudget: 2000 }).text });
  let lastMemoryChange = null;
  const eventAdapter = createMemoryEventAdapter({ eventSource: adapterSource, eventTypes: types, getContext: () => context, store: memory, onChange: change => { lastMemoryChange = { ...change, at: Date.now() }; } });
  const inspectMemory = () => ({ ...memory.inspect(), currentState: calculateCurrentState(memory.inspect()), replay: replayRecords(memory.inspect()), lastChange: lastMemoryChange, eventAdapter: { ok: eventAdapter.ok, events: eventAdapter.events ?? [], degraded: Boolean(lastMemoryChange?.degraded) } });
  const memoryApi = { id: 'ILBM-Memory', version: '0.1.0', inspect: inspectMemory, buildMemoryText: options => buildMemoryText(memory.inspect(), options), injection: { enabled: () => memoryInjector?.isEnabled() ?? false, enable: () => memoryInjector?.setEnabled(true), disable: () => memoryInjector?.setEnabled(false), apply: () => memoryInjector?.apply(), clear: () => memoryInjector?.clear() }, registerEntity: input => memory.registerEntity(input), addRecord: input => memory.addRecord(input), invalidateFromMessage: input => memory.invalidateFromMessage(input), invalidateSwipeBranch: input => memory.invalidateSwipeBranch(input), setSettings: input => memory.setSettings(input), removeRecord: id => memory.removeRecord(id), removeEntity: id => memory.removeEntity(id), clearFailures: () => memory.clearFailures(), exportBackup: () => memory.exportBackup(), importBackup: payload => memory.importBackup(payload), previewCandidates: (payload, meta) => memory.previewCandidates(payload, meta), importCandidates: (payload, meta) => memory.importCandidates(payload, meta), importCandidateResponse: (raw, meta) => memory.importCandidateResponse(raw, meta), extractCandidates: (text, options) => runCandidateExtraction(text, options), reset: () => memory.reset(), events: () => ({ ...eventAdapter, events: eventAdapter.events ?? [] }) };
  const ilb = registerILBSeriesAPI(globalObject, bridge);
  integration = { display, prompt, capture, ilb, ilbr, memory: memoryApi };
  try { globalObject.ILBM_MEMORY = memoryApi; } catch { /* optional global diagnostic */ }
  try { globalObject.__ILBM_DEBUG_PANEL__ = mountILBMPanel({ api: globalObject.ILBM, memory: memoryApi, documentObject: globalObject.document, showToggle: false }); installSettingsEntry(globalObject, globalObject.__ILBM_DEBUG_PANEL__); } catch { /* UI optional */ }
  return { ok: true, version: VERSION, capabilities: bridge.capabilities, integration };
}

export function registerILBSeriesAPI(globalObject = globalThis, bridge) {
  // Publish an independent, additive series capability. Never mutate window.ILB.
  if (!globalObject || !bridge) return { ok: false, reason: 'global object and bridge are required' };
  try {
    const existing = globalObject.ILB_SERIES;
    if (existing && typeof existing === 'object' && existing.memory?.id === 'ILBM') {
      return { ok: true, duplicate: true };
    }
    const series = existing && typeof existing === 'object' ? existing : {};
    series.memory = bridge;
    Object.defineProperty(globalObject, 'ILB_SERIES', { configurable: true, enumerable: true, writable: true, value: series });
    try { globalObject.dispatchEvent?.(new CustomEvent('ilb-series:ready', { detail: { id: 'ILBM', api: bridge } })); } catch { /* optional notification */ }
    return { ok: true, version: bridge.version };
  } catch (error) {
    return { ok: false, reason: String(error?.message ?? error) };
  }
}

export function getILBMStatus() {
  const memory = integration.memory?.inspect?.() ?? null;
  return { version: VERSION, started, markCount, lastMarkAt, lastProcess, memory, injection: { enabled: memoryInjector?.isEnabled?.() ?? false, key: memoryInjector?.key ?? null }, integration: { ...integration } };
}

export const ILBM_MARKER = '(((ILBM)))';

/** Browser entry. The ST loader imports index.js as an ES module. */
export async function bootILBM() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return { ok: false, reason: 'browser environment unavailable' };
  const extModule = await import('/scripts/extensions.js');
  const hostContext = extModule.getContext?.();
  const eventsModule = await import('/scripts/events.js');
  const result = initializeILBM({ context: hostContext, eventSource: hostContext?.eventSource, eventTypes: eventsModule.event_types });
  publishGlobalApi(window, hostContext, result);
  return result;
}

export function publishGlobalApi(globalObject, context, initialized) {
  if (!globalObject || !initialized?.ok) return { ok: false, reason: 'ILBM is not initialized' };
  const api = Object.freeze({
    id: 'ILBM', version: VERSION,
    status: getILBMStatus,
    processText: (text, rules, options) => integration?.ilbr?.processText?.(text, rules, options) ?? { ok: false, original: String(text ?? ''), text: String(text ?? ''), matched: false, matches: [], errors: ['ILBR unavailable'] },
    processMarker: (text, options) => createMarkerResult(text, options),
    capture: (source, getContext, onMarked) => registerMessageCapture(source, context?.eventTypes?.MESSAGE_RECEIVED ?? 'message_received', getContext, onMarked),
  });
  globalObject.ILBM = api;
  try { globalObject.__ILBM_DEBUG_PANEL__ = mountILBMPanel({ api, documentObject: globalObject.document }); } catch { /* UI is optional */ }
  try { globalObject.dispatchEvent?.(new CustomEvent('ilbm:ready', { detail: api })); } catch { /* optional event */ }
  return { ok: true, api };
}

export function installSettingsEntry(globalObject = globalThis, panel) {
  const documentObject = globalObject?.document;
  if (!documentObject?.body || !panel) return false;
  const host = documentObject.querySelector('#extensions_settings, #extensions_settings2, .extensions_settings');
  if (!host || host.querySelector('#ilbm-settings-entry')) return false;
  const card = documentObject.createElement('div'); card.id = 'ilbm-settings-entry'; card.className = 'inline-drawer';
  const title = documentObject.createElement('div'); title.className = 'inline-drawer-toggle inline-drawer-header'; title.textContent = 'ILB-Memory 记忆管理';
  const content = documentObject.createElement('div'); content.className = 'inline-drawer-content';
  const button = documentObject.createElement('button'); button.type = 'button'; button.textContent = '打开 ILB-Memory 记忆管理面板'; button.addEventListener('click', () => { if (typeof panel.open === 'function') panel.open(); else if (panel.root) { panel.root.hidden = false; panel.toggle?.setAttribute('aria-expanded', 'true'); } });
  const hint = documentObject.createElement('p'); hint.className = 'ilbm-settings-hint'; hint.textContent = '管理实体、事件、状态、回放和调试信息。默认不会自动注入记忆。';
  content.append(hint, button); card.append(title, content); host.append(card); return true;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bootILBM().catch(() => {
    // Auxiliary memory features must fail closed and never block ordinary chat.
  });
}
