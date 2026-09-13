(() => {
  const app = globalThis.SEOJumpOptions;
  const state = app.state;
  state.workflows = [];
  state.activeWorkflowIndex = 0;

  let workflowSaveTimer = null;
  let bound = false;
  let toolEditorTarget = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function newStep(order = 10) {
    return {
      id: `step:${crypto.randomUUID()}`,
      title: SEOJumpI18n.t('newStep'),
      description: '',
      order,
      tools: []
    };
  }

  function newWorkflow() {
    return {
      id: `local-workflow:${crypto.randomUUID()}`,
      title: SEOJumpI18n.t('newWorkflow'),
      description: '',
      steps: [newStep()]
    };
  }

  function activeWorkflow() {
    return state.workflows[state.activeWorkflowIndex] || null;
  }

  function searchToolById(toolId) {
    for (const category of state.engines) {
      const tool = (category.engines || []).find(item => item?.id === toolId);
      if (tool) return tool;
    }
    return null;
  }

  function workflowTool(item) {
    if (item?.id && item?.name && item?.url) return item;
    if (item?.toolId) {
      const source = searchToolById(item.toolId);
      if (source?.name && source?.url) return { id: item.toolId, name: source.name, url: source.url };
    }
    return null;
  }

  function createWorkflowTool(name, url) {
    return {
      id: `workflow-tool:${crypto.randomUUID()}`,
      name: String(name || '').trim(),
      url: String(url || '').trim()
    };
  }

  function toolOptions(step) {
    const options = [`<option value="">${escapeHtml(SEOJumpI18n.t('importTool'))}</option>`];
    const existing = new Set((step.tools || []).map(item => {
      const tool = workflowTool(item);
      return tool ? `${tool.name}\n${tool.url}` : '';
    }).filter(Boolean));
    state.engines.forEach((category, categoryIndex) => {
      const categoryOptions = [];
      (category.engines || []).forEach((tool, toolIndex) => {
        if (!tool?.name || !tool?.url) return;
        if (existing.has(`${tool.name}\n${tool.url}`)) return;
        categoryOptions.push(`<option value="${categoryIndex}:${toolIndex}">${escapeHtml(tool.name)}</option>`);
      });
      if (categoryOptions.length) options.push(`<optgroup label="${escapeHtml(category.name)}">${categoryOptions.join('')}</optgroup>`);
    });
    return options.join('');
  }

  function normalizeOrders(workflow) {
    workflow.steps.forEach((step, index) => { step.order = (index + 1) * 10; });
  }

  async function saveWorkflows() {
    clearTimeout(workflowSaveTimer);
    workflowSaveTimer = null;
    app.setSaveStatus?.('saving');
    await chrome.storage.local.set({ workflows: state.workflows });
    if (!state.hasUnsavedChanges) app.setSaveStatus?.('saved');
  }

  function scheduleWorkflowSave() {
    clearTimeout(workflowSaveTimer);
    app.setSaveStatus?.('saving');
    workflowSaveTimer = setTimeout(() => saveWorkflows().catch(console.error), 500);
  }

  app.loadWorkflows = async function loadWorkflows() {
    const stored = await chrome.storage.local.get('workflows');
    state.workflows = Array.isArray(stored.workflows) ? stored.workflows : [];
    state.activeWorkflowIndex = Math.min(state.activeWorkflowIndex, Math.max(0, state.workflows.length - 1));
  };

  app.migrateLegacyWorkflowTools = async function migrateLegacyWorkflowTools() {
    let changed = false;
    state.workflows.forEach(workflow => {
      (workflow.steps || []).forEach(step => {
        step.tools = (step.tools || []).map(item => {
          if (item?.id && item?.name && item?.url) return item;
          const source = item?.toolId ? searchToolById(item.toolId) : null;
          if (!source?.name || !source?.url) return item;
          changed = true;
          return { id: item.toolId, name: source.name, url: source.url };
        });
      });
    });
    if (changed) await chrome.storage.local.set({ workflows: state.workflows });
  };

  app.renderWorkflows = function renderWorkflows() {
    const container = document.getElementById('workflows-container');
    if (!container) return;

    if (!state.workflows.length) {
      container.innerHTML = `
        <div class="workflow-empty">
          <p>${escapeHtml(SEOJumpI18n.t('noWorkflowsConfigured'))}</p>
          <button type="button" class="workflow-add">+ ${escapeHtml(SEOJumpI18n.t('newWorkflow'))}</button>
        </div>`;
      return;
    }

    state.activeWorkflowIndex = Math.min(state.activeWorkflowIndex, state.workflows.length - 1);
    const workflow = activeWorkflow();
    const workflowList = state.workflows.map((item, index) => `
      <button type="button" class="workflow-select ${index === state.activeWorkflowIndex ? 'active' : ''}" data-index="${index}">
        ${escapeHtml(item.title || SEOJumpI18n.t('untitledWorkflow'))}
      </button>`).join('');

    const steps = [...(workflow.steps || [])].sort((a, b) => a.order - b.order).map((step, index, all) => {
      const assignedTools = (step.tools || []).map((item, toolIndex) => {
        const tool = workflowTool(item);
        return `<div class="workflow-tool-item" data-tool-index="${toolIndex}">
          <button type="button" class="workflow-edit-tool" ${tool ? '' : 'disabled'}>${escapeHtml(tool?.name || SEOJumpI18n.t('missingTool'))}</button>
          <button type="button" class="workflow-remove-tool" title="${escapeHtml(SEOJumpI18n.t('remove'))}">×</button>
        </div>`;
      }).join('');

      return `<article class="workflow-step-editor" data-step-index="${index}">
        <div class="workflow-step-header">
          <span class="workflow-step-number">${index + 1}</span>
          <input class="workflow-step-title" type="text" value="${escapeHtml(step.title)}" placeholder="${escapeHtml(SEOJumpI18n.t('stepTitle'))}">
          <div class="workflow-step-actions">
            <button type="button" class="workflow-step-up" ${index === 0 ? 'disabled' : ''} title="${escapeHtml(SEOJumpI18n.t('moveUp'))}">↑</button>
            <button type="button" class="workflow-step-down" ${index === all.length - 1 ? 'disabled' : ''} title="${escapeHtml(SEOJumpI18n.t('moveDown'))}">↓</button>
            <button type="button" class="workflow-delete-step" title="${escapeHtml(SEOJumpI18n.t('deleteStep'))}">×</button>
          </div>
        </div>
        <textarea class="workflow-step-description" rows="2" placeholder="${escapeHtml(SEOJumpI18n.t('stepDescription'))}">${escapeHtml(step.description)}</textarea>
        <div class="workflow-tool-list">${assignedTools || `<span class="workflow-muted">${escapeHtml(SEOJumpI18n.t('noToolsInStep'))}</span>`}</div>
        <div class="workflow-add-tool-row">
          <select class="workflow-tool-picker">${toolOptions(step)}</select>
          <button type="button" class="workflow-custom-tool">+ ${escapeHtml(SEOJumpI18n.t('customTool'))}</button>
        </div>
      </article>`;
    }).join('');

    container.innerHTML = `
      <div class="workflow-manager">
        <aside class="workflow-list-panel">
          <div class="workflow-list">${workflowList}</div>
          <button type="button" class="workflow-add">+ ${escapeHtml(SEOJumpI18n.t('newWorkflow'))}</button>
        </aside>
        <div class="workflow-editor">
          <div class="workflow-editor-header">
            <input class="workflow-title-input" type="text" value="${escapeHtml(workflow.title)}" placeholder="${escapeHtml(SEOJumpI18n.t('workflowName'))}">
            <button type="button" class="workflow-delete">${escapeHtml(SEOJumpI18n.t('deleteWorkflow'))}</button>
          </div>
          <textarea class="workflow-description-input" rows="2" placeholder="${escapeHtml(SEOJumpI18n.t('workflowDescription'))}">${escapeHtml(workflow.description)}</textarea>
          <div class="workflow-steps">${steps}</div>
          <button type="button" class="workflow-add-step">+ ${escapeHtml(SEOJumpI18n.t('addStep'))}</button>
        </div>
      </div>`;
  };

  function rerender() {
    app.renderWorkflows();
    SEOJumpI18n.apply(document.getElementById('workflows'));
  }

  function stepAt(index) {
    const workflow = activeWorkflow();
    if (!workflow) return null;
    workflow.steps = [...(workflow.steps || [])].sort((a, b) => a.order - b.order);
    return workflow.steps[index] || null;
  }

  function validToolUrl(value) {
    try {
      const sample = String(value || '')
        .replaceAll('%selectedText%', 'seo')
        .replaceAll('%currentUrl%', 'https://example.com/page')
        .replaceAll('%currentDomain%', 'example.com');
      const parsed = new URL(sample);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  function closeToolEditor() {
    document.getElementById('workflowToolModal').style.display = 'none';
    toolEditorTarget = null;
  }

  function openToolEditor(stepIndex, toolIndex = null) {
    const step = stepAt(stepIndex);
    if (!step) return;
    const existing = Number.isInteger(toolIndex) ? workflowTool(step.tools[toolIndex]) : null;
    toolEditorTarget = { stepIndex, toolIndex };
    document.getElementById('workflowToolModalTitle').textContent = SEOJumpI18n.t(existing ? 'editWorkflowTool' : 'customWorkflowTool');
    document.getElementById('workflowToolName').value = existing?.name || '';
    document.getElementById('workflowToolUrl').value = existing?.url || '';
    document.getElementById('workflowToolModal').style.display = 'block';
    document.getElementById('workflowToolName').focus();
  }

  async function saveToolEditor() {
    if (!toolEditorTarget) return;
    const name = document.getElementById('workflowToolName').value.trim();
    const url = document.getElementById('workflowToolUrl').value.trim();
    if (!name || !validToolUrl(url)) {
      app.showMessage(SEOJumpI18n.t('invalidTool'), 'error');
      return;
    }
    const step = stepAt(toolEditorTarget.stepIndex);
    if (!step) return;
    if (Number.isInteger(toolEditorTarget.toolIndex)) {
      const current = workflowTool(step.tools[toolEditorTarget.toolIndex]);
      step.tools[toolEditorTarget.toolIndex] = {
        id: current?.id || `workflow-tool:${crypto.randomUUID()}`,
        name,
        url
      };
    } else {
      step.tools.push(createWorkflowTool(name, url));
    }
    await saveWorkflows();
    closeToolEditor();
    rerender();
  }

  app.bindWorkflowEditor = function bindWorkflowEditor() {
    if (bound) return;
    bound = true;
    const section = document.getElementById('workflows');
    if (!section) return;

    section.addEventListener('change', async event => {
      const picker = event.target.closest('.workflow-tool-picker');
      if (!picker?.value) return;
      const stepIndex = Number(picker.closest('.workflow-step-editor')?.dataset.stepIndex);
      const step = stepAt(stepIndex);
      if (!step) return;
      const [categoryIndex, toolIndex] = picker.value.split(':').map(Number);
      const source = state.engines[categoryIndex]?.engines?.[toolIndex];
      if (!source?.name || !source?.url) return;
      const duplicate = (step.tools || []).some(item => {
        const tool = workflowTool(item);
        return tool?.name === source.name && tool?.url === source.url;
      });
      if (!duplicate) {
        step.tools.push(createWorkflowTool(source.name, source.url));
        await saveWorkflows();
      }
      rerender();
    });

    section.addEventListener('input', event => {
      const workflow = activeWorkflow();
      if (!workflow) return;
      const target = event.target;
      if (target.classList.contains('workflow-title-input')) {
        workflow.title = target.value;
        const active = section.querySelector('.workflow-select.active');
        if (active) active.textContent = target.value || SEOJumpI18n.t('untitledWorkflow');
      } else if (target.classList.contains('workflow-description-input')) {
        workflow.description = target.value;
      } else {
        const stepIndex = Number(target.closest('.workflow-step-editor')?.dataset.stepIndex);
        const step = stepAt(stepIndex);
        if (!step) return;
        if (target.classList.contains('workflow-step-title')) step.title = target.value;
        if (target.classList.contains('workflow-step-description')) step.description = target.value;
      }
      scheduleWorkflowSave();
    });

    section.addEventListener('click', async event => {
      const target = event.target;
      const select = target.closest('.workflow-select');
      if (select) {
        state.activeWorkflowIndex = Number(select.dataset.index);
        rerender();
        return;
      }
      if (target.closest('.workflow-add')) {
        state.workflows.push(newWorkflow());
        state.activeWorkflowIndex = state.workflows.length - 1;
        await saveWorkflows();
        rerender();
        return;
      }
      const workflow = activeWorkflow();
      if (!workflow) return;
      if (target.closest('.workflow-delete')) {
        state.workflows.splice(state.activeWorkflowIndex, 1);
        state.activeWorkflowIndex = Math.min(state.activeWorkflowIndex, Math.max(0, state.workflows.length - 1));
        await saveWorkflows();
        rerender();
        return;
      }
      if (target.closest('.workflow-add-step')) {
        const maxOrder = Math.max(0, ...(workflow.steps || []).map(step => Number(step.order) || 0));
        workflow.steps.push(newStep(maxOrder + 10));
        await saveWorkflows();
        rerender();
        return;
      }

      const stepElement = target.closest('.workflow-step-editor');
      const stepIndex = Number(stepElement?.dataset.stepIndex);
      const step = stepAt(stepIndex);
      if (!step) return;

      if (target.closest('.workflow-delete-step')) {
        workflow.steps.splice(stepIndex, 1);
        normalizeOrders(workflow);
        await saveWorkflows();
        rerender();
        return;
      }
      if (target.closest('.workflow-step-up') && stepIndex > 0) {
        [workflow.steps[stepIndex - 1], workflow.steps[stepIndex]] = [workflow.steps[stepIndex], workflow.steps[stepIndex - 1]];
        normalizeOrders(workflow);
        await saveWorkflows();
        rerender();
        return;
      }
      if (target.closest('.workflow-step-down') && stepIndex < workflow.steps.length - 1) {
        [workflow.steps[stepIndex + 1], workflow.steps[stepIndex]] = [workflow.steps[stepIndex], workflow.steps[stepIndex + 1]];
        normalizeOrders(workflow);
        await saveWorkflows();
        rerender();
        return;
      }
      if (target.closest('.workflow-remove-tool')) {
        const toolIndex = Number(target.closest('.workflow-tool-item')?.dataset.toolIndex);
        if (Number.isInteger(toolIndex)) step.tools.splice(toolIndex, 1);
        await saveWorkflows();
        rerender();
        return;
      }
      if (target.closest('.workflow-edit-tool')) {
        const toolIndex = Number(target.closest('.workflow-tool-item')?.dataset.toolIndex);
        if (Number.isInteger(toolIndex)) openToolEditor(stepIndex, toolIndex);
        return;
      }
      if (target.closest('.workflow-custom-tool')) {
        openToolEditor(stepIndex);
      }
    });

    document.getElementById('workflowToolCancelBtn').addEventListener('click', closeToolEditor);
    document.getElementById('workflowToolSaveBtn').addEventListener('click', () => saveToolEditor().catch(console.error));
    document.getElementById('workflowToolUrl').addEventListener('keydown', event => {
      if (event.key === 'Escape') closeToolEditor();
      if (event.key === 'Enter' && event.ctrlKey) saveToolEditor().catch(console.error);
    });
  };
})();
