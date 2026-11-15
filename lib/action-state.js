const OPS = new Set(['转移','获得','失去','移动','损坏','修复','销毁','死亡','建立关系','解除关系','交给']);

export function deriveStateChanges(action, entityIds = []) {
  const rawOp = String(action ?? '').trim(); const op = rawOp === '交给' ? '转移' : rawOp; if (!OPS.has(rawOp)) return [];
  const subject = entityIds[0] ?? null; const object = entityIds[1] ?? null; const target = entityIds[2] ?? null;
  if (op === '转移' || op === '获得') return subject && object ? [{ entityId: object, field: 'ownerId', before: null, after: target ?? subject }] : [];
  if (op === '失去') return object ? [{ entityId: object, field: 'ownerId', before: subject, after: null }] : [];
  if (op === '移动') return subject && object ? [{ entityId: subject, field: 'locationId', before: null, after: object }] : [];
  if (['损坏','修复','销毁'].includes(op)) return subject ? [{ entityId: subject, field: 'status', before: null, after: ({损坏:'damaged',修复:'intact',销毁:'destroyed'})[op] }] : [];
  if (op === '死亡') return subject ? [{ entityId: subject, field: 'status', before: null, after: 'dead' }] : [];
  if (op === '建立关系' || op === '解除关系') return subject && object ? [{ entityId: subject, field: 'relations', before: null, after: { targetId: object, active: op === '建立关系' } }] : [];
  return [];
}
