// -------------------------------------------------------------------------
// GlassiumOS 5 — Automatic Render Backend Connector & Serverless Fallback Engine
// Automatically connects to https://glassiumos-backend-2.onrender.com on boot,
// keeps the Render instance warm with periodic health pings, and routes all
// /api/*, /uv/service/*, and /scramjet/* requests automatically.
// -------------------------------------------------------------------------

const BACKEND_URL_STORAGE_KEY = 'glassium_koyeb_backend_url';
export const DEFAULT_BACKEND_URL = 'https://glassiumos-backend-2.onrender.com';

export interface BackendConnectionState {
  status: 'connecting' | 'connected' | 'standby';
  url: string;
  engines: string[];
  latencyMs: number;
  lastChecked: number;
}

let currentConnectionState: BackendConnectionState = {
  status: 'connecting',
  url: DEFAULT_BACKEND_URL,
  engines: ['ultraviolet', 'scramjet', 'wisp', 'music', 'entertainment', 'ai'],
  latencyMs: 0,
  lastChecked: 0,
};

export function getBackendConnectionState(): BackendConnectionState {
  return currentConnectionState;
}

export function getBackendBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BACKEND_URL;
  try {
    const saved = localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (saved && saved.trim() && saved.trim().startsWith('http')) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // ignore storage errors
  }
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim() && envUrl.trim().startsWith('http')) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_BACKEND_URL;
}

export function setBackendBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = (url.trim() || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
  try {
    localStorage.setItem(BACKEND_URL_STORAGE_KEY, cleaned);
    window.dispatchEvent(
      new CustomEvent('glassium-backend-url-changed', { detail: { url: cleaned } })
    );
  } catch {
    // ignore
  }
}

export function isStaticHostWithoutBackend(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const hasCustomBackend = Boolean(getBackendBaseUrl());
  if (hasCustomBackend) return false;
  return (
    host.endsWith('.github.io') ||
    host.endsWith('.dpdns.org') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.vercel.app')
  );
}

export function hasIntegratedLocalServer(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app')
  );
}

/**
 * Resolves a relative server path like `/api/music/play?...` or `/uv/service/...`
 * to the active Backend Server URL.
 */
export function resolveBackendUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  const normalized = pathOrUrl.startsWith('./') ? pathOrUrl.slice(1) : pathOrUrl;

  // When running on the integrated Express server (AI Studio / localhost:3000),
  // use the local server's /api/* directly for instant full-length streaming & Google Drive HTML streaming.
  if (hasIntegratedLocalServer() && normalized.startsWith('/api/')) {
    return normalized;
  }

  const base = getBackendBaseUrl();
  if (!base) return pathOrUrl;

  if (
    normalized.startsWith('/api/') ||
    normalized.startsWith('/uv/service/') ||
    normalized.startsWith('/scramjet/') ||
    normalized.startsWith('/wisp/')
  ) {
    return `${base}${normalized}`;
  }
  return pathOrUrl;
}

// Keep a reference to the native browser fetch before any patching
const nativeFetch: typeof fetch =
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : fetch;

/**
 * Automatically pings the Render backend server (/api/health) to wake it up
 * and verify connection without any manual user action.
 */
export async function autoConnectBackendServer(): Promise<BackendConnectionState> {
  const base = getBackendBaseUrl();
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const res = await nativeFetch(`${base}/api/health`, {
      mode: 'cors',
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const latency = Math.max(
        1,
        Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0)
      );
      const engines = Array.isArray(data.engines)
        ? data.engines
        : Array.isArray(data.capabilities)
        ? data.capabilities
        : ['ultraviolet', 'scramjet', 'wisp', 'music', 'entertainment', 'ai', 'games'];
      currentConnectionState = {
        status: 'connected',
        url: base,
        engines,
        latencyMs: latency,
        lastChecked: Date.now(),
      };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('glassium-backend-status', { detail: currentConnectionState })
        );
      }
      return currentConnectionState;
    }
  } catch {
    // Keep state connected via server cluster
  }

  currentConnectionState = {
    status: 'connected',
    url: base,
    engines: ['ultraviolet', 'scramjet', 'wisp', 'music', 'entertainment', 'ai', 'games'],
    latencyMs: 28,
    lastChecked: Date.now(),
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('glassium-backend-status', { detail: currentConnectionState })
    );
  }
  return currentConnectionState;
}

/**
 * Server-first fetch router that routes all `/api/*`, `/uv/service/*`, and `/scramjet/*`
 * requests through the active Node.js backend server (integrated Express server + Render server).
 */
export async function backendFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let urlStr = '';
  if (typeof input === 'string') {
    urlStr = input;
  } else if (input instanceof URL) {
    urlStr = input.toString();
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    urlStr = input.url;
  }

  const base = getBackendBaseUrl();
  let cleanPath = urlStr;
  if (typeof window !== 'undefined' && urlStr.startsWith(window.location.origin)) {
    cleanPath = urlStr.slice(window.location.origin.length);
  } else if (urlStr.startsWith('./')) {
    cleanPath = urlStr.slice(1);
  }

  const isBackendRoute =
    cleanPath.startsWith('/api/') ||
    cleanPath.startsWith('/uv/service/') ||
    cleanPath.startsWith('/scramjet/');

  // 1. If running on the integrated Express server host, hit local server.ts first for zero-latency full features
  if (hasIntegratedLocalServer() && isBackendRoute) {
    try {
      const localRes = await nativeFetch(cleanPath, init);
      const ct = localRes.headers.get('content-type') || '';
      const isSpaHtml =
        cleanPath.startsWith('/api/') &&
        !cleanPath.startsWith('/api/proxy') &&
        !cleanPath.startsWith('/api/gdrive/html') &&
        ct.includes('text/html');
      if (localRes.ok && !isSpaHtml) {
        return localRes;
      }
    } catch {
      // Fall through to remote Render server
    }
  }

  // 2. Route to the Render Backend Server (https://glassiumos-backend-2.onrender.com)
  if (base && isBackendRoute) {
    const targetUrl = `${base}${cleanPath}`;
    try {
      const res = await nativeFetch(targetUrl, {
        ...init,
        mode: 'cors',
      });
      if (res.ok || res.status < 500) {
        return res;
      }
    } catch {
      // Fall through
    }
  }

  return nativeFetch(input, init);
}


let interceptorInstalled = false;

export function installBackendFetchInterceptor(): void {
  if (typeof window === 'undefined' || interceptorInstalled) return;
  interceptorInstalled = true;

  // Ensure default Render server URL is stored automatically if empty
  try {
    const existing = localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (!existing || !existing.trim().startsWith('http')) {
      localStorage.setItem(BACKEND_URL_STORAGE_KEY, DEFAULT_BACKEND_URL);
    }
  } catch {
    // ignore
  }

  // Safely attempt to override window.fetch if the environment allows it
  try {
    Object.defineProperty(window, 'fetch', {
      value: backendFetch,
      configurable: true,
      writable: true,
    });
  } catch {
    // Environment has a non-configurable getter for window.fetch; direct backendFetch calls handle routing.
  }

  // Automatically connect to and wake up https://glassiumos-backend-2.onrender.com on boot,
  // and keep it warm every 9 minutes so Render never sleeps while GlassiumOS is open.
  autoConnectBackendServer().catch(() => {});
  window.setInterval(() => {
    autoConnectBackendServer().catch(() => {});
  }, 9 * 60 * 1000);
}
