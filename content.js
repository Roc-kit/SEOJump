// Content Script - Responsible for creating and managing search toolbar in web pages

// Global variable definitions

let engines = [];  // Store all search engine configurations
const toolbarTimers = {
    showTimer: null,    // Timer for controlling toolbar display
    hideTimer: null     // Timer for controlling toolbar hide
};

// Utility function - Asynchronous delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Create and dispatch events
function dispatchEvent(element, eventType, options = {}) {
    const defaults = {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1
    };

    const eventOptions = { ...defaults, ...options };
    let event;

    // Mouse events
    if (eventType.startsWith('mouse')) {
        event = new MouseEvent(eventType, {
            ...eventOptions,
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            button: 0,
            buttons: 1
        });
    }
    // Pointer events
    else if (eventType.startsWith('pointer')) {
        event = new PointerEvent(eventType, {
            ...eventOptions,
            pointerId: 1,
            width: 1,
            height: 1,
            pressure: 0.5,
            tiltX: 0,
            tiltY: 0,
            pointerType: 'mouse',
            isPrimary: true
        });
    }
    // Touch events
    else if (eventType.startsWith('touch')) {
        const touch = new Touch({
            identifier: 1,
            target: element,
            clientX: 0,
            clientY: 0,
            screenX: 0,
            screenY: 0,
            pageX: 0,
            pageY: 0,
            radiusX: 1,
            radiusY: 1,
            rotationAngle: 0,
            force: 1,
        });

        event = new TouchEvent(eventType, {
            ...eventOptions,
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch],
        });
    }
    // Other events
    else {
        event = new Event(eventType, eventOptions);
    }

    element.dispatchEvent(event);
    return event;
}

// Load search engine configurations
async function loadEngines() {
    try {
        // First, try to get configurations from Chrome storage
        const storage = await chrome.storage.local.get('searchEngines');
        if (storage.searchEngines && Array.isArray(storage.searchEngines)) {
            return storage.searchEngines;
        }

        // If no configurations are found in storage, load default configurations
        const defaultConfigUrl = chrome.runtime.getURL('config/default-engines.json');

        const response = await fetch(defaultConfigUrl);
        if (!response.ok) {
            throw new Error(`Failed to load default config: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error('Default config should be an array');
        }

        // Ensure each search engine has necessary fields and valid favicon
        const formattedData = data.map(category => ({
            ...category,
            engines: category.engines.map(engine => ({
                ...engine,
                favicon: validateFavicon(engine.favicon) ? engine.favicon : ''
            }))
        }));

        // Save to Chrome storage
        await chrome.storage.local.set({ searchEngines: formattedData });
        return formattedData;
    } catch (error) {
        console.error('Error loading engines:', error);
        return [];
    }
}

// Load icon from cache
async function loadIconFromCache(domain) {
    try {
        const key = `favicon_${domain}`;
        const result = await chrome.storage.local.get(key);
        const cached = result[key];
        
        if (cached && typeof cached === 'string' && cached.startsWith('data:image')) {
            return cached;
        }
        return null;
    } catch (error) {
        console.warn('Failed to load icon from cache:', error);
        return null;
    }
}

// Save icon to cache
async function saveIconToCache(domain, iconData) {
    if (!iconData || !iconData.startsWith('data:image')) {
        console.warn('Invalid icon data for caching');
        return;
    }
    
    try {
        const key = `favicon_${domain}`;
        await chrome.storage.local.set({
            [key]: iconData
        });
    } catch (error) {
        console.warn('Failed to save icon to cache:', error);
    }
}


function validateFavicon(favicon) {
    if (!favicon) return false;
    
    try {
        if (favicon.startsWith('data:image')) {
            const [header, content] = favicon.split(',');
            return header.includes(';base64') && content;
        }
        if (favicon.startsWith('http')) {
            new URL(favicon);
            return true;
        }
        return false;
    } catch (e) {
        console.warn('Invalid favicon format:', favicon);
        return false;
    }
}


// Get favicon for search engine
async function getFavicon(engine) {
    if (!engine?.url) {
        return chrome.runtime.getURL('icons/icon32.png');
    }

    // Validate and return configured favicon
    if (engine.favicon && validateFavicon(engine.favicon)) {
        return engine.favicon;
    }

    try {
        const url = new URL(engine.url.trim());
        const domain = url.hostname;

        // Try cache first
        const cachedIcon = await loadIconFromCache(domain);
        if (cachedIcon) {
            return cachedIcon;
        }

        // Request favicon through background script
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'getFavicon',
                domain: domain
            });

            if (response.success && response.iconData && response.iconData.startsWith('data:image')) {
                await saveIconToCache(domain, response.iconData);
                return response.iconData;
            }
        } catch (error) {
            console.warn('Error fetching favicon:', error);
        }

        return chrome.runtime.getURL('icons/icon32.png');
    } catch (error) {
        console.warn('Error getting favicon:', error);
        return chrome.runtime.getURL('icons/icon32.png');
    }
}

// Load search engine configurations
loadEngines().then(loadedEngines => {
    engines = loadedEngines;

    // Add text selection event listeners
    document.addEventListener('mouseup', handleTextSelection, true);
    document.addEventListener('keyup', handleTextSelection, true);

    // Monitor dynamic content changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                const toolbar = document.querySelector('.easy-switch-toolbar');
                if (toolbar) {
                    // Ensure toolbar is always on top
                    document.documentElement.appendChild(toolbar);
                }
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Handle Shadow DOM
    function attachShadowListeners(node) {
        if (node.shadowRoot) {
            node.shadowRoot.addEventListener('mouseup', handleTextSelection, true);
            node.shadowRoot.addEventListener('keyup', handleTextSelection, true);
        }

        // Monitor creation of new Shadow DOM
        const shadowObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.shadowRoot) {
                            attachShadowListeners(node);
                        }
                    }
                });
            });
        });

        shadowObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // Handle existing Shadow DOM during initialization
    document.querySelectorAll('*').forEach(node => {
        if (node.shadowRoot) {
            attachShadowListeners(node);
        }
    });
});

// Handle text selection events
function handleTextSelection(e) {
    // Get selected text, considering Shadow DOM
    const selection = window.getSelection();
    let selectedText = selection.toString().trim();

    // If regular selection is empty, try to get from Shadow DOM
    if (!selectedText && e.target.shadowRoot) {
        const shadowSelection = e.target.shadowRoot.getSelection();
        if (shadowSelection) {
            selectedText = shadowSelection.toString().trim();
        }
    }

    let toolbar = document.querySelector('.easy-switch-toolbar');

    // Function to handle ESC key
    const handleEscKey = (e) => {
        if (e.key === 'Escape' && toolbar.style.display !== 'none') {
            toolbar.classList.remove('visible');
            toolbar.style.display = 'none';
            window.getSelection().removeAllRanges();
            document.removeEventListener('keydown', handleEscKey);
        }
    };

    if (selectedText) {
        if (!toolbar) {
            toolbar = createToolbar(engines);
            // Add toolbar to the top level of the document
            document.documentElement.appendChild(toolbar);
            attachToolbarEvents(toolbar);
        }

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Ensure toolbar is displayed within viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Calculate toolbar position
            toolbar.style.display = 'block';
            toolbar.classList.add('visible');

            // Add ESC key listener each time toolbar is displayed
            document.removeEventListener('keydown', handleEscKey); // Remove old listener first
            document.addEventListener('keydown', handleEscKey);    // Add new listener

            // Wait for toolbar to finish rendering
            requestAnimationFrame(() => {
                const toolbarRect = toolbar.getBoundingClientRect();

                // Calculate optimal position
                let top = rect.top - toolbarRect.height - 10;

                // If toolbar would exceed top, display below selection
                if (top < 10) {
                    top = rect.bottom + 10;
                }

                // Ensure toolbar doesn't exceed bottom
                if (top + toolbarRect.height > viewportHeight - 10) {
                    top = viewportHeight - toolbarRect.height - 10;
                }

                // Apply position
                toolbar.style.top = `${top}px`;
            });
        }
    } else {
        // Hide toolbar when no text is selected
        if (toolbar) {
            toolbar.classList.remove('visible');
            toolbar.style.display = 'none';
            document.removeEventListener('keydown', handleEscKey); // Remove listener
        }
    }
}

// Create search engine button
function createSearchButton(engine) {
    const button = document.createElement('button');
    button.className = 'search-engine-button';
    button.dataset.url = engine.url;

    // Create icon element
    const icon = document.createElement('img');
    icon.className = 'search-engine-icon';
    icon.src = chrome.runtime.getURL('icons/icon32.png'); // Set default icon

    // Asynchronously load actual icon
    getFavicon(engine).then(iconUrl => {
        icon.src = iconUrl;
    }).catch(error => {
        console.warn('Error loading favicon:', error);
    });

    // Create name label
    const name = document.createElement('span');
    name.className = 'search-engine-name';
    name.textContent = engine.name;

    // Assemble button
    button.appendChild(icon);
    button.appendChild(name);

    return button;
}

// Create category button and its dropdown menu
function createCategoryButton(category, engines) {
    const container = document.createElement('div');
    container.className = 'search-category-container';

    // Create main category button
    const button = document.createElement('button');
    button.className = 'search-category-button';
    button.dataset.category = category;

    // Use first search engine's icon as category icon
    if (engines.length > 0) {
        const firstEngine = engines[0];

        // Create icon
        const icon = document.createElement('img');
        icon.className = 'search-engine-icon';
        getFavicon(firstEngine).then(iconUrl => {
            icon.src = iconUrl;
        }).catch(error => {
            console.warn('Error loading category favicon:', error);
            icon.src = chrome.runtime.getURL('icons/icon32.png');
        });
        button.appendChild(icon);

        // Create category name
        const name = document.createElement('span');
        name.className = 'search-engine-name';
        name.textContent = category;
        button.appendChild(name);
    }

    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'search-engines-dropdown';

    // Add all non-disabled search engines to dropdown
    engines.forEach(engine => {
        if (!engine.disable) {
            const engineButton = createSearchButton(engine);
            dropdown.appendChild(engineButton);
        }
    });

    // Assemble container
    container.appendChild(button);
    container.appendChild(dropdown);

    return container;
}

// Create toolbar
function createToolbar(categories) {
    console.log('Creating toolbar with engines:', categories);

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'search-toolbar';
    toolbar.className = 'easy-switch-toolbar';

    // Add style to prevent text selection
    toolbar.style.cssText = `
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
    `;

    // Validate category data format
    if (!Array.isArray(categories)) {
        console.error('Invalid categories format:', categories);
        return toolbar;
    }

    // Iterate through all categories
    categories.forEach(category => {
        if (!category?.name || !Array.isArray(category.engines)) {
            console.error('Invalid category format:', category);
            return;
        }

        // Skip if category is disabled
        if (category.disable) {
            console.log(`Skipping disabled category: ${category.name}`);
            return;
        }

        // Filter out disabled search engines
        const enabledEngines = category.engines.filter(engine => !engine.disable);

        // Skip categories with no enabled search engines
        if (enabledEngines.length === 0) {
            console.log(`Skipping empty category: ${category.name}`);
            return;
        }

        try {
            // Create category container and add to toolbar
            const container = createCategoryButton(category.name, enabledEngines);
            toolbar.appendChild(container);
        } catch (error) {
            console.error(`Error creating category button for ${category.name}:`, error);
        }
    });

    return toolbar;
}

// Handle search engine button click
async function handleSearchButtonClick(button, selectedText, event) {
    try {
        if (selectedText && button.dataset.url) {
            // Send message to background to handle search
            chrome.runtime.sendMessage({
                type: 'performSearch',
                url: button.dataset.url,
                text: selectedText,
                context: {
                    currentUrl: window.location.href,
                    currentDomain: window.location.hostname
                },
                inBackground: event.ctrlKey // Add Ctrl key state
            });
        }
    } catch (error) {
        console.error('Error handling search button click:', error);
    }
}

// Attach toolbar event listeners
function attachToolbarEvents(toolbar) {
    // Bind category button click events
    toolbar.querySelectorAll('.search-category-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                // Use the first search engine in the category when clicking the category button
                const container = button.closest('.search-category-container');
                const firstEngine = container.querySelector('.search-engines-dropdown .search-engine-button');
                if (firstEngine) {
                    handleSearchButtonClick(firstEngine, selectedText, e);
                }
            }
        });
    });

    // Bind search engine button click events
    toolbar.querySelectorAll('.search-engine-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                handleSearchButtonClick(button, selectedText, e);
            }
        });
    });

    // Add mouseenter/mouseleave events for all dropdown containers
    toolbar.querySelectorAll('.search-category-container').forEach(container => {
        const dropdown = container.querySelector('.search-engines-dropdown');

        // Show dropdown menu on mouse enter
        container.addEventListener('mouseenter', () => {
            hideAllDropdowns();
            dropdown.style.display = 'block';
        });

        // Hide dropdown menu on mouse leave
        container.addEventListener('mouseleave', () => {
            dropdown.style.display = 'none';
        });
    });
}

// Hide all dropdown menus
function hideAllDropdowns() {
    const dropdowns = document.querySelectorAll('.search-engines-dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.style.display = 'none';
    });
}

// Handle placeholder replacement in advanced search
function processPlaceholders(text) {
    const currentUrl = window.location.href;
    const currentDomain = window.location.hostname;
    const selectedText = window.getSelection().toString().trim();

    return text.replace(/%currentUrl%/g, currentUrl)
               .replace(/%currentDomain%/g, currentDomain)
               .replace(/%selectedText%/g, selectedText);
}

// Wait for element to appear
async function waitForElement(selectorOrFn, { timeout = 5000, interval = 100, retries = 3 } = {}) {
    return new Promise((resolve) => {
        let currentRetry = 0;
        
        const attemptFind = () => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                // Check for timeout
                if (Date.now() - startTime >= timeout) {
                    clearInterval(checkInterval);
                    
                    // If there are still retries left, retry
                    if (currentRetry < retries) {
                        currentRetry++;
                        console.debug(`Element not found, retrying (${currentRetry}/${retries}): ${selectorOrFn}`);
                        attemptFind();
                        return;
                    }
                    
                    // After all retries have failed, log detailed information
                    console.info(`Element not found after ${retries} attempts:`, {
                        selector: selectorOrFn,
                        url: window.location.href,
                        timeout: timeout,
                        retries: retries
                    });
                    
                    resolve(null);
                    return;
                }

                // Get element
                let element = null;
                try {
                    if (typeof selectorOrFn === 'string') {
                        const elements = document.querySelectorAll(selectorOrFn);
                        if (elements.length > 0) {
                            // Log if multiple elements found
                            if (elements.length > 1) {
                                console.warn(`Multiple elements found for selector: ${selectorOrFn}, using the first visible one`);
                            }
                            // Select the first visible element
                            for (const el of elements) {
                                const style = window.getComputedStyle(el);
                                if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                                    element = el;
                                    break;
                                }
                            }
                            // Use first element if no visible element found
                            if (!element) {
                                element = elements[0];
                            }
                        }
                    } else if (typeof selectorOrFn === 'function') {
                        element = selectorOrFn();
                    }
                } catch (error) {
                    console.error('Error finding element:', error);
                }

                // Return if element is found
                if (element) {
                    clearInterval(checkInterval);
                    resolve(element);
                }
            }, interval);
        };

        attemptFind();
    });
}

// Wait for element to disappear
async function waitForElementHide(selectorOrFn, { timeout = 5000, interval = 100 } = {}) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        const checkInterval = setInterval(() => {
            // Check for timeout
            if (Date.now() - startTime >= timeout) {
                clearInterval(checkInterval);
                console.warn(`Timeout waiting for element to hide: ${selectorOrFn}`);
                resolve(false);
                return;
            }

            // Check if element exists
            let element = null;
            try {
                if (typeof selectorOrFn === 'string') {
                    element = document.querySelector(selectorOrFn);
                } else if (typeof selectorOrFn === 'function') {
                    element = selectorOrFn();
                }
            } catch (error) {
                console.error('Error finding element:', error);
            }

            // Return if element doesn't exist or is not visible
            if (!element || element.offsetParent === null) {
                clearInterval(checkInterval);
                resolve(true);
            }
        }, interval);
    });
}

// Simulate Enter key event sequence
async function simulateEnterKey(element, options = {}) {
    try {
        const keyEventInit = {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            location: 0,
            repeat: false,
            isComposing: false,
            ...options
        };

        // 1. Trigger keyboard down event
        const keydownEvent = new KeyboardEvent('keydown', keyEventInit);
        const keydownResult = element.dispatchEvent(keydownEvent);
        await sleep(100);

        if (keydownResult && !keydownEvent.defaultPrevented) {
            // 2. Trigger keypress event
            element.dispatchEvent(new KeyboardEvent('keypress', keyEventInit));
            await sleep(100);

            // 3. Handle form submission if it's a form element
            if (element.form) {
                // Original form submission logic
                let isCustomSubmit = false;

                // Listen for submit event
                const submitHandler = (e) => {
                    if (e.defaultPrevented) {
                        isCustomSubmit = true;
                    }
                };

                // Add one-time event listener
                element.form.addEventListener('submit', submitHandler, { once: true });

                // Trigger submit event
                const submitEvent = new Event('submit', {
                    bubbles: true,
                    cancelable: true,
                    composed: true
                });

                element.form.dispatchEvent(submitEvent);

                // Wait for possible async processing
                await sleep(200);

                // Try other methods if no custom submit handler
                if (!isCustomSubmit) {
                    // Check for submit button
                    const submitButton = element.form.querySelector('button[type="submit"], input[type="submit"]');
                    if (submitButton && submitButton !== element) {
                        submitButton.click();
                        await sleep(100);
                    }
                }
            }
            // 4. Handle standalone textarea
            else if (element.tagName === 'TEXTAREA') {
                // Trigger input-related events
                element.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(50);
                element.dispatchEvent(new Event('change', { bubbles: true }));
                await sleep(50);
            }

            // 5. Trigger keyboard up event
            element.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));
            await sleep(100);
        }
    } catch (error) {
        console.error('[Error] Error in simulateEnterKey: ' + error.message);
        throw error;
    }
}

// Handle input field filling
async function handleInput(element, text) {
    try {
        if (!element) return;

        // 1. Trigger pointer and touch event sequence (simulate user click)
        const interactionEvents = [
            // Pointer events
            'pointerover',
            'pointerenter',
            'pointerdown',
            // Mouse events
            'mouseover',
            'mouseenter',
            'mousedown',
            // Touch events
            'touchstart'
        ];

        for (const eventType of interactionEvents) {
            dispatchEvent(element, eventType);
        }

        // 2. Trigger focus-related events
        const focusInEvent = new FocusEvent('focusin', { bubbles: true });
        element.dispatchEvent(focusInEvent);
        const focusEvent = new Event('focus', { bubbles: true });
        element.dispatchEvent(focusEvent);

        // 3. Set selection range
        if (document.body.contains(element)) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // 4. Save original value (for tracker)
        const lastValue = element.value;

        // 5. Set value based on element type
        if (/INPUT|TEXTAREA/i.test(element.nodeName)) {
            const nativeValueSetter = Object.getOwnPropertyDescriptor(
                element.constructor.prototype,
                'value'
            ).set;
            nativeValueSetter.call(element, text);
        } else if (element.contentEditable === 'true') {
            element.dispatchEvent(new InputEvent('beforeinput', {
                inputType: "insertText",
                data: text,
                bubbles: true
            }));
            element.textContent = text;
        }

        // 6. Trigger input event sequence
        const beforeInputEvent = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
        });
        element.dispatchEvent(beforeInputEvent);

        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: false,
            inputType: 'insertText',
            data: text
        });

        // Handle value tracker for frameworks like React
        const valueTracker = element._valueTracker;
        if (valueTracker) {
            valueTracker.setValue(lastValue);
        }

        element.dispatchEvent(inputEvent);

        const changeEvent = new Event('change', {
            bubbles: true,
            cancelable: false
        });
        element.dispatchEvent(changeEvent);

        // Ensure element has actual focus
        element.focus();

        // 7. Trigger keyboard events
        const keyEventInit = {
            bubbles: true,
            cancelable: true,
            key: 'Process',
            code: 'Process',
            keyCode: 229,
            which: 229,
            composed: true
        };

        ['keydown', 'keypress', 'keyup'].forEach(eventType => {
            const keyEvent = new KeyboardEvent(eventType, keyEventInit);
            element.dispatchEvent(keyEvent);
        });

        // 8. Trigger end event sequence
        const endEvents = [
            // Touch events
            'touchend',
            // Pointer events
            'pointerup',
            'pointerout',
            'pointerleave',
            // Mouse events
            'mouseup',
            'mouseout',
            'mouseleave'
        ];

        for (const eventType of endEvents) {
            dispatchEvent(element, eventType);
        }

    } catch (error) {
        console.error('Error in handleInput:', error);
        throw error;
    }
}

// Handle form submission: click submit button + simulate Enter key + form submit
async function handleSubmit(element) {
    try {
        if (!element) return;

        // Check form
        const form = element.form;
        if (form) {
            // Check if form has action attribute
            const formAction = form.action;
            const originalAction = form.getAttribute('action');
            const isDefaultAction = !originalAction ||
                originalAction === '' ||
                originalAction === '#' ||
                originalAction === window.location.href ||
                originalAction === window.location.pathname;

            // Check if there's a submit button
            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');

            // Record form information
            const formInfo = {
                action: formAction,
                method: form.method,
                target: form.target,
                isDefaultAction: isDefaultAction,
                hasSubmitButton: !!submitButton
            };
        }

        // 1. Trigger start event sequence
        const startEvents = [
            'pointerover', 'pointerenter', 'pointerdown',
            'mouseover', 'mouseenter', 'mousedown', 'touchstart'
        ];

        for (const eventType of startEvents) {
            dispatchEvent(element, eventType);
            await sleep(10);
        }

        // 2. Trigger click event

        // Check if there's a click handler
        const hasClickHandler = element.onclick ||
            element.getAttribute('onclick') ||
            element.click !== HTMLElement.prototype.click;

        if (hasClickHandler) {
            if (element.click) {
                element.click();
            } else {
                dispatchEvent(element, 'click');
            }
        } else {
            dispatchEvent(element, 'click');
        }

        await sleep(100);

        // 3. Trigger end event sequence
        const endEvents = [
            'touchend',
            'pointerup', 'pointerout', 'pointerleave',
            'mouseup', 'mouseout', 'mouseleave'
        ];

        for (const eventType of endEvents) {
            dispatchEvent(element, eventType);
            await sleep(10);
        }

        // 4. If input field, trigger change and input events
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            dispatchEvent(element, 'input');
            await sleep(50);
            dispatchEvent(element, 'change');
            await sleep(50);
        }

        // 5. Check if there's a form, if yes, try to trigger custom submit
        if (element.form) {
            let isCustomSubmit = false;

            // Listen for submit event
            const submitHandler = (e) => {
                if (e.defaultPrevented) {
                    isCustomSubmit = true;
                }
            };

            // Add one-time event listener
            element.form.addEventListener('submit', submitHandler, { once: true });

            // Trigger submit event
            const submitEvent = new Event('submit', {
                bubbles: true,
                cancelable: true,
                composed: true
            });

            element.form.dispatchEvent(submitEvent);

            // Wait for possible async processing
            await sleep(200);

            // If no custom submit handler, try other methods
            if (!isCustomSubmit) {
                // Check if there's a submit button
                const submitButton = element.form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitButton && submitButton !== element) {
                    submitButton.click();
                    await sleep(100);
                }
            }
        }

    } catch (error) {
        console.error('[Error] Error in handleSubmit: ' + error.message);
        throw error;
    }
}

// Handle brute mode - try all possible elements
async function handleBruteMode(selector, text, options = {}) {
    try {
        // Find main elements and child elements
        const elements = document.querySelectorAll(selector);
        const childElements = [];
        elements.forEach(el => {
            const children = el.querySelectorAll('input, textarea, [contenteditable="true"]');
            childElements.push(...children);
        });

        // Log the number of elements found
        console.log('[Brute] Found elements: ' + JSON.stringify({
            main: elements.length,
            children: childElements.length,
            total: elements.length + childElements.length
        }));

        // Merge all possible input elements
        const inputElements = [...elements, ...childElements].filter(el => {
            return el.tagName === 'INPUT' ||
                   el.tagName === 'TEXTAREA' ||
                   el.getAttribute('contenteditable') === 'true';
        });

        // Traverse each input element
        for (const element of inputElements) {
            // Check element visibility
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                continue;
            }

            // Record form information
            if (element.form) {
                const formInfo = {
                    action: element.form.action,
                    method: element.form.method,
                    target: element.form.target
                };
            }

            // Attempt input operation
            try {
                // Focus the element
                element.focus();
                await sleep(500);

                // Clear existing content
                element.value = '';
                await sleep(500);

                // Input new text
                element.value = text;
                await sleep(500);

                // Trigger necessary events
                dispatchEvent(element, 'input');
                dispatchEvent(element, 'change');
                
                // Add a fixed delay after input
                await sleep(2000);

                // Simulate Enter key
                await simulateEnterKey(element);

                // Add a longer delay after each complete operation
                await sleep(4000);

            } catch (error) {
                console.error('[Error] Input operation failed: ' + error.message);
                continue;
            }
        }

        // Find clickable elements
        const clickableElements = [...elements].filter(el => {
            return el.tagName === 'BUTTON' ||
                   el.tagName === 'A' ||
                   el.getAttribute('role') === 'button';
        });

        // Attempt click operation
        for (const element of clickableElements) {
            try {
                await handleSubmit(element);
            } catch (error) {
                console.error('[Error] Click operation failed: ' + error.message);
                continue;
            }
        }

    } catch (error) {
        console.error('[Error] Error in handleBruteMode: ' + error.message);
        throw error;
    }
}

// Handle advanced features
async function processAdvancedFeatures(params) {
    try {
        // Handle delay
        if (params.delay) {
            await sleep(params.delay);
        }

        // Get the text to fill, handle placeholders
        let text = params.text || window.getSelection().toString().trim();
        text = processPlaceholders(text);

        // Handle brute mode
        if (params.bruteSelector) {
            await handleBruteMode(params.bruteSelector, text);
            return;
        }

        // Handle input box
        if (params.inputSelector) {
            // Wait for the input element to appear (up to 5 seconds)
            const inputElement = await waitForElement(params.inputSelector);
            if (inputElement) {
                await handleInput(inputElement, text);
                
                // Add a delay after input
                await sleep(2000);

                // Handle submit button or Enter key
                if ('submitSelector' in params) {  // Check if submitSelector is explicitly specified
                    if (params.submitSelector) {  // If a selector is provided
                        const submitElement = await waitForElement(params.submitSelector);

                        if (submitElement) {
                            await handleSubmit(submitElement);
                        } else {
                            // If the submit button is not found, try the Enter key
                            await simulateEnterKey(inputElement);
                        }
                    } else {  // submitSelector exists but is empty, use Enter key
                        await simulateEnterKey(inputElement);
                    }
                }
            }
        }

    } catch (error) {
        console.error('[Error] Error processing advanced features:', error);
    }
}

// Add message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'processAdvancedFeatures') {
        (async () => {
            try {
                await processAdvancedFeatures(message.params);
                sendResponse({ success: true });
            } catch (error) {
                console.warn('Error processing advanced features:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    } else if (message.type === 'enableCopy') {
        enableAllowCopy();
        return true;
    }
    return false;
});

// Enable copy functionality
function enableAllowCopy() {
    // 1. Inject style to allow selection
    const style = document.createElement('style');
    style.innerHTML = `
        html, body, *, *::before, *::after {
            -webkit-user-select: initial !important;
            user-select: initial !important;
        }
    `;
    document.documentElement.appendChild(style);

    // 2. Function to stop event propagation
    const stopEventPropagation = (event) => {
        event.stopPropagation();
        if (event.stopImmediatePropagation) {
            event.stopImmediatePropagation();
        }
    };

    // 3. Add event listeners for all relevant events
    const events = [
        'copy',        // Copy event
        'cut',         // Cut event
        'contextmenu', // Right-click menu
        'selectstart', // Start selection
        'mousedown',   // Mouse down
        'mouseup',     // Mouse up
        'mousemove',   // Mouse move
        'keydown',     // Key down
        'keypress',    // Key press
        'keyup'        // Key up
    ];

    // 4. Add event listeners for each event
    events.forEach(eventType => {
        document.documentElement.addEventListener(eventType, stopEventPropagation, {
            capture: true  // Use capture phase to ensure events are handled first
        });
    });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.searchEngines) {
        const newEngines = changes.searchEngines.newValue;
        if (newEngines && Array.isArray(newEngines)) {
            engines = newEngines;
            // Remove existing toolbar if present
            const existingToolbar = document.querySelector('.easy-switch-toolbar');
            if (existingToolbar) {
                existingToolbar.remove();
            }
            // Create new toolbar with updated engines
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                createToolbar(engines);
            }
        }
    }
});

// Handle page restoration from bfcache
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page restored from bfcache, reinitialize
        console.log('Page restored from bfcache, reinitializing...');
        initialize();
    }
});

// Cleanup before page enters bfcache
window.addEventListener('pagehide', function(event) {
    if (event.persisted) {
        // Page entering bfcache, clean up
        console.log('Page entering bfcache, cleaning up...');
        // Clean up any timers or listeners
        Object.values(toolbarTimers).forEach(timer => {
            if (timer) {
                clearTimeout(timer);
            }
        });
    }
});

// Initialization function
function initialize() {
    // Load search engine configuration
    loadEngines().then(loadedEngines => {
        engines = loadedEngines;

        // Add text selection event listeners
        document.addEventListener('mouseup', handleTextSelection, true);
        document.addEventListener('keyup', handleTextSelection, true);

        // Monitor dynamic content changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    const toolbar = document.querySelector('.easy-switch-toolbar');
                    if (toolbar) {
                        // Ensure the toolbar is always on top
                        document.documentElement.appendChild(toolbar);
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Handle Shadow DOM
        function attachShadowListeners(node) {
            if (node.shadowRoot) {
                node.shadowRoot.addEventListener('mouseup', handleTextSelection, true);
                node.shadowRoot.addEventListener('keyup', handleTextSelection, true);
            }

            // Monitor new Shadow DOM creation
            const shadowObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.shadowRoot) {
                                attachShadowListeners(node);
                            }
                        }
                    });
                });
            });

            shadowObserver.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }

        // Handle existing Shadow DOM at initialization
        document.querySelectorAll('*').forEach(node => {
            if (node.shadowRoot) {
                attachShadowListeners(node);
            }
        });
    });
}

// Start initialization
initialize();