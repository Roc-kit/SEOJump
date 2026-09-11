(() => {
  const app = globalThis.SEOJumpOptions = globalThis.SEOJumpOptions || {};
  const state = app.state = {
    engines: [],
    hasUnsavedChanges: false
  };

  app.markUnsaved = function markUnsaved() {
    state.hasUnsavedChanges = true;
  };

  app.setEngines = function setEngines(engines, { unsaved = true } = {}) {
    state.engines = Array.isArray(engines) ? engines : [];
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
  };

  app.saveEngines = async function saveEngines() {
    await chrome.storage.local.set({ searchEngines: state.engines });
    state.hasUnsavedChanges = false;
  };

  app.resetEngines = async function resetEngines() {
    const response = await fetch('config/default-engines.json');
    state.engines = await response.json();
    app.markUnsaved();
  };

  app.addCategory = function addCategory() {
    state.engines.push({
      name: 'New Category',
      engines: [{ name: 'New Engine', url: '' }]
    });
    app.markUnsaved();
  };

  app.deleteCategory = function deleteCategory(index) {
    if (state.engines.length <= 1) return false;
    state.engines.splice(index, 1);
    app.markUnsaved();
    return true;
  };

  app.reorderCategory = function reorderCategory(oldIndex, newIndex) {
    if (oldIndex === newIndex) return;
    const [item] = state.engines.splice(oldIndex, 1);
    if (!item) return;
    state.engines.splice(newIndex, 0, item);
    app.markUnsaved();
  };

  app.addEngine = function addEngine(categoryIndex) {
    state.engines[categoryIndex]?.engines?.push({ name: 'New Engine', url: '' });
    app.markUnsaved();
  };

  app.deleteEngine = function deleteEngine(categoryIndex, engineIndex) {
    state.engines[categoryIndex]?.engines?.splice(engineIndex, 1);
    app.markUnsaved();
  };

  app.reorderEngine = function reorderEngine(categoryIndex, oldIndex, newIndex) {
    const engines = state.engines[categoryIndex]?.engines;
    if (!engines || oldIndex === newIndex) return;
    const [item] = engines.splice(oldIndex, 1);
    if (!item) return;
    engines.splice(newIndex, 0, item);
    app.markUnsaved();
  };

  app.updateCategory = function updateCategory(index, patch) {
    if (!state.engines[index]) return;
    Object.assign(state.engines[index], patch);
    app.markUnsaved();
  };

  app.updateEngine = function updateEngine(categoryIndex, engineIndex, patch) {
    const engine = state.engines[categoryIndex]?.engines?.[engineIndex];
    if (!engine) return;
    Object.assign(engine, patch);
    app.markUnsaved();
  };
})();
