let engines = [];
let hasUnsavedChanges = false;

const deleteIconUrl = chrome.runtime.getURL('image/delete.svg');
const dragIconUrl = chrome.runtime.getURL('image/drag.svg');
const deleteIcon = `<img src="${deleteIconUrl}" class="delete-icon" alt="Delete">`;
const dragIcon = `<img src="${dragIconUrl}" class="drag-handle" alt="Drag">`;

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function escapeCSVField(field) {
    if (field == null) field = '';
    field = String(field);
    return `"${field.replace(/"/g, '""')}"`;
}

function parseCSVField(field) {
    field = field.trim();
    if (field.startsWith('"') && field.endsWith('"')) {
        return field.slice(1, -1).replace(/""/g, '"');
    }
    return field;
}

function exportToCSV() {
    const headers = ['CategoryName', 'CategoryEnabled', 'EngineName', 'EngineURL', 'EngineEnabled', 'EngineFavicon'];
    const rows = [headers.map(escapeCSVField)];

    engines.forEach(category => {
        const categoryEnabled = category.disable === true ? 'false' : 'true';

        category.engines.forEach(engine => {
            const engineEnabled = engine.disable === true ? 'false' : 'true';
            const row = [
                category.name || '',
                categoryEnabled,
                engine.name || '',
                engine.url || '',
                engineEnabled,
                engine.favicon || ''
            ].map(escapeCSVField);
            rows.push(row);
        });
    });

    const content = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'easy-switch-search-settings.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function importFromCSV(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        const rows = text.split('\n').filter(row => row.trim());

        const headers = rows[0].split(',').map(parseCSVField);
        const requiredColumns = {
            categoryName: headers.findIndex(h => h === 'CategoryName'),
            engineName: headers.findIndex(h => h === 'EngineName'),
            engineUrl: headers.findIndex(h => h === 'EngineURL')
        };

        const missingColumns = Object.entries(requiredColumns)
            .filter(([_, index]) => index === -1)
            .map(([key]) => key === 'categoryName' ? 'CategoryName' :
                          key === 'engineName' ? 'EngineName' : 'EngineURL');

        if (missingColumns.length > 0) {
            throw new Error(`Required columns missing: ${missingColumns.join(', ')}`);
        }

        const optionalColumns = {
            categoryEnabled: headers.findIndex(h => h === 'CategoryEnabled'),
            engineEnabled: headers.findIndex(h => h === 'EngineEnabled'),
            engineFavicon: headers.findIndex(h => h === 'EngineFavicon')
        };

        const newEngines = [];
        let currentCategory = null;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)
                .map(field => parseCSVField(field));

            const categoryName = row[requiredColumns.categoryName];
            const engineName = row[requiredColumns.engineName];
            const engineUrl = row[requiredColumns.engineUrl];

            if (!categoryName && !engineName && !engineUrl) continue;

            const categoryEnabled = optionalColumns.categoryEnabled !== -1 ?
                row[optionalColumns.categoryEnabled] : 'true';
            const engineEnabled = optionalColumns.engineEnabled !== -1 ?
                row[optionalColumns.engineEnabled] : 'true';
            const engineFavicon = optionalColumns.engineFavicon !== -1 ?
                row[optionalColumns.engineFavicon] : '';

            if (!currentCategory || currentCategory.name !== categoryName) {
                currentCategory = {
                    name: categoryName
                };
                if (categoryEnabled.toLowerCase() === 'false') {
                    currentCategory.disable = true;
                }
                currentCategory.engines = [];
                newEngines.push(currentCategory);
            }

            const engine = {
                name: engineName,
                url: engineUrl
            };

            if (engineEnabled.toLowerCase() === 'false') {
                engine.disable = true;
            }
            if (engineFavicon && engineFavicon.trim()) {
                engine.favicon = engineFavicon.trim();
            }

            currentCategory.engines.push(engine);
        }

        if (newEngines.length > 0) {
            const cleanedEngines = cleanupData(newEngines);

            engines = cleanedEngines;
            markAsUnsaved();
            renderAll();
            showMessage('Import successful!', 'success');
        } else {
            throw new Error('No valid data found');
        }
    } catch (error) {
        console.error('Failed to import settings:', error);
        showMessage('Import failed: Invalid file format', 'error');
    }
}

async function saveSettings() {
    try {
        await chrome.storage.local.set({
            searchEngines: engines
        });
        hasUnsavedChanges = false;
        showMessage('Settings saved successfully!', 'success');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showMessage('Failed to save settings', 'error');
    }
}

async function loadSettings() {
    try {
        const data = await chrome.storage.local.get(['searchEngines']);

        if (data.searchEngines && Array.isArray(data.searchEngines)) {
            engines = data.searchEngines;
        } else {
            const response = await fetch('config/default-engines.json');
            engines = await response.json();
            await saveSettings();
        }

        return engines[0]?.name || '';
    } catch (error) {
        console.error('Failed to load settings:', error);
        showMessage('Failed to load settings', 'error');
        return engines[0]?.name || '';
    }
}

function updateCategoryMenu() {
    const menu = document.querySelector('.nav-menu');
    if (!menu) return;

    menu.innerHTML = '';

    const sections = ['placeholders', 'search-engines'];
    sections.forEach((id, index) => {
        const section = document.getElementById(id);
        if (section) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            const h2 = section.querySelector('h2');
            if (h2) {
                a.href = `#${id}`;
                a.innerHTML = h2.innerHTML;
                li.appendChild(a);
                menu.appendChild(li);
            }
        }
    });

    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'category-menu-list';
    menu.appendChild(categoriesContainer);

    engines.forEach((category, index) => {
        const li = document.createElement('li');
        li.className = 'submenu-item';
        li.dataset.index = index;
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = dragIcon;
        const a = document.createElement('a');
        a.href = `#category-${index}`;
        a.textContent = category.name;
        li.appendChild(dragHandle);
        li.appendChild(a);
        categoriesContainer.appendChild(li);
    });

    if (categoriesContainer._sortable) {
        categoriesContainer._sortable.destroy();
    }
    categoriesContainer._sortable = new Sortable(categoriesContainer, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: function(evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;
            if (oldIndex !== newIndex) {
                const item = engines.splice(oldIndex, 1)[0];
                engines.splice(newIndex, 0, item);
                markAsUnsaved();
                renderAll();
            }
        }
    });
}

function renderSearchEngines() {
    const container = document.getElementById('categories-container');
    if (!container) return;

    container.innerHTML = '';
    engines.forEach((category, categoryIndex) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-section';
        categoryDiv.id = `category-${categoryIndex}`;
        categoryDiv.dataset.index = categoryIndex;

        categoryDiv.innerHTML = `
            <div class="category-header">
                <input type="text" class="category-name" value="${category.name}"
                    data-default="${category.name === 'New Category' ? 'true' : 'false'}"
                    data-original="${category.name}"
                    placeholder="Category Name">
                <label class="switch category-switch">
                    <input type="checkbox" class="category-toggle" ${!category.disable ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <button class="delete-category" ${engines.length <= 1 ? 'disabled' : ''}>${deleteIcon}</button>
            </div>
            <div class="engines-list">
                ${category.engines.map((engine, engineIndex) => `
                    <div class="engine-item" data-index="${engineIndex}">
                        <span class="drag-handle">${dragIcon}</span>
                        <input type="text" class="engine-name" value="${engine.name}"
                            data-default="${engine.name === 'New Engine' ? 'true' : 'false'}"
                            data-original="${engine.name}"
                            placeholder="Engine Name">
                        <input type="text" class="engine-url" value="${engine.url}" placeholder="Search URL with %selectedText%">
                        <label class="switch">
                            <input type="checkbox" class="engine-toggle" ${!engine.disable ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <button class="delete-engine">${deleteIcon}</button>
                    </div>
                `).join('')}
                <button class="add-engine">+</button>
            </div>
        `;

        const inputs = categoryDiv.querySelectorAll('input[type="text"]');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                if (this.dataset.default === 'true' && this.value === this.dataset.original) {
                    this.value = '';
                }
            });

            input.addEventListener('blur', function() {
                if (this.value.trim() === '') {
                    if (this.classList.contains('category-name')) {
                        this.value = this.dataset.original || 'New Category';
                    } else if (this.classList.contains('engine-name')) {
                        this.value = this.dataset.original || 'New Engine';
                    } else if (this.classList.contains('engine-url')) {
                        this.value = this.dataset.original || '';
                    }
                }
            });

            if (input.classList.contains('engine-url')) {
                input.addEventListener('dblclick', function(e) {
                    e.preventDefault();
                    currentEditingUrlInput = this;
                    showUrlEditModal(this.value);
                });
            }
        });

        container.appendChild(categoryDiv);
    });

    const addCategoryBtn = document.createElement('button');
    addCategoryBtn.className = 'add-category';
    addCategoryBtn.textContent = 'Add Category';
    addCategoryBtn.addEventListener('click', handleAddCategory);
    container.appendChild(addCategoryBtn);
}

function updateNavMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    navMenu.innerHTML = '';

    const toolbars = document.querySelectorAll('.toolbar');
    toolbars.forEach(toolbar => {
        const id = toolbar.id;
        const title = toolbar.querySelector('h2')?.textContent || id;

        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = title;
        li.appendChild(a);

        if (id === 'search-engines') {
            const ul = document.createElement('ul');
            ul.className = 'category-menu';
            li.appendChild(ul);
        }

        navMenu.appendChild(li);
    });
}

async function renderAll() {
    updateNavMenu();
    renderSearchEngines();
    await updateCategoryMenu();
    initSortable();
}

function markAsUnsaved() {
    hasUnsavedChanges = true;
}

function handleCategoryOrderEvents(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const item = button.closest('.category-order-item');
    if (!item) return;

    const index = parseInt(item.dataset.index);
    if (button.classList.contains('move-up') && index > 0) {
        [engines[index - 1], engines[index]] = [engines[index], engines[index - 1]];
        markAsUnsaved();
        renderAll();
    } else if (button.classList.contains('move-down') && index < engines.length - 1) {
        [engines[index], engines[index + 1]] = [engines[index + 1], engines[index]];
        markAsUnsaved();
        renderAll();
    }
}

function handleSearchEngineEvents(e) {
    const target = e.target;

    if (target.classList.contains('category-name')) {
        const categorySection = target.closest('.category-section');
        if (!categorySection) return;

        const index = parseInt(categorySection.dataset.index);
        engines[index].name = target.value;
        markAsUnsaved();
        updateCategoryMenu();
        return;
    }

    if (target.classList.contains('category-toggle')) {
        const categorySection = target.closest('.category-section');
        if (!categorySection) return;

        const index = parseInt(categorySection.dataset.index);
        engines[index].disable = !target.checked;
        markAsUnsaved();
        return;
    }

    if (target.classList.contains('delete-category') || target.closest('.delete-category')) {
        const categorySection = (target.closest('.category-section') || target.closest('.delete-category')?.closest('.category-section'));
        if (!categorySection || engines.length <= 1) return;

        const index = parseInt(categorySection.dataset.index);
        engines.splice(index, 1);
        markAsUnsaved();
        renderAll();
        return;
    }

    if (target.classList.contains('add-engine')) {
        const categorySection = target.closest('.category-section');
        if (!categorySection) return;

        const index = parseInt(categorySection.dataset.index);
        engines[index].engines.push({
            name: 'New Engine',
            url: ''
        });
        markAsUnsaved();
        renderSearchEngines();
        return;
    }

    const engineItem = target.closest('.engine-item');
    if (engineItem) {
        const categorySection = engineItem.closest('.category-section');
        const categoryIndex = parseInt(categorySection.dataset.index);
        const engineIndex = parseInt(engineItem.dataset.index);

        if (target.classList.contains('engine-name')) {
            engines[categoryIndex].engines[engineIndex].name = target.value;
            markAsUnsaved();
            updateCategoryMenu();
        } else if (target.classList.contains('engine-url')) {
            engines[categoryIndex].engines[engineIndex].url = target.value;
            markAsUnsaved();
        } else if (target.type === 'checkbox') {
            engines[categoryIndex].engines[engineIndex].disable = !target.checked;
            markAsUnsaved();
        } else if (target.classList.contains('delete-engine') || target.closest('.delete-engine')) {
            engines[categoryIndex].engines.splice(engineIndex, 1);
            markAsUnsaved();
            renderSearchEngines();
        }
    }
}

function handleAddCategory() {
    engines.push({
        name: 'New Category',
        engines: [{
            name: 'New Engine',
            url: ''
        }]
    });
    markAsUnsaved();
    renderAll();
}

async function exportToJson() {
    const settings = {
        searchEngines: engines
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'easy-switch-search-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function exportToExcel() {
    exportToCSV();
}

async function exportSettings() {
    const dialog = document.createElement('div');
    dialog.className = 'format-dialog';
    dialog.innerHTML = `
        <div class="format-dialog-content">
            <div class="format-dialog-title">Choose Export Format</div>
            <button class="format-option json-format">JSON Format</button>
            <button class="format-option excel-format">CSV Format</button>
            <div class="format-note">CSV Format: Comma-separated values file, can be edited with Excel</div>
            <button class="format-cancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener('click', (e) => {
        if (e.target.classList.contains('json-format')) {
            dialog.remove();
            exportToJson();
        } else if (e.target.classList.contains('excel-format')) {
            dialog.remove();
            exportToCSV();
        } else if (e.target.classList.contains('format-cancel') || e.target === dialog) {
            dialog.remove();
        }
    });
}

async function importFromJson(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        const settings = JSON.parse(text);

        if (settings.searchEngines && Array.isArray(settings.searchEngines)) {
            engines = settings.searchEngines;
            markAsUnsaved();
            renderAll();
            showMessage('Import successful!', 'success');
        } else {
            throw new Error('Invalid settings format');
        }
    } catch (error) {
        console.error('Failed to import settings:', error);
        showMessage('Import failed: Invalid file format', 'error');
    }
}

async function importFromExcel(e) {
    importFromCSV(e);
}

async function importSettings() {
    const dialog = document.createElement('div');
    dialog.className = 'format-dialog';
    dialog.innerHTML = `
        <div class="format-dialog-content">
            <div class="format-dialog-title">Choose Import Format</div>
            <button class="format-option json-format">JSON Format</button>
            <button class="format-option excel-format">CSV Format</button>
            <div class="format-note">CSV Format: Comma-separated values file, can be edited with Excel</div>
            <button class="format-cancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener('click', (e) => {
        if (e.target.classList.contains('json-format')) {
            dialog.remove();
            document.getElementById('importFromJson')?.click();
        } else if (e.target.classList.contains('excel-format')) {
            dialog.remove();
            document.getElementById('importFromCSV')?.click();
        } else if (e.target.classList.contains('format-cancel') || e.target === dialog) {
            dialog.remove();
        }
    });
}

async function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
        try {
            await chrome.storage.local.remove('searchEngines');
            const response = await fetch('config/default-engines.json');
            engines = await response.json();
            markAsUnsaved();
            renderAll();
            showMessage('Settings reset to default', 'success');
        } catch (error) {
            console.error('Failed to reset settings:', error);
            showMessage('Failed to reset settings', 'error');
        }
    }
}

function initSortable() {
    document.querySelectorAll('.engines-list').forEach(list => {
        if (list._sortable) {
            list._sortable.destroy();
        }
        list._sortable = new Sortable(list, {
            animation: 150,
            handle: '.drag-handle',
            filter: '.add-engine',
            draggable: '.engine-item',
            onEnd: function(evt) {
                if (evt.oldIndex !== evt.newIndex) {
                    const categorySection = evt.target.closest('.category-section');
                    const categoryIndex = parseInt(categorySection.dataset.index);
                    const category = engines[categoryIndex];
                    if (!category || !category.engines) return;

                    const item = category.engines.splice(evt.oldIndex, 1)[0];
                    category.engines.splice(evt.newIndex, 0, item);
                    markAsUnsaved();
                }
            }
        });
    });
}

function cleanupData(obj) {
    if (typeof obj !== 'object' || obj === null) {
        if (typeof obj === 'string') {
            return obj.trim();
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => cleanupData(item)).filter(item => {
            if (typeof item === 'string') {
                return item.trim() !== '';
            }
            return true;
        });
    }

    const cleaned = {};
    for (const key in obj) {
        const value = cleanupData(obj[key]);
        if (value !== undefined && value !== null && value !== '') {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

function showExportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'format-dialog';
    dialog.innerHTML = `
        <div class="format-dialog-content">
            <div class="format-dialog-title">Choose Export Format</div>
            <button class="format-option json-format">JSON Format</button>
            <button class="format-option excel-format">CSV Format</button>
            <div class="format-note">CSV Format: Comma-separated values file, can be edited with Excel</div>
            <button class="format-cancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener('click', (e) => {
        if (e.target.classList.contains('json-format')) {
            dialog.remove();
            exportToJson();
        } else if (e.target.classList.contains('excel-format')) {
            dialog.remove();
            exportToCSV();
        } else if (e.target.classList.contains('format-cancel') || e.target === dialog) {
            dialog.remove();
        }
    });
}

function showImportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'format-dialog';
    dialog.innerHTML = `
        <div class="format-dialog-content">
            <div class="format-dialog-title">Choose Import Format</div>
            <button class="format-option json-format">JSON Format</button>
            <button class="format-option excel-format">CSV Format</button>
            <div class="format-note">CSV Format: Comma-separated values file, can be edited with Excel</div>
            <button class="format-cancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener('click', (e) => {
        if (e.target.classList.contains('json-format')) {
            dialog.remove();
            document.getElementById('importFromJson')?.click();
        } else if (e.target.classList.contains('excel-format')) {
            dialog.remove();
            document.getElementById('importFromCSV')?.click();
        } else if (e.target.classList.contains('format-cancel') || e.target === dialog) {
            dialog.remove();
        }
    });
}

let currentEditingUrlInput = null;

function showUrlEditModal(currentUrl) {
    const modal = document.getElementById('urlEditModal');
    const modalInput = modal.querySelector('.modal-url-input');
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const placeholdersContainer = document.getElementById('modal-placeholders');
    
    const originalPlaceholders = document.getElementById('placeholders');
    placeholdersContainer.innerHTML = originalPlaceholders.innerHTML;
    
    modalInput.value = currentUrl;
    
    modal.style.display = 'block';
    modalInput.focus();
    modalInput.select();
    
    const saveChanges = () => {
        if (currentEditingUrlInput && modalInput.value.trim() !== '') {
            currentEditingUrlInput.value = modalInput.value.trim();
            markAsUnsaved();
        }
        modal.style.display = 'none';
        currentEditingUrlInput = null;
    };
    
    const cancelChanges = () => {
        modal.style.display = 'none';
        currentEditingUrlInput = null;
    };
    
    modalSaveBtn.onclick = saveChanges;
    modalCancelBtn.onclick = cancelChanges;
    
    modalInput.onkeydown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            saveChanges();
        } else if (e.key === 'Escape') {
            cancelChanges();
        }
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const firstCategory = await loadSettings();

        initSortable();

        renderAll();

        document.getElementById('saveBtn')?.addEventListener('click', saveSettings);
        document.getElementById('exportBtn')?.addEventListener('click', exportSettings);
        document.getElementById('importBtn')?.addEventListener('click', importSettings);
        document.getElementById('resetBtn')?.addEventListener('click', resetSettings);

        document.getElementById('importFromJson')?.addEventListener('change', importFromJson);
        document.getElementById('importFromCSV')?.addEventListener('change', importFromCSV);

        document.getElementById('category-order')?.addEventListener('click', handleCategoryOrderEvents);

        const searchEnginesContainer = document.getElementById('search-engines');
        if (searchEnginesContainer) {
            searchEnginesContainer.addEventListener('click', handleSearchEngineEvents);
            searchEnginesContainer.addEventListener('input', handleSearchEngineEvents);
        }

        if (firstCategory) {
            setTimeout(() => {
                document.getElementById(firstCategory)?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }

    } catch (error) {
        console.error('Initialization failed:', error);
        showMessage('Failed to initialize options page', 'error');
    }
});
