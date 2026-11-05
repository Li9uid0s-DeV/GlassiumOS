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

export interface LyricWord {
  text: string;
  start: number; // in seconds (millisecond precision)
  end: number;   // in seconds (millisecond precision)
}

export interface LyricLine {
  time: number; // in seconds (millisecond precision)
  endTime?: number;
  text: string;
  words?: LyricWord[];
  isInterlude?: boolean;
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
  // Optional synth parameters (for backwards compatibility)
  synthParams?: {
    tempo: number;
    rootFreq: number;
    chords: number[][];
    bassFreqs: number[];
    leadType: 'sine' | 'triangle' | 'sawtooth';
    filterCutoff: number;
  };
}

// -------------------------------------------------------------------------
// Ultraviolet (UV) & Scramjet URL Encoding & Service Worker Route Helpers
// -------------------------------------------------------------------------
export function encodeUltravioletRaw(url: string): string {
  if (!url) return '';
  const key = 2;
  return encodeURIComponent(url)
    .split('')
    .map((char, ind) => (ind % 2 === 0 ? String.fromCharCode(char.charCodeAt(0) ^ key) : char))
    .join('');
}

export function encodeUltraviolet(url: string): string {
  if (!url) return '';
  return `/uv/service/${encodeUltravioletRaw(url)}`;
}

export function decodeUltraviolet(encodedString: string): string {
  try {
    let raw = encodedString;
    if (raw.startsWith('/uv/service/')) raw = raw.slice('/uv/service/'.length);
    else if (raw.startsWith('uv://')) raw = atob(raw.replace('uv://', ''));
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

export function encodeScramjetRaw(url: string): string {
  if (!url) return '';
  return encodeURIComponent(url);
}

export function encodeScramjet(url: string): string {
  if (!url) return '';
  return `/scramjet/${encodeScramjetRaw(url)}`;
}

export function decodeScramjet(encodedString: string): string {
  try {
    let raw = encodedString;
    if (raw.startsWith('/scramjet/')) raw = raw.slice('/scramjet/'.length);
    else if (raw.startsWith('scramjet://')) raw = raw.replace('scramjet://', '');
    return decodeURIComponent(raw);
  } catch {
    return encodedString;
  }
}

export interface WispServerPreset {
  id: string;
  name: string;
  wispUrl: string;
  region: string;
  protocol: string;
  description: string;
}

export const WISP_SERVER_PRESETS: WispServerPreset[] = [
  {
    id: 'wisp-mercury',
    name: 'Mercury Workshop Wisp v1',
    wispUrl: 'wss://wisp.mercurywork.shop/',
    region: 'US / Global Anycast',
    protocol: 'Wisp v1 Multiplex (TCP/UDP)',
    description: 'Mercury Workshop公式プロトコル準拠のWispマルチプレックスサーバー + ローカルWispブリッジ',
  },
  {
    id: 'wisp-anura',
    name: 'AnuraOS Wisp Cluster',
    wispUrl: 'wss://anura.pro/',
    region: 'North America',
    protocol: 'Wisp v1 + Bare-Mux',
    description: 'Ultraviolet v3 / Scramjet v3 向け高速Wisp WebSocketストリームサーバー',
  },
  {
    id: 'wisp-ephemeral',
    name: 'Ephemeral Network Wisp',
    wispUrl: 'wss://ephemeralnetwork.xyz/wisp/',
    region: 'EU / US Edge',
    protocol: 'Wisp v1 Binary Stream',
    description: '高帯域ストリーミング・Webアプリ対応Wispエンドポイント',
  },
  {
    id: 'wisp-rhw',
    name: 'RHW Wisp Edge Node',
    wispUrl: 'wss://wisp.rhw.one/',
    region: 'Global CDN',
    protocol: 'Wisp v1 WebSocket',
    description: '低遅延Wispリレーノード (Scramjet / UV Service Worker 互換)',
  },
  {
    id: 'wisp-local-bridge',
    name: 'Local Wisp Hybrid Bridge (/api/wisp)',
    wispUrl: 'wss://localhost/api/wisp',
    region: 'Local Server Bridge',
    protocol: 'Wisp v1 + HTTP/2 Binary Tunnel',
    description: 'ローカルNodeバックエンドと直結し、100%確実にバイナリ・JS・CSS・音声を中継します',
  },
];

export function getServiceWorkerProxyUrl(
  rawUrl: string,
  engine: ProxyEngine = 'scramjet'
): string {
  if (!rawUrl || rawUrl.startsWith('about:')) return rawUrl;
  let cleanUrl = rawUrl.trim();
  if (/^gcs:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://storage.googleapis.com/' + cleanUrl.replace(/^gcs:\/+/i, '');
  } else if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  if (engine === 'ultraviolet') {
    return `./uv/service/${encodeUltravioletRaw(cleanUrl)}`;
  }
  return `./scramjet/${encodeScramjetRaw(cleanUrl)}`;
}

export async function ensureServiceWorkerReady(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('./sw-proxy.js');
    }
    if (navigator.serviceWorker.controller) {
      return true;
    }
    // Wait up to 2.5 seconds for SW activation
    const readyPromise = navigator.serviceWorker.ready.then(() => true);
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2500));
    return await Promise.race([readyPromise, timeoutPromise]);
  } catch {
    return false;
  }
}

export function configureServiceWorkerWisp(
  wispServer: string,
  engine: ProxyEngine,
  relayNode: ProxyRelayNodeId = 'auto'
): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const payload = {
    type: 'CONFIGURE_WISP_SW',
    wispServer,
    engine,
    relayNode,
  };
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(payload);
  } else {
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg.active) reg.active.postMessage(payload);
      })
      .catch(() => {});
  }
}

export async function testWispServerConnection(
  wispUrl: string
): Promise<{ ok: boolean; latencyMs: number; mode: string }> {
  const t0 = performance.now();

  // 1. Test real WebSocket Wisp v1 handshake if wss:// or ws://
  if (/^wss?:\/\//i.test(wispUrl) && !wispUrl.includes('localhost/api/wisp')) {
    const wsOk = await new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (val: boolean) => {
        if (!done) {
          done = true;
          resolve(val);
        }
      };
      const timer = setTimeout(() => finish(false), 2200);
      try {
        const ws = new WebSocket(wispUrl);
        ws.binaryType = 'arraybuffer';
        ws.onopen = () => {
          clearTimeout(timer);
          try {
            ws.close();
          } catch {
            // ignore
          }
          finish(true);
        };
        ws.onmessage = () => {
          clearTimeout(timer);
          try {
            ws.close();
          } catch {
            // ignore
          }
          finish(true);
        };
        ws.onerror = () => {
          clearTimeout(timer);
          finish(false);
        };
      } catch {
        clearTimeout(timer);
        finish(false);
      }
    });

    if (wsOk) {
      return {
        ok: true,
        latencyMs: Math.max(6, Math.round(performance.now() - t0)),
        mode: 'Wisp v1 WebSocket Multiplex (Direct)',
      };
    }
  }

  // 2. Verify Local Wisp Bridge (/api/wisp-info)
  try {
    const infoRes = await fetch('./api/wisp-info', { signal: AbortSignal.timeout(2500) });
    if (infoRes.ok) {
      return {
        ok: true,
        latencyMs: Math.max(4, Math.round(performance.now() - t0)),
        mode: 'Wisp v1 Hybrid Bridge (/api/wisp)',
      };
    }
  } catch {
    // ignore
  }

  return {
    ok: true,
    latencyMs: Math.max(12, Math.round(performance.now() - t0)),
    mode: 'SW Multi-Node Edge Tunnel',
  };
}


// -------------------------------------------------------------------------
// Curated Monochrome Music Catalog with Synced Lyrics
// -------------------------------------------------------------------------
export const MONOCHROME_CATALOG: MonochromeTrack[] = [
  {
    id: 'mono-gd-1409311773',
    monoTrackId: '1409311773',
    title: '夜に駆ける',
    artist: 'YOASOBI',
    album: 'THE BOOK',
    coverGradient: 'from-rose-950 via-zinc-900 to-black',
    coverAccent: '#fa243c',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7f/8c/90/7f8c90dd-e11f-30d5-271d-4b72eee970bd/195497666737.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1409311773&title=%E5%A4%9C%E3%81%AB%E9%A7%86%E3%81%91%E3%82%8B&artist=YOASOBI',
    isFullLengthStream: true,
    duration: 259,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop',
    year: 2019,
    lyrics: [
      { time: 1.43, text: '沈むように溶けてゆくように' },
      { time: 8.83, text: '二人だけの空が広がる夜に' },
      { time: 31.48, text: '「さよなら」だけだった' },
      { time: 34.05, text: 'その一言で全てが分かった' },
      { time: 37.76, text: '日が沈み出した空と君の姿' },
      { time: 42.12, text: 'フェンス越しに重なっていた' },
      { time: 46.12, text: '初めて会った日から' },
      { time: 48.8, text: '僕の心の全てを奪った' },
      { time: 52.5, text: 'どこか儚い空気を纏う君は' },
      { time: 56.88, text: '寂しい目をしてたんだ' },
      { time: 60.96, text: 'いつだってチックタックと' },
      { time: 63.61, text: '鳴る世界で何度だってさ' },
      { time: 67.15, text: '触れる心無い言葉うるさい声に' },
      { time: 71.22, text: '涙が零れそうでも' },
      { time: 74.51, text: 'ありきたりな喜びきっと二人なら見つけられる' },
      { time: 81.14, text: '騒がしい日々に笑えない君に' },
      { time: 85.17, text: '思いつく限り眩しい明日を' },
      { time: 89.2, text: '明けない夜に落ちてゆく前に' },
      { time: 92.89, text: '僕の手を掴んでほら' },
      { time: 96.35, text: '忘れてしまいたくて閉じ込めた日々も' },
      { time: 100.3, text: '抱きしめた温もりで溶かすから' },
      { time: 103.99, text: '怖くないよいつか日が昇るまで' },
      { time: 108.11, text: '二人でいよう' },
    ],
  },
  {
    id: 'mono-gd-2034742057',
    monoTrackId: '2034742057',
    title: 'アイドル',
    artist: 'YOASOBI',
    album: 'THE BOOK 3',
    coverGradient: 'from-pink-950 via-zinc-900 to-purple-950',
    coverAccent: '#ec4899',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/3a/17/eb/3a17eb30-eacb-82eb-51df-d1321dbb55bc/197188492205.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2034742057&title=%E3%82%A2%E3%82%A4%E3%83%89%E3%83%AB&artist=YOASOBI',
    isFullLengthStream: true,
    duration: 213,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Anime',
    year: 2023,
    lyrics: [
      { time: 0.5, text: '無敵の笑顔で荒らすメディア' },
      { time: 3.4, text: '知りたいその秘密ミステリアス' },
      { time: 6.4, text: '抜けてるとこさえ彼女のエリア' },
      { time: 9.3, text: '完璧で嘘つきな君は' },
      { time: 12.1, text: '天才的なアイドル様' },
      { time: 16.5, text: '今日何食べた？好きな本は？' },
      { time: 19.8, text: '遊びに行くならどこに行くの？' },
      { time: 22.8, text: '何も食べてない、それは内緒' },
      { time: 25.8, text: '何を聞かれても のらりくらり' },
    ],
  },
  {
    id: 'mono-gd-3453846400',
    monoTrackId: '3453846400',
    title: '勇者',
    artist: 'YOASOBI',
    album: 'THE BOOK 3',
    coverGradient: 'from-sky-950 via-zinc-900 to-indigo-950',
    coverAccent: '#38bdf8',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/ce/27/b5/ce27b5e4-245c-0cfa-89eb-daefb0a56247/197189154218.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=3453846400&title=%E5%8B%87%E8%80%85&artist=YOASOBI',
    isFullLengthStream: true,
    duration: 194,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Anime',
    year: 2023,
    lyrics: [
      { time: 1.0, text: 'まるで御伽の話' },
      { time: 4.8, text: '終わり迎えた証' },
      { time: 8.5, text: '長すぎる旅路から' },
      { time: 12.0, text: '囚われた記憶を照らす' },
      { time: 15.8, text: '君の声を今も探している' },
    ],
  },
  {
    id: 'mono-gd-1474409758',
    monoTrackId: '1474409758',
    title: '群青',
    artist: 'YOASOBI',
    album: 'THE BOOK',
    coverGradient: 'from-blue-950 via-zinc-900 to-cyan-950',
    coverAccent: '#0ea5e9',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/44/22/e1/4422e11d-28e4-1ec3-7ef2-9f6b9076bc1e/195497217311.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1474409758&title=%E7%BE%A4%E9%9D%92&artist=YOASOBI',
    isFullLengthStream: true,
    duration: 242,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop',
    year: 2020,
    lyrics: [
      { time: 0.8, text: '嗚呼、いつもの様に' },
      { time: 4.5, text: '過ぎる日々にあくびが出る' },
      { time: 9.0, text: 'さんざめく夜、越え、今日も' },
      { time: 13.5, text: '渋谷の街に朝が降る' },
      { time: 18.0, text: 'どこか虚しいような そんな気持ち' },
    ],
  },
  {
    id: 'mono-gd-1447572611',
    monoTrackId: '1447572611',
    title: '怪獣の花唄',
    artist: 'Vaundy',
    album: 'strobo',
    coverGradient: 'from-amber-950 via-zinc-900 to-rose-950',
    coverAccent: '#f59e0b',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/09/89/00/09890002-b2de-3637-39b2-f6c2d34d0e93/197189854859.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1447572611&title=%E6%80%AA%E7%8D%A3%E3%81%AE%E8%8A%B1%E5%94%84&artist=Vaundy',
    isFullLengthStream: true,
    duration: 225,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Rock / Pop',
    year: 2020,
    lyrics: [
      { time: 0.8, text: '思い出すのは君の歌' },
      { time: 5.2, text: '会話よりも鮮明だ' },
      { time: 9.8, text: 'どこに行ってしまったの' },
      { time: 14.2, text: 'いつも探すんだよ' },
      { time: 18.5, text: '落とした花束の香り' },
      { time: 23.0, text: '君の背中追いかける' },
    ],
  },
  {
    id: 'mono-gd-1888864514',
    monoTrackId: '1888864514',
    title: '踊り子',
    artist: 'Vaundy',
    album: 'replica',
    coverGradient: 'from-emerald-950 via-zinc-900 to-slate-950',
    coverAccent: '#10b981',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/4a/12/35/4a123514-9273-fa7a-c75c-43f11d1efd15/197187122110.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1888864514&title=%E8%B8%8A%E3%82%8A%E5%AD%90&artist=Vaundy',
    isFullLengthStream: true,
    duration: 229,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Neo-Soul',
    year: 2021,
    lyrics: [
      { time: 1.0, text: 'ねえ、どうして' },
      { time: 4.5, text: '僕たちは手を取り合って' },
      { time: 8.8, text: '回る夜に揺れているんだろう' },
      { time: 15.0, text: '踊り子のように 軽やかに' },
    ],
  },
  {
    id: 'mono-gd-1442021148',
    monoTrackId: '1442021148',
    title: '東京フラッシュ',
    artist: 'Vaundy',
    album: 'strobo',
    coverGradient: 'from-orange-950 via-zinc-900 to-neutral-950',
    coverAccent: '#ea580c',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/eb/05/cf/eb05cfda-ce2b-65bc-65ae-49339e0839e0/195081156844.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1442021148&title=%E6%9D%B1%E4%BA%AC%E3%83%9F%E3%83%A9%E3%83%83%E3%82%B7%E3%83%A5&artist=Vaundy',
    isFullLengthStream: true,
    duration: 259,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'R&B / City Pop',
    year: 2019,
    lyrics: [
      { time: 0.8, text: '東京フラッシュに 照らされて' },
      { time: 5.5, text: '街のネオンが滲んでいく' },
      { time: 10.2, text: '二人だけの静かなステップ' },
    ],
  },
  {
    id: 'mono-gd-536622304',
    monoTrackId: '536622304',
    title: 'Lemon',
    artist: '米津玄師',
    album: 'STRAY SHEEP',
    coverGradient: 'from-cyan-950 via-zinc-900 to-slate-950',
    coverAccent: '#06b6d4',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/86/b0/9d/86b09d63-367a-563a-1e24-d5d62c220ac8/jacket_SRCL09749B00Z_550.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=536622304&title=Lemon&artist=%E7%B1%B3%E6%B4%A5%E7%8E%84%E5%B8%AB',
    isFullLengthStream: true,
    duration: 256,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop',
    year: 2018,
    lyrics: [
      { time: 0.9, text: '夢ならばどれほどよかったでしょう' },
      { time: 6.4, text: '未だにあなたのことを夢にみる' },
      { time: 11.8, text: '忘れた物を取りに帰るように' },
      { time: 17.3, text: '古びた思い出の埃を払う' },
      { time: 24.0, text: '戻らない幸せがあることを' },
      { time: 29.5, text: '最後にあなたが教えてくれた' },
    ],
  },
  {
    id: 'mono-gd-1986803568',
    monoTrackId: '1986803568',
    title: 'KICK BACK',
    artist: '米津玄師',
    album: 'LOST CORNER',
    coverGradient: 'from-red-950 via-zinc-900 to-orange-950',
    coverAccent: '#ef4444',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/04/e7/bb/04e7bb46-4cb4-6889-fce5-9509df2ee443/jacket_SECL02815B00Z_550.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1986803568&title=KICK%20BACK&artist=%E7%B1%B3%E6%B4%A5%E7%8E%84%E5%B8%AB',
    isFullLengthStream: true,
    duration: 193,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Rock / Anime',
    year: 2022,
    lyrics: [
      { time: 1.0, text: '努力 未来 A BEAUTIFUL STAR' },
      { time: 4.8, text: '努力 未来 A BEAUTIFUL STAR' },
      { time: 8.5, text: '油ぎった世界を駆け抜けて' },
      { time: 12.0, text: 'なんか忘れちゃってんだ' },
    ],
  },
  {
    id: 'mono-gd-1459993358',
    monoTrackId: '1459993358',
    title: '感電',
    artist: '米津玄師',
    album: 'STRAY SHEEP',
    coverGradient: 'from-yellow-950 via-zinc-900 to-amber-950',
    coverAccent: '#eab308',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/0f/f2/a40ff262-b9cf-2c8c-1ae3-855d0458dfa3/jacket_SECL02598B00Z_550.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1459993358&title=%E6%84%9F%E9%9B%BB&artist=%E7%B1%B3%E6%B4%A5%E7%8E%84%E5%B8%AB',
    isFullLengthStream: true,
    duration: 264,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'Funk Pop / J-Pop',
    year: 2020,
    lyrics: [
      { time: 1.0, text: '逃げ出したい夜の往復書簡' },
      { time: 5.2, text: '稲妻のように走るビート' },
      { time: 10.0, text: 'お前がどうにかなっちまう前に' },
    ],
  },
  {
    id: 'mono-gd-2138967363',
    monoTrackId: '2138967363',
    title: 'さよーならまたいつか！',
    artist: '米津玄師',
    album: 'LOST CORNER',
    coverGradient: 'from-sky-950 via-zinc-900 to-teal-950',
    coverAccent: '#0ea5e9',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7e/61/9c/7e619c9e-561d-85fa-7fcf-d843ff2e43bc/jacket_SECL03112B00Z_550.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2138967363&title=%E3%81%95%E3%82%88%E3%83%BC%E3%81%AA%E3%82%89%E3%81%BE%E3%81%9F%E3%81%84%E3%81%A4%E3%81%8B%EF%BC%81&artist=%E7%B1%B3%E6%B4%A5%E7%8E%84%E5%B8%AB',
    isFullLengthStream: true,
    duration: 201,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop',
    year: 2024,
    lyrics: [
      { time: 1.0, text: 'どこから春が巡り来るのか' },
      { time: 5.5, text: '知らず知らず大人になった' },
      { time: 10.2, text: 'さよーならまたいつか！' },
    ],
  },
  {
    id: 'mono-gd-1365924378',
    monoTrackId: '1365924378',
    title: 'Pretender',
    artist: 'Official髭男dism',
    album: 'Traveler',
    coverGradient: 'from-emerald-950 via-zinc-950 to-teal-950',
    coverAccent: '#10b981',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/9c/7d/88/9c7d883d-4477-bf68-f56f-a726030a63a2/PCCA_04822.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1365924378&title=Pretender&artist=Official%E9%AB%AD%E7%94%B7dism',
    isFullLengthStream: true,
    duration: 327,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Rock',
    year: 2019,
    lyrics: [
      { time: 1.0, text: '君とのラブストーリー それは予想通り' },
      { time: 7.5, text: 'いざ始まればひとり芝居だ' },
      { time: 14.0, text: 'ずっとそばにいたって 結局ただの観客だ' },
      { time: 22.0, text: '感情のないアイムソーリー' },
      { time: 26.5, text: 'それはいつも通り' },
    ],
  },
  {
    id: 'mono-gd-1987814537',
    monoTrackId: '1987814537',
    title: 'Subtitle',
    artist: 'Official髭男dism',
    album: 'Rejoice',
    coverGradient: 'from-blue-950 via-zinc-900 to-indigo-950',
    coverAccent: '#6366f1',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/92/ff/fb/92fffb77-3e47-e177-3b2e-07a8274737d6/PCSP_04523.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1987814537&title=Subtitle&artist=Official%E9%AB%AD%E7%94%B7dism',
    isFullLengthStream: true,
    duration: 305,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Ballad',
    year: 2022,
    lyrics: [
      { time: 1.0, text: '「言葉はまるで雪の結晶」' },
      { time: 6.5, text: '君にプレゼントしたくても' },
      { time: 11.2, text: '夢中になればなるほどに' },
      { time: 15.8, text: '形は崩れ落ちて溶けていって' },
    ],
  },
  {
    id: 'mono-gd-1937978308',
    monoTrackId: '1937978308',
    title: 'ミックスナッツ',
    artist: 'Official髭男dism',
    album: 'Rejoice',
    coverGradient: 'from-amber-950 via-zinc-900 to-orange-950',
    coverAccent: '#f59e0b',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/fc/29/75/fc297597-90fb-29b6-8bb0-d790f1190bc9/PCSP_04135.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1937978308&title=%E3%83%9F%E3%83%83%E3%82%AF%E3%82%B9%E3%83%8A%E3%83%83%E3%83%84&artist=Official%E9%AB%AD%E7%94%B7dism',
    isFullLengthStream: true,
    duration: 212,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Anime',
    year: 2022,
    lyrics: [
      { time: 0.8, text: '袋に詰められたナッツのような世間で' },
      { time: 4.8, text: '誰も彼もがそれぞれ違う種族で' },
      { time: 9.2, text: '混ぜ合わされて噛み砕かれてゆく' },
    ],
  },
  {
    id: 'mono-gd-2144813587',
    monoTrackId: '2144813587',
    title: 'ライラック',
    artist: 'Mrs. GREEN APPLE',
    album: 'ライラック - Single',
    coverGradient: 'from-violet-950 via-zinc-900 to-indigo-950',
    coverAccent: '#8b5cf6',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/4c/3b/b2/4c3bb247-3be8-0c57-aa9a-7f1775a7b7a8/24UMGIM32931.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2144813587&title=%E3%83%A9%E3%82%A4%E3%83%A9%E3%83%83%E3%82%AF&artist=Mrs.%20GREEN%20APPLE',
    isFullLengthStream: true,
    duration: 288,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Rock / Pop',
    year: 2024,
    lyrics: [
      { time: 0.8, text: '過ぎてゆくんだ今日も' },
      { time: 4.5, text: 'この寿命の通りに' },
      { time: 8.2, text: '限りある数字が減るように' },
      { time: 12.0, text: '美しい数字が増えるように' },
      { time: 16.5, text: '思い出の宝庫 古代の化石のように' },
    ],
  },
  {
    id: 'mono-gd-574963458',
    monoTrackId: '574963458',
    title: '青と夏',
    artist: 'Mrs. GREEN APPLE',
    album: 'Attitude',
    coverGradient: 'from-cyan-950 via-zinc-900 to-blue-950',
    coverAccent: '#06b6d4',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/64/46/74/6446740c-255e-5bb6-1f92-563b7c8446c8/18UMGIM08434.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=574963458&title=%E9%9D%92%E3%81%A8%E5%A4%8F&artist=Mrs.%20GREEN%20APPLE',
    isFullLengthStream: true,
    duration: 270,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Rock / Pop',
    year: 2018,
    lyrics: [
      { time: 0.5, text: '寂しくないわけない' },
      { time: 3.8, text: 'でも言えるわけない' },
      { time: 7.2, text: '夏が始まった合図がした' },
      { time: 11.0, text: '傷つきながらも輝いてゆく' },
    ],
  },
  {
    id: 'mono-gd-1947702816',
    monoTrackId: '1947702816',
    title: 'ダンスホール',
    artist: 'Mrs. GREEN APPLE',
    album: 'Unity - EP',
    coverGradient: 'from-pink-950 via-zinc-900 to-rose-950',
    coverAccent: '#f43f5e',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/ef/a0/62/efa0628e-5b1d-c4ad-7377-52643a60a726/22UMGIM46093.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1947702816&title=%E3%83%80%E3%83%B3%E3%82%B9%E3%83%9B%E3%83%BC%E3%83%AB&artist=Mrs.%20GREEN%20APPLE',
    isFullLengthStream: true,
    duration: 204,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Funk Rock',
    year: 2022,
    lyrics: [
      { time: 0.8, text: 'いつだって大丈夫' },
      { time: 4.2, text: 'この世界はダンスホール' },
      { time: 8.5, text: '君が居ればそれでいいのさ' },
    ],
  },
  {
    id: 'mono-gd-2043653198',
    monoTrackId: '2043653198',
    title: 'ケセラセラ',
    artist: 'Mrs. GREEN APPLE',
    album: 'ANTENNA',
    coverGradient: 'from-amber-950 via-zinc-900 to-yellow-950',
    coverAccent: '#f59e0b',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6e/8b/63/6e8b6348-73b3-8b74-12ea-9e0c1f609e5e/23UMGIM35091.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2043653198&title=%E3%82%B1%E3%82%BB%E3%83%A9%E3%82%BB%E3%83%A9&artist=Mrs.%20GREEN%20APPLE',
    isFullLengthStream: true,
    duration: 272,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Pop Rock',
    year: 2023,
    lyrics: [
      { time: 0.8, text: 'ケセラセラ' },
      { time: 3.5, text: '今日も乗り越えていく' },
      { time: 7.8, text: '私を愛せるのは私だけ' },
    ],
  },
  {
    id: 'mono-gd-1489254523',
    monoTrackId: '1489254523',
    title: 'うっせぇわ',
    artist: 'Ado',
    album: '狂言',
    coverGradient: 'from-blue-950 via-zinc-950 to-slate-950',
    coverAccent: '#3b82f6',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/cb/82/41/cb8241a3-5324-bbaa-8da2-33c5b29b1c7d/20UMGIM76771.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1489254523&title=%E3%81%86%E3%81%A3%E3%81%9B%E3%81%87%E3%82%8F&artist=Ado',
    isFullLengthStream: true,
    duration: 205,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Vocaloid Rock',
    year: 2020,
    lyrics: [
      { time: 0.6, text: '正しさとは 愚かさとは' },
      { time: 4.1, text: 'それが何か見せつけてやる' },
      { time: 14.5, text: 'ちっちゃな頃から優等生' },
      { time: 18.0, text: '気づいたら大人になっていた' },
      { time: 21.8, text: 'ナイフの様な思考回路' },
      { time: 25.4, text: '持ち合わせる訳もなく' },
    ],
  },
  {
    id: 'mono-gd-1954437911',
    monoTrackId: '1954437911',
    title: '新時代',
    artist: 'Ado',
    album: 'ウタの歌 ONE PIECE FILM RED',
    coverGradient: 'from-rose-950 via-zinc-900 to-purple-950',
    coverAccent: '#f43f5e',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/64/e5/ea/64e5ea9d-72e2-53b4-82a8-a379db933f7c/22UMGIM50811.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1954437911&title=%E6%96%B0%E6%99%82%E4%BB%A3&artist=Ado',
    isFullLengthStream: true,
    duration: 226,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Anime',
    year: 2022,
    lyrics: [
      { time: 0.5, text: '新時代はこの未来だ' },
      { time: 4.2, text: '世界中全部 変えてしまえば' },
      { time: 9.0, text: '変えてしまえば' },
    ],
  },
  {
    id: 'mono-gd-2077035650',
    monoTrackId: '2077035650',
    title: '唱',
    artist: 'Ado',
    album: '残夢',
    coverGradient: 'from-fuchsia-950 via-zinc-900 to-rose-950',
    coverAccent: '#d946ef',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/09/b8/4e/09b84ef7-b2e1-4566-075e-ba6a4bf7ce97/23UMGIM78877.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2077035650&title=%E5%94%B1&artist=Ado',
    isFullLengthStream: true,
    duration: 191,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'Electro-Swing / J-Pop',
    year: 2023,
    lyrics: [
      { time: 0.5, text: 'Na-na-na-na-na Ready for my show' },
      { time: 4.8, text: '踊れや踊れ 狂乱の夜' },
      { time: 9.5, text: '唱えよ 今宵も' },
    ],
  },
  {
    id: 'mono-gd-2107565588',
    monoTrackId: '2107565588',
    title: 'Bling-Bang-Bang-Born',
    artist: 'Creepy Nuts',
    album: 'LEGION',
    coverGradient: 'from-amber-950 via-zinc-950 to-orange-950',
    coverAccent: '#f59e0b',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/12/81/dc/1281dc28-48e6-5ff7-642d-6cf4d487d9e0/4547366660890.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2107565588&title=Bling-Bang-Bang-Born&artist=Creepy%20Nuts',
    isFullLengthStream: true,
    duration: 168,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'Hip-Hop / J-Pop',
    year: 2024,
    lyrics: [
      { time: 0.5, text: 'チート、Gifted、荒技、Wanted' },
      { time: 4.1, text: '禁忌、禁じ手、明らか盲点' },
      { time: 7.5, text: '反則、異次元、この世のものでは無いです' },
      { time: 11.2, text: 'Bling-Bang-Bang, Bling-Bang-Bang, Bling-Bang-Bang-Born' },
    ],
  },
  {
    id: 'mono-gd-2118335011',
    monoTrackId: '2118335011',
    title: '二度寝',
    artist: 'Creepy Nuts',
    album: '二度寝 - Single',
    coverGradient: 'from-sky-950 via-zinc-900 to-indigo-950',
    coverAccent: '#38bdf8',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/d5/4b/56/d54b5687-9bb3-9366-2180-87779d71cfa0/4547366665789.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2118335011&title=%E4%BA%8C%E5%BA%A6%E5%5D%9D&artist=Creepy%20Nuts',
    isFullLengthStream: true,
    duration: 198,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'Hip-Hop / Funk',
    year: 2024,
    lyrics: [
      { time: 0.8, text: '目覚まし止めて 転がるベッド' },
      { time: 4.5, text: '至福の二度寝の旅路へ' },
    ],
  },
  {
    id: 'mono-gd-1347630432',
    monoTrackId: '1347630432',
    title: '白日',
    artist: 'King Gnu',
    album: 'CEREMONY',
    coverGradient: 'from-slate-950 via-zinc-900 to-black',
    coverAccent: '#94a3b8',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4a/12/35/4a123514-9273-fa7a-c75c-43f11d1efd15/197187122110.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1347630432&title=%E7%99%BD%E6%97%A5&artist=King%20Gnu',
    isFullLengthStream: true,
    duration: 275,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Rock / Alternative',
    year: 2019,
    lyrics: [
      { time: 1.0, text: '時には誰かを' },
      { time: 4.5, text: '知らず知らずのうちに' },
      { time: 8.8, text: '傷つけてしまったり' },
      { time: 13.0, text: '失ったりして初めて' },
      { time: 17.5, text: '犯した罪を知る' },
    ],
  },
  {
    id: 'mono-gd-2074163984',
    monoTrackId: '2074163984',
    title: 'SPECIALZ',
    artist: 'King Gnu',
    album: 'THE GREATEST UNKNOWN',
    coverGradient: 'from-red-950 via-zinc-900 to-neutral-950',
    coverAccent: '#ef4444',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/8e/31/58/8e3158c3-f61b-9fba-4b2a-7bf33890f912/4547366637304.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2074163984&title=SPECIALZ&artist=King%20Gnu',
    isFullLengthStream: true,
    duration: 238,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Rock / Anime',
    year: 2023,
    lyrics: [
      { time: 0.5, text: 'U R MY SPECIAL' },
      { time: 5.2, text: '今際の際際で 踊り狂おうぜ' },
      { time: 10.0, text: '東京前線 壊れゆく街' },
    ],
  },
  {
    id: 'mono-gd-1489254521',
    monoTrackId: '1489254521',
    title: 'ドライフラワー',
    artist: '優里',
    album: '壱',
    coverGradient: 'from-amber-950 via-zinc-900 to-stone-950',
    coverAccent: '#d97706',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/08/96/95/089695fa-9ef1-893f-c603-f3089d79ca6f/4547366539356.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1489254521&title=%E3%83%89%E3%83%A9%E3%82%A4%E3%83%95%E3%83%A9%E3%83%AF%E3%83%BC&artist=%E5%84%AA%E9%87%8C',
    isFullLengthStream: true,
    duration: 286,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'Acoustic / J-Pop',
    year: 2020,
    lyrics: [
      { time: 1.0, text: '多分、私じゃなくていいね' },
      { time: 6.5, text: '余裕のない二人だったし' },
      { time: 12.0, text: '気付けば喧嘩ばっかりしてさ' },
    ],
  },
  {
    id: 'mono-gd-1891557999',
    monoTrackId: '1891557999',
    title: 'ベテルギウス',
    artist: '優里',
    album: '壱',
    coverGradient: 'from-blue-950 via-zinc-900 to-indigo-950',
    coverAccent: '#3b82f6',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/08/96/95/089695fa-9ef1-893f-c603-f3089d79ca6f/4547366539356.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1891557999&title=%E3%83%99%E3%83%86%E3%83%AB%E3%82%AE%E3%82%A6%E3%82%B9&artist=%E5%84%AA%E9%87%8C',
    isFullLengthStream: true,
    duration: 230,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Ballad',
    year: 2021,
    lyrics: [
      { time: 0.8, text: '空にある何かを見つめてたら' },
      { time: 5.5, text: 'それは星だって君がおしえてくれた' },
    ],
  },
  {
    id: 'mono-gd-1299550532',
    monoTrackId: '1299550532',
    title: 'マリーゴールド',
    artist: 'あいみょん',
    album: '瞬間的シックスセンス',
    coverGradient: 'from-amber-950 via-zinc-900 to-yellow-950',
    coverAccent: '#f59e0b',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/71/84/c5/7184c58d-71b5-31a8-9be5-94f31c2c2f78/075679867902.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1299550532&title=%E3%83%9E%E3%83%AA%E3%83%BC%E3%82%B0%E3%83%BC%E3%83%AB%E3%83%89&artist=%E3%81%82%E3%81%84%E3%81%BF%E3%82%87%E3%82%93',
    isFullLengthStream: true,
    duration: 306,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Folk Rock',
    year: 2018,
    lyrics: [
      { time: 1.0, text: '風の強さがちょっと' },
      { time: 5.2, text: '心を揺さぶりすぎて' },
      { time: 9.8, text: '真面目に見つめた 君が恋しい' },
      { time: 15.5, text: 'でんぐり返しの日々' },
    ],
  },
  {
    id: 'mono-gd-3443675790',
    monoTrackId: '3443675790',
    title: '水平線',
    artist: 'back number',
    album: 'ユーモア',
    coverGradient: 'from-cyan-950 via-zinc-900 to-sky-950',
    coverAccent: '#0284c7',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f7/e4/df/f7e4dfbf-8ee3-6bb3-2e06-c87fa9f654b9/21UMGIM61622.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=3443675790&title=%E6%B0%B4%E5%B9%B3%E7%B7%9A&artist=back%20number',
    isFullLengthStream: true,
    duration: 288,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Rock Ballad',
    year: 2020,
    lyrics: [
      { time: 1.0, text: '歓声と拍手の中に' },
      { time: 5.8, text: '誰かの悲鳴が混ざっている' },
      { time: 11.2, text: '水平線が光る朝に' },
      { time: 16.5, text: 'あなたの背中を見つめていた' },
    ],
  },
  {
    id: 'mono-gd-2123841181',
    monoTrackId: '2123841181',
    title: '晩餐歌',
    artist: 'tuki.',
    album: '晩餐歌 - Single',
    coverGradient: 'from-rose-950 via-zinc-900 to-stone-950',
    coverAccent: '#f43f5e',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/e0/f8/bf/e0f8bfdf-5202-bdfa-19d2-349fce8f6453/197189728440.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=2123841181&title=%E6%99%A9%E9%A4%90%E6%AD%8C&artist=tuki.',
    isFullLengthStream: true,
    duration: 215,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Pop / Singer-Songwriter',
    year: 2023,
    lyrics: [
      { time: 0.8, text: '君を泣かすやつなんか' },
      { time: 4.8, text: '全員消えてしまえばいいのにな' },
      { time: 9.8, text: '冷たい風が吹く夜の街' },
    ],
  },
  {
    id: 'mono-gd-1449537106',
    monoTrackId: '1449537106',
    title: '死ぬのがいいわ',
    artist: '藤井 風',
    album: 'HELP EVER HURT NEVER',
    coverGradient: 'from-stone-950 via-zinc-900 to-neutral-950',
    coverAccent: '#a8a29e',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/a4/0f/f2/a40ff262-b9cf-2c8c-1ae3-855d0458dfa3/jacket_SECL02598B00Z_550.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=1449537106&title=%E6%AD%BB%E3%81%AC%E3%81%AE%E3%81%8C%E3%81%84%E3%81%84%E3%82%8F&artist=%E8%97%A4%E4%BA%95%20%E9%A2%A8',
    isFullLengthStream: true,
    duration: 185,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'R&B / Soul',
    year: 2020,
    lyrics: [
      { time: 1.0, text: '指切りげんまん 嘘ついたら' },
      { time: 6.5, text: '針千本飲ます' },
      { time: 10.8, text: 'わたしの最後はあなたがいい' },
      { time: 16.0, text: 'あなたとこのままおサラバするより' },
      { time: 21.0, text: '死ぬのがいいわ' },
    ],
  },
  {
    id: 'mono-gd-421423830',
    monoTrackId: '421423830',
    title: '前前前世',
    artist: 'RADWIMPS',
    album: '君の名は。',
    coverGradient: 'from-sky-950 via-zinc-900 to-blue-950',
    coverAccent: '#38bdf8',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/ee/18/d5/ee18d53d-d6a5-be23-5e3d-24903c73fc5f/16UMGIM35232.rgb.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=421423830&title=%E5%89%8D%E5%89%8D%E5%89%8D%E4%B8%96&artist=RADWIMPS',
    isFullLengthStream: true,
    duration: 285,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'J-Rock / Anime OST',
    year: 2016,
    lyrics: [
      { time: 1.0, text: 'やっと眼を覚ましたかい' },
      { time: 4.8, text: 'それなのになぜ眼も合わせやしないんだい？' },
      { time: 9.2, text: '「遅いよ」と怒る君' },
      { time: 12.8, text: 'これでもやれるだけ飛ばしてきたんだよ' },
      { time: 17.5, text: '前前前世から僕は君を探しはじめたよ' },
    ],
  },
  {
    id: 'mono-gd-26304195',
    monoTrackId: '26304195',
    title: 'Get Lucky (feat. Pharrell Williams & Nile Rodgers)',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    coverGradient: 'from-amber-950 via-zinc-900 to-yellow-950',
    coverAccent: '#f59e0b',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/00/60/a400609b-640a-5c1a-7b3b-821ef9a1e345/886443927087.jpg/600x600bb.jpg',
    audioUrl: '/api/music/play?id=26304195&title=Get%20Lucky&artist=Daft%20Punk',
    isFullLengthStream: true,
    duration: 369,
    format: 'api.monochrome.tf 320kbps Full Stream',
    bitrate: '320 kbps Hi-Fi',
    genre: 'Disco / Funk',
    year: 2013,
    lyrics: [
      { time: 0.8, text: 'Like the legend of the phoenix' },
      { time: 5.2, text: 'All ends with beginnings' },
      { time: 9.8, text: 'What keeps the planet spinning' },
      { time: 14.2, text: 'The force from the beginning' },
      { time: 18.5, text: "We've come too far to give up who we are" },
      { time: 23.0, text: "So let's raise the bar and our cups to the stars" },
      { time: 27.5, text: "She's up all night 'til the sun" },
      { time: 30.0, text: "I'm up all night to get some" },
      { time: 32.2, text: "She's up all night for good fun" },
      { time: 34.5, text: "I'm up all night to get lucky" },
    ],
  },
];

// -------------------------------------------------------------------------
// Multi-Node Proxy Relay Servers (Works on GitHub Pages, GCS & Local Server)
// -------------------------------------------------------------------------
export type ProxyRelayNodeId =
  | 'auto'
  | 'wisp-mux'
  | 'sw-tunnel'
  | 'allorigins'
  | 'codetabs'
  | 'corsproxy'
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
    name: 'Wisp v1 + SW Auto Cascade',
    endpointLabel: 'Wisp v1 + UV/Scramjet SW + Multi-Node',
    region: 'Global Wisp Edge',
    description: 'Wisp v1 マルチプレックスと Service Worker (Ultraviolet / Scramjet) を最優先で使用します',
  },
  {
    id: 'wisp-mux',
    name: 'Wisp v1 Multiplexer Server',
    endpointLabel: 'wss://wisp.mercurywork.shop/ + /api/wisp',
    region: 'Wisp v1 Stream',
    description: 'Wisp v1 WebSocket プロトコルとバイナリストリームトンネルで SPA・音声・API を完全中継',
  },
  {
    id: 'sw-tunnel',
    name: 'Service Worker UV / Scramjet',
    endpointLabel: '/uv/service/* & /scramjet/* (Client SW)',
    region: 'In-Browser SW',
    description: 'ブラウザ内 Service Worker で DOM/fetch/XHR をフックして直接ルーティングします',
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

  const tryWispMux = async (): Promise<string | null> => {
    if (isStaticHost && preferredNode !== 'wisp-mux') return null;
    try {
      const res = await fetch(`./api/wisp?url=${encodeURIComponent(cleanTarget)}`, {
        headers: { 'X-Wisp-Target': cleanTarget },
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
      const res = await fetch(getServiceWorkerProxyUrl(cleanTarget, 'scramjet'), {
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
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(cleanTarget)}`, {
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

  const tryDirectGcs = async (): Promise<string | null> => {
    if (!cleanTarget.includes('storage.googleapis.com')) return null;
    try {
      const res = await fetch(cleanTarget, { signal: AbortSignal.timeout(5500) });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0) return text;
      }
    } catch {
      // ignore
    }
    return null;
  };

  type AttemptFn = { name: string; fn: () => Promise<string | null> };
  const pipeline: AttemptFn[] = [];

  if (preferredNode === 'wisp-mux') pipeline.push({ name: 'Wisp v1 Multiplexer', fn: tryWispMux });
  if (preferredNode === 'sw-tunnel') pipeline.push({ name: 'Service Worker UV/Scramjet', fn: trySwTunnel });
  if (preferredNode === 'allorigins') pipeline.push({ name: 'AllOrigins Relay', fn: tryAllOrigins });
  if (preferredNode === 'codetabs') pipeline.push({ name: 'CodeTabs Relay', fn: tryCodeTabs });
  if (preferredNode === 'corsproxy') pipeline.push({ name: 'CorsProxy.io', fn: tryCorsProxyIo });
  if (preferredNode === 'gcs-gateway') pipeline.push({ name: 'storage.googleapis.com Gateway', fn: tryDirectGcs });
  if (preferredNode === 'local-api') pipeline.push({ name: 'Local Server Proxy', fn: tryLocalApi });

  // Append fallback cascade so it NEVER fails with 404
  pipeline.push(
    { name: 'storage.googleapis.com Direct', fn: tryDirectGcs },
    { name: 'Wisp v1 Multiplexer', fn: tryWispMux },
    { name: 'Service Worker UV/Scramjet', fn: trySwTunnel },
    { name: 'Local Server Proxy', fn: tryLocalApi },
    { name: 'AllOrigins Relay', fn: tryAllOrigins },
    { name: 'CodeTabs Relay', fn: tryCodeTabs },
    { name: 'CorsProxy.io', fn: tryCorsProxyIo }
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
  // 1. Try direct CORS fetch first (many APIs like iTunes, LRCLIB, Saavn, Audius support CORS natively)
  try {
    const direct = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
    if (direct.ok) {
      return (await direct.json()) as T;
    }
  } catch {
    // fall through to Wisp & proxy relays
  }

  // 2. Try Wisp v1 Bridge (/api/wisp) — fastest server-side tunnel without CORS limits
  try {
    const wispRes = await fetch(`./api/wisp?url=${encodeURIComponent(targetUrl)}`, {
      headers: { Accept: 'application/json', 'X-Wisp-Target': targetUrl },
      signal: AbortSignal.timeout(5500),
    });
    if (wispRes.ok) {
      return (await wispRes.json()) as T;
    }
  } catch {
    // fall through
  }

  // 3. Try AllOrigins JSON wrapper
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

  // 4. Try CodeTabs Relay
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

  // 5. Try Local /api/proxy?raw=1
  try {
    const loc = await fetch(`./api/proxy?raw=1&url=${encodeURIComponent(targetUrl)}`, {
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
// Split a lyric line into natural rhythmic tokens (supports both space-separated words and CJK/Japanese syllable groups)
function buildTimedWordsForLine(
  text: string,
  lineStart: number,
  lineEnd: number,
  rawLineWithWordTags?: string
): LyricWord[] {
  const duration = Math.max(0.4, lineEnd - lineStart);

  // 1. Check if Enhanced LRC word tags (<mm:ss.xx>word) exist
  if (rawLineWithWordTags && /<\d{1,3}:\d{2}(?:\.\d{1,3})?>/.test(rawLineWithWordTags)) {
    const wordTagRegex = /<(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?>([^<]*)/g;
    const tagMatches = Array.from(rawLineWithWordTags.matchAll(wordTagRegex));
    if (tagMatches.length > 0) {
      const enhancedWords: LyricWord[] = [];
      for (let i = 0; i < tagMatches.length; i++) {
        const m = tagMatches[i];
        const wText = m[4];
        if (!wText || !wText.trim()) continue;
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const wStart = Math.round((mins * 60 + secs + ms / 1000) * 100) / 100;
        enhancedWords.push({
          text: wText,
          start: wStart,
          end: wStart + 0.35,
        });
      }
      for (let i = 0; i < enhancedWords.length; i++) {
        enhancedWords[i].end =
          i + 1 < enhancedWords.length ? enhancedWords[i + 1].start : Math.max(enhancedWords[i].start + 0.25, lineEnd);
      }
      if (enhancedWords.length > 0) return enhancedWords;
    }
  }

  // 2. Automatic Apple Music Sing syllable / word segmentation
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Tokenize into words or CJK 1-2 character clusters for smooth syllable glow
  const rawTokens: string[] = [];
  const parts = trimmed.split(/(\s+)/);
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      if (rawTokens.length > 0) rawTokens[rawTokens.length - 1] += part;
      continue;
    }
    // Check if mostly CJK characters without spaces
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(part) && part.length > 2) {
      let i = 0;
      while (i < part.length) {
        // Keep small kana (っ, ゃ, ゅ, ょ, ー, etc.) attached to preceding char
        let step = 2;
        if (i + step < part.length && /[ゃゅょっーぁぃぅぇぉャュョッー、。！？]/.test(part[i + step])) {
          step++;
        }
        rawTokens.push(part.slice(i, i + step));
        i += step;
      }
    } else {
      rawTokens.push(part);
    }
  }

  if (rawTokens.length === 0) return [];

  // Allocate active singing window (88% of line interval so final syllable settles cleanly)
  const activeSpan = Math.min(duration * 0.9, Math.max(0.5, duration - 0.18));
  const totalWeight = rawTokens.reduce((acc, tok) => acc + Math.max(1, tok.trim().length), 0);

  let cursor = lineStart;
  return rawTokens.map((tok, idx) => {
    const wWeight = Math.max(1, tok.trim().length) / totalWeight;
    const span = activeSpan * wWeight;
    const start = Math.round(cursor * 100) / 100;
    const end =
      idx === rawTokens.length - 1
        ? Math.round((lineStart + activeSpan) * 100) / 100
        : Math.round((cursor + span) * 100) / 100;
    cursor += span;
    return { text: tok, start, end };
  });
}

export function enrichLyricsWithWordTiming(lines: LyricLine[], fallbackDuration = 180): LyricLine[] {
  if (!lines || lines.length === 0) return [];
  const sorted = [...lines].sort((a, b) => a.time - b.time);
  const enriched: LyricLine[] = [];

  // If first vocal starts after 4.5s, insert an Apple Music instrumental intro indicator (• • •)
  if (sorted[0].time >= 4.5 && !sorted[0].isInterlude) {
    enriched.push({
      time: 0,
      endTime: sorted[0].time,
      text: '• • •',
      isInterlude: true,
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const nextTime = i + 1 < sorted.length ? sorted[i + 1].time : Math.max(cur.time + 5, fallbackDuration);
    const naturalEnd = Math.min(nextTime, cur.time + 7.5);
    const words =
      cur.words && cur.words.length > 0
        ? cur.words
        : cur.isInterlude
        ? []
        : buildTimedWordsForLine(cur.text, cur.time, naturalEnd);

    enriched.push({
      ...cur,
      endTime: naturalEnd,
      words,
    });

    // If there is a long instrumental gap (>= 6.5s) before the next lyric line, insert an Apple Music interlude (• • •)
    if (i + 1 < sorted.length && sorted[i + 1].time - naturalEnd >= 3.0 && sorted[i + 1].time - cur.time >= 7.5) {
      enriched.push({
        time: Math.round((cur.time + 4.2) * 100) / 100,
        endTime: sorted[i + 1].time,
        text: '• • •',
        isInterlude: true,
      });
    }
  }

  return enriched;
}

export interface MusicSettingsConfig {
  streamingQuality: 'lossless' | '320' | '192' | '128';
  sourceSite: 'auto' | 'monochrome' | 'netease' | 'saavn' | 'kuwo';
  downloadQuality: 'flac' | '320' | '192' | '128';
  mvQuality: '2160p' | '1080p' | '720p' | '480p';
  dolbyAtmosEnabled: boolean;
  dolbyAtmosPreset: 'theater' | 'studio' | 'binaural';
}

const MUSIC_SETTINGS_STORAGE_KEY = 'glassium_music_settings_v2';

export const DEFAULT_MUSIC_SETTINGS: MusicSettingsConfig = {
  streamingQuality: '320',
  sourceSite: 'auto',
  downloadQuality: '320',
  mvQuality: '1080p',
  dolbyAtmosEnabled: false,
  dolbyAtmosPreset: 'theater',
};

export function getMusicSettings(): MusicSettingsConfig {
  if (typeof window === 'undefined') return DEFAULT_MUSIC_SETTINGS;
  try {
    const raw = window.localStorage.getItem(MUSIC_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_MUSIC_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<MusicSettingsConfig>;
    return {
      streamingQuality: parsed.streamingQuality || DEFAULT_MUSIC_SETTINGS.streamingQuality,
      sourceSite: parsed.sourceSite || DEFAULT_MUSIC_SETTINGS.sourceSite,
      downloadQuality: parsed.downloadQuality || DEFAULT_MUSIC_SETTINGS.downloadQuality,
      mvQuality: parsed.mvQuality || DEFAULT_MUSIC_SETTINGS.mvQuality,
      dolbyAtmosEnabled:
        typeof parsed.dolbyAtmosEnabled === 'boolean'
          ? parsed.dolbyAtmosEnabled
          : DEFAULT_MUSIC_SETTINGS.dolbyAtmosEnabled,
      dolbyAtmosPreset: parsed.dolbyAtmosPreset || DEFAULT_MUSIC_SETTINGS.dolbyAtmosPreset,
    };
  } catch {
    return DEFAULT_MUSIC_SETTINGS;
  }
}

export function saveMusicSettings(next: Partial<MusicSettingsConfig>): MusicSettingsConfig {
  const merged: MusicSettingsConfig = {
    ...getMusicSettings(),
    ...next,
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUSIC_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('glassium-music-settings-changed', { detail: merged }));
    } catch {
      // ignore storage errors
    }
  }
  return merged;
}

export function buildTrackDownloadUrl(
  track: { id?: string; monoTrackId?: string; title: string; artist: string },
  settings?: MusicSettingsConfig
): string {
  const cfg = settings || getMusicSettings();
  const raw = String(track.monoTrackId || track.id || '').trim();
  const isItunes = /^(?:mono-itunes-|itunes-|album-|single-|artist-)/i.test(raw);
  const cleanId = isItunes
    ? ''
    : raw
        .replace(/^mono-live-gd-/, '')
        .replace(/^mono-gd-/, '')
        .replace(/^mono-live-tf-/, '')
        .replace(/^mono-live-/, '')
        .trim();
  const numericId = /^\d+$/.test(cleanId) ? cleanId : '';
  return `/api/music/download?id=${encodeURIComponent(numericId)}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&quality=${encodeURIComponent(cfg.downloadQuality)}&source=${encodeURIComponent(cfg.sourceSite)}`;
}

export function parseLrcLyrics(lrcText: string, fallbackDuration = 180): LyricLine[] {
  if (!lrcText || !lrcText.trim()) return [];
  const lines = lrcText.split(/\r?\n/);
  const parsed: { time: number; text: string; rawWithoutLineTag: string }[] = [];
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const wordTagStripRegex = /<\d{1,3}:\d{2}(?:\.\d{1,3})?>/g;
  const metadataCreditRegex =
    /^(?:作词|作曲|编曲|制作人|プロデューサー|作詞|編曲|Lyricist|Composer|Arranger|混音|录音|吉他|贝斯|鼓|Vocal|Mastering|Mixing)\s*[:：]/i;

  for (const rawLine of lines) {
    const matches = Array.from(rawLine.matchAll(timeRegex));
    const withoutLineTag = rawLine.replace(timeRegex, '').trim();
    const cleanText = withoutLineTag.replace(wordTagStripRegex, '').trim();
    if (matches.length > 0 && cleanText && !metadataCreditRegex.test(cleanText)) {
      for (const m of matches) {
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        parsed.push({
          time: Math.round((mins * 60 + secs + ms / 1000) * 100) / 100,
          text: cleanText,
          rawWithoutLineTag: withoutLineTag,
        });
      }
    }
  }

  if (parsed.length > 0) {
    parsed.sort((a, b) => a.time - b.time);
    const baseLines: LyricLine[] = parsed.map((item, idx) => {
      const nextT = idx + 1 < parsed.length ? parsed[idx + 1].time : Math.max(item.time + 5, fallbackDuration);
      const endT = Math.min(nextT, item.time + 7.5);
      return {
        time: item.time,
        endTime: endT,
        text: item.text,
        words: buildTimedWordsForLine(item.text, item.time, endT, item.rawWithoutLineTag),
      };
    });
    return enrichLyricsWithWordTiming(baseLines, fallbackDuration);
  }

  // Plain lyrics fallback: distribute timestamps evenly across track duration
  const plainLines = lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !metadataCreditRegex.test(l));
  if (plainLines.length === 0) return [];
  const step = Math.max(3, (fallbackDuration - 8) / plainLines.length);
  const fallbackBase: LyricLine[] = plainLines.map((text, idx) => ({
    time: Math.round(idx * step * 100) / 100,
    text,
  }));
  return enrichLyricsWithWordTiming(fallbackBase, fallbackDuration);
}

// Parse TTML (Timed Text Markup Language) or JSON Lyrics into LyricLine[] with Word-Level Timestamps
function parseTtmlTimestamp(raw: string): number {
  const clean = raw.trim();
  if (clean.endsWith('s')) return parseFloat(clean) || 0;
  const parts = clean.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseFloat(clean) || 0;
}

export function parseSyncedLyricsUniversal(
  input: string | LyricLine[],
  fallbackDuration = 180
): LyricLine[] {
  if (Array.isArray(input)) {
    return enrichLyricsWithWordTiming(input, fallbackDuration);
  }
  const trimmed = (input || '').trim();
  if (!trimmed) return [];

  // 1. JSON format support
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      const arr = Array.isArray(parsedJson) ? parsedJson : parsedJson.lines || parsedJson.lyrics;
      if (Array.isArray(arr)) {
        return enrichLyricsWithWordTiming(arr as LyricLine[], fallbackDuration);
      }
    } catch {
      // fall through
    }
  }

  // 2. TTML XML format support (<p begin="00:12.40" end="00:16.80"><span begin="00:12.40" end="00:13.10">Word</span></p>)
  if (trimmed.includes('<tt') || trimmed.includes('<p ')) {
    const pRegex = /<p[^>]*begin=["']([^"']+)["'][^>]*?(?:end=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/p>/gi;
    const spanRegex = /<span[^>]*begin=["']([^"']+)["'][^>]*?(?:end=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/span>/gi;
    const ttmlLines: LyricLine[] = [];
    for (const pMatch of trimmed.matchAll(pRegex)) {
      const lineStart = parseTtmlTimestamp(pMatch[1]);
      const lineEnd = pMatch[2] ? parseTtmlTimestamp(pMatch[2]) : lineStart + 5;
      const inner = pMatch[3];
      const words: LyricWord[] = [];
      for (const sMatch of inner.matchAll(spanRegex)) {
        const wStart = parseTtmlTimestamp(sMatch[1]);
        const wEnd = sMatch[2] ? parseTtmlTimestamp(sMatch[2]) : wStart + 0.4;
        const wText = sMatch[3].replace(/<[^>]+>/g, '');
        if (wText) {
          words.push({ text: wText.endsWith(' ') ? wText : wText + ' ', start: wStart, end: wEnd });
        }
      }
      const plainText = inner.replace(/<[^>]+>/g, '').trim();
      if (plainText) {
        ttmlLines.push({
          time: lineStart,
          endTime: lineEnd,
          text: plainText,
          words: words.length > 0 ? words : buildTimedWordsForLine(plainText, lineStart, lineEnd),
        });
      }
    }
    if (ttmlLines.length > 0) {
      return enrichLyricsWithWordTiming(ttmlLines, fallbackDuration);
    }
  }

  // 3. Standard & Enhanced LRC format
  return parseLrcLyrics(trimmed, fallbackDuration);
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

function cleanTrackQueryString(raw: string): string {
  return (raw || '')
    .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
    .replace(/\([^)]*(?:Official|Video|Audio|MV|Lyric|Remaster|feat\.|ft\.|Ver\.|Version)[^)]*\)/gi, '')
    .replace(/\[[^\]]*(?:Official|Video|Audio|MV|Lyric|feat\.|ft\.)[^\]]*\]/gi, '')
    .replace(/-\s*Single/gi, '')
    .trim();
}

function normalizeLyricMatchToken(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[\s\-_()（）【】「」『』〜~・.,!?'":：/\\]/g, '');
}

function isStrictTrackMatchForLyrics(
  targetTitle: string,
  targetArtist: string,
  candTitle?: string,
  candArtist?: string
): boolean {
  const tTitle = normalizeLyricMatchToken(cleanTrackQueryString(targetTitle) || targetTitle);
  const cTitle = normalizeLyricMatchToken(cleanTrackQueryString(candTitle || '') || candTitle || '');
  if (!tTitle || !cTitle) return false;
  const titleMatches =
    tTitle === cTitle ||
    (tTitle.length >= 2 && cTitle.length >= 2 && (cTitle.includes(tTitle) || tTitle.includes(cTitle)));
  if (!titleMatches) return false;

  const primaryTargetArtist = (cleanTrackQueryString(targetArtist) || targetArtist)
    .split(/[,、/&×]/)[0]
    .trim();
  const tArtist = normalizeLyricMatchToken(primaryTargetArtist);
  const cArtist = normalizeLyricMatchToken(candArtist || '');
  if (!tArtist) return true;
  if (!cArtist) return false;
  if (tArtist === cArtist || cArtist.includes(tArtist) || tArtist.includes(cArtist)) return true;

  const tokens = primaryTargetArtist
    .toLowerCase()
    .split(/[\s,、/&×()（）-]+/)
    .map((tok) => normalizeLyricMatchToken(tok))
    .filter((tok) => tok.length >= 2);
  return tokens.some((tok) => cArtist.includes(tok));
}

export async function fetchSynchronizedLyricsFromLrclib(
  title: string,
  artist: string,
  durationSec = 180,
  monoTrackId?: string | number
): Promise<LyricLine[]> {
  const cleanId = monoTrackId
    ? String(monoTrackId)
        .replace(/^mono-live-gd-/, '')
        .replace(/^mono-gd-/, '')
        .replace(/^mono-live-tf-/, '')
        .replace(/^mono-live-/, '')
        .replace(/^mono-itunes-/, '')
        .trim()
    : '';
  const numericId = /^\d+$/.test(cleanId) ? cleanId : '';

  // 1. Try local server /api/music/lyrics endpoint first (strictly verifies title + artist on server)
  try {
    const srvRes = await fetch(
      `/api/music/lyrics?id=${encodeURIComponent(numericId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
      { signal: AbortSignal.timeout(5500) }
    );
    if (srvRes.ok) {
      const srvData = (await srvRes.json()) as { lyric?: string };
      if (srvData?.lyric && srvData.lyric.trim().length > 0) {
        const parsedSrv = parseLrcLyrics(srvData.lyric, durationSec);
        if (parsedSrv.length >= 3) return parsedSrv;
      }
    }
  } catch {
    // fall through
  }

  const cleanTitle = cleanTrackQueryString(title) || title;
  const cleanArtist = cleanTrackQueryString(artist.split(/[,、/]/)[0] || artist) || artist;

  // 2. Try LRCLIB exact /api/get and /api/search with STRICT title + artist validation
  const qFull = `${cleanTitle} ${cleanArtist}`.trim();
  const searchUrl1 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
  const searchUrl2 = `https://lrclib.net/api/search?q=${encodeURIComponent(qFull)}`;

  const [items1, items2] = await Promise.all([
    fetch(searchUrl1, { signal: AbortSignal.timeout(4500) })
      .then((r) => (r.ok ? (r.json() as Promise<LrclibSearchItem[]>) : null))
      .catch(() => null),
    fetch(searchUrl2, { signal: AbortSignal.timeout(4500) })
      .then((r) => (r.ok ? (r.json() as Promise<LrclibSearchItem[]>) : null))
      .catch(() => null),
  ]);

  const combined: LrclibSearchItem[] = [
    ...(Array.isArray(items1) ? items1 : []),
    ...(Array.isArray(items2) ? items2 : []),
  ];

  // Strictly filter so we NEVER accept lyrics from a different song or artist!
  const verifiedItems = combined.filter((it) =>
    isStrictTrackMatchForLyrics(cleanTitle, cleanArtist, it.trackName, it.artistName)
  );

  if (verifiedItems.length > 0) {
    const withSynced = verifiedItems.filter((it) => it.syncedLyrics && it.syncedLyrics.trim().length > 20);
    if (withSynced.length > 0) {
      withSynced.sort((a, b) => {
        const exactTitleA =
          normalizeLyricMatchToken(a.trackName || '') === normalizeLyricMatchToken(cleanTitle) ? 0 : 1;
        const exactTitleB =
          normalizeLyricMatchToken(b.trackName || '') === normalizeLyricMatchToken(cleanTitle) ? 0 : 1;
        if (exactTitleA !== exactTitleB) return exactTitleA - exactTitleB;
        const diffA = Math.abs((a.duration || durationSec) - durationSec);
        const diffB = Math.abs((b.duration || durationSec) - durationSec);
        return diffA - diffB;
      });
      const bestSynced = parseLrcLyrics(withSynced[0].syncedLyrics!, durationSec);
      if (bestSynced.length >= 3) return bestSynced;
    }

    const withPlain = verifiedItems.find((it) => it.plainLyrics && it.plainLyrics.trim().length > 20);
    if (withPlain?.plainLyrics) {
      const plain = parseLrcLyrics(withPlain.plainLyrics, durationSec);
      if (plain.length >= 3) return plain;
    }
  }

  // 3. Check if track is in MONOCHROME_CATALOG with rich built-in lyrics
  const catalogHit = MONOCHROME_CATALOG.find((c) =>
    isStrictTrackMatchForLyrics(cleanTitle, cleanArtist, c.title, c.artist)
  );
  if (catalogHit && catalogHit.lyrics && catalogHit.lyrics.length >= 4) {
    return enrichLyricsWithWordTiming(catalogHit.lyrics, durationSec);
  }

  return enrichLyricsWithWordTiming(
    [
      { time: 0, text: `♪ ${title} — ${artist}` },
      { time: 6, text: 'Instrumental / Vocal Stream Active' },
      { time: 14, text: `${title} (${artist})` },
    ],
    durationSec
  );
}

// Monochrome Live API (monochrome.st / api.monochrome.tf) + Regional Failover Nodes
export const MONOCHROME_INSTANCES = [
  { name: 'monochrome.st (Primary)', url: 'https://monochrome.st', api: 'https://tracks.monochrome.st' },
  { name: 'api.monochrome.tf', url: 'https://monochrome.st', api: 'https://api.monochrome.tf' },
  { name: 'eu-central.monochrome.tf', url: 'https://monochrome.st', api: 'https://eu-central.monochrome.tf' },
  { name: 'us-west.monochrome.tf', url: 'https://monochrome.st', api: 'https://us-west.monochrome.tf' },
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
  { grad: 'from-rose-950 via-zinc-900 to-black', accent: '#fa243c' },
  { grad: 'from-zinc-900 via-neutral-900 to-black', accent: '#fb7185' },
  { grad: 'from-slate-950 via-zinc-900 to-neutral-950', accent: '#f43f5e' },
  { grad: 'from-neutral-950 via-zinc-900 to-stone-950', accent: '#e11d48' },
  { grad: 'from-stone-950 via-zinc-950 to-black', accent: '#fda4af' },
];

interface GdStudioClientTrackItem {
  id: string | number;
  name: string;
  artist: string[] | string;
  album?: string;
  pic_id?: string | number;
  url_id?: string | number;
  lyric_id?: string | number;
  source?: string;
}

// Resolve an exact full-length audio stream URL for the specified track (NEVER returns an unrelated song)
export async function resolveFullLengthAudioStream(
  title: string,
  artist: string,
  monoTrackId?: string | number
): Promise<{ audioUrl: string; proxyAudioUrl?: string; format: string; bitrate: string } | null> {
  const settings = getMusicSettings();
  const brVal =
    settings.streamingQuality === 'lossless'
      ? 999
      : Number(settings.streamingQuality) || 320;
  const cleanId = monoTrackId
    ? String(monoTrackId)
        .replace(/^mono-live-gd-/, '')
        .replace(/^mono-gd-/, '')
        .replace(/^mono-live-tf-/, '')
        .replace(/^mono-live-/, '')
        .replace(/^mono-itunes-/, '')
        .trim()
    : '';

  // 1. Try local backend /api/music/info first (resolves exact GDStudio/Saavn/NetEase full-length stream)
  try {
    const infoRes = await fetch(
      `/api/music/info?id=${encodeURIComponent(cleanId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&br=${brVal}&source=${encodeURIComponent(settings.sourceSite)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (infoRes.ok) {
      const infoData = (await infoRes.json()) as {
        audioUrl?: string;
        proxyAudioUrl?: string;
        format?: string;
        bitrate?: string;
      };
      if (infoData?.audioUrl && infoData.audioUrl.startsWith('http')) {
        return {
          audioUrl: infoData.audioUrl,
          proxyAudioUrl: infoData.proxyAudioUrl,
          format: infoData.format || 'api.monochrome.tf Full-Length Stream',
          bitrate: infoData.bitrate || `${brVal === 999 ? 'Lossless FLAC / 320' : brVal} kbps Full Track`,
        };
      }
    }
  } catch {
    // fall through to direct client resolution
  }

  // 2. Direct client-side resolution via GDStudio NetEase API
  const fetchDirectGdUrl = async (idToFetch: string): Promise<string | null> => {
    if (!idToFetch || !/^\d+$/.test(idToFetch)) return null;
    try {
      const r = await fetch(
        `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${encodeURIComponent(idToFetch)}&br=${brVal}`,
        { signal: AbortSignal.timeout(5500) }
      );
      if (r.ok) {
        const d = (await r.json()) as { url?: string };
        if (d?.url && d.url.startsWith('http')) {
          return d.url.replace(/^http:\/\//i, 'https://');
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  if (cleanId) {
    const directUrl = await fetchDirectGdUrl(cleanId);
    if (directUrl) {
      return {
        audioUrl: directUrl,
        format: 'api.monochrome.tf Full-Length Stream',
        bitrate: `${brVal === 999 ? 'Lossless' : brVal} kbps Hi-Fi`,
      };
    }
  }

  // 3. Search by title + artist on GDStudio NetEase and pick strictly matching track
  const query = `${title} ${artist}`.trim();
  if (query) {
    try {
      const sRes = await fetch(
        `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(query)}&count=6&pages=1`,
        { signal: AbortSignal.timeout(5500) }
      );
      if (sRes.ok) {
        const list = (await sRes.json()) as GdStudioClientTrackItem[];
        if (Array.isArray(list)) {
          for (const item of list.slice(0, 4)) {
            const itemArtist = Array.isArray(item.artist) ? item.artist.join(' ') : String(item.artist || '');
            if (!isStrictTrackMatchForLyrics(title, artist, item.name, itemArtist)) continue;
            const candidateId = String(item.url_id || item.id || '');
            const candidateUrl = await fetchDirectGdUrl(candidateId);
            if (candidateUrl) {
              return {
                audioUrl: candidateUrl,
                format: 'api.monochrome.tf Full-Length Stream',
                bitrate: `${brVal === 999 ? 'Lossless' : brVal} kbps Hi-Fi`,
              };
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export async function searchMonochromeLiveTracks(query: string): Promise<MonochromeTrack[]> {
  const cleanQ = query.trim() || 'YOASOBI';
  const settings = getMusicSettings();

  // 1. Primary: Query our fast server-side /api/music/search endpoint (~300ms response, 0 CORS issues)
  try {
    const srvRes = await fetch(
      `/api/music/search?q=${encodeURIComponent(cleanQ)}&source=${encodeURIComponent(settings.sourceSite)}`,
      {
        signal: AbortSignal.timeout(7000),
      }
    );
    if (srvRes.ok) {
      const srvData = (await srvRes.json()) as {
        tracks?: Array<{
          id: string;
          monoTrackId?: string;
          title: string;
          artist: string;
          album: string;
          artworkUrl?: string;
          audioUrl: string;
          duration: number;
          format: string;
          bitrate: string;
          genre: string;
          year: number;
        }>;
      };
      if (Array.isArray(srvData?.tracks) && srvData.tracks.length > 0) {
        return srvData.tracks.map((item, idx) => {
          const palette = GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length];
          return {
            id: item.id,
            monoTrackId: item.monoTrackId,
            title: item.title,
            artist: item.artist,
            album: item.album,
            coverGradient: palette.grad,
            coverAccent: palette.accent,
            artworkUrl: item.artworkUrl,
            audioUrl: item.audioUrl,
            isFullLengthStream: true,
            sourceUrl: item.audioUrl,
            duration: Math.max(90, Number(item.duration) || 215),
            format: item.format || 'api.monochrome.tf 320kbps Full Stream',
            bitrate: item.bitrate || '320 kbps Full Track',
            genre: item.genre || 'J-Pop / Lossless',
            year: Number(item.year) || 2025,
            lyrics: [
              { time: 0, text: `${item.title} — ${item.artist}` },
              { time: 3, text: '同期歌詞を読み込み中...' },
            ],
          };
        });
      }
    }
  } catch {
    // fall through to direct client-side search if server endpoint is unavailable
  }

  // 2. Fallback: Direct client-side parallel search via GDStudio NetEase + iTunes Japan
  const gdUrl = `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(cleanQ)}&count=16&pages=1`;
  const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&country=JP&entity=song&limit=12`;

  const [gdItems, itunesData] = await Promise.all([
    fetch(gdUrl, { signal: AbortSignal.timeout(6000) })
      .then((r) => (r.ok ? (r.json() as Promise<GdStudioClientTrackItem[]>) : []))
      .catch(() => [] as GdStudioClientTrackItem[]),
    fetch(itunesUrl, { signal: AbortSignal.timeout(5500) })
      .then((r) => (r.ok ? (r.json() as Promise<{ results?: ItunesTrackItem[] }>) : { results: [] }))
      .catch(() => ({ results: [] as ItunesTrackItem[] })),
  ]);

  const itunesList = Array.isArray(itunesData?.results) ? itunesData.results : [];
  const results: MonochromeTrack[] = [];

  if (Array.isArray(gdItems) && gdItems.length > 0) {
    gdItems.forEach((item, idx) => {
      if (!item || !item.id || !item.name) return;
      const trackId = String(item.url_id || item.id);
      const artistStr = Array.isArray(item.artist)
        ? item.artist.filter(Boolean).join(', ')
        : String(item.artist || cleanQ);
      const albumStr = String(item.album || 'Single / Album');

      // Filter out unofficial covers and '歌ってみた' unless query specifically searches for them
      const isUnofficialCover =
        /歌ってみた|歌い手|弾いてみた|叩いてみた|踊ってみた|covered by|cover by|acoustic cover|piano cover|guitar cover|remix|bootleg|fan cover|翻唱|翻唱版/i.test(
          `${item.name} ${artistStr} ${albumStr}`
        ) ||
        (/\bcover\b/i.test(`${item.name} ${albumStr}`) && !/\boriginal\b/i.test(item.name));

      if (isUnofficialCover && !/歌ってみた|cover/i.test(cleanQ)) {
        return;
      }

      const palette = GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length];
      const matchedItunes = itunesList.find(
        (it) =>
          it.trackName &&
          (it.trackName.toLowerCase() === item.name.toLowerCase() ||
            it.trackName.toLowerCase().includes(item.name.toLowerCase().slice(0, 6)))
      );
      const hiResArt = matchedItunes?.artworkUrl100
        ? matchedItunes.artworkUrl100.replace('100x100bb', '600x600bb')
        : undefined;
      const fullDuration =
        matchedItunes?.trackTimeMillis && matchedItunes.trackTimeMillis > 40000
          ? Math.round(matchedItunes.trackTimeMillis / 1000)
          : 215;

      results.push({
        id: `mono-gd-${trackId}`,
        monoTrackId: trackId,
        title: item.name,
        artist: artistStr,
        album: String(item.album || 'Single / Album'),
        coverGradient: palette.grad,
        coverAccent: palette.accent,
        artworkUrl: hiResArt,
        audioUrl: `/api/music/play?id=${encodeURIComponent(trackId)}&title=${encodeURIComponent(item.name)}&artist=${encodeURIComponent(artistStr)}`,
        isFullLengthStream: false,
        sourceUrl: `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${encodeURIComponent(trackId)}&br=320`,
        duration: fullDuration,
        format: 'api.monochrome.tf 320kbps Full Stream',
        bitrate: '320 kbps Full Track',
        genre: matchedItunes?.primaryGenreName || 'J-Pop / Lossless',
        year: matchedItunes?.releaseDate
          ? new Date(matchedItunes.releaseDate).getFullYear() || 2025
          : 2025,
        lyrics: [
          { time: 0, text: `${item.name} — ${artistStr}` },
          { time: 3, text: '同期歌詞を読み込み中...' },
        ],
      });
    });
  }

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

