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

/**
 * Convert field to CSV format
 * Rules:
 * 1. All fields are wrapped in double quotes
 * 2. Double quotes within fields are converted to two double quotes
 */
function escapeCSVField(field) {
    // Convert null or undefined to an empty string
    if (field == null) field = '';
    // Convert non-strings to strings
    field = String(field);
    // Replace double quotes within the field with two double quotes, then wrap the entire field in double quotes
    return `"${field.replace(/"/g, '""')}"`;
}


function parseCSVField(field) {
    field = field.trim();
    // If the field is wrapped in double quotes
    if (field.startsWith('"') && field.endsWith('"')) {
        // Remove the double quotes at the beginning and end, then replace two double quotes with one
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

    // Join each row of data with commas
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
        // Split into rows, ignoring empty rows
        const rows = text.split('\n').filter(row => row.trim());
        
        // Validate the header and find the index of the required columns
        const headers = rows[0].split(',').map(parseCSVField);
        const requiredColumns = {
            categoryName: headers.findIndex(h => h === 'CategoryName'),
            engineName: headers.findIndex(h => h === 'EngineName'),
            engineUrl: headers.findIndex(h => h === 'EngineURL')
        };

        // Check if the required columns exist
        const missingColumns = Object.entries(requiredColumns)
            .filter(([_, index]) => index === -1)
            .map(([key]) => key === 'categoryName' ? 'CategoryName' : 
                          key === 'engineName' ? 'EngineName' : 'EngineURL');
            
        if (missingColumns.length > 0) {
            throw new Error(`Required columns missing: ${missingColumns.join(', ')}`);
        }

        // Find the index of the optional columns
        const optionalColumns = {
            categoryEnabled: headers.findIndex(h => h === 'CategoryEnabled'),
            engineEnabled: headers.findIndex(h => h === 'EngineEnabled'),
            engineFavicon: headers.findIndex(h => h === 'EngineFavicon')
        };

        // Parse the data
        const newEngines = [];
        let currentCategory = null;

        for (let i = 1; i < rows.length; i++) {
            // Split the CSV row using a regular expression, considering commas within quotes
            const row = rows[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)
                .map(field => parseCSVField(field));
            
            // Get the required fields
            const categoryName = row[requiredColumns.categoryName];
            const engineName = row[requiredColumns.engineName];
            const engineUrl = row[requiredColumns.engineUrl];

            // Skip empty rows
            if (!categoryName && !engineName && !engineUrl) continue;

            // Get the optional fields
            const categoryEnabled = optionalColumns.categoryEnabled !== -1 ? 
                row[optionalColumns.categoryEnabled] : 'true';
            const engineEnabled = optionalColumns.engineEnabled !== -1 ? 
                row[optionalColumns.engineEnabled] : 'true';
            const engineFavicon = optionalColumns.engineFavicon !== -1 ? 
                row[optionalColumns.engineFavicon] : '';

            // If it's a new category
            if (!currentCategory || currentCategory.name !== categoryName) {
                currentCategory = {
                    name: categoryName
                };
                // Only add the disable field when the value is false
                if (categoryEnabled.toLowerCase() === 'false') {
                    currentCategory.disable = true;
                }
                currentCategory.engines = [];
                newEngines.push(currentCategory);
            }

            // Add the search engine
            const engine = {
                name: engineName,
                url: engineUrl
            };
            
            // Only add the optional fields when necessary
            if (engineEnabled.toLowerCase() === 'false') {
                engine.disable = true;
            }
            if (engineFavicon && engineFavicon.trim()) {
                engine.favicon = engineFavicon.trim();
            }
            
            currentCategory.engines.push(engine);
        }

        if (newEngines.length > 0) {
            // Clean and optimize the data
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
        
        // Load search engine data
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

// UI Update Function: Update Category Menu
function updateCategoryMenu() {
    const menu = document.querySelector('.nav-menu');
    if (!menu) return;

    // Clear the existing options
    menu.innerHTML = '';

    // Add fixed navigation items
    const sections = ['category-order', 'placeholders', 'search-engines'];
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

    // Add search engine categories
    engines.forEach((category, index) => {
        const li = document.createElement('li');
        li.className = 'submenu-item';  
        const a = document.createElement('a');
        a.href = `#category-${index}`;
        a.textContent = category.name;
        li.appendChild(a);
        menu.appendChild(li);
    });
}

/**
 * Render the category order list and create draggable category list items
 * This function displays the sorting interface for all categories, allowing users to adjust category order through drag and drop
 */
function renderCategoryOrder() {
    // Get the list container for displaying category order
    const orderList = document.getElementById('category-order-list');
    // If container not found, return immediately
    if (!orderList) return;

    // Clear existing content in the list
    orderList.innerHTML = '';
    engines.forEach((category, index) => {
        const item = document.createElement('div');
        item.className = 'category-order-item';
        item.dataset.index = index;


        item.innerHTML = `
            <span class="drag-handle">${dragIcon}</span>
            <span class="category-name">${category.name}</span>
        `;

        orderList.appendChild(item);
    });
}

/**
 * Render the search engine configuration interface, including all categories and search engines under each category
 * This is the main settings interface where users can add, modify, and delete categories and search engines
 */
function renderSearchEngines() {
    // Get the container for displaying search engine configuration
    const container = document.getElementById('categories-container');
    // If container not found, return immediately
    if (!container) return;

    // Clear existing content in the container
    container.innerHTML = '';
    // Iterate through all categories to create configuration area for each
    engines.forEach((category, categoryIndex) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-section';
        categoryDiv.id = `category-${categoryIndex}`;
        categoryDiv.dataset.index = categoryIndex;


        categoryDiv.innerHTML = `
            <div class="category-header">
                <input type="text" class="category-name" value="${category.name}" placeholder="Category Name">
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
                        <input type="text" class="engine-name" value="${engine.name}" placeholder="Engine Name">
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
        // Add the category container to the main container
        container.appendChild(categoryDiv);
    });

    const addCategoryBtn = document.createElement('button');
    addCategoryBtn.className = 'add-category';
    addCategoryBtn.textContent = 'Add Category';
    addCategoryBtn.addEventListener('click', handleAddCategory);
    container.appendChild(addCategoryBtn);
}

/**
 * Update the navigation menu, displaying all available navigation items and categories
 * This function is responsible for updating the left-side navigation menu, including fixed navigation items and dynamic category list
 */
function updateNavMenu() {
    // Get the navigation menu container
    const navMenu = document.querySelector('.nav-menu');
    // If container not found, return immediately
    if (!navMenu) return;

    // Clear existing menu content
    navMenu.innerHTML = '';

    // Get all toolbar areas
    const toolbars = document.querySelectorAll('.toolbar');
    // Iterate through each toolbar to create navigation items
    toolbars.forEach(toolbar => {
        const id = toolbar.id;
        const title = toolbar.querySelector('h2')?.textContent || id;

        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = title;
        li.appendChild(a);

        // For search engine area, need to add submenu container
        if (id === 'search-engines') {
            const ul = document.createElement('ul');
            ul.className = 'category-menu';
            li.appendChild(ul);
        }

        navMenu.appendChild(li);
    });
}

/**
 * Unified render function, update all UI elements
 */
async function renderAll() {
    updateNavMenu();
    renderCategoryOrder();
    renderSearchEngines();
    await updateCategoryMenu();
    initSortable();
}

/**
 * Mark that there are unsaved changes, used to prompt user to save modifications
 */
function markAsUnsaved() {
    // Set unsaved changes flag to true
    hasUnsavedChanges = true;
}

/**
 * Handle category order events, including move up and move down operations
 * @param {Event} e Event object
 */
function handleCategoryOrderEvents(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const item = button.closest('.category-order-item');
    if (!item) return;

    // Get the category index
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

/**
 * Handle search engine related events, including name modification, deletion, and addition operations
 * @param {Event} e Event object
 */
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

    // Handle category enable/disable state toggle
    if (target.classList.contains('category-toggle')) {
        const categorySection = target.closest('.category-section');
        if (!categorySection) return;
        
        const index = parseInt(categorySection.dataset.index);
        engines[index].disable = !target.checked;
        markAsUnsaved();
        return;
    }

    // Handle category deletion
    if (target.classList.contains('delete-category') || target.closest('.delete-category')) {
        const categorySection = (target.closest('.category-section') || target.closest('.delete-category')?.closest('.category-section'));
        if (!categorySection || engines.length <= 1) return;
        
        const index = parseInt(categorySection.dataset.index);
        engines.splice(index, 1);
        markAsUnsaved();
        renderAll();
        return;
    }

    // Handle adding search engine
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

    // Handle search engine item events
    const engineItem = target.closest('.engine-item');
    if (engineItem) {
        // Get the category container element
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

/**
 * Handle adding new category operation
 */
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

/**
 * Export configuration to JSON file
 */
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

/**
 * Export as CSV format (tab-separated text file)
 */
async function exportToExcel() {
    exportToCSV();
}


/**
 * Export configuration
 */
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

    // Add event listeners
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

/**
 * Import from JSON file
 */
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

/**
 * Import from CSV format
 */
async function importFromExcel(e) {
    importFromCSV(e);
}

/**
 * Import configuration
 */
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

    // Add event listeners
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

/**
 * Reset all settings to default values
 */
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

/**
 * Initialize drag and drop sorting functionality
 */
function initSortable() {
    const categoryList = document.getElementById('category-order-list');
    if (categoryList && categoryList._sortable) {
        categoryList._sortable.destroy();
    }

    if (categoryList) {
        categoryList._sortable = new Sortable(categoryList, {
            animation: 150,
            // Drag handle selector
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

    // Get all search engine list containers
    document.querySelectorAll('.engines-list').forEach(list => {
        // If search engine list container exists
        if (list._sortable) {
            // Destroy existing sortable instance
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

/**
 * Clean and optimize data object, remove extra spaces and empty values
 * @param {Object} obj Object to clean
 * @returns {Object} Cleaned object
 */
function cleanupData(obj) {
    if (typeof obj !== 'object' || obj === null) {
        // If it's a string, clean spaces
        if (typeof obj === 'string') {
            return obj.trim();
        }
        return obj;
    }

    // If it's an array
    if (Array.isArray(obj)) {
        return obj.map(item => cleanupData(item)).filter(item => {
            if (typeof item === 'string') {
                return item.trim() !== '';
            }
            return true;
        });
    }

    // If it's an object
    const cleaned = {};
    for (const key in obj) {
        const value = cleanupData(obj[key]);
        if (value !== undefined && value !== null && value !== '') {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

/**
 * Show export format selection dialog
 */
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

    // Add event listeners
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

/**
 * Show import format selection dialog
 */
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

    // Add event listeners
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

// Initialization operations after page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load configuration
        const firstCategory = await loadSettings();
        
        // Initialize drag and drop sorting
        initSortable();
        
        // Update UI
        renderAll();
        
        // Add event listeners
        document.getElementById('saveBtn')?.addEventListener('click', saveSettings);
        document.getElementById('exportBtn')?.addEventListener('click', exportSettings);
        document.getElementById('importBtn')?.addEventListener('click', importSettings);
        document.getElementById('resetBtn')?.addEventListener('click', resetSettings);
        
        // Add event listeners for import functionality
        document.getElementById('importFromJson')?.addEventListener('change', importFromJson);
        document.getElementById('importFromCSV')?.addEventListener('change', importFromCSV);
        
        // Add category order event listeners
        document.getElementById('category-order')?.addEventListener('click', handleCategoryOrderEvents);
        
        // Add search engine related event listeners
        const searchEnginesContainer = document.getElementById('search-engines');
        if (searchEnginesContainer) {
            // Handle click events
            searchEnginesContainer.addEventListener('click', handleSearchEngineEvents);
            // Handle input events
            searchEnginesContainer.addEventListener('input', handleSearchEngineEvents);
        }
        
        // If there's a first category, scroll to it
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
