const NAME_MAX = 120;
const TAG_MAX = 40;
const TYPE_VALUES = new Set(['person', 'item', 'place', 'organization', 'other']);
const STATUS_VALUES = new Set(['intact', 'damaged', 'lost', 'destroyed']);
import { KIND_TAGS, formatStateCard, getStateFieldsForEntityType, getStateFieldsForTags } from './state-schema.js';
import { isSymmetricRelation, normalizeRelation, relationMatches } from './relation-model.js';

const DEFAULT_POST_TIMEOUT_MS = 3000;
const DEFAULT_POST_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_POST_CONTEXT_ROUNDS = 2;
const EXTRACTION_MODE_VALUES = new Set(['direct', 'post']);
const INJECTION_STYLE_VALUES = new Set(['compact', 'narrative']);

// 主 kind 只用于分组与默认字段集，不代表实体能力上限（ADR D-ILBM-V2-004）。
export function getPrimaryKind(tags = []) {
  const list = Array.isArray(tags) ? tags : [];
  return list.find((tag) => KIND_TAGS.includes(tag)) ?? 'other';
}

export function createMemoryState(raw = {}) {
  const state = {
    schema_version: 2,
    entities: normalizeEntities(raw.entities),
    records: normalizeRecords(raw.records),
    settings: normalizeSettings(raw.settings),
    extractionMarks: normalizeExtractionMarks(raw.extractionMarks),
    failures: Array.isArray(raw.failures) ? raw.failures.slice(-100) : [],
  };
  // 标签只增不删：有效历史推导出的 kind 标签在规范化时合并进实体，后续作废记录也保留。
  applyRecordTags(state);
  return state;
}

export function registerEntity(state, input = {}) {
  const next = createMemoryState(state);
  const name = cleanName(input.name);
  if (!name) throw new Error('entity name is required');
  const declaredType = TYPE_VALUES.has(input.type) ? input.type : 'other';
  const tags = normalizeEntityTags(input.tags, declaredType);
  const duplicate = next.entities.filter((entity) => entity.name === name);
  const displayName = duplicate.length ? `${name}${String(duplicate.length + 1).padStart(2, '0')}` : name;
  const entity = {
    id: input.id ? String(input.id) : `ent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: displayName,
    type: getPrimaryKind(tags),
    tags,
    aliases: uniqueStrings(input.aliases),
    createdAt: input.createdAt ?? Date.now(),
  };
  next.entities.push(entity);
  return { state: next, entity };
}

/** 手动编辑标签；空数组表示清除 kind 与自由标签，实体回到 other。 */
export function setEntityTags(state, id, tags = []) {
  const next = createMemoryState(state);
  const index = next.entities.findIndex((entity) => entity.id === String(id));
  if (index < 0) throw new Error(`entity not found: ${id}`);
  const normalized = normalizeEntityTags(tags, 'other');
  next.entities[index] = {
    ...next.entities[index],
    tags: normalized,
    type: getPrimaryKind(normalized),
  };
  return { state: next, entity: next.entities[index] };
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
  applyRecordTags(next);
  return { state: next, record };
}

/**
 * 手动纠错：只改传入的字段，记录 ID 与创建时间保持不变；返回的状态已重新推导。
 * 手动编辑直接有效（§4.3），不经过延迟确认。
 */
export function updateRecord(state, id, patch = {}) {
  const next = createMemoryState(state);
  const index = next.records.findIndex((record) => record.id === String(id));
  if (index < 0) throw new Error(`record not found: ${id}`);
  const current = next.records[index];
  const merged = normalizeRecord({
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt ?? patch.createdAt ?? Date.now(),
    status: patch.status ?? 'valid',
    valid: patch.valid ?? true,
    extractionMode: patch.extractionMode ?? 'manual',
  });
  if (!merged.text) throw new Error('record text is required');
  next.records[index] = merged;
  applyRecordTags(next);
  return { state: next, record: merged };
}

/** 记录/更新一次提取标记（防止同一消息重复提取，§5.2）。 */
export function markExtraction(state, mark = {}) {
  const next = createMemoryState(state);
  const key = String(mark.key ?? '').trim();
  if (!key) return next;
  const entry = normalizeExtractionMark({ ...mark, key });
  next.extractionMarks = [...next.extractionMarks.filter((item) => item.key !== key), entry].slice(-500);
  return next;
}

export function getExtractionMark(state, key) {
  const wanted = String(key ?? '').trim();
  if (!wanted) return null;
  return createMemoryState(state).extractionMarks.find((item) => item.key === wanted) ?? null;
}

export function invalidateFromFloor(state, floor) {
  const next = createMemoryState(state);
  const start = clampInt(floor, 0, 0, 1000000000);
  next.records = next.records.map((record) => record.floor >= start ? { ...record, valid: false } : record);
  // 编辑/删除后必须允许重新提取：作废楼层及之后的提取去重标记。
  next.extractionMarks = next.extractionMarks.filter((mark) => mark.floor < start);
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
  // 新选中的分支需要重新提取；未选中分支的提取标记作废。
  next.extractionMarks = next.extractionMarks.filter((mark) => (
    mark.sourceMessageId !== source || String(mark.swipeId ?? '') === String(selectedSwipeId ?? '')
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

export function calculateCurrentState(state, { currentFloor = Infinity } = {}) {
  const normalized = createMemoryState(state);
  const latest = Number.isFinite(currentFloor)
    ? clampInt(currentFloor, 0, 0, 1000000000)
    : normalized.records.reduce((max, record) => Math.max(max, record.floor), 0);
  const entities = new Map(normalized.entities.map((entity) => [entity.id, { ...entity, state: {}}]));
  // §2.2：时间轴单向，状态推导不得包含当前楼层之后的记录。
  const records = normalized.records
    .filter((record) => record.valid && record.status === 'valid' && record.floor <= latest)
    .sort(compareRecords);
  for (const record of records) applyRecord(entities, record);
  return {
    entities: [...entities.values()],
    cards: buildStateCards(entities),
    recordsApplied: records.map((record) => record.id),
    calculatedAt: Date.now(),
  };
}

/**
 * 活跃区间是闭区间 [activeStart, latest]，由当前有效楼层向前数 N 层得出。
 * 回放、主节点时间线和关系线统一使用该边界，避免各自推导 §2.2 区间。
 */
export function getActiveWindowBoundary(state, { currentFloor = Infinity, activeWindowLayers } = {}) {
  const normalized = createMemoryState(state);
  const active = clampInt(activeWindowLayers, normalized.settings.activeWindowLayers, 2, 1000000000);
  const latest = Number.isFinite(currentFloor)
    ? clampInt(currentFloor, 0, 0, 1000000000)
    : normalized.records.reduce((max, record) => Math.max(max, record.floor), 0);
  const activeStart = Math.max(0, latest - active + 1);
  return { latest, activeStart, activeEnd: latest, activeLayers: active };
}

export function replayRecords(state, { currentFloor = Infinity, activeWindowLayers, replayLayers } = {}) {
  const normalized = createMemoryState(state);
  const { activeStart, latest } = getActiveWindowBoundary(normalized, { currentFloor, activeWindowLayers });
  const replay = clampInt(replayLayers, normalized.settings.replayLayers, 0, 1000000000);
  const replayEnd = Math.min(activeStart - 1, latest);
  const replayStart = Math.max(0, replayEnd - replay + 1);
  return normalized.records.filter((record) => record.valid && record.status === 'valid' && record.floor >= replayStart && record.floor <= replayEnd).sort(compareRecords);
}

function buildStateCards(entities) { 
  // 标签决定分组；organization/自由标签/无标签实体进入 others，仍会生成状态卡并参与注入。
  const cards = { items: [], persons: [], places: [], others: [] };
  const nameOf = (id) => {
    if (id == null) return null;
    const found = entities.get(String(id));
    return found ? found.name : null;
  };
  
  for (const entity of entities.values()) { 
    const tags = Array.isArray(entity.tags) ? entity.tags : [];
    const kind = getPrimaryKind(tags.length ? tags : [entity.type]);
    const card = { 
      entityId: entity.id, 
      name: entity.name, 
      type: kind === 'other' ? entity.type : kind,
      tags,
      state: { ...entity.state },
      displayText: formatStateCard(entity, entity.state, { nameOf })
    }; 
    
    if (kind === 'item') {
      cards.items.push(card);
    } else if (kind === 'person') {
      cards.persons.push(card);
    } else if (kind === 'place') {
      cards.places.push(card);
    } else {
      cards.others.push(card);
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
      applyRelationChange(entities, target, change);
      continue;
    }
    target.state[field] = after;
  }
}

/**
 * 关系是有向边（§2.1/§5.3）：fromId → toId: type（role）。
 * 对称关系类型补出反向边，不对称关系要求两条显式标记。
 */
function applyRelationChange(entities, target, change) {
  const after = change.after;
  if (Array.isArray(after)) {
    target.state.relations = after
      .map((relation) => normalizeRelation(relation, { fromId: target.id }))
      .filter(Boolean);
    return;
  }
  if (!after || typeof after !== 'object') return;
  const toId = after.toId ?? after.targetId ?? change.toId ?? null;
  if (toId == null || String(toId) === '') return;
  const type = after.type == null ? null : String(after.type);
  const role = after.role == null ? null : String(after.role);
  const active = after.active !== false;
  const list = Array.isArray(target.state.relations) ? target.state.relations.slice() : [];

  if (active) {
    const relation = normalizeRelation({ ...after, toId, type, role, establishedAt: after.establishedAt ?? Date.now() }, { fromId: target.id });
    if (!relation.type) relation.type = 'ALLY';
    const filtered = list.filter((item) => !relationMatches(item, { toId, type: relation.type, role: relation.role }));
    target.state.relations = [...filtered, relation];
    mirrorSymmetricRelation(entities, target, { ...relation, fromId: target.id }, toId);
    return;
  }

  // 解除：未指定类型/角色时移除该目标上的全部关系；对称边同时移除反向边。
  const removed = list.filter((item) => relationMatches(item, { toId, type, role }));
  target.state.relations = list.filter((item) => !relationMatches(item, { toId, type, role }));
  const counterpart = entities.get(String(toId));
  if (!counterpart) return;
  const counterpartList = Array.isArray(counterpart.state.relations) ? counterpart.state.relations.slice() : [];
  const removeCounterpart = (item) => {
    if (String(item.toId ?? item.targetId) !== String(target.id)) return false;
    if (type != null && String(item.type ?? '') !== String(type)) return false;
    if (role != null && String(item.role ?? '') !== String(role)) return false;
    return true;
  };
  const counterpartRemoved = counterpartList.filter(removeCounterpart);
  if (counterpartRemoved.length > 0 || removed.some((item) => isSymmetricRelation(item.type))) {
    counterpart.state.relations = counterpartList.filter((item) => !removeCounterpart(item));
  }
}

function mirrorSymmetricRelation(entities, target, relation, toId) {
  if (!isSymmetricRelation(relation.type)) return;
  const counterpart = entities.get(String(toId));
  if (!counterpart) return;
  const list = Array.isArray(counterpart.state.relations) ? counterpart.state.relations.slice() : [];
  const filtered = list.filter((item) => !relationMatches(item, { toId: target.id, type: relation.type }));
  counterpart.state.relations = [...filtered, normalizeRelation({
    toId: target.id,
    type: relation.type,
    role: relation.role,
    establishedAt: relation.establishedAt,
  }, { fromId: counterpart.id })];
}

function applyAction(entities, action) {
  const target = entities.get(String(action.entityId));
  if (!target) return;
  const patch = target.state;
  if (action.field && action.value !== undefined) patch[action.field] = action.value;

  // 按实体标签并集的状态字段定义泛化应用（v2 §2.1 三类卡字段）
  const fieldDefs = getStateFieldsForTags(entityTagsOf(target));
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
  // 关系单独处理，避免覆盖；兼容旧式 { targetId, type }、新式 { toId, type, role }。
  for (const relation of Array.isArray(action.relations) ? action.relations : []) {
    applyRelationChange(entities, target, { field: 'relations', after: relation });
  }
  if (action.relation !== undefined) {
    applyRelationChange(entities, target, { field: 'relations', after: action.relation });
  }
}

function normalizeEntities(value) {
  return (Array.isArray(value) ? value : []).map((item) => {
    const declaredType = TYPE_VALUES.has(item?.type) ? item.type : 'other';
    const tags = normalizeEntityTags(item?.tags, declaredType);
    return {
      id: String(item?.id ?? ''),
      name: cleanName(item?.name),
      type: getPrimaryKind(tags),
      tags,
      aliases: uniqueStrings(item?.aliases),
      createdAt: item?.createdAt ?? 0,
    };
  }).filter((item) => item.id && item.name);
}

// 行为推导标签：动词作用于状态字段时只追加 kind 标签，不删除任何已有标签。
const ACTION_TAG_RULES = Object.freeze({
  转移: { item: [1], person: [2] },
  交给: { item: [1], person: [2] },
  获得: { item: [1], person: [0] },
  失去: { item: [1], person: [0] },
  损坏: { item: [0] },
  修复: { item: [0] },
  销毁: { item: [0] },
  遗失: { item: [0] },
  移动: { place: [1] },
  死亡: { person: [0] },
  受伤: { person: [0] },
  中毒: { person: [0] },
  建立关系: { person: [0, 1] },
  解除关系: { person: [0, 1] },
});

function normalizeEntityTags(value, declaredType = 'other') {
  const tags = uniqueStrings(value).map((tag) => tag.slice(0, TAG_MAX));
  if (!tags.length && declaredType && declaredType !== 'other') return [declaredType];
  return tags;
}

function entityTagsOf(entity) {
  if (Array.isArray(entity?.tags) && entity.tags.length > 0) return entity.tags;
  return entity?.type && entity.type !== 'other' ? [entity.type] : [];
}

function applyRecordTags(state) {
  if (!Array.isArray(state.entities) || !Array.isArray(state.records)) return state;
  const byId = new Map(state.entities.map((entity) => [entity.id, entity]));
  for (const record of state.records) {
    // 待确认与无效记录不参与状态推导，也不得产生标签。
    if (!record || record.valid === false || record.status === 'invalid' || record.status === 'pending') continue;
    for (const hint of deriveRecordTagHints(record)) tagEntity(byId, hint.id, hint.tag);
  }
  return state;
}

function deriveRecordTagHints(record) {
  const hints = [];
  const entityIds = Array.isArray(record.entityIds) ? record.entityIds.map(String) : [];
  const action = record.action;

  if (typeof action === 'string') {
    const rules = ACTION_TAG_RULES[action] ?? {};
    for (const [tag, indexes] of Object.entries(rules)) {
      for (const index of indexes) if (entityIds[index]) hints.push({ id: entityIds[index], tag });
    }
  } else if (action && typeof action === 'object') {
    const owner = action.entityId ? String(action.entityId) : null;
    if (owner) {
      if (action.ownerId !== undefined || action.status !== undefined) hints.push({ id: owner, tag: 'item' });
      if (action.continuousStatus !== undefined || action.relations !== undefined || action.relation !== undefined) hints.push({ id: owner, tag: 'person' });
      if (action.charactersPresent !== undefined) { hints.push({ id: owner, tag: 'place' }); addReferenceHints(hints, action.charactersPresent, 'person'); }
      if (action.itemsPresent !== undefined) { hints.push({ id: owner, tag: 'place' }); addReferenceHints(hints, action.itemsPresent, 'item'); }
    }
    if (action.ownerId) hints.push({ id: String(action.ownerId), tag: 'person' });
    if (action.locationId) hints.push({ id: String(action.locationId), tag: 'place' });
    if (action.relation?.targetId) hints.push({ id: String(action.relation.targetId), tag: 'person' });
    if (Array.isArray(action.relations)) {
      for (const relation of action.relations) if (relation?.targetId) hints.push({ id: String(relation.targetId), tag: 'person' });
    }
  }

  for (const change of Array.isArray(record.stateChanges) ? record.stateChanges : []) {
    const id = change?.entityId ? String(change.entityId) : null;
    if (!id) continue;
    const field = String(change.field ?? '');
    if (field === 'ownerId' || field === 'status') hints.push({ id, tag: 'item' });
    if (field === 'ownerId' && change.after) hints.push({ id: String(change.after), tag: 'person' });
    if (field === 'continuousStatus' || field === 'relations') hints.push({ id, tag: 'person' });
    if (field === 'relations' && change.after?.targetId) hints.push({ id: String(change.after.targetId), tag: 'person' });
    if (field === 'locationId' && change.after) hints.push({ id: String(change.after), tag: 'place' });
    if (field === 'charactersPresent') { hints.push({ id, tag: 'place' }); addReferenceHints(hints, change.after, 'person'); }
    if (field === 'itemsPresent') { hints.push({ id, tag: 'place' }); addReferenceHints(hints, change.after, 'item'); }
  }

  return hints;
}

function addReferenceHints(hints, value, tag) {
  for (const id of Array.isArray(value) ? value : [value]) {
    if (id) hints.push({ id: String(id), tag });
  }
}

function tagEntity(byId, id, tag) {
  const entity = byId.get(String(id));
  if (!entity) return;
  const tags = Array.isArray(entity.tags) ? entity.tags : [];
  if (tags.includes(tag)) return;
  const next = [...tags, tag];
  entity.tags = next;
  entity.type = getPrimaryKind(next);
}
// §5.2 提取模式与模式 B 配置、§6 注入风格、§2 窗口设置。
// 嵌套配置在每次规范化时重建，避免旧字段残留导致设置不可预测。
function normalizeSettings(input) {
  const value = input && typeof input === 'object' ? input : {};
  const post = value.postApi && typeof value.postApi === 'object' ? value.postApi : {};
  return {
    activeWindowLayers: clampInt(value.activeWindowLayers, 5, 2, 1000),
    replayLayers: clampInt(value.replayLayers, 10, 0, 10000),
    // §2.3：默认 1 跳；宽度是实体数上限，默认 3，可配置。
    relationLineWidth: clampInt(value.relationLineWidth, 3, 0, 20),
    // §1.4：从主节点沿事件链向过去追溯的记录数上限。
    timelineDepth: clampInt(value.timelineDepth, 20, 0, 1000),
    extractionMode: EXTRACTION_MODE_VALUES.has(value.extractionMode) ? value.extractionMode : 'direct',
    injectionStyle: INJECTION_STYLE_VALUES.has(value.injectionStyle) ? value.injectionStyle : 'compact',
    postApi: {
      baseUrl: cleanSettingText(post.baseUrl ?? value.postApiBaseUrl, 500),
      apiKey: cleanSettingText(post.apiKey ?? value.postApiKey, 500),
      model: cleanSettingText(post.model ?? value.postApiModel, 200),
      prompt: String(post.prompt ?? value.postExtractPrompt ?? '').slice(0, 8000),
      contextRounds: clampInt(post.contextRounds ?? value.postContextRounds, DEFAULT_POST_CONTEXT_ROUNDS, 1, 10),
      timeoutMs: clampInt(post.timeoutMs ?? value.postTimeoutMs, DEFAULT_POST_TIMEOUT_MS, 500, 60000),
      requestTimeoutMs: clampInt(post.requestTimeoutMs ?? value.postRequestTimeoutMs, DEFAULT_POST_REQUEST_TIMEOUT_MS, 1000, 120000),
    },
  };
}

function cleanSettingText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeExtractionMarks(value) {
  return (Array.isArray(value) ? value : []).map(normalizeExtractionMark).filter((item) => item.key).slice(-500);
}

function normalizeExtractionMark(item = {}) {
  return {
    key: String(item.key ?? '').trim(),
    floor: clampInt(item.floor, 0, 0, 1000000000),
    sourceMessageId: item.sourceMessageId == null ? null : String(item.sourceMessageId),
    swipeId: item.swipeId ?? null,
    mode: ['direct', 'post', 'manual'].includes(item.mode) ? item.mode : 'post',
    status: ['started', 'done', 'failed'].includes(item.status) ? item.status : 'started',
    reason: item.reason == null ? null : String(item.reason).slice(0, 300),
    at: Number.isFinite(Number(item.at)) ? Number(item.at) : 0,
  };
}

function normalizeRecords(value) { return (Array.isArray(value) ? value : []).map(normalizeRecord).filter((item) => item.id && item.text); }
function normalizeRecord(item = {}) {
  return { id: String(item.id ?? ''), text: String(item.text ?? '').trim(), floor: clampInt(item.floor, 0, 0, 1000000000), sequence: clampInt(item.sequence, 1, 1, 1000000), interactionId: item.interactionId ? String(item.interactionId) : null, sourceMessageId: item.sourceMessageId ? String(item.sourceMessageId) : null, swipeId: item.swipeId ?? null, valid: item.valid !== false, status: ['pending','valid','invalid'].includes(item.status) ? item.status : (item.valid === false ? 'invalid' : 'valid'), extractionMode: ['direct','post','manual'].includes(item.extractionMode) ? item.extractionMode : 'manual', storyTime: item.storyTime ?? null, entityIds: uniqueStrings(item.entityIds), action: normalizeRecordAction(item.action), stateChanges: Array.isArray(item.stateChanges) ? item.stateChanges.slice() : [], createdAt: item.createdAt ?? 0 };
}

// 动作既可能是旧式结构化对象，也可能是模式 A 白名单动作字符串。
// 早期实现只保留对象，导致 direct 记录的动作在持久化后被清空（事件列表缺少动作列）。
function normalizeRecordAction(value) {
  if (typeof value === 'string') { const text = value.trim(); return text ? text : null; }
  if (value && typeof value === 'object') return { ...value };
  return null;
}
function compareRecords(a, b) { return a.floor - b.floor || a.sequence - b.sequence || String(a.id).localeCompare(String(b.id)); }
function cleanName(value) { return String(value ?? '').trim().slice(0, NAME_MAX); }
function uniqueStrings(value) { return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item ?? '').trim()).filter(Boolean))]; }
function clampInt(value, fallback, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.trunc(number))) : fallback; }
