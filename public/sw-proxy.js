// GlassiumOS 5 u1 — Multi-Node Service Worker Proxy Engine (Scramjet / Ultraviolet / GCS Compatible)
const SW_VERSION = 'glassium-os5-u1-sw-proxy-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function isGitHubPages404Html(html) {
  if (!html || typeof html !== 'string') return false;
  return (
    html.includes("There isn't a GitHub Pages site here.") ||
    (html.includes('<title>Page not found &middot; GitHub Pages</title>'))
  );
}

function rewriteProxiedHtml(rawHtml, targetUrlStr) {
  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch {
    return rawHtml;
  }

  const origin = targetUrl.protocol + '//' + targetUrl.host;
  const pathDir = targetUrl.pathname.endsWith('/')
    ? targetUrl.pathname
    : targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf('/') + 1) || '/';
  const basePath = origin + pathDir;

  const injectedHead = `
    <base href="${basePath}" />
    <meta name="referrer" content="no-referrer" />
    <style>
      html, body { max-width: 100vw !important; overflow-x: hidden !important; }
    </style>
    <script>
      (function() {
        window.__GLASSIUM_SW_PROXY__ = true;
        window.__ORIGIN_URL__ = ${JSON.stringify(targetUrl.href)};
        document.addEventListener('click', function(e) {
          var a = e.target && e.target.closest ? e.target.closest('a') : null;
          if (!a) return;
          var href = a.getAttribute('href');
          if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
          e.preventDefault();
          try {
            var abs = new URL(href, ${JSON.stringify(targetUrl.href)}).href;
            window.parent.postMessage({ type: 'LIQUID_BROWSER_NAV', url: abs }, '*');
          } catch (err) {}
        }, true);

        document.addEventListener('submit', function(e) {
          var form = e.target;
          if (!form || form.tagName !== 'FORM') return;
          var method = (form.getAttribute('method') || 'GET').toUpperCase();
          if (method === 'GET') {
            e.preventDefault();
            try {
              var action = form.getAttribute('action') || ${JSON.stringify(targetUrl.href)};
              var absUrl = new URL(action, ${JSON.stringify(targetUrl.href)});
              var fd = new FormData(form);
              fd.forEach(function(val, key) {
                absUrl.searchParams.set(key, String(val));
              });
              window.parent.postMessage({ type: 'LIQUID_BROWSER_NAV', url: absUrl.href }, '*');
            } catch (err) {}
          }
        }, true);
      })();
    </script>
  `;

  let html = rawHtml
    .replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '')
    .replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => match + injectedHead);
  } else {
    html = '<!DOCTYPE html><html><head>' + injectedHead + '</head><body>' + html + '</body></html>';
  }

  html = html.replace(/(href|src)=["']\/([^/"'][^"']*)["']/gi, '$1="' + origin + '/$2"');
  return html;
}

async function fetchThroughRelayNodes(cleanTarget) {
  // Relay 1: AllOrigins JSON wrapper (reliable CORS headers + UTF-8 contents)
  try {
    const aoRes = await fetch(
      'https://api.allorigins.win/get?url=' + encodeURIComponent(cleanTarget),
      { signal: AbortSignal.timeout(7000) }
    );
    if (aoRes.ok) {
      const data = await aoRes.json();
      if (data && typeof data.contents === 'string' && data.contents.length > 20) {
        const cType = (data.status && data.status.content_type) || 'text/html; charset=utf-8';
        return { body: data.contents, contentType: cType, node: 'allorigins-json' };
      }
    }
  } catch {
    // try next relay
  }

  // Relay 2: CodeTabs Proxy Relay
  try {
    const ctRes = await fetch(
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(cleanTarget),
      { signal: AbortSignal.timeout(7000) }
    );
    if (ctRes.ok) {
      const cType = ctRes.headers.get('content-type') || 'text/html; charset=utf-8';
      const text = await ctRes.text();
      if (text && text.length > 20 && !text.startsWith('Forbidden')) {
        return { body: text, contentType: cType, node: 'codetabs' };
      }
    }
  } catch {
    // try next relay
  }

  // Relay 3: AllOrigins Raw
  try {
    const rawRes = await fetch(
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(cleanTarget),
      { signal: AbortSignal.timeout(7000) }
    );
    if (rawRes.ok) {
      const cType = rawRes.headers.get('content-type') || 'text/html; charset=utf-8';
      const text = await rawRes.text();
      if (text && text.length > 20) {
        return { body: text, contentType: cType, node: 'allorigins-raw' };
      }
    }
  } catch {
    // try next relay
  }

  // Relay 4: CorsProxy.io
  try {
    const cpRes = await fetch(
      'https://corsproxy.io/?url=' + encodeURIComponent(cleanTarget),
      { signal: AbortSignal.timeout(7000) }
    );
    if (cpRes.ok) {
      const cType = cpRes.headers.get('content-type') || 'text/html; charset=utf-8';
      const text = await cpRes.text();
      if (text && text.length > 20 && !text.startsWith('Forbidden')) {
        return { body: text, contentType: cType, node: 'corsproxy-io' };
      }
    }
  } catch {
    // try next relay
  }

  // Relay 5: Jina Reader Engine (renders JS/SPA pages into clean readable content)
  try {
    const jinaRes = await fetch('https://r.jina.ai/' + cleanTarget, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(8000),
    });
    if (jinaRes.ok) {
      const text = await jinaRes.text();
      if (text && text.length > 20) {
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const readerHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body { margin: 0; padding: 24px 32px; background: #090d16; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; line-height: 1.7; }
          .bar { padding: 10px 14px; background: rgba(6,182,212,0.12); border-left: 3px solid #06b6d4; margin-bottom: 18px; font-size: 12px; color: #67e8f9; }
          pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; }
        </style></head><body>
          <div class="bar">Glasispect Service Worker Reader Mode — ${cleanTarget}</div>
          <pre>${escaped}</pre>
        </body></html>`;
        return { body: readerHtml, contentType: 'text/html; charset=utf-8', node: 'jina-reader' };
      }
    }
  } catch {
    // all relays exhausted
  }

  return null;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept explicit proxy endpoints (/sw-proxy, /service/proxy, or /api/proxy with ?url=)
  const isSwProxyPath =
    url.pathname.includes('/sw-proxy') ||
    url.pathname.includes('/service/proxy') ||
    (url.pathname.endsWith('/api/proxy') && url.searchParams.has('url'));

  if (!isSwProxyPath) return;

  const rawTarget = url.searchParams.get('url');
  if (!rawTarget) return;

  event.respondWith(
    (async () => {
      let cleanTarget = rawTarget.trim();
      if (!/^https?:\/\//i.test(cleanTarget)) {
        cleanTarget = 'https://' + cleanTarget;
      }

      // If this is /api/proxy on a live backend server (not github.io static host), try the server first
      const isStaticHost =
        self.location.hostname.includes('github.io') ||
        self.location.hostname.includes('storage.googleapis.com');

      if (!isStaticHost && url.pathname.endsWith('/api/proxy') && !url.searchParams.has('_sw_bypass')) {
        try {
          const directServerRes = await fetch(
            url.pathname + '?url=' + encodeURIComponent(cleanTarget) + '&_sw_bypass=1',
            { signal: AbortSignal.timeout(5000) }
          );
          if (directServerRes.ok) {
            const text = await directServerRes.text();
            if (!isGitHubPages404Html(text)) {
              return new Response(text, {
                status: 200,
                headers: {
                  'Content-Type': directServerRes.headers.get('content-type') || 'text/html; charset=utf-8',
                  'Access-Control-Allow-Origin': '*',
                },
              });
            }
          }
        } catch {
          // Fall through to Service Worker Multi-Relay
        }
      }

      const relayResult = await fetchThroughRelayNodes(cleanTarget);
      if (relayResult) {
        const isHtml = relayResult.contentType.includes('text/html') || relayResult.body.trim().startsWith('<');
        const finalBody = isHtml ? rewriteProxiedHtml(relayResult.body, cleanTarget) : relayResult.body;
        return new Response(finalBody, {
          status: 200,
          headers: {
            'Content-Type': isHtml ? 'text/html; charset=utf-8' : relayResult.contentType,
            'Access-Control-Allow-Origin': '*',
            'X-Glassium-Proxy-Node': relayResult.node,
          },
        });
      }

      return new Response(
        `<!DOCTYPE html><html><body style="background:#090d16;color:#f8fafc;font-family:system-ui,sans-serif;padding:2rem;text-align:center;">
          <h3 style="color:#38bdf8;">Service Worker Proxy Fallback</h3>
          <p style="font-size:13px;color:#94a3b8;">Target URL: ${cleanTarget}</p>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    })()
  );
});
