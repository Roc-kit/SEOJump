(() => {
  const app = globalThis.SEOJumpOptions;
  const state = app.state;

  const deleteIcon = `<img src="${chrome.runtime.getURL('image/delete.svg')}" class="delete-icon" alt="Delete">`;
  const dragIcon = `<img src="${chrome.runtime.getURL('image/drag.svg')}" class="drag-icon" alt="">`;
  let currentEditingUrlInput = null;

  app.showMessage = function showMessage(message, type = 'info') {
    const element = document.createElement('div');
    element.className = `message ${type}`;
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 3000);
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  app.setSaveStatus = function setSaveStatus(status) {
    const element = document.getElementById('saveStatus');
    if (!element) return;
    element.dataset.state = status;
    const text = element.querySelector('.save-status-text');
    if (text) {
      text.textContent = SEOJumpI18n.t(status === 'error' ? 'saveError' : status);
    }
  };

  app.renderCategoryMenu = function renderCategoryMenu() {
    const menu = document.querySelector('.nav-menu');
    if (!menu) return;
    menu.innerHTML = '';

    ['general-settings', 'placeholders', 'search-engines'].forEach(id => {
      const section = document.getElementById(id);
      const heading = section?.querySelector('h2');
      if (!section || !heading) return;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = heading.textContent.trim();
      item.appendChild(link);
      menu.appendChild(item);
    });
  };

  app.renderSearchEngines = function renderSearchEngines() {
    const container = document.getElementById('categories-container');
    if (!container) return;
    if (!state.engines.length) {
      container.innerHTML = '';
      return;
    }

    state.activeCategoryIndex = Math.min(state.activeCategoryIndex, state.engines.length - 1);
    const category = state.engines[state.activeCategoryIndex];
    const engines = Array.isArray(category.engines) ? category.engines : [];

    const categoryItems = state.engines.map((item, index) => `
      <div class="category-list-item ${index === state.activeCategoryIndex ? 'active' : ''}" data-index="${index}">
        <span class="drag-handle" title="Drag">${dragIcon}</span>
        <button type="button" class="category-select" data-index="${index}" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>
        <span class="category-tool-count">${Array.isArray(item.engines) ? item.engines.length : 0}</span>
      </div>
    `).join('');

    const engineItems = engines.map((engine, engineIndex) => `
      <div class="engine-item" data-index="${engineIndex}">
        <span class="drag-handle" title="Drag">${dragIcon}</span>
        <input type="text" class="engine-name" value="${escapeHtml(engine.name)}"
          data-i18n-placeholder="toolName">
        <input type="text" class="engine-url" value="${escapeHtml(engine.url)}"
          data-i18n-placeholder="toolUrlPlaceholder">
        <button type="button" class="edit-engine-url" title="${SEOJumpI18n.t('editUrl')}" aria-label="${SEOJumpI18n.t('editUrl')}">✎</button>
        <label class="switch" title="${engine.disable ? 'Disabled' : 'Enabled'}">
          <input type="checkbox" class="engine-toggle" ${engine.disable ? '' : 'checked'}>
          <span class="slider"></span>
        </label>
        <button type="button" class="delete-engine">${deleteIcon}</button>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="tools-manager">
        <aside class="category-panel">
          <div class="tools-panel-title">
            <span>${SEOJumpI18n.t('categories')}</span>
            <span class="tools-panel-count">${state.engines.length}</span>
          </div>
          <div class="category-list">${categoryItems}</div>
          <button type="button" class="add-category">+ ${SEOJumpI18n.t('addCategory')}</button>
        </aside>

        <div class="category-editor" data-index="${state.activeCategoryIndex}">
          <div class="category-header">
            <input type="text" class="category-name" value="${escapeHtml(category.name)}" data-i18n-placeholder="categoryName">
            <span class="category-meta">${engines.length} ${SEOJumpI18n.t('tools')}</span>
            <label class="switch category-switch">
              <input type="checkbox" class="category-toggle" ${category.disable ? '' : 'checked'}>
              <span class="slider"></span>
            </label>
            <button type="button" class="delete-category" ${state.engines.length <= 1 ? 'disabled' : ''}>${deleteIcon}</button>
          </div>
          <div class="engines-list">${engineItems}</div>
          <button type="button" class="add-engine">+ ${SEOJumpI18n.t('addTool')}</button>
        </div>
      </div>
    `;
    SEOJumpI18n.apply(container);
  };

  app.initSortable = function initSortable() {
    const categories = document.querySelector('.category-list');
    if (categories) {
      categories._sortable = new Sortable(categories, {
        animation: 150,
        handle: '.drag-handle',
        draggable: '.category-list-item',
        onEnd(event) {
          const oldIndex = event.oldDraggableIndex ?? event.oldIndex;
          const newIndex = event.newDraggableIndex ?? event.newIndex;
          if (oldIndex === newIndex) return;
          app.reorderCategory(oldIndex, newIndex);
          app.renderSearchEngines();
          app.initSortable();
        }
      });
    }

    const list = document.querySelector('.engines-list');
    if (!list) return;
    list._sortable = new Sortable(list, {
      animation: 150,
      handle: '.drag-handle',
      draggable: '.engine-item',
      onEnd(event) {
        const editor = event.target.closest('.category-editor');
        const categoryIndex = Number(editor?.dataset.index);
        const oldIndex = event.oldDraggableIndex ?? event.oldIndex;
        const newIndex = event.newDraggableIndex ?? event.newIndex;
        if (!Number.isInteger(categoryIndex) || oldIndex === newIndex) return;
        app.reorderEngine(categoryIndex, oldIndex, newIndex);
        list.querySelectorAll('.engine-item').forEach((item, index) => {
          item.dataset.index = index;
        });
      }
    });
  };

  app.renderAll = function renderAll() {
    app.renderSearchEngines();
    app.renderCategoryMenu();
    app.initSortable();
    SEOJumpI18n.apply();
    app.setSaveStatus(state.saveStatus);
  };

  app.showUrlEditModal = function showUrlEditModal(input, engineName) {
    const modal = document.getElementById('urlEditModal');
    const modalInput = modal.querySelector('.modal-url-input');
    currentEditingUrlInput = input;
    modal.querySelector('.modal-title').textContent = SEOJumpI18n.t('editToolUrl', { name: engineName });
    modalInput.value = input.value;
    modal.style.display = 'block';
    modalInput.focus();
    modalInput.select();

    const close = () => {
      modal.style.display = 'none';
      currentEditingUrlInput = null;
    };
    const save = () => {
      if (currentEditingUrlInput && modalInput.value.trim()) {
        currentEditingUrlInput.value = modalInput.value.trim();
        currentEditingUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      close();
    };

    document.getElementById('modalSaveBtn').onclick = save;
    document.getElementById('modalCancelBtn').onclick = close;
    modalInput.onkeydown = event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Enter' && event.ctrlKey) save();
    };
  };
})();
