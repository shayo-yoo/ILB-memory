import { addRecord, createMemoryState } from './memory-model.js';

const KINDS = new Set(['fact', 'state', 'relation']);

export function validateCandidatePayload(payload, { state = createMemoryState(), floor = 0, sourceMessageId = null, swipeId = null } = {}) {
  const candidates = Array.isArray(payload) ? payload : payload?.events;
  if (!Array.isArray(candidates)) return { ok: false, accepted: [], rejected: [{ index: -1, reason: '候选事件必须是数组，或 {events: []}' }] };
  const accepted = [];
  const rejected = [];
  let working = createMemoryState(state);
  candidates.forEach((candidate, index) => {
    const result = validateOne(candidate, { working, floor, sourceMessageId, swipeId });
    if (!result.ok) { rejected.push({ index, reason: result.reason }); return; }
    try {
      const added = addRecord(working, result.record);
      working = added.state;
      accepted.push(added.record);
    } catch (error) { rejected.push({ index, reason: String(error?.message ?? error) }); }
  });
  return { ok: rejected.length === 0, accepted, rejected, state: working };
}

function validateOne(candidate, defaults) {
  if (!candidate || typeof candidate !== 'object') return { ok: false, reason: '事件不是对象' };
  const text = String(candidate.text ?? candidate.description ?? '').trim();
  if (!text) return { ok: false, reason: '缺少事件文本 text' };
  const kind = candidate.kind == null ? 'fact' : String(candidate.kind);
  if (!KINDS.has(kind)) return { ok: false, reason: `不支持的事件类型：${kind}` };
  const entityIds = Array.isArray(candidate.entityIds) ? candidate.entityIds.map(String).filter(Boolean) : [];
  const action = candidate.action && typeof candidate.action === 'object' ? { ...candidate.action } : null;
  if (action?.entityId && !defaults.working.entities.some(entity => entity.id === String(action.entityId))) {
    return { ok: false, reason: `引用了不存在的实体：${action.entityId}` };
  }
  return { ok: true, record: { id: candidate.id, text, entityIds, action, kind, floor: candidate.floor ?? defaults.floor, sequence: candidate.sequence, interactionId: candidate.interactionId, sourceMessageId: candidate.sourceMessageId ?? defaults.sourceMessageId, swipeId: candidate.swipeId ?? defaults.swipeId, storyTime: candidate.storyTime, valid: true } };
}
