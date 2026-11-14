export function createMemoryInjector({ getContext, getText, key = 'ILBM_MEMORY', position = 0, depth = 4, role = 0 } = {}) {
  let enabled = false;
  function setEnabled(value) { enabled = value === true; if (!enabled) clear(); return enabled; }
  function apply() {
    if (!enabled) return { ok: false, skipped: true, reason: 'memory injection is disabled' };
    const context = getContext?.();
    const setter = context?.setExtensionPrompt;
    if (typeof setter !== 'function') return { ok: false, reason: 'setExtensionPrompt unavailable' };
    const text = String(getText?.() ?? '').trim();
    try { setter(key, text, position, depth, 0, role); return { ok: true, textLength: text.length, key }; }
    catch (error) { return { ok: false, reason: String(error?.message ?? error) }; }
  }
  function clear() {
    const context = getContext?.();
    const setter = context?.setExtensionPrompt;
    if (typeof setter !== 'function') return { ok: false, reason: 'setExtensionPrompt unavailable' };
    try { setter(key, '', position, depth, 0, role); return { ok: true, key }; }
    catch (error) { return { ok: false, reason: String(error?.message ?? error) }; }
  }
  return { isEnabled: () => enabled, setEnabled, apply, clear, key };
}
