/**
 * Translate ST message lifecycle events into store invalidation operations.
 * Unknown shapes fail closed; floor invalidation is the safe fallback.
 */
export function createMemoryEventAdapter({ eventSource, eventTypes, getContext, store, onChange = () => {} } = {}) {
  if (!eventSource || typeof eventSource.on !== 'function' || !store) return { ok: false, reason: 'event source or store unavailable' };
  const types = eventTypes ?? {};
  const handlers = [];
  const bind = (key, handler) => {
    const event = types[key] ?? key.toLowerCase();
    try { eventSource.on(event, handler); handlers.push({ event, handler }); return event; }
    catch { return null; }
  };
  bind('MESSAGE_EDITED', (arg) => handleMessageChange('edited', arg));
  bind('MESSAGE_DELETED', (arg) => handleMessageChange('deleted', arg));
  bind('MESSAGE_SWIPED', (arg) => handleSwipe(arg));
  bind('MESSAGE_SWIPE_DELETED', (arg) => handleSwipe(arg));

  function contextChat() {
    try { return getContext?.()?.chat ?? []; } catch { return []; }
  }
  function messageIndex(arg) {
    if (Number.isInteger(arg)) return arg;
    if (Number.isInteger(arg?.messageId)) return arg.messageId;
    if (Number.isInteger(arg?.mesId)) return arg.mesId;
    if (Number.isInteger(arg?.index)) return arg.index;
    return Number.isInteger(arg?.id) ? arg.id : null;
  }
  function sourceId(message, fallback) {
    return String(message?.id ?? message?.message_id ?? message?.extra?.messageId ?? fallback ?? '').trim() || null;
  }
  function handleMessageChange(kind, arg) {
    const floor = messageIndex(arg);
    if (floor == null) return;
    const message = contextChat()[floor];
    const result = store.invalidateFromMessage({ floor, sourceMessageId: sourceId(message, arg?.sourceMessageId) });
    onChange({ kind, floor, result, degraded: !sourceId(message, arg?.sourceMessageId) });
  }
  function handleSwipe(arg) {
    const floor = messageIndex(arg);
    const selectedSwipeId = arg?.swipeId ?? arg?.selectedSwipeId ?? contextChat()[floor]?.swipe_id;
    if (floor == null) return;
    const message = contextChat()[floor];
    const result = store.invalidateSwipeBranch({ sourceMessageId: sourceId(message, arg?.sourceMessageId), selectedSwipeId });
    onChange({ kind: 'swipe', floor, selectedSwipeId, result, degraded: !sourceId(message, arg?.sourceMessageId) });
  }
  return { ok: true, events: handlers.map((item) => item.event), dispose() { for (const item of handlers) { try { eventSource.removeListener?.(item.event, item.handler); } catch {} } } };
}
