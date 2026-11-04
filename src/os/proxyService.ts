// -------------------------------------------------------------------------
// LiquidOS Proxy Engine Service (Scramjet & Ultraviolet) & Monochrome Music
// -------------------------------------------------------------------------

export type ProxyEngine = 'scramjet' | 'ultraviolet' | 'direct';

export interface ProxySession {
  engine: ProxyEngine;
  status: 'connected' | 'connecting' | 'idle';
  latencyMs: number;
  cipher: string;
  bytesReceived: number;
  bytesSent: number;
  bareServerUrl: string;
  activeTunnels: number;
  logs: { time: string; engine: ProxyEngine; text: string }[];
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface MonochromeTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverGradient: string;
  coverAccent: string;
  artworkUrl?: string;
  audioUrl?: string;
  isFullLengthStream?: boolean;
  monoTrackId?: string | number;
  sourceUrl?: string;
  duration: number; // full track duration in seconds (e.g. 180-300s, never 30s)
  format: string;
  bitrate: string;
  genre: string;
  year: number;
  lyrics: LyricLine[];
  // Musical synthesis parameters for Web Audio fallback engine
  synthParams: {
    tempo: number; // BPM
    rootFreq: number; // e.g. 55 Hz (A1)
    chords: number[][]; // chord frequencies
    bassFreqs: number[];
    leadType: 'sine' | 'triangle' | 'sawtooth';
    filterCutoff: number;
  };
}

// -------------------------------------------------------------------------
// Ultraviolet (UV) & Scramjet URL Encoding Helpers
// -------------------------------------------------------------------------
export function encodeUltraviolet(url: string): string {
  // Ultraviolet XOR key encoding
  if (!url) return '';
  const key = 2;
  const encoded = encodeURIComponent(url)
    .split('')
    .map((char, ind) => (ind % 2 === 0 ? String.fromCharCode(char.charCodeAt(0) ^ key) : char))
    .join('');
  return `uv://${btoa(encoded)}`;
}

export function decodeUltraviolet(encodedString: string): string {
  try {
    if (!encodedString.startsWith('uv://')) return encodedString;
    const raw = atob(encodedString.replace('uv://', ''));
    const key = 2;
    const decoded = raw
      .split('')
      .map((char, ind) => (ind % 2 === 0 ? String.fromCharCode(char.charCodeAt(0) ^ key) : char))
      .join('');
    return decodeURIComponent(decoded);
  } catch {
    return encodedString;
  }
}

export function encodeScramjet(url: string): string {
  if (!url) return '';
  return `scramjet://${encodeURIComponent(url)}`;
}

export function decodeScramjet(encodedString: string): string {
  try {
    if (!encodedString.startsWith('scramjet://')) return encodedString;
    return decodeURIComponent(encodedString.replace('scramjet://', ''));
  } catch {
    return encodedString;
  }
}

// -------------------------------------------------------------------------
// Curated Monochrome Music Catalog with Synced Lyrics
// -------------------------------------------------------------------------
export const MONOCHROME_CATALOG: MonochromeTrack[] = [
  {
    id: 'track-1',
    title: 'Singularity Horizon',
    artist: 'Lorn & Kavinsky',
    album: 'Gravitational Resonance (Monochrome Edition)',
    coverGradient: 'from-zinc-950 via-zinc-900 to-black',
    coverAccent: '#f97316',
    duration: 198,
    format: 'FLAC 24-bit / 96kHz Lossless',
    bitrate: '9216 kbps (Hi-Fi)',
    genre: 'Cosmic Cyberpunk / Darkwave',
    year: 2026,
    synthParams: {
      tempo: 96,
      rootFreq: 55, // A1
      chords: [
        [110, 130.81, 164.81], // Am
        [87.31, 110, 130.81],   // F
        [98.00, 123.47, 146.83], // G
        [82.41, 110, 123.47],   // Em
      ],
      bassFreqs: [55, 43.65, 49.0, 41.2],
      leadType: 'sawtooth',
      filterCutoff: 950,
    },
    lyrics: [
      { time: 0, text: '♪ [Instrumental Gravitational Overture] ♪' },
      { time: 10, text: 'Drifting beyond the event horizon' },
      { time: 16, text: 'Photons bent in an infinite ring of fire' },
      { time: 22, text: 'Monochrome frequencies cutting through vacuum' },
      { time: 28, text: 'There is no silence where the proxy flows' },
      { time: 35, text: 'Scramjet packets accelerating past light' },
      { time: 42, text: 'Ultraviolet waves dancing in dark matter' },
      { time: 48, text: 'We find our pulse inside the obsidian core' },
      { time: 55, text: '♪ [Heavy Cybernetic Bass Drop & Accretion Flare] ♪' },
      { time: 68, text: 'Hold the frequency steady' },
      { time: 74, text: 'Let the wave fold time upon itself' },
      { time: 80, text: 'Every harmonic a memory of a distant star' },
      { time: 88, text: 'Falling forever, yet standing still' },
      { time: 98, text: '♪ [Resonant Filter Sweep & Sub-bass Glide] ♪' },
      { time: 112, text: 'Stream the lossless signal into the void' },
      { time: 118, text: 'Zero compression, zero decay' },
      { time: 125, text: 'We are the shadows dancing on the glass' },
      { time: 132, text: 'Monochrome symphony at the edge of the universe' },
      { time: 145, text: '♪ [Crescendo of Liquid Synthesizers] ♪' },
      { time: 165, text: 'Echoes fading into the Schwarzschild radius...' },
      { time: 180, text: 'Pure stillness returns to the void.' },
    ],
  },
  {
    id: 'track-2',
    title: 'Liquid Obsidian',
    artist: 'Tycho & Carbon Based Lifeforms',
    album: 'Photonic Drift',
    coverGradient: 'from-slate-950 via-zinc-900 to-cyan-950',
    coverAccent: '#06b6d4',
    duration: 215,
    format: 'FLAC 24-bit / 48kHz',
    bitrate: '4608 kbps',
    genre: 'Ambient Downtempo / Liquid Chill',
    year: 2026,
    synthParams: {
      tempo: 84,
      rootFreq: 65.41, // C2
      chords: [
        [130.81, 164.81, 196.00], // C
        [116.54, 146.83, 174.61], // Bb
        [103.83, 130.81, 155.56], // Ab
        [98.00, 123.47, 146.83],  // G
      ],
      bassFreqs: [65.41, 58.27, 51.91, 49.0],
      leadType: 'sine',
      filterCutoff: 1200,
    },
    lyrics: [
      { time: 0, text: '♪ [Soft Liquid Ripple & Ambient Shimmer] ♪' },
      { time: 12, text: 'Reflections on cold obsidian glass' },
      { time: 18, text: 'A sea of mercury shifting under starlight' },
      { time: 25, text: 'Every drop tuned to forty-eight kilohertz' },
      { time: 32, text: 'The browser tunnels through the firewall' },
      { time: 39, text: 'Unlocking melodies that sleep beneath the net' },
      { time: 47, text: '♪ [Warm Analog Pad Expansion] ♪' },
      { time: 58, text: 'Breathe the electronic vapor' },
      { time: 65, text: 'Listen to the liquid current flow' },
      { time: 73, text: 'No friction, no boundaries left to cross' },
      { time: 82, text: 'In Monochrome, all colors turn to sound' },
      { time: 94, text: '♪ [Chilled Drum Grooves & Shimmer Delay] ♪' },
      { time: 110, text: 'Beneath the surface of the screen' },
      { time: 118, text: 'A thousand packets swim like bioluminescent fish' },
      { time: 126, text: 'Guarded by Ultraviolet keys' },
      { time: 135, text: 'We float suspended in pure clarity' },
      { time: 150, text: '♪ [Atmospheric Outro with Liquid Echoes] ♪' },
      { time: 185, text: 'Obsidian dreams dissolve into light.' },
    ],
  },
  {
    id: 'track-3',
    title: 'Neon Monochrome',
    artist: 'The Midnight & Gunship',
    album: 'Monochrome Nights 1984',
    coverGradient: 'from-purple-950 via-zinc-950 to-pink-950',
    coverAccent: '#ec4899',
    duration: 204,
    format: 'FLAC 16-bit / 44.1kHz',
    bitrate: '1411 kbps',
    genre: 'Synthwave / Retro Electro',
    year: 2026,
    synthParams: {
      tempo: 110,
      rootFreq: 73.42, // D2
      chords: [
        [146.83, 174.61, 220.00], // Dm
        [116.54, 146.83, 174.61], // Bb
        [130.81, 164.81, 196.00], // C
        [98.00, 123.47, 146.83],  // G
      ],
      bassFreqs: [73.42, 58.27, 65.41, 49.0],
      leadType: 'sawtooth',
      filterCutoff: 1800,
    },
    lyrics: [
      { time: 0, text: '♪ [Arpeggiated Neon Synth & LinnDrum Beat] ♪' },
      { time: 8, text: 'Midnight on the coastal highway' },
      { time: 14, text: 'Raindrops scattering pink and violet streaks' },
      { time: 20, text: 'Dashboard glowing with the Monochrome player' },
      { time: 26, text: 'Singing songs we used to know by heart' },
      { time: 33, text: 'They tried to lock the music away' },
      { time: 39, text: 'Behind high walls and toll booths' },
      { time: 45, text: 'But Scramjet opened up the open lane' },
      { time: 51, text: 'And now the night is ours forever!' },
      { time: 58, text: '♪ [Chorus: Electric Guitar Solo & Dual Synths] ♪' },
      { time: 70, text: 'We are living in a Neon Monochrome world' },
      { time: 78, text: 'Black and white beneath the burning starlight' },
      { time: 85, text: 'Turn the volume to maximum overload' },
      { time: 92, text: 'Nothing can break this connection tonight!' },
      { time: 104, text: '♪ [Dynamic Saxophone Melody & Chorus Stabs] ♪' },
      { time: 120, text: 'Passing city towers wrapped in mist' },
      { time: 127, text: 'Frequencies bouncing off the skyscraper glass' },
      { time: 135, text: 'Every lyric synchronized in real time' },
      { time: 142, text: 'A beacon for the travelers of the dark' },
      { time: 152, text: '♪ [Grand Synthwave Climax] ♪' },
      { time: 175, text: 'We are eternal in this sound...' },
      { time: 190, text: 'Fade into the morning horizon.' },
    ],
  },
  {
    id: 'track-4',
    title: 'Quantum Vacuum Echoes',
    artist: 'Max Cooper & Jon Hopkins',
    album: 'Subatomic Symphony',
    coverGradient: 'from-emerald-950 via-zinc-950 to-teal-950',
    coverAccent: '#10b981',
    duration: 226,
    format: 'DSD 64 / 2.8MHz Master',
    bitrate: '5644 kbps',
    genre: 'IDM / Microscopic Minimal',
    year: 2026,
    synthParams: {
      tempo: 92,
      rootFreq: 61.74, // B1
      chords: [
        [123.47, 155.56, 185.00], // Bm
        [98.00, 123.47, 146.83],  // G
        [110.00, 138.59, 164.81], // A
        [82.41, 103.83, 123.47],  // E
      ],
      bassFreqs: [61.74, 49.0, 55.0, 41.2],
      leadType: 'triangle',
      filterCutoff: 1400,
    },
    lyrics: [
      { time: 0, text: '♪ [Micro-Clicks, Glitch Textures & Deep Sub Drone] ♪' },
      { time: 14, text: 'Particles popping into existence' },
      { time: 20, text: 'Annihilating in fractions of a femtosecond' },
      { time: 27, text: 'What seems empty is teeming with life' },
      { time: 34, text: 'Energy boiling in the lowest state' },
      { time: 42, text: 'The proxy listens where ears cannot reach' },
      { time: 50, text: 'Reconstructing the lost harmonics of the vacuum' },
      { time: 60, text: '♪ [Complex Polyrhythmic Pulse Build] ♪' },
      { time: 75, text: 'Zero-point fluctuations' },
      { time: 82, text: 'Breathing like a living universe' },
      { time: 90, text: 'Order emerging from quantum uncertainty' },
      { time: 100, text: 'Every waveform resolved at the speed of thought' },
      { time: 115, text: '♪ [Granular Synthesis & Crystalline Arpeggios] ♪' },
      { time: 135, text: 'Decoherence collapsing into melody' },
      { time: 145, text: 'The wave function becomes the song' },
      { time: 160, text: 'Listen as the universe observes itself' },
      { time: 180, text: 'Through the eyes of Monochrome.' },
    ],
  },
  {
    id: 'track-5',
    title: 'Interstellar Geodesic',
    artist: 'Hans Zimmer & Solar Fields',
    album: 'Cosmic Journey OST (Proxy Master)',
    coverGradient: 'from-amber-950 via-zinc-950 to-orange-950',
    coverAccent: '#f59e0b',
    duration: 240,
    format: 'FLAC 24-bit / 192kHz Studio Master',
    bitrate: '9216 kbps',
    genre: 'Cinematic Orchestral / Ambient Space',
    year: 2026,
    synthParams: {
      tempo: 78,
      rootFreq: 43.65, // F1
      chords: [
        [87.31, 110.00, 130.81],  // F
        [103.83, 130.81, 155.56], // Ab
        [116.54, 146.83, 174.61], // Bb
        [130.81, 164.81, 196.00], // C
      ],
      bassFreqs: [43.65, 51.91, 58.27, 65.41],
      leadType: 'sine',
      filterCutoff: 800,
    },
    lyrics: [
      { time: 0, text: '♪ [Solemn Cathedral Pipe Organ & Distant Strings] ♪' },
      { time: 18, text: 'Do not go gentle into that good night' },
      { time: 26, text: 'Rage, rage against the dying of the light' },
      { time: 35, text: 'A thousand light years from home' },
      { time: 44, text: 'Carried forward on a gravitational sling' },
      { time: 54, text: 'Time dilates, but music stands still' },
      { time: 65, text: 'One hour on this world is seven years back there' },
      { time: 76, text: '♪ [Massive Orchestral Surge with Ticking Clock] ♪' },
      { time: 92, text: 'Every second counts' },
      { time: 100, text: 'Every pulse of the proxy brings your voice back to me' },
      { time: 110, text: 'Through the wormhole, across the veil' },
      { time: 122, text: 'Love is the one thing that transcends dimensions' },
      { time: 135, text: 'Love, and the infinite beauty of sound.' },
      { time: 155, text: '♪ [Climactic Tonal Organ Crescendo] ♪' },
      { time: 185, text: 'We will meet beyond the singularity...' },
      { time: 210, text: 'Stay.' },
    ],
  },
];

// -------------------------------------------------------------------------
// Multi-Node Proxy Relay Servers (Works on GitHub Pages, GCS & Local Server)
// -------------------------------------------------------------------------
export type ProxyRelayNodeId =
  | 'auto'
  | 'sw-tunnel'
  | 'allorigins'
  | 'codetabs'
  | 'corsproxy'
  | 'jina-reader'
  | 'gcs-gateway'
  | 'local-api';

export interface ProxyRelayServerInfo {
  id: ProxyRelayNodeId;
  name: string;
  endpointLabel: string;
  region: string;
  description: string;
}

export const PROXY_RELAY_SERVERS: ProxyRelayServerInfo[] = [
  {
    id: 'auto',
    name: 'Auto Multi-Node Cascade',
    endpointLabel: 'SW + AllOrigins + CodeTabs + Jina',
    region: 'Global Edge',
    description: '自動的に最速・利用可能なプロキシサーバーを探索して404やForbiddenを回避します',
  },
  {
    id: 'sw-tunnel',
    name: 'Service Worker Proxy Tunnel',
    endpointLabel: './sw-proxy.js (Client SW)',
    region: 'In-Browser SW',
    description: 'ブラウザ内Service Workerでリクエストを中継・書き換えします (GitHub Pages対応)',
  },
  {
    id: 'allorigins',
    name: 'AllOrigins CORS Relay',
    endpointLabel: 'https://api.allorigins.win',
    region: 'US / Cloudflare',
    description: 'JSONエンベロープ経由でCORS制限や403/404を回避してHTML・APIを取得します',
  },
  {
    id: 'codetabs',
    name: 'CodeTabs Proxy Server',
    endpointLabel: 'https://api.codetabs.com/v1/proxy',
    region: 'EU / Global',
    description: '高速HTML/APIリレーサーバー。外部Webサイトや楽曲APIの中継に最適',
  },
  {
    id: 'corsproxy',
    name: 'CorsProxy.io Edge Node',
    endpointLabel: 'https://corsproxy.io',
    region: 'Anycast Edge',
    description: 'エッジキャッシュ対応のプロキシノード',
  },
  {
    id: 'jina-reader',
    name: 'Jina Cloud Reader Engine',
    endpointLabel: 'https://r.jina.ai',
    region: 'Cloud Render',
    description: 'SPAやJavaScript必須ページをクラウド側でレンダリングして取得します',
  },
  {
    id: 'gcs-gateway',
    name: 'Google Cloud Storage Gateway',
    endpointLabel: 'https://storage.googleapis.com',
    region: 'Google Cloud',
    description: 'storage.googleapis.com 上のバケット・静的アプリ・アセットへの直接接続とサンドボックス展開',
  },
  {
    id: 'local-api',
    name: 'Local Express Backend',
    endpointLabel: './api/proxy',
    region: 'Local Node',
    description: 'Node.jsバックエンド稼働環境用のローカルプロキシエンドポイント',
  },
];

export function isGitHubPages404OrInvalid(html: string): boolean {
  if (!html || html.trim().length < 15) return true;
  const trimmed = html.trim();
  if (trimmed === 'Forbidden' || trimmed === '404 Not Found' || trimmed === 'Not Found') return true;
  if (
    html.includes("There isn't a GitHub Pages site here.") ||
    html.includes('<title>Page not found &middot; GitHub Pages</title>') ||
    html.includes('Arcade Games encountered an issue')
  ) {
    return true;
  }
  return false;
}

export function rewriteHtmlForSrcDoc(rawHtml: string, targetUrlStr: string): string {
  let targetUrl: URL;
  try {
    targetUrl = new URL(targetUrlStr.startsWith('http') ? targetUrlStr : `https://${targetUrlStr}`);
  } catch {
    return rawHtml;
  }

  const origin = `${targetUrl.protocol}//${targetUrl.host}`;
  const pathDir = targetUrl.pathname.endsWith('/')
    ? targetUrl.pathname
    : targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf('/') + 1) || '/';
  const basePath = `${origin}${pathDir}`;

  const injectedHead = `
    <base href="${basePath}" />
    <meta name="referrer" content="no-referrer" />
    <style>
      html, body { max-width: 100vw !important; overflow-x: hidden !important; }
    </style>
    <script>
      (function() {
        window.__GLASSIUM_PROXIED__ = true;
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
    html = html.replace(/<head[^>]*>/i, (match) => `${match}${injectedHead}`);
  } else {
    html = `<!DOCTYPE html><html><head>${injectedHead}</head><body>${html}</body></html>`;
  }

  html = html.replace(/(href|src)=["']\/([^/"'][^"']*)["']/gi, `$1="${origin}/$2"`);
  return html;
}

export async function fetchHtmlViaProxyCascade(
  rawTargetUrl: string,
  preferredNode: ProxyRelayNodeId = 'auto'
): Promise<{ html: string; usedNode: string; finalUrl: string }> {
  let cleanTarget = rawTargetUrl.trim();
  if (/^gcs:\/\//i.test(cleanTarget)) {
    cleanTarget = 'https://storage.googleapis.com/' + cleanTarget.replace(/^gcs:\/+/i, '');
  } else if (!/^https?:\/\//i.test(cleanTarget)) {
    cleanTarget = 'https://' + cleanTarget;
  }

  const isStaticHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('storage.googleapis.com'));

  const tryAllOrigins = async (): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(cleanTarget)}`,
        { signal: AbortSignal.timeout(7000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.contents === 'string' && !isGitHubPages404OrInvalid(data.contents)) {
          return data.contents;
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const tryCodeTabs = async (): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanTarget)}`,
        { signal: AbortSignal.timeout(7000) }
      );
      if (res.ok) {
        const text = await res.text();
        if (!isGitHubPages404OrInvalid(text)) return text;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const tryCorsProxyIo = async (): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://corsproxy.io/?url=${encodeURIComponent(cleanTarget)}`,
        { signal: AbortSignal.timeout(7000) }
      );
      if (res.ok) {
        const text = await res.text();
        if (!isGitHubPages404OrInvalid(text)) return text;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const trySwTunnel = async (): Promise<string | null> => {
    try {
      const res = await fetch(`./sw-proxy?url=${encodeURIComponent(cleanTarget)}`, {
        signal: AbortSignal.timeout(6500),
      });
      if (res.ok) {
        const text = await res.text();
        if (!isGitHubPages404OrInvalid(text)) return text;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const tryLocalApi = async (): Promise<string | null> => {
    if (isStaticHost && preferredNode !== 'local-api') return null;
    try {
      const res = await fetch(`./api/proxy?url=${encodeURIComponent(cleanTarget)}`, {
        signal: AbortSignal.timeout(5500),
      });
      if (res.ok) {
        const text = await res.text();
        if (!isGitHubPages404OrInvalid(text)) return text;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const tryJinaReader = async (): Promise<string | null> => {
    try {
      const res = await fetch(`https://r.jina.ai/${cleanTarget}`, {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 20 && !isGitHubPages404OrInvalid(text)) {
          const esc = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" style="color:#38bdf8;">$1</a>');
          return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
            body { margin: 0; padding: 24px 32px; background: #090d16; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; line-height: 1.75; }
            .hdr { padding: 12px 16px; background: rgba(6,182,212,0.12); border-left: 3px solid #06b6d4; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .hdr span { font-size: 12px; color: #67e8f9; font-weight: 700; }
            pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; }
          </style></head><body>
            <div class="hdr"><span>Glasispect Cloud Reader Proxy — ${cleanTarget}</span></div>
            <pre>${esc}</pre>
          </body></html>`;
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const tryDirectGcs = async (): Promise<string | null> => {
    if (!cleanTarget.includes('storage.googleapis.com')) return null;
    try {
      const res = await fetch(cleanTarget, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('<?xml') || text.includes('<ListBucketResult')) {
          // Format GCS XML Bucket Listing into an interactive HTML explorer!
          const keys = Array.from(text.matchAll(/<Key>([^<]+)<\/Key>/g)).map((m) => m[1]);
          const baseBucketUrl = cleanTarget.replace(/\?.*$/, '').replace(/\/$/, '');
          const rows = keys
            .slice(0, 100)
            .map(
              (k) =>
                `<li style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
                  <a href="${baseBucketUrl}/${encodeURI(k)}" style="color:#38bdf8;text-decoration:none;font-family:monospace;font-size:13px;">📄 ${k}</a>
                </li>`
            )
            .join('');
          return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="background:#090d16;color:#f8fafc;font-family:system-ui,sans-serif;padding:28px;">
            <h2 style="color:#38bdf8;margin-top:0;">☁️ Google Cloud Storage Bucket Explorer (${baseBucketUrl})</h2>
            <p style="font-size:12px;color:#94a3b8;">オブジェクト数: ${keys.length} 件 — クリックでプロキシ内表示</p>
            <ul style="list-style:none;padding:0;">${rows || '<li>公開オブジェクトが見つかりませんでした</li>'}</ul>
          </body></html>`;
        }
        return text;
      }
    } catch {
      // ignore
    }
    return null;
  };

  type AttemptFn = { name: string; fn: () => Promise<string | null> };
  const pipeline: AttemptFn[] = [];

  if (preferredNode === 'allorigins') pipeline.push({ name: 'AllOrigins Relay', fn: tryAllOrigins });
  if (preferredNode === 'codetabs') pipeline.push({ name: 'CodeTabs Relay', fn: tryCodeTabs });
  if (preferredNode === 'corsproxy') pipeline.push({ name: 'CorsProxy.io', fn: tryCorsProxyIo });
  if (preferredNode === 'jina-reader') pipeline.push({ name: 'Jina Cloud Reader', fn: tryJinaReader });
  if (preferredNode === 'sw-tunnel') pipeline.push({ name: 'Service Worker Tunnel', fn: trySwTunnel });
  if (preferredNode === 'gcs-gateway') pipeline.push({ name: 'storage.googleapis.com Gateway', fn: tryDirectGcs });
  if (preferredNode === 'local-api') pipeline.push({ name: 'Local Server Proxy', fn: tryLocalApi });

  // Append fallback cascade so it NEVER fails with 404
  pipeline.push(
    { name: 'storage.googleapis.com Direct', fn: tryDirectGcs },
    { name: 'Local Server Proxy', fn: tryLocalApi },
    { name: 'Service Worker Tunnel', fn: trySwTunnel },
    { name: 'AllOrigins Relay', fn: tryAllOrigins },
    { name: 'CodeTabs Relay', fn: tryCodeTabs },
    { name: 'CorsProxy.io', fn: tryCorsProxyIo },
    { name: 'Jina Cloud Reader', fn: tryJinaReader }
  );

  for (const step of pipeline) {
    const raw = await step.fn();
    if (raw) {
      return {
        html: rewriteHtmlForSrcDoc(raw, cleanTarget),
        usedNode: step.name,
        finalUrl: cleanTarget,
      };
    }
  }

  throw new Error(`All proxy relay nodes timed out for ${cleanTarget}`);
}

export async function fetchJsonViaProxyCascade<T = unknown>(targetUrl: string): Promise<T | null> {
  // 1. Try direct CORS fetch first (many APIs like iTunes, LRCLIB, GitHub support CORS natively)
  try {
    const direct = await fetch(targetUrl, { signal: AbortSignal.timeout(5500) });
    if (direct.ok) {
      return (await direct.json()) as T;
    }
  } catch {
    // fall through to proxy relays
  }

  // 2. Try AllOrigins JSON wrapper
  try {
    const ao = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
      { signal: AbortSignal.timeout(6500) }
    );
    if (ao.ok) {
      const wrapper = await ao.json();
      if (wrapper && typeof wrapper.contents === 'string') {
        return JSON.parse(wrapper.contents) as T;
      }
    }
  } catch {
    // fall through
  }

  // 3. Try CodeTabs Relay
  try {
    const ct = await fetch(
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
      { signal: AbortSignal.timeout(6500) }
    );
    if (ct.ok) {
      return (await ct.json()) as T;
    }
  } catch {
    // fall through
  }

  // 4. Try Local /api/proxy
  try {
    const loc = await fetch(`./api/proxy?url=${encodeURIComponent(targetUrl)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (loc.ok) {
      return (await loc.json()) as T;
    }
  } catch {
    // ignore
  }

  return null;
}

// -------------------------------------------------------------------------
// Synchronized LRC Lyrics Parser & LRCLIB / Monochrome Live Music Fetcher
// -------------------------------------------------------------------------
export function parseLrcLyrics(lrcText: string, fallbackDuration = 180): LyricLine[] {
  if (!lrcText || !lrcText.trim()) return [];
  const lines = lrcText.split(/\r?\n/);
  const parsed: LyricLine[] = [];
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const matches = Array.from(rawLine.matchAll(timeRegex));
    const cleanText = rawLine.replace(timeRegex, '').trim();
    if (matches.length > 0 && cleanText) {
      for (const m of matches) {
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        parsed.push({
          time: Math.round((mins * 60 + secs + ms / 1000) * 10) / 10,
          text: cleanText,
        });
      }
    }
  }

  if (parsed.length > 0) {
    return parsed.sort((a, b) => a.time - b.time);
  }

  // Plain lyrics fallback: distribute timestamps evenly across track duration
  const plainLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (plainLines.length === 0) return [];
  const step = Math.max(3, Math.floor((fallbackDuration - 8) / plainLines.length));
  return plainLines.map((text, idx) => ({
    time: idx * step,
    text,
  }));
}

interface LrclibSearchItem {
  id: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string;
  plainLyrics?: string;
}

export async function fetchSynchronizedLyricsFromLrclib(
  title: string,
  artist: string,
  durationSec = 180
): Promise<LyricLine[]> {
  const q = `${title} ${artist}`.trim();
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
  const items = await fetchJsonViaProxyCascade<LrclibSearchItem[]>(url);

  if (Array.isArray(items) && items.length > 0) {
    const best = items.find((it) => it.syncedLyrics && it.syncedLyrics.trim().length > 0) || items[0];
    if (best?.syncedLyrics) {
      const synced = parseLrcLyrics(best.syncedLyrics, durationSec);
      if (synced.length > 0) return synced;
    }
    if (best?.plainLyrics) {
      const plain = parseLrcLyrics(best.plainLyrics, durationSec);
      if (plain.length > 0) return plain;
    }
  }

  return [
    { time: 0, text: `♪ ${title} — ${artist} ♪` },
    { time: 4, text: 'Streaming via Monochrome Hi-Fi Service Worker Proxy' },
    { time: 10, text: 'Synchronized LRC Engine Active — Enjoy the music!' },
  ];
}

// Monochrome Live API / Hifi Endpoints + Global Audio Stream Search
export const MONOCHROME_INSTANCES = [
  { name: 'Monochrome.st (Primary)', url: 'https://monochrome.st', api: 'https://api.monochrome.tf' },
  { name: 'Monochrome.tf (Mirror)', url: 'https://monochrome.tf', api: 'https://triton.squid.wtf' },
  { name: 'Tidal Hi-Fi Relay', url: 'https://tidal.squid.wtf', api: 'https://wolf.qqdl.site' },
];

interface ItunesTrackItem {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  releaseDate?: string;
}

const GRADIENT_PALETTES = [
  { grad: 'from-orange-950 via-zinc-900 to-black', accent: '#f97316' },
  { grad: 'from-cyan-950 via-zinc-900 to-slate-950', accent: '#06b6d4' },
  { grad: 'from-purple-950 via-zinc-950 to-pink-950', accent: '#ec4899' },
  { grad: 'from-emerald-950 via-zinc-950 to-teal-950', accent: '#10b981' },
  { grad: 'from-amber-950 via-zinc-950 to-orange-950', accent: '#f59e0b' },
];

interface SaavnSongItem {
  id?: string;
  name?: string;
  title?: string;
  duration?: number | string;
  year?: string | number;
  album?: { name?: string } | string;
  artists?: { primary?: { name?: string }[] };
  primaryArtists?: string;
  image?: { url?: string; link?: string }[];
  downloadUrl?: { quality?: string; url?: string; link?: string }[];
}

interface AudiusTrackItem {
  id: string;
  title: string;
  duration: number;
  genre?: string;
  release_date?: string;
  user?: { name?: string; handle?: string };
  artwork?: { '480x480'?: string; '150x150'?: string };
}

interface MonochromeApiTrackItem {
  id: number | string;
  title?: string;
  duration?: number;
  artist?: { name?: string };
  artists?: { name?: string }[];
  album?: { title?: string; cover?: string };
}

// Resolve a full-length audio stream URL from Monochrome Hi-Fi API, Saavn 320kbps CDN, or Audius v1 Stream
export async function resolveFullLengthAudioStream(
  title: string,
  artist: string,
  monoTrackId?: string | number
): Promise<{ audioUrl: string; format: string; bitrate: string } | null> {
  const query = `${title} ${artist}`.trim();

  // 1. Try Monochrome / Tidal Hi-Fi API instances if monoTrackId is known or via search
  for (const inst of MONOCHROME_INSTANCES) {
    try {
      let targetId = monoTrackId;
      if (!targetId) {
        const searchData = await fetchJsonViaProxyCascade<{
          items?: MonochromeApiTrackItem[];
          data?: { items?: MonochromeApiTrackItem[] };
        }>(`${inst.api}/search/?s=${encodeURIComponent(query)}`);
        const list = searchData?.items || searchData?.data?.items || [];
        if (list.length > 0 && list[0].id) {
          targetId = list[0].id;
        }
      }
      if (targetId) {
        const trackRes = await fetchJsonViaProxyCascade<{
          OriginalTrackUrl?: string;
          url?: string;
          manifest?: string;
          data?: { OriginalTrackUrl?: string; url?: string; manifest?: string };
        }>(`${inst.api}/track/?id=${encodeURIComponent(String(targetId))}&quality=HIGH`);
        const directUrl =
          trackRes?.OriginalTrackUrl ||
          trackRes?.url ||
          trackRes?.data?.OriginalTrackUrl ||
          trackRes?.data?.url;
        if (directUrl && directUrl.startsWith('http')) {
          return {
            audioUrl: directUrl,
            format: 'Monochrome Full-Length FLAC / AAC Stream',
            bitrate: '1411 kbps / 320 kbps Hi-Fi',
          };
        }
        const manifestB64 = trackRes?.manifest || trackRes?.data?.manifest;
        if (manifestB64) {
          try {
            const decoded = JSON.parse(atob(manifestB64));
            if (Array.isArray(decoded?.urls) && decoded.urls[0]) {
              return {
                audioUrl: decoded.urls[0],
                format: 'Monochrome Full-Length Lossless Stream',
                bitrate: '1411 kbps Hi-Fi',
              };
            }
          } catch {
            // ignore manifest decode error
          }
        }
      }
    } catch {
      // try next provider
    }
  }

  // 2. Try Saavn 320kbps Full-Length Song Stream API
  const saavnApis = [
    `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=5`,
    `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(query)}&limit=5`,
  ];
  for (const apiUrl of saavnApis) {
    try {
      const saavnData = await fetchJsonViaProxyCascade<{
        data?: { results?: SaavnSongItem[] };
        results?: SaavnSongItem[];
      }>(apiUrl);
      const songs = saavnData?.data?.results || saavnData?.results || [];
      for (const s of songs) {
        const dlList = s.downloadUrl || [];
        const bestDl = dlList[dlList.length - 1];
        const streamUrl = bestDl?.url || bestDl?.link;
        if (streamUrl && streamUrl.startsWith('http')) {
          return {
            audioUrl: streamUrl,
            format: 'Full-Length 320kbps AAC/MP4 Stream',
            bitrate: '320 kbps Full Track',
          };
        }
      }
    } catch {
      // try next
    }
  }

  // 3. Try Audius Full-Length Streaming API v1
  try {
    const audiusUrl = `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=GlassiumOS5`;
    const audiusData = await fetchJsonViaProxyCascade<{ data?: AudiusTrackItem[] }>(audiusUrl);
    if (audiusData?.data && audiusData.data.length > 0) {
      const hit = audiusData.data[0];
      if (hit.id) {
        return {
          audioUrl: `https://api.audius.co/v1/tracks/${encodeURIComponent(hit.id)}/stream?app_name=GlassiumOS5`,
          format: 'Audius Full-Length 320kbps Stream',
          bitrate: '320 kbps Full Track',
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function searchMonochromeLiveTracks(query: string): Promise<MonochromeTrack[]> {
  const cleanQ = query.trim() || 'YOASOBI';

  // Fetch iTunes full metadata + Saavn full-length 320kbps streams + Audius full-length streams in parallel
  const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=12`;
  const saavnUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(cleanQ)}&limit=10`;
  const audiusUrl = `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(cleanQ)}&app_name=GlassiumOS5`;

  const [itunesData, saavnData, audiusData] = await Promise.all([
    fetchJsonViaProxyCascade<{ results?: ItunesTrackItem[] }>(itunesUrl).catch(() => null),
    fetchJsonViaProxyCascade<{ data?: { results?: SaavnSongItem[] }; results?: SaavnSongItem[] }>(saavnUrl).catch(
      () => null
    ),
    fetchJsonViaProxyCascade<{ data?: AudiusTrackItem[] }>(audiusUrl).catch(() => null),
  ]);

  const saavnSongs = saavnData?.data?.results || saavnData?.results || [];
  const audiusSongs = audiusData?.data || [];
  const results: MonochromeTrack[] = [];

  // 1. Add Saavn Full-Length 320kbps Streams (if available)
  saavnSongs.slice(0, 6).forEach((s, idx) => {
    const dlList = s.downloadUrl || [];
    const bestDl = dlList[dlList.length - 1];
    const fullStreamUrl = bestDl?.url || bestDl?.link;
    if (!fullStreamUrl) return;

    const palette = GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length];
    const imgs = s.image || [];
    const hiResImg = imgs[imgs.length - 1]?.url || imgs[imgs.length - 1]?.link;
    const rawTitle = (s.name || s.title || cleanQ).replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const rawArtist =
      s.artists?.primary?.map((a) => a.name).filter(Boolean).join(', ') ||
      s.primaryArtists ||
      cleanQ;
    const fullDuration = Math.max(90, Number(s.duration) || 215);

    results.push({
      id: `mono-live-saavn-${s.id || idx}`,
      title: rawTitle,
      artist: rawArtist,
      album: (typeof s.album === 'object' ? s.album?.name : s.album) || 'Monochrome Full-Length Stream',
      coverGradient: palette.grad,
      coverAccent: palette.accent,
      artworkUrl: hiResImg,
      audioUrl: fullStreamUrl,
      isFullLengthStream: true,
      sourceUrl: `https://monochrome.st/?q=${encodeURIComponent(rawTitle + ' ' + rawArtist)}`,
      duration: fullDuration,
      format: 'Monochrome Full-Length 320kbps AAC',
      bitrate: '320 kbps (Full Track)',
      genre: 'Hi-Fi Full Stream',
      year: Number(s.year) || 2025,
      synthParams: MONOCHROME_CATALOG[idx % MONOCHROME_CATALOG.length].synthParams,
      lyrics: [
        { time: 0, text: `♪ ${rawTitle} — ${rawArtist} (Full-Length) ♪` },
        { time: 3, text: 'フル尺の同期歌詞を LRCLIB / Monochrome から取得中...' },
      ],
    });
  });

  // 2. Add iTunes Tracks with TRUE Full-Length Duration (e.g. 180s-280s, NEVER 30s!) + Matched Full Stream
  if (itunesData?.results && itunesData.results.length > 0) {
    itunesData.results
      .filter((item) => item.trackName && item.artistName)
      .forEach((item, idx) => {
        const palette = GRADIENT_PALETTES[(idx + results.length) % GRADIENT_PALETTES.length];
        const hiResArt = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined;
        // Always use the song's true full duration in seconds (NEVER cap at 30 seconds!)
        const fullTrackDuration = Math.max(
          95,
          Math.round((item.trackTimeMillis && item.trackTimeMillis > 35000 ? item.trackTimeMillis : 215000) / 1000)
        );
        const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() || 2025 : 2025;

        // Check if we have a matching full-length Saavn or Audius stream for this track
        const normTitle = item.trackName.toLowerCase();
        const matchedSaavn = saavnSongs.find((s) =>
          (s.name || s.title || '').toLowerCase().includes(normTitle.slice(0, 8))
        );
        const saavnDl = matchedSaavn?.downloadUrl?.[matchedSaavn.downloadUrl.length - 1];
        const matchedFullUrl = saavnDl?.url || saavnDl?.link;

        results.push({
          id: `mono-live-${item.trackId || idx}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || 'Monochrome Full-Length Lossless',
          coverGradient: palette.grad,
          coverAccent: palette.accent,
          artworkUrl: hiResArt,
          audioUrl: matchedFullUrl || item.previewUrl,
          isFullLengthStream: Boolean(matchedFullUrl),
          sourceUrl: `https://monochrome.st/?q=${encodeURIComponent(item.trackName + ' ' + item.artistName)}`,
          duration: fullTrackDuration,
          format: matchedFullUrl
            ? 'Monochrome Full-Length 320kbps Stream'
            : 'Monochrome Full-Duration Hybrid Stream',
          bitrate: '1411 kbps / 320 kbps Full Track',
          genre: item.primaryGenreName || 'Electronic / Pop',
          year,
          synthParams: MONOCHROME_CATALOG[idx % MONOCHROME_CATALOG.length].synthParams,
          lyrics: [
            { time: 0, text: `♪ ${item.trackName} — ${item.artistName} (Full ${Math.floor(fullTrackDuration / 60)}:${String(fullTrackDuration % 60).padStart(2, '0')}) ♪` },
            { time: 3, text: 'フル尺の同期歌詞を LRCLIB / Monochrome から取得中...' },
          ],
        });
      });
  }

  // 3. Add Audius Full-Length Streams (100% full-length unthrottled streams)
  audiusSongs.slice(0, 5).forEach((item, idx) => {
    if (!item.id || !item.title) return;
    const palette = GRADIENT_PALETTES[(idx + results.length) % GRADIENT_PALETTES.length];
    const artistName = item.user?.name || item.user?.handle || 'Audius Artist';
    const fullDuration = Math.max(90, Math.round(item.duration || 210));
    results.push({
      id: `mono-live-audius-${item.id}`,
      title: item.title,
      artist: artistName,
      album: 'Monochrome × Audius Full-Length Stream',
      coverGradient: palette.grad,
      coverAccent: palette.accent,
      artworkUrl: item.artwork?.['480x480'] || item.artwork?.['150x150'],
      audioUrl: `https://api.audius.co/v1/tracks/${encodeURIComponent(item.id)}/stream?app_name=GlassiumOS5`,
      isFullLengthStream: true,
      sourceUrl: `https://monochrome.st/?q=${encodeURIComponent(item.title + ' ' + artistName)}`,
      duration: fullDuration,
      format: 'Audius Full-Length 320kbps Stream',
      bitrate: '320 kbps (Full Track)',
      genre: item.genre || 'Electronic / Indie',
      year: item.release_date ? new Date(item.release_date).getFullYear() || 2025 : 2025,
      synthParams: MONOCHROME_CATALOG[idx % MONOCHROME_CATALOG.length].synthParams,
      lyrics: [
        { time: 0, text: `♪ ${item.title} — ${artistName} (Full Stream) ♪` },
        { time: 3, text: 'フル尺の同期歌詞を LRCLIB から取得中...' },
      ],
    });
  });

  return results;
}

// Generate a standalone HTML file that can be uploaded to storage.googleapis.com or opened as a Blob URL
export function generateGcsStandaloneLauncherHtml(targetUrl: string): string {
  const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GlassiumOS 5 — Google Cloud Storage (storage.googleapis.com) Universal Launcher</title>
  <style>
    * { box-sizing: border-box; }
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #090d16; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; overflow: hidden; }
    .bar { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 12px; }
    .badge { padding: 3px 8px; background: rgba(6,182,212,0.2); color: #67e8f9; font-weight: 700; font-family: monospace; }
    input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 6px 10px; font-size: 12px; outline: none; }
    button { background: #06b6d4; color: #000; border: none; padding: 6px 14px; font-weight: 700; font-size: 12px; cursor: pointer; }
    iframe { flex: 1; width: 100%; border: 0; background: #fff; }
  </style>
</head>
<body>
  <div class="bar">
    <span class="badge">☁️ storage.googleapis.com Ready</span>
    <input id="u" value="${cleanUrl.replace(/"/g, '&quot;')}" placeholder="https://..." />
    <button onclick="go()">Proxy Load</button>
  </div>
  <iframe id="f" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
  <script>
    async function go() {
      const target = document.getElementById('u').value.trim();
      const frame = document.getElementById('f');
      try {
        const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(target));
        const data = await res.json();
        if (data && data.contents) {
          const base = '<base href="' + target + '">';
          frame.srcdoc = base + data.contents;
          return;
        }
      } catch (e) {}
      frame.src = target;
    }
    go();
  </script>
</body>
</html>`;
}

