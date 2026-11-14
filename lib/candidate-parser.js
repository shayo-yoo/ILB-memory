/** Parse an AI candidate response without treating prose as memory facts. */
export function parseCandidateResponse(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: false, value: null, error: 'AI 返回为空' };
  const candidates = extractJsonCandidates(text);
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (Array.isArray(value) || (value && typeof value === 'object' && Array.isArray(value.events))) {
        return { ok: true, value, source: candidate === text ? 'full' : 'code-block' };
      }
    } catch { /* try next candidate */ }
  }
  return { ok: false, value: null, error: 'AI 返回中没有可解析的候选事件 JSON', raw: text.slice(0, 2000) };
}

function extractJsonCandidates(text) {
  const values = [text];
  const fenced = text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const match of fenced) values.push(match[1].trim());
  const first = text.search(/[\[{]/);
  const last = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  if (first >= 0 && last > first) values.push(text.slice(first, last + 1).trim());
  return [...new Set(values.filter(Boolean))];
}
