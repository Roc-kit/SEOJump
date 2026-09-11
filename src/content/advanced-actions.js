(() => {
  const app = globalThis.SEOJumpContent;

  function dispatchSyntheticEvent(element, eventType, options = {}) {
    const defaults = { bubbles: true, cancelable: true, composed: true };
    let event;
    try {
      if (eventType.startsWith('mouse')) {
        event = new MouseEvent(eventType, { ...defaults, ...options, view: window });
      } else if (eventType.startsWith('pointer') && typeof PointerEvent !== 'undefined') {
        event = new PointerEvent(eventType, { ...defaults, ...options, pointerType: 'mouse', isPrimary: true });
      } else {
        event = new Event(eventType, { ...defaults, ...options });
      }
      element.dispatchEvent(event);
    } catch (_) {
      element.dispatchEvent(new Event(eventType, defaults));
    }
  }

  function selectorCandidates(selectorSpec) {
    return String(selectorSpec || '').split('||').map(value => value.trim()).filter(Boolean);
  }

  function isVisible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function findElement(selectorSpec) {
    for (const selector of selectorCandidates(selectorSpec)) {
      try {
        const elements = [...document.querySelectorAll(selector)];
        const visible = elements.find(isVisible);
        if (visible) return visible;
        if (elements[0]) return elements[0];
      } catch (error) {
        console.warn('[SEOJump] Invalid Advanced Action selector:', selector, error);
      }
    }
    return null;
  }

  app.waitForElement = async function waitForElement(selectorSpec, timeout = 10000) {
    const existing = findElement(selectorSpec);
    if (existing) return existing;

    return new Promise(resolve => {
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(value);
      };
      const observer = new MutationObserver(() => {
        const element = findElement(selectorSpec);
        if (element) finish(element);
      });
      const timer = setTimeout(() => finish(null), timeout);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    });
  };

  async function simulateEnterKey(element) {
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13
    };
    element.dispatchEvent(new KeyboardEvent('keydown', init));
    await app.sleep(80);
    element.dispatchEvent(new KeyboardEvent('keypress', init));
    await app.sleep(80);
    element.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  async function fillElement(element, text) {
    if (!element) throw new Error('Input element not found');
    element.focus();
    ['pointerdown', 'mousedown'].forEach(type => dispatchSyntheticEvent(element, type));

    if (/INPUT|TEXTAREA/i.test(element.nodeName)) {
      const prototype = Object.getPrototypeOf(element);
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) setter.call(element, text);
      else element.value = text;
    } else if (element.isContentEditable) {
      element.textContent = text;
    }

    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      inputType: 'insertText',
      data: text
    }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await app.sleep(100);

    const currentValue = /INPUT|TEXTAREA/i.test(element.nodeName)
      ? element.value
      : element.textContent;
    if (String(currentValue || '') !== String(text)) {
      if ('value' in element) element.value = text;
      else element.textContent = text;
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
  }

  async function clickElement(element) {
    if (!element) throw new Error('Submit element not found');
    element.focus?.();
    ['pointerdown', 'mousedown'].forEach(type => dispatchSyntheticEvent(element, type));
    element.click?.();
    ['mouseup', 'pointerup'].forEach(type => dispatchSyntheticEvent(element, type));
  }

  async function runBruteAction(selectorSpec, text) {
    for (const selector of selectorCandidates(selectorSpec)) {
      let elements = [];
      try {
        elements = [...document.querySelectorAll(selector)];
      } catch (_) {
        continue;
      }

      const inputs = [];
      elements.forEach(element => {
        if (/INPUT|TEXTAREA/i.test(element.nodeName) || element.isContentEditable) inputs.push(element);
        inputs.push(...element.querySelectorAll('input, textarea, [contenteditable="true"]'));
      });

      for (const input of [...new Set(inputs)].filter(isVisible)) {
        try {
          await fillElement(input, text);
          await app.sleep(300);
          await simulateEnterKey(input);
        } catch (error) {
          console.warn('[SEOJump] Brute Action input failed:', error);
        }
      }

      for (const element of elements.filter(item =>
        item.matches('button, a, [role="button"]') && isVisible(item))) {
        try { await clickElement(element); } catch (_) {}
      }
      if (elements.length) return;
    }
  }

  app.processAdvancedFeatures = async function processAdvancedFeatures(params) {
    if (params.delay) await app.sleep(params.delay);
    let text = params.text || (window.getSelection()?.toString() || '').trim();
    text = app.processRuntimePlaceholders(text);

    if (params.bruteSelector) {
      await runBruteAction(params.bruteSelector, text);
      return { success: true, mode: 'brute' };
    }

    if (!params.inputSelector) return { success: true, mode: 'none' };
    const input = await app.waitForElement(params.inputSelector);
    if (!input) throw new Error(`Input selector not found: ${params.inputSelector}`);
    await fillElement(input, text);

    if (params.submitSelector) {
      const submit = await app.waitForElement(params.submitSelector);
      if (submit) await clickElement(submit);
      else await simulateEnterKey(input);
    } else {
      await simulateEnterKey(input);
    }
    return { success: true, mode: 'input' };
  };
})();
