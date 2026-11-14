import { createMemoryState } from './memory-model.js';

export function exportMemory(state) {
  return { kind: 'ilbm-memory', schema_version: 1, exported_at: Date.now(), memory: createMemoryState(state) };
}

export function importMemory(payload) {
  const raw = payload?.memory ?? payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, error: '备份不是对象' };
  if (payload.kind && payload.kind !== 'ilbm-memory') return { ok: false, error: '不是 ILBM 记忆备份' };
  if (payload.schema_version != null && Number(payload.schema_version) > 1) return { ok: false, error: '备份版本高于当前版本' };
  if (!raw || !Array.isArray(raw.entities) || !Array.isArray(raw.records)) return { ok: false, error: '备份缺少 entities 或 records' };
  return { ok: true, state: createMemoryState(raw) };
}
