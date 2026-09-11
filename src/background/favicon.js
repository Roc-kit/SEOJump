(() => {
  const app = globalThis.SEOJumpBackground = globalThis.SEOJumpBackground || {};
  const REQUEST_TIMEOUT_MS = 2200;
  let yandexFailureSignaturePromise = null;

  function providerUrls(domain) {
    return {
      direct: `https://${domain}/favicon.ico`,
      duckduckgo: `https://external-content.duckduckgo.com/ip3/${domain}.ico`,
      google: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`,
      yandex: `https://favicon.yandex.net/favicon/v2/${encodeURIComponent(domain)}?size=32`
    };
  }

  function isLikelyImage(blob, contentType) {
    if (!blob || blob.size < 64) return false;
    const type = String(contentType || blob.type || '').toLowerCase();
    return type.startsWith('image/') || type.includes('octet-stream') || type.includes('icon');
  }

  async function fetchIcon(source, url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        referrerPolicy: 'no-referrer',
        credentials: 'omit',
        headers: { Accept: 'image/*,*/*;q=0.5' },
        signal: controller.signal
      });
      if (!response.ok) return null;
      const blob = await response.blob();
      if (!isLikelyImage(blob, response.headers.get('content-type'))) return null;
      return { source, blob };
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function blobSignature(blob) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest).slice(0, 12))
      .map(value => value.toString(16).padStart(2, '0'))
      .join('');
  }

  function getYandexFailureSignature() {
    if (yandexFailureSignaturePromise) return yandexFailureSignaturePromise;
    const missingDomain = 'seojump-favicon-missing.invalid';
    const missingUrl = providerUrls(missingDomain).yandex;
    yandexFailureSignaturePromise = fetchIcon('yandex-failure', missingUrl)
      .then(result => result ? blobSignature(result.blob) : null)
      .catch(() => null);
    return yandexFailureSignaturePromise;
  }

  async function fetchVerifiedYandex(domain, url) {
    const [candidate, failureSignature] = await Promise.all([
      fetchIcon('yandex', url),
      getYandexFailureSignature()
    ]);
    if (!candidate || !failureSignature) return candidate;
    const candidateSignature = await blobSignature(candidate.blob);
    return candidateSignature === failureSignature ? null : candidate;
  }

  async function firstSuccessful(promises) {
    return new Promise(resolve => {
      let remaining = promises.length;
      if (!remaining) {
        resolve(null);
        return;
      }
      promises.forEach(promise => {
        Promise.resolve(promise).then(result => {
          if (result) {
            resolve(result);
            return;
          }
          remaining -= 1;
          if (!remaining) resolve(null);
        }).catch(() => {
          remaining -= 1;
          if (!remaining) resolve(null);
        });
      });
    });
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
      if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) return { success: false };
      const urls = providerUrls(domain);

      // Try independent sources per domain. A provider working for one domain
      // does not imply it works for another domain or network.
      let result = await firstSuccessful([
        fetchIcon('direct', urls.direct),
        fetchIcon('duckduckgo', urls.duckduckgo),
        fetchIcon('google', urls.google)
      ]);

      // Yandex often returns a generic image for unknown domains, so keep it
      // as the final network fallback instead of letting it win the first race.
      if (!result) result = await fetchVerifiedYandex(domain, urls.yandex);
      if (!result) return { success: false };

      return {
        success: true,
        source: result.source,
        iconData: await blobToBase64(result.blob)
      };
    } catch (error) {
      console.warn('[SEOJump] Favicon request failed:', error);
      return { success: false };
    }
  };
})();
