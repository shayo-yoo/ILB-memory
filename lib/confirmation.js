import { createMemoryState } from './memory-model.js';

export function confirmPreviousPending(state, userFloor) {
  const next = createMemoryState(state);
  const floor = Number(userFloor);
  if (!Number.isInteger(floor)) return next;
  next.records = next.records.map(record => record.status === 'pending' && record.floor < floor ? { ...record, status: 'valid', valid: true } : record);
  return next;
}

export function invalidatePendingBranch(state, { sourceMessageId, swipeId } = {}) {
  const next = createMemoryState(state);
  const source = sourceMessageId == null ? null : String(sourceMessageId);
  next.records = next.records.map(record => record.status === 'pending' && source && String(record.sourceMessageId ?? '') === source && String(record.swipeId ?? '') !== String(swipeId ?? '') ? { ...record, status: 'invalid', valid: false } : record);
  return next;
}
