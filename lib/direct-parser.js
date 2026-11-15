import { createEventRecord } from './event-record.js';
import { deriveStateChanges, extractActionAndEntities, SUPPORTED_ACTIONS } from './action-state.js';

export const DIRECT_MARKER_RE = /\(\(\(ILBM:([\s\S]*?)\)\)\)/g;
export const ACTIONS = Object.freeze(new Set([...SUPPORTED_ACTIONS]));

export function parseDirectMarkers(text, { floor = 0, sourceMessageId = null, swipeId = null, resolveEntities = null } = {}) {
  const input = String(text ?? ''); const records = []; const errors = []; let match;
  DIRECT_MARKER_RE.lastIndex = 0;
  while ((match = DIRECT_MARKER_RE.exec(input))) {
    const content = match[1].trim();
    const extraction = extractActionAndEntities(content);
    const entities = extraction.entities;
    if (!entities.length) { errors.push({ index: match.index, reason: '标记缺少 [entity:名称]' }); continue; }
    if (!extraction.action || !ACTIONS.has(extraction.action)) { errors.push({ index: match.index, reason: '标记动作不在白名单中' }); continue; }
    const action = extraction.action;
    const resolved = typeof resolveEntities === 'function' ? resolveEntities(entities) : null;
    const entityIds = resolved?.entityIds ?? entities;
    records.push(createEventRecord({ text: content, entityIds, action, stateChanges: deriveStateChanges(action, entityIds), floor, sequence: records.length + 1, sourceMessageId, swipeId, extractionMode: 'direct', status: 'pending' }));
  }
  return { ok: errors.length === 0, triggered: records.length > 0 || errors.length > 0, records, errors, cleanedText: input.replace(DIRECT_MARKER_RE, '') };
}
