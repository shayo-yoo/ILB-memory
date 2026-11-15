import { createMemoryEnvelope, readMemoryEnvelope } from './memory-schema.js';

export function createMemoryStorage({ ilbApi = null, legacyStorage = globalThis.localStorage, chatId = 'default', key = 'ilbm_memory' } = {}) {
  const scopedKey = `ilbm-memory:${chatId}`;
  function read() {
    try {
      const snapshot = ilbApi?.snapshot?.();
      const value = snapshot?.vars?.[key];
      if (value !== undefined) return readMemoryEnvelope(typeof value === 'string' ? JSON.parse(value) : value);
    } catch {}
    try {
      const raw = legacyStorage?.getItem?.(scopedKey);
      return raw ? readMemoryEnvelope(JSON.parse(raw)) : { ok: false, reason: 'memory not found' };
    } catch { return { ok: false, reason: 'memory read failed' }; }
  }
  function write(memory) {
    const envelope = createMemoryEnvelope(memory);
    const payload = JSON.stringify(envelope);
    if (typeof ilbApi?.set === 'function') { const result = ilbApi.set(key, payload); if (result?.ok) return { ok: true, backend: 'ilb', envelope }; }
    try { legacyStorage?.setItem?.(scopedKey, payload); return { ok: true, backend: 'legacy', envelope }; } catch (error) { return { ok: false, error: String(error?.message ?? error) }; }
  }
  function remove() {
    try { ilbApi?.remove?.(key); } catch {}
    try { legacyStorage?.removeItem?.(scopedKey); } catch {}
    return { ok: true };
  }
  return { key, chatId, read, write, remove };
}
