(() => {
  const SESSION_KEY = 'workflowSessions';
  const ACTIVE_KEY = 'activeWorkflowId';
  const LAUNCH_KEY = 'workflowLaunch';
  const state = {
    workflows: [],
    tools: new Map(),
    workflow: null,
    session: null
  };

  const $ = selector => document.querySelector(selector);
  const workflowSelect = $('#workflow-select');
  const emptyState = $('#empty-state');
  const workflowView = $('#workflow-view');
  const stepList = $('#step-list');

  function flattenTools(categories) {
    const map = new Map();
    (categories || []).forEach(category => {
      (category.engines || []).forEach(tool => {
        if (tool?.id) map.set(tool.id, tool);
      });
    });
    return map;
  }

  function resolveStepTool(item) {
    if (item?.id && item?.name && item?.url) return item;
    if (item?.toolId) return state.tools.get(item.toolId) || null;
    return null;
  }

  function stepToolId(item) {
    return item?.id || item?.toolId || '';
  }

  async function readPageContext() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return { selectedText: '', currentUrl: '', currentDomain: '', title: '' };
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'getPageContext' });
      if (result?.success) return result;
    } catch (_) {}
    let domain = '';
    try { domain = new URL(tab.url || '').hostname; } catch (_) {}
    return { selectedText: '', currentUrl: tab.url || '', currentDomain: domain, title: tab.title || '' };
  }

  async function saveSession() {
    if (!state.workflow || !state.session) return;
    const stored = await chrome.storage.local.get(SESSION_KEY);
    const sessions = stored[SESSION_KEY] && typeof stored[SESSION_KEY] === 'object' ? stored[SESSION_KEY] : {};
    sessions[state.workflow.id] = state.session;
    await chrome.storage.local.set({ [SESSION_KEY]: sessions, [ACTIVE_KEY]: state.workflow.id });
  }

  async function readLaunch() {
    const stored = await chrome.storage.session.get(LAUNCH_KEY);
    return stored[LAUNCH_KEY] && typeof stored[LAUNCH_KEY] === 'object' ? stored[LAUNCH_KEY] : null;
  }

  function createSession(workflow, context, runId = '') {
    return {
      runId,
      context,
      currentStepId: workflow.steps[0]?.id || '',
      completedStepIds: [],
      stepTabs: {},
      stepOpenedTools: {}
    };
  }

  async function loadSession(workflow, refreshContext = false) {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    const sessions = stored[SESSION_KEY] && typeof stored[SESSION_KEY] === 'object' ? stored[SESSION_KEY] : {};
    let session = sessions[workflow.id];
    const launch = await readLaunch();
    if (refreshContext) {
      const context = await readPageContext();
      const newLaunch = { runId: crypto.randomUUID(), context, capturedAt: Date.now() };
      await chrome.storage.session.set({ [LAUNCH_KEY]: newLaunch });
      session = createSession(workflow, context, newLaunch.runId);
    } else if (launch?.runId && session?.runId !== launch.runId) {
      session = createSession(workflow, launch.context || await readPageContext(), launch.runId);
    } else if (!session) {
      session = createSession(workflow, launch?.context || await readPageContext(), launch?.runId || '');
    }
    state.session = session;
    await saveSession();
  }

  function renderContext() {
    const context = state.session?.context || {};
    $('#context-keyword').textContent = context.selectedText || '—';
    $('#context-domain').textContent = context.currentDomain || '—';
    $('#context-url').textContent = context.currentUrl || '—';
  }

  function sortedSteps() {
    return [...(state.workflow?.steps || [])].sort((a, b) => a.order - b.order);
  }

  function renderSteps() {
    const steps = sortedSteps();
    stepList.textContent = '';
    steps.forEach((step, index) => {
      const item = document.createElement('li');
      const completed = state.session.completedStepIds.includes(step.id);
      const current = state.session.currentStepId === step.id;
      item.className = `step-card${completed ? ' completed' : ''}${current ? ' current' : ''}`;

      const heading = document.createElement('button');
      heading.className = 'step-heading';
      heading.type = 'button';
      heading.innerHTML = `<span class="step-number">${index + 1}</span><span class="step-title"></span><span class="step-state">${completed ? 'Done' : current ? 'Current' : ''}</span>`;
      heading.querySelector('.step-title').textContent = step.title;
      heading.addEventListener('click', () => selectStep(step.id, true));

      const body = document.createElement('div');
      body.className = 'step-body';
      const description = document.createElement('p');
      description.textContent = step.description || '';
      const tools = document.createElement('div');
      tools.className = 'tool-row';
      step.tools.forEach(item => {
        const toolId = stepToolId(item);
        const tool = resolveStepTool(item);
        if (!tool) return;
        const opened = state.session.stepOpenedTools?.[step.id]?.includes(toolId);
        const button = document.createElement('button');
        button.className = `tool-button${opened ? ' opened' : ''}`;
        button.type = 'button';
        button.textContent = `${opened ? '✓ ' : ''}${tool.name}`;
        button.addEventListener('click', event => {
          event.stopPropagation();
          openTool(step, tool, toolId).catch(console.error);
        });
        tools.append(button);
      });
      body.append(description, tools);
      item.append(heading, body);
      stepList.append(item);
    });
  }

  async function markToolOpened(step, toolId) {
    state.session.stepOpenedTools = state.session.stepOpenedTools || {};
    const opened = new Set(state.session.stepOpenedTools[step.id] || []);
    opened.add(toolId);
    state.session.stepOpenedTools[step.id] = [...opened];

    const required = (step.tools || []).map(stepToolId).filter(Boolean);
    const complete = required.length > 0 && required.every(id => opened.has(id));
    if (complete && !state.session.completedStepIds.includes(step.id)) {
      state.session.completedStepIds.push(step.id);
    }
    if (complete && state.session.currentStepId === step.id) {
      const steps = sortedSteps();
      const index = steps.findIndex(item => item.id === step.id);
      if (index >= 0 && index < steps.length - 1) {
        state.session.currentStepId = steps[index + 1].id;
      }
    }
    await saveSession();
    renderSteps();
  }

  async function focusTab(tabId) {
    if (!Number.isInteger(tabId)) return false;
    try {
      const tab = await chrome.tabs.get(tabId);
      await chrome.tabs.update(tabId, { active: true });
      if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
      return true;
    } catch (_) {
      return false;
    }
  }

  async function selectStep(stepId, focusExisting) {
    state.session.currentStepId = stepId;
    if (focusExisting) {
      const tabs = state.session.stepTabs?.[stepId] || {};
      const tabId = Object.values(tabs).find(Number.isInteger);
      if (tabId) await focusTab(tabId);
    }
    await saveSession();
    renderSteps();
  }

  async function openTool(step, tool, toolId) {
    state.session.currentStepId = step.id;
    const savedTabId = state.session.stepTabs?.[step.id]?.[toolId];
    if (await focusTab(savedTabId)) {
      await markToolOpened(step, toolId);
      return;
    }

    const context = state.session.context || {};
    const response = await chrome.runtime.sendMessage({
      type: 'performSearch',
      url: tool.url,
      text: context.selectedText || '',
      context: {
        currentUrl: context.currentUrl || '',
        currentDomain: context.currentDomain || ''
      },
      inBackground: false
    });
    if (!response?.success) return;
    state.session.stepTabs = state.session.stepTabs || {};
    state.session.stepTabs[step.id] = state.session.stepTabs[step.id] || {};
    if (response.tabId) state.session.stepTabs[step.id][toolId] = response.tabId;
    await markToolOpened(step, toolId);
  }

  async function chooseWorkflow(id) {
    const workflow = state.workflows.find(item => item.id === id) || state.workflows[0];
    if (!workflow) return;
    state.workflow = workflow;
    workflowSelect.value = workflow.id;
    await loadSession(workflow);
    $('#workflow-title').textContent = workflow.title;
    $('#workflow-description').textContent = workflow.description || '';
    renderContext();
    renderSteps();
  }

  async function initialize() {
    const stored = await chrome.storage.local.get(['workflows', 'searchEngines', ACTIVE_KEY]);
    state.workflows = Array.isArray(stored.workflows) ? stored.workflows : [];
    state.tools = flattenTools(stored.searchEngines);
    if (!state.workflows.length) {
      emptyState.hidden = false;
      workflowView.hidden = true;
      workflowSelect.hidden = true;
      return;
    }

    workflowSelect.textContent = '';
    state.workflows.forEach(workflow => {
      const option = document.createElement('option');
      option.value = workflow.id;
      option.textContent = workflow.title;
      workflowSelect.append(option);
    });
    emptyState.hidden = true;
    workflowView.hidden = false;
    await chooseWorkflow(stored[ACTIVE_KEY]);
  }

  workflowSelect.addEventListener('change', () => chooseWorkflow(workflowSelect.value));
  $('#refresh-context').addEventListener('click', async () => {
    await loadSession(state.workflow, true);
    renderContext();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.workflows || changes.searchEngines)) {
      initialize().catch(console.error);
      return;
    }
    if (area === 'session' && changes[LAUNCH_KEY] && state.workflow) {
      chooseWorkflow(state.workflow.id).catch(console.error);
    }
  });

  initialize().catch(console.error);
})();
