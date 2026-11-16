/**
 * 注入文本排版（v2 §6）。
 *
 * 两种风格：
 * - compact：`实体：字段=值，……` + `第N层：事件原文`（默认，稳定、易扫描）；
 * - narrative：把状态卡与记录改写成自然中文句子（动词模板），减少符号对照成本。
 *
 * 两种风格都不得输出 JSON、内部记录 ID 或 `[entity:...]` 标记。
 */

import {
  ITEM_STATUS_LABEL,
  STATE_FIELD_LABELS,
  formatStateCard,
  formatStateRawValue,
  getUnknownStateEntries,
} from './state-schema.js';
import { formatRelationSentence, relationLabel, relationTypeLabel } from './relation-model.js';

export const INJECTION_STYLES = Object.freeze(['compact', 'narrative']);

export function normalizeInjectionStyle(value) {
  return value === 'narrative' ? 'narrative' : 'compact';
}

/** §6.3：注入内容不出现内部标记语法；[entity:名称] 只保留名称本身。 */
export function formatRecordText(record) {
  return String(record?.text ?? '')
    .replace(/\[entity:([^\]]+)\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const hasKey = (state, key) => Object.prototype.hasOwnProperty.call(state ?? {}, key);

function uniqueSentences(list) {
  return [...new Set(list.filter((item) => item && String(item).trim()))];
}

/**
 * 状态卡自然句。未知字段仍会保留为“其他状态”句，不能悄悄消失。
 */
export function formatCardNarrative(card, { nameOf = (id) => String(id ?? '') } = {}) {
  const name = String(card?.name ?? '');
  const state = card?.state ?? {};
  const tags = Array.isArray(card?.tags) && card.tags.length > 0 ? card.tags : [card?.type].filter(Boolean);
  const sentences = [];

  if (tags.includes('item')) {
    if (hasKey(state, 'ownerId')) sentences.push(state.ownerId ? `${name}当前由${nameOf(state.ownerId)}持有` : `${name}当前无人持有`);
    else sentences.push(`${name}的持有者未知`);
    if (hasKey(state, 'locationId')) sentences.push(state.locationId ? `${name}位于${nameOf(state.locationId)}` : `${name}的位置未知`);
    else sentences.push(`${name}的位置未知`);
    if (hasKey(state, 'status')) sentences.push(`${name}的状态为${ITEM_STATUS_LABEL[state.status] ?? state.status}`);
    else sentences.push(`${name}的状态未知`);
  }

  if (tags.includes('person')) {
    if (hasKey(state, 'locationId') && !tags.includes('item')) {
      sentences.push(state.locationId ? `${name}位于${nameOf(state.locationId)}` : `${name}的位置未知`);
    } else if (!hasKey(state, 'locationId') && !tags.includes('item')) {
      sentences.push(`${name}的位置未知`);
    }
    const statuses = Array.isArray(state.continuousStatus) ? state.continuousStatus : [];
    if (statuses.length) sentences.push(`${name}处于${statuses.join('、')}状态`);
    const relations = Array.isArray(state.relations) ? state.relations : [];
    if (relations.length) {
      for (const relation of relations) sentences.push(formatRelationSentence(name, relation, nameOf));
    } else {
      sentences.push(`${name}目前没有已知关系`);
    }
  }

  if (tags.includes('place')) {
    const characters = Array.isArray(state.charactersPresent) ? state.charactersPresent : [];
    const items = Array.isArray(state.itemsPresent) ? state.itemsPresent : [];
    const groups = [];
    if (characters.length) groups.push(`角色：${characters.map((id) => nameOf(id)).join('、')}`);
    if (items.length) groups.push(`物品：${items.map((id) => nameOf(id)).join('、')}`);
    sentences.push(groups.length ? `${name}内目前有${groups.join('；')}` : `${name}内目前没有角色或物品`);
  }

  for (const [key, value] of getUnknownStateEntries(card, state)) {
    sentences.push(`${name}的${STATE_FIELD_LABELS[key] ?? key}为${formatStateRawValue(value, nameOf)}`);
  }

  const ordered = uniqueSentences(sentences);
  if (ordered.length === 0) {
    const compact = formatStateCard(card, state, { nameOf });
    return compact === '暂无状态' ? `${name}暂无当前状态` : `${name}：${compact}`;
  }
  return `${ordered.join('，')}。`;
}

/** 历史记录的动词模板（§6.2 推荐格式的中文化）。 */
const ACTION_TEMPLATES = Object.freeze({
  转移: ({ subject, object, target }) => (target ? `${subject}将${object}交给${target}` : `${subject}转移了${object}`),
  交给: ({ subject, object, target }) => (target ? `${subject}将${object}交给${target}` : `${subject}交出${object}`),
  获得: ({ subject, object }) => `${subject}获得${object}`,
  失去: ({ subject, object }) => `${subject}失去${object}`,
  移动: ({ subject, object }) => (object ? `${subject}移动到${object}` : `${subject}移动了`),
  损坏: ({ subject, object }) => (object ? `${subject}损坏了${object}` : `${subject}损坏了`),
  修复: ({ subject, object }) => (object ? `${subject}修复了${object}` : `${subject}被修复`),
  销毁: ({ subject, object }) => (object ? `${subject}销毁了${object}` : `${subject}被销毁`),
  遗失: ({ subject, object }) => (object ? `${subject}遗失了${object}` : `${subject}遗失了`),
  死亡: ({ subject }) => `${subject}死亡`,
  受伤: ({ subject }) => `${subject}受伤`,
  中毒: ({ subject }) => `${subject}中毒`,
  建立关系: ({ subject, object, relation }) => (object ? `${subject}与${object}建立关系${relation ? `（${relation}）` : ''}` : `${subject}建立了关系`),
  解除关系: ({ subject, object, relation }) => (object ? `${subject}与${object}解除关系${relation ? `（${relation}）` : ''}` : `${subject}解除了关系`),
});

const STATUS_PHRASES = Object.freeze({
  intact: '恢复完好',
  damaged: '损坏',
  lost: '遗失',
  destroyed: '被销毁',
});

function relationSpecOf(record) {
  const changes = Array.isArray(record?.stateChanges) ? record.stateChanges : [];
  for (const change of changes) {
    if (change?.field !== 'relations') continue;
    const after = change.after ?? {};
    const type = after.type ?? null;
    const role = after.role ?? null;
    return role || (type ? relationTypeLabel(type) : null);
  }
  return null;
}

function describeStateChange(change, nameOf) {
  const entity = nameOf(change?.entityId) || String(change?.entityId ?? '');
  const after = change?.after;
  switch (change?.field) {
    case 'ownerId':
      return after ? `${entity}的持有者变为${nameOf(after)}` : `${entity}失去持有者`;
    case 'locationId':
      return after ? `${entity}移动到${nameOf(after)}` : `${entity}的位置未知`;
    case 'status':
      return `${entity}${STATUS_PHRASES[after] ?? `状态变为${ITEM_STATUS_LABEL[after] ?? after}`}`;
    case 'continuousStatus':
      return Array.isArray(after) && after.length ? `${entity}处于${after.join('、')}状态` : `${entity}的持续状态解除`;
    case 'relations': {
      const target = after?.toId ?? after?.targetId;
      if (!target) return `${entity}的关系发生变化`;
      const label = relationLabel(after ?? {});
      return after?.active === false ? `${entity}与${nameOf(target)}解除关系` : `${entity}与${nameOf(target)}建立${label}关系`;
    }
    case 'charactersPresent':
      return `${entity}的在场角色变为${(Array.isArray(after) ? after : []).map(nameOf).join('、') || '无'}`;
    case 'itemsPresent':
      return `${entity}的在场物品变为${(Array.isArray(after) ? after : []).map(nameOf).join('、') || '无'}`;
    default:
      return `${entity}的${STATE_FIELD_LABELS[change?.field] ?? change?.field}更新`;
  }
}

/**
 * 历史记录自然句：优先使用动作词模板；无动作词时由 stateChanges 生成；
 * 都没有时回退到清洗后的原文，绝不输出内部标记或 JSON。
 */
export function formatRecordNarrative(record, { nameOf = (id) => String(id ?? '') } = {}) {
  const ids = (Array.isArray(record?.entityIds) ? record.entityIds : []).map(String);
  const names = ids.map((id) => nameOf(id) || id);
  const subject = names[0] ?? '某物';
  const object = names[1] ?? null;
  const target = names[2] ?? null;
  const action = typeof record?.action === 'string' ? record.action : null;

  if (action && ACTION_TEMPLATES[action]) {
    const relation = relationSpecOf(record);
    return ACTION_TEMPLATES[action]({ subject, object, target, relation, record });
  }

  const changes = Array.isArray(record?.stateChanges) ? record.stateChanges : [];
  if (changes.length > 0) {
    const described = changes.map((change) => describeStateChange(change, nameOf)).filter(Boolean);
    if (described.length > 0) return described.join('；');
  }

  const text = formatRecordText(record);
  if (text) return text;
  return `${subject}发生了一次变化`;
}

/** 状态卡段落行（compact / narrative）。 */
export function formatStateLines(cards = [], { style = 'compact', nameOf = (id) => String(id ?? '') } = {}) {
  const narrative = normalizeInjectionStyle(style) === 'narrative';
  return cards.map((card) => {
    if (narrative) return formatCardNarrative(card, { nameOf });
    const detail = card.displayText && card.displayText !== '暂无状态' ? card.displayText : '暂无当前状态';
    return `${card.name}：${detail}。`;
  });
}

/** 历史段落行。 */
export function formatHistoryLines(records = [], { style = 'compact', nameOf = (id) => String(id ?? '') } = {}) {
  const narrative = normalizeInjectionStyle(style) === 'narrative';
  return records.map((record) => {
    const text = narrative ? formatRecordNarrative(record, { nameOf }) : formatRecordText(record);
    return `第${record.floor}层：${text}`;
  });
}

/** 组装最终注入文本。状态与历史分开呈现，避免把状态当事件。 */
export function renderMemoryText({ mainLines = [], relatedLines = [], historyLines = [] } = {}) {
  const sections = [];
  const stateLines = [...mainLines, ...relatedLines].filter(Boolean);
  if (stateLines.length) sections.push(`【当前状态】\n${stateLines.join('\n')}`);
  if (historyLines.length) sections.push(`【历史回放】\n${historyLines.join('\n')}`);
  return sections.join('\n\n');
}
