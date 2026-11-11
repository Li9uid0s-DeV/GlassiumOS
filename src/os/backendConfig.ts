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

export function isValidBackendUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === 'https:') return true;
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getBackendBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BACKEND_URL;
  try {
    const saved = localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (saved && isValidBackendUrl(saved)) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // ignore storage errors
  }
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_BACKEND_URL;
  if (envUrl && isValidBackendUrl(envUrl)) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_BACKEND_URL;
}

export function setBackendBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const candidate = url.trim();
  const cleaned = (isValidBackendUrl(candidate) ? candidate : DEFAULT_BACKEND_URL).replace(
    /\/+$/,
    ''
  );
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
  if (hasIntegratedLocalServer()) return false;
  return currentConnectionState.status !== 'connected';
}

export function hasIntegratedLocalServer(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname.toLowerCase();
  if (
    host.endsWith('.github.io') ||
    host.endsWith('.dpdns.org') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.vercel.app')
  ) {
    return false;
  }
  return true;
}

/**
 * Resolves a relative server path like `/api/music/play?...` or `/uv/service/...`
 * to the active Backend Server URL.
 */
export function resolveBackendUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  const normalized = pathOrUrl.startsWith('./') ? pathOrUrl.slice(1) : pathOrUrl;

  // When running on the integrated Express server (AI Studio / localhost:3000 / Cloud Run),
  // use the local server's /api/*, /uv/service/*, /scramjet/*, and /wisp/* directly for zero-latency execution.
  if (
    hasIntegratedLocalServer() &&
    (normalized.startsWith('/api/') ||
      normalized.startsWith('/uv/service/') ||
      normalized.startsWith('/scramjet/') ||
      normalized.startsWith('/wisp/'))
  ) {
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
 * Automatically pings the active backend server (/api/health) to verify connection
 * and honestly reports standby state if the server is unreachable.
 */
export async function autoConnectBackendServer(): Promise<BackendConnectionState> {
  const useLocal = hasIntegratedLocalServer();
  const base = useLocal && typeof window !== 'undefined' ? window.location.origin : getBackendBaseUrl();
  const healthUrl = useLocal ? '/api/health' : `${base}/api/health`;
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const res = await nativeFetch(healthUrl, {
      mode: useLocal ? 'same-origin' : 'cors',
      // 22s timeout for external Render backend to accommodate ~15.2s free-tier cold start (D3)
      signal: AbortSignal.timeout(useLocal ? 5000 : 22000),
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
    // Health check failed or timed out; mark honestly as standby
  }

  currentConnectionState = {
    status: 'standby',
    url: base,
    engines: ['ultraviolet', 'scramjet', 'wisp', 'music', 'entertainment', 'ai', 'games'],
    latencyMs: 0,
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
 * requests through the active Node.js backend server (integrated Express server first).
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

  // 1. If running on the integrated Express server host, hit local server.ts directly for zero-latency full features
  if (hasIntegratedLocalServer() && isBackendRoute) {
    return nativeFetch(cleanPath, init);
  }

  // 2. Route to external Backend Server when deployed on a static-only host
  if (base && isBackendRoute) {
    const targetUrl = `${base}${cleanPath}`;
    return nativeFetch(targetUrl, {
      ...init,
      mode: 'cors',
      signal: init?.signal ?? AbortSignal.timeout(25000),
    });
  }

  return nativeFetch(input, init);
}

let interceptorInstalled = false;
let healthCheckIntervalId: number | null = null;

export function installBackendFetchInterceptor(): void {
  if (typeof window === 'undefined' || interceptorInstalled) return;
  interceptorInstalled = true;

  // Ensure default backend URL is stored automatically if empty or invalid
  try {
    const existing = localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (!existing || !isValidBackendUrl(existing)) {
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

  // Verify backend server connection on boot and periodically
  autoConnectBackendServer().catch(() => {});
  if (healthCheckIntervalId !== null) {
    window.clearInterval(healthCheckIntervalId);
  }
  healthCheckIntervalId = window.setInterval(() => {
    autoConnectBackendServer().catch(() => {});
  }, 9 * 60 * 1000);
}
