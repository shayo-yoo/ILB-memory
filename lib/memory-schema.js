export const MEMORY_SCHEMA_VERSION = 2;
export const MEMORY_STATUS = Object.freeze({ PENDING: 'pending', VALID: 'valid', INVALID: 'invalid' });
export const EXTRACTION_MODE = Object.freeze({ DIRECT: 'direct', POST: 'post', MANUAL: 'manual' });

export function createMemoryEnvelope(memory = {}) {
  return { kind: 'ilbm-memory', schemaVersion: MEMORY_SCHEMA_VERSION, memory: structuredCloneSafe(memory), updatedAt: Date.now() };
}

export function readMemoryEnvelope(value) {
  if (!value || typeof value !== 'object') return { ok: false, reason: 'memory envelope must be an object' };
  if (value.kind !== 'ilbm-memory') return { ok: false, reason: 'unsupported memory kind' };
  if (Number(value.schemaVersion) > MEMORY_SCHEMA_VERSION) return { ok: false, reason: 'memory schema is newer than this extension' };
  return { ok: true, memory: structuredCloneSafe(value.memory ?? {}), schemaVersion: Number(value.schemaVersion) || 1 };
}

export function normalizeRecordStatus(record, fallback = MEMORY_STATUS.VALID) {
  const status = String(record?.status ?? '').toLowerCase();
  return Object.values(MEMORY_STATUS).includes(status) ? status : fallback;
}

export function normalizeExtractionMode(record, fallback = EXTRACTION_MODE.MANUAL) {
  const mode = String(record?.extractionMode ?? '').toLowerCase();
  return Object.values(EXTRACTION_MODE).includes(mode) ? mode : fallback;
}

function structuredCloneSafe(value) { try { return JSON.parse(JSON.stringify(value)); } catch { return {}; } }
