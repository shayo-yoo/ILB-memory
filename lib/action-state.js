import { ITEM_STATUS_CODE, STATE_ENUMS } from './state-schema.js';
import { defaultRelationSpec, parseRelationSpec } from './relation-model.js';

// v2 §5.3 状态字段白名单：只有这些动作会产生状态变更，其余为自由叙事动作。
const OPS = new Set(['转移', '获得', '失去', '移动', '损坏', '修复', '销毁', '遗失', '死亡', '受伤', '中毒', '建立关系', '解除关系', '交给']);

export const SUPPORTED_ACTIONS = Object.freeze([...OPS]);

const ACTION_ALIASES = Object.freeze({ 交给: '转移' });

// 从标记内容中提取动作词与实体短名（不负责状态推导）
export function extractActionAndEntities(markerText) {
  const raw = String(markerText ?? '');
  const cleanText = raw
    .replace(/^\s*\(\(\(ILBM:\s*/, '')
    .replace(/\s*\)\)\)\s*$/, '')
    .trim();
  const entities = [...cleanText.matchAll(/\[entity:([^\]]+)\]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  const actionText = cleanText.replace(/\[[^\]]+\]/g, '').trim();
  const actionMatch = actionText.match(/^([^\s]+)/);
  return {
    action: actionMatch ? actionMatch[1] : null,
    entities,
    description: actionMatch ? actionText.slice(actionMatch[1].length).trim() : actionText,
    rawText: raw,
  };
}

export function deriveStateChanges(action, entityIds = [], options = {}) {
  const rawOp = String(action ?? '').trim();
  const op = ACTION_ALIASES[rawOp] ?? rawOp;
  if (!OPS.has(rawOp)) return [];
  const subject = entityIds[0] ?? null;
  const object = entityIds[1] ?? null;
  const target = entityIds[2] ?? null;
  // 标记尾部描述用于关系角色（“主人”“仆人”“丈夫”……）；旧调用方仍可传字符串。
  const description = typeof options === 'string' ? options : options?.description;

  if (op === '转移' || op === '获得') {
    return object ? [{ entityId: object, field: 'ownerId', before: null, after: target ?? subject }] : [];
  }
  if (op === '失去') return object ? [{ entityId: object, field: 'ownerId', before: subject, after: null }] : [];
  if (op === '移动') return subject && object ? [{ entityId: subject, field: 'locationId', before: null, after: object }] : [];
  if (op === '损坏' || op === '修复' || op === '销毁' || op === '遗失') {
    const after = {
      损坏: ITEM_STATUS_CODE.DAMAGED,
      修复: ITEM_STATUS_CODE.INTACT,
      销毁: ITEM_STATUS_CODE.DESTROYED,
      遗失: ITEM_STATUS_CODE.LOST,
    }[op];
    return subject ? [{ entityId: subject, field: 'status', before: null, after }] : [];
  }
  // 角色持续状态（需求 §2.1.2）
  if (op === '死亡') return subject ? [{ entityId: subject, field: 'continuousStatus', before: null, after: [STATE_ENUMS.CONTINUOUS_STATUS.DEAD] }] : [];
  if (op === '受伤') return subject ? [{ entityId: subject, field: 'continuousStatus', before: null, after: [STATE_ENUMS.CONTINUOUS_STATUS.INJURED] }] : [];
  if (op === '中毒') return subject ? [{ entityId: subject, field: 'continuousStatus', before: null, after: [STATE_ENUMS.CONTINUOUS_STATUS.POISONED] }] : [];
  if (op === '建立关系' || op === '解除关系') {
    if (!subject || !object) return [];
    const spec = parseRelationSpec(description);
    if (op === '解除关系') {
      // 未写角色时解除该目标上的全部关系；写了类型/角色则只解除匹配边。
      return [{
        entityId: subject,
        field: 'relations',
        before: null,
        after: { toId: object, ...(spec ? { type: spec.type, role: spec.role } : {}), active: false },
      }];
    }
    const resolved = spec ?? defaultRelationSpec();
    return [{
      entityId: subject,
      field: 'relations',
      before: null,
      after: { toId: object, type: resolved.type, role: resolved.role, active: true },
    }];
  }
  return [];
}
