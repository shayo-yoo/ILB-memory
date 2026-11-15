import { calculateCurrentState, replayRecords } from './memory-model.js';

// 按 §6.2 推荐的注入顺序：先物品，再角色，最后地点；每条使用状态卡的可读文本。
const CARD_GROUPS = ['items', 'persons', 'places'];

function collectCards(current) {
  const cards = current?.cards ?? {};
  const ordered = [];
  for (const group of CARD_GROUPS) {
    for (const card of cards[group] ?? []) ordered.push(card);
  }
  return ordered;
}

function normalizeMentionIds(mentionedEntityIds) {
  if (!Array.isArray(mentionedEntityIds) || mentionedEntityIds.length === 0) return null;
  return new Set(mentionedEntityIds.map((id) => String(id)));
}

// §2.1 状态注入策略：本轮涉及的实体注入其状态卡；未涉及的不注入。
// 未提供 mentionedEntityIds 时退化为全量注入（兼容旧行为与人工预览）。
function buildStateLines(current, mentionSet) {
  const cards = collectCards(current);
  const selected = mentionSet
    ? cards.filter((card) => mentionSet.has(String(card.entityId)) || mentionSet.has(String(card.name)))
    : cards;
  return selected.map((card) => {
    const detail = card.displayText && card.displayText !== '暂无状态' ? card.displayText : '暂无当前状态';
    return `${card.name}：${detail}。`;
  });
}

export function buildMemoryText(state, { currentFloor = Infinity, tokenBudget = 2000, mentionedEntityIds = null } = {}) {
  const normalized = state ?? {};
  const current = calculateCurrentState(normalized);
  const replay = replayRecords(normalized, { currentFloor });
  const mentionSet = normalizeMentionIds(mentionedEntityIds);
  const stateLines = buildStateLines(current, mentionSet);
  const historyLines = replay.map((record) => `第${record.floor}层：${record.text}`);

  const stateSection = stateLines.length ? `【当前状态】\n${stateLines.join('\n')}` : '';
  const sections = [];
  if (stateSection) sections.push(stateSection);
  if (historyLines.length) sections.push(`【历史回放】\n${historyLines.join('\n')}`);
  const full = sections.join('\n\n');

  const maxChars = Math.max(0, Math.trunc(Number(tokenBudget) || 0) * 4);
  const meta = {
    injectedEntityIds: (mentionSet
      ? collectCards(current).filter((card) => mentionSet.has(String(card.entityId)) || mentionSet.has(String(card.name)))
      : collectCards(current)
    ).map((card) => card.entityId),
    mentionFiltered: Boolean(mentionSet),
  };

  if (!maxChars || full.length <= maxChars) {
    return {
      text: full,
      usedRecords: replay.map((record) => record.id),
      truncated: false,
      estimatedTokens: Math.ceil(full.length / 4),
      ...meta,
    };
  }

  // §2.4 裁剪顺序：保留当前状态，从回放区间最早的历史开始丢弃。
  const kept = [];
  for (const record of replay.slice().reverse()) {
    const line = `第${record.floor}层：${record.text}`;
    const candidate = [stateSection, `【历史回放】\n${[line, ...kept].join('\n')}`].filter(Boolean).join('\n\n');
    if (candidate.length > maxChars) break;
    kept.unshift(line);
  }
  if (kept.length === 0 && replay.length > 0) {
    const newest = replay.at(-1);
    kept.push(`第${newest.floor}层：${newest.text}`);
  }

  const text = [stateSection, kept.length ? `【历史回放】\n${kept.join('\n')}` : ''].filter(Boolean).join('\n\n');
  return {
    text,
    usedRecords: replay.filter((record) => kept.some((line) => line.includes(record.text))).map((record) => record.id),
    truncated: true,
    estimatedTokens: Math.ceil(text.length / 4),
    ...meta,
  };
}
