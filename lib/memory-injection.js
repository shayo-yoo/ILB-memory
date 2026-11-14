import { calculateCurrentState, replayRecords } from './memory-model.js';

export function buildMemoryText(state, { currentFloor = Infinity, tokenBudget = 2000 } = {}) {
  const normalized = state ?? {};
  const current = calculateCurrentState(normalized);
  const replay = replayRecords(normalized, { currentFloor });
  const entityLines = current.entities.map((entity) => {
    const values = Object.entries(entity.state ?? {}).map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`);
    return `${entity.name}：${values.length ? values.join('，') : '暂无当前状态'}`;
  });
  const historyLines = replay.map((record) => `第${record.floor}层：${record.text}`);
  const sections = [];
  if (entityLines.length) sections.push(`【当前状态】\n${entityLines.join('\n')}`);
  if (historyLines.length) sections.push(`【历史回放】\n${historyLines.join('\n')}`);
  const full = sections.join('\n\n');
  const maxChars = Math.max(0, Math.trunc(Number(tokenBudget) || 0) * 4);
  if (!maxChars || full.length <= maxChars) return { text: full, usedRecords: replay.map((record) => record.id), truncated: false, estimatedTokens: Math.ceil(full.length / 4) };
  const kept = [];
  let used = entityLines.length ? `【当前状态】\n${entityLines.join('\n')}` : '';
  for (const record of replay.slice().reverse()) {
    const line = `第${record.floor}层：${record.text}`;
    const candidate = `${used}${used ? '\n\n' : ''}【历史回放】\n${[line, ...kept].join('\n')}`;
    if (candidate.length > maxChars) break;
    kept.unshift(line);
  }
  if (kept.length === 0 && replay.length > 0) kept.push(`第${replay.at(-1).floor}层：${replay.at(-1).text}`);
  const text = [used, kept.length ? `【历史回放】\n${kept.join('\n')}` : ''].filter(Boolean).join('\n\n');
  return { text, usedRecords: replay.filter((record) => kept.some((line) => line.includes(record.text))).map((record) => record.id), truncated: true, estimatedTokens: Math.ceil(text.length / 4) };
}
