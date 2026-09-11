importScripts(
  'src/shared/settings.js',
  'src/background/search.js',
  'src/background/context-menu.js',
  'src/background/favicon.js'
);

const app = globalThis.SEOJumpBackground;

async function loadDefaultEnginesIfNeeded() {
  const data = await chrome.storage.local.get('searchEngines');
  if (Array.isArray(data.searchEngines)) return data.searchEngines;
  const response = await fetch(chrome.runtime.getURL('config/default-engines.json'));
  const defaults = await response.json();
  await chrome.storage.local.set({ searchEngines: defaults });
  return defaults;
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
      .then(() => sendResponse({ success: true }))
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
