(() => {
  const app = globalThis.SEOJumpBackground = globalThis.SEOJumpBackground || {};
  const LAUNCH_KEY = 'workflowLaunch';
  const RECENT_PREFIX = 'workflowRecentSelection:';

  function domainFromUrl(url) {
    try { return new URL(url || '').hostname; } catch (_) { return ''; }
  }

  function recentKey(tabId) {
    return `${RECENT_PREFIX}${tabId}`;
  }

  async function readLiveContext(tab) {
    if (!tab?.id) return null;
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'getPageContext' });
      return result?.success ? result : null;
    } catch (_) {
      return null;
    }
  }

  async function readRecentSelection(tab) {
    if (!tab?.id) return null;
    const key = recentKey(tab.id);
    const stored = await chrome.storage.session.get(key);
    const recent = stored[key];
    if (!recent || recent.currentUrl !== (tab.url || '')) return null;
    return recent;
  }

  app.cacheWorkflowSelection = async function cacheWorkflowSelection(context, senderTab) {
    if (!senderTab?.id) return;
    const selectedText = typeof context?.selectedText === 'string' ? context.selectedText.trim() : '';
    if (!selectedText) {
      await chrome.storage.session.remove(recentKey(senderTab.id));
      return;
    }
    await chrome.storage.session.set({
      [recentKey(senderTab.id)]: {
        selectedText,
        currentUrl: context.currentUrl || senderTab.url || '',
        currentDomain: context.currentDomain || domainFromUrl(context.currentUrl || senderTab.url),
        title: context.title || senderTab.title || '',
        sourceTabId: senderTab.id,
        capturedAt: Date.now()
      }
    });
  };

  app.clearWorkflowSelection = async function clearWorkflowSelection(senderTab) {
    if (senderTab?.id) await chrome.storage.session.remove(recentKey(senderTab.id));
  };

  app.prepareWorkflowLaunch = async function prepareWorkflowLaunch(tab, options = {}) {
    if (!tab?.id) throw new Error('No active tab available.');
    const live = await readLiveContext(tab);
    const hasExplicitSelection = Object.prototype.hasOwnProperty.call(options, 'selectedText');
    let selectedText = hasExplicitSelection ? String(options.selectedText || '').trim() : String(live?.selectedText || '').trim();

    if (!selectedText && options.useRecentSelection !== false && !hasExplicitSelection) {
      const recent = await readRecentSelection(tab);
      selectedText = recent?.selectedText || '';
    }

    const currentUrl = live?.currentUrl || tab.url || '';
    const context = {
      selectedText,
      currentUrl,
      currentDomain: live?.currentDomain || domainFromUrl(currentUrl),
      sourceTabId: tab.id,
      title: live?.title || tab.title || ''
    };
    const launch = {
      runId: crypto.randomUUID(),
      context,
      capturedAt: Date.now()
    };
    await chrome.storage.session.set({ [LAUNCH_KEY]: launch });
    return launch;
  };

  app.openWorkflowPanel = async function openWorkflowPanel(tab, options = {}) {
    const launch = await app.prepareWorkflowLaunch(tab, options);
    await chrome.sidePanel.open({ tabId: tab.id });
    return launch;
  };
})();
