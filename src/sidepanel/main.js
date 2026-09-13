(() => {
  const SESSION_KEY = 'workflowSessions';
  const ACTIVE_KEY = 'activeWorkflowId';
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

  async function loadSession(workflow, refreshContext = false) {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    const sessions = stored[SESSION_KEY] && typeof stored[SESSION_KEY] === 'object' ? stored[SESSION_KEY] : {};
    let session = sessions[workflow.id];
    if (!session) {
      session = {
        context: await readPageContext(),
        currentStepId: workflow.steps[0]?.id || '',
        completedStepIds: [],
        stepTabs: {}
      };
    } else if (refreshContext) {
      session.context = await readPageContext();
    }
    state.session = session;
    await saveSession();
  }

  function renderContext() {
    const context = state.session?.context || {};
    $('#context-keyword').textContent = context.selectedText ? `“${context.selectedText}”` : (context.title || 'Current page');
    $('#context-domain').textContent = context.currentDomain || '';
    $('#context-url').textContent = context.currentUrl || '';
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
      step.tools.forEach(({ toolId }) => {
        const tool = state.tools.get(toolId);
        if (!tool) return;
        const button = document.createElement('button');
        button.className = 'tool-button';
        button.type = 'button';
        button.textContent = tool.name;
        button.addEventListener('click', event => {
          event.stopPropagation();
          openTool(step, tool).catch(console.error);
        });
        tools.append(button);
      });
      body.append(description, tools);
      item.append(heading, body);
      stepList.append(item);
    });

    const currentIndex = steps.findIndex(step => step.id === state.session.currentStepId);
    $('#done-button').disabled = currentIndex < 0;
    $('#next-button').disabled = currentIndex < 0 || currentIndex >= steps.length - 1;
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

  async function openTool(step, tool) {
    state.session.currentStepId = step.id;
    const savedTabId = state.session.stepTabs?.[step.id]?.[tool.id];
    if (await focusTab(savedTabId)) {
      renderSteps();
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
    if (response.tabId) state.session.stepTabs[step.id][tool.id] = response.tabId;
    await saveSession();
    renderSteps();
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

  async function advance(markDone) {
    const steps = sortedSteps();
    const index = steps.findIndex(step => step.id === state.session.currentStepId);
    if (index < 0) return;
    if (markDone && !state.session.completedStepIds.includes(steps[index].id)) {
      state.session.completedStepIds.push(steps[index].id);
    }
    if (index < steps.length - 1) state.session.currentStepId = steps[index + 1].id;
    await saveSession();
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
  $('#done-button').addEventListener('click', () => advance(true));
  $('#next-button').addEventListener('click', () => advance(false));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.workflows || changes.searchEngines) initialize().catch(console.error);
  });

  initialize().catch(console.error);
})();
