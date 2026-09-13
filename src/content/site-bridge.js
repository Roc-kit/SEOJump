(() => {
  const app = globalThis.SEOJumpContent = globalThis.SEOJumpContent || {};
  const SOURCE_SITE = 'seojump-site';
  const SOURCE_EXTENSION = 'seojump-extension';
  const ADD_TOOL = 'SEOJUMP_ADD_TOOL';
  const ADD_TOOL_RESULT = 'SEOJUMP_ADD_TOOL_RESULT';

  function isAllowedSite() {
    if (location.origin === 'https://searchengines.cc' || location.origin === 'https://www.searchengines.cc') {
      return true;
    }
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function cleanText(value, maxLength) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text && text.length <= maxLength ? text : '';
  }

  function isValidTemplate(value) {
    if (!value || value.length > 4096 || !/^https?:\/\//i.test(value)) return false;
    try {
      const testUrl = value
        .replaceAll('%selectedText%', 'seo')
        .replaceAll('%currentDomain%', 'example.com')
        .replaceAll('%currentUrl%', 'https://example.com/page');
      const parsed = new URL(testUrl);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (_) {
      return false;
    }
  }

  function normalizeTool(tool) {
    const id = cleanText(tool?.id, 160);
    const name = cleanText(tool?.name, 120);
    const category = cleanText(tool?.category, 80) || 'Other';
    const url = cleanText(tool?.url, 4096);
    if (!id || !name || !isValidTemplate(url)) return null;
    return { id, name, category, url };
  }

  async function addTool(tool) {
    const categories = await app.loadEngines();
    if (!Array.isArray(categories)) throw new Error('Unable to load SEOJump tools.');

    for (const item of categories) {
      if (!Array.isArray(item?.engines)) continue;
      const idMatch = item.engines.find(engine => engine?.id === tool.id);
      if (idMatch) return { status: 'exists' };

      const urlMatch = item.engines.find(engine => engine?.url === tool.url);
      if (urlMatch) {
        if (!urlMatch.id) {
          urlMatch.id = tool.id;
          await chrome.storage.local.set({ searchEngines: categories });
        }
        return { status: 'exists' };
      }
    }

    let category = categories.find(item => (
      typeof item?.name === 'string' && item.name.toLowerCase() === tool.category.toLowerCase()
    ));

    if (!category) {
      category = { name: tool.category, engines: [] };
      categories.push(category);
    }
    if (!Array.isArray(category.engines)) category.engines = [];

    category.engines.push({
      id: tool.id,
      name: tool.name,
      url: tool.url,
      source: 'website'
    });

    await chrome.storage.local.set({ searchEngines: categories });
    return { status: 'added' };
  }

  if (!isAllowedSite()) return;

  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.source !== SOURCE_SITE || message.type !== ADD_TOOL) return;

    const requestId = cleanText(message.requestId, 120);
    const tool = normalizeTool(message.tool);
    if (!requestId || !tool) {
      window.postMessage({
        source: SOURCE_EXTENSION,
        type: ADD_TOOL_RESULT,
        requestId,
        success: false,
        error: 'Invalid tool data.'
      }, location.origin);
      return;
    }

    try {
      const result = await addTool(tool);
      window.postMessage({
        source: SOURCE_EXTENSION,
        type: ADD_TOOL_RESULT,
        requestId,
        success: true,
        status: result.status
      }, location.origin);
    } catch (error) {
      window.postMessage({
        source: SOURCE_EXTENSION,
        type: ADD_TOOL_RESULT,
        requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unable to add tool.'
      }, location.origin);
    }
  });
})();
