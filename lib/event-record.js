import { EXTRACTION_MODE, MEMORY_STATUS, normalizeExtractionMode, normalizeRecordStatus } from './memory-schema.js';

export function createEventRecord(input = {}) {
  return {
    recordId: String(input.recordId ?? input.id ?? `record-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    entityIds: Array.isArray(input.entityIds) ? input.entityIds.map(String).filter(Boolean) : [],
    action: String(input.action ?? '').trim(),
    stateChanges: Array.isArray(input.stateChanges) ? input.stateChanges.map(change => ({ entityId: String(change.entityId ?? ''), field: String(change.field ?? ''), before: change.before ?? null, after: change.after ?? null })) : [],
    floor: Number.isInteger(input.floor) ? input.floor : 0,
    sequence: Number.isInteger(input.sequence) ? input.sequence : 1,
    sourceMessageId: input.sourceMessageId == null ? null : String(input.sourceMessageId),
    swipeId: input.swipeId ?? null,
    interactionId: input.interactionId == null ? null : String(input.interactionId),
    extractionMode: normalizeExtractionMode(input, EXTRACTION_MODE.MANUAL),
    status: normalizeRecordStatus(input, MEMORY_STATUS.VALID),
    storyTime: input.storyTime ?? null,
    pointers: Array.isArray(input.pointers) ? input.pointers.map(pointer => ({ targetRecordId: String(pointer.targetRecordId ?? ''), type: pointer.type ? String(pointer.type) : undefined })).filter(pointer => pointer.targetRecordId) : [],
    text: String(input.text ?? '').trim(),
  };
}

export function isInjectableRecord(record) { return normalizeRecordStatus(record) === MEMORY_STATUS.VALID; }
