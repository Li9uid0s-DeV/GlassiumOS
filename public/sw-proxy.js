// GlassiumOS V4.6 Service Worker Proxy Engine
const CACHE_NAME = 'glassium-sw-proxy-v4.6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept requests directed to the service worker proxy path
  if (url.pathname.startsWith('/service/proxy') || url.pathname.startsWith('/sw-proxy/')) {
    const targetUrl = url.searchParams.get('url') || url.pathname.replace(/^\/(service\/proxy|sw-proxy)\/?/, '');
    if (!targetUrl) return;

    event.respondWith(handleProxyRequest(targetUrl, event.request));
  }
});

async function handleProxyRequest(targetUrl, originalRequest) {
  try {
    let cleanTarget = targetUrl;
    if (!/^https?:\/\//i.test(cleanTarget)) {
      cleanTarget = 'https://' + cleanTarget;
    }

    // Attempt direct fetch via server-side /api/proxy with CORS headers
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(cleanTarget)}`;
    const response = await fetch(proxyUrl);
    const contentType = response.headers.get('content-type') || 'text/html';
    let body = await response.text();

    // If HTML, inject base tag and intercept relative navigation
    if (contentType.includes('text/html')) {
      const baseTag = `<base href="${cleanTarget}">`;
      const interceptScript = `
        <script>
          window.__GLASSIUM_PROXIED__ = true;
          window.__ORIGIN_URL__ = "${cleanTarget}";
        </script>
      `;
      if (body.includes('<head>')) {
        body = body.replace('<head>', '<head>' + baseTag + interceptScript);
      } else {
        body = baseTag + interceptScript + body;
      }
    }

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  } catch (err) {
    return new Response(
      `<html><body style="background:#090d16;color:#fff;font-family:sans-serif;padding:2rem;text-align:center;">
        <h2 style="color:#f43f5e;">Proxy Gateway Error</h2>
        <p style="color:#94a3b8;">Unable to proxy target: ${targetUrl}</p>
        <p style="font-size:12px;color:#64748b;">${err.message}</p>
      </body></html>`,
      { status: 502, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
