import { createMemoryState, getActiveWindowBoundary } from './memory-model.js';
import { resolveMentions } from './mention-resolver.js';

/**
 * 记忆检索模块（§7.5）。
 * 只读取有效记录，不修改存储；时间轴只向过去，统一受活跃窗口边界约束。
 */

function clampInt(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.trunc(number))) : fallback;
}

function compareRecords(a, b) {
  return a.floor - b.floor || a.sequence - b.sequence || String(a.id).localeCompare(String(b.id));
}

function isInjectable(record) {
  return record.valid === true && record.status === 'valid';
}

/**
 * 收集一条记录实际引用的实体 ID。
 * 记录既可能使用 entityIds，也可能使用旧式 action 字段或 stateChanges。
 */
export function getRecordEntityIds(record) {
  const ids = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value.trim()) ids.add(value.trim());
  };
  for (const id of record?.entityIds ?? []) add(id);

  const action = record?.action && typeof record.action === 'object' ? record.action : null;
  if (action) {
    add(action.entityId);
    add(action.ownerId);
    add(action.locationId);
    add(action.targetId);
    add(action.relation?.targetId);
    for (const list of [action.charactersPresent, action.itemsPresent]) {
      if (Array.isArray(list)) list.forEach(add);
    }
  }

  for (const change of record?.stateChanges ?? []) {
    add(change?.entityId);
    add(change?.before);
    add(change?.after);
    add(change?.after?.targetId);
  }
  return [...ids];
}

/** 把用户配置的提及（ID 或短名）解析为稳定的实体 ID。 */
export function resolveMainEntityIds(state, { mentionedEntityIds = null, mentionText = null, maxEntities = Infinity } = {}) {
  const normalized = createMemoryState(state);
  const entities = normalized.entities;
  if (!Array.isArray(entities) || entities.length === 0) return [];

  if (Array.isArray(mentionedEntityIds) && mentionedEntityIds.length > 0) {
    const wanted = new Set(mentionedEntityIds.map((id) => String(id)));
    const ids = [];
    for (const entity of entities) {
      if (wanted.has(entity.id) || wanted.has(entity.name) || entity.aliases.some((alias) => wanted.has(alias))) {
        if (!ids.includes(entity.id)) ids.push(entity.id);
        if (ids.length >= maxEntities) break;
      }
    }
    return ids;
  }

  const text = String(mentionText ?? '');
  if (!text.trim()) return [];
  return resolveMentions(text, entities, { maxEntities }).entityIds;
}

/**
 * 主节点时间线（§2.3）：沿被提及实体向过去追溯记录，深度受 timelineDepth 限制。
 * 活跃区间由 ST 原文提供，因此不重复返回。
 */
export function retrieveMainNodeTimeline(state, { mainEntityIds = [], currentFloor = Infinity, activeWindowLayers, maxRecords } = {}) {
  const normalized = createMemoryState(state);
  const main = new Set((Array.isArray(mainEntityIds) ? mainEntityIds : []).map(String));
  if (main.size === 0) return [];

  const depth = clampInt(maxRecords, normalized.settings.timelineDepth, 0, 1000);
  if (depth === 0) return [];

  const { latest, activeStart } = getActiveWindowBoundary(normalized, { currentFloor, activeWindowLayers });
  const candidates = normalized.records
    .filter((record) => isInjectable(record) && record.floor <= latest && record.floor < activeStart)
    .filter((record) => getRecordEntityIds(record).some((id) => main.has(id)))
    .sort(compareRecords);
  return candidates.slice(-depth);
}

/** 返回与种子记录共享 interactionId 的同组记录（§2.4 保护范围）。 */
export function retrieveInteractionGroup(state, { seedRecords = [], currentFloor = Infinity, activeWindowLayers } = {}) {
  const normalized = createMemoryState(state);
  const interactionIds = new Set(
    (Array.isArray(seedRecords) ? seedRecords : [])
      .map((record) => record?.interactionId)
      .filter((id) => id != null)
      .map(String),
  );
  if (interactionIds.size === 0) return [];

  const { latest, activeStart } = getActiveWindowBoundary(normalized, { currentFloor, activeWindowLayers });
  return normalized.records
    .filter((record) => isInjectable(record) && record.floor <= latest && record.floor < activeStart)
    .filter((record) => record.interactionId != null && interactionIds.has(String(record.interactionId)))
    .sort(compareRecords);
}

/**
 * 关系线补充（§2.3）：从主节点横向带出一跳关联实体的 ID。
 * 只做一跳；被触发实体不再继续扩散，也不进入时间线追溯。
 * 宽度预算优先保留与主节点直接同事件的实体，其次按入度排序。
 */
export function collectRelationLine(state, { mainEntityIds = [], currentFloor = Infinity, maxEntities } = {}) {
  const normalized = createMemoryState(state);
  const main = new Set((Array.isArray(mainEntityIds) ? mainEntityIds : []).map(String));
  const width = clampInt(maxEntities, normalized.settings.relationLineWidth, 0, 20);
  if (main.size === 0 || width === 0) return { entities: [], candidates: [], excludedCount: 0 };

  const { latest } = getActiveWindowBoundary(normalized, { currentFloor });
  const entitiesById = new Map(normalized.entities.map((entity) => [entity.id, entity]));
  const records = normalized.records.filter((record) => isInjectable(record) && record.floor <= latest);
  const mainRecords = records.filter((record) => getRecordEntityIds(record).some((id) => main.has(id)));

  const interactionIds = new Set(mainRecords.map((record) => record.interactionId).filter((id) => id != null).map(String));
  const floors = new Set(mainRecords.map((record) => record.floor));
  const inDegree = new Map();
  for (const record of records) {
    for (const id of getRecordEntityIds(record)) inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
  }

  const candidates = new Map();
  const consider = (id, via) => {
    if (!id || main.has(id) || !entitiesById.has(id)) return;
    const entry = candidates.get(id) ?? {
      entityId: id,
      name: entitiesById.get(id).name,
      type: entitiesById.get(id).type,
      directCount: 0,
      interactionCount: 0,
      floorCount: 0,
      inDegree: inDegree.get(id) ?? 0,
    };
    if (via === 'record') entry.directCount += 1;
    else if (via === 'interaction') entry.interactionCount += 1;
    else if (via === 'floor') entry.floorCount += 1;
    candidates.set(id, entry);
  };

  for (const record of mainRecords) {
    for (const id of getRecordEntityIds(record)) consider(id, 'record');
  }
  for (const record of records) {
    const viaInteraction = record.interactionId != null && interactionIds.has(String(record.interactionId));
    const viaFloor = floors.has(record.floor);
    if (!viaInteraction && !viaFloor) continue;
    for (const id of getRecordEntityIds(record)) {
      if (viaInteraction) consider(id, 'interaction');
      if (viaFloor) consider(id, 'floor');
    }
  }

  const ordered = [...candidates.values()].sort((a, b) => (
    b.directCount - a.directCount
    || b.interactionCount - a.interactionCount
    || b.floorCount - a.floorCount
    || b.inDegree - a.inDegree
    || a.name.localeCompare(b.name)
  ));

  return {
    entities: ordered.slice(0, width),
    candidates: ordered,
    excludedCount: Math.max(0, ordered.length - width),
  };
}
