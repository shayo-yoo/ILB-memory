const MAX_FAILURES = 100;

export function normalizeFailure(input = {}) {
  return {
    id: String(input.id ?? `fail-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`),
    floor: Number.isFinite(Number(input.floor)) ? Math.trunc(Number(input.floor)) : null,
    sourceMessageId: input.sourceMessageId == null ? null : String(input.sourceMessageId),
    reason: String(input.reason ?? '未说明失败原因').slice(0, 500),
    stage: String(input.stage ?? 'extract').slice(0, 80),
    at: Number.isFinite(Number(input.at)) ? Number(input.at) : Date.now(),
  };
}

export function appendFailure(state, input) {
  const failures = Array.isArray(state?.failures) ? state.failures.map(normalizeFailure) : [];
  failures.push(normalizeFailure(input));
  return failures.slice(-MAX_FAILURES);
}
