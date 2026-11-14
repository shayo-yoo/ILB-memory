import { addRecord, createMemoryState, invalidateFromMessage, invalidateSwipeBranch, registerEntity } from './memory-model.js';

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
