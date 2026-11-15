/**
 * 提及识别（§2.3 规则 1：关系线只由被明确提及的实体触发）
 * 纯文本匹配，不依赖 AI 判断；识别结果只用于决定注入范围，不改变存储。
 */

// 按名称长度降序，避免「短剑」抢先匹配「短剑01」这类同前缀实体（§3.2 同名编号）
function candidatesByLength(entities) {
  const list = [];
  for (const entity of entities ?? []) {
    for (const label of [entity.name, ...(Array.isArray(entity.aliases) ? entity.aliases : [])]) {
      const text = String(label ?? '').trim();
      if (!text) continue;
      list.push({ entityId: entity.id, label: text });
    }
  }
  return list.sort((a, b) => b.label.length - a.label.length);
}

function overlaps(ranges, start, end) {
  return ranges.some((range) => start < range.end && end > range.start);
}

/**
 * @param {string} text 本轮需要扫描的文本
 * @param {Array} entities 实体列表（含 name/aliases/id）
 * @param {{maxEntities?: number}} options
 * @returns {{entityIds: string[], matches: Array<{entityId: string, label: string, index: number}>}}
 */
export function resolveMentions(text, entities, { maxEntities = Infinity } = {}) {
  const input = String(text ?? '');
  if (!input || !Array.isArray(entities) || entities.length === 0) {
    return { entityIds: [], matches: [] };
  }

  // 收集全部候选出现位置后统一排序：文本位置优先，同一位置取最长名称。
  // 这样 maxEntities 截断与文本顺序一致，且「短剑01」不会被「短剑」抢先匹配。
  const matches = [];
  for (const candidate of candidatesByLength(entities)) {
    let fromIndex = 0;
    while (fromIndex <= input.length - candidate.label.length) {
      const index = input.indexOf(candidate.label, fromIndex);
      if (index < 0) break;
      matches.push({ entityId: candidate.entityId, label: candidate.label, index, length: candidate.label.length });
      fromIndex = index + 1;
    }
  }

  matches.sort((a, b) => a.index - b.index || b.length - a.length || a.label.localeCompare(b.label));
  const taken = [];
  const selected = [];
  const seen = new Set();
  for (const match of matches) {
    if (seen.size >= maxEntities) break;
    if (seen.has(match.entityId)) continue;
    if (overlaps(taken, match.index, match.index + match.length)) continue;
    taken.push({ start: match.index, end: match.index + match.length });
    selected.push({ entityId: match.entityId, label: match.label, index: match.index });
    seen.add(match.entityId);
  }

  return { entityIds: selected.map((match) => match.entityId), matches: selected };
}
