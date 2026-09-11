(() => {
  const app = globalThis.SEOJumpBackground = globalThis.SEOJumpBackground || {};
  let menuCreationInProgress = false;

  app.updateContextMenus = async function updateContextMenus(settings) {
    if (menuCreationInProgress) return;
    menuCreationInProgress = true;
    try {
      await chrome.contextMenus.removeAll();
      if (!Array.isArray(settings)) return;

      for (const [categoryIndex, category] of settings.entries()) {
        if (category.disable || !Array.isArray(category.engines) || !category.engines.length) continue;
        const enabledEngines = category.engines
          .map((engine, engineIndex) => ({ engine, engineIndex }))
          .filter(({ engine }) => !engine.disable);
        if (!enabledEngines.length) continue;

        const categoryId = `category_${categoryIndex}`;
        chrome.contextMenus.create({
          id: categoryId,
          title: category.name || 'Unnamed Category',
          contexts: ['selection']
        });

        enabledEngines.forEach(({ engine, engineIndex }) => {
          chrome.contextMenus.create({
            id: `category_${categoryIndex}_engine_${engineIndex}`,
            parentId: categoryId,
            title: engine.name || 'Unnamed Tool',
            contexts: ['selection']
          });
        });
      }
    } catch (error) {
      console.error('[SEOJump] Failed to update context menus:', error);
    } finally {
      menuCreationInProgress = false;
    }
  };

  app.handleContextMenuClick = async function handleContextMenuClick(info, tab) {
    const menuItemId = String(info.menuItemId || '');
    const match = menuItemId.match(/^category_(\d+)_engine_(\d+)$/);
    if (!match) return;

    const [, categoryIndex, engineIndex] = match;
    const data = await chrome.storage.local.get('searchEngines');
    const engine = data.searchEngines?.[Number(categoryIndex)]?.engines?.[Number(engineIndex)];
    if (!engine || engine.disable || !tab?.url) return;

    let currentDomain = '';
    try { currentDomain = new URL(tab.url).hostname; } catch (_) {}
    await app.handleSearch(engine.url, info.selectionText || '', {
      currentUrl: tab.url,
      currentDomain
    });
  };
})();
