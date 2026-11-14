import { backendFetch, hasIntegratedLocalServer, resolveBackendUrl } from './backendConfig';

export interface BingWallpaperItem {
  id: string;
  url: string;
  rawUrl: string;
  backupUrl?: string;
  proxyUrl?: string;
  title: string;
  copyright: string;
  date: string;
  dominantRgb?: [number, number, number];
}

export type LockWallpaperMode = 'bing' | 'sync-desktop' | 'preset' | 'depth' | 'custom';

export interface LockWallpaperConfig {
  mode: LockWallpaperMode;
  bingIndex: number;
  presetKey: string;
  depthScene: 'alpine' | 'aurora' | 'cyber-arch' | 'golden-dusk';
  customImageUrl: string;
  customImageName?: string;
}

const LOCK_WALLPAPER_STORAGE_KEY = 'glassium_lock_wallpaper_config_v1';
const DESKTOP_BING_INDEX_KEY = 'glassium_desktop_bing_index_v1';

export function makeFallbackNatureSvgDataUri(idx = 0): string {
  const palettes = [
    { sky1: '#0a192f', sky2: '#1b4965', sun: '#ffd166', m1: '#1d3557', m2: '#0f2027', mist: '#a8dadc' },
    { sky1: '#1a1423', sky2: '#684756', sun: '#ff9f1c', m1: '#2d1e2f', m2: '#160f19', mist: '#f4a261' },
    { sky1: '#072227', sky2: '#35858b', sun: '#aefeff', m1: '#0b3c49', m2: '#041c24', mist: '#4fbdba' },
  ];
  const p = palettes[Math.abs(idx) % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.sky1}"/>
        <stop offset="65%" stop-color="${p.sky2}"/>
        <stop offset="100%" stop-color="${p.mist}" stop-opacity="0.45"/>
      </linearGradient>
      <radialGradient id="sun" cx="68%" cy="34%" r="36%">
        <stop offset="0%" stop-color="${p.sun}" stop-opacity="0.85"/>
        <stop offset="40%" stop-color="${p.sun}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${p.sun}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#sky)"/>
    <rect width="1920" height="1080" fill="url(#sun)"/>
    <path d="M0,760 L260,510 L540,670 L890,420 L1240,650 L1560,460 L1920,690 L1920,1080 L0,1080 Z" fill="${p.m1}" opacity="0.88"/>
    <path d="M0,840 L380,620 L740,790 L1150,540 L1490,740 L1920,580 L1920,1080 L0,1080 Z" fill="${p.m2}"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Curated initial Bing Daily Nature Wallpapers using direct Microsoft Bing CDN
 * and Peapix CDN mirrors so images load immediately on GitHub Pages (*.github.io)
 * and Google Apps Script (script.google.com / *.googleusercontent.com) with zero 404s.
 */
export const DEFAULT_BING_WALLPAPERS: BingWallpaperItem[] = [
  {
    id: 'bing-0',
    rawUrl: 'https://www.bing.com/th?id=OHR.BlueHK_JA-JP0477081186_1920x1080.jpg',
    url: 'https://www.bing.com/th?id=OHR.BlueHK_JA-JP0477081186_1920x1080.jpg',
    backupUrl: 'https://img.peapix.com/1a1f985afa6147889000bbc39fee071c_1920.jpg',
    title: '上へ上へと伸びる街 (ビクトリア・ハーバー、香港)',
    copyright: 'ビクトリア・ハーバー、香港、中国 (© Juan Romero/Cavan Images)',
    date: '2026-11-14',
    dominantRgb: [28, 92, 168],
  },
  {
    id: 'bing-1',
    rawUrl: 'https://www.bing.com/th?id=OHR.AbrahamCanada_JA-JP9609532400_1920x1080.jpg',
    url: 'https://www.bing.com/th?id=OHR.AbrahamCanada_JA-JP9609532400_1920x1080.jpg',
    backupUrl: 'https://img.peapix.com/90071a3ee0d544f99aa78a1eb86474b9_1920.jpg',
    title: '氷の下の神秘 (アブラハム湖、カナダ)',
    copyright: 'アブラハム湖、アルバータ州、カナダ (© Guang Cao/Getty Images)',
    date: '2026-11-13',
    dominantRgb: [36, 148, 196],
  },
  {
    id: 'bing-2',
    rawUrl: 'https://www.bing.com/th?id=OHR.NorthWindow_JA-JP8307735119_1920x1080.jpg',
    url: 'https://www.bing.com/th?id=OHR.NorthWindow_JA-JP8307735119_1920x1080.jpg',
    backupUrl: 'https://img.peapix.com/b95fe7844f4f48f8aea1c8f13e0d855d_1920.jpg',
    title: '自然が生んだ建築美 (アーチーズ国立公園、ユタ州)',
    copyright: 'ノース・ウィンドウ、アーチーズ国立公園、アメリカ (© lightphoto/Getty Images)',
    date: '2026-11-12',
    dominantRgb: [198, 98, 52],
  },
  {
    id: 'bing-3',
    rawUrl: 'https://www.bing.com/th?id=OHR.Atlantica_JA-JP3902829738_1920x1080.jpg',
    url: 'https://www.bing.com/th?id=OHR.Atlantica_JA-JP3902829738_1920x1080.jpg',
    backupUrl: 'https://img.peapix.com/b2e63b38cd3e42a995a4951c8316f8fe_1920.jpg',
    title: '驚きに満ちた森 (大西洋岸森林、ブラジル)',
    copyright: '大西洋岸森林、ブラジル (© FG Trade/Getty Images)',
    date: '2026-11-11',
    dominantRgb: [34, 138, 94],
  },
  {
    id: 'bing-4',
    rawUrl: 'https://www.bing.com/th?id=OHR.RoseIsland_JA-JP3257968381_1920x1080.jpg',
    url: 'https://www.bing.com/th?id=OHR.RoseIsland_JA-JP3257968381_1920x1080.jpg',
    backupUrl: 'https://img.peapix.com/7d367fff9cc24b438f1b2fc2184e8d52_1920.jpg',
    title: '楽園でひと休み (ローズ島の空撮、バハマ)',
    copyright: 'ローズ島の空撮、バハマ (© Abstract Aerial Art/Getty Images)',
    date: '2026-11-10',
    dominantRgb: [20, 168, 184],
  },
  {
    id: 'bing-5',
    rawUrl: 'https://www.bing.com/th?id=OHR.TrianaSpain_JA-JP2076026093_1920x1080.jpg',
    url: 'https://www.bing.com/th?id=OHR.TrianaSpain_JA-JP2076026093_1920x1080.jpg',
    backupUrl: 'https://img.peapix.com/046cba8bfd0b49d9bb84318ead420218_1920.jpg',
    title: '芸術がリズムを刻む街 (セビリア・トリアナ、スペイン)',
    copyright: 'セビリアの歴史地区トリアナ、スペイン (© Andrzej Rostek/Getty Images)',
    date: '2026-11-09',
    dominantRgb: [214, 134, 62],
  },
];

let cachedWallpapers: BingWallpaperItem[] = DEFAULT_BING_WALLPAPERS;
let lastFetchTimestamp = 0;
let inflightPromise: Promise<BingWallpaperItem[]> | null = null;

function normalizeBingUrl(rawUrl?: string, proxyUrl?: string, idx = 0): { primary: string; backup: string; proxy: string } {
  const fallbackItem = DEFAULT_BING_WALLPAPERS[idx % DEFAULT_BING_WALLPAPERS.length];
  let cleanRaw = (rawUrl || '').trim();
  if (cleanRaw.startsWith('/th?')) {
    cleanRaw = `https://www.bing.com${cleanRaw}`;
  }

  let cleanProxy = (proxyUrl || '').trim();
  if (cleanProxy.startsWith('/api/')) {
    cleanProxy = resolveBackendUrl(cleanProxy);
  }

  // On GitHub Pages / script.google.com / static hosts, always prefer direct https://www.bing.com or https://img.peapix.com URL
  // so <img> tags never hit a relative /api/bing-image 404.
  const isLocalIntegrated = hasIntegratedLocalServer();
  if (cleanRaw.startsWith('https://')) {
    return {
      primary: cleanRaw,
      backup: fallbackItem.backupUrl || cleanProxy || fallbackItem.rawUrl,
      proxy: isLocalIntegrated && cleanProxy ? cleanProxy : `https://wsrv.nl/?url=${encodeURIComponent(cleanRaw)}`,
    };
  }

  if (cleanProxy.startsWith('https://') || (isLocalIntegrated && cleanProxy.startsWith('/api/'))) {
    return {
      primary: cleanProxy,
      backup: fallbackItem.rawUrl,
      proxy: fallbackItem.backupUrl || fallbackItem.rawUrl,
    };
  }

  return {
    primary: fallbackItem.rawUrl,
    backup: fallbackItem.backupUrl || fallbackItem.rawUrl,
    proxy: makeFallbackNatureSvgDataUri(idx),
  };
}

/**
 * Fetches live Bing Daily Wallpapers from:
 * 1) Backend /api/bing-wallpaper (if available)
 * 2) Peapix Bing Japan Feed (CORS-enabled for GitHub Pages & script.google.com)
 * 3) bing.biturl.top JSON API (CORS-enabled fallback)
 * Always returns at least 6 valid high-res Bing wallpapers.
 */
export async function fetchBingWallpapers(forceRefresh = false): Promise<BingWallpaperItem[]> {
  if (!forceRefresh && Date.now() - lastFetchTimestamp < 15 * 60 * 1000 && cachedWallpapers.length > 0) {
    return cachedWallpapers;
  }
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    const collected: BingWallpaperItem[] = [];

    // Strategy A: Try Backend /api/bing-wallpaper
    try {
      const res = await backendFetch('/api/bing-wallpaper', {
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          images?: Array<{
            rawUrl?: string;
            url?: string;
            backupUrl?: string;
            title?: string;
            copyright?: string;
            date?: string;
          }>;
        };
        if (Array.isArray(data.images) && data.images.length > 0) {
          data.images.forEach((im, idx) => {
            const urls = normalizeBingUrl(im.rawUrl, im.url, idx);
            const fb = DEFAULT_BING_WALLPAPERS[idx % DEFAULT_BING_WALLPAPERS.length];
            collected.push({
              id: `bing-${idx}`,
              url: urls.primary,
              rawUrl: urls.primary,
              backupUrl: im.backupUrl || urls.backup,
              proxyUrl: urls.proxy,
              title: im.title || fb.title,
              copyright: im.copyright || fb.copyright,
              date: im.date || fb.date,
              dominantRgb: fb.dominantRgb,
            });
          });
        }
      }
    } catch {
      // Backend unreachable (e.g. GitHub Pages or script.google.com without backend), continue to direct CORS APIs
    }

    // Strategy B: Direct CORS-friendly Peapix Bing Japan Feed (works directly in browser on GitHub Pages & script.google.com)
    if (collected.length === 0) {
      try {
        const peaRes = await fetch('https://peapix.com/bing/feed?country=jp', {
          signal: AbortSignal.timeout(5000),
        });
        if (peaRes.ok) {
          const peaData = (await peaRes.json()) as Array<{
            title?: string;
            copyright?: string;
            fullUrl?: string;
            imageUrl?: string;
            date?: string;
          }>;
          if (Array.isArray(peaData) && peaData.length > 0) {
            peaData.slice(0, 6).forEach((item, idx) => {
              const fb = DEFAULT_BING_WALLPAPERS[idx % DEFAULT_BING_WALLPAPERS.length];
              const full = item.fullUrl || item.imageUrl || fb.rawUrl;
              collected.push({
                id: `bing-${idx}`,
                url: full,
                rawUrl: full,
                backupUrl: fb.rawUrl,
                proxyUrl: `https://wsrv.nl/?url=${encodeURIComponent(full)}`,
                title: item.title || fb.title,
                copyright: item.copyright || fb.copyright,
                date: item.date || fb.date,
                dominantRgb: fb.dominantRgb,
              });
            });
          }
        }
      } catch {
        // continue to Strategy C
      }
    }

    // Strategy C: Direct CORS-friendly bing.biturl.top JSON API
    if (collected.length === 0) {
      try {
        const bitRes = await fetch(
          'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=ja-JP',
          { signal: AbortSignal.timeout(4500) }
        );
        if (bitRes.ok) {
          const bitData = (await bitRes.json()) as {
            url?: string;
            copyright?: string;
            start_date?: string;
          };
          if (bitData.url && bitData.url.startsWith('https://')) {
            const first: BingWallpaperItem = {
              id: 'bing-0',
              url: bitData.url,
              rawUrl: bitData.url,
              backupUrl: DEFAULT_BING_WALLPAPERS[0].backupUrl,
              proxyUrl: `https://wsrv.nl/?url=${encodeURIComponent(bitData.url)}`,
              title: bitData.copyright?.split('(')[0]?.trim() || DEFAULT_BING_WALLPAPERS[0].title,
              copyright: bitData.copyright || DEFAULT_BING_WALLPAPERS[0].copyright,
              date: bitData.start_date || DEFAULT_BING_WALLPAPERS[0].date,
              dominantRgb: DEFAULT_BING_WALLPAPERS[0].dominantRgb,
            };
            collected.push(first, ...DEFAULT_BING_WALLPAPERS.slice(1));
          }
        }
      } catch {
        // use curated defaults
      }
    }

    if (collected.length > 0) {
      cachedWallpapers = collected;
      lastFetchTimestamp = Date.now();
    }
    inflightPromise = null;
    return cachedWallpapers;
  })();

  return inflightPromise;
}

export function getCachedBingWallpapers(): BingWallpaperItem[] {
  return cachedWallpapers;
}

export function getDesktopBingIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(DESKTOP_BING_INDEX_KEY);
    const parsed = raw !== null ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function setDesktopBingIndex(idx: number): void {
  if (typeof window === 'undefined') return;
  const safeIdx = Math.max(0, Math.floor(idx));
  try {
    localStorage.setItem(DESKTOP_BING_INDEX_KEY, String(safeIdx));
    window.dispatchEvent(
      new CustomEvent('glassium-desktop-bing-changed', { detail: { index: safeIdx } })
    );
  } catch {
    // ignore
  }
}

export const DEFAULT_LOCK_WALLPAPER_CONFIG: LockWallpaperConfig = {
  mode: 'bing',
  bingIndex: 0,
  presetKey: 'live2d',
  depthScene: 'alpine',
  customImageUrl: '',
  customImageName: '',
};

export function loadLockWallpaperConfig(): LockWallpaperConfig {
  if (typeof window === 'undefined') return DEFAULT_LOCK_WALLPAPER_CONFIG;
  try {
    const raw = localStorage.getItem(LOCK_WALLPAPER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LockWallpaperConfig>;
      return {
        ...DEFAULT_LOCK_WALLPAPER_CONFIG,
        ...parsed,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_LOCK_WALLPAPER_CONFIG;
}

export function saveLockWallpaperConfig(next: Partial<LockWallpaperConfig>): LockWallpaperConfig {
  const merged: LockWallpaperConfig = {
    ...loadLockWallpaperConfig(),
    ...next,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCK_WALLPAPER_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(
        new CustomEvent('glassium-lock-wallpaper-changed', { detail: merged })
      );
    } catch {
      // ignore
    }
  }
  return merged;
}
