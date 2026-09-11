
// Content Script - Revised to avoid Reddit SPA freezes while preserving functionality

// =========================
// Global state & utilities
// =========================
let engines = [];
const toolbarTimers = { showTimer: null, hideTimer: null };
let toolbar = null;
let mainObserver = null;
let shadowObserver = null;
let initialized = false;

const isReddit = (() => {
  try {
    return location.hostname.endsWith('reddit.com');
  } catch (_) {
    return false;
  }
})();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function dispatchEvent(element, eventType, options = {}) {
  const defaults = { bubbles: true, cancelable: true, view: window, detail: 1 };
  const eventOptions = { ...defaults, ...options };
  let event;

  if (eventType.startsWith('mouse')) {
    event = new MouseEvent(eventType, { ...eventOptions, screenX:0, screenY:0, clientX:0, clientY:0, button:0, buttons:1 });
  } else if (eventType.startsWith('pointer')) {
    event = new PointerEvent(eventType, { ...eventOptions, pointerId:1, width:1, height:1, pressure:0.5, tiltX:0, tiltY:0, pointerType:'mouse', isPrimary:true });
  } else if (eventType.startsWith('touch')) {
    const touch = new Touch({ identifier:1, target:element, clientX:0, clientY:0, screenX:0, screenY:0, pageX:0, pageY:0, radiusX:1, radiusY:1, rotationAngle:0, force:1 });
    event = new TouchEvent(eventType, { ...eventOptions, touches:[touch], targetTouches:[touch], changedTouches:[touch] });
  } else {
    event = new Event(eventType, eventOptions);
  }
  element.dispatchEvent(event);
  return event;
}

// =========================
// Config load & favicon
// =========================
async function loadEngines() {
  try {
    const storage = await chrome.storage.local.get('searchEngines');
    if (storage.searchEngines && Array.isArray(storage.searchEngines)) return storage.searchEngines;

    const defaultConfigUrl = chrome.runtime.getURL('config/default-engines.json');
    const res = await fetch(defaultConfigUrl);
    if (!res.ok) throw new Error(`Failed to load default config: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Default config should be an array');

    const formatted = data.map(category => ({
      ...category,
      engines: category.engines.map(engine => ({ ...engine, favicon: validateFavicon(engine.favicon) ? engine.favicon : '' }))
    }));
    await chrome.storage.local.set({ searchEngines: formatted });
    return formatted;
  } catch (e) {
    console.error('Error loading engines:', e);
    return [];
  }
}

async function loadIconFromCache(domain){ try{ const k=`favicon_${domain}`; const r=await chrome.storage.local.get(k); const c=r[k]; return (c && typeof c==='string' && c.startsWith('data:image'))?c:null; }catch(e){ console.warn('Failed to load icon from cache:',e); return null; } }
async function saveIconToCache(domain, iconData){ if(!iconData || !iconData.startsWith('data:image')) return; try{ const k=`favicon_${domain}`; await chrome.storage.local.set({[k]:iconData}); }catch(e){ console.warn('Failed to save icon to cache:',e); } }
function validateFavicon(favicon){ if(!favicon) return false; try{ if(favicon.startsWith('data:image')){ const [h,c]=favicon.split(','); return h.includes(';base64') && c; } if(favicon.startsWith('http')){ new URL(favicon); return true; } return false; }catch(e){ console.warn('Invalid favicon format:', favicon); return false; } }
async function getFavicon(engine){
  if(!engine?.url) return chrome.runtime.getURL('icons/icon32.png');
  if(engine.favicon && validateFavicon(engine.favicon)) return engine.favicon;
  try{
    const url = new URL(engine.url.trim());
    const domain = url.hostname;
    const cached = await loadIconFromCache(domain);
    if (cached) return cached;
    try{
      const resp = await chrome.runtime.sendMessage({ type:'getFavicon', domain });
      if (resp?.success && resp.iconData?.startsWith('data:image')){
        await saveIconToCache(domain, resp.iconData);
        return resp.iconData;
      }
    }catch(e){ console.warn('Error fetching favicon:', e); }
    return chrome.runtime.getURL('icons/icon32.png');
  }catch(e){ console.warn('Error getting favicon:', e); return chrome.runtime.getURL('icons/icon32.png'); }
}

// =========================
// Toolbar creation & UI
// =========================
function createSearchButton(engine){
  const button = document.createElement('button');
  button.className = 'search-engine-button';
  button.dataset.url = engine.url;

  const icon = document.createElement('img');
  icon.className = 'search-engine-icon';
  icon.src = chrome.runtime.getURL('icons/icon32.png');
  getFavicon(engine).then(iconUrl => { icon.src = iconUrl; }).catch(e=>console.warn('Error loading favicon:',e));

  const name = document.createElement('span');
  name.className = 'search-engine-name';
  name.textContent = engine.name;

  button.appendChild(icon);
  button.appendChild(name);
  return button;
}

function createCategoryButton(category, engines){
  const container = document.createElement('div');
  container.className = 'search-category-container';

  const button = document.createElement('button');
  button.className = 'search-category-button';
  button.dataset.category = category;

  if (engines.length > 0){
    const firstEngine = engines[0];
    const icon = document.createElement('img');
    icon.className = 'search-engine-icon';
    getFavicon(firstEngine).then(u=>{ icon.src=u; }).catch(e=>{ console.warn('Error loading category favicon:',e); icon.src = chrome.runtime.getURL('icons/icon32.png'); });
    button.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'search-engine-name';
    name.textContent = category;
    button.appendChild(name);
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'search-engines-dropdown';
  engines.forEach(engine => {
    if (!engine.disable) dropdown.appendChild(createSearchButton(engine));
  });

  container.appendChild(button);
  container.appendChild(dropdown);
  return container;
}

function createToolbar(categories){
  const tb = document.createElement('div');
  tb.id = 'search-toolbar';
  tb.className = 'easy-switch-toolbar';
  // Use z-index and fixed positioning instead of re-appending on every mutation.
  tb.style.cssText = `
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    top: 12px;
    z-index: 2147483647; /* keep on top without DOM churn */
    display: none;
  `;

  if (!Array.isArray(categories)) return tb;

  categories.forEach(category => {
    if (!category?.name || !Array.isArray(category.engines)) return;
    if (category.disable) return;
    const enabled = category.engines.filter(e => !e.disable);
    if (enabled.length === 0) return;
    try { tb.appendChild(createCategoryButton(category.name, enabled)); }
    catch(e){ console.error(`Error creating category button for ${category.name}:`, e); }
  });

  return tb;
}

// =========================
// Selection & actions
// =========================
function processPlaceholders(text){
  const currentUrl = location.href;
  const currentDomain = location.hostname;
  const selectedText = (window.getSelection()?.toString() || '').trim();
  return text.replace(/%currentUrl%/g, currentUrl)
             .replace(/%currentDomain%/g, currentDomain)
             .replace(/%selectedText%/g, selectedText);
}

async function handleSearchButtonClick(button, selectedText, event){
  try{
    if (selectedText && button.dataset.url){
      chrome.runtime.sendMessage({
        type: 'performSearch',
        url: button.dataset.url,
        text: selectedText,
        context: { currentUrl: location.href, currentDomain: location.hostname },
        inBackground: event.ctrlKey
      });
    }
  }catch(e){ console.error('Error handling search button click:', e); }
}

function attachToolbarEvents(tb){
  tb.querySelectorAll('.search-category-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selectedText = (window.getSelection()?.toString() || '').trim();
      if (selectedText){
        const container = button.closest('.search-category-container');
        const firstEngine = container.querySelector('.search-engines-dropdown .search-engine-button');
        if (firstEngine) handleSearchButtonClick(firstEngine, selectedText, e);
      }
    }, { passive: true });
  });

  tb.querySelectorAll('.search-engine-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selectedText = (window.getSelection()?.toString() || '').trim();
      if (selectedText) handleSearchButtonClick(button, selectedText, e);
    }, { passive: true });
  });

  tb.querySelectorAll('.search-category-container').forEach(container => {
    const dropdown = container.querySelector('.search-engines-dropdown');
    container.addEventListener('mouseenter', () => { hideAllDropdowns(); dropdown.style.display = 'block'; }, { passive: true });
    container.addEventListener('mouseleave', () => { dropdown.style.display = 'none'; }, { passive: true });
  });
}

function hideAllDropdowns(){
  document.querySelectorAll('.search-engines-dropdown').forEach(d => { d.style.display = 'none'; });
}

// =========================
// Input helpers (unchanged behavior)
// =========================
async function simulateEnterKey(element, options = {}) {
  try{
    const keyEventInit = { bubbles:true, cancelable:true, key:'Enter', code:'Enter', keyCode:13, which:13, location:0, repeat:false, isComposing:false, ...options };
    const keydownEvent = new KeyboardEvent('keydown', keyEventInit);
    const keydownResult = element.dispatchEvent(keydownEvent);
    await sleep(100);
    if (keydownResult && !keydownEvent.defaultPrevented) {
      element.dispatchEvent(new KeyboardEvent('keypress', keyEventInit));
      await sleep(100);
      if (element.form){
        let isCustomSubmit = false;
        const submitHandler = (e) => { if (e.defaultPrevented) isCustomSubmit = true; };
        element.form.addEventListener('submit', submitHandler, { once:true });
        const submitEvent = new Event('submit', { bubbles:true, cancelable:true, composed:true });
        element.form.dispatchEvent(submitEvent);
        await sleep(200);
        if (!isCustomSubmit){
          const submitButton = element.form.querySelector('button[type="submit"], input[type="submit"]');
          if (submitButton && submitButton !== element){ submitButton.click(); await sleep(100); }
        }
      } else if (element.tagName === 'TEXTAREA'){
        element.dispatchEvent(new Event('input', { bubbles:true }));
        await sleep(50);
        element.dispatchEvent(new Event('change', { bubbles:true }));
        await sleep(50);
      }
      element.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));
      await sleep(100);
    }
  }catch(e){ console.error('[Error] Error in simulateEnterKey:', e); throw e; }
}

async function handleInput(element, text){
  try{
    if (!element) return;
    const interactionEvents = ['pointerover','pointerenter','pointerdown','mouseover','mouseenter','mousedown','touchstart'];
    for (const t of interactionEvents) dispatchEvent(element, t);

    element.dispatchEvent(new FocusEvent('focusin', { bubbles:true }));
    element.dispatchEvent(new Event('focus', { bubbles:true }));

    if (document.body.contains(element)){
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const lastValue = element.value;
    if (/INPUT|TEXTAREA/i.test(element.nodeName)){
      const nativeSetter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value').set;
      nativeSetter.call(element, text);
    } else if (element.contentEditable === 'true'){
      element.dispatchEvent(new InputEvent('beforeinput', { inputType:"insertText", data:text, bubbles:true }));
      element.textContent = text;
    }

    const beforeInputEvent = new InputEvent('beforeinput', { bubbles:true, cancelable:true, inputType:'insertText', data:text });
    element.dispatchEvent(beforeInputEvent);

    const inputEvent = new InputEvent('input', { bubbles:true, cancelable:false, inputType:'insertText', data:text });
    const valueTracker = element._valueTracker;
    if (valueTracker) valueTracker.setValue(lastValue);
    element.dispatchEvent(inputEvent);

    const changeEvent = new Event('change', { bubbles:true, cancelable:false });
    element.dispatchEvent(changeEvent);

    element.focus();

    const keyEventInit = { bubbles:true, cancelable:true, key:'Process', code:'Process', keyCode:229, which:229, composed:true };
    ['keydown','keypress','keyup'].forEach(t => element.dispatchEvent(new KeyboardEvent(t, keyEventInit)));

    const endEvents = ['touchend','pointerup','pointerout','pointerleave','mouseup','mouseout','mouseleave'];
    for (const t of endEvents) dispatchEvent(element, t);
  }catch(e){ console.error('Error in handleInput:', e); throw e; }
}

async function handleSubmit(element){
  try{
    if (!element) return;
    const form = element.form;
    if (form){
      const formAction = form.action;
      const originalAction = form.getAttribute('action');
      const isDefaultAction = !originalAction || originalAction === '' || originalAction === '#' || originalAction === location.href || originalAction === location.pathname;
      const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
      const formInfo = { action: formAction, method: form.method, target: form.target, isDefaultAction, hasSubmitButton: !!submitButton };
      void formInfo;
    }

    const startEvents = ['pointerover','pointerenter','pointerdown','mouseover','mouseenter','mousedown','touchstart'];
    for (const t of startEvents){ dispatchEvent(element, t); await sleep(10); }

    const hasClickHandler = element.onclick || element.getAttribute('onclick') || element.click !== HTMLElement.prototype.click;
    if (hasClickHandler){ if (element.click) element.click(); else dispatchEvent(element, 'click'); } else { dispatchEvent(element, 'click'); }
    await sleep(100);

    const endEvents = ['touchend','pointerup','pointerout','pointerleave','mouseup','mouseout','mouseleave'];
    for (const t of endEvents){ dispatchEvent(element, t); await sleep(10); }

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA'){
      dispatchEvent(element, 'input'); await sleep(50);
      dispatchEvent(element, 'change'); await sleep(50);
    }

    if (element.form){
      let isCustomSubmit = false;
      const submitHandler = (e)=>{ if (e.defaultPrevented) isCustomSubmit = true; };
      element.form.addEventListener('submit', submitHandler, { once:true });
      const submitEvent = new Event('submit', { bubbles:true, cancelable:true, composed:true });
      element.form.dispatchEvent(submitEvent);
      await sleep(200);
      if (!isCustomSubmit){
        const submitButton = element.form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton && submitButton !== element){ submitButton.click(); await sleep(100); }
      }
    }
  }catch(e){ console.error('[Error] Error in handleSubmit:', e); throw e; }
}

async function handleBruteMode(selector, text){
  try{
    const elements = document.querySelectorAll(selector);
    const childElements = [];
    elements.forEach(el => { childElements.push(...el.querySelectorAll('input, textarea, [contenteditable="true"]')); });
    const inputElements = [...elements, ...childElements].filter(el =>
      el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true'
    );
    for (const element of inputElements){
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      try{
        element.focus(); await sleep(200);
        element.value = ''; await sleep(200);
        element.value = text; await sleep(200);
        dispatchEvent(element, 'input'); dispatchEvent(element, 'change');
        await sleep(500);
        await simulateEnterKey(element);
        await sleep(800);
      }catch(e){ console.error('[Error] Input operation failed:', e); continue; }
    }
    const clickableElements = [...elements].filter(el => el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button');
    for (const element of clickableElements){ try{ await handleSubmit(element); } catch(e){ console.error('[Error] Click operation failed:', e); } }
  }catch(e){ console.error('[Error] Error in handleBruteMode:', e); throw e; }
}

async function processAdvancedFeatures(params){
  try{
    if (params.delay) await sleep(params.delay);
    let text = params.text || (window.getSelection()?.toString() || '').trim();
    text = processPlaceholders(text);
    if (params.bruteSelector){ await handleBruteMode(params.bruteSelector, text); return; }
    if (params.inputSelector){
      const inputElement = await waitForElement(params.inputSelector);
      if (inputElement){
        await handleInput(inputElement, text);
        await sleep(200);
        if ('submitSelector' in params){
          if (params.submitSelector){
            const submitElement = await waitForElement(params.submitSelector);
            if (submitElement) await handleSubmit(submitElement);
            else await simulateEnterKey(inputElement);
          } else {
            await simulateEnterKey(inputElement);
          }
        }
      }
    }
  }catch(e){ console.error('[Error] Error processing advanced features:', e); }
}

// =========================
// Element wait helpers
// =========================
async function waitForElement(selectorOrFn, { timeout = 5000, interval = 100, retries = 2 } = {}){
  return new Promise((resolve) => {
    let currentRetry = 0;
    const attemptFind = () => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (Date.now() - startTime >= timeout){
          clearInterval(checkInterval);
          if (currentRetry < retries){ currentRetry++; attemptFind(); return; }
          resolve(null); return;
        }
        let element = null;
        try{
          if (typeof selectorOrFn === 'string'){
            const elements = document.querySelectorAll(selectorOrFn);
            if (elements.length > 0){
              for (const el of elements){
                const style = getComputedStyle(el);
                if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'){ element = el; break; }
              }
              if (!element) element = elements[0];
            }
          } else if (typeof selectorOrFn === 'function'){ element = selectorOrFn(); }
        }catch(e){ console.error('Error finding element:', e); }
        if (element){ clearInterval(checkInterval); resolve(element); }
      }, interval);
    };
    attemptFind();
  });
}

async function waitForElementHide(selectorOrFn, { timeout = 5000, interval = 100 } = {}){
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startTime >= timeout){ clearInterval(timer); resolve(false); return; }
      let element = null;
      try{ element = (typeof selectorOrFn === 'string') ? document.querySelector(selectorOrFn) : selectorOrFn(); }catch(e){ console.error('Error finding element:', e); }
      if (!element || element.offsetParent === null){ clearInterval(timer); resolve(true); }
    }, interval);
  });
}

// =========================
// Selection handler
// =========================
function handleTextSelection(e){
  try{
    const selection = window.getSelection();
    let selectedText = (selection?.toString() || '').trim();

    // No invasive Shadow DOM traversal on Reddit to avoid freezes.
    if (!selectedText && !isReddit && e?.target?.shadowRoot){
      const shadowSelection = e.target.shadowRoot.getSelection?.();
      if (shadowSelection) selectedText = (shadowSelection.toString() || '').trim();
    }

    if (!toolbar) return;

    const escHandler = (ev) => {
      if (ev.key === 'Escape' && toolbar.style.display !== 'none'){
        toolbar.classList.remove('visible');
        toolbar.style.display = 'none';
        window.getSelection().removeAllRanges();
        document.removeEventListener('keydown', escHandler);
      }
    };

    if (selectedText){
      toolbar.style.display = 'block';
      toolbar.classList.add('visible');

      // Position near selection after render
      requestAnimationFrame(() => {
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (!range) return;
        const rect = range.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const tbRect = toolbar.getBoundingClientRect();
        let top = rect.top - tbRect.height - 10;
        if (top < 10) top = rect.bottom + 10;
        if (top + tbRect.height > viewportH - 10) top = viewportH - tbRect.height - 10;
        const left = Math.min(Math.max(rect.left + (rect.width/2) - (tbRect.width/2), 10), viewportW - tbRect.width - 10);
        toolbar.style.top = `${top}px`;
        toolbar.style.left = `${left}px`;
      });

      document.removeEventListener('keydown', escHandler);
      document.addEventListener('keydown', escHandler, { passive: true });
    } else {
      toolbar.classList.remove('visible');
      toolbar.style.display = 'none';
      document.removeEventListener('keydown', escHandler);
    }
  }catch(err){
    console.error('Error in handleTextSelection:', err);
  }
}

// =========================
// Messaging & copy unlock
// =========================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'processAdvancedFeatures'){
    (async () => {
      try { await processAdvancedFeatures(message.params); sendResponse({ success:true }); }
      catch (e){ console.warn('Error processing advanced features:', e); sendResponse({ success:false, error:e.message }); }
    })();
    return true;
  } else if (message.type === 'enableCopy'){
    enableAllowCopy(); return true;
  }
  return false;
});

function enableAllowCopy(){
  const style = document.createElement('style');
  style.innerHTML = `html, body, *, *::before, *::after { -webkit-user-select: initial !important; user-select: initial !important; }`;
  document.documentElement.appendChild(style);

  const stopEventPropagation = (event) => {
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  };

  const events = ['copy','cut','contextmenu','selectstart','mousedown','mouseup','mousemove','keydown','keypress','keyup'];
  // Use capture but mark listeners as passive to avoid blocking.
  events.forEach(type => {
    document.documentElement.addEventListener(type, stopEventPropagation, { capture:true, passive:true });
  });
}

// =========================
// Initialization & observers
// =========================
function setupObservers(){
  // Throttled observer to avoid DOM churn; only ensure toolbar is attached once.
  if (mainObserver) mainObserver.disconnect();
  let pending = false;

  mainObserver = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    // Batch DOM reactions
    requestAnimationFrame(() => {
      try{
        if (toolbar && !document.documentElement.contains(toolbar)){
          document.documentElement.appendChild(toolbar);
        }
      } finally {
        pending = false;
      }
    });
  });

  // On reddit, keep the observer very light; elsewhere, still avoid subtree storms.
  const observeTarget = document.body || document.documentElement;
  mainObserver.observe(observeTarget, { childList: true, subtree: isReddit ? false : true });
}

function hookRedditNavigation(){
  // For Reddit SPA: listen to history changes and popstate to reset toolbar without heavy observers.
  if (!isReddit) return;
  const resetToolbar = () => {
    if (!toolbar) return;
    toolbar.style.display = 'none';
    toolbar.classList.remove('visible');
    hideAllDropdowns();
  };
  const _pushState = history.pushState;
  const _replaceState = history.replaceState;
  history.pushState = function(){ const r = _pushState.apply(this, arguments); resetToolbar(); return r; };
  history.replaceState = function(){ const r = _replaceState.apply(this, arguments); resetToolbar(); return r; };
  window.addEventListener('popstate', resetToolbar, { passive: true });
}

// Single entry point
async function initialize(){
  if (initialized) return;
  initialized = true;

  engines = await loadEngines();

  // Create toolbar once
  toolbar = createToolbar(engines);
  document.documentElement.appendChild(toolbar);
  attachToolbarEvents(toolbar);

  // Global selection listeners - passive and capture (as before) but lighter.
  document.addEventListener('mouseup', handleTextSelection, { capture:true, passive:true });
  document.addEventListener('keyup', handleTextSelection, { capture:true, passive:true });

  // Do NOT aggressively traverse/add listeners to all Shadow DOMs on Reddit.
  if (!isReddit){
    // Lightweight observer to attach listeners to *newly created* shadow roots without scanning entire DOM repeatedly.
    if (shadowObserver) shadowObserver.disconnect();
    shadowObserver = new MutationObserver((mutations) => {
      for (const m of mutations){
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.shadowRoot){
            node.shadowRoot.addEventListener('mouseup', handleTextSelection, true);
            node.shadowRoot.addEventListener('keyup', handleTextSelection, true);
          }
        });
      }
    });
    shadowObserver.observe(document.documentElement, { childList:true, subtree:true });
  }

  setupObservers();
  hookRedditNavigation();
}

// BFCache handling
window.addEventListener('pageshow', (event) => {
  if (event.persisted){ console.log('Page restored from bfcache, reinitializing...'); initialize(); }
}, { passive: true });

window.addEventListener('pagehide', (event) => {
  if (event.persisted){
    console.log('Page entering bfcache, cleaning up...');
    Object.values(toolbarTimers).forEach(t => { if (t) clearTimeout(t); });
  }
}, { passive: true });

// Kick off
initialize();

// Settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.searchEngines){
    const newEngines = changes.searchEngines.newValue;
    if (newEngines && Array.isArray(newEngines)){
      engines = newEngines;
      if (toolbar) toolbar.remove();
      toolbar = createToolbar(engines);
      document.documentElement.appendChild(toolbar);
      attachToolbarEvents(toolbar);
    }
  }
});
