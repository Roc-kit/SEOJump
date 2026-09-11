(() => {
  const app = globalThis.SEOJumpOptions;

  async function save() {
    try {
      await app.saveEngines();
      app.showMessage(SEOJumpI18n.t('saveSuccess'), 'success');
    } catch (error) {
      console.error('[SEOJump] Save failed:', error);
      app.showMessage(SEOJumpI18n.t('saveFailed'), 'error');
    }
  }

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

  function handleSearchToolEvent(event) {
    const target = event.target;
    const section = target.closest('.category-section');
    const categoryIndex = Number(section?.dataset.index);

    if (target.classList.contains('add-category')) {
      app.addCategory();
      app.renderAll();
      return;
    }
    if (!Number.isInteger(categoryIndex)) return;

    if (target.classList.contains('category-name')) {
      app.updateCategory(categoryIndex, { name: target.value });
      app.renderCategoryMenu();
      return;
    }
    if (target.classList.contains('category-toggle')) {
      app.updateCategory(categoryIndex, { disable: !target.checked });
      return;
    }
    if (target.closest('.delete-category')) {
      if (app.deleteCategory(categoryIndex)) app.renderAll();
      return;
    }
    if (target.classList.contains('add-engine')) {
      app.addEngine(categoryIndex);
      app.renderAll();
      return;
    }

    const engineItem = target.closest('.engine-item');
    const engineIndex = Number(engineItem?.dataset.index);
    if (!Number.isInteger(engineIndex)) return;
    if (target.classList.contains('engine-name')) {
      app.updateEngine(categoryIndex, engineIndex, { name: target.value });
    } else if (target.classList.contains('engine-url')) {
      app.updateEngine(categoryIndex, engineIndex, { url: target.value });
    } else if (target.classList.contains('engine-toggle')) {
      app.updateEngine(categoryIndex, engineIndex, { disable: !target.checked });
    } else if (target.closest('.delete-engine')) {
      app.deleteEngine(categoryIndex, engineIndex);
      app.renderAll();
    }
  }

  async function bindPreferenceControls() {
    const settings = await SEOJumpSettings.getSettings();
    const language = document.getElementById('languageSelect');
    const trigger = document.getElementById('selectionTriggerSelect');
    language.value = settings.uiLanguage;
    trigger.value = settings.selectionTriggerMode;

    language.addEventListener('change', async () => {
      await SEOJumpI18n.setLanguage(language.value);
      app.renderCategoryMenu();
      document.title = SEOJumpI18n.t('optionsTitle');
    });
    trigger.addEventListener('change', () => {
      SEOJumpSettings.updateSettings({ selectionTriggerMode: trigger.value });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await Promise.all([app.loadEngines(), SEOJumpI18n.initialize()]);
      document.title = SEOJumpI18n.t('optionsTitle');
      await bindPreferenceControls();
      app.renderAll();

      document.getElementById('saveBtn').addEventListener('click', save);
      document.getElementById('exportBtn').addEventListener('click', app.showExportDialog);
      document.getElementById('importBtn').addEventListener('click', app.showImportDialog);
      document.getElementById('resetBtn').addEventListener('click', reset);
      document.getElementById('importFromJson').addEventListener('change', app.importJson);
      document.getElementById('importFromCSV').addEventListener('change', app.importCsv);

      const tools = document.getElementById('search-engines');
      tools.addEventListener('click', handleSearchToolEvent);
      tools.addEventListener('input', handleSearchToolEvent);
      tools.addEventListener('change', handleSearchToolEvent);
      tools.addEventListener('dblclick', event => {
        if (!event.target.classList.contains('engine-url')) return;
        const name = event.target.previousElementSibling?.value || '';
        app.showUrlEditModal(event.target, name);
      });
    } catch (error) {
      console.error('[SEOJump] Options initialization failed:', error);
    }
  });
})();
