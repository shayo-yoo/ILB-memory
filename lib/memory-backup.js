import { createMemoryState } from './memory-model.js';

export const MEMORY_BACKUP_SCHEMA_VERSION = 2;

export function exportMemory(state) {
  return { kind: 'ilbm-memory', schema_version: MEMORY_BACKUP_SCHEMA_VERSION, exported_at: Date.now(), memory: createMemoryState(state) };
}

export function importMemory(payload) {
  const raw = payload?.memory ?? payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, error: '备份不是对象' };
  if (payload.kind && payload.kind !== 'ilbm-memory') return { ok: false, error: '不是 ILBM 记忆备份' };
  if (payload.schema_version != null && Number(payload.schema_version) > MEMORY_BACKUP_SCHEMA_VERSION) return { ok: false, error: '备份版本高于当前版本' };
  if (!raw || !Array.isArray(raw.entities) || !Array.isArray(raw.records)) return { ok: false, error: '备份缺少 entities 或 records' };
  // schema 1 的实体只有 type；createMemoryState 会把 type 迁移为 tags。
  return { ok: true, state: createMemoryState(raw) };
}
