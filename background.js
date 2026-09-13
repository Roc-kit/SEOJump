importScripts(
  'src/shared/settings.js',
  'src/background/search.js',
  'src/background/context-menu.js',
  'src/background/favicon.js'
);

const app = globalThis.SEOJumpBackground;
const BUILTIN_ADDITIONS_VERSION = 2;
const BUILTIN_ADDITIONS_KEY = 'builtinAdditionsVersion';

async function loadDefaultEngines() {
  const response = await fetch(chrome.runtime.getURL('config/default-engines.json'));
  return response.json();
}

function syncGoogleSeoCategory(engines, defaults) {
  const googleSeo = defaults.find(category => category?.name === 'Google SEO');
  if (!googleSeo) return engines;

  const next = [...engines];
  const existingIndex = next.findIndex(category => category?.name === 'Google SEO');
  if (existingIndex >= 0) {
    next.splice(existingIndex, 1, googleSeo);
    return next;
  }

  const keywordIndex = next.findIndex(category => category?.name === 'Keyword');
  next.splice(keywordIndex >= 0 ? keywordIndex + 1 : next.length, 0, googleSeo);
  return next;
}

async function loadDefaultEnginesIfNeeded() {
  const data = await chrome.storage.local.get(['searchEngines', BUILTIN_ADDITIONS_KEY]);
  const defaults = await loadDefaultEngines();

  if (!Array.isArray(data.searchEngines)) {
    await chrome.storage.local.set({
      searchEngines: defaults,
      [BUILTIN_ADDITIONS_KEY]: BUILTIN_ADDITIONS_VERSION
    });
    return defaults;
  }

  if ((data[BUILTIN_ADDITIONS_KEY] || 0) >= BUILTIN_ADDITIONS_VERSION) {
    return data.searchEngines;
  }

  const engines = syncGoogleSeoCategory(data.searchEngines, defaults);
  await chrome.storage.local.set({
    searchEngines: engines,
    [BUILTIN_ADDITIONS_KEY]: BUILTIN_ADDITIONS_VERSION
  });
  return engines;
}

async function initialize() {
  try {
    await SEOJumpSettings.initializeSettings();
    const engines = await loadDefaultEnginesIfNeeded();
    await app.updateContextMenus(engines);
  } catch (error) {
    console.error('[SEOJump] Background initialization failed:', error);
  }
}

chrome.runtime.onInstalled.addListener(async details => {
  await chrome.storage.local.remove('operationLogs');
  await SEOJumpSettings.initializeSettings();
  const engines = await loadDefaultEnginesIfNeeded();
  await app.updateContextMenus(engines);

  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://SearchEngines.cc' });
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.searchEngines?.newValue) {
    app.updateContextMenus(changes.searchEngines.newValue);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  app.handleContextMenuClick(info, tab).catch(error => {
    console.error('[SEOJump] Context menu action failed:', error);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'openOptionsPage') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'performSearch') {
    app.handleSearch(message.url, message.text, message.context, message.inBackground)
      .then(result => sendResponse({ success: true, tabId: result?.tabId || null }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'getFavicon') {
    app.handleFaviconRequest(message.domain).then(sendResponse);
    return true;
  }

  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

initialize();
