(() => {
  const app = globalThis.SEOJumpContent;
  const state = app.state;

  function rebuildToolbar() {
    state.toolbar?.remove();
    state.toolbar = app.createToolbar(state.engines);
    document.documentElement.appendChild(state.toolbar);
    app.attachToolbarEvents(state.toolbar);
  }

  function setupObservers() {
    state.mainObserver?.disconnect();
    let pending = false;
    state.mainObserver = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        if (state.toolbar && !document.documentElement.contains(state.toolbar)) {
          document.documentElement.appendChild(state.toolbar);
        }
        pending = false;
      });
    });
    state.mainObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: !app.isReddit
    });

    if (app.isReddit) return;
    state.shadowObserver?.disconnect();
    state.shadowObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE && node.shadowRoot) {
          node.shadowRoot.addEventListener('mouseup', handleMouseUp, true);
          node.shadowRoot.addEventListener('keyup', handleKeyUp, true);
        }
      }));
    });
    state.shadowObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function hookRedditNavigation() {
    if (!app.isReddit) return;
    const reset = () => app.hideToolbar();
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    history.pushState = function (...args) {
      const result = pushState.apply(this, args);
      reset();
      return result;
    };
    history.replaceState = function (...args) {
      const result = replaceState.apply(this, args);
      reset();
      return result;
    };
    window.addEventListener('popstate', reset, { passive: true });
  }

  function handleMouseDown(event) {
    if (state.toolbar?.contains(event.target)) return;
    state.selectionStartedWithModifier = Boolean(event.ctrlKey || state.modifierPressed);
  }

  function handleMouseUp(event) {
    app.handleTextSelection(event);
    cacheWorkflowSelection(event);
    state.selectionStartedWithModifier = false;
  }

  function handleKeyDown(event) {
    if (event.key === 'Control') state.modifierPressed = true;
    if (event.key === 'Escape') app.hideToolbar({ clearSelection: true });
  }

  function handleKeyUp(event) {
    if (event.key === 'Control') {
      state.modifierPressed = false;
      return;
    }
    app.handleTextSelection(event);
    cacheWorkflowSelection(event);
  }

  function cacheWorkflowSelection(event) {
    const selectedText = app.getSelectionText(event);
    if (!selectedText) {
      chrome.runtime.sendMessage({ type: 'clearWorkflowSelection' }).catch(() => {});
      return;
    }
    chrome.runtime.sendMessage({
      type: 'cacheWorkflowSelection',
      context: {
        selectedText,
        currentUrl: location.href,
        currentDomain: location.hostname,
        title: document.title
      }
    }).catch(() => {});
  }

  function enableAllowCopy() {
    if (document.getElementById('seojump-allow-copy-style')) return;
    const style = document.createElement('style');
    style.id = 'seojump-allow-copy-style';
    style.textContent = 'html, body, *, *::before, *::after {-webkit-user-select:initial!important;user-select:initial!important;}';
    document.documentElement.appendChild(style);

    const stop = event => {
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };
    ['copy', 'cut', 'contextmenu', 'selectstart'].forEach(type => {
      document.documentElement.addEventListener(type, stop, { capture: true });
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'processAdvancedFeatures') {
      app.processAdvancedFeatures(message.params)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
    if (message.type === 'advancedPing') {
      sendResponse({ success: true });
      return false;
    }
    if (message.type === 'enableCopy') {
      enableAllowCopy();
      sendResponse({ success: true });
      return false;
    }
    if (message.type === 'getPageContext') {
      sendResponse({
        success: true,
        selectedText: app.getSelectionText(),
        currentUrl: location.href,
        currentDomain: location.hostname,
        title: document.title
      });
      return false;
    }
    return false;
  });

  async function initialize() {
    if (state.initialized) return;
    state.initialized = true;
    [state.engines, state.settings] = await Promise.all([
      app.loadEngines(),
      SEOJumpSettings.getSettings()
    ]);
    rebuildToolbar();

    document.addEventListener('mousedown', handleMouseDown, { capture: true, passive: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true, passive: true });
    document.addEventListener('beforecopy', app.hideToolbarForCopy, { capture: true });
    document.addEventListener('copy', app.hideToolbarForCopy, { capture: true });

    setupObservers();
    hookRedditNavigation();
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;
    if (changes.searchEngines?.newValue && Array.isArray(changes.searchEngines.newValue)) {
      state.engines = changes.searchEngines.newValue;
      rebuildToolbar();
    }
    if (changes[SEOJumpSettings.STORAGE_KEY]?.newValue) {
      state.settings = { ...SEOJumpSettings.DEFAULTS, ...changes[SEOJumpSettings.STORAGE_KEY].newValue };
      if (state.settings.selectionTriggerMode === 'off') app.hideToolbar();
    }
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted && !state.initialized) initialize();
  }, { passive: true });

  initialize();
})();
