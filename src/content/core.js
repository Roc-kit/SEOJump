(() => {
  const app = globalThis.SEOJumpContent = globalThis.SEOJumpContent || {};

  app.state = {
    engines: [],
    toolbar: null,
    mainObserver: null,
    shadowObserver: null,
    initialized: false,
    modifierPressed: false,
    selectionStartedWithModifier: false,
    settings: { ...SEOJumpSettings.DEFAULTS }
  };

  app.isReddit = (() => {
    try {
      return location.hostname.endsWith('reddit.com');
    } catch (_) {
      return false;
    }
  })();

  app.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  app.loadEngines = async function loadEngines() {
    try {
      const storage = await chrome.storage.local.get('searchEngines');
      if (Array.isArray(storage.searchEngines)) return storage.searchEngines;

      const response = await fetch(chrome.runtime.getURL('config/default-engines.json'));
      if (!response.ok) throw new Error(`Failed to load default config: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Default config must be an array');

      const formatted = data.map(category => ({
        ...category,
        engines: (category.engines || []).map(engine => ({
          ...engine,
          favicon: app.validateFavicon(engine.favicon) ? engine.favicon : ''
        }))
      }));
      await chrome.storage.local.set({ searchEngines: formatted });
      return formatted;
    } catch (error) {
      console.error('[SEOJump] Failed to load tools:', error);
      return [];
    }
  };

  app.validateFavicon = function validateFavicon(favicon) {
    if (!favicon) return false;
    try {
      if (favicon.startsWith('data:image')) {
        const [header, content] = favicon.split(',');
        return Boolean(header?.includes(';base64') && content);
      }
      if (favicon.startsWith('http')) {
        new URL(favicon);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  };

  app.loadIconFromCache = async function loadIconFromCache(domain) {
    try {
      const key = `favicon_${domain}`;
      const result = await chrome.storage.local.get(key);
      const cached = result[key];
      if (typeof cached === 'string' && cached.startsWith('data:image')) return cached;
      if (!cached || typeof cached !== 'object') return null;
      const maxAge = 30 * 24 * 60 * 60 * 1000;
      if (!cached.data?.startsWith('data:image') || Date.now() - Number(cached.fetchedAt || 0) > maxAge) {
        return null;
      }
      return cached.data;
    } catch (_) {
      return null;
    }
  };

  app.saveIconToCache = async function saveIconToCache(domain, iconData, source = 'unknown') {
    if (!iconData?.startsWith('data:image')) return;
    try {
      await chrome.storage.local.set({
        [`favicon_${domain}`]: {
          data: iconData,
          source,
          fetchedAt: Date.now()
        },
        [`favicon_miss_${domain}`]: null
      });
    } catch (error) {
      console.warn('[SEOJump] Failed to cache favicon:', error);
    }
  };

  app.getChromeFaviconUrl = function getChromeFaviconUrl(domain) {
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', `https://${domain}/`);
    url.searchParams.set('size', '32');
    return url.toString();
  };

  async function hasRecentFaviconMiss(domain) {
    try {
      const key = `favicon_miss_${domain}`;
      const result = await chrome.storage.local.get(key);
      const timestamp = Number(result[key] || 0);
      return timestamp > 0 && Date.now() - timestamp < 6 * 60 * 60 * 1000;
    } catch (_) {
      return false;
    }
  }

  async function markFaviconMiss(domain) {
    try {
      await chrome.storage.local.set({ [`favicon_miss_${domain}`]: Date.now() });
    } catch (_) {}
  }

  app.getFavicon = async function getFavicon(engine) {
    const fallback = chrome.runtime.getURL('icons/icon32.png');
    if (!engine?.url) return fallback;
    if (app.validateFavicon(engine.favicon)) return engine.favicon;

    try {
      const domain = new URL(engine.url.trim()).hostname;
      const cached = await app.loadIconFromCache(domain);
      if (cached) return cached;

      if (await hasRecentFaviconMiss(domain)) return app.getChromeFaviconUrl(domain);

      const response = await chrome.runtime.sendMessage({ type: 'getFavicon', domain });
      if (response?.success && response.iconData?.startsWith('data:image')) {
        await app.saveIconToCache(domain, response.iconData, response.source);
        return response.iconData;
      }
      await markFaviconMiss(domain);
      return app.getChromeFaviconUrl(domain);
    } catch (error) {
      console.warn('[SEOJump] Failed to load favicon:', error);
    }
    return fallback;
  };

  app.getSelectionText = function getSelectionText(event) {
    const selection = window.getSelection();
    let text = (selection?.toString() || '').trim();
    if (!text && !app.isReddit && event?.target?.shadowRoot) {
      text = (event.target.shadowRoot.getSelection?.()?.toString() || '').trim();
    }
    return text;
  };

  app.processRuntimePlaceholders = function processRuntimePlaceholders(value) {
    return String(value || '')
      .replace(/%currentUrl%/g, location.href)
      .replace(/%currentDomain%/g, location.hostname)
      .replace(/%selectedText%/g, (window.getSelection()?.toString() || '').trim());
  };
})();
