(() => {
  const STORAGE_KEY = 'seoJumpSettings';

  function detectLanguage() {
    const language = globalThis.navigator?.language || 'en';
    return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  }

  const DEFAULTS = {
    uiLanguage: detectLanguage(),
    selectionTriggerMode: 'modifier'
  };

  async function getSettings() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return {
      ...DEFAULTS,
      ...(data[STORAGE_KEY] || {})
    };
  }

  async function updateSettings(patch) {
    const current = await getSettings();
    const next = { ...current, ...patch };
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
  }

  async function initializeSettings() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    if (data[STORAGE_KEY]) {
      return { ...DEFAULTS, ...data[STORAGE_KEY] };
    }

    const initial = { ...DEFAULTS };
    await chrome.storage.local.set({ [STORAGE_KEY]: initial });
    return initial;
  }

  globalThis.SEOJumpSettings = {
    STORAGE_KEY,
    DEFAULTS,
    getSettings,
    updateSettings,
    initializeSettings
  };
})();
