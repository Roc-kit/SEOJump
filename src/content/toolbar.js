(() => {
  const app = globalThis.SEOJumpContent;
  const state = app.state;

  function createSearchButton(engine) {
    const button = document.createElement('button');
    button.className = 'search-engine-button';
    button.dataset.url = engine.url;

    const icon = document.createElement('img');
    icon.className = 'search-engine-icon';
    icon.src = chrome.runtime.getURL('icons/icon32.png');
    app.getFavicon(engine).then(url => { icon.src = url; });

    const name = document.createElement('span');
    name.className = 'search-engine-name';
    name.textContent = engine.name;

    button.append(icon, name);
    return button;
  }

  function createCategoryButton(category, engines) {
    const container = document.createElement('div');
    container.className = 'search-category-container';

    const button = document.createElement('button');
    button.className = 'search-category-button';
    button.dataset.category = category;

    if (engines.length) {
      const icon = document.createElement('img');
      icon.className = 'search-engine-icon';
      icon.src = chrome.runtime.getURL('icons/icon32.png');
      app.getFavicon(engines[0]).then(url => { icon.src = url; });

      const name = document.createElement('span');
      name.className = 'search-engine-name';
      name.textContent = category;
      button.append(icon, name);
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'search-engines-dropdown';
    engines.filter(engine => !engine.disable).forEach(engine => {
      dropdown.appendChild(createSearchButton(engine));
    });

    container.append(button, dropdown);
    return container;
  }

  app.createToolbar = function createToolbar(categories) {
    const toolbar = document.createElement('div');
    toolbar.id = 'seojump-toolbar';
    toolbar.className = 'seojump-toolbar';
    toolbar.dataset.seojumpUi = 'toolbar';
    toolbar.style.cssText = [
      'user-select:none !important',
      '-webkit-user-select:none !important',
      'position:fixed',
      'left:50%',
      'transform:translateX(-50%)',
      'top:12px',
      'z-index:2147483647',
      'display:none'
    ].join(';');

    if (!Array.isArray(categories)) return toolbar;
    categories.forEach(category => {
      if (!category?.name || category.disable || !Array.isArray(category.engines)) return;
      const enabled = category.engines.filter(engine => !engine.disable);
      if (enabled.length) toolbar.appendChild(createCategoryButton(category.name, enabled));
    });
    return toolbar;
  };

  app.hideAllDropdowns = function hideAllDropdowns() {
    state.toolbar?.querySelectorAll('.search-engines-dropdown').forEach(dropdown => {
      dropdown.style.display = 'none';
    });
  };

  app.hideToolbar = function hideToolbar({ clearSelection = false } = {}) {
    if (!state.toolbar) return;
    state.toolbar.classList.remove('visible');
    state.toolbar.style.display = 'none';
    app.hideAllDropdowns();
    if (clearSelection) window.getSelection()?.removeAllRanges();
  };

  async function performSearch(button, selectedText, event) {
    if (!selectedText || !button?.dataset.url) return;
    await chrome.runtime.sendMessage({
      type: 'performSearch',
      url: button.dataset.url,
      text: selectedText,
      context: { currentUrl: location.href, currentDomain: location.hostname },
      inBackground: Boolean(event.ctrlKey)
    });
  }

  app.attachToolbarEvents = function attachToolbarEvents(toolbar) {
    toolbar.querySelectorAll('.search-category-button').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const selectedText = app.getSelectionText(event);
        const firstEngine = button.closest('.search-category-container')
          ?.querySelector('.search-engines-dropdown .search-engine-button');
        if (firstEngine) performSearch(firstEngine, selectedText, event);
      });
    });

    toolbar.querySelectorAll('.search-engine-button').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        performSearch(button, app.getSelectionText(event), event);
      });
    });

    toolbar.querySelectorAll('.search-category-container').forEach(container => {
      const dropdown = container.querySelector('.search-engines-dropdown');
      container.addEventListener('mouseenter', () => {
        app.hideAllDropdowns();
        dropdown.style.display = 'block';
      });
      container.addEventListener('mouseleave', () => { dropdown.style.display = 'none'; });
    });
  };

  function shouldShowForEvent(event) {
    const mode = state.settings.selectionTriggerMode;
    if (mode === 'off') return false;
    if (mode === 'always') return true;
    return Boolean(event?.ctrlKey || state.modifierPressed || state.selectionStartedWithModifier);
  }

  app.handleTextSelection = function handleTextSelection(event) {
    try {
      if (!state.toolbar || state.toolbar.contains(event?.target)) return;
      const selection = window.getSelection();
      const selectedText = app.getSelectionText(event);

      if (!selectedText || !shouldShowForEvent(event)) {
        app.hideToolbar();
        return;
      }

      state.toolbar.style.display = 'block';
      state.toolbar.classList.add('visible');

      // Keep the historical positioning algorithm unchanged. Earlier attempts to
      // make it adaptive caused regressions on real-world pages.
      requestAnimationFrame(() => {
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (!range || !state.toolbar) return;
        const rect = range.getBoundingClientRect();
        const toolbarRect = state.toolbar.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        let top = rect.top - toolbarRect.height - 10;
        if (top < 10) top = rect.bottom + 10;
        if (top + toolbarRect.height > viewportH - 10) {
          top = viewportH - toolbarRect.height - 10;
        }
        const left = Math.min(
          Math.max(rect.left + (rect.width / 2) - (toolbarRect.width / 2), 10),
          viewportW - toolbarRect.width - 10
        );
        state.toolbar.style.top = `${top}px`;
        state.toolbar.style.left = `${left}px`;
      });
    } catch (error) {
      console.error('[SEOJump] Selection handler failed:', error);
    }
  };

  app.hideToolbarForCopy = function hideToolbarForCopy() {
    const toolbar = state.toolbar;
    if (!toolbar || toolbar.style.display === 'none') return;
    const display = toolbar.style.display;
    toolbar.style.display = 'none';
    setTimeout(() => {
      if (toolbar.isConnected && toolbar.classList.contains('visible')) {
        toolbar.style.display = display || 'block';
      }
    }, 0);
  };
})();
