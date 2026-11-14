import { createIlbrService, createIlbmMarkerRule, createLiteralRemovalRule, inspectRegexRule, processText } from './ilbr-engine.js';

export const ILBM_MARKER = '(((ILBM:{内容})))';
export const ILBM_MESSAGE_FORMATTER_HOOK_ID = 'ilbm-marker-display-filter';
export const ILBM_PROMPT_HOOK_EVENT = 'CHAT_COMPLETION_PROMPT_READY';
export const ILBM_GENERATE_DATA_EVENT = 'GENERATE_AFTER_DATA';
export const ILBM_CAPTURE_EVENT = 'MESSAGE_RECEIVED';

/** Build marker match/transform variants from unchanged source text. */
export function createMarkerResult(original, { marker = ILBM_MARKER, rules = [] } = {}) {
  if (typeof original !== 'string') {
    return { ok: false, original: '', triggered: false, displayText: '', promptText: '', extractionText: '', errors: ['message must be a string'] };
  }
  const allRules = [...rules, createIlbmMarkerRule(marker)];
  const inspected = processText(original, allRules, { scope: 'all' });
  if (!inspected.ok) return { ok: false, original, triggered: false, displayText: original, promptText: original, extractionText: original, errors: inspected.errors };
  const display = processText(original, allRules, { scope: 'display' });
  const prompt = processText(original, allRules, { scope: 'prompt' });
  const markerMatch = processText(original, [createIlbmMarkerRule(marker)], { scope: 'all' });
  return {
    ok: true,
    original,
    triggered: markerMatch.matched,
    displayText: display.ok ? display.text : original,
    promptText: prompt.ok ? prompt.text : original,
    extractionText: markerMatch.matched ? markerMatch.text : original,
    matches: inspected.matches.filter((item) => item.ruleId !== 'ilbm-marker'),
    errors: [...inspected.errors, ...display.errors, ...prompt.errors, ...markerMatch.errors],
  };
}

/** Register a display-only filter through ST's synchronous public MessageFormatter API. */
export function registerDisplayFilter(messageFormatter, getOptions = () => ({})) {
  if (!messageFormatter || typeof messageFormatter.addHook !== 'function') return { ok: false, reason: 'ST messageFormatter.addHook is unavailable' };
  if (registeredFormatters.has(messageFormatter)) return { ok: true, duplicate: true };
  try {
    const stage = messageFormatter.stage?.BEFORE_REGEX ?? 'beforeRegex';
    const order = messageFormatter.order?.EARLY ?? 10;
    messageFormatter.addHook((text, context) => {
      try {
        if (context?.isSystem) return text;
        const options = getOptions();
        const result = createMarkerResult(text, { marker: options?.marker ?? ILBM_MARKER });
        return result.ok ? result.displayText : text;
      } catch { return text; }
    }, { stage, order });
    registeredFormatters.add(messageFormatter);
    return { ok: true, stage, order };
  } catch (error) {
    return { ok: false, reason: String(error?.message ?? error) };
  }
}

/** Register request-copy prompt filters plus the new assistant-message capture event. */
export function registerPromptFilter(eventSource, eventTypes, getOptions = () => ({})) {
  if (!eventSource || typeof eventSource.on !== 'function') return { ok: false, reason: 'ST eventSource.on is unavailable' };
  if (registeredPromptSources.has(eventSource)) return { ok: true, duplicate: true };
  const event = eventTypes?.CHAT_COMPLETION_PROMPT_READY ?? 'chat_completion_prompt_ready';
  const promptListener = async (eventData) => {
    try {
      const chat = eventData?.chat;
      if (!Array.isArray(chat)) return;
      for (const message of chat) {
        if (!message) continue;
        const content = message.content;
        if (typeof content !== 'string' && !Array.isArray(content)) continue;
        // Preserve multimodal ordering/metadata: MVP rewrites only a single text block.
        if (Array.isArray(content) && (content.length !== 1 || content.some((part) => part && part.type !== 'text'))) continue;
        const original = typeof content === 'string' ? content : String(content[0]?.text ?? '');
        const result = createMarkerResult(original, getOptions());
        if (!result.ok) continue;
        message.content = typeof content === 'string' ? result.promptText : replaceTextParts(content, result.promptText);
      }
    } catch { /* optional filter must never block generation */ }
  };
  const generateEvent = eventTypes?.GENERATE_AFTER_DATA ?? ILBM_GENERATE_DATA_EVENT;
  const generateListener = async (data) => {
    try {
      if (!data || typeof data !== 'object') return;
      const key = typeof data.prompt === 'string' ? 'prompt' : typeof data.input === 'string' ? 'input' : null;
      if (!key) return;
      const result = createMarkerResult(data[key], getOptions());
      if (result.ok) data[key] = result.promptText;
      // No memory callback here: generic request data lacks stable source-message identity.
    } catch { /* optional filter must never block generation */ }
  };
  try {
    eventSource.on(event, promptListener);
    eventSource.on(generateEvent, generateListener);
    registeredPromptSources.set(eventSource, { event, promptListener, generateEvent, generateListener });
    return { ok: true, event, generateEvent };
  } catch (error) {
    return { ok: false, reason: String(error?.message ?? error) };
  }
}

/** Capture only newly received assistant messages, never replay all prompt history as new records. */
export function registerMessageCapture(eventSource, eventName = ILBM_CAPTURE_EVENT, getContext = () => ({}), onMarked = () => {}) {
  if (!eventSource || typeof eventSource.on !== 'function') return { ok: false, reason: 'ST eventSource.on is unavailable' };
  if (registeredCaptureSources.has(eventSource)) return { ok: true, duplicate: true };
  const listener = (messageIndex, source = '') => {
    try {
      const context = getContext() ?? {};
      const chat = context.getChat?.();
      if (!Array.isArray(chat) || !Number.isInteger(messageIndex) || messageIndex < 0 || messageIndex >= chat.length) return;
      const message = chat[messageIndex];
      if (!message || message.is_user === true || typeof message.mes !== 'string') return;
      const result = createMarkerResult(message.mes, { marker: context.marker ?? ILBM_MARKER });
      if (!result.ok || !result.triggered) return;
      const chatId = String(context.chatId ?? 'unknown-chat');
      const sourceKey = makeSourceKey(chatId, messageIndex, message.swipe_id ?? '', message.mes);
      notifyMarked(onMarked, { result, message: cloneSafe(message), index: messageIndex, chatId, sourceKey, dryRun: false, source: 'message-received', eventSource: String(source) });
    } catch { /* extraction callbacks cannot affect normal chat */ }
  };
  try {
    eventSource.on(eventName, listener);
    registeredCaptureSources.set(eventSource, { eventName, listener });
    return { ok: true, event: eventName };
  } catch (error) { return { ok: false, reason: String(error?.message ?? error) }; }
}

function replaceTextParts(parts, text) {
  if (parts.length === 0) return parts;
  return parts.map((part, index) => index === 0 ? { ...part, text } : { ...part, text: '' });
}
function cloneSafe(value) { try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); } }
function makeSourceKey(chatId, index, swipeId, text) {
  let hash = 2166136261;
  const source = `${chatId}:${index}:${swipeId}:${text}`;
  for (let i = 0; i < source.length; i += 1) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return `ilbm:${chatId}:${index}:${swipeId}:${(hash >>> 0).toString(16)}`;
}
function notifyMarked(callback, payload) {
  try { const outcome = callback(payload); if (outcome && typeof outcome.then === 'function') outcome.catch(() => {}); }
  catch { /* storage/extractor failures never block chat */ }
}
const registeredFormatters = new WeakSet();
const registeredPromptSources = new WeakMap();
const registeredCaptureSources = new WeakMap();

export function createIlbmBridge(options = {}) {
  const ilbr = options.ilbr ?? createIlbrService();
  return Object.freeze({
    id: 'ILBM', version: options.version ?? '0.1.0',
    processText, inspectRegexRule,
    createLiteralRemovalRule, createIlbmMarkerRule,
  });
}
