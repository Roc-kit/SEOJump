(() => {
  const app = globalThis.SEOJumpOptions;

  async function reset() {
    if (!confirm(SEOJumpI18n.t('resetConfirm'))) return;
    try {
      await app.resetEngines();
      app.renderAll();
      app.showMessage(SEOJumpI18n.t('resetSuccess'), 'success');
    } catch (error) {
      console.error('[SEOJump] Reset failed:', error);
      app.showMessage(SEOJumpI18n.t('resetFailed'), 'error');
    }
  }

  function renderToolsAndFocus(selector) {
    app.renderSearchEngines();
    app.initSortable();
    requestAnimationFrame(() => document.querySelector(selector)?.focus());
  }

  function handleToolsClick(event) {
    const target = event.target;
    const categorySelect = target.closest('.category-select');
    if (categorySelect) {
      const index = Number(categorySelect.dataset.index);
      if (app.selectCategory(index)) {
        app.renderSearchEngines();
        app.initSortable();
      }
      return;
    }

    if (target.closest('.add-category')) {
      app.addCategory();
      renderToolsAndFocus('.category-name');
      return;
    }

    const editor = target.closest('.category-editor');
    const categoryIndex = Number(editor?.dataset.index);
    if (!Number.isInteger(categoryIndex)) return;

    if (target.closest('.delete-category')) {
      if (app.deleteCategory(categoryIndex)) {
        app.renderSearchEngines();
        app.initSortable();
      }
      return;
    }

    if (target.closest('.add-engine')) {
      app.addEngine(categoryIndex);
      renderToolsAndFocus('.engine-item:last-of-type .engine-name');
      return;
    }

    const engineItem = target.closest('.engine-item');
    const engineIndex = Number(engineItem?.dataset.index);
    if (!Number.isInteger(engineIndex)) return;

    if (target.closest('.delete-engine')) {
      app.deleteEngine(categoryIndex, engineIndex);
      app.renderSearchEngines();
      app.initSortable();
      return;
    }

    if (target.closest('.edit-engine-url')) {
      const input = engineItem.querySelector('.engine-url');
      const name = engineItem.querySelector('.engine-name')?.value || '';
      if (input) app.showUrlEditModal(input, name);
    }
  }

  function handleToolsInput(event) {
    const target = event.target;
    const editor = target.closest('.category-editor');
    const categoryIndex = Number(editor?.dataset.index);
    if (!Number.isInteger(categoryIndex)) return;

    if (target.classList.contains('category-name')) {
      app.updateCategory(categoryIndex, { name: target.value });
      const categoryButton = document.querySelector(`.category-select[data-index="${categoryIndex}"]`);
      if (categoryButton) {
        categoryButton.textContent = target.value || SEOJumpI18n.t('categoryName');
        categoryButton.title = target.value;
      }
      return;
    }

    const engineItem = target.closest('.engine-item');
    const engineIndex = Number(engineItem?.dataset.index);
    if (!Number.isInteger(engineIndex)) return;
    if (target.classList.contains('engine-name')) {
      app.updateEngine(categoryIndex, engineIndex, { name: target.value });
    } else if (target.classList.contains('engine-url')) {
      app.updateEngine(categoryIndex, engineIndex, { url: target.value });
    }
  }

  function handleToolsChange(event) {
    const target = event.target;
    const editor = target.closest('.category-editor');
    const categoryIndex = Number(editor?.dataset.index);
    if (!Number.isInteger(categoryIndex)) return;

    if (target.classList.contains('category-toggle')) {
      app.updateCategory(categoryIndex, { disable: !target.checked }, { immediate: true });
      return;
    }

    const engineItem = target.closest('.engine-item');
    const engineIndex = Number(engineItem?.dataset.index);
    if (!Number.isInteger(engineIndex)) return;
    if (target.classList.contains('engine-toggle')) {
      app.updateEngine(categoryIndex, engineIndex, { disable: !target.checked }, { immediate: true });
    }
  }

  function flushTextEditOnBlur(event) {
    if (!event.target.matches('.category-name, .engine-name, .engine-url')) return;
    if (app.state.hasUnsavedChanges) app.saveEngines().catch(() => {});
  }

  async function bindPreferenceControls() {
    const settings = await SEOJumpSettings.getSettings();
    const language = document.getElementById('languageSelect');
    const trigger = document.getElementById('selectionTriggerSelect');
    language.value = settings.uiLanguage;
    trigger.value = settings.selectionTriggerMode;

    language.addEventListener('change', async () => {
      await SEOJumpI18n.setLanguage(language.value);
      document.title = SEOJumpI18n.t('optionsTitle');
      app.renderAll();
    });
    trigger.addEventListener('change', () => {
      SEOJumpSettings.updateSettings({ selectionTriggerMode: trigger.value });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await Promise.all([app.loadEngines(), app.loadWorkflows(), SEOJumpI18n.initialize()]);
      await app.migrateLegacyWorkflowTools();
      document.title = SEOJumpI18n.t('optionsTitle');
      await bindPreferenceControls();
      app.renderAll();
      app.bindWorkflowEditor();

      document.getElementById('exportBtn').addEventListener('click', app.showExportDialog);
      document.getElementById('importBtn').addEventListener('click', app.showImportDialog);
      document.getElementById('resetBtn').addEventListener('click', reset);
      document.getElementById('importFromJson').addEventListener('change', app.importJson);
      document.getElementById('importFromCSV').addEventListener('change', app.importCsv);

      const tools = document.getElementById('search-engines');
      tools.addEventListener('click', handleToolsClick);
      tools.addEventListener('input', handleToolsInput);
      tools.addEventListener('change', handleToolsChange);
      tools.addEventListener('focusout', flushTextEditOnBlur);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && app.state.hasUnsavedChanges) {
          app.saveEngines().catch(() => {});
        }
      });
    } catch (error) {
      console.error('[SEOJump] Options initialization failed:', error);
    }
  });
})();
