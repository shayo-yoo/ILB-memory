import { createMemoryState } from './memory-model.js';

export function confirmPreviousPending(state, userFloor) {
  const next = createMemoryState(state);
  const floor = Number(userFloor);
  if (!Number.isInteger(floor)) return next;
  next.records = next.records.map(record => record.status === 'pending' && record.floor < floor ? { ...record, status: 'valid', valid: true } : record);
  // Re-normalize after promotion so newly confirmed records derive their kind tags immediately.
  return createMemoryState(next);
}

export function invalidatePendingBranch(state, { sourceMessageId, swipeId } = {}) {
  const next = createMemoryState(state);
  const source = sourceMessageId == null ? null : String(sourceMessageId);
  next.records = next.records.map(record => record.status === 'pending' && source && String(record.sourceMessageId ?? '') === source && String(record.swipeId ?? '') !== String(swipeId ?? '') ? { ...record, status: 'invalid', valid: false } : record);
  return next;
}
