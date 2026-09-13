(() => {
  const app = globalThis.SEOJumpContent = globalThis.SEOJumpContent || {};
  const SOURCE_SITE = 'seojump-site';
  const SOURCE_EXTENSION = 'seojump-extension';
  const ADD_TOOL = 'SEOJUMP_ADD_TOOL';
  const ADD_TOOL_RESULT = 'SEOJUMP_ADD_TOOL_RESULT';
  const ADD_WORKFLOW = 'SEOJUMP_ADD_WORKFLOW';
  const ADD_WORKFLOW_RESULT = 'SEOJUMP_ADD_WORKFLOW_RESULT';

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

  function normalizeWorkflow(workflow) {
    const id = cleanText(workflow?.id, 160);
    const title = cleanText(workflow?.title, 160);
    const description = typeof workflow?.description === 'string' ? workflow.description.trim().slice(0, 1000) : '';
    if (!id || !title || !Array.isArray(workflow?.steps) || !workflow.steps.length) return null;

    const steps = workflow.steps.map(step => {
      const stepId = cleanText(step?.id, 160);
      const stepTitle = cleanText(step?.title, 160);
      const stepDescription = typeof step?.description === 'string' ? step.description.trim().slice(0, 1200) : '';
      const order = Number.isInteger(step?.order) ? step.order : null;
      const tools = Array.isArray(step?.tools)
        ? step.tools.map(item => ({ toolId: cleanText(item?.toolId, 160) })).filter(item => item.toolId)
        : [];
      if (!stepId || !stepTitle || order === null || !tools.length) return null;
      return { id: stepId, title: stepTitle, description: stepDescription, order, tools };
    });

    if (steps.some(step => !step)) return null;
    return { id, title, description, steps };
  }

  function ensureTool(categories, tool) {
    for (const item of categories) {
      if (!Array.isArray(item?.engines)) continue;
      const idMatch = item.engines.find(engine => engine?.id === tool.id);
      if (idMatch) return false;

      const urlMatch = item.engines.find(engine => engine?.url === tool.url);
      if (urlMatch) {
        if (!urlMatch.id) {
          urlMatch.id = tool.id;
          return true;
        }
        return false;
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
    category.engines.push({ id: tool.id, name: tool.name, url: tool.url, source: 'website' });
    return true;
  }

  async function addTool(tool) {
    const categories = await app.loadEngines();
    if (!Array.isArray(categories)) throw new Error('Unable to load SEOJump tools.');
    const before = categories.some(category => category?.engines?.some(engine => engine?.id === tool.id || engine?.url === tool.url));
    const changed = ensureTool(categories, tool);
    if (changed) await chrome.storage.local.set({ searchEngines: categories });
    return { status: before ? 'exists' : 'added' };
  }

  async function addWorkflow(workflow, tools) {
    const categories = await app.loadEngines();
    if (!Array.isArray(categories)) throw new Error('Unable to load SEOJump tools.');

    const requiredToolIds = new Set(workflow.steps.flatMap(step => step.tools.map(item => item.toolId)));
    const normalizedTools = tools.map(normalizeTool).filter(Boolean);
    if ([...requiredToolIds].some(toolId => !normalizedTools.some(tool => tool.id === toolId))) {
      throw new Error('Workflow is missing a required tool.');
    }

    let toolsChanged = false;
    normalizedTools.forEach(tool => {
      toolsChanged = ensureTool(categories, tool) || toolsChanged;
    });

    const stored = await chrome.storage.local.get('workflows');
    const workflows = Array.isArray(stored.workflows) ? stored.workflows : [];
    const exists = workflows.some(item => item?.id === workflow.id);
    if (!exists) workflows.push(workflow);

    const update = {};
    if (toolsChanged) update.searchEngines = categories;
    if (!exists) update.workflows = workflows;
    if (Object.keys(update).length) await chrome.storage.local.set(update);
    return { status: exists ? 'exists' : 'added' };
  }

  if (!isAllowedSite()) return;

  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.source !== SOURCE_SITE) return;

    if (message.type === ADD_WORKFLOW) {
      const requestId = cleanText(message.requestId, 120);
      const workflow = normalizeWorkflow(message.workflow);
      const tools = Array.isArray(message.tools) ? message.tools : [];
      if (!requestId || !workflow || !tools.length) {
        window.postMessage({ source: SOURCE_EXTENSION, type: ADD_WORKFLOW_RESULT, requestId, success: false, error: 'Invalid workflow data.' }, location.origin);
        return;
      }
      try {
        const result = await addWorkflow(workflow, tools);
        window.postMessage({ source: SOURCE_EXTENSION, type: ADD_WORKFLOW_RESULT, requestId, success: true, status: result.status }, location.origin);
      } catch (error) {
        window.postMessage({
          source: SOURCE_EXTENSION,
          type: ADD_WORKFLOW_RESULT,
          requestId,
          success: false,
          error: error instanceof Error ? error.message : 'Unable to add workflow.'
        }, location.origin);
      }
      return;
    }

    if (message.type !== ADD_TOOL) return;

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
