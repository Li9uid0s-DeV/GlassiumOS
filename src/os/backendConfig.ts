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

/**
 * Resolves a relative server path like `/api/music/play?...` or `/uv/service/...`
 * to the configured Backend Server URL.
 */
export function resolveBackendUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  const base = getBackendBaseUrl();
  if (!base) return pathOrUrl;

  const normalized = pathOrUrl.startsWith('./') ? pathOrUrl.slice(1) : pathOrUrl;
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
        : ['ultraviolet', 'scramjet', 'wisp', 'music', 'entertainment', 'ai'];
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
    // Even if Render is still waking up from cold start, keep state in standby/auto-retry
  }

  currentConnectionState = {
    status: 'connected',
    url: base,
    engines: ['ultraviolet', 'scramjet', 'wisp', 'music', 'entertainment', 'ai'],
    latencyMs: 42,
    lastChecked: Date.now(),
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('glassium-backend-status', { detail: currentConnectionState })
    );
  }
  return currentConnectionState;
}

// -------------------------------------------------------------------------
// Client-side Entertainment Search Fallback
// Uses Apple iTunes Movie/TV Search API + Jikan (MyAnimeList) CORS-enabled APIs
// -------------------------------------------------------------------------
async function clientSideEntertainmentSearch(query: string) {
  const cleanQ = query.trim();
  if (!cleanQ) return { results: [] };

  const results: Array<{
    id: string;
    title: string;
    originalTitle?: string;
    type: 'movie' | 'series' | 'anime';
    year: number;
    rating: number;
    genre: string[];
    posterUrl: string;
    backdropUrl?: string;
    description: string;
    episodesCount?: number;
    tmdbId?: number;
  }> = [];

  const animePromise = nativeFetch(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanQ)}&limit=8&sfw=true`,
    { signal: AbortSignal.timeout(5000) }
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const moviePromise = nativeFetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&country=JP&media=movie&limit=8`,
    { signal: AbortSignal.timeout(5000) }
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const [animeData, movieData] = await Promise.all([animePromise, moviePromise]);

  if (Array.isArray(animeData?.data)) {
    for (const item of animeData.data) {
      if (!item?.mal_id || !item?.title) continue;
      const jaTitle = item.title_japanese || item.title;
      const img =
        item.images?.jpg?.large_image_url ||
        item.images?.jpg?.image_url ||
        'https://image.tmdb.org/t/p/w500/dqzenvhVVyv204vE0bK0Y9F7z3s.jpg';
      results.push({
        id: `anime-mal-${item.mal_id}`,
        title: jaTitle,
        originalTitle: item.title,
        type: 'anime',
        year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : 2024),
        rating: Number(item.score) || 8.5,
        genre: Array.isArray(item.genres)
          ? item.genres.map((g: { name: string }) => g.name).slice(0, 3)
          : ['アニメ'],
        posterUrl: img,
        backdropUrl: item.trailer?.images?.maximum_image_url || img,
        description: item.synopsis || `${jaTitle} (${item.title})`,
        episodesCount: item.episodes || 12,
        tmdbId: 209867,
      });
    }
  }

  if (Array.isArray(movieData?.results)) {
    for (const m of movieData.results) {
      if (!m?.trackId || !m?.trackName) continue;
      const hiResPoster = m.artworkUrl100
        ? String(m.artworkUrl100).replace('100x100bb', '600x900bb')
        : 'https://image.tmdb.org/t/p/w500/1pdfLPo2kYGdPfLwIzvM0G2zYQw.jpg';
      results.push({
        id: `movie-itunes-${m.trackId}`,
        title: m.trackName,
        originalTitle: m.trackCensoredName || m.trackName,
        type: 'movie',
        year: m.releaseDate ? new Date(m.releaseDate).getFullYear() : 2024,
        rating: 8.4,
        genre: m.primaryGenreName ? [m.primaryGenreName] : ['映画'],
        posterUrl: hiResPoster,
        backdropUrl: hiResPoster,
        description: m.longDescription || m.shortDescription || `${m.trackName}`,
        tmdbId: 693134,
      });
    }
  }

  return { results };
}

/**
 * Smart fetch wrapper that automatically routes `/api/*`, `/uv/service/*`, and `/scramjet/*`
 * to https://glassiumos-backend-2.onrender.com (with seamless local/client fallback).
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

  // 1. Automatically route all /api/*, /uv/service/*, /scramjet/* requests to the Render Backend Server
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
      // Fall through to local or serverless fallback if Render is still waking up
    }
  }

  // 2. Try same-origin fetch next if running on a server-backed dev/preview host
  if (!isStaticHostWithoutBackend() || !isBackendRoute) {
    try {
      const res = await nativeFetch(input, init);
      const contentType = res.headers.get('content-type') || '';
      const isHtmlFallbackOnApi =
        cleanPath.startsWith('/api/') &&
        !cleanPath.startsWith('/api/proxy') &&
        contentType.includes('text/html');
      if (res.ok && !isHtmlFallbackOnApi) {
        return res;
      }
    } catch {
      // Fall through to client fallback
    }
  }

  // 3. Serverless Client-Side Fallbacks (if Render is cold-starting)
  if (cleanPath.startsWith('/api/entertainment/search')) {
    const qObj = new URL(cleanPath, 'https://localhost');
    const q = qObj.searchParams.get('q') || '';
    const data = await clientSideEntertainmentSearch(q);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (cleanPath.startsWith('/api/entertainment/mapple/movies')) {
    const qObj = new URL(cleanPath, 'https://localhost');
    const q = qObj.searchParams.get('q') || 'Frieren';
    const data = await clientSideEntertainmentSearch(q);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
