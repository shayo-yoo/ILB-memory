/**
 * 记忆查看视图模型（需求 §7.7 UI 最小字段集 / §10 阶段八）
 *
 * 这里只把存储层快照转换为可显示的行，不读写存储、不参与状态计算，
 * 保证界面更换不影响核心记忆逻辑（§9.2）。
 */

import { KIND_TAG_LABELS, formatStateCard } from './state-schema.js';
import { getPrimaryKind } from './memory-model.js';

export const EXTRACTION_MODE_LABELS = Object.freeze({
  direct: '直出',
  post: '事后',
  manual: '手动',
});

export const RECORD_STATUS_LABELS = Object.freeze({
  pending: '待确认',
  valid: '有效',
  invalid: '无效',
});

export const ENTITY_TYPE_LABELS = Object.freeze({
  person: '角色',
  item: '物品',
  place: '地点',
  organization: '组织',
  other: '其他',
});

const FIELD_LABELS = Object.freeze({
  ownerId: '持有者',
  locationId: '位置',
  status: '状态',
  continuousStatus: '持续状态',
  relations: '关系',
  charactersPresent: '在场角色',
  itemsPresent: '在场物品',
});

export function fieldLabel(field) {
  return FIELD_LABELS[field] ?? String(field ?? '');
}

export function createNameLookup(entities = []) {
  const names = new Map();
  for (const entity of Array.isArray(entities) ? entities : []) {
    if (!entity?.id) continue;
    names.set(String(entity.id), String(entity.name ?? entity.id));
  }
  return (id) => {
    if (id == null || id === '') return '';
    return names.get(String(id)) ?? String(id);
  };
}

function compareRows(a, b) {
  return (a.floor - b.floor) || (a.sequence - b.sequence) || String(a.id).localeCompare(String(b.id));
}

function describeValue(value, nameOf) {
  if (value == null) return '无';
  if (Array.isArray(value)) return value.length ? value.map(item => describeValue(item, nameOf)).join('、') : '无';
  if (typeof value === 'object') {
    if (value.targetId !== undefined) {
      return `${nameOf(value.targetId) || '无'}${value.type ? `（${value.type}）` : ''}`;
    }
    return Object.entries(value)
      .filter(([key]) => key !== 'entityId')
      .map(([key, item]) => `${fieldLabel(key)}=${describeValue(item, nameOf)}`)
      .join('，') || '状态更新';
  }
  // 已知实体 ID 转为短名；普通字符串保持原样（避免把状态码误显示成实体）。
  return String(nameOf(value) ?? value);
}

/**
 * 动作列只显示稳定、可读的信息：
 * 1) 模式 A 的白名单动作字符串；
 * 2) 旧式结构化 action 的字段变更；
 * 3) stateChanges 派生出的字段变更；
 * 4) 记录文本摘要作为兜底（模型提取的事件文本）。
 */
export function describeRecordAction(record = {}, { nameOf = (id) => String(id ?? '') } = {}) {
  if (typeof record.action === 'string' && record.action.trim()) return record.action.trim();
  if (record.action && typeof record.action === 'object') {
    const text = describeValue(record.action, nameOf);
    if (text && text !== '状态更新') return text;
  }
  const changes = Array.isArray(record.stateChanges) ? record.stateChanges : [];
  const changeText = changes
    .filter(change => change && change.field)
    .map(change => `${fieldLabel(change.field)}=${describeValue(change.after, nameOf)}`)
    .join('；');
  if (changeText) return changeText;
  if (record.action && typeof record.action === 'object') return '状态更新';
  const text = String(record.text ?? '').trim();
  return text ? text.slice(0, 40) : '（无动作）';
}

/**
 * 事件列表默认列：楼层、序号、涉及实体、动作、提取模式（需求 §7.7）。
 * 排序固定为 (楼层, 楼内序号)；状态只在详情或“显示全部状态”时展示。
 */
export function buildEventRows(state = {}) {
  const entities = Array.isArray(state.entities) ? state.entities : [];
  const records = Array.isArray(state.records) ? state.records : [];
  const nameOf = createNameLookup(entities);
  return records.map((record) => {
    const entityIds = (Array.isArray(record.entityIds) ? record.entityIds : []).map(String);
    const entityNames = entityIds.map(id => nameOf(id)).filter(Boolean);
    const extractionMode = EXTRACTION_MODE_LABELS[record.extractionMode] ? record.extractionMode : 'manual';
    const status = RECORD_STATUS_LABELS[record.status] ? record.status : 'valid';
    const actionText = describeRecordAction(record, { nameOf });
    const row = {
      id: String(record.id ?? ''),
      floor: Number(record.floor ?? 0),
      sequence: Number(record.sequence ?? 1),
      entityIds,
      entityNames,
      entitiesText: entityNames.length ? entityNames.join('、') : '（未关联实体）',
      actionText,
      extractionMode,
      extractionModeLabel: EXTRACTION_MODE_LABELS[extractionMode],
      status,
      statusLabel: RECORD_STATUS_LABELS[status],
      text: String(record.text ?? ''),
      valid: record.valid !== false,
      interactionId: record.interactionId ?? null,
      sourceMessageId: record.sourceMessageId ?? null,
      swipeId: record.swipeId ?? null,
      storyTime: record.storyTime ?? null,
      stateChanges: Array.isArray(record.stateChanges) ? record.stateChanges : [],
    };
    return row;
  }).sort(compareRows);
}

/** 事件行摘要文本；状态列默认关闭（需求 §7.7）。 */
export function formatEventRow(row = {}, { showStatus = false } = {}) {
  const parts = [
    `第${row.floor}层`,
    `#${row.sequence}`,
    row.entitiesText ?? '（未关联实体）',
    row.actionText ?? '（无动作）',
    row.extractionModeLabel ?? EXTRACTION_MODE_LABELS.manual,
  ];
  if (showStatus) parts.push(row.statusLabel ?? RECORD_STATUS_LABELS.valid);
  return parts.join(' · ');
}

/** 分类状态卡的可读视图；others 含组织、自由标签与无标签实体。 */
export function formatStateCards(cards = {}) {
  const groups = [['items', '物品'], ['persons', '角色'], ['places', '地点'], ['others', '其他']];
  const lines = [];
  for (const [key, label] of groups) {
    const list = Array.isArray(cards?.[key]) ? cards[key] : [];
    if (!list.length) continue;
    lines.push(`【${label}】`);
    for (const card of list) {
      const tags = Array.isArray(card.tags) && card.tags.length > 0 ? `（标签：${card.tags.join('、')}）` : '';
      lines.push(`${card.name}：${card.displayText ?? '暂无状态'}${tags}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : '暂无状态卡';
}

/** 实体时间线的可读视图；状态列固定显示，避免用户只能读原始 JSON。 */
export function formatEntityTimeline(entity, records = [], { entities = [] } = {}) {
  if (!entity) return '未找到实体';
  const tags = Array.isArray(entity.tags) && entity.tags.length > 0 ? entity.tags : [entity.type].filter(Boolean);
  const kind = getPrimaryKind(tags);
  const rows = buildEventRows({ entities, records });
  const head = `${entity.name} · ${ENTITY_TYPE_LABELS[kind] ?? ENTITY_TYPE_LABELS.other}${tags.length ? ` · 标签：${tags.join('、')}` : ''}`;
  if (!rows.length) return `${head}\n关联事件 0`;
  return [head, `关联事件 ${rows.length}`, ...rows.map(row => `${formatEventRow(row, { showStatus: true })} · ${row.id}`)].join('\n');
}

/** 详情展开：显示记录的全部字段（含状态、来源、状态变更）。 */
export function formatRecordDetail(row = {}) {
  const changes = Array.isArray(row.stateChanges) && row.stateChanges.length
    ? row.stateChanges.map(change => `  ${change.entityId ?? ''} ${change.field ?? ''}: ${JSON.stringify(change.after ?? null)}`).join('\n')
    : '  无';
  return [
    `记录 ID：${row.id || '（空）'}`,
    `位置：第${row.floor ?? 0}层 #${row.sequence ?? 1}`,
    `实体：${row.entitiesText ?? '（未关联实体）'}`,
    `动作：${row.actionText ?? '（无动作）'}`,
    `提取模式：${row.extractionModeLabel ?? EXTRACTION_MODE_LABELS.manual}`,
    `状态：${row.statusLabel ?? RECORD_STATUS_LABELS.valid}`,
    `正文：${row.text || '（空）'}`,
    `状态变更：\n${changes}`,
    `来源消息：${row.sourceMessageId ?? '无'}`,
    `Swipe：${row.swipeId ?? '无'}`,
    `互动分组：${row.interactionId ?? '无'}`,
    `故事时间：${row.storyTime ?? '无'}`,
  ].join('\n');
}

/**
 * 实体列表：短名、类型、当前状态摘要、关联事件数（需求 §7.7）。
 * 事件数按记录去重统计；状态摘要复用状态卡的 §2.1 最小字段集格式化。
 */
export function buildEntityRows(state = {}, { currentState = null } = {}) {
  const entities = Array.isArray(state.entities) ? state.entities : [];
  const records = Array.isArray(state.records) ? state.records : [];
  const nameOf = createNameLookup(entities);
  const counts = new Map();
  for (const record of records) {
    const ids = new Set((Array.isArray(record.entityIds) ? record.entityIds : []).map(String));
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const cardById = new Map();
  const currentById = new Map();
  for (const group of Object.values(currentState?.cards ?? {})) {
    for (const card of Array.isArray(group) ? group : []) cardById.set(String(card.entityId), card);
  }
  for (const entity of Array.isArray(currentState?.entities) ? currentState.entities : []) {
    currentById.set(String(entity.id), entity);
  }
  return entities.map((entity) => {
    const card = cardById.get(String(entity.id));
    const currentEntity = currentById.get(String(entity.id));
    const tags = Array.isArray(currentEntity?.tags) && currentEntity.tags.length > 0
      ? currentEntity.tags
      : (Array.isArray(entity.tags) ? entity.tags : []);
    const kind = getPrimaryKind(tags.length > 0 ? tags : [entity.type]);
    const type = ENTITY_TYPE_LABELS[kind] ? kind : 'other';
    const tagLabels = tags.map(tag => KIND_TAG_LABELS[tag] ?? tag);
    const stateSummary = card?.displayText
      ?? formatStateCard({ ...entity, tags }, currentEntity?.state ?? {}, { nameOf });
    return {
      id: String(entity.id),
      name: String(entity.name ?? ''),
      type,
      typeLabel: ENTITY_TYPE_LABELS[type],
      tags,
      tagLabels,
      tagsText: tagLabels.join('、'),
      stateSummary,
      eventCount: counts.get(String(entity.id)) ?? 0,
      aliases: Array.isArray(entity.aliases) ? entity.aliases : [],
    };
  });
}

export function formatEntityRow(row = {}) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const tagSuffix = tags.length > 1 ? ` · 标签 ${row.tagsText || tags.join('、')}` : '';
  return `${row.name ?? '（未命名）'} · ${row.typeLabel ?? ENTITY_TYPE_LABELS.other} · ${row.stateSummary ?? '暂无状态'} · 关联事件 ${row.eventCount ?? 0}${tagSuffix}`;
}

/** 过滤视图：按实体 ID 或短名匹配，不改变 (楼层, 序号) 排序。 */
export function filterEventRows(rows = [], query = '') {
  const text = String(query ?? '').trim().toLowerCase();
  if (!text) return [...rows];
  return rows.filter(row => row.entityIds.some(id => String(id).toLowerCase() === text)
    || row.entityNames.some(name => String(name).toLowerCase().includes(text)));
}
