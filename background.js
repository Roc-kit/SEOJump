// Background script for the extension, responsible for handling core functionality

// Update context menus function
async function updateContextMenus(settings) {
    try {
        // Remove all existing context menu items first
        await chrome.contextMenus.removeAll();

        // Validate settings
        if (!settings || !Array.isArray(settings)) {
            console.error('Invalid settings:', settings);
            return;
        }

        // Create menu items for each category and search engine
        for (const [categoryIndex, category] of settings.entries()) {
            // Skip if category is disabled or has no search engines
            if (category.disable || !category.engines || category.engines.length === 0) {
                continue;
            }

            // Create main menu item for category
            const categoryId = `category_${categoryIndex}`;
            await chrome.contextMenus.create({
                id: categoryId,
                title: category.name,
                contexts: ['selection']  // Only show when text is selected
            });

            // Create sub-menu items for each enabled search engine
            for (const [engineIndex, engine] of category.engines.entries()) {
                if (!engine.disable) {
                    await chrome.contextMenus.create({
                        id: `category_${categoryIndex}_engine_${engineIndex}`,
                        parentId: categoryId,
                        title: engine.name,
                        contexts: ['selection']
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error updating context menus:', error);
    }
}

// Parse special parameters from URL
function parseSpecialParams(url) {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    const specialParams = {};

    // Check if advanced feature flags are present
    if (params.has('__ess_start')) {
        specialParams.hasAdvanced = true;
        
        if (params.has('__delay')) {
            specialParams.delay = parseInt(params.get('__delay')) || 0;
        }

        if (params.has('__incognito')) {
            specialParams.incognito = params.get('__incognito') === 'true';
        }

        if (params.has('__input')) {
            specialParams.inputSelector = params.get('__input');
        }

        if (params.has('__submit')) {
            specialParams.submitSelector = params.get('__submit');
        }

        if (params.has('__bruteAction')) {
            specialParams.bruteSelector = params.get('__bruteAction');
        }

        if (params.has('__text')) {
            specialParams.text = params.get('__text');
        }
    }

    return specialParams;
}

// Clean special parameters from URL
function cleanUrl(url) {
    const cleaned = url
        // Remove __ess_start parameter
        .replace(/[?&]__ess_start(&|$)/, (match, p1) => p1 === '&' ? '&' : '')
        // Remove other special parameters
        .replace(/[?&]__delay=[^&]*/g, '')
        .replace(/[?&]__incognito=[^&]*/g, '')
        .replace(/[?&]__input=[^&]*/g, '')
        .replace(/[?&]__submit=[^&]*/g, '')
        .replace(/[?&]__bruteAction=[^&]*/g, '')
        .replace(/[?&]__text=[^&]*/g, '')
        // Clean up excess connectors
        .replace(/\?&/, '?')
        .replace(/&&/g, '&')
        .replace(/[?&]$/, '');
    
    return cleaned;
}

// Handle placeholder replacement
function processPlaceholders(url, text, context = {}) {
    return url.replace(/%selectedText%/g, encodeURIComponent(text))
              .replace(/%currentUrl%/g, context.currentUrl || '')
              .replace(/%currentDomain%/g, context.currentDomain || '');
}

// Handle search request
async function handleSearch(url, text, context = {}, inBackground = false) {
    try {
        // Parse special parameters
        const specialParams = parseSpecialParams(url);

        // Save original text for sending to content script
        let originalText = specialParams.text || text;
        // Replace placeholders in text
        if (originalText.includes('%selectedText%')) {
            originalText = text;
        }

        // Clean URL
        url = cleanUrl(url);

        // Replace placeholders (using encoded text in URL)
        url = processPlaceholders(url, text, context);

        // Check if need to open in incognito window
        if (specialParams.hasAdvanced && specialParams.incognito) {
            // Create incognito window
            chrome.windows.create({
                url: url,
                incognito: true,
                focused: !inBackground,
                state: "maximized"
            });
            return;
        }

        // Check if need to open in new window
        if (specialParams.hasAdvanced && specialParams.__newWindow) {
            chrome.windows.create({
                url: url,
                focused: !inBackground
            });
            return;
        }

        // Get current window
        const currentWindow = await chrome.windows.getCurrent();

        // Open in new tab
        chrome.tabs.create({
            url: url,
            active: !inBackground,
            windowId: currentWindow.id
        });

        // If advanced feature parameters exist, send message to content script
        if (specialParams.hasAdvanced) {
            // Define retry count and delay
            const maxRetries = 3;
            const retryDelay = 1000;
            let retryCount = 0;

            // Create function to send message
            const sendMessageWithRetry = async (tabId) => {
                try {
                    const response = await new Promise((resolve, reject) => {
                        chrome.tabs.sendMessage(tabId, {
                            type: 'processAdvancedFeatures',
                            params: {
                                ...specialParams,
                                text: originalText
                            }
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError);
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    return true;
                } catch (error) {
                    if (retryCount < maxRetries - 1) {
                        retryCount++;
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        return sendMessageWithRetry(tabId);
                    }
                    return false;
                }
            };

            // Wait for new tab to load and send message
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
                const targetHostname = new URL(url).hostname;

                // When page starts loading, execute immediately without extra delay
                if ((changeInfo.status === 'loading' || changeInfo.status === 'complete') && 
                    tab.url && 
                    new URL(tab.url).hostname === targetHostname) {
                    
                    // Execute immediately without extra delay
                    sendMessageWithRetry(tabId).then(() => {
                        chrome.tabs.onUpdated.removeListener(listener);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error in handleSearch:', error);
        throw error;
    }
}



// API testing state
let availableApi = null;
let apiTestPromise = null;

// Test single API with privacy protection
async function testSingleApi(apiTemplate, testDomain) {
    try {
        const testUrl = apiTemplate.replace('${domain}', testDomain);
        const response = await fetch(testUrl, {
            referrerPolicy: 'no-referrer',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            return false;
        }

        const blob = await response.blob();
        return blob.type.startsWith('image/');
    } catch (error) {
        console.warn('API test error:', error);
        return false;
    }
}

// Test API availability
async function testApiAvailability() {
    if (apiTestPromise) {
        return apiTestPromise;
    }

    if (availableApi) {
        return availableApi;
    }

    apiTestPromise = new Promise(async (resolve) => {
        const testDomain = 'www.google.com';
        const apiTemplates = [
            'https://www.google.com/s2/favicons?domain=${domain}&sz=32',
            'https://favicon.yandex.net/favicon/v2/${domain}?size=32',
            'https://external-content.duckduckgo.com/ip3/${domain}'
        ];

        for (const api of apiTemplates) {
            const isWorking = await testSingleApi(api, testDomain);
            if (isWorking) {
                availableApi = api;
                resolve(api);
                return;
            }
        }

        console.warn('No working favicon API found');
        resolve(null);
    });

    try {
        const result = await apiTestPromise;
        apiTestPromise = null;
        return result;
    } catch (error) {
        console.error('API test error:', error);
        apiTestPromise = null;
        return null;
    }
}

// Handle favicon request
async function handleFaviconRequest(domain) {
    try {
        const api = await testApiAvailability();
        if (!api) {
            return { success: false };
        }

        const iconUrl = api.replace('${domain}', domain);
        const response = await fetch(iconUrl, {
            referrerPolicy: 'no-referrer',
            credentials: 'omit',
            headers: {
                'Accept': 'image/*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const iconData = await blobToBase64(blob);

        return { 
            success: true, 
            iconData: iconData 
        };
    } catch (error) {
        console.warn('Error fetching favicon:', error);
        return { success: false };
    }
}

// Convert Blob to Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}


// Event listener triggered when the extension is installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
    // Clean up old logs
    await chrome.storage.local.remove(['operationLogs']);

    // Only open the official website during first installation
    if (details.reason === 'install') {
        chrome.tabs.create({
            url: 'https://SearchEngines.cc'
        });
    }

    try {
        // Get search engine settings from Chrome storage
        const data = await chrome.storage.local.get(['searchEngines']);

        // If no saved settings found, load default configuration
        if (!data.searchEngines) {
            // Read default search engine settings from config file
            const response = await fetch(chrome.runtime.getURL('config/default-engines.json'));
            const defaultSettings = await response.json();
            // Save default settings to Chrome storage
            await chrome.storage.local.set({ 'searchEngines': defaultSettings });
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Listen for storage changes
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.searchEngines) {
        try {
            await updateContextMenus(changes.searchEngines.newValue);
        } catch (error) {
            console.error('Error updating context menus:', error);
        }
    }
});


// Handle context menu click event
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
        // Ensure click is on a search engine menu item
        if (!info.menuItemId.startsWith('category_')) {
            return;
        }

        // Extract indices using regular expression
        const matches = info.menuItemId.match(/category_(\d+)_engine_(\d+)/);
        if (!matches) {
            console.error('Invalid menu item ID format:', info.menuItemId);
            return;
        }

        const [_, categoryIndex, engineIndex] = matches;
        
        // Get current search engine settings
        const data = await chrome.storage.local.get(['searchEngines']);
        const settings = data.searchEngines;

        // Validate settings and indices
        if (!settings || 
            !settings[categoryIndex] || 
            !settings[categoryIndex].engines || 
            !settings[categoryIndex].engines[engineIndex]) {
            console.error('Invalid engine indices:', {
                categoryIndex,
                engineIndex,
                settingsExists: !!settings,
                categoryExists: settings && !!settings[categoryIndex],
                enginesExists: settings && settings[categoryIndex] && !!settings[categoryIndex].engines
            });
            return;
        }

        // Get search engine
        const engine = settings[categoryIndex].engines[engineIndex];
        if (!engine || engine.disable) {
            console.error('Engine not found or disabled:', {
                categoryIndex,
                engineIndex,
                engineExists: !!engine,
                engineDisabled: engine && engine.disable
            });
            return;
        }

        // Get context information
        const context = {
            currentUrl: tab.url,
            currentDomain: new URL(tab.url).hostname
        };

        // Perform search
        await handleSearch(engine.url, info.selectionText, context);
    } catch (error) {
        console.error('Error handling context menu click:', error);
    }
});


// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle settings update message
    if (message.type === 'settingsUpdated') {
        updateContextMenus(message.searchEngines);
        sendResponse({ success: true });
    } 
    // Handle request to open options page
    else if (message.action === 'openOptionsPage') {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
    }
    // Handle search request
    else if (message.type === 'performSearch') {
        handleSearch(message.url, message.text, message.context, message.inBackground);
        sendResponse({ success: true });
    }
    // Handle favicon request
    else if (message.type === 'getFavicon') {
        handleFaviconRequest(message.domain)
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                console.error('Favicon request error:', error);
                sendResponse({ success: false });
            });
        return true; // Keep message channel open for async response
    }
    // If no matching message type, send response
    else {
        sendResponse({ success: false, error: 'Unknown message type' });
    }
});


// Initialize context menus when extension starts
chrome.storage.local.get(['searchEngines'], async function(result) {
    if (result.searchEngines) {
        try {
            await updateContextMenus(result.searchEngines);
        } catch (error) {
            console.error('Error initializing context menus:', error);
        }
    }
});

// Initialize API testing
testApiAvailability();
