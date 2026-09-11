(() => {
  const app = globalThis.SEOJumpBackground = globalThis.SEOJumpBackground || {};
  let availableApi = null;
  let apiTestPromise = null;

  async function testApi(apiTemplate, testDomain) {
    try {
      const response = await fetch(apiTemplate.replace('${domain}', testDomain), {
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      });
      if (!response.ok) return false;
      return (await response.blob()).type.startsWith('image/');
    } catch (_) {
      return false;
    }
  }

  async function getAvailableApi() {
    if (availableApi) return availableApi;
    if (apiTestPromise) return apiTestPromise;

    apiTestPromise = (async () => {
      const templates = [
        'https://www.google.com/s2/favicons?domain=${domain}&sz=32',
        'https://favicon.yandex.net/favicon/v2/${domain}?size=32',
        'https://external-content.duckduckgo.com/ip3/${domain}'
      ];
      for (const template of templates) {
        if (await testApi(template, 'www.google.com')) {
          availableApi = template;
          return template;
        }
      }
      return null;
    })();

    try {
      return await apiTestPromise;
    } finally {
      apiTestPromise = null;
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  app.handleFaviconRequest = async function handleFaviconRequest(domain) {
    try {
      const api = await getAvailableApi();
      if (!api) return { success: false };
      const response = await fetch(api.replace('${domain}', domain), {
        referrerPolicy: 'no-referrer',
        credentials: 'omit',
        headers: { Accept: 'image/*' }
      });
      if (!response.ok) return { success: false };
      return { success: true, iconData: await blobToBase64(await response.blob()) };
    } catch (error) {
      console.warn('[SEOJump] Favicon request failed:', error);
      return { success: false };
    }
  };
})();
