(() => {
  const app = globalThis.SEOJumpOptions = globalThis.SEOJumpOptions || {};
  const state = app.state = {
    engines: [],
    activeCategoryIndex: 0,
    hasUnsavedChanges: false,
    saveStatus: 'saved',
    changeVersion: 0
  };

  let saveTimer = null;
  let saveQueue = Promise.resolve();

  function cloneEngines() {
    return JSON.parse(JSON.stringify(state.engines));
  }

  function setSaveStatus(status) {
    state.saveStatus = status;
    app.setSaveStatus?.(status);
  }

  app.markUnsaved = function markUnsaved() {
    state.hasUnsavedChanges = true;
    state.changeVersion += 1;
  };

  app.selectCategory = function selectCategory(index) {
    if (!Number.isInteger(index) || !state.engines[index]) return false;
    state.activeCategoryIndex = index;
    return true;
  };

  app.setEngines = function setEngines(engines, { unsaved = true } = {}) {
    state.engines = Array.isArray(engines) ? engines : [];
    state.activeCategoryIndex = Math.min(state.activeCategoryIndex, Math.max(0, state.engines.length - 1));
    if (unsaved) app.markUnsaved();
  };

  app.loadEngines = async function loadEngines() {
    const data = await chrome.storage.local.get('searchEngines');
    if (Array.isArray(data.searchEngines)) {
      state.engines = data.searchEngines;
      return;
    }
    const response = await fetch('config/default-engines.json');
    state.engines = await response.json();
    await chrome.storage.local.set({ searchEngines: state.engines });
    state.hasUnsavedChanges = false;
    state.changeVersion = 0;
  };

  app.saveEngines = function saveEngines() {
    clearTimeout(saveTimer);
    saveTimer = null;
    const targetVersion = state.changeVersion;
    const snapshot = cloneEngines();
    setSaveStatus('saving');

    const task = saveQueue.then(async () => {
      await chrome.storage.local.set({ searchEngines: snapshot });
      if (state.changeVersion === targetVersion) {
        state.hasUnsavedChanges = false;
        setSaveStatus('saved');
      }
    });

    saveQueue = task.catch(error => {
      console.error('[SEOJump] Auto-save failed:', error);
      setSaveStatus('error');
    });
    return task;
  };

  app.scheduleSave = function scheduleSave({ immediate = false, delay = 700 } = {}) {
    clearTimeout(saveTimer);
    if (immediate) return app.saveEngines();
    setSaveStatus('saving');
    saveTimer = setTimeout(() => {
      app.saveEngines().catch(() => {});
    }, delay);
    return Promise.resolve();
  };

  app.resetEngines = async function resetEngines() {
    const response = await fetch('config/default-engines.json');
    state.engines = await response.json();
    state.activeCategoryIndex = 0;
    app.markUnsaved();
    await app.saveEngines();
  };

  app.addCategory = function addCategory() {
    state.engines.push({
      name: 'New Category',
      disable: true,
      engines: [{ name: 'New Engine', url: '', disable: true }]
    });
    state.activeCategoryIndex = state.engines.length - 1;
    app.markUnsaved();
    app.scheduleSave({ immediate: true });
  };

  app.deleteCategory = function deleteCategory(index) {
    if (state.engines.length <= 1) return false;
    state.engines.splice(index, 1);
    state.activeCategoryIndex = Math.min(state.activeCategoryIndex, state.engines.length - 1);
    app.markUnsaved();
    app.scheduleSave({ immediate: true });
    return true;
  };

  app.reorderCategory = function reorderCategory(oldIndex, newIndex) {
    if (oldIndex === newIndex) return;
    const activeCategory = state.engines[state.activeCategoryIndex];
    const [item] = state.engines.splice(oldIndex, 1);
    if (!item) return;
    state.engines.splice(newIndex, 0, item);
    state.activeCategoryIndex = Math.max(0, state.engines.indexOf(activeCategory));
    app.markUnsaved();
    app.scheduleSave({ immediate: true });
  };

  app.addEngine = function addEngine(categoryIndex) {
    const category = state.engines[categoryIndex];
    if (!category) return;
    category.engines = Array.isArray(category.engines) ? category.engines : [];
    category.engines.push({ name: 'New Engine', url: '', disable: true });
    app.markUnsaved();
    app.scheduleSave({ immediate: true });
  };

  app.deleteEngine = function deleteEngine(categoryIndex, engineIndex) {
    state.engines[categoryIndex]?.engines?.splice(engineIndex, 1);
    app.markUnsaved();
    app.scheduleSave({ immediate: true });
  };

  app.reorderEngine = function reorderEngine(categoryIndex, oldIndex, newIndex) {
    const engines = state.engines[categoryIndex]?.engines;
    if (!engines || oldIndex === newIndex) return;
    const [item] = engines.splice(oldIndex, 1);
    if (!item) return;
    engines.splice(newIndex, 0, item);
    app.markUnsaved();
    app.scheduleSave({ immediate: true });
  };

  app.updateCategory = function updateCategory(index, patch, { immediate = false } = {}) {
    if (!state.engines[index]) return;
    Object.assign(state.engines[index], patch);
    app.markUnsaved();
    app.scheduleSave({ immediate });
  };

  app.updateEngine = function updateEngine(categoryIndex, engineIndex, patch, { immediate = false } = {}) {
    const engine = state.engines[categoryIndex]?.engines?.[engineIndex];
    if (!engine) return;
    Object.assign(engine, patch);
    app.markUnsaved();
    app.scheduleSave({ immediate });
  };
})();
