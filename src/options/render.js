(() => {
  const app = globalThis.SEOJumpOptions;
  const state = app.state;

  const deleteIcon = `<img src="${chrome.runtime.getURL('image/delete.svg')}" class="delete-icon" alt="Delete">`;
  const dragIcon = `<img src="${chrome.runtime.getURL('image/drag.svg')}" class="drag-handle" alt="Drag">`;
  let currentEditingUrlInput = null;

  app.showMessage = function showMessage(message, type = 'info') {
    const element = document.createElement('div');
    element.className = `message ${type}`;
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 3000);
  };

  function escapeAttribute(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

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

    const categories = document.createElement('div');
    categories.className = 'category-menu-list';
    state.engines.forEach((category, index) => {
      const item = document.createElement('li');
      item.className = 'submenu-item';
      item.dataset.index = index;
      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.innerHTML = dragIcon;
      const link = document.createElement('a');
      link.href = `#category-${index}`;
      link.textContent = category.name;
      item.append(handle, link);
      categories.appendChild(item);
    });
    menu.appendChild(categories);

    categories._sortable = new Sortable(categories, {
      animation: 150,
      handle: '.drag-handle',
      draggable: '.submenu-item',
      onEnd(event) {
        const oldIndex = event.oldDraggableIndex ?? event.oldIndex;
        const newIndex = event.newDraggableIndex ?? event.newIndex;
        if (oldIndex === newIndex) return;
        app.reorderCategory(oldIndex, newIndex);
        app.renderAll();
      }
    });
  };

  app.renderSearchEngines = function renderSearchEngines() {
    const container = document.getElementById('categories-container');
    if (!container) return;
    container.innerHTML = '';

    state.engines.forEach((category, categoryIndex) => {
      const section = document.createElement('div');
      section.className = 'category-section';
      section.id = `category-${categoryIndex}`;
      section.dataset.index = categoryIndex;
      section.innerHTML = `
        <div class="category-header">
          <input type="text" class="category-name" value="${escapeAttribute(category.name)}"
            data-original="${escapeAttribute(category.name)}" data-i18n-placeholder="categoryName">
          <label class="switch category-switch">
            <input type="checkbox" class="category-toggle" ${category.disable ? '' : 'checked'}>
            <span class="slider"></span>
          </label>
          <button class="delete-category" ${state.engines.length <= 1 ? 'disabled' : ''}>${deleteIcon}</button>
        </div>
        <div class="engines-list">
          ${(category.engines || []).map((engine, engineIndex) => `
            <div class="engine-item" data-index="${engineIndex}">
              <span class="drag-handle">${dragIcon}</span>
              <input type="text" class="engine-name" value="${escapeAttribute(engine.name)}"
                data-original="${escapeAttribute(engine.name)}" data-i18n-placeholder="toolName">
              <input type="text" class="engine-url" value="${escapeAttribute(engine.url)}"
                data-i18n-placeholder="toolUrlPlaceholder">
              <label class="switch">
                <input type="checkbox" class="engine-toggle" ${engine.disable ? '' : 'checked'}>
                <span class="slider"></span>
              </label>
              <button class="delete-engine">${deleteIcon}</button>
            </div>
          `).join('')}
          <button class="add-engine" title="Add">+</button>
        </div>
      `;
      container.appendChild(section);
    });

    const addCategory = document.createElement('button');
    addCategory.className = 'add-category';
    addCategory.dataset.i18n = 'addCategory';
    addCategory.textContent = SEOJumpI18n.t('addCategory');
    container.appendChild(addCategory);
    SEOJumpI18n.apply(container);
  };

  app.initSortable = function initSortable() {
    document.querySelectorAll('.engines-list').forEach(list => {
      list._sortable = new Sortable(list, {
        animation: 150,
        handle: '.drag-handle',
        filter: '.add-engine',
        draggable: '.engine-item',
        onEnd(event) {
          const section = event.target.closest('.category-section');
          const categoryIndex = Number(section?.dataset.index);
          const oldIndex = event.oldDraggableIndex ?? event.oldIndex;
          const newIndex = event.newDraggableIndex ?? event.newIndex;
          if (!Number.isInteger(categoryIndex) || oldIndex === newIndex) return;
          app.reorderEngine(categoryIndex, oldIndex, newIndex);
          list.querySelectorAll('.engine-item').forEach((item, index) => {
            item.dataset.index = index;
          });
        }
      });
    });
  };

  app.renderAll = function renderAll() {
    app.renderSearchEngines();
    app.renderCategoryMenu();
    app.initSortable();
    SEOJumpI18n.apply();
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
