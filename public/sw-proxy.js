// =========================================================================
// GlassiumOS 5 — Wisp v1 + Ultraviolet (/uv/service/) & Scramjet (/scramjet/)
// Service Worker Proxy Engine
// =========================================================================
const SW_VERSION = 'glassium-wisp-uv-scramjet-v4.0';

let activeConfig = {
  wispServer: 'wss://wisp.mercurywork.shop/',
  engine: 'scramjet', // 'scramjet' | 'ultraviolet'
  relayNode: 'auto',
};

// Map of iframe clientId -> { origin: 'https://...', href: 'https://...', engine: 'scramjet' | 'ultraviolet' }
const clientSessionMap = new Map();

// =========================================================================
// 1. Wisp v1 Binary Protocol Multiplexer (CONNECT 0x01, DATA 0x02, CONTINUE 0x03, CLOSE 0x04)
// =========================================================================
const WISP_TYPE_CONNECT = 0x01;
const WISP_TYPE_DATA = 0x02;
const WISP_TYPE_CONTINUE = 0x03;
const WISP_TYPE_CLOSE = 0x04;
const WISP_STREAM_TCP = 0x01;

class WispWebSocketMultiplexer {
  constructor(wispUrl) {
    this.wispUrl = wispUrl;
    this.ws = null;
    this.nextStreamId = 1;
    this.streams = new Map();
    this.connected = false;
    this.connectPromise = null;
  }

  encodeConnectPacket(streamId, hostname, port) {
    const hostBytes = new TextEncoder().encode(hostname);
    const packet = new Uint8Array(5 + 1 + 2 + hostBytes.length);
    const view = new DataView(packet.buffer);
    view.setUint8(0, WISP_TYPE_CONNECT);
    view.setUint32(1, streamId, true); // Little-endian stream ID
    view.setUint8(5, WISP_STREAM_TCP);
    view.setUint16(6, port, true); // Little-endian port
    packet.set(hostBytes, 8);
    return packet;
  }

  encodeDataPacket(streamId, payloadBytes) {
    const packet = new Uint8Array(5 + payloadBytes.length);
    const view = new DataView(packet.buffer);
    view.setUint8(0, WISP_TYPE_DATA);
    view.setUint32(1, streamId, true);
    packet.set(payloadBytes, 5);
    return packet;
  }

  encodeClosePacket(streamId, reason = 0x01) {
    const packet = new Uint8Array(6);
    const view = new DataView(packet.buffer);
    view.setUint8(0, WISP_TYPE_CLOSE);
    view.setUint32(1, streamId, true);
    view.setUint8(5, reason);
    return packet;
  }

  async ensureConnected(timeoutMs = 3200) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.connected) {
      return true;
    }
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve) => {
      let settled = false;
      const done = (ok) => {
        if (!settled) {
          settled = true;
          this.connectPromise = null;
          resolve(ok);
        }
      };

      const timer = setTimeout(() => {
        done(false);
      }, timeoutMs);

      try {
        const ws = new WebSocket(this.wispUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          this.ws = ws;
          this.connected = true;
          clearTimeout(timer);
          done(true);
        };

        ws.onmessage = (ev) => {
          if (!(ev.data instanceof ArrayBuffer) || ev.data.byteLength < 5) return;
          const view = new DataView(ev.data);
          const type = view.getUint8(0);
          const streamId = view.getUint32(1, true);
          const payload = new Uint8Array(ev.data, 5);

          if (type === WISP_TYPE_CONTINUE && streamId === 0) {
            this.connected = true;
            return;
          }

          const stream = this.streams.get(streamId);
          if (!stream) return;

          if (type === WISP_TYPE_DATA) {
            stream.chunks.push(payload);
          } else if (type === WISP_TYPE_CLOSE) {
            stream.onClose();
            this.streams.delete(streamId);
          }
        };

        ws.onerror = () => {
          this.connected = false;
          clearTimeout(timer);
          done(false);
        };

        ws.onclose = () => {
          this.connected = false;
          for (const [, st] of this.streams) {
            st.onClose();
          }
          this.streams.clear();
        };
      } catch {
        clearTimeout(timer);
        done(false);
      }
    });

    return this.connectPromise;
  }
}

let wispMuxInstance = null;

function getWispMux(url) {
  if (!wispMuxInstance || wispMuxInstance.wispUrl !== url) {
    wispMuxInstance = new WispWebSocketMultiplexer(url);
  }
  return wispMuxInstance;
}

// =========================================================================
// 2. Ultraviolet (XOR + Base64/Raw) & Scramjet URL Codecs
// =========================================================================
function uvEncodeUrl(url) {
  if (!url) return '';
  const str = String(url);
  const xorStr = encodeURIComponent(str)
    .split('')
    .map((ch, idx) => (idx % 2 === 0 ? String.fromCharCode(ch.charCodeAt(0) ^ 2) : ch))
    .join('');
  return xorStr;
}

function uvDecodeUrl(encoded) {
  if (!encoded) return '';
  let raw = String(encoded).replace(/^\/+/, '');
  if (raw.startsWith('uv://')) {
    raw = raw.slice(5);
  }
  // Support base64-wrapped UV strings as well as standard UV XOR strings
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0 && !raw.includes('%')) {
    try {
      const b64Decoded = atob(raw);
      if (b64Decoded) raw = b64Decoded;
    } catch {
      // keep raw
    }
  }
  try {
    // Separate any unencoded query or hash suffix if appended by browser
    let queryTail = '';
    const qIdx = raw.indexOf('?');
    if (qIdx !== -1) {
      queryTail = raw.slice(qIdx);
      raw = raw.slice(0, qIdx);
    }
    const unxored = raw
      .split('')
      .map((ch, idx) => (idx % 2 === 0 ? String.fromCharCode(ch.charCodeAt(0) ^ 2) : ch))
      .join('');
    return decodeURIComponent(unxored) + queryTail;
  } catch {
    return raw;
  }
}

function scramjetEncodeUrl(url) {
  if (!url) return '';
  return encodeURIComponent(String(url));
}

function scramjetDecodeUrl(encoded) {
  if (!encoded) return '';
  let raw = String(encoded).replace(/^\/+/, '');
  if (raw.startsWith('scramjet://')) {
    raw = raw.slice(11);
  }
  try {
    let queryTail = '';
    const qIdx = raw.indexOf('?');
    if (qIdx !== -1 && !raw.slice(0, qIdx).includes('://')) {
      queryTail = raw.slice(qIdx);
      raw = raw.slice(0, qIdx);
    }
    return decodeURIComponent(raw) + queryTail;
  } catch {
    return raw;
  }
}

function buildServiceProxyPath(targetUrl, engine) {
  if (engine === 'ultraviolet') {
    return '/uv/service/' + uvEncodeUrl(targetUrl);
  }
  return '/scramjet/' + scramjetEncodeUrl(targetUrl);
}

// =========================================================================
// 3. Extract Target URL from Service Worker Request (/uv/service/*, /scramjet/*, Referer)
// =========================================================================
function isHostApplicationAsset(pathname, searchParams) {
  if (searchParams && searchParams.has('__os_direct')) return true;
  if (
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/sw-proxy.js' ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/@vite') ||
    pathname.startsWith('/@react-refresh') ||
    pathname.startsWith('/@fs/') ||
    pathname.startsWith('/@id/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/api/wisp') ||
    pathname.startsWith('/api/proxy') ||
    pathname.startsWith('/api/ai') ||
    pathname.startsWith('/assets/aistudio/')
  ) {
    return true;
  }
  return false;
}

function extractTargetFromPath(urlObj) {
  const pathname = urlObj.pathname;

  // 1. Ultraviolet route: /uv/service/<encoded>
  const uvMatch = pathname.match(/\/uv\/service\/(.+)$/);
  if (uvMatch && uvMatch[1]) {
    let decoded = uvDecodeUrl(uvMatch[1]);
    if (urlObj.search && !decoded.includes('?')) {
      decoded += urlObj.search;
    }
    return { targetUrl: decoded, engine: 'ultraviolet' };
  }

  // 2. Scramjet route: /scramjet/<encoded>
  const sjMatch = pathname.match(/\/scramjet\/(.+)$/);
  if (sjMatch && sjMatch[1]) {
    let decoded = scramjetDecodeUrl(sjMatch[1]);
    if (urlObj.search && !decoded.includes('?')) {
      decoded += urlObj.search;
    }
    return { targetUrl: decoded, engine: 'scramjet' };
  }

  // 3. Legacy query route: /sw-proxy?url=... or /service/proxy?url=...
  if (
    (pathname.includes('/sw-proxy') || pathname.includes('/service/proxy')) &&
    urlObj.searchParams.has('url')
  ) {
    return {
      targetUrl: urlObj.searchParams.get('url'),
      engine: urlObj.searchParams.get('engine') || activeConfig.engine,
    };
  }

  return null;
}

function extractTargetFromRefererOrClient(request, urlObj) {
  if (isHostApplicationAsset(urlObj.pathname, urlObj.searchParams)) {
    return null;
  }

  // Check Referer header first (most accurate for sub-resources inside /uv/service/ or /scramjet/ iframes)
  if (request.referrer) {
    try {
      const refUrl = new URL(request.referrer);
      const refInfo = extractTargetFromPath(refUrl);
      if (refInfo && refInfo.targetUrl) {
        const baseTarget = new URL(
          refInfo.targetUrl.startsWith('http') ? refInfo.targetUrl : 'https://' + refInfo.targetUrl
        );
        // Resolve the relative path + query against the target origin!
        const resolved = new URL(urlObj.pathname + urlObj.search, baseTarget.origin).href;
        return { targetUrl: resolved, engine: refInfo.engine };
      }
    } catch {
      // ignore
    }
  }

  // Check clientSessionMap by clientId
  if (request.clientId && clientSessionMap.has(request.clientId)) {
    const sess = clientSessionMap.get(request.clientId);
    if (sess && sess.origin) {
      try {
        const resolved = new URL(urlObj.pathname + urlObj.search, sess.origin).href;
        return { targetUrl: resolved, engine: sess.engine || activeConfig.engine };
      } catch {
        // ignore
      }
    }
  }

  return null;
}

// =========================================================================
// 4. HTML, CSS & JS Rewriters for Ultraviolet & Scramjet
// =========================================================================
function rewriteCssUrls(cssText, baseTargetUrl, engine) {
  if (!cssText || typeof cssText !== 'string') return cssText;
  let baseObj;
  try {
    baseObj = new URL(baseTargetUrl);
  } catch {
    return cssText;
  }

  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, rawUrl) => {
    const trimmed = rawUrl.trim();
    if (
      !trimmed ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('#') ||
      trimmed.includes('/uv/service/') ||
      trimmed.includes('/scramjet/')
    ) {
      return full;
    }
    try {
      const abs = new URL(trimmed, baseObj.href).href;
      const proxied = buildServiceProxyPath(abs, engine);
      return `url(${quote}${proxied}${quote})`;
    } catch {
      return full;
    }
  });
}

function buildInjectedUvScramjetRuntime(targetUrlObj, engine, wispServer) {
  const originStr = targetUrlObj.origin;
  const hrefStr = targetUrlObj.href;

  return `<script data-proxy-runtime="${engine}">
(function() {
  var TARGET_ORIGIN = ${JSON.stringify(originStr)};
  var TARGET_HREF = ${JSON.stringify(hrefStr)};
  var PROXY_ENGINE = ${JSON.stringify(engine)};
  var WISP_SERVER = ${JSON.stringify(wispServer)};

  window.__GLASSIUM_SW_PROXY__ = true;
  window.__ORIGIN_URL__ = TARGET_HREF;
  window.__WISP_SERVER__ = WISP_SERVER;

  function uvEncode(str) {
    if (!str) return '';
    return encodeURIComponent(String(str))
      .split('')
      .map(function(ch, idx) { return idx % 2 === 0 ? String.fromCharCode(ch.charCodeAt(0) ^ 2) : ch; })
      .join('');
  }

  function scramjetEncode(str) {
    if (!str) return '';
    return encodeURIComponent(String(str));
  }

  function toProxyUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== 'string') return inputUrl;
    var trimmed = inputUrl.trim();
    if (
      !trimmed ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('#') ||
      trimmed.indexOf('/uv/service/') !== -1 ||
      trimmed.indexOf('/scramjet/') !== -1 ||
      trimmed.indexOf('/api/wisp') !== -1 ||
      trimmed.indexOf('/api/proxy') !== -1
    ) {
      return inputUrl;
    }
    try {
      var resolved = new URL(trimmed, TARGET_HREF);
      // If browser resolved a root-relative path against our proxy host, re-base it onto TARGET_ORIGIN
      if (resolved.origin === window.location.origin) {
        resolved = new URL(resolved.pathname + resolved.search + resolved.hash, TARGET_ORIGIN);
      }
      var abs = resolved.href;
      if (PROXY_ENGINE === 'ultraviolet') {
        return '/uv/service/' + uvEncode(abs);
      }
      return '/scramjet/' + scramjetEncode(abs);
    } catch (e) {
      return inputUrl;
    }
  }

  window.__uv = {
    location: new URL(TARGET_HREF),
    rewriteUrl: toProxyUrl,
    config: { prefix: '/uv/service/', wisp: WISP_SERVER }
  };
  window.__scramjet = {
    location: new URL(TARGET_HREF),
    rewriteUrl: toProxyUrl,
    config: { prefix: '/scramjet/', wisp: WISP_SERVER }
  };

  // 1. Prevent proxied site from registering its own Service Worker over ours
  if (navigator.serviceWorker) {
    try {
      navigator.serviceWorker.register = function() {
        return Promise.resolve({
          installing: null,
          waiting: null,
          active: { state: 'activated', postMessage: function() {} },
          scope: window.location.origin + '/',
          update: function() { return Promise.resolve(); },
          unregister: function() { return Promise.resolve(true); },
          addEventListener: function() {}
        });
      };
    } catch (e) {}
  }

  // 2. Intercept window.fetch
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      try {
        if (typeof input === 'string') {
          input = toProxyUrl(input);
        } else if (input instanceof URL) {
          input = toProxyUrl(input.href);
        } else if (input && typeof input === 'object' && typeof input.url === 'string') {
          var newUrl = toProxyUrl(input.url);
          input = new Request(newUrl, input);
        }
      } catch (e) {}
      return origFetch.call(this, input, init);
    };
  }

  // 3. Intercept XMLHttpRequest.prototype.open
  var origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    try {
      if (typeof url === 'string') {
        url = toProxyUrl(url);
      } else if (url && typeof url.href === 'string') {
        url = toProxyUrl(url.href);
      }
    } catch (e) {}
    return origXhrOpen.call(this, method, url, async !== false, user, password);
  };

  // 4. Intercept History.pushState / replaceState so SPA routers don't break /uv/service/ or /scramjet/
  var origPushState = History.prototype.pushState;
  var origReplaceState = History.prototype.replaceState;
  History.prototype.pushState = function(state, title, url) {
    if (url && typeof url === 'string') {
      try {
        var nextAbs = new URL(url, TARGET_HREF).href;
        TARGET_HREF = nextAbs;
        window.parent.postMessage({ type: 'LIQUID_BROWSER_URL_SYNC', url: nextAbs }, '*');
        return origPushState.call(this, state, title, toProxyUrl(nextAbs));
      } catch (e) {
        return;
      }
    }
    return origPushState.apply(this, arguments);
  };
  History.prototype.replaceState = function(state, title, url) {
    if (url && typeof url === 'string') {
      try {
        var nextAbs = new URL(url, TARGET_HREF).href;
        TARGET_HREF = nextAbs;
        window.parent.postMessage({ type: 'LIQUID_BROWSER_URL_SYNC', url: nextAbs }, '*');
        return origReplaceState.call(this, state, title, toProxyUrl(nextAbs));
      } catch (e) {
        return;
      }
    }
    return origReplaceState.apply(this, arguments);
  };

  // 5. Intercept Element.setAttribute & Audio constructor for dynamic media/script tags
  var origSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (typeof name === 'string' && typeof value === 'string') {
      var low = name.toLowerCase();
      if (low === 'src' || low === 'href' || low === 'action') {
        var tag = (this.tagName || '').toUpperCase();
        if (tag !== 'A' || !value.startsWith('#')) {
          value = toProxyUrl(value);
        }
      }
    }
    return origSetAttr.call(this, name, value);
  };

  var OrigAudio = window.Audio;
  if (OrigAudio) {
    window.Audio = function(src) {
      return new OrigAudio(src ? toProxyUrl(src) : undefined);
    };
    window.Audio.prototype = OrigAudio.prototype;
  }

  // 6. Intercept window.open & link clicks / form submissions
  window.open = function(url) {
    if (url) {
      try {
        var abs = new URL(url, TARGET_HREF).href;
        window.parent.postMessage({ type: 'LIQUID_BROWSER_NAV', url: abs }, '*');
        window.location.href = toProxyUrl(abs);
      } catch (e) {}
    }
    return window;
  };

  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var rawHref = a.getAttribute('data-orig-href') || a.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;
    if (rawHref.indexOf('/uv/service/') === 0 || rawHref.indexOf('/scramjet/') === 0) {
      return; // let Service Worker handle direct navigation inside iframe
    }
    e.preventDefault();
    try {
      var abs = new URL(rawHref, TARGET_HREF).href;
      window.parent.postMessage({ type: 'LIQUID_BROWSER_NAV', url: abs }, '*');
      window.location.href = toProxyUrl(abs);
    } catch (err) {}
  }, true);

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var method = (form.getAttribute('method') || 'GET').toUpperCase();
    if (method === 'GET') {
      e.preventDefault();
      try {
        var rawAction = form.getAttribute('data-orig-action') || form.getAttribute('action') || TARGET_HREF;
        var absUrl = new URL(rawAction, TARGET_HREF);
        var fd = new FormData(form);
        fd.forEach(function(val, key) {
          absUrl.searchParams.set(key, String(val));
        });
        window.parent.postMessage({ type: 'LIQUID_BROWSER_NAV', url: absUrl.href }, '*');
        window.location.href = toProxyUrl(absUrl.href);
      } catch (err) {}
    }
  }, true);
})();
</script>`;
}

function rewriteHtmlDocument(rawHtml, targetUrlStr, engine, wispServer) {
  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr.startsWith('http') ? targetUrlStr : 'https://' + targetUrlStr);
  } catch {
    return rawHtml;
  }

  // Strip restrictive CSP, X-Frame-Options, and SRI integrity attributes
  let html = rawHtml
    .replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '')
    .replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '')
    .replace(/\sintegrity=["'][^"']*["']/gi, '')
    .replace(/\scrossorigin=["'][^"']*["']/gi, '');

  // Rewrite src, href, action attributes to go through /uv/service/ or /scramjet/
  html = html.replace(
    /(<(?:script|link|img|audio|video|source|iframe|embed|a|form)\b[^>]*?\s)(src|href|action)=(["'])([^"']+)\3/gi,
    (fullMatch, tagPrefix, attrName, quote, attrVal) => {
      const trimmed = attrVal.trim();
      if (
        !trimmed ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('/uv/service/') ||
        trimmed.startsWith('/scramjet/')
      ) {
        return fullMatch;
      }
      try {
        const resolved = new URL(trimmed, targetUrl.href).href;
        const proxied = buildServiceProxyPath(resolved, engine);
        const origAttr =
          attrName.toLowerCase() === 'href'
            ? ` data-orig-href=${quote}${trimmed}${quote}`
            : attrName.toLowerCase() === 'action'
            ? ` data-orig-action=${quote}${trimmed}${quote}`
            : '';
        return `${tagPrefix}${attrName}=${quote}${proxied}${quote}${origAttr}`;
      } catch {
        return fullMatch;
      }
    }
  );

  // Rewrite inline style url(...)
  html = rewriteCssUrls(html, targetUrl.href, engine);

  const runtimeScript = buildInjectedUvScramjetRuntime(targetUrl, engine, wispServer);

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => match + runtimeScript);
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html[^>]*>/i, (match) => match + '<head>' + runtimeScript + '</head>');
  } else {
    html = '<!DOCTYPE html><html><head>' + runtimeScript + '</head><body>' + html + '</body></html>';
  }

  return html;
}

// =========================================================================
// 5. Wisp + Multi-Node Upstream Transport Cascade (Binary & Text Preserving)
// =========================================================================
async function fetchUpstreamViaWispAndRelays(targetUrlStr, request) {
  const cleanTarget = targetUrlStr.startsWith('http') ? targetUrlStr : 'https://' + targetUrlStr;
  const method = request ? request.method || 'GET' : 'GET';
  const acceptHeader = (request && request.headers && request.headers.get('accept')) || '*/*';

  // Kick off Wisp WebSocket Multiplexer handshake in parallel so Wisp tunnel stays warm
  try {
    const mux = getWispMux(activeConfig.wispServer);
    mux.ensureConnected(2500).catch(() => {});
  } catch {
    // ignore
  }

  // Transport 1: Local Wisp Bridge (/api/wisp) — supports all methods, binary streams, JS/CSS/HTML/Audio
  try {
    const wispInit = {
      method: method === 'HEAD' ? 'GET' : method,
      headers: {
        'X-Wisp-Target': cleanTarget,
        'X-Wisp-Server': activeConfig.wispServer,
        'X-Proxy-Engine': activeConfig.engine,
        Accept: acceptHeader,
      },
      signal: AbortSignal.timeout(9500),
    };
    const rangeHdr = request && request.headers && request.headers.get('range');
    if (rangeHdr) {
      wispInit.headers['Range'] = rangeHdr;
    }
    if (method !== 'GET' && method !== 'HEAD' && request) {
      try {
        wispInit.body = await request.clone().arrayBuffer();
      } catch {
        // ignore
      }
    }

    const wispRes = await fetch(
      '/api/wisp?url=' +
        encodeURIComponent(cleanTarget) +
        '&wisp=' +
        encodeURIComponent(activeConfig.wispServer),
      wispInit
    );

    if (wispRes.ok || (wispRes.status >= 200 && wispRes.status < 400)) {
      const cType = wispRes.headers.get('content-type') || 'application/octet-stream';
      const finalUrl = wispRes.headers.get('x-wisp-final-url') || cleanTarget;
      const buf = await wispRes.arrayBuffer();
      if (buf.byteLength > 0) {
        return {
          buffer: buf,
          contentType: cType,
          status: wispRes.status,
          finalUrl,
          transport: 'wisp-mux (' + activeConfig.wispServer + ')',
          contentRange: wispRes.headers.get('content-range'),
          acceptRanges: wispRes.headers.get('accept-ranges'),
        };
      }
    }
  } catch {
    // Fall through to raw /api/proxy and CORS Wisp relays
  }

  // Transport 2: Local Raw Proxy (/api/proxy?raw=1)
  try {
    const rawProxyRes = await fetch(
      '/api/proxy?raw=1&url=' + encodeURIComponent(cleanTarget),
      { signal: AbortSignal.timeout(8000) }
    );
    if (rawProxyRes.ok) {
      const cType = rawProxyRes.headers.get('content-type') || 'text/html; charset=utf-8';
      const finalUrl = rawProxyRes.headers.get('x-final-url') || cleanTarget;
      const buf = await rawProxyRes.arrayBuffer();
      if (buf.byteLength > 0) {
        return {
          buffer: buf,
          contentType: cType,
          status: rawProxyRes.status,
          finalUrl,
          transport: 'local-raw-proxy',
        };
      }
    }
  } catch {
    // Fall through to edge relays
  }

  // Transport 3: CorsProxy.io (Preserves Binary + Content-Type for static hosting)
  try {
    const cpRes = await fetch('https://corsproxy.io/?url=' + encodeURIComponent(cleanTarget), {
      signal: AbortSignal.timeout(7500),
    });
    if (cpRes.ok) {
      const cType = cpRes.headers.get('content-type') || 'text/html; charset=utf-8';
      const buf = await cpRes.arrayBuffer();
      if (buf.byteLength > 0) {
        return {
          buffer: buf,
          contentType: cType,
          status: cpRes.status,
          finalUrl: cleanTarget,
          transport: 'corsproxy-edge',
        };
      }
    }
  } catch {
    // Next relay
  }

  // Transport 4: AllOrigins Raw (Preserves Binary + Content-Type)
  try {
    const aoRaw = await fetch(
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(cleanTarget),
      { signal: AbortSignal.timeout(7500) }
    );
    if (aoRaw.ok) {
      const cType = aoRaw.headers.get('content-type') || 'text/html; charset=utf-8';
      const buf = await aoRaw.arrayBuffer();
      if (buf.byteLength > 0) {
        return {
          buffer: buf,
          contentType: cType,
          status: aoRaw.status,
          finalUrl: cleanTarget,
          transport: 'allorigins-raw',
        };
      }
    }
  } catch {
    // Next relay
  }

  // Transport 5: CodeTabs Proxy
  try {
    const ctRes = await fetch(
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(cleanTarget),
      { signal: AbortSignal.timeout(7500) }
    );
    if (ctRes.ok) {
      const cType = ctRes.headers.get('content-type') || 'text/html; charset=utf-8';
      const buf = await ctRes.arrayBuffer();
      if (buf.byteLength > 0) {
        return {
          buffer: buf,
          contentType: cType,
          status: ctRes.status,
          finalUrl: cleanTarget,
          transport: 'codetabs',
        };
      }
    }
  } catch {
    // Next relay
  }

  // Transport 6: AllOrigins JSON Envelope
  try {
    const aoJson = await fetch(
      'https://api.allorigins.win/get?url=' + encodeURIComponent(cleanTarget),
      { signal: AbortSignal.timeout(7500) }
    );
    if (aoJson.ok) {
      const data = await aoJson.json();
      if (data && typeof data.contents === 'string' && data.contents.length > 0) {
        const cType = (data.status && data.status.content_type) || 'text/html; charset=utf-8';
        const encoded = new TextEncoder().encode(data.contents);
        return {
          buffer: encoded.buffer,
          contentType: cType,
          status: 200,
          finalUrl: cleanTarget,
          transport: 'allorigins-json',
        };
      }
    }
  } catch {
    // Next relay
  }

  // Transport 7: Jina Cloud Reader (for Cloudflare/JS-blocked HTML documents)
  if (acceptHeader.includes('text/html') || !/\.(js|css|png|jpg|jpeg|webp|svg|woff2?|mp4|mp3|flac)$/i.test(cleanTarget)) {
    try {
      const jinaRes = await fetch('https://r.jina.ai/' + cleanTarget, {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(8500),
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
            .bar { padding: 10px 14px; background: rgba(6,182,212,0.12); border-left: 3px solid #06b6d4; margin-bottom: 18px; font-size: 12px; color: #67e8f9; font-family: monospace; }
            pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; }
          </style></head><body>
            <div class="bar">Wisp / Scramjet Cloud Reader — ${cleanTarget}</div>
            <pre>${escaped}</pre>
          </body></html>`;
          const encoded = new TextEncoder().encode(readerHtml);
          return {
            buffer: encoded.buffer,
            contentType: 'text/html; charset=utf-8',
            status: 200,
            finalUrl: cleanTarget,
            transport: 'jina-cloud-reader',
          };
        }
      }
    } catch {
      // exhausted
    }
  }

  return null;
}

// =========================================================================
// 6. Service Worker Lifecycle & Message Listener
// =========================================================================
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'CONFIGURE_WISP_SW') {
    if (typeof data.wispServer === 'string' && data.wispServer.trim()) {
      activeConfig.wispServer = data.wispServer.trim();
    }
    if (data.engine === 'ultraviolet' || data.engine === 'scramjet') {
      activeConfig.engine = data.engine;
    }
    if (typeof data.relayNode === 'string') {
      activeConfig.relayNode = data.relayNode;
    }
    if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage({
        type: 'WISP_SW_CONFIGURED',
        version: SW_VERSION,
        config: activeConfig,
      });
    }
  }
});

// =========================================================================
// 7. Fetch Interceptor for /uv/service/*, /scramjet/*, /sw-proxy, and Sub-Resources
// =========================================================================
self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  // Only intercept requests targeting our own origin (Service Worker scope)
  if (reqUrl.origin !== self.location.origin) {
    return;
  }

  let routeInfo = extractTargetFromPath(reqUrl);
  if (!routeInfo) {
    routeInfo = extractTargetFromRefererOrClient(event.request, reqUrl);
  }

  if (!routeInfo || !routeInfo.targetUrl) {
    return;
  }

  event.respondWith(
    (async () => {
      let cleanTarget = String(routeInfo.targetUrl).trim();
      if (/^gcs:\/\//i.test(cleanTarget)) {
        cleanTarget = 'https://storage.googleapis.com/' + cleanTarget.replace(/^gcs:\/+/i, '');
      } else if (!/^https?:\/\//i.test(cleanTarget)) {
        cleanTarget = 'https://' + cleanTarget;
      }

      const engine = routeInfo.engine || activeConfig.engine || 'scramjet';

      // Record client session if this is a document navigation inside an iframe
      try {
        const targetObj = new URL(cleanTarget);
        if (event.clientId && (event.request.mode === 'navigate' || event.request.destination === 'document' || event.request.destination === 'iframe')) {
          clientSessionMap.set(event.clientId, {
            origin: targetObj.origin,
            href: targetObj.href,
            engine,
          });
        }
      } catch {
        // ignore
      }

      const upstream = await fetchUpstreamViaWispAndRelays(cleanTarget, event.request);

      if (upstream && upstream.buffer) {
        const cType = (upstream.contentType || '').toLowerCase();
        const finalUrl = upstream.finalUrl || cleanTarget;

        // Update session origin if redirected
        if (event.clientId && (event.request.mode === 'navigate' || event.request.destination === 'document' || event.request.destination === 'iframe')) {
          try {
            const finalObj = new URL(finalUrl);
            clientSessionMap.set(event.clientId, {
              origin: finalObj.origin,
              href: finalObj.href,
              engine,
            });
          } catch {
            // ignore
          }
        }

        const outHeaders = {
          'Content-Type': upstream.contentType || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'X-Glasispect-SW': SW_VERSION,
          'X-Proxy-Engine': engine,
          'X-Wisp-Transport': upstream.transport || activeConfig.wispServer,
        };
        if (upstream.contentRange) outHeaders['Content-Range'] = upstream.contentRange;
        if (upstream.acceptRanges) outHeaders['Accept-Ranges'] = upstream.acceptRanges;

        // 1. HTML Document Rewriting (Inject $uv / $scramjet runtime + rewrite links/scripts)
        if (cType.includes('text/html') || cType.includes('application/xhtml+xml')) {
          const rawHtml = new TextDecoder('utf-8').decode(upstream.buffer);
          const rewritten = rewriteHtmlDocument(
            rawHtml,
            finalUrl,
            engine,
            activeConfig.wispServer
          );
          outHeaders['Content-Type'] = 'text/html; charset=utf-8';
          return new Response(rewritten, {
            status: 200,
            headers: outHeaders,
          });
        }

        // 2. CSS Stylesheet Rewriting (Rewrite url(...) to /uv/service/ or /scramjet/)
        if (cType.includes('text/css') || /\.css(\?|$)/i.test(finalUrl)) {
          const rawCss = new TextDecoder('utf-8').decode(upstream.buffer);
          const rewrittenCss = rewriteCssUrls(rawCss, finalUrl, engine);
          outHeaders['Content-Type'] = 'text/css; charset=utf-8';
          return new Response(rewrittenCss, {
            status: 200,
            headers: outHeaders,
          });
        }

        // 3. JavaScript, JSON, Images, Fonts, Audio/Video Streams -> Return exact bytes
        return new Response(upstream.buffer, {
          status: upstream.status || 200,
          headers: outHeaders,
        });
      }

      // Fallback error page if all Wisp & Relay nodes failed for a navigation request
      const errorHtml = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
        body { margin: 0; background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .card { max-width: 520px; padding: 28px; background: rgba(15,23,42,0.9); border-top: 2px solid #06b6d4; }
        h3 { margin: 0 0 8px; color: #38bdf8; }
        p { font-size: 13px; color: #94a3b8; line-height: 1.6; }
        .meta { font-family: monospace; font-size: 11px; color: #67e8f9; background: rgba(0,0,0,0.4); padding: 8px 10px; margin: 12px 0; word-break: break-all; }
        button { padding: 8px 16px; background: #06b6d4; color: #000; border: 0; font-weight: 700; cursor: pointer; font-size: 12px; margin-right: 8px; }
      </style></head><body>
        <div class="card">
          <h3>Wisp / ${engine.toUpperCase()} Service Worker Tunnel</h3>
          <p>対象URLへの接続がタイムアウトしたか、オリジン側で制限されています。</p>
          <div class="meta">Target: ${cleanTarget}<br/>Wisp Server: ${activeConfig.wispServer}<br/>Engine: ${engine}</div>
          <button onclick="window.location.reload()">再試行</button>
          <button onclick="window.parent.postMessage({ type: 'LIQUID_BROWSER_NAV', url: 'about:search?q=' + encodeURIComponent(${JSON.stringify(cleanTarget)}) }, '*')">スマート検索で開く</button>
        </div>
      </body></html>`;

      return new Response(errorHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    })()
  );
});
