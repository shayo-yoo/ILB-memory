import { addRecord, createMemoryState } from './memory-model.js';
import { deriveStateChanges } from './action-state.js';

const KINDS = new Set(['fact', 'state', 'relation']);

/**
 * 校验并（在调用方允许时）写入候选事件。模式 A 与模式 B 共用同一出口（§5.2/§3.3）。
 *
 * 候选可以来自外部模型（模式 B），因此同时接受：
 * - entityIds（实体 ID）或 entities（实体短名，需要 resolveEntities）；
 * - action 字符串（按白名单推导 stateChanges）或旧式 action 对象；
 * - stateChanges 中的实体引用既可以是 ID，也可以是短名。
 */
export function validateCandidatePayload(payload, {
  state = createMemoryState(),
  floor = 0,
  sourceMessageId = null,
  swipeId = null,
  status = 'valid',
  extractionMode = 'post',
  resolveEntities = null,
} = {}) {
  const candidates = Array.isArray(payload) ? payload : payload?.events;
  if (!Array.isArray(candidates)) return { ok: false, accepted: [], rejected: [{ index: -1, reason: '候选事件必须是数组，或 {events: []}' }] };
  const accepted = [];
  const rejected = [];
  let working = createMemoryState(state);
  candidates.forEach((candidate, index) => {
    const result = validateOne(candidate, { working, floor, sourceMessageId, swipeId, status, extractionMode, resolveEntities });
    if (!result.ok) { rejected.push({ index, reason: result.reason }); return; }
    try {
      const added = addRecord(working, result.record);
      working = added.state;
      accepted.push(added.record);
    } catch (error) { rejected.push({ index, reason: String(error?.message ?? error) }); }
  });
  return { ok: rejected.length === 0, accepted, rejected, state: working };
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function validateOne(candidate, defaults) {
  if (!candidate || typeof candidate !== 'object') return { ok: false, reason: '事件不是对象' };
  const text = String(candidate.text ?? candidate.description ?? '').trim();
  if (!text) return { ok: false, reason: '缺少事件文本 text' };
  const kind = candidate.kind == null ? 'fact' : String(candidate.kind);
  if (!KINDS.has(kind)) return { ok: false, reason: `不支持的事件类型：${kind}` };

  const resolver = typeof defaults.resolveEntities === 'function' ? defaults.resolveEntities : null;
  const names = uniqueStrings(candidate.entities);
  let resolution = null;
  try { resolution = resolver && names.length ? resolver(names) : null; } catch { resolution = null; }
  // 解析短名时可能注册了新实体；把它们并入本次校验的工作状态，
  // 否则 addRecord 保存的结果会覆盖掉刚注册的实体。
  for (const created of resolution?.created ?? []) {
    const id = created?.id;
    if (id && !defaults.working.entities.some((entity) => entity.id === String(id))) {
      defaults.working.entities.push({ ...created });
    }
  }
  const nameToId = new Map((resolution?.results ?? []).map((item) => [String(item.name), String(item.entityId)]));
  // 没有解析器时仍可按现有实体短名匹配；匹配不到的短名必须拒绝。
  for (const name of names) {
    if (nameToId.has(name)) continue;
    const found = defaults.working.entities.find((entity) => entity.name === name || (entity.aliases ?? []).includes(name));
    if (found) nameToId.set(name, found.id);
  }
  if (names.length > 0) {
    const unresolved = names.filter((name) => !nameToId.has(name));
    if (unresolved.length > 0) return { ok: false, reason: `引用了不存在的实体：${unresolved.join('、')}` };
  }
  const mapRef = (value) => {
    if (value == null) return value;
    const text = String(value).trim();
    return nameToId.get(text) ?? text;
  };
  const exists = (id) => defaults.working.entities.some((entity) => entity.id === String(id));
  const unknown = [];
  const checkRef = (value, label) => {
    const mapped = mapRef(value);
    if (mapped == null || String(mapped).trim() === '') return mapped;
    if (!exists(mapped)) unknown.push(`${label}：${mapped}`);
    return mapped;
  };

  const entityIds = uniqueStrings([
    ...(Array.isArray(candidate.entityIds) ? candidate.entityIds : []).map(mapRef),
    ...(resolution?.entityIds ?? []),
    ...names.map((name) => nameToId.get(name)),
  ]);

  let action = null;
  if (typeof candidate.action === 'string') {
    action = candidate.action.trim() || null;
  } else if (candidate.action && typeof candidate.action === 'object') {
    action = { ...candidate.action };
    if (action.entityId != null) action.entityId = checkRef(action.entityId, '动作主体');
    if (action.ownerId != null) action.ownerId = checkRef(action.ownerId, '持有者');
    if (action.locationId != null) action.locationId = checkRef(action.locationId, '位置');
    if (action.targetId != null) action.targetId = checkRef(action.targetId, '动作目标');
    if (action.relation && typeof action.relation === 'object') {
      action.relation = { ...action.relation };
      if (action.relation.targetId != null) action.relation.targetId = checkRef(action.relation.targetId, '关系目标');
      if (action.relation.toId != null) action.relation.toId = checkRef(action.relation.toId, '关系目标');
    }
    for (const key of ['charactersPresent', 'itemsPresent']) {
      if (Array.isArray(action[key])) action[key] = action[key].map((id) => checkRef(id, key));
    }
  }

  let stateChanges = [];
  if (Array.isArray(candidate.stateChanges)) {
    stateChanges = candidate.stateChanges.map((change) => {
      if (!change || typeof change !== 'object') return null;
      const entityId = checkRef(change.entityId, '状态变更实体');
      let after = change.after;
      if (after && typeof after === 'object' && !Array.isArray(after)) {
        after = { ...after };
        if (after.toId != null) after.toId = checkRef(after.toId, '关系目标');
        if (after.targetId != null) after.targetId = checkRef(after.targetId, '关系目标');
      } else if (change.field === 'ownerId' || change.field === 'locationId') {
        if (after != null) after = checkRef(after, '实体引用');
      } else if (Array.isArray(after)) {
        if (change.field === 'charactersPresent' || change.field === 'itemsPresent') {
          after = after.map((id) => checkRef(id, '在场列表'));
        }
      }
      return { entityId, field: String(change.field ?? '').trim(), before: change.before ?? null, after };
    }).filter(Boolean);
  }

  // 模式 A/B 共用：动作字符串在缺少 stateChanges 时由白名单推导后值。
  if (typeof action === 'string' && stateChanges.length === 0) {
    stateChanges = deriveStateChanges(action, entityIds, { description: candidate.description ?? candidate.role ?? '' });
  }

  if (unknown.length > 0) return { ok: false, reason: `引用了不存在的实体：${uniqueStrings(unknown).join('、')}` };
  const recordStatus = ['pending', 'valid', 'invalid'].includes(candidate.status) ? candidate.status : defaults.status;
  const mode = ['direct', 'post', 'manual'].includes(candidate.extractionMode) ? candidate.extractionMode : defaults.extractionMode;

  return {
    ok: true,
    record: {
      id: candidate.id,
      text,
      entityIds,
      action,
      stateChanges,
      kind,
      floor: candidate.floor ?? defaults.floor,
      sequence: candidate.sequence,
      interactionId: candidate.interactionId,
      sourceMessageId: candidate.sourceMessageId ?? defaults.sourceMessageId,
      swipeId: candidate.swipeId ?? defaults.swipeId,
      storyTime: candidate.storyTime,
      status: recordStatus,
      valid: recordStatus === 'valid',
      extractionMode: mode,
    },
  };
}
