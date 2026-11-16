/**
 * 关系模型（v2 §2.1 当前有效关系 / §5.3 关系动作词）
 *
 * 关系是有向边：fromId → toId: type（role）。
 * - 对称关系（朋友/敌人/盟友/家人/恋人）可以由一条标记推导，程序补出反向边；
 * - 不对称关系（主仆/夫妻/亲子/俘虏/主宠）必须显式写两条标记，
 *   不能靠单一 bidirectional 推断，因为双方称呼不同（主人/仆人、丈夫/妻子）。
 *
 * 本模块是纯函数：不读写存储、不依赖 DOM。
 */

export const RELATION_TYPES = Object.freeze({
  FRIEND: Object.freeze({ code: 'FRIEND', label: '朋友', symmetric: true }),
  ENEMY: Object.freeze({ code: 'ENEMY', label: '敌人', symmetric: true }),
  ALLY: Object.freeze({ code: 'ALLY', label: '盟友', symmetric: true }),
  FAMILY: Object.freeze({ code: 'FAMILY', label: '家人', symmetric: true }),
  LOVER: Object.freeze({ code: 'LOVER', label: '恋人', symmetric: true }),
  MASTER_SERVANT: Object.freeze({ code: 'MASTER_SERVANT', label: '主仆', symmetric: false, roles: Object.freeze(['主人', '仆人']) }),
  HUSBAND_WIFE: Object.freeze({ code: 'HUSBAND_WIFE', label: '夫妻', symmetric: false, roles: Object.freeze(['丈夫', '妻子']) }),
  PARENT_CHILD: Object.freeze({ code: 'PARENT_CHILD', label: '亲子', symmetric: false, roles: Object.freeze(['父母', '子女']) }),
  CAPTOR_CAPTIVE: Object.freeze({ code: 'CAPTOR_CAPTIVE', label: '俘虏', symmetric: false, roles: Object.freeze(['看守', '俘虏']) }),
  OWNER_PET: Object.freeze({ code: 'OWNER_PET', label: '主宠', symmetric: false, roles: Object.freeze(['主人', '宠物']) }),
});

const TYPE_BY_LABEL = new Map(Object.values(RELATION_TYPES).map((item) => [item.label, item]));

// 角色词 → 关系类型。注意“主人”同时存在于主仆与主宠：
// 默认归入主仆；需要主宠时使用“主宠:主人”的显式写法。
const TYPE_BY_ROLE = new Map();
for (const item of Object.values(RELATION_TYPES)) {
  for (const role of item.roles ?? []) {
    if (!TYPE_BY_ROLE.has(role) || role !== '主人') TYPE_BY_ROLE.set(role, item);
  }
}

const TRAILING_PUNCTUATION = /[\s。.!！?？,，;；、]+$/u;
const LEADING_PARTICLES = /^(?:与|和|跟|同|对|成为|结为|建立|解除|是|为|了|的)+/u;

export function getRelationType(codeOrLabel) {
  const value = String(codeOrLabel ?? '').trim();
  if (!value) return null;
  return RELATION_TYPES[value] ?? TYPE_BY_LABEL.get(value) ?? null;
}

export function relationTypeLabel(code) {
  const type = getRelationType(code);
  return type?.label ?? String(code ?? '');
}

export function isSymmetricRelation(code) {
  return getRelationType(code)?.symmetric === true;
}

/** 默认关系：保持 v1 兼容（盟友）。 */
export function defaultRelationSpec() {
  const type = RELATION_TYPES.ALLY;
  return { type: type.code, role: type.label, label: type.label, symmetric: true, custom: false };
}

/**
 * 从标记尾部描述解析关系类型与角色。
 * 支持：
 *   - “盟友”“朋友”“敌人”等对称类型；
 *   - “主人”“仆人”“丈夫”“妻子”“看守”“俘虏”“宠物”等角色词；
 *   - “主仆:主人”“主宠:主人”这种显式“类型:角色”写法；
 *   - 未知词作为自定义关系（类型与角色都使用该词）。
 */
export function parseRelationSpec(text) {
  const raw = String(text ?? '').replace(TRAILING_PUNCTUATION, '').trim();
  if (!raw) return null;

  const explicit = raw.match(/^(.+?)\s*[:：]\s*(.+)$/u);
  if (explicit) {
    const type = getRelationType(explicit[1].replace(LEADING_PARTICLES, '').trim());
    const role = explicit[2].replace(TRAILING_PUNCTUATION, '').trim();
    if (type && role) {
      const allowed = type.roles ?? [];
      const normalizedRole = allowed.includes(role) || allowed.length === 0 ? role : role;
      return { type: type.code, role: normalizedRole, label: type.label, symmetric: type.symmetric, custom: false };
    }
    if (type) {
      return { type: type.code, role: role || type.label, label: type.label, symmetric: type.symmetric, custom: false };
    }
  }

  const normalized = raw.replace(LEADING_PARTICLES, '').trim() || raw;
  const tokens = normalized.split(/[\s,，、;；:：]+/u).map((token) => token.trim()).filter(Boolean);

  // 1) 完整类型名优先（“主仆”“夫妻”）。
  for (const token of tokens) {
    const type = TYPE_BY_LABEL.get(token) ?? RELATION_TYPES[token];
    if (type) return { type: type.code, role: type.label, label: type.label, symmetric: type.symmetric, custom: false };
  }
  // 2) 角色词（“主人”“仆人”“丈夫”……）。
  for (const token of tokens) {
    const type = TYPE_BY_ROLE.get(token);
    if (type) return { type: type.code, role: token, label: type.label, symmetric: type.symmetric, custom: false };
  }
  // 3) 描述句中包含已知词（“成为朋友”“与其结为夫妻”）。
  const haystack = normalized;
  const known = [...TYPE_BY_LABEL.keys(), ...TYPE_BY_ROLE.keys()].sort((a, b) => b.length - a.length);
  for (const word of known) {
    if (!haystack.includes(word)) continue;
    const type = TYPE_BY_LABEL.get(word) ?? TYPE_BY_ROLE.get(word);
    if (type) {
      const role = TYPE_BY_ROLE.has(word) ? word : type.label;
      return { type: type.code, role, label: type.label, symmetric: type.symmetric, custom: false };
    }
  }
  // 4) 自定义关系词：类型与角色都使用该词，不做双向推断。
  const custom = tokens[0] ?? normalized;
  if (!custom || custom.length > 20) return null;
  return { type: custom, role: custom, label: custom, symmetric: false, custom: true };
}

/** 关系显示标签：优先角色词，其次类型名。 */
export function relationLabel(relation) {
  const role = String(relation?.role ?? '').trim();
  if (role) return role;
  return relationTypeLabel(relation?.type);
}

export function normalizeRelation(relation, { fromId = null } = {}) {
  if (!relation || typeof relation !== 'object') return null;
  const toId = relation.toId ?? relation.targetId ?? null;
  if (toId == null || String(toId) === '') return null;
  const type = relation.type == null ? null : String(relation.type);
  const role = relation.role == null ? null : String(relation.role);
  return {
    fromId: relation.fromId == null ? (fromId == null ? null : String(fromId)) : String(relation.fromId),
    toId: String(toId),
    type,
    role,
    establishedAt: relation.establishedAt ?? null,
    ...(relation.endedAt == null ? {} : { endedAt: relation.endedAt }),
  };
}

export function relationMatches(relation, { toId, type = null, role = null } = {}) {
  const target = relation?.toId ?? relation?.targetId;
  if (target == null || String(target) !== String(toId)) return false;
  if (type != null && String(relation?.type ?? '') !== String(type)) return false;
  if (role != null && String(relation?.role ?? '') !== String(role)) return false;
  return true;
}

export function formatRelationTarget(relation, nameOf = (id) => String(id ?? '')) {
  const target = relation?.toId ?? relation?.targetId;
  const name = nameOf(target) || String(target ?? '');
  return `对${name}：${relationLabel(relation)}`;
}

/** 自然语言关系句：甲是乙的主人 / 甲与乙是朋友 / 甲与乙是夫妻。 */
export function formatRelationSentence(fromName, relation, nameOf = (id) => String(id ?? '')) {
  const target = relation?.toId ?? relation?.targetId;
  const toName = nameOf(target) || String(target ?? '');
  const role = String(relation?.role ?? '').trim();
  const type = getRelationType(relation?.type);
  // 不对称类型若只写了类型名（“夫妻”“主仆”），用“与……是……”更自然。
  const roleIsTypeLabel = Boolean(type && !type.symmetric && role === type.label);
  if (role && !roleIsTypeLabel) return `${fromName}是${toName}的${role}`;
  return `${fromName}与${toName}是${type?.label ?? (role || relationTypeLabel(relation?.type))}`;
}
