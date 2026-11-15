const NAME_MAX = 120;
const TYPE_VALUES = new Set(['person', 'item', 'place', 'organization', 'other']);
const STATUS_VALUES = new Set(['intact', 'damaged', 'lost', 'destroyed']);
import { formatStateCard, getStateFieldsForEntityType } from './state-schema.js';

export function createMemoryState(raw = {}) {
  return {
    schema_version: 1,
    entities: normalizeEntities(raw.entities),
    records: normalizeRecords(raw.records),
    settings: {
      activeWindowLayers: clampInt(raw.settings?.activeWindowLayers, 5, 0, 1000),
      replayLayers: clampInt(raw.settings?.replayLayers, 10, 0, 10000),
    },
    failures: Array.isArray(raw.failures) ? raw.failures.slice(-100) : [],
  };
}

export function registerEntity(state, input = {}) {
  const next = createMemoryState(state);
  const name = cleanName(input.name);
  if (!name) throw new Error('entity name is required');
  const type = TYPE_VALUES.has(input.type) ? input.type : 'other';
  const duplicate = next.entities.filter((entity) => entity.name === name);
  const displayName = duplicate.length ? `${name}${String(duplicate.length + 1).padStart(2, '0')}` : name;
  const entity = {
    id: input.id ? String(input.id) : `ent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: displayName,
    type,
    aliases: uniqueStrings(input.aliases),
    createdAt: input.createdAt ?? Date.now(),
  };
  next.entities.push(entity);
  return { state: next, entity };
}

export function addRecord(state, input = {}) {
  const next = createMemoryState(state);
  const record = normalizeRecord({
    ...input,
    id: input.id ? String(input.id) : `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    valid: input.valid !== false,
    floor: clampInt(input.floor, 0, 0, 1000000000),
    sequence: clampInt(input.sequence, next.records.filter((item) => item.floor === clampInt(input.floor, 0, 0, 1000000000)).length + 1, 1, 1000000),
  });
  if (!record.text) throw new Error('record text is required');
  if (next.records.some((item) => item.id === record.id)) throw new Error(`record id already exists: ${record.id}`);
  next.records.push(record);
  return { state: next, record };
}

export function invalidateFromFloor(state, floor) {
  const next = createMemoryState(state);
  const start = clampInt(floor, 0, 0, 1000000000);
  next.records = next.records.map((record) => record.floor >= start ? { ...record, valid: false } : record);
  return next;
}

/**
 * Editing/deleting a message invalidates that floor and every later record.
 * The caller must re-extract from the edit floor; this function never deletes history.
 */
export function invalidateFromMessage(state, { floor, sourceMessageId } = {}) {
  const next = invalidateFromFloor(state, floor);
  const source = sourceMessageId == null ? null : String(sourceMessageId);
  if (!source) return next;
  next.records = next.records.map((record) => record.sourceMessageId === source ? { ...record, valid: false } : record);
  return next;
}

/** Mark records belonging to a non-selected swipe as invalid without deleting them. */
export function invalidateSwipeBranch(state, { sourceMessageId, selectedSwipeId } = {}) {
  const next = createMemoryState(state);
  const source = sourceMessageId == null ? null : String(sourceMessageId);
  if (!source) return next;
  next.records = next.records.map((record) => (
    record.sourceMessageId === source && String(record.swipeId ?? '') !== String(selectedSwipeId ?? '')
      ? { ...record, valid: false }
      : record
  ));
  return next;
}

/** Recalculate immediately after an invalidation; returned state is derived, not cached. */
export function recomputeAfterChange(state, change) {
  const next = change?.kind === 'swipe'
    ? invalidateSwipeBranch(state, change)
    : invalidateFromMessage(state, change);
  return { state: next, current: calculateCurrentState(next) };
}

export function calculateCurrentState(state) {
  const normalized = createMemoryState(state);
  const entities = new Map(normalized.entities.map((entity) => [entity.id, { ...entity, state: {}}]));
  const records = normalized.records.filter((record) => record.valid && record.status === 'valid').sort(compareRecords);
  for (const record of records) applyRecord(entities, record);
  return {
    entities: [...entities.values()],
    cards: buildStateCards(entities),
    recordsApplied: records.map((record) => record.id),
    calculatedAt: Date.now(),
  };
}

export function replayRecords(state, { currentFloor = Infinity, activeWindowLayers, replayLayers } = {}) {
  const normalized = createMemoryState(state);
  const active = clampInt(activeWindowLayers, normalized.settings.activeWindowLayers, 0, 1000000000);
  const replay = clampInt(replayLayers, normalized.settings.replayLayers, 0, 1000000000);
  const latest = Number.isFinite(currentFloor) ? currentFloor : normalized.records.reduce((max, record) => Math.max(max, record.floor), 0);
  const activeStart = Math.max(0, latest - active + 1);
  const replayEnd = activeStart - 1;
  const replayStart = Math.max(0, replayEnd - replay + 1);
  return normalized.records.filter((record) => record.valid && record.status === 'valid' && record.floor >= replayStart && record.floor <= replayEnd).sort(compareRecords);
}

function buildStateCards(entities) { 
  const cards = { items: [], persons: [], places: [] }; 
  const nameOf = (id) => {
    if (id == null) return null;
    const found = entities.get(String(id));
    return found ? found.name : null;
  };
  
  for (const entity of entities.values()) { 
    const card = { 
      entityId: entity.id, 
      name: entity.name, 
      type: entity.type,
      state: { ...entity.state },
      displayText: formatStateCard(entity, entity.state, { nameOf })
    }; 
    
    if (entity.type === 'item') {
      cards.items.push(card);
    } else if (entity.type === 'person') {
      cards.persons.push(card);
    } else if (entity.type === 'place') {
      cards.places.push(card);
    }
  } 
  
  return cards; 
}

function applyRecord(entities, record) {
  const action = record.action ?? {};
  // 1) 旧式显式 action 对象（手动编辑/兼容路径）
  if (action && typeof action === 'object' && Object.keys(action).length > 0) applyAction(entities, action);
  // 2) v2 stateChanges 列表（direct/post 提取路径）
  if (Array.isArray(record.stateChanges) && record.stateChanges.length > 0) applyStateChanges(entities, record.stateChanges);
}

function applyStateChanges(entities, stateChanges) {
  for (const change of stateChanges) {
    const target = entities.get(String(change.entityId ?? ''));
    if (!target) continue;
    const field = String(change.field ?? '').trim();
    if (!field) continue;
    const after = change.after;
    if (after === undefined) continue;
    if (field === 'relations') {
      const relations = Array.isArray(target.state.relations) ? target.state.relations.slice() : [];
      const rel = after ?? {};
      const targetId = rel.targetId ?? null;
      const type = rel.type ?? null;
      const filtered = relations.filter((item) => !(item && item.targetId === targetId && item.type === type));
      if (rel.active === false) target.state.relations = filtered;
      else target.state.relations = [...filtered, { targetId, type, establishedAt: rel.establishedAt ?? Date.now() }];
      continue;
    }
    target.state[field] = after;
  }
}

function applyAction(entities, action) {
  const target = entities.get(String(action.entityId));
  if (!target) return;
  const patch = target.state;
  if (action.field && action.value !== undefined) patch[action.field] = action.value;

  // 按实体类型的状态字段定义泛化应用（v2 §2.1 三类卡字段）
  const fieldDefs = getStateFieldsForEntityType(target.type);
  for (const fieldDef of Object.values(fieldDefs)) {
    if (!Object.prototype.hasOwnProperty.call(action, fieldDef.key)) continue;
    const value = action[fieldDef.key];
    if (value === undefined) continue;
    if (fieldDef.type === 'relation_list') continue; // 关系单独处理，避免覆盖
    patch[fieldDef.key] = value;
  }

  // 兼容旧的显式字段
  if (action.ownerId !== undefined) patch.ownerId = action.ownerId;
  if (action.locationId !== undefined) patch.locationId = action.locationId;
  if (action.status && STATUS_VALUES.has(action.status)) patch.status = action.status;
  if (action.relation !== undefined) {
    const relations = Array.isArray(patch.relations) ? patch.relations.slice() : [];
    if (action.relation.active === false) {
      target.state.relations = relations.filter((item) => item.targetId !== action.relation.targetId || item.type !== action.relation.type);
    } else {
      target.state.relations = [...relations.filter((item) => item.targetId !== action.relation.targetId || item.type !== action.relation.type), action.relation];
    }
  }
}

function normalizeEntities(value) {
  return (Array.isArray(value) ? value : []).map((item) => ({
    id: String(item?.id ?? ''), name: cleanName(item?.name), type: TYPE_VALUES.has(item?.type) ? item.type : 'other', aliases: uniqueStrings(item?.aliases), createdAt: item?.createdAt ?? 0,
  })).filter((item) => item.id && item.name);
}
function normalizeRecords(value) { return (Array.isArray(value) ? value : []).map(normalizeRecord).filter((item) => item.id && item.text); }
function normalizeRecord(item = {}) {
  return { id: String(item.id ?? ''), text: String(item.text ?? '').trim(), floor: clampInt(item.floor, 0, 0, 1000000000), sequence: clampInt(item.sequence, 1, 1, 1000000), interactionId: item.interactionId ? String(item.interactionId) : null, sourceMessageId: item.sourceMessageId ? String(item.sourceMessageId) : null, swipeId: item.swipeId ?? null, valid: item.valid !== false, status: ['pending','valid','invalid'].includes(item.status) ? item.status : (item.valid === false ? 'invalid' : 'valid'), extractionMode: ['direct','post','manual'].includes(item.extractionMode) ? item.extractionMode : 'manual', storyTime: item.storyTime ?? null, entityIds: uniqueStrings(item.entityIds), action: item.action && typeof item.action === 'object' ? { ...item.action } : null, stateChanges: Array.isArray(item.stateChanges) ? item.stateChanges.slice() : [], createdAt: item.createdAt ?? 0 };
}
function compareRecords(a, b) { return a.floor - b.floor || a.sequence - b.sequence || String(a.id).localeCompare(String(b.id)); }
function cleanName(value) { return String(value ?? '').trim().slice(0, NAME_MAX); }
function uniqueStrings(value) { return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item ?? '').trim()).filter(Boolean))]; }
function clampInt(value, fallback, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.trunc(number))) : fallback; }
