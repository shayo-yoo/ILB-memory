import { calculateCurrentState, createMemoryState, replayRecords } from './memory-model.js';
import {
  collectRelationLine,
  resolveMainEntityIds,
  retrieveInteractionGroup,
  retrieveMainNodeTimeline,
} from './memory-retrieval.js';
import {
  formatHistoryLines,
  formatRecordText,
  formatStateLines,
  normalizeInjectionStyle,
  renderMemoryText,
} from './injection-format.js';

export { formatRecordText };

// 按 §6.2 推荐的注入顺序：先物品，再角色，最后地点；每条使用状态卡的可读文本。
const CARD_GROUPS = ['items', 'persons', 'places', 'others'];

function collectCards(current) {
  const cards = current?.cards ?? {};
  const ordered = [];
  for (const group of CARD_GROUPS) {
    for (const card of cards[group] ?? []) ordered.push(card);
  }
  return ordered;
}

function compareRecords(a, b) {
  return a.floor - b.floor || a.sequence - b.sequence || String(a.id).localeCompare(String(b.id));
}

/**
 * 生成注入文本（§2.4 合并与去重）。
 *
 * 输入三部分：
 * 1. 当前状态：主节点状态卡 + 关系线一跳实体状态卡；
 * 2. 记忆重放：活跃窗口之前的回放区间；
 * 3. 主节点时间线：被提及实体向过去追溯的记录。
 *
 * 裁剪顺序：先砍关系线间接实体，再砍回放区间最早的历史；
 * 主节点时间线与同事件分组记录不裁剪。
 */
export function buildMemoryText(state, {
  currentFloor = Infinity,
  tokenBudget = 2000,
  mentionedEntityIds = null,
  mentionText = null,
  relationLine = true,
  relationLineWidth,
  timelineDepth,
  activeWindowLayers,
  replayLayers,
  style,
} = {}) {
  const normalized = createMemoryState(state);
  const injectionStyle = normalizeInjectionStyle(style ?? normalized.settings.injectionStyle);
  const nameOf = (id) => normalized.entities.find((entity) => entity.id === String(id))?.name ?? String(id ?? '');
  const current = calculateCurrentState(normalized, { currentFloor });
  const cards = collectCards(current);
  const cardsById = new Map(cards.map((card) => [card.entityId, card]));

  const explicitMentions = Array.isArray(mentionedEntityIds) && mentionedEntityIds.length > 0;
  const mentionFiltered = explicitMentions || String(mentionText ?? '').trim().length > 0;
  const mainEntityIds = mentionFiltered
    ? resolveMainEntityIds(normalized, { mentionedEntityIds, mentionText })
    : [];
  const mainSet = new Set(mainEntityIds);

  const stateCards = mentionFiltered ? cards.filter((card) => mainSet.has(card.entityId)) : cards;
  const stateEntityIds = new Set(stateCards.map((card) => card.entityId));

  const relation = mentionFiltered && relationLine
    ? collectRelationLine(normalized, { mainEntityIds, currentFloor, maxEntities: relationLineWidth })
    : { entities: [], candidates: [], excludedCount: 0 };
  const relatedCards = relation.entities
    .map((entity) => cardsById.get(entity.entityId))
    .filter((card) => card && !stateEntityIds.has(card.entityId));
  for (const card of relatedCards) stateEntityIds.add(card.entityId);

  const timeline = mentionFiltered
    ? retrieveMainNodeTimeline(normalized, { mainEntityIds, currentFloor, activeWindowLayers, maxRecords: timelineDepth })
    : [];
  const interactionGroup = timeline.length
    ? retrieveInteractionGroup(normalized, { seedRecords: timeline, currentFloor, activeWindowLayers })
    : [];
  const protectedIds = new Set([...timeline, ...interactionGroup].map((record) => record.id));

  const replay = replayRecords(normalized, { currentFloor, activeWindowLayers, replayLayers });
  const merged = new Map();
  for (const record of [...replay, ...timeline, ...interactionGroup]) merged.set(record.id, record);
  const history = [...merged.values()].sort(compareRecords);

  const mainLines = formatStateLines(stateCards, { style: injectionStyle, nameOf });
  const relatedLines = formatStateLines(relatedCards, { style: injectionStyle, nameOf });
  const historyLineOf = new Map(
    history.map((record) => [record.id, formatHistoryLines([record], { style: injectionStyle, nameOf })[0]]),
  );
  const maxChars = Math.max(0, Math.trunc(Number(tokenBudget) || 0) * 4);
  const render = (relatedCount, keptHistory) => renderMemoryText({
    mainLines,
    relatedLines: relatedLines.slice(0, relatedCount),
    historyLines: keptHistory.map((record) => historyLineOf.get(record.id)),
  });

  let keptRelated = relatedLines.slice();
  let keptHistory = history.slice();
  let text = render(keptRelated.length, keptHistory);

  if (maxChars && text.length > maxChars) {
    // 1) 关系线间接实体优先裁剪（保留直接相关实体）。
    while (keptRelated.length && text.length > maxChars) {
      keptRelated = keptRelated.slice(0, -1);
      text = render(keptRelated.length, keptHistory);
    }
    // 2) 再从回放区间最早的历史开始丢弃；受保护记录跳过。
    while (text.length > maxChars) {
      const index = keptHistory.findIndex((record) => !protectedIds.has(record.id));
      if (index < 0) break;
      keptHistory = keptHistory.filter((_, currentIndex) => currentIndex !== index);
      text = render(keptRelated.length, keptHistory);
    }
    // 预算极小时仍保留最靠近活跃窗口的一条历史，避免整段历史消失。
    if (keptHistory.length === 0 && history.length > 0) {
      keptHistory = [history.at(-1)];
      text = render(keptRelated.length, keptHistory);
    }
  }

  const keptRelatedEntityIds = relatedCards
    .slice(0, keptRelated.length)
    .map((card) => card.entityId);
  const droppedRecords = history.filter((record) => !keptHistory.some((item) => item.id === record.id));
  const overBudget = Boolean(maxChars) && text.length > maxChars;

  return {
    text,
    style: injectionStyle,
    usedRecords: keptHistory.map((record) => record.id),
    truncated: droppedRecords.length > 0 || keptRelated.length < relatedLines.length,
    estimatedTokens: Math.ceil(text.length / 4),
    // 兼容既有接口字段
    injectedEntityIds: [...stateCards, ...relatedCards.slice(0, keptRelated.length)].map((card) => card.entityId),
    mentionFiltered,
    // §2.3/§2.4 诊断元数据
    mainEntityIds,
    relationEntityIds: relatedCards.map((card) => card.entityId),
    injectedRelationEntityIds: keptRelatedEntityIds,
    relationCandidatesExcluded: relation.excludedCount,
    timelineRecordIds: timeline.map((record) => record.id),
    interactionRecordIds: interactionGroup.map((record) => record.id),
    protectedRecordIds: [...protectedIds],
    droppedRecords: droppedRecords.map((record) => record.id),
    overBudget,
  };
}
