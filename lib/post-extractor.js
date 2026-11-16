/**
 * 模式 B：事后提取（v2 §5.2）。
 *
 * 流程：AI 正常回复后，把最近若干轮对话 + 提取提示词发送给用户配置的
 * OpenAI 兼容 API，由外部模型返回候选事件，再走与模式 A 相同的校验/存储出口。
 *
 * 约束：
 * - 3 秒软超时：超时后本轮注入使用已有数据，但请求继续，晚到结果仍写入存储，不回溯注入；
 * - 同一消息只提取一次（extractionMarks 去重，§5.2）；
 * - 任何失败只写失败日志，不阻塞聊天（§5.4）；
 * - 默认关闭，只有 extractionMode === 'post' 时才调用。
 */

import { parseCandidateResponse } from './candidate-parser.js';

export const DEFAULT_POST_PROMPT = `你是 SillyTavern 角色的记忆提取器。阅读给定对话，提取其中值得长期记忆的事实变化。
只输出一个 JSON 对象，不要输出解释、Markdown 代码块或额外文字。格式：
{"events":[{"text":"一句完整的事件描述","entities":["实体短名",...],"action":"枚举动作词或空字符串","description":"动作附加说明（关系角色等，可空）","stateChanges":[{"entityId":"实体短名","field":"ownerId|locationId|status|continuousStatus|relations|charactersPresent|itemsPresent","after":值}]}]}
规则：
1. entities 使用对话中出现的实体短名；新实体直接写短名，程序会注册。
2. 只有发生状态字段变化时才填写 action；动作词只能是：转移、获得、失去、移动、损坏、修复、销毁、遗失、死亡、受伤、中毒、建立关系、解除关系、交给。
3. 关系是有向的：建立关系时 entities=[主动方,被动方]，description 写角色（如 主人、仆人、丈夫、妻子、盟友）。不对称关系（主仆、夫妻、俘虏）需要输出两条事件，双方各一条。
4. 没有值得记录的变化时输出 {"events":[]}。
5. 不要记录回忆、计划、假设、推测或角色说出的错误信息。`;

export const POST_TIMEOUT_MS = 3000;

export function messageExtractionKey({ sourceMessageId = null, swipeId = null, floor = 0 } = {}) {
  return `${sourceMessageId == null ? `floor:${floor}` : sourceMessageId}#${swipeId ?? 0}`;
}

/** 当前轮 + 前 N 轮（默认 2 轮，可配置）的纯文本对话。 */
export function buildPostTranscript(chat, { floor = null, rounds = 2 } = {}) {
  const messages = Array.isArray(chat) ? chat : [];
  const end = Number.isInteger(floor) ? floor : messages.length - 1;
  if (end < 0 || messages.length === 0) return '';
  const start = Math.max(0, end - Math.max(1, rounds) * 2 + 1);
  return messages.slice(start, end + 1)
    .map((message) => `${message?.is_user === true ? '用户' : '角色'}：${String(message?.mes ?? '').trim()}`)
    .join('\n');
}

export function buildPostMessages({ prompt = '', transcript = '', entities = [] } = {}) {
  const entityHint = entities.length
    ? `已知实体短名：${entities.map((entity) => (typeof entity === 'string' ? entity : entity?.name)).filter(Boolean).join('、')}`
    : '已知实体短名：无';
  return [
    { role: 'system', content: prompt || DEFAULT_POST_PROMPT },
    { role: 'user', content: `${entityHint}\n\n对话：\n${transcript}\n\n请输出候选事件 JSON。` },
  ];
}

function joinUrl(baseUrl) {
  const base = String(baseUrl ?? '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return /\/chat\/completions$/u.test(base) ? base : `${base}/chat/completions`;
}

export function createPostExtractor({
  store,
  getSettings = () => ({}),
  getChat = () => [],
  getEntities = () => [],
  fetchImpl = globalThis.fetch,
  resolveEntities = null,
  onResult = () => {},
  softTimeoutMs = null,
} = {}) {
  const inFlight = new Map();

  async function runRequest({ key, floor, sourceMessageId, swipeId, settings, chat }) {
    const post = settings?.postApi ?? {};
    const url = joinUrl(post.baseUrl);
    if (!url) return { ok: false, key, error: '未配置事后提取 API 地址' };
    if (typeof fetchImpl !== 'function') return { ok: false, key, error: '当前环境没有 fetch，无法调用事后提取 API' };

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const hardTimer = controller ? setTimeout(() => controller.abort(), Math.max(1000, Number(post.requestTimeoutMs) || 30000)) : null;
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(post.apiKey ? { Authorization: `Bearer ${post.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: post.model || 'gpt-4o-mini',
          messages: buildPostMessages({
            prompt: post.prompt,
            transcript: buildPostTranscript(chat, { floor, rounds: post.contextRounds }),
            entities: getEntities(),
          }),
          temperature: 0.2,
          stream: false,
        }),
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (!response?.ok) return { ok: false, key, error: `事后提取 API 返回 HTTP ${response?.status ?? '未知'}` };
      const payload = typeof response.json === 'function' ? await response.json() : response;
      const raw = payload?.choices?.[0]?.message?.content ?? payload?.content ?? payload?.text ?? '';
      const parsed = parseCandidateResponse(raw);
      if (!parsed.ok) return { ok: false, key, raw, error: parsed.error };
      const imported = store.importCandidates(parsed.value, {
        floor,
        sourceMessageId,
        swipeId,
        status: 'pending',
        extractionMode: 'post',
        resolveEntities,
      });
      return {
        // 空结果也是成功的一次提取（标记 done），避免同一消息反复调用。
        ok: imported.rejected.length === 0,
        key,
        accepted: imported.accepted,
        rejected: imported.rejected,
        raw,
        empty: imported.accepted.length === 0 && imported.rejected.length === 0,
        error: imported.rejected.length > 0 ? `${imported.rejected.length} 个候选事件未通过校验` : null,
      };
    } catch (error) {
      const reason = error?.name === 'AbortError' ? '事后提取请求超时' : String(error?.message ?? error);
      return { ok: false, key, error: reason };
    } finally {
      if (hardTimer) clearTimeout(hardTimer);
    }
  }

  function mark(key, patch) {
    try { store.markExtraction?.({ key, ...patch }); } catch { /* marks are diagnostics only */ }
  }

  function logFailure(result, meta) {
    try {
      store.logFailure?.({
        stage: 'post',
        floor: meta.floor,
        sourceMessageId: meta.sourceMessageId,
        reason: result?.error ?? '事后提取失败',
      });
    } catch { /* failure logging must never throw */ }
  }

  /**
   * 返回本轮结果；`pending` 是完整请求的 promise，软超时后仍会完成并写入存储。
   */
  async function extract({ floor = 0, sourceMessageId = null, swipeId = null } = {}) {
    const settings = getSettings?.() ?? {};
    if (settings.extractionMode !== 'post') return { ok: false, skipped: true, reason: '当前为直出模式' };
    const key = messageExtractionKey({ sourceMessageId, swipeId, floor });
    const existing = store.getExtractionMark?.(key) ?? null;
    if (existing && ['started', 'done'].includes(existing.status)) {
      return { ok: false, skipped: true, key, reason: existing.status === 'done' ? '该消息已提取' : '该消息正在提取' };
    }
    if (inFlight.has(key)) return { ok: false, skipped: true, key, reason: '该消息正在提取' };
    // §5.2：同一条消息只允许一种模式提取。已有该消息任何模式的记录时跳过。
    const alreadyExtracted = Boolean(sourceMessageId) && (store.inspect?.().records ?? []).some((record) => (
      String(record.sourceMessageId ?? '') === String(sourceMessageId)
      && String(record.swipeId ?? '') === String(swipeId ?? '')
    ));
    if (alreadyExtracted) return { ok: false, skipped: true, key, reason: '该消息已有提取记录' };

    const post = settings.postApi ?? {};
    if (!joinUrl(post.baseUrl)) {
      const result = { ok: false, skipped: true, key, error: '未配置事后提取 API 地址' };
      mark(key, { status: 'failed', floor, sourceMessageId, swipeId, mode: 'post', reason: result.error, at: Date.now() });
      logFailure(result, { floor, sourceMessageId });
      return result;
    }

    mark(key, { status: 'started', floor, sourceMessageId, swipeId, mode: 'post', at: Date.now() });
    const chat = getChat?.() ?? [];
    const pending = runRequest({ key, floor, sourceMessageId, swipeId, settings, chat })
      .then((result) => {
        mark(key, {
          status: result.ok ? 'done' : 'failed',
          floor,
          sourceMessageId,
          swipeId,
          mode: 'post',
          reason: result.ok ? null : (result.error ?? '未提取到事件'),
          at: Date.now(),
        });
        if (!result.ok) logFailure(result, { floor, sourceMessageId });
        try { onResult(result); } catch { /* observers must not break extraction */ }
        return result;
      })
      .catch((error) => {
        const result = { ok: false, key, error: String(error?.message ?? error) };
        mark(key, { status: 'failed', floor, sourceMessageId, swipeId, mode: 'post', reason: result.error, at: Date.now() });
        logFailure(result, { floor, sourceMessageId });
        return result;
      });

    inFlight.set(key, pending);
    pending.finally(() => inFlight.delete(key));

    const timeout = Number(softTimeoutMs ?? post.timeoutMs ?? POST_TIMEOUT_MS);
    let timer = null;
    const timeoutPromise = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ ok: false, key, timedOut: true, error: `事后提取超过 ${timeout}ms，本轮先使用已有记忆` }), Math.max(1, timeout));
    });
    const raced = await Promise.race([pending, timeoutPromise]);
    if (timer) clearTimeout(timer);
    return { ...raced, pending };
  }

  return {
    extract,
    inFlight: () => [...inFlight.keys()],
    buildMessages: options => buildPostMessages(options),
    transcript: options => buildPostTranscript(options?.chat, options),
  };
}
