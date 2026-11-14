import { parseCandidateResponse } from './candidate-parser.js';

/**
 * Optional AI extraction adapter. No model call is made unless caller supplies extract.
 * The adapter is fail-open and returns timing/parse diagnostics for the UI.
 */
export async function runCandidateExtraction(text, { extract = null, timeoutMs = 3000 } = {}) {
  const startedAt = Date.now();
  if (typeof extract !== 'function') return { ok: false, skipped: true, elapsedMs: 0, error: '未配置 AI 提取器；本次未调用模型' };
  let timer;
  try {
    const response = await Promise.race([
      Promise.resolve().then(() => extract(String(text ?? ''))),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`AI 提取超时（>${timeoutMs}ms）`)), timeoutMs); }),
    ]);
    const raw = typeof response === 'string' ? response : response?.text ?? response?.content ?? JSON.stringify(response);
    const parsed = parseCandidateResponse(raw);
    return parsed.ok
      ? { ok: true, skipped: false, elapsedMs: Date.now() - startedAt, raw, value: parsed.value, source: parsed.source }
      : { ok: false, skipped: false, elapsedMs: Date.now() - startedAt, raw, error: parsed.error };
  } catch (error) {
    return { ok: false, skipped: false, elapsedMs: Date.now() - startedAt, error: String(error?.message ?? error) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
