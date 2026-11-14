import { addRecord, createMemoryState, invalidateFromMessage, invalidateSwipeBranch, registerEntity } from './memory-model.js';
import { validateCandidatePayload } from './candidate-events.js';
import { parseCandidateResponse } from './candidate-parser.js';
import { appendFailure } from './failure-log.js';

const KEY_PREFIX = 'ilbm-memory:';

export function createMemoryStore({ storage = globalThis.localStorage, chatId = 'default' } = {}) {
  const key = `${KEY_PREFIX}${String(chatId)}`;
  let state = load();
  function load() {
    try { return createMemoryState(JSON.parse(storage?.getItem?.(key) ?? '{}')); }
    catch { return createMemoryState(); }
  }
  function save(next) {
    state = createMemoryState(next);
    try { storage?.setItem?.(key, JSON.stringify(state)); }
    catch { /* persistence failure must not block the chat */ }
    return state;
  }
  return {
    get: () => createMemoryState(state),
    save,
    registerEntity(input) { const result = registerEntity(state, input); save(result.state); return result.entity; },
    addRecord(input) { const result = addRecord(state, input); save(result.state); return result.record; },
    previewCandidates(payload, meta = {}) { const result = validateCandidatePayload(payload, { state, ...meta }); return { ...result, state: createMemoryState(state), preview: true }; },
    importCandidates(payload, meta = {}) { const result = validateCandidatePayload(payload, { state, ...meta }); if (result.accepted.length) save(result.state); return { ...result, state: createMemoryState(state), preview: false }; },
    logFailure(input) { const next = { ...state, failures: appendFailure(state, input) }; save(next); return next.failures.at(-1); },
    clearFailures() { return save({ ...state, failures: [] }); },
    importCandidateResponse(raw, meta = {}) { const parsed = parseCandidateResponse(raw); if (!parsed.ok) { const failure = { ...parsed, stage: 'parse', floor: meta.floor, sourceMessageId: meta.sourceMessageId }; const logged = appendFailure(state, failure); save({ ...state, failures: logged }); return { ...parsed, accepted: [], rejected: [], failure: logged.at(-1) }; } const result = validateCandidatePayload(parsed.value, { state, ...meta }); if (result.rejected.length) { const logged = appendFailure(state, { stage: 'validate', floor: meta.floor, sourceMessageId: meta.sourceMessageId, reason: `${result.rejected.length} 个候选事件未通过校验` }); save({ ...state, failures: logged }); return { ...result, parsedSource: parsed.source, failure: logged.at(-1) }; } return { ...result, parsedSource: parsed.source }; },
    invalidateFromMessage(change) { const next = invalidateFromMessage(state, change); save(next); return next; },
    invalidateSwipeBranch(change) { const next = invalidateSwipeBranch(state, change); save(next); return next; },
    setSettings(settings) { return save({ ...state, settings: { ...(state.settings ?? {}), ...(settings ?? {}) } }); },
    removeRecord(id) { return save({ ...state, records: state.records.filter(record => record.id !== String(id)) }); },
    removeEntity(id) { return save({ ...state, entities: state.entities.filter(entity => entity.id !== String(id)) }); },
    inspect() { return createMemoryState(state); },
    reset() { return save(createMemoryState()); },
    key,
  };
}
