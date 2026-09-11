(() => {
  const app = globalThis.SEOJumpBackground = globalThis.SEOJumpBackground || {};
  const ADVANCED_MARKERS = ['__seojump_start', '__ess_start'];

  app.processPlaceholders = function processPlaceholders(value, text, context = {}) {
    return String(value || '')
      .replace(/%selectedText%/g, text || '')
      .replace(/%currentUrl%/g, context.currentUrl || '')
      .replace(/%currentDomain%/g, context.currentDomain || '');
  };

  function getAdvancedMarker(url) {
    return ADVANCED_MARKERS.find(marker => url.includes(marker)) || '';
  }

  function readAdvancedParam(source, name) {
    const match = source.match(new RegExp(`${name}=([^&]+)`));
    if (!match) return '';
    try {
      return decodeURIComponent(match[1]);
    } catch (_) {
      return match[1];
    }
  }

  app.parseSpecialParams = function parseSpecialParams(url) {
    const marker = getAdvancedMarker(url);
    const params = {
      hasAdvanced: Boolean(marker),
      marker,
      delay: 0,
      incognito: false,
      newWindow: false,
      inputSelector: '',
      submitSelector: '',
      bruteSelector: '',
      text: ''
    };
    if (!marker) return params;

    const source = url.split(marker)[1] || '';
    params.delay = Number.parseInt(readAdvancedParam(source, '__delay'), 10) || 0;
    params.incognito = readAdvancedParam(source, '__incognito') === 'true';
    params.newWindow = readAdvancedParam(source, '__newWindow') === 'true';
    params.inputSelector = readAdvancedParam(source, '__input');
    params.submitSelector = readAdvancedParam(source, '__submit');
    params.bruteSelector = readAdvancedParam(source, '__bruteAction');
    params.text = readAdvancedParam(source, '__text');
    return params;
  };

  app.cleanAdvancedParams = function cleanAdvancedParams(url) {
    const marker = getAdvancedMarker(url);
    if (!marker) return url;
    const markerIndex = url.indexOf(marker);
    const delimiterIndex = markerIndex > 0 && ['?', '&'].includes(url[markerIndex - 1])
      ? markerIndex - 1
      : markerIndex;
    return url.slice(0, delimiterIndex);
  };

  function waitForTabComplete(tabId, timeout = 15000) {
    return new Promise(resolve => {
      let finished = false;
      const finish = value => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(value);
      };
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') finish(true);
      };
      const timer = setTimeout(() => finish(false), timeout);
      chrome.tabs.onUpdated.addListener(listener);
      chrome.tabs.get(tabId).then(tab => {
        if (tab.status === 'complete') finish(true);
      }).catch(() => finish(false));
    });
  }

  async function sendMessageWithRetry(tabId, message, attempts = 8, delay = 350) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError || new Error('Content script unavailable');
  }

  async function runAdvancedAction(tabId, params) {
    await waitForTabComplete(tabId);
    await sendMessageWithRetry(tabId, { type: 'advancedPing' });
    const response = await sendMessageWithRetry(tabId, {
      type: 'processAdvancedFeatures',
      params
    });
    if (response?.success === false) {
      throw new Error(response.error || 'Advanced Action failed');
    }
    return response;
  }

  app.handleSearch = async function handleSearch(urlTemplate, text, context = {}, inBackground = false) {
    const special = app.parseSpecialParams(urlTemplate);
    const cleanTemplate = app.cleanAdvancedParams(urlTemplate);
    const targetUrl = app.processPlaceholders(cleanTemplate, text, context);
    const actionText = app.processPlaceholders(special.text || text, text, context);

    if (special.incognito) {
      await chrome.windows.create({
        url: targetUrl,
        incognito: true,
        focused: !inBackground,
        state: 'maximized'
      });
      return;
    }

    if (special.newWindow) {
      await chrome.windows.create({ url: targetUrl, focused: !inBackground });
      return;
    }

    const currentWindow = await chrome.windows.getCurrent();
    const tab = await chrome.tabs.create({
      url: targetUrl,
      active: !inBackground,
      windowId: currentWindow.id
    });

    const needsDomAction = special.hasAdvanced &&
      (special.inputSelector || special.submitSelector || special.bruteSelector || special.delay);
    if (!needsDomAction || !tab.id) return;

    try {
      await runAdvancedAction(tab.id, { ...special, text: actionText });
    } catch (error) {
      console.warn('[SEOJump] Advanced Action failed:', error);
    }
  };
})();
