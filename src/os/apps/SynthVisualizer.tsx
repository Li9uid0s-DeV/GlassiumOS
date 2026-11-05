import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ProxyEngine,
  ProxyRelayNodeId,
  PROXY_RELAY_SERVERS,
  WISP_SERVER_PRESETS,
  MONOCHROME_CATALOG,
  MONOCHROME_INSTANCES,
  MonochromeTrack,
  LyricLine,
  MusicSettingsConfig,
  getMusicSettings,
  saveMusicSettings,
  buildTrackDownloadUrl,
  enrichLyricsWithWordTiming,
  parseSyncedLyricsUniversal,
  searchMonochromeLiveTracks,
  fetchSynchronizedLyricsFromLrclib,
  fetchHtmlViaProxyCascade,
  getServiceWorkerProxyUrl,
  ensureServiceWorkerReady,
  configureServiceWorkerWisp,
  testWispServerConnection,
} from '../proxyService';
import { useOS } from '../OSContext';
import { globalAudio } from '../globalAudioManager';
import { DrumPadTunerView } from './ExtraAppsSuite';

type AppleMusicNavId =
  | 'listen-now'
  | 'browse'
  | 'mv'
  | 'artist'
  | 'favorites'
  | 'songs'
  | 'recent'
  | 'lyrics'
  | 'settings'
  | 'monochrome-web'
  | 'synth'
  | 'drumpad'
  | 'proxy';

export interface MusicVideoItem {
  id: string;
  youtubeId?: string;
  videoUrl?: string;
  title: string;
  artist: string;
  album?: string;
  durationLabel: string;
  viewsLabel: string;
  year: number;
  thumbnailUrl?: string;
}

export interface ArtistProfileData {
  name: string;
  englishName: string;
  genre: string;
  monthlyListeners: string;
  bio: string;
  bannerGradient: string;
  avatarUrl: string;
  bannerUrl?: string;
  mvs: MusicVideoItem[];
}

function cleanPrimaryArtistName(rawArtist: string): string {
  if (!rawArtist) return 'YOASOBI';
  const cleaned = rawArtist
    .replace(/\s*[,、/／]?\s*(?:作曲|作詞|編曲)\s*[:：].*$/i, '')
    .split(/\s*[,、]\s*/)[0]
    .trim();
  return cleaned || rawArtist.trim();
}

const OFFICIAL_MV_CATALOG: MusicVideoItem[] = [
  {
    id: 'mv-yoasobi-idol',
    youtubeId: 'ZRtdQ81jPUQ',
    title: 'アイドル (Idol)',
    artist: 'YOASOBI',
    album: 'THE BOOK 3',
    durationLabel: '3:33',
    viewsLabel: '5.4億回視聴',
    year: 2023,
  },
  {
    id: 'mv-yoasobi-yoru',
    youtubeId: 'by4SYYWlhEs',
    title: '夜に駆ける (Racing into the Night)',
    artist: 'YOASOBI',
    album: 'THE BOOK',
    durationLabel: '4:21',
    viewsLabel: '2.8億回視聴',
    year: 2019,
  },
  {
    id: 'mv-yoasobi-yuusha',
    youtubeId: 'OIBODIPC_8Y',
    title: '勇者 (The Brave) — 葬送のフリーレン OP',
    artist: 'YOASOBI',
    album: 'THE BOOK 3',
    durationLabel: '3:24',
    viewsLabel: '1.1億回視聴',
    year: 2023,
  },
  {
    id: 'mv-kenshi-kickback',
    youtubeId: 'M2cckDmNLMI',
    title: 'KICK BACK',
    artist: '米津玄師',
    album: 'LOST CORNER',
    durationLabel: '3:13',
    viewsLabel: '1.8億回視聴',
    year: 2022,
  },
  {
    id: 'mv-kenshi-lemon',
    youtubeId: 'SX_ViT4Ra7k',
    title: 'Lemon',
    artist: '米津玄師',
    album: 'STRAY SHEEP',
    durationLabel: '4:35',
    viewsLabel: '8.9億回視聴',
    year: 2018,
  },
  {
    id: 'mv-ado-show',
    youtubeId: 'pgXpM4l_MwI',
    title: '唱 (Show)',
    artist: 'Ado',
    album: '残夢',
    durationLabel: '3:12',
    viewsLabel: '2.3億回視聴',
    year: 2023,
  },
  {
    id: 'mv-ado-usseewa',
    youtubeId: 'Qp3b-RXtz4w',
    title: 'うっせぇわ (Usseewa)',
    artist: 'Ado',
    album: '狂言',
    durationLabel: '3:26',
    viewsLabel: '3.4億回視聴',
    year: 2020,
  },
  {
    id: 'mv-higedan-pretender',
    youtubeId: 'TQ8WlA2GXbk',
    title: 'Pretender',
    artist: 'Official髭男dism',
    album: 'Traveler',
    durationLabel: '5:26',
    viewsLabel: '5.3億回視聴',
    year: 2019,
  },
  {
    id: 'mv-higedan-subtitle',
    youtubeId: 'hN5MBlGv2Ac',
    title: 'Subtitle',
    artist: 'Official髭男dism',
    album: 'Rejoice',
    durationLabel: '5:14',
    viewsLabel: '1.9億回視聴',
    year: 2022,
  },
  {
    id: 'mv-mga-lilac',
    youtubeId: 'QjrkrVmC-8M',
    title: 'ライラック (Lilac)',
    artist: 'Mrs. GREEN APPLE',
    album: 'Lilac Single',
    durationLabel: '4:05',
    viewsLabel: '1.1億回視聴',
    year: 2024,
  },
  {
    id: 'mv-mga-que-sera',
    youtubeId: 'Jy-QS27q7lA',
    title: 'ケセラセラ (Que Sera Sera)',
    artist: 'Mrs. GREEN APPLE',
    album: 'ANTENNA',
    durationLabel: '4:32',
    viewsLabel: '1.4億回視聴',
    year: 2023,
  },
  {
    id: 'mv-vaundy-kaiju',
    youtubeId: 'UM9XNpgrqVk',
    title: '怪獣の花唄 (Kaiju no Hanauta)',
    artist: 'Vaundy',
    album: 'strobo',
    durationLabel: '3:49',
    viewsLabel: '1.9億回視聴',
    year: 2020,
  },
  {
    id: 'mv-creepynuts-bling',
    youtubeId: 'mLW35YMzELE',
    title: 'Bling-Bang-Bang-Born',
    artist: 'Creepy Nuts',
    album: 'LEGION',
    durationLabel: '2:52',
    viewsLabel: '2.9億回視聴',
    year: 2024,
  },
  {
    id: 'mv-daftpunk-onemoretime',
    youtubeId: 'FGBhQbmPwH8',
    title: 'One More Time',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationLabel: '5:21',
    viewsLabel: '5.1億回視聴',
    year: 2000,
  },
];

const ARTIST_METADATA_MAP: Record<
  string,
  Omit<ArtistProfileData, 'name' | 'mvs'>
> = {
  YOASOBI: {
    englishName: 'Ayase & ikura',
    genre: 'J-Pop / ボカロ小説音楽ユニット',
    monthlyListeners: '1,180万人 / 月',
    bio: 'コンポーザーのAyaseとボーカルのikuraからなる、「小説を音楽にするユニット」。2019年公開の『夜に駆ける』でストリーミング10億回再生を突破し、『アイドル』『勇者』など世界的ヒットを連発。',
    bannerGradient: 'from-rose-600 via-fuchsia-600 to-indigo-900',
    avatarUrl: 'https://img.youtube.com/vi/ZRtdQ81jPUQ/hqdefault.jpg',
  },
  米津玄師: {
    englishName: 'Kenshi Yonezu',
    genre: 'J-Pop / オルタナティブ・ロック',
    monthlyListeners: '960万人 / 月',
    bio: '作詞・作曲・アレンジ・アートワークまで全てを一人で手掛けるシンガーソングライター。『Lemon』『KICK BACK』『地球儀』『さよーならまたいつか！』など時代を象徴する名曲を多数発表。',
    bannerGradient: 'from-amber-600 via-orange-700 to-zinc-900',
    avatarUrl: 'https://img.youtube.com/vi/M2cckDmNLMI/hqdefault.jpg',
  },
  Ado: {
    englishName: 'Ado Official',
    genre: 'J-Pop / ロック / ボーカロイド・カルチャー',
    monthlyListeners: '890万人 / 月',
    bio: '圧倒的な歌唱力と表現力を持つ歌い手・シンガー。『うっせぇわ』『新時代』『唱』などチャートを席巻し、ワールドツアー「Wish」も成功させた次世代アイコン。',
    bannerGradient: 'from-blue-700 via-indigo-800 to-slate-950',
    avatarUrl: 'https://img.youtube.com/vi/pgXpM4l_MwI/hqdefault.jpg',
  },
  Official髭男dism: {
    englishName: 'Official HIGE DANdism',
    genre: 'J-Pop / ピアノ・ポップロック',
    monthlyListeners: '780万人 / 月',
    bio: '藤原聡・小笹大輔・楢﨑誠・松浦匡希の4人組ピアノポップバンド。緻密なメロディと心に刺さる歌詞で『Pretender』『Subtitle』『Mixed Nuts』など数々の国民的ヒットを生む。',
    bannerGradient: 'from-cyan-600 via-teal-700 to-slate-900',
    avatarUrl: 'https://img.youtube.com/vi/TQ8WlA2GXbk/hqdefault.jpg',
  },
  'Mrs. GREEN APPLE': {
    englishName: 'Mrs. GREEN APPLE',
    genre: 'J-Pop / シンフォニック・ロック',
    monthlyListeners: '1,020万人 / 月',
    bio: '大森元貴・若井滉斗・藤澤涼架による3人組ロックバンド。『ケセラセラ』『ダンスホール』『ライラック』『Soranji』など圧倒的なポップセンスでストリーミングチャートを席巻中。',
    bannerGradient: 'from-emerald-600 via-green-700 to-teal-950',
    avatarUrl: 'https://img.youtube.com/vi/QjrkrVmC-8M/hqdefault.jpg',
  },
  Vaundy: {
    englishName: 'Vaundy',
    genre: 'J-Pop / R&B / インディーロック',
    monthlyListeners: '710万人 / 月',
    bio: '作詞・作曲・編曲のみならず映像監督やデザインも手掛けるマルチアーティスト。『怪獣の花唄』『踊り子』『タイムパラドックス』などジャンルを超越したサウンドを展開。',
    bannerGradient: 'from-purple-600 via-violet-800 to-zinc-950',
    avatarUrl: 'https://img.youtube.com/vi/UM9XNpgrqVk/hqdefault.jpg',
  },
  'Creepy Nuts': {
    englishName: 'R-指定 & DJ松永',
    genre: 'Hip-Hop / J-Rap',
    monthlyListeners: '940万人 / 月',
    bio: '日本三連覇のラッパー「R-指定」と世界一のターンテーブリスト「DJ松永」によるヒップホップユニット。『Bling-Bang-Bang-Born』『オトノケ』『のびしろ』で世界的なバイラルヒットを記録。',
    bannerGradient: 'from-yellow-500 via-amber-700 to-zinc-950',
    avatarUrl: 'https://img.youtube.com/vi/mLW35YMzELE/hqdefault.jpg',
  },
  'Daft Punk': {
    englishName: 'Daft Punk',
    genre: 'French House / Electronic',
    monthlyListeners: '2,150万人 / 月',
    bio: 'フレンチ・ハウスおよびエレクトロニック・ミュージックの歴史を塗り替えた伝説的デュオ。『Discovery』『Random Access Memories』など不朽の名盤を残す。',
    bannerGradient: 'from-cyan-500 via-blue-700 to-indigo-950',
    avatarUrl: 'https://img.youtube.com/vi/FGBhQbmPwH8/hqdefault.jpg',
  },
};

function resolveMvForTrack(track: MonochromeTrack): MusicVideoItem {
  const cleanArtist = cleanPrimaryArtistName(track.artist);
  const titleLower = track.title.toLowerCase();
  const artistLower = cleanArtist.toLowerCase();
  const exact = OFFICIAL_MV_CATALOG.find(
    (m) =>
      m.title.toLowerCase().includes(titleLower) ||
      titleLower.includes(m.title.split(' ')[0].toLowerCase()) ||
      (m.artist.toLowerCase() === artistLower && titleLower.includes(m.title.toLowerCase()))
  );
  if (exact) return exact;
  return {
    id: `mv-track-${track.id}`,
    title: `${track.title} — Official Music Video`,
    artist: cleanArtist,
    album: track.album,
    durationLabel: '3:45',
    viewsLabel: 'Monochrome Official MV',
    year: 2024,
    thumbnailUrl: track.artworkUrl,
  };
}

function resolveInitialNav(tab?: string): AppleMusicNavId {
  if (tab === 'drumpad' || tab === 'tuner') return 'drumpad';
  if (tab === 'mv') return 'mv';
  if (tab === 'artist') return 'artist';
  if (tab === 'lyrics') return 'lyrics';
  if (tab === 'settings') return 'settings';
  if (tab === 'monochrome-web') return 'monochrome-web';
  if (tab === 'synth') return 'synth';
  if (tab === 'proxy') return 'proxy';
  return 'browse';
}

const INITIAL_ENRICHED_CATALOG: MonochromeTrack[] = MONOCHROME_CATALOG.map((t) => ({
  ...t,
  lyrics: enrichLyricsWithWordTiming(t.lyrics, t.duration),
}));

// Upgrade any legacy cached tracks in localStorage so every track plays its own exact full-length stream
function sanitizeStoredTracks(list: MonochromeTrack[]): MonochromeTrack[] {
  return list
    .filter((item) => item && item.title && !item.id.startsWith('track-'))
    .map((item) => {
      const catalogMatch = INITIAL_ENRICHED_CATALOG.find(
        (c) => c.id === item.id || (c.title === item.title && c.artist === item.artist)
      );
      if (catalogMatch) {
        return catalogMatch;
      }
      const needsExactPlayUrl =
        !item.audioUrl ||
        item.audioUrl.includes('itunes.apple.com') ||
        item.audioUrl.includes('mzstatic.com') ||
        item.audioUrl.includes('saavncdn.com') ||
        item.audioUrl.includes('soundhelix.com');
      const exactPlayUrl = `/api/music/play?id=${encodeURIComponent(
        item.monoTrackId || ''
      )}&title=${encodeURIComponent(item.title)}&artist=${encodeURIComponent(item.artist)}`;
      return {
        ...item,
        audioUrl: needsExactPlayUrl ? exactPlayUrl : item.audioUrl,
        isFullLengthStream: true,
        duration: Math.max(95, item.duration || 210),
        lyrics: enrichLyricsWithWordTiming(item.lyrics || [], item.duration || 210),
      };
    });
}

// Apple Music cubic-bezier(0.22, 1, 0.36, 1) spring approximation
function easeAppleMusicSpring(t: number): number {
  return 1 - Math.pow(1 - t, 3.6);
}

const FAVORITES_STORAGE_KEY = 'glassium_apple_music_favorites_v3';
const RECENT_STORAGE_KEY = 'glassium_apple_music_recent_v3';

const POPULAR_ARTIST_SHORTCUTS = [
  'YOASOBI',
  '米津玄師',
  'Ado',
  'Official髭男dism',
  'Mrs. GREEN APPLE',
  'Vaundy',
  'Creepy Nuts',
  'Daft Punk',
];

export function SynthVisualizerApp({ initialTab }: { initialTab?: string } = {}) {
  const { openApp } = useOS();

  const [activeNav, setActiveNav] = useState<AppleMusicNavId>(() => resolveInitialNav(initialTab));
  const [showLyricsDrawer, setShowLyricsDrawer] = useState<boolean>(false);
  const [isArtworkMaximized, setIsArtworkMaximized] = useState<boolean>(false);
  const [selectedArtistName, setSelectedArtistName] = useState<string>('YOASOBI');
  const [liveArtistProfile, setLiveArtistProfile] = useState<ArtistProfileData | null>(null);
  const [isFetchingArtist, setIsFetchingArtist] = useState<boolean>(false);
  const [activeMvItem, setActiveMvItem] = useState<MusicVideoItem>(OFFICIAL_MV_CATALOG[0]);
  const [liveMvCatalog, setLiveMvCatalog] = useState<MusicVideoItem[]>(OFFICIAL_MV_CATALOG);
  const [isFetchingMv, setIsFetchingMv] = useState<boolean>(false);
  const [customMvYoutubeInput, setCustomMvYoutubeInput] = useState<string>('');

  useEffect(() => {
    if (initialTab) setActiveNav(resolveInitialNav(initialTab));
  }, [initialTab]);

  // Proxy Engine, Wisp v1 & Relay Server State
  const [proxyEngine, setProxyEngine] = useState<ProxyEngine>('scramjet');
  const [relayNode, setRelayNode] = useState<ProxyRelayNodeId>('auto');
  const [wispServer, setWispServer] = useState<string>(WISP_SERVER_PRESETS[0].wispUrl);
  const [customWispUrlInput, setCustomWispUrlInput] = useState<string>('');
  const [activeRelayLabel, setActiveRelayLabel] = useState<string>('Wisp v1 + SW (api.monochrome.tf)');
  const [proxyLatency, setProxyLatency] = useState(8);
  const [isBuffering, setIsBuffering] = useState(false);

  // Track Catalog State & Exact Active Track Selection (Never mismatched by index shifts)
  const [tracks, setTracks] = useState<MonochromeTrack[]>(INITIAL_ENRICHED_CATALOG);
  const [currentTrackId, setCurrentTrackId] = useState<string>(INITIAL_ENRICHED_CATALOG[0].id);
  const [activeTrackOverride, setActiveTrackOverride] = useState<MonochromeTrack | null>(null);

  const currentTrack: MonochromeTrack = useMemo(() => {
    const found = tracks.find((t) => t.id === currentTrackId);
    if (found) return found;
    if (activeTrackOverride && activeTrackOverride.id === currentTrackId) {
      return activeTrackOverride;
    }
    return tracks[0] ?? INITIAL_ENRICHED_CATALOG[0];
  }, [tracks, currentTrackId, activeTrackOverride]);

  // Favorites State (Persisted in localStorage)
  const [favoriteTracks, setFavoriteTracks] = useState<MonochromeTrack[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const sanitized = sanitizeStoredTracks(parsed);
          if (sanitized.length > 0) return sanitized;
        }
      }
    } catch {
      // ignore storage read error
    }
    return [INITIAL_ENRICHED_CATALOG[0]];
  });

  // Recently Played State (Persisted in localStorage)
  const [recentTracks, setRecentTracks] = useState<MonochromeTrack[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const sanitized = sanitizeStoredTracks(parsed);
          if (sanitized.length > 0) return sanitized;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ENRICHED_CATALOG.slice(0, 4);
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteTracks));
    } catch {
      // ignore storage write error
    }
  }, [favoriteTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentTracks));
    } catch {
      // ignore
    }
  }, [recentTracks]);

  const isFavorite = useCallback(
    (trackId: string) => favoriteTracks.some((t) => t.id === trackId),
    [favoriteTracks]
  );

  const toggleFavorite = useCallback((track: MonochromeTrack, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      if (exists) {
        return prev.filter((t) => t.id !== track.id);
      }
      return [track, ...prev];
    });
  }, []);

  // High-Precision Playback State (60fps resolution)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [lyricOffsetSec, setLyricOffsetSec] = useState(0);
  const [playbackRate] = useState(1.0);
  const [vocalBoost] = useState(false);
  const [hoverScrubTime, setHoverScrubTime] = useState<number | null>(null);
  const [userScrolledLyrics, setUserScrolledLyrics] = useState(false);

  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string>(
    'Apple Music JP 公式カタログ (歌ってみた・カバー除外) + 320kbps フル尺ストリーム & LRCLIB 同期歌詞'
  );

  // api.monochrome.tf / monochrome.tf Web Proxy State (Wisp + UV/Scramjet SW)
  const [monoWebUrl, setMonoWebUrl] = useState<string>('https://monochrome.tf');
  const [monoWebSwSrc, setMonoWebSwSrc] = useState<string>('');
  const [monoWebSrcDoc, setMonoWebSrcDoc] = useState<string>('');
  const [monoWebLoading, setMonoWebLoading] = useState<boolean>(false);

  // Synth Controls
  const [waveform, setWaveform] = useState<OscillatorType>('sawtooth');
  const [baseFreq, setBaseFreq] = useState(220);
  const [harmonics, setHarmonics] = useState(3);
  const [filterCutoff, setFilterCutoff] = useState(1400);

  // Audio Context & Nodes Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  // Procedural Synth Music Engine & 60fps Sync Refs
  const oscNodesRef = useRef<OscillatorNode[]>([]);
  const musicIntervalRef = useRef<number | null>(null);
  const rafSyncIdRef = useRef<number | null>(null);
  const lastFramePerfRef = useRef<number>(0);
  const scrollAnimRafRef = useRef<number | null>(null);
  const fullPlayheadRef = useRef<number>(0);
  const userScrollTimeoutRef = useRef<number | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<number | null>(null);

  // Interactive Custom Lyric Editor State (LRC / TTML / JSON)
  const [showCustomLyricEditor, setShowCustomLyricEditor] = useState(false);
  const [customLyricInput, setCustomLyricInput] = useState('');

  // Music Settings State (Streaming Quality, Source Site, Download Quality, MV Quality, Dolby Atmos)
  const [musicSettings, setMusicSettings] = useState<MusicSettingsConfig>(() => getMusicSettings());

  const updateMusicSettings = useCallback(
    (patch: Partial<MusicSettingsConfig>) => {
      const updated = saveMusicSettings(patch);
      setMusicSettings(updated);
      if (
        typeof patch.dolbyAtmosEnabled === 'boolean' ||
        patch.dolbyAtmosPreset !== undefined
      ) {
        globalAudio.setDolbyAtmos(updated.dolbyAtmosEnabled, updated.dolbyAtmosPreset);
      }
      return updated;
    },
    []
  );

  const triggerTrackDownload = useCallback(
    (track: MonochromeTrack, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const dlUrl = buildTrackDownloadUrl(track, musicSettings);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `${track.artist} - ${track.title}.${
        musicSettings.downloadQuality === 'flac' ? 'flac' : 'mp3'
      }`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatusBanner(
        `ダウンロード開始 (${musicSettings.downloadQuality.toUpperCase()}): ${track.title} — ${track.artist}`
      );
    },
    [musicSettings]
  );

  // Draggable & Minimizable Player Pill State
  const [isPillMinimized, setIsPillMinimized] = useState<boolean>(false);
  const [pillOffset, setPillOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPill, setIsDraggingPill] = useState<boolean>(false);
  const pillDragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const lyricFetchSeqRef = useRef<number>(0);

  const handlePillPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, a, [data-no-pill-drag="true"]')) {
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDraggingPill(true);
      pillDragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        originX: pillOffset.x,
        originY: pillOffset.y,
      };
    },
    [pillOffset.x, pillOffset.y]
  );

  const handlePillPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!pillDragStartRef.current) return;
    const dx = e.clientX - pillDragStartRef.current.pointerX;
    const dy = e.clientY - pillDragStartRef.current.pointerY;
    const clampedX = Math.max(-460, Math.min(460, pillDragStartRef.current.originX + dx));
    const clampedY = Math.max(-520, Math.min(20, pillDragStartRef.current.originY + dy));
    setPillOffset({ x: clampedX, y: clampedY });
  }, []);

  const handlePillPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!pillDragStartRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    pillDragStartRef.current = null;
    setIsDraggingPill(false);
  }, []);

  useEffect(() => {
    const unsubscribe = globalAudio.subscribe((aState) => {
      setIsPlaying(aState.isPlaying);
      setIsBuffering(aState.isBuffering);
      setCurrentTime(aState.currentTime);
      if (aState.statusMessage) {
        setStatusBanner(aState.statusMessage);
      }
      if (aState.track) {
        setCurrentTrackId(aState.track.id);
        const realDur =
          Number.isFinite(aState.duration) && aState.duration > 35
            ? Math.round(aState.duration)
            : aState.track.duration;
        setActiveTrackOverride((prev) => ({
          ...aState.track!,
          duration: realDur,
          lyrics:
            prev && prev.id === aState.track!.id && prev.lyrics && prev.lyrics.length > aState.track!.lyrics.length
              ? prev.lyrics
              : aState.track!.lyrics,
        }));
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setProxyLatency(Math.floor(10 + Math.random() * 7));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Show all online search results when a search was executed, or filter locally for quick 1-char filter
  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tracks;
    // If tracks already contain live search results for the active query, return them all without hiding script variants
    if (
      lastSearchedQuery &&
      (lastSearchedQuery.toLowerCase() === q ||
        q.includes(lastSearchedQuery.toLowerCase()) ||
        lastSearchedQuery.toLowerCase().includes(q))
    ) {
      return tracks;
    }
    const localMatches = tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
    );
    return localMatches.length > 0 ? localMatches : tracks;
  }, [searchQuery, lastSearchedQuery, tracks]);

  // Effective lyric synchronization time
  const effectiveLyricTime = useMemo(
    () => Math.max(0, currentTime + lyricOffsetSec),
    [currentTime, lyricOffsetSec]
  );

  // Find currently active lyric line based on effectiveLyricTime
  const currentLyricIndex = useMemo(() => {
    if (!currentTrack.lyrics || currentTrack.lyrics.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < currentTrack.lyrics.length; i++) {
      if (effectiveLyricTime >= currentTrack.lyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [effectiveLyricTime, currentTrack.lyrics]);

  // Spring-like cubic-bezier(0.22, 1, 0.36, 1) Smooth Auto-Scroll to center active line
  const scrollToActiveLyric = useCallback(
    (force = false) => {
      if (userScrolledLyrics && !force) return;
      const container = lyricsContainerRef.current;
      const activeEl = document.getElementById(`apple-lyric-line-${currentLyricIndex}`);
      if (!container || !activeEl) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const startTop = container.scrollTop;
      const targetTop = Math.max(
        0,
        startTop +
          (activeRect.top - containerRect.top) -
          containerRect.height * 0.35 +
          activeRect.height * 0.5
      );

      if (Math.abs(targetTop - startTop) < 2) return;

      if (scrollAnimRafRef.current) {
        cancelAnimationFrame(scrollAnimRafRef.current);
      }

      const startTime = performance.now();
      const durationMs = 540;

      const stepScroll = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = easeAppleMusicSpring(t);
        container.scrollTop = startTop + (targetTop - startTop) * eased;
        if (t < 1) {
          scrollAnimRafRef.current = requestAnimationFrame(stepScroll);
        } else {
          scrollAnimRafRef.current = null;
        }
      };

      scrollAnimRafRef.current = requestAnimationFrame(stepScroll);
    },
    [currentLyricIndex, userScrolledLyrics]
  );

  useEffect(() => {
    if (showLyricsDrawer || activeNav === 'lyrics') {
      scrollToActiveLyric(false);
    }
  }, [currentLyricIndex, showLyricsDrawer, activeNav, scrollToActiveLyric]);

  const handleManualLyricsWheel = () => {
    if (scrollAnimRafRef.current) {
      cancelAnimationFrame(scrollAnimRafRef.current);
      scrollAnimRafRef.current = null;
    }
    setUserScrolledLyrics(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = window.setTimeout(() => {
      setUserScrolledLyrics(false);
    }, 3500);
  };

  // -----------------------------------------------------------------------
  // Web Audio Context Setup
  // -----------------------------------------------------------------------
  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    analyserNodeRef.current = analyser;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterCutoff, ctx.currentTime);
    filterNodeRef.current = filter;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
    masterGainRef.current = masterGain;

    filter.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    return ctx;
  }, [filterCutoff, isMuted, volume]);

  // -----------------------------------------------------------------------
  // Procedural Hi-Fi Music Synthesis Engine + HTML5 Audio Stream Engine
  // -----------------------------------------------------------------------
  const stopAllAudio = useCallback(() => {
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
    oscNodesRef.current.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Ignore stop error
      }
    });
    oscNodesRef.current = [];
  }, []);

  // Fetch Strictly Verified Synchronized Lyrics from /api/music/lyrics & LRCLIB
  const loadLyricsForTrack = useCallback(async (track: MonochromeTrack) => {
    const reqSeq = ++lyricFetchSeqRef.current;
    setIsFetchingLyrics(true);
    try {
      const synced = await fetchSynchronizedLyricsFromLrclib(
        track.title,
        track.artist,
        track.duration,
        track.monoTrackId || track.id
      );
      if (reqSeq !== lyricFetchSeqRef.current) return;
      if (synced && synced.length >= 3) {
        setTracks((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, lyrics: synced } : t))
        );
        setFavoriteTracks((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, lyrics: synced } : t))
        );
        setRecentTracks((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, lyrics: synced } : t))
        );
        setActiveTrackOverride((prev) =>
          prev && prev.id === track.id ? { ...prev, lyrics: synced } : prev
        );
        setStatusBanner(
          `厳密一致の同期歌詞を取得完了: ${track.title} — ${track.artist} (${synced.length}行)`
        );
      }
    } catch {
      // keep existing lyrics
    } finally {
      if (reqSeq === lyricFetchSeqRef.current) {
        setIsFetchingLyrics(false);
      }
    }
  }, []);

  // Load full synchronized LRC lyrics for the initial track on mount
  useEffect(() => {
    const initial = INITIAL_ENRICHED_CATALOG[0];
    if (initial) {
      loadLyricsForTrack(initial);
    }
  }, [loadLyricsForTrack]);

  // Sync Wisp Server & Engine with Service Worker
  useEffect(() => {
    ensureServiceWorkerReady().then(() => {
      configureServiceWorkerWisp(wispServer, proxyEngine, relayNode);
    });
  }, [wispServer, proxyEngine, relayNode]);

  // Load Monochrome Web Proxy Tab via Wisp v1 + Service Worker (/scramjet/* or /uv/service/*)
  const loadMonochromeWebProxy = useCallback(
    async (
      targetUrl = monoWebUrl,
      node: ProxyRelayNodeId = relayNode,
      engineOverride: ProxyEngine = proxyEngine
    ) => {
      setMonoWebLoading(true);
      configureServiceWorkerWisp(wispServer, engineOverride, node);
      const swReady = await ensureServiceWorkerReady();

      if (swReady && (node === 'auto' || node === 'wisp-mux' || node === 'sw-tunnel')) {
        const swRoute = getServiceWorkerProxyUrl(targetUrl, engineOverride);
        setMonoWebSrcDoc('');
        setMonoWebSwSrc(swRoute);
        const prefix = engineOverride === 'ultraviolet' ? '/uv/service/' : '/scramjet/';
        setActiveRelayLabel(`Wisp + ${engineOverride.toUpperCase()} SW (${prefix})`);
        setStatusBanner(
          `${targetUrl} を Wisp (${wispServer}) + ${engineOverride.toUpperCase()} Service Worker 経由で接続しました`
        );
        setTimeout(() => setMonoWebLoading(false), 450);
        return;
      }

      setStatusBanner(`Service Worker プロキシで ${targetUrl} を取得中...`);
      try {
        const res = await fetchHtmlViaProxyCascade(targetUrl, node);
        setMonoWebSwSrc('');
        setMonoWebSrcDoc(res.html);
        setActiveRelayLabel(res.usedNode);
        setStatusBanner(`${targetUrl} をプロキシ中継サーバー [${res.usedNode}] 経由で接続しました`);
      } catch {
        setStatusBanner(
          `${targetUrl} の中継に失敗しました。プロキシノードを切り替えて再試行してください`
        );
      } finally {
        setMonoWebLoading(false);
      }
    },
    [monoWebUrl, proxyEngine, relayNode, wispServer]
  );

  useEffect(() => {
    if (activeNav === 'monochrome-web' && !monoWebSwSrc && !monoWebSrcDoc && !monoWebLoading) {
      loadMonochromeWebProxy(monoWebUrl, relayNode, proxyEngine);
    }
  }, [activeNav, loadMonochromeWebProxy, monoWebLoading, monoWebSrcDoc, monoWebSwSrc, monoWebUrl, proxyEngine, relayNode]);

  // -----------------------------------------------------------------------
  // Playback Toggle & Track Changing (Exact Song Full-Length Stream via Global Audio)
  // -----------------------------------------------------------------------
  const startTrackPlayback = useCallback(
    (track: MonochromeTrack, startAtSec = 0) => {
      stopAllAudio();
      initAudioContext();
      fullPlayheadRef.current = startAtSec;
      globalAudio.setVolume(isMuted ? 0 : volume);
      globalAudio.setPlaybackRate(playbackRate);
      globalAudio.playTrack(track, startAtSec);
    },
    [initAudioContext, isMuted, playbackRate, stopAllAudio, volume]
  );

  const playTrack = useCallback(
    (trackToPlay: MonochromeTrack) => {
      const exactPlayUrl =
        trackToPlay.audioUrl &&
        !trackToPlay.audioUrl.includes('saavncdn.com') &&
        !trackToPlay.audioUrl.includes('itunes.apple.com') &&
        !trackToPlay.audioUrl.includes('mzstatic.com')
          ? trackToPlay.audioUrl
          : `/api/music/play?id=${encodeURIComponent(
              trackToPlay.monoTrackId || trackToPlay.id
            )}&title=${encodeURIComponent(trackToPlay.title)}&artist=${encodeURIComponent(
              trackToPlay.artist
            )}`;

      const normalizedTrack: MonochromeTrack = {
        ...trackToPlay,
        audioUrl: exactPlayUrl,
        isFullLengthStream: true,
      };

      setActiveTrackOverride(normalizedTrack);
      setCurrentTrackId(normalizedTrack.id);

      setTracks((prev) => {
        const exists = prev.some((t) => t.id === normalizedTrack.id);
        return exists
          ? prev.map((t) => (t.id === normalizedTrack.id ? normalizedTrack : t))
          : [normalizedTrack, ...prev];
      });
      setRecentTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== normalizedTrack.id);
        return [normalizedTrack, ...filtered].slice(0, 24);
      });

      setLyricOffsetSec(0);
      setUserScrolledLyrics(false);
      fullPlayheadRef.current = 0;

      // Always fetch verified full-length synchronized LRC lyrics for the playing track
      loadLyricsForTrack(normalizedTrack);

      startTrackPlayback(normalizedTrack, 0);
    },
    [loadLyricsForTrack, startTrackPlayback]
  );

  // Search Live Tracks (Fast <400ms via /api/music/search + GDStudio/iTunes JP)
  const handleOnlineMusicSearch = useCallback(
    async (qOverride?: string) => {
      const q = (qOverride ?? searchQuery).trim() || 'YOASOBI';
      setIsSearchingOnline(true);
      setStatusBanner(`"${q}" のフル尺ストリームと同期歌詞を検索中...`);
      try {
        const liveResults = await searchMonochromeLiveTracks(q);
        if (liveResults.length > 0) {
          const enrichedLive = liveResults.map((t) => ({
            ...t,
            lyrics: enrichLyricsWithWordTiming(t.lyrics, t.duration),
          }));
          setLastSearchedQuery(q);
          setTracks(enrichedLive);

          // Only switch selected track if not currently playing another song
          if (!isPlaying) {
            setCurrentTrackId(enrichedLive[0].id);
            setActiveTrackOverride(enrichedLive[0]);
            setCurrentTime(0);
            fullPlayheadRef.current = 0;
            loadLyricsForTrack(enrichedLive[0]);
          }

          if (
            activeNav !== 'songs' &&
            activeNav !== 'browse' &&
            activeNav !== 'listen-now' &&
            activeNav !== 'artist'
          ) {
            setActiveNav('browse');
          }
          setStatusBanner(
            `"${q}" の検索結果: ${enrichedLive.length} 曲 — クリックするとその曲がフル尺再生されます`
          );
        } else {
          setStatusBanner(
            `"${q}" の楽曲が見つかりませんでした。別のアーティスト名や曲名をお試しください`
          );
        }
      } catch {
        setStatusBanner('検索中にエラーが発生しました。もう一度お試しください');
      } finally {
        setIsSearchingOnline(false);
      }
    },
    [activeNav, isPlaying, loadLyricsForTrack, searchQuery]
  );

  // Auto-search with 420ms debounce when typing in the search box
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      if (lastSearchedQuery) {
        setLastSearchedQuery('');
        setTracks(INITIAL_ENRICHED_CATALOG);
      }
      return;
    }
    if (trimmed.length < 2 || trimmed === lastSearchedQuery) return;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = window.setTimeout(() => {
      handleOnlineMusicSearch(trimmed);
    }, 420);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, lastSearchedQuery, handleOnlineMusicSearch]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      globalAudio.pause();
    } else {
      if (currentTrack) {
        if (globalAudio.getState().track?.id === currentTrack.id) {
          globalAudio.resume();
        } else {
          startTrackPlayback(currentTrack, currentTime);
        }
      }
    }
  }, [currentTrack, currentTime, isPlaying, startTrackPlayback]);

  const seekToSeconds = useCallback(
    (targetSec: number) => {
      globalAudio.seek(targetSec);
      setCurrentTime(targetSec);
      setUserScrolledLyrics(false);
    },
    []
  );

  const nextTrack = useCallback(() => {
    const currentIdx = tracks.findIndex((t) => t.id === currentTrack.id);
    let nextIdx = currentIdx >= 0 ? currentIdx + 1 : 0;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * tracks.length);
    } else if (nextIdx >= tracks.length) {
      nextIdx = 0;
    }
    const nextItem = tracks[nextIdx] ?? tracks[0];
    if (nextItem) playTrack(nextItem);
  }, [currentTrack.id, isShuffle, playTrack, tracks]);

  const prevTrack = useCallback(() => {
    if (currentTime > 4) {
      seekToSeconds(0);
      return;
    }
    const currentIdx = tracks.findIndex((t) => t.id === currentTrack.id);
    let prevIdx = currentIdx > 0 ? currentIdx - 1 : tracks.length - 1;
    if (prevIdx < 0) prevIdx = 0;
    const prevItem = tracks[prevIdx] ?? tracks[0];
    if (prevItem) playTrack(prevItem);
  }, [currentTime, currentTrack.id, playTrack, seekToSeconds, tracks]);

  // -----------------------------------------------------------------------
  // Real-Time Artwork Pattern & 4-Quadrant Color Extraction Engine
  // Extracts dominant colors from the 4 quadrants of currentTrack.artworkUrl
  // (with deterministic fallback from coverGradient) to drive moving gradients.
  // -----------------------------------------------------------------------
  const [artworkPalette, setArtworkPalette] = useState<{
    c1: string;
    c2: string;
    c3: string;
    c4: string;
  }>({
    c1: '#fa243c',
    c2: '#8b5cf6',
    c3: '#06b6d4',
    c4: '#f59e0b',
  });

  useEffect(() => {
    let cancelled = false;

    const getFallbackPalette = (grad: string, seedStr: string) => {
      const g = (grad || '').toLowerCase();
      if (g.includes('rose') || g.includes('pink') || g.includes('red')) {
        return { c1: '#ff2d55', c2: '#a855f7', c3: '#ec4899', c4: '#fb7185' };
      }
      if (g.includes('cyan') || g.includes('blue') || g.includes('sky')) {
        return { c1: '#06b6d4', c2: '#3b82f6', c3: '#6366f1', c4: '#2dd4bf' };
      }
      if (g.includes('emerald') || g.includes('teal') || g.includes('green')) {
        return { c1: '#10b981', c2: '#06b6d4', c3: '#3b82f6', c4: '#34d399' };
      }
      if (g.includes('amber') || g.includes('orange') || g.includes('yellow')) {
        return { c1: '#f59e0b', c2: '#ef4444', c3: '#ec4899', c4: '#fbbf24' };
      }
      if (g.includes('violet') || g.includes('purple') || g.includes('indigo') || g.includes('fuchsia')) {
        return { c1: '#8b5cf6', c2: '#ec4899', c3: '#06b6d4', c4: '#d946ef' };
      }
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
      }
      const h1 = hash % 360;
      const h2 = (h1 + 65) % 360;
      const h3 = (h1 + 145) % 360;
      const h4 = (h1 + 225) % 360;
      return {
        c1: `hsl(${h1}, 85%, 56%)`,
        c2: `hsl(${h2}, 82%, 54%)`,
        c3: `hsl(${h3}, 80%, 50%)`,
        c4: `hsl(${h4}, 85%, 58%)`,
      };
    };

    const fallback = getFallbackPalette(
      currentTrack.coverGradient,
      `${currentTrack.title}-${currentTrack.artist}`
    );
    setArtworkPalette(fallback);

    if (!currentTrack.artworkUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const sampleQuadrant = (qx: number, qy: number) => {
          let rSum = 0;
          let gSum = 0;
          let bSum = 0;
          let weightSum = 0;
          const half = size / 2;
          for (let y = qy * half; y < (qy + 1) * half; y++) {
            for (let x = qx * half; x < (qx + 1) * half; x++) {
              const idx = (y * size + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const sat = max === 0 ? 0 : (max - min) / max;
              const lum = (r + g + b) / 3;
              // Prefer vibrant mid-tone pixels from the artwork pattern
              const w = 1 + sat * 4 + (lum > 25 && lum < 235 ? 1.5 : 0.2);
              rSum += r * w;
              gSum += g * w;
              bSum += b * w;
              weightSum += w;
            }
          }
          if (weightSum === 0) return '#fa243c';
          let r = Math.round(rSum / weightSum);
          let g = Math.round(gSum / weightSum);
          let b = Math.round(bSum / weightSum);
          // Boost overly dark colors so the moving gradient remains luminous
          const avg = (r + g + b) / 3;
          if (avg < 65) {
            const boost = 65 / Math.max(1, avg);
            r = Math.min(255, Math.round(r * boost + 24));
            g = Math.min(255, Math.round(g * boost + 18));
            b = Math.min(255, Math.round(b * boost + 30));
          }
          return `rgb(${r}, ${g}, ${b})`;
        };

        const extracted = {
          c1: sampleQuadrant(0, 0),
          c2: sampleQuadrant(1, 0),
          c3: sampleQuadrant(0, 1),
          c4: sampleQuadrant(1, 1),
        };
        if (!cancelled) {
          setArtworkPalette(extracted);
        }
      } catch {
        // Keep deterministic fallback palette if canvas is tainted by CORS
      }
    };
    img.src = currentTrack.artworkUrl;

    return () => {
      cancelled = true;
    };
  }, [currentTrack.artworkUrl, currentTrack.coverGradient, currentTrack.title, currentTrack.artist]);

  // Broadcast Now Playing Dock state to OS Desktop & listen for remote dock commands
  useEffect(() => {
    const activeLyricText =
      currentTrack.lyrics && currentLyricIndex >= 0
        ? currentTrack.lyrics[currentLyricIndex]?.text || ''
        : '';
    window.dispatchEvent(
      new CustomEvent('glassium-music-state', {
        detail: {
          isPlaying,
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          artworkUrl: currentTrack.artworkUrl || '',
          coverGradient: currentTrack.coverGradient,
          currentTime,
          duration: currentTrack.duration,
          lyricLine: activeLyricText,
          palette: artworkPalette,
        },
      })
    );
  }, [isPlaying, currentTrack, currentTime, currentLyricIndex, artworkPalette]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('glassium-music-state', {
          detail: { isPlaying: false },
        })
      );
    };
  }, []);

  useEffect(() => {
    const onMusicCommand = (e: Event) => {
      const detail = (e as CustomEvent<{ action?: string; artist?: string }>).detail;
      const cmd = detail?.action;
      if (cmd === 'toggle-play') {
        togglePlay();
      } else if (cmd === 'next') {
        nextTrack();
      } else if (cmd === 'prev') {
        prevTrack();
      } else if (cmd === 'open-artist' && detail?.artist) {
        const clean = cleanPrimaryArtistName(detail.artist);
        setSelectedArtistName(clean);
        setActiveNav('artist');
      }
    };
    window.addEventListener('glassium-music-command', onMusicCommand);
    return () => window.removeEventListener('glassium-music-command', onMusicCommand);
  }, [togglePlay, nextTrack, prevTrack]);

  // -----------------------------------------------------------------------
  // 60fps High-Precision requestAnimationFrame Lyric & Audio Sync Engine
  // Reads directly from globalAudio.getAudioElement() so currentTime advances smoothly
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying) {
      if (rafSyncIdRef.current !== null) {
        cancelAnimationFrame(rafSyncIdRef.current);
        rafSyncIdRef.current = null;
      }
      return;
    }

    lastFramePerfRef.current = performance.now();

    const syncFrame60fps = (now: number) => {
      const dtSec = Math.max(0, Math.min(0.1, (now - lastFramePerfRef.current) / 1000));
      lastFramePerfRef.current = now;

      const audio = globalAudio.getAudioElement();
      const targetFullDuration = Math.max(60, currentTrack.duration || 210);
      let activeSec = fullPlayheadRef.current;

      // Read directly from GlobalAudioManager's HTML5 <audio> element at 60fps
      if (currentTrack.audioUrl && audio) {
        if (!audio.paused && Number.isFinite(audio.currentTime)) {
          activeSec = audio.currentTime;
          fullPlayheadRef.current = activeSec;
        } else {
          activeSec = globalAudio.getCurrentTime() || fullPlayheadRef.current;
        }
      } else {
        activeSec += dtSec * playbackRate;
        if (activeSec >= targetFullDuration) {
          nextTrack();
          return;
        }
        fullPlayheadRef.current = activeSec;
      }

      // Direct 60fps DOM CSS Variable update for active line's word-by-word karaoke gradient wipe
      const syncTimeWithOffset = Math.max(0, activeSec + lyricOffsetSec);
      const lyrics = currentTrack.lyrics;
      if (lyrics && lyrics.length > 0) {
        let activeIdx = 0;
        for (let i = 0; i < lyrics.length; i++) {
          if (syncTimeWithOffset >= lyrics[i].time) {
            activeIdx = i;
          } else {
            break;
          }
        }
        const activeLine = lyrics[activeIdx];
        if (activeLine && activeLine.words && activeLine.words.length > 0) {
          for (let wIdx = 0; wIdx < activeLine.words.length; wIdx++) {
            const w = activeLine.words[wIdx];
            const wordEl = document.getElementById(`apple-lyric-word-${activeIdx}-${wIdx}`);
            if (wordEl) {
              const span = Math.max(0.06, w.end - w.start);
              const prog = Math.max(0, Math.min(1, (syncTimeWithOffset - w.start) / span));
              const pct = (prog * 100).toFixed(1) + '%';
              const isCurrentWord = prog > 0 && prog < 1;
              const isSungWord = prog >= 1;
              const lift = isCurrentWord
                ? `${(-2.4 * Math.sin(prog * Math.PI)).toFixed(2)}px`
                : isSungWord
                ? '-0.8px'
                : '0px';
              const glow = isCurrentWord ? '12px' : isSungWord ? '4px' : '0px';
              const scale = isCurrentWord ? '1.03' : '1';
              wordEl.style.setProperty('--word-progress', pct);
              wordEl.style.setProperty('--word-lift', lift);
              wordEl.style.setProperty('--word-glow', glow);
              wordEl.style.setProperty('--word-scale', scale);
            }
          }
        }
      }

      if (audio && audio.ended) {
        if (isRepeat) {
          fullPlayheadRef.current = 0;
          setCurrentTime(0);
          globalAudio.seek(0);
          globalAudio.resume();
        } else {
          nextTrack();
          return;
        }
      } else {
        setCurrentTime(activeSec);
      }

      rafSyncIdRef.current = requestAnimationFrame(syncFrame60fps);
    };

    rafSyncIdRef.current = requestAnimationFrame(syncFrame60fps);

    return () => {
      if (rafSyncIdRef.current !== null) {
        cancelAnimationFrame(rafSyncIdRef.current);
        rafSyncIdRef.current = null;
      }
    };
  }, [isPlaying, currentTrack, isRepeat, lyricOffsetSec, nextTrack, playbackRate]);

  // Volume, Mute & PlaybackRate adjustments on GlobalAudioManager
  useEffect(() => {
    const targetGain = isMuted ? 0 : volume;
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(targetGain, audioCtxRef.current.currentTime);
    }
    globalAudio.setVolume(targetGain);
    globalAudio.setPlaybackRate(playbackRate);
  }, [volume, isMuted, playbackRate]);

  // Synth parameter live updates
  useEffect(() => {
    if (filterNodeRef.current && audioCtxRef.current) {
      const targetFreq = vocalBoost ? Math.min(4800, filterCutoff + 1100) : filterCutoff;
      filterNodeRef.current.frequency.setValueAtTime(targetFreq, audioCtxRef.current.currentTime);
    }
  }, [filterCutoff, vocalBoost]);

  // -----------------------------------------------------------------------
  // Visualizer Canvas Loop (for Synth tab)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (activeNav !== 'synth') return;
    let raf = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(128);

    const render = () => {
      const w = (canvas.width = canvas.clientWidth);
      const h = (canvas.height = canvas.clientHeight);
      ctx.clearRect(0, 0, w, h);

      if (analyserNodeRef.current && isPlaying && !currentTrack.audioUrl) {
        analyserNodeRef.current.getByteFrequencyData(dataArray);
      } else if (isPlaying) {
        const t = performance.now() * 0.006;
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.min(
            255,
            Math.floor(
              Math.abs(Math.sin(t + i * 0.19) * Math.cos(t * 0.7 - i * 0.08)) * 185 + 45
            )
          );
        }
      } else {
        const t = performance.now() * 0.0025;
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.floor(Math.sin(t + i * 0.12) * 20 + 26);
        }
      }

      const numBars = 48;
      const barWidth = w / numBars;
      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * 2] / 255;
        const barHeight = val * (h * 0.75);
        const x = i * barWidth;
        const y = h - barHeight;

        const barGrad = ctx.createLinearGradient(0, y, 0, h);
        barGrad.addColorStop(0, '#fa243c');
        barGrad.addColorStop(1, 'rgba(250, 36, 60, 0.08)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(x + 2, y, Math.max(2, barWidth - 4), barHeight);
      }

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, currentTrack.audioUrl, activeNav]);

  useEffect(() => {
    return () => {
      stopAllAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [stopAllAudio]);

  const formatSecs = (sec: number) => {
    const safe = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // -----------------------------------------------------------------------
  // Apple Music Time-Synced Lyrics Panel (60fps + Liquid Glass UI)
  // -----------------------------------------------------------------------
  const renderAppleMusicLyricsPanel = (fullScreenMode = false) => {
    const currentFav = isFavorite(currentTrack.id);
    return (
      <div
        className={`${
          fullScreenMode
            ? 'flex-1'
            : 'w-full lg:w-[420px] xl:w-[460px] border-l border-white/[0.12]'
        } flex flex-col min-h-0 relative overflow-hidden apple-liquid-glass shrink-0`}
      >
        {/* Lyrics Control Header (Liquid Glass Bar) */}
        <div className="px-5 py-3 border-b border-white/[0.1] bg-white/[0.03] backdrop-blur-2xl flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold tracking-tight text-white">
              Time-Synced Lyrics
            </span>
            <span className="text-[10px] text-white/50 font-mono tabular-nums">
              · 60fps rAF · {currentTrack.lyrics.length} lines
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Sync Offset Calibration Controls (-0.2s / 0.0s / +0.2s) */}
            <div className="flex items-center apple-liquid-glass-pill px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded-md">
              <button
                onClick={() => setLyricOffsetSec((o) => Math.round((o - 0.2) * 10) / 10)}
                className="px-1.5 py-0.5 hover:bg-white/15 text-white/75 hover:text-white transition"
                title="歌詞を0.2秒遅らせる"
              >
                -0.2s
              </button>
              <button
                onClick={() => setLyricOffsetSec(0)}
                className={`px-1.5 py-0.5 font-semibold transition ${
                  lyricOffsetSec === 0 ? 'text-white/90' : 'text-[#fa243c]'
                }`}
                title="0.0sにリセット"
              >
                {lyricOffsetSec >= 0 ? `+${lyricOffsetSec.toFixed(1)}s` : `${lyricOffsetSec.toFixed(1)}s`}
              </button>
              <button
                onClick={() => setLyricOffsetSec((o) => Math.round((o + 0.2) * 10) / 10)}
                className="px-1.5 py-0.5 hover:bg-white/15 text-white/75 hover:text-white transition"
                title="歌詞を0.2秒早める"
              >
                +0.2s
              </button>
            </div>

            <button
              onClick={() => {
                setShowCustomLyricEditor((v) => !v);
                if (!customLyricInput) {
                  setCustomLyricInput(JSON.stringify(currentTrack.lyrics.slice(0, 6), null, 2));
                }
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                showCustomLyricEditor
                  ? 'bg-white text-black border-white'
                  : 'apple-liquid-glass-pill text-white/80 hover:text-white'
              }`}
            >
              データ編集
            </button>

            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                currentFav
                  ? 'bg-[#fa243c] text-white border-[#fa243c]'
                  : 'apple-liquid-glass-pill text-white/80 hover:text-white'
              }`}
            >
              {currentFav ? 'お気に入り済' : 'お気に入り'}
            </button>

            <button
              onClick={() => loadLyricsForTrack(currentTrack)}
              disabled={isFetchingLyrics}
              className="px-2.5 py-1 rounded-md apple-liquid-glass-pill text-[11px] text-white/80 hover:text-white transition"
            >
              {isFetchingLyrics ? '同期中...' : '再同期'}
            </button>
          </div>
        </div>

        {/* Custom LRC / TTML / JSON Live Parser & Data Structure Drawer */}
        {showCustomLyricEditor && (
          <div className="p-4 border-b border-white/[0.12] bg-black/65 backdrop-blur-3xl space-y-2.5 z-20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/90">
                歌詞データ入力 (LRC / Enhanced LRC / TTML / JSON 単語タイムスタンプ対応)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setCustomLyricInput(
                      `[00:00.20]<00:00.20>Drifting <00:01.40>beyond <00:02.60>the <00:03.20>event <00:04.30>horizon\n[00:06.10]<00:06.10>Photons <00:07.20>bent <00:08.00>in an <00:08.80>infinite <00:10.10>ring of light\n[00:12.10]<00:12.10>Monochrome <00:13.80>frequencies <00:15.40>cutting <00:16.50>through vacuum`
                    )
                  }
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80"
                >
                  サンプル LRC
                </button>
                <button
                  onClick={() =>
                    setCustomLyricInput(
                      `<tt><body><div>\n  <p begin="00:00.20" end="00:05.80"><span begin="00:00.20" end="00:01.40">Drifting</span> <span begin="00:01.40" end="00:02.60">beyond</span> <span begin="00:02.60" end="00:04.30">the event</span> <span begin="00:04.30" end="00:05.80">horizon</span></p>\n  <p begin="00:06.10" end="00:11.80"><span begin="00:06.10" end="00:08.00">Photons bent</span> <span begin="00:08.00" end="00:11.80">in an infinite ring of light</span></p>\n</div></body></tt>`
                    )
                  }
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80"
                >
                  サンプル TTML
                </button>
                <button
                  onClick={() =>
                    setCustomLyricInput(JSON.stringify(currentTrack.lyrics.slice(0, 5), null, 2))
                  }
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80"
                >
                  現在JSON
                </button>
              </div>
            </div>
            <textarea
              value={customLyricInput}
              onChange={(e) => setCustomLyricInput(e.target.value)}
              rows={5}
              className="w-full rounded-md bg-black/60 border border-white/15 p-2.5 text-[11px] font-mono text-white/90 outline-none focus:border-[#fa243c]"
              placeholder="LRC, TTML, または JSON 形式の歌詞データを入力..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCustomLyricEditor(false)}
                className="px-3 py-1 rounded text-xs text-white/60 hover:text-white"
              >
                閉じる
              </button>
              <button
                onClick={() => {
                  const parsed = parseSyncedLyricsUniversal(customLyricInput, currentTrack.duration);
                  if (parsed.length > 0) {
                    setTracks((prev) =>
                      prev.map((t) => (t.id === currentTrack.id ? { ...t, lyrics: parsed } : t))
                    );
                    setShowCustomLyricEditor(false);
                    setStatusBanner(`カスタム同期歌詞 (${parsed.length}行) を適用しました`);
                  }
                }}
                className="px-3.5 py-1 rounded bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold"
              >
                歌詞を適用
              </button>
            </div>
          </div>
        )}

        {/* Floating Liquid Glass "Return to Auto-Sync" Pill when user scrolls manually */}
        {userScrolledLyrics && (
          <div className="absolute top-16 right-5 z-20">
            <button
              onClick={() => {
                setUserScrolledLyrics(false);
                scrollToActiveLyric(true);
              }}
              className="px-4 py-1.5 rounded-full apple-liquid-glass-pill text-white font-semibold text-xs hover:bg-[#fa243c] transition"
            >
              現在位置へ戻る
            </button>
          </div>
        )}

        {/* Scrolling Apple Music Time-Synced Lyrics Viewport */}
        <div
          ref={lyricsContainerRef}
          onWheel={handleManualLyricsWheel}
          onTouchMove={handleManualLyricsWheel}
          className={`flex-1 overflow-y-auto ${
            fullScreenMode ? 'px-10 sm:px-16 py-16' : 'px-7 py-12'
          } space-y-7 select-none`}
        >
          <div className="h-12" />
          {currentTrack.lyrics.map((line: LyricLine, idx: number) => {
            const isActive = idx === currentLyricIndex;
            const distance = Math.abs(idx - currentLyricIndex);
            const isPassed = idx < currentLyricIndex;

            const lineStart = line.time;
            const lineEnd =
              line.endTime ??
              (idx + 1 < currentTrack.lyrics.length
                ? currentTrack.lyrics[idx + 1].time
                : currentTrack.duration);
            const lineDuration = Math.max(0.4, lineEnd - lineStart);
            const lineProgress = isActive
              ? Math.max(0, Math.min(1, (effectiveLyricTime - lineStart) / lineDuration))
              : isPassed
              ? 1
              : 0;

            const depthStateClass = isActive
              ? 'is-active'
              : distance === 1
              ? 'is-neighbor'
              : 'is-inactive';

            // Apple Music Instrumental Interlude (• • •)
            if (line.isInterlude) {
              if (!isActive && distance > 1) return null;
              return (
                <div
                  key={`interlude-${idx}`}
                  id={`apple-lyric-line-${idx}`}
                  onClick={() => {
                    seekToSeconds(line.time);
                    if (!isPlaying) togglePlay();
                  }}
                  className={`apple-lyric-line ${depthStateClass} cursor-pointer py-3 px-4 rounded-xl`}
                >
                  <div className="flex items-center gap-3">
                    {[0, 1, 2].map((dotIdx) => {
                      const dotThreshold = (dotIdx + 1) / 3.4;
                      const lit = isActive && lineProgress >= dotThreshold - 0.22;
                      return (
                        <span
                          key={dotIdx}
                          className={`inline-block w-3 h-3 rounded-full transition-all duration-300 ${
                            lit
                              ? 'bg-white scale-125 shadow-[0_0_14px_rgba(255,255,255,0.95)]'
                              : 'bg-white/25 scale-95'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            }

            const fallbackWords =
              line.words && line.words.length > 0
                ? line.words
                : line.text
                    .trim()
                    .split(/(\s+)/)
                    .filter(Boolean)
                    .reduce<{ text: string; start: number; end: number }[]>((acc, part, pIdx, arr) => {
                      const step = lineDuration / Math.max(1, arr.length);
                      acc.push({
                        text: part,
                        start: lineStart + pIdx * step,
                        end: lineStart + (pIdx + 1) * step,
                      });
                      return acc;
                    }, []);

            return (
              <div
                key={idx}
                id={`apple-lyric-line-${idx}`}
                onClick={() => {
                  seekToSeconds(line.time);
                  if (!isPlaying) togglePlay();
                }}
                className={`apple-lyric-line ${depthStateClass} group cursor-pointer py-3 px-4 rounded-2xl ${
                  isActive ? 'bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]' : 'hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div
                    className={`font-bold tracking-tight leading-snug ${
                      fullScreenMode
                        ? 'text-2xl sm:text-3xl md:text-4xl'
                        : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {isActive && fallbackWords.length > 0 ? (
                      <span className="inline">
                        {fallbackWords.map((w, wIdx) => {
                          const wSpan = Math.max(0.06, w.end - w.start);
                          const wProg = Math.max(
                            0,
                            Math.min(1, (effectiveLyricTime - w.start) / wSpan)
                          );
                          const pct = `${(wProg * 100).toFixed(1)}%`;
                          const isWordCurrent = wProg > 0 && wProg < 1;
                          const isWordSung = wProg >= 1;
                          const lift = isWordCurrent
                            ? `${(-2.4 * Math.sin(wProg * Math.PI)).toFixed(2)}px`
                            : isWordSung
                            ? '-0.8px'
                            : '0px';

                          return (
                            <span
                              key={wIdx}
                              id={`apple-lyric-word-${idx}-${wIdx}`}
                              className="apple-karaoke-word"
                              style={
                                {
                                  '--word-progress': pct,
                                  '--word-lift': lift,
                                  '--word-glow': isWordCurrent ? '12px' : isWordSung ? '4px' : '0px',
                                  '--word-scale': isWordCurrent ? '1.03' : '1',
                                } as React.CSSProperties
                              }
                            >
                              {w.text}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className={isActive ? 'text-white' : 'text-white/85'}>
                        {line.text}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-mono tabular-nums shrink-0 transition-opacity ${
                      isActive
                        ? 'opacity-75 text-white/75'
                        : 'opacity-0 group-hover:opacity-70 text-white/50'
                    }`}
                  >
                    {formatSecs(line.time)}
                  </span>
                </div>
              </div>
            );
          })}
          <div className="h-44" />
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Open Official MV or Artist Page Helpers (Fetches real Monochrome / Deezer / iTunes data)
  // -----------------------------------------------------------------------
  const fetchLiveMvsForQuery = useCallback(
    async (title: string, artist: string, switchActive = true) => {
      const cleanArtist = cleanPrimaryArtistName(artist);
      const currentSettings = getMusicSettings();
      setIsFetchingMv(true);
      try {
        const resp = await fetch(
          `/api/music/mv?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(cleanArtist)}&q=${encodeURIComponent(`${cleanArtist} ${title}`.trim())}&quality=${encodeURIComponent(currentSettings.mvQuality)}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.mvs) && data.mvs.length > 0) {
            const mapped: MusicVideoItem[] = data.mvs.map((m: Record<string, unknown>, idx: number) => ({
              id: String(m.id || `mv-live-${idx}`),
              videoUrl: m.videoUrl ? String(m.videoUrl) : undefined,
              youtubeId: m.youtubeId ? String(m.youtubeId) : undefined,
              title: String(m.title || title || 'Music Video'),
              artist: String(m.artist || cleanArtist),
              album: String(m.album || ''),
              durationLabel: String(m.durationLabel || '3:45'),
              viewsLabel: String(m.viewsLabel || `Monochrome Official MV (${currentSettings.mvQuality.toUpperCase()})`),
              year: Number(m.year || 2024),
              thumbnailUrl: m.thumbnailUrl ? String(m.thumbnailUrl) : undefined,
            }));
            setLiveMvCatalog((prev) => {
              const existingIds = new Set(mapped.map((x) => x.id));
              return [...mapped, ...prev.filter((p) => !existingIds.has(p.id))].slice(0, 28);
            });
            if (switchActive) {
              setActiveMvItem(mapped[0]);
            }
            return mapped;
          }
        }
      } catch {
        // ignore network error
      } finally {
        setIsFetchingMv(false);
      }
      return [];
    },
    []
  );

  const openTrackMv = useCallback(
    async (track: MonochromeTrack, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (isPlaying) {
        globalAudio.pause();
      }
      const fallbackMv = resolveMvForTrack(track);
      setActiveMvItem(fallbackMv);
      setActiveNav('mv');
      await fetchLiveMvsForQuery(track.title, track.artist, true);
    },
    [fetchLiveMvsForQuery, isPlaying]
  );

  const fetchArtistProfileFromApi = useCallback(async (artistName: string) => {
    const cleanArtist = cleanPrimaryArtistName(artistName);
    setIsFetchingArtist(true);
    try {
      const resp = await fetch(`/api/music/artist?name=${encodeURIComponent(cleanArtist)}`);
      if (resp.ok) {
        const data = await resp.json();
        const apiMvs: MusicVideoItem[] = Array.isArray(data.mvs)
          ? data.mvs.map((m: Record<string, unknown>, idx: number) => ({
              id: String(m.id || `artist-mv-${idx}`),
              videoUrl: m.videoUrl ? String(m.videoUrl) : undefined,
              youtubeId: m.youtubeId ? String(m.youtubeId) : undefined,
              title: String(m.title || `${cleanArtist} MV`),
              artist: String(m.artist || cleanArtist),
              album: String(m.album || ''),
              durationLabel: String(m.durationLabel || '3:30'),
              viewsLabel: String(m.viewsLabel || 'Monochrome Official MV'),
              year: Number(m.year || 2024),
              thumbnailUrl: m.thumbnailUrl ? String(m.thumbnailUrl) : undefined,
            }))
          : [];
        if (apiMvs.length > 0) {
          setLiveMvCatalog((prev) => {
            const ids = new Set(apiMvs.map((x) => x.id));
            return [...apiMvs, ...prev.filter((p) => !ids.has(p.id))].slice(0, 28);
          });
        }
        const presetMeta = ARTIST_METADATA_MAP[cleanArtist];
        setLiveArtistProfile({
          name: String(data.name || cleanArtist),
          englishName: presetMeta?.englishName || `${cleanArtist} Official`,
          genre: String(data.genre || presetMeta?.genre || 'Official Recording Artist'),
          monthlyListeners: String(
            data.monthlyListeners || presetMeta?.monthlyListeners || '840万人 / 月'
          ),
          bio: presetMeta?.bio || String(data.bio || `${cleanArtist} の公式アーティストプロフィール。`),
          bannerGradient:
            presetMeta?.bannerGradient || 'from-rose-600 via-purple-700 to-slate-950',
          avatarUrl: String(
            data.avatarUrl ||
              presetMeta?.avatarUrl ||
              ''
          ),
          bannerUrl: String(data.bannerUrl || data.avatarUrl || ''),
          mvs: apiMvs,
        });
      }
    } catch {
      // ignore error
    } finally {
      setIsFetchingArtist(false);
    }
  }, []);

  const openArtistPage = useCallback(
    (artistName: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const cleanArtist = cleanPrimaryArtistName(artistName);
      setSelectedArtistName(cleanArtist);
      setActiveNav('artist');
      fetchArtistProfileFromApi(cleanArtist);
      handleOnlineMusicSearch(cleanArtist);
    },
    [fetchArtistProfileFromApi, handleOnlineMusicSearch]
  );

  // Fetch initial artist profile when artist tab is opened
  useEffect(() => {
    if (activeNav === 'artist') {
      fetchArtistProfileFromApi(selectedArtistName);
    }
  }, [activeNav, selectedArtistName, fetchArtistProfileFromApi]);

  const activeArtistProfile: ArtistProfileData = useMemo(() => {
    const cleanSelected = cleanPrimaryArtistName(selectedArtistName);
    if (
      liveArtistProfile &&
      liveArtistProfile.name.toLowerCase() === cleanSelected.toLowerCase()
    ) {
      const matchedTrackArt = tracks.find((t) =>
        cleanPrimaryArtistName(t.artist).toLowerCase().includes(cleanSelected.toLowerCase())
      )?.artworkUrl;
      return {
        ...liveArtistProfile,
        avatarUrl:
          liveArtistProfile.avatarUrl ||
          matchedTrackArt ||
          currentTrack.artworkUrl ||
          '',
        mvs:
          liveArtistProfile.mvs.length > 0
            ? liveArtistProfile.mvs
            : OFFICIAL_MV_CATALOG.filter((m) =>
                m.artist.toLowerCase().includes(cleanSelected.toLowerCase())
              ),
      };
    }

    const meta = ARTIST_METADATA_MAP[cleanSelected];
    const matchedTrackArt =
      tracks.find((t) =>
        cleanPrimaryArtistName(t.artist).toLowerCase().includes(cleanSelected.toLowerCase())
      )?.artworkUrl ||
      (cleanPrimaryArtistName(currentTrack.artist).toLowerCase() === cleanSelected.toLowerCase()
        ? currentTrack.artworkUrl
        : '');

    const artistMvs = liveMvCatalog.filter(
      (m) =>
        m.artist.toLowerCase().includes(cleanSelected.toLowerCase()) ||
        cleanSelected.toLowerCase().includes(m.artist.toLowerCase())
    );

    return {
      name: cleanSelected,
      englishName: meta?.englishName || `${cleanSelected} Official`,
      genre: meta?.genre || 'Monochrome Music Official Artist',
      monthlyListeners: meta?.monthlyListeners || '680万人 / 月',
      bio:
        meta?.bio ||
        `${cleanSelected} の公式アーティストページ。Monochrome Music から取得したアーティスト画像、人気楽曲のフル尺ストリーム、および公式ミュージックビデオ (MV) を一覧で楽しめます。`,
      bannerGradient: meta?.bannerGradient || 'from-rose-600 via-purple-700 to-slate-950',
      avatarUrl: meta?.avatarUrl || matchedTrackArt || '',
      mvs: artistMvs,
    };
  }, [selectedArtistName, liveArtistProfile, tracks, currentTrack, liveMvCatalog]);

  // -----------------------------------------------------------------------
  // Apple Music Track Table Renderer (Used in Songs, Favorites, Recent, Browse, Artist)
  // -----------------------------------------------------------------------
  const renderAppleMusicSongTable = (list: MonochromeTrack[], emptyMessage: string) => {
    if (list.length === 0) {
      return (
        <div className="py-16 text-center text-sm text-white/45">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="w-full">
        {/* Table Header */}
        <div className="grid grid-cols-[36px_minmax(160px,2fr)_minmax(105px,1.2fr)_minmax(100px,1fr)_168px_52px] items-center px-4 py-2 border-b border-white/[0.08] text-[11px] font-medium text-white/45">
          <span>#</span>
          <span>曲名</span>
          <span className="hidden sm:block">アーティスト (クリックで詳細)</span>
          <span className="hidden md:block">アルバム</span>
          <span className="text-center">MV / DL / お気に入り</span>
          <span className="text-right">時間</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {list.map((track, idx) => {
            const isCurrent = track.id === currentTrack.id;
            const fav = isFavorite(track.id);
            return (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className={`grid grid-cols-[36px_minmax(160px,2fr)_minmax(105px,1.2fr)_minmax(100px,1fr)_168px_52px] items-center px-4 py-2.5 cursor-pointer transition rounded-lg ${
                  isCurrent ? 'bg-[#fa243c]/18 text-white' : 'hover:bg-white/[0.05]'
                }`}
              >
                {/* Track Number / Play Status */}
                <div className="text-xs font-mono tabular-nums text-white/45 flex items-center">
                  {isCurrent && isPlaying ? (
                    <span className="material-symbols-rounded text-[18px] text-[#fa243c]">
                      pause
                    </span>
                  ) : isCurrent ? (
                    <span className="material-symbols-rounded text-[18px] text-white/80">
                      play_arrow
                    </span>
                  ) : (
                    <span className="w-5 text-center text-white/40 text-[11px]">{idx + 1}</span>
                  )}
                </div>

                {/* Artwork + Song Title */}
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                    {track.artworkUrl ? (
                      <img
                        src={track.artworkUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${track.coverGradient}`}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-semibold truncate ${
                        isCurrent ? 'text-[#fa243c]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => openArtistPage(track.artist, e)}
                      className="text-[11px] text-white/55 hover:text-[#fa243c] hover:underline truncate sm:hidden block text-left"
                    >
                      {cleanPrimaryArtistName(track.artist)}
                    </button>
                  </div>
                </div>

                {/* Clickable Artist Name -> Opens Artist Page */}
                <div className="hidden sm:block truncate pr-3">
                  <button
                    type="button"
                    onClick={(e) => openArtistPage(track.artist, e)}
                    className="text-xs text-white/75 hover:text-[#fa243c] hover:underline truncate transition text-left"
                    title={`${cleanPrimaryArtistName(track.artist)} のアーティストページを開く`}
                  >
                    {cleanPrimaryArtistName(track.artist)}
                  </button>
                </div>

                {/* Album */}
                <div className="hidden md:block text-xs text-white/45 truncate pr-3">
                  {track.album}
                </div>

                {/* MV Button + Download Button + Favorite Registration Button */}
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => openTrackMv(track, e)}
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-[#fa243c] text-white/85 hover:text-white text-[10px] font-semibold transition border border-white/15"
                    title={`${track.title} の公式MVを再生`}
                  >
                    MV
                  </button>
                  <button
                    type="button"
                    onClick={(e) => triggerTrackDownload(track, e)}
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-cyan-500 text-cyan-200 hover:text-black text-[10px] font-semibold transition border border-cyan-400/25"
                    title={`${track.title} を ${musicSettings.downloadQuality.toUpperCase()} 品質でダウンロード`}
                  >
                    DL
                  </button>
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(track, e)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                      fav
                        ? 'bg-[#fa243c] text-white border-[#fa243c]'
                        : 'bg-transparent text-white/45 border-white/15 hover:text-white hover:border-white/40'
                    }`}
                  >
                    {fav ? '登録済' : '追加'}
                  </button>
                </div>

                {/* Full Duration */}
                <div className="text-right text-xs font-mono tabular-nums text-white/50">
                  {formatSecs(track.duration)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const showMaximizedArtworkBg = activeNav === 'lyrics' || isArtworkMaximized;

  return (
    <div className="flex h-full w-full flex-col bg-[#121316] text-white select-none overflow-hidden font-sans relative">
      {/* ===================================================================
          ARTWORK-ADAPTIVE MOVING GRADIENT ENGINE (アートワーク最大化時のみ背景色が変化)
         =================================================================== */}
      {showMaximizedArtworkBg && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-700">
          {/* Layer 1: 4-Quadrant Extracted Color Mesh Gradient Orbs */}
          <div
            className="absolute -top-[18%] -left-[12%] w-[68%] h-[68%] rounded-full blur-[95px] opacity-65 artwork-fluid-orb-1 transition-colors duration-1000"
            style={{
              background: `radial-gradient(circle at center, ${artworkPalette.c1} 0%, ${artworkPalette.c2} 55%, transparent 75%)`,
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          />
          <div
            className="absolute -bottom-[20%] -right-[12%] w-[72%] h-[72%] rounded-full blur-[100px] opacity-60 artwork-fluid-orb-2 transition-colors duration-1000"
            style={{
              background: `radial-gradient(circle at center, ${artworkPalette.c3} 0%, ${artworkPalette.c4} 55%, transparent 75%)`,
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          />
          <div
            className="absolute top-[15%] left-[20%] w-[60%] h-[60%] rounded-full blur-[110px] opacity-50 artwork-fluid-orb-3 mix-blend-screen transition-colors duration-1000"
            style={{
              background: `radial-gradient(circle at center, ${artworkPalette.c2} 0%, ${artworkPalette.c4} 50%, transparent 75%)`,
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          />

          {/* Layer 2: Multi-Layered Counter-Rotating Artwork Pattern Orbs */}
          {currentTrack.artworkUrl ? (
            <>
              <img
                src={currentTrack.artworkUrl}
                alt=""
                className="absolute -top-[15%] -left-[15%] w-[85%] h-[85%] object-cover rounded-full blur-[80px] saturate-[2.2] contrast-125 opacity-45 artwork-fluid-orb-1 transition-all duration-1000"
                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
              />
              <img
                src={currentTrack.artworkUrl}
                alt=""
                className="absolute -bottom-[15%] -right-[15%] w-[85%] h-[85%] object-cover rounded-full blur-[85px] saturate-[2.4] contrast-125 opacity-40 artwork-fluid-orb-2 mix-blend-screen transition-all duration-1000"
                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
              />
            </>
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${currentTrack.coverGradient} opacity-45 blur-3xl artwork-fluid-orb-1 transition-all duration-1000`}
            />
          )}

          {/* Layer 3: GlassiumOS Deep Frosted Diffusion Veil */}
          <div className="absolute inset-0 bg-[#0b0c12]/55 backdrop-blur-[36px]" />
        </div>
      )}

      {/* ===================================================================
          MAXIMIZED ARTWORK OVERLAY MODAL (アートワーク最大化モード)
         =================================================================== */}
      {isArtworkMaximized && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 pb-36 bg-black/35 backdrop-blur-xl animate-fadeIn"
          onClick={() => setIsArtworkMaximized(false)}
        >
          <div
            className="relative max-w-md w-full flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsArtworkMaximized(false)}
              className="self-end px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition flex items-center gap-1"
            >
              <span className="material-symbols-rounded text-sm">close_fullscreen</span>
              <span>元の画面に戻る</span>
            </button>
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border border-white/30 shadow-[0_32px_80px_rgba(0,0,0,0.75)] bg-zinc-900">
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${currentTrack.coverGradient}`} />
              )}
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{currentTrack.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setIsArtworkMaximized(false);
                  openArtistPage(currentTrack.artist);
                }}
                className="text-sm font-semibold text-white/85 hover:text-[#fa243c] hover:underline transition"
              >
                {cleanPrimaryArtistName(currentTrack.artist)}
              </button>
              <p className="text-xs text-white/55">{currentTrack.album}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MAIN APPLE MUSIC WORKSPACE (Left Sidebar + Center Stage + Lyrics)
          Full height with floating bottom Dock so page content scrolls underneath Dock
         =================================================================== */}
      <div className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        {/* -----------------------------------------------------------------
            LEFT APPLE MUSIC LIQUID GLASS SIDEBAR
           ----------------------------------------------------------------- */}
        <aside className="w-56 apple-liquid-glass border-r border-white/[0.12] flex flex-col justify-between p-3 pb-36 shrink-0 overflow-y-auto">
          <div className="space-y-5">
            {/* Search Box (Queries official releases) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleOnlineMusicSearch();
              }}
              className="space-y-1.5"
            >
              <div className="flex items-center bg-white/[0.07] border border-white/15 focus-within:border-[#fa243c] rounded-lg px-2.5 py-1.5">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="楽曲・アーティスト検索..."
                  className="bg-transparent text-white placeholder-white/40 outline-none w-full text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[10px] text-white/45 hover:text-white ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearchingOnline}
                className="w-full py-1.5 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] text-white font-semibold text-xs transition"
              >
                {isSearchingOnline ? '検索中...' : '楽曲検索'}
              </button>
            </form>

            {/* Section 1: Music & MV / Artist (Without top 'いま聴く') */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Monochrome Music
              </div>
              {(
                [
                  { id: 'browse', label: '見つける' },
                  { id: 'mv', label: 'MV (ミュージックビデオ)' },
                  { id: 'artist', label: 'アーティストページ' },
                  { id: 'lyrics', label: 'アートワーク最大化 & 歌詞' },
                ] as { id: AppleMusicNavId; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeNav === item.id
                      ? 'bg-[#fa243c] text-white font-semibold'
                      : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Section 2: Library (Includes Favorites!) */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                ライブラリ
              </div>
              {(
                [
                  { id: 'favorites', label: 'お気に入り', count: favoriteTracks.length },
                  { id: 'songs', label: 'すべての曲', count: tracks.length },
                  { id: 'recent', label: '最近再生した項目', count: recentTracks.length },
                ] as { id: AppleMusicNavId; label: string; count: number }[]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeNav === item.id
                      ? 'bg-[#fa243c] text-white font-semibold'
                      : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      activeNav === item.id ? 'text-white/90' : 'text-white/40'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Section 3: Audio & Quality Settings + Studio */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                設定 &amp; スタジオ
              </div>
              {(
                [
                  { id: 'settings', label: '設定 (音質・DL・MV・Atmos)' },
                  { id: 'monochrome-web', label: 'api.monochrome.tf Web' },
                  { id: 'synth', label: 'シンセサイザー' },
                  { id: 'drumpad', label: 'ドラム & 周波数' },
                  { id: 'proxy', label: 'プロキシ設定' },
                ] as { id: AppleMusicNavId; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeNav === item.id
                      ? 'bg-[#fa243c] text-white font-semibold'
                      : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Endpoint Status & Browser Shortcuts */}
          <div className="pt-3 border-t border-white/[0.08] space-y-2 text-[11px] text-white/45">
            <div className="truncate font-mono text-[10px] text-white/55">
              API: {activeRelayLabel} ({proxyLatency}ms)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  openApp('browser', {
                    payload: { url: 'about:gcs' },
                  })
                }
                className="flex-1 py-1 rounded bg-white/[0.06] hover:bg-white/15 text-white/75 hover:text-white text-[10px] font-medium transition text-center"
              >
                GCS 起動
              </button>
              <button
                onClick={() =>
                  openApp('browser', {
                    payload: { url: 'https://monochrome.tf' },
                  })
                }
                className="flex-1 py-1 rounded bg-white/[0.06] hover:bg-white/15 text-white/75 hover:text-white text-[10px] font-medium transition text-center"
              >
                ブラウザ
              </button>
            </div>
          </div>
        </aside>

        {/* -----------------------------------------------------------------
            CENTER APPLE MUSIC CONTENT STAGE
           ----------------------------------------------------------------- */}
        <main className="flex-1 min-w-0 flex overflow-hidden">
          {/* VIEW 2: MV (OFFICIAL MUSIC VIDEO STAGE - Monochrome / iTunes MV + YouTube MV) */}
          {activeNav === 'mv' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#fa243c]">
                    Monochrome Official Music Video Stage
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    ミュージックビデオ (MV)
                  </h1>
                  <p className="text-xs text-white/55 mt-1">
                    {activeMvItem.title} — {activeMvItem.artist} ({activeMvItem.viewsLabel})
                    {isFetchingMv ? ' · Monochrome MVを取得中...' : ''}
                  </p>
                </div>

                {/* Search Monochrome MVs or Load YouTube ID */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const raw = customMvYoutubeInput.trim();
                    if (!raw) return;
                    const match = raw.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                    const ytId = match ? match[1] : /^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : '';
                    if (ytId) {
                      setActiveMvItem({
                        id: `mv-custom-${ytId}`,
                        youtubeId: ytId,
                        title: `${currentTrack.title} (Custom MV)`,
                        artist: cleanPrimaryArtistName(currentTrack.artist),
                        durationLabel: 'HD',
                        viewsLabel: 'YouTube MV',
                        year: 2025,
                      });
                      setCustomMvYoutubeInput('');
                    } else {
                      await fetchLiveMvsForQuery(raw, '', true);
                      setCustomMvYoutubeInput('');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={customMvYoutubeInput}
                    onChange={(e) => setCustomMvYoutubeInput(e.target.value)}
                    placeholder="曲名・歌手名でMV検索 または YouTube URL..."
                    className="w-64 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/15 text-xs text-white placeholder-white/40 outline-none focus:border-[#fa243c]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold transition"
                  >
                    MV検索
                  </button>
                </form>
              </div>

              {/* Active MV Cinema Player (16:9 Liquid Glass Frame - Native Monochrome Video or YouTube) */}
              <div className="rounded-2xl overflow-hidden apple-liquid-glass border border-white/20 shadow-2xl">
                <div className="aspect-video w-full bg-black relative">
                  {activeMvItem.videoUrl ? (
                    <video
                      key={activeMvItem.videoUrl}
                      src={activeMvItem.videoUrl}
                      poster={activeMvItem.thumbnailUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : activeMvItem.youtubeId ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${activeMvItem.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                      title={activeMvItem.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/60">
                      <span className="material-symbols-rounded text-4xl text-[#fa243c]">
                        smart_display
                      </span>
                      <span className="text-xs">MVストリームを読み込み中...</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-wrap items-center justify-between gap-4 bg-black/40">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {activeMvItem.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-white/65 mt-0.5">
                      <button
                        type="button"
                        onClick={() => openArtistPage(activeMvItem.artist)}
                        className="text-[#fa243c] hover:underline font-semibold"
                      >
                        {cleanPrimaryArtistName(activeMvItem.artist)}
                      </button>
                      <span>· {activeMvItem.year}年</span>
                      <span>· {activeMvItem.viewsLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openArtistPage(activeMvItem.artist)}
                      className="px-3.5 py-1.5 rounded-lg apple-liquid-glass-pill hover:bg-white/20 text-xs font-semibold text-white transition"
                    >
                      {cleanPrimaryArtistName(activeMvItem.artist)} のアーティストページへ
                    </button>
                  </div>
                </div>
              </div>

              {/* All Official MVs Grid */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">
                  ミュージックビデオ一覧 ({liveMvCatalog.length}本)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {liveMvCatalog.map((mv) => {
                    const isCurrentMv = mv.id === activeMvItem.id;
                    const thumb =
                      mv.thumbnailUrl ||
                      (mv.youtubeId
                        ? `https://img.youtube.com/vi/${mv.youtubeId}/hqdefault.jpg`
                        : currentTrack.artworkUrl);
                    return (
                      <div
                        key={mv.id}
                        onClick={() => {
                          setActiveMvItem(mv);
                          if (isPlaying) globalAudio.pause();
                        }}
                        className={`group cursor-pointer rounded-xl overflow-hidden border transition flex flex-col ${
                          isCurrentMv
                            ? 'bg-[#fa243c]/20 border-[#fa243c] shadow-lg'
                            : 'apple-liquid-glass hover:border-white/30'
                        }`}
                      >
                        <div className="aspect-video w-full relative overflow-hidden bg-zinc-900">
                          {thumb && (
                            <img
                              src={thumb}
                              alt={mv.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-[#fa243c] text-white flex items-center justify-center shadow-lg">
                              <span className="material-symbols-rounded text-xl">play_arrow</span>
                            </div>
                          </div>
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                            {mv.durationLabel}
                          </span>
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-bold text-white truncate">{mv.title}</div>
                            <button
                              type="button"
                              onClick={(e) => openArtistPage(mv.artist, e)}
                              className="text-[11px] text-white/60 hover:text-[#fa243c] hover:underline truncate mt-0.5 block text-left"
                            >
                              {cleanPrimaryArtistName(mv.artist)}
                            </button>
                          </div>
                          <div className="text-[10px] text-white/40 mt-1">
                            {mv.year}年 · {mv.viewsLabel}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: ARTIST PAGE (専用アーティストページ - Monochrome / Deezer / iTunes アーティスト画像・MV連携) */}
          {activeNav === 'artist' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-8">
              {/* Artist Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-white/50 mr-1">人気アーティスト:</span>
                  {POPULAR_ARTIST_SHORTCUTS.map((artist) => (
                    <button
                      key={artist}
                      type="button"
                      onClick={() => openArtistPage(artist)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        selectedArtistName === artist
                          ? 'bg-[#fa243c] text-white shadow'
                          : 'bg-white/[0.06] text-white/75 hover:bg-white/[0.14] hover:text-white'
                      }`}
                    >
                      {artist}
                    </button>
                  ))}
                </div>
              </div>

              {/* Artist Hero Banner (Liquid Glass + Real Artist Photo) */}
              <div
                className={`relative rounded-2xl overflow-hidden border border-white/20 bg-gradient-to-br ${activeArtistProfile.bannerGradient} p-6 sm:p-8 shadow-2xl`}
              >
                {activeArtistProfile.bannerUrl && (
                  <img
                    src={activeArtistProfile.bannerUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-25 blur-xl scale-110 pointer-events-none"
                  />
                )}
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl shrink-0 bg-zinc-900 flex items-center justify-center">
                    {activeArtistProfile.avatarUrl ? (
                      <img
                        src={activeArtistProfile.avatarUrl}
                        alt={activeArtistProfile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-rounded text-5xl text-white/40">
                        person
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black/40 backdrop-blur-md text-[11px] font-semibold text-emerald-300 border border-white/15">
                      <span className="material-symbols-rounded text-xs">verified</span>
                      <span>
                        Monochrome 公式アーティスト · {activeArtistProfile.monthlyListeners}
                        {isFetchingArtist ? ' · 同期中...' : ''}
                      </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                      {activeArtistProfile.name}
                    </h1>
                    <p className="text-xs text-white/75 font-mono">
                      {activeArtistProfile.englishName} · {activeArtistProfile.genre}
                    </p>
                    <p className="text-xs sm:text-sm text-white/85 max-w-2xl leading-relaxed">
                      {activeArtistProfile.bio}
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (filteredTracks.length > 0) {
                            playTrack(filteredTracks[0]);
                          }
                        }}
                        className="px-5 py-2 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-bold transition shadow-lg flex items-center gap-1.5"
                      >
                        <span className="material-symbols-rounded text-[18px]">play_arrow</span>
                        <span>人気曲をフル尺再生</span>
                      </button>
                      {activeArtistProfile.mvs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMvItem(activeArtistProfile.mvs[0]);
                            if (isPlaying) globalAudio.pause();
                            setActiveNav('mv');
                          }}
                          className="px-4 py-2 rounded-lg bg-black/50 hover:bg-black/75 border border-white/25 text-white text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <span className="material-symbols-rounded text-[18px]">smart_display</span>
                          <span>公式MVを再生 ({activeArtistProfile.mvs.length}本)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Artist Official MVs Section */}
              {activeArtistProfile.mvs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                      {activeArtistProfile.name} のミュージックビデオ (MV)
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveNav('mv')}
                      className="text-xs text-[#fa243c] hover:underline"
                    >
                      MVステージへ
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {activeArtistProfile.mvs.map((mv) => {
                      const thumb =
                        mv.thumbnailUrl ||
                        (mv.youtubeId
                          ? `https://img.youtube.com/vi/${mv.youtubeId}/hqdefault.jpg`
                          : activeArtistProfile.avatarUrl);
                      return (
                        <div
                          key={mv.id}
                          onClick={() => {
                            setActiveMvItem(mv);
                            if (isPlaying) globalAudio.pause();
                            setActiveNav('mv');
                          }}
                          className="group cursor-pointer rounded-xl overflow-hidden apple-liquid-glass hover:border-[#fa243c]/60 transition flex flex-col"
                        >
                          <div className="aspect-video w-full relative overflow-hidden bg-zinc-900">
                            {thumb && (
                              <img
                                src={thumb}
                                alt={mv.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/15 transition flex items-center justify-center">
                              <div className="w-11 h-11 rounded-full bg-[#fa243c] text-white flex items-center justify-center shadow-lg">
                                <span className="material-symbols-rounded text-2xl">play_arrow</span>
                              </div>
                            </div>
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                              {mv.durationLabel}
                            </span>
                          </div>
                          <div className="p-3">
                            <div className="text-xs font-bold text-white truncate">{mv.title}</div>
                            <div className="text-[11px] text-white/55 mt-0.5">
                              {mv.year}年 · {mv.viewsLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Artist Top Tracks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    {activeArtistProfile.name} の人気楽曲 ({filteredTracks.length}曲)
                  </h2>
                  {isSearchingOnline && (
                    <span className="text-xs text-[#fa243c] font-mono">
                      カタログを取得中...
                    </span>
                  )}
                </div>
                {renderAppleMusicSongTable(
                  filteredTracks,
                  `${activeArtistProfile.name} の楽曲を読み込み中です...`
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: BROWSE (見つける) */}
          {(activeNav === 'browse' || activeNav === 'listen-now') && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    見つける (楽曲・アーティスト・MV)
                  </h1>
                  <p className="text-xs text-white/50 mt-1">{statusBanner}</p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleOnlineMusicSearch();
                  }}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="曲名・アーティスト名を入力..."
                    className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/15 focus:border-[#fa243c] text-xs text-white placeholder-white/40 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingOnline}
                    className="px-4 py-1.5 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold shrink-0 transition"
                  >
                    {isSearchingOnline ? '検索中...' : '検索'}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {POPULAR_ARTIST_SHORTCUTS.map((artist) => (
                  <div
                    key={artist}
                    onClick={() => openArtistPage(artist)}
                    className="p-4 rounded-xl border bg-white/[0.04] hover:bg-[#fa243c]/20 border-white/[0.08] hover:border-[#fa243c] text-left transition cursor-pointer flex flex-col justify-between gap-2"
                  >
                    <div className="text-sm font-bold text-white">{artist}</div>
                    <div className="text-[11px] text-white/55">
                      アーティストページ &amp; MVを開く →
                    </div>
                  </div>
                ))}
              </div>

              {renderAppleMusicSongTable(filteredTracks, '検索結果がありません')}
            </div>
          )}

          {/* VIEW 5: FAVORITES (お気に入り) */}
          {activeNav === 'favorites' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <div className="flex items-end justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    お気に入り
                  </h1>
                  <p className="text-xs text-white/50 mt-1">
                    登録した楽曲 ({favoriteTracks.length}曲) — ブラウザに自動保存されます
                  </p>
                </div>
                {favoriteTracks.length > 0 && (
                  <button
                    onClick={() => playTrack(favoriteTracks[0])}
                    className="px-4 py-1.5 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold transition"
                  >
                    お気に入りを再生
                  </button>
                )}
              </div>

              {renderAppleMusicSongTable(
                favoriteTracks,
                'お気に入りに登録された曲がまだありません。各曲の「追加」ボタンから登録できます。'
              )}
            </div>
          )}

          {/* VIEW 6: ALL SONGS (すべての曲) */}
          {activeNav === 'songs' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    すべての曲 ({filteredTracks.length}曲)
                  </h1>
                  <p className="text-xs text-white/50 mt-1">{statusBanner}</p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleOnlineMusicSearch();
                  }}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="曲名・アーティスト名で検索..."
                    className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/15 focus:border-[#fa243c] text-xs text-white placeholder-white/40 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingOnline}
                    className="px-4 py-1.5 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold shrink-0 transition"
                  >
                    {isSearchingOnline ? '検索中...' : '検索'}
                  </button>
                </form>
              </div>
              {renderAppleMusicSongTable(filteredTracks, '楽曲がありません')}
            </div>
          )}

          {/* VIEW 7: RECENTLY PLAYED (最近再生した項目) */}
          {activeNav === 'recent' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  最近再生した項目
                </h1>
                <p className="text-xs text-white/50 mt-1">再生履歴 ({recentTracks.length}曲)</p>
              </div>
              {renderAppleMusicSongTable(recentTracks, '再生履歴がまだありません')}
            </div>
          )}

          {/* VIEW 8: FULL-SCREEN LYRICS (Apple Music Immersive 2-Column Liquid Glass Stage) */}
          {activeNav === 'lyrics' && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
              {/* Extra Immersive Artwork-Synced Moving Gradient Stage Layer */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div
                  className="absolute -top-[10%] left-[5%] w-[65%] h-[65%] rounded-full blur-[90px] opacity-55 artwork-fluid-orb-1"
                  style={{
                    background: `radial-gradient(circle, ${artworkPalette.c1}, ${artworkPalette.c3}, transparent 72%)`,
                  }}
                />
                <div
                  className="absolute -bottom-[10%] right-[5%] w-[65%] h-[65%] rounded-full blur-[95px] opacity-50 artwork-fluid-orb-2"
                  style={{
                    background: `radial-gradient(circle, ${artworkPalette.c2}, ${artworkPalette.c4}, transparent 72%)`,
                  }}
                />
              </div>

              {/* Left Column: Floating Liquid Glass Artwork, Scrubber & Transport */}
              <div className="relative z-10 w-full lg:w-[380px] xl:w-[430px] p-6 sm:p-8 flex flex-col justify-center items-center apple-liquid-glass border-b lg:border-b-0 lg:border-r border-white/[0.12] shrink-0">
                <div className="w-full max-w-[300px] space-y-6">
                  {/* Dynamic Spring-Scaled Artwork with Moving Aura */}
                  <div className="relative group">
                    <div
                      className="absolute -inset-3 rounded-3xl blur-2xl opacity-75 transition-all duration-700 artwork-dock-underglow"
                      style={{
                        background: `linear-gradient(135deg, ${artworkPalette.c1}, ${artworkPalette.c2}, ${artworkPalette.c3}, ${artworkPalette.c4})`,
                      }}
                    />
                    <div
                      className={`relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/25 transition-all duration-700 ${
                        isPlaying
                          ? 'scale-100 shadow-[0_28px_60px_rgba(0,0,0,0.68)]'
                          : 'scale-[0.92] opacity-80 shadow-[0_12px_30px_rgba(0,0,0,0.45)]'
                      }`}
                    >
                      {currentTrack.artworkUrl ? (
                        <img
                          src={currentTrack.artworkUrl}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${currentTrack.coverGradient}`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Title, Artist & Favorite Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                        {currentTrack.title}
                      </h2>
                      <button
                        type="button"
                        onClick={() => openArtistPage(currentTrack.artist)}
                        className="text-sm text-white/70 hover:text-[#fa243c] hover:underline truncate mt-0.5 block text-left"
                      >
                        {cleanPrimaryArtistName(currentTrack.artist)}
                      </button>
                      <p className="text-[11px] text-white/40 font-mono truncate mt-0.5">
                        {currentTrack.album} · {currentTrack.bitrate}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openTrackMv(currentTrack)}
                        className="px-2.5 py-1 rounded-lg apple-liquid-glass-pill text-xs font-semibold text-white hover:bg-[#fa243c] transition"
                      >
                        MV
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(currentTrack, e)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          isFavorite(currentTrack.id)
                            ? 'bg-[#fa243c] text-white'
                            : 'apple-liquid-glass-pill text-white/80 hover:text-white'
                        }`}
                      >
                        {isFavorite(currentTrack.id) ? '登録済' : 'お気に入り'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Full-Screen 60fps Time-Synced Lyrics Stage */}
              {renderAppleMusicLyricsPanel(true)}
            </div>
          )}

          {/* VIEW 9: API.MONOCHROME.TF WEB PROXY (Wisp v1 + UV/Scramjet Service Worker) */}
          {activeNav === 'monochrome-web' && (
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
              <div className="px-4 py-2 bg-zinc-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-white/60 font-mono text-[11px]">Instance:</span>
                  {MONOCHROME_INSTANCES.map((inst) => (
                    <button
                      key={inst.url}
                      onClick={() => {
                        setMonoWebUrl(inst.url);
                        loadMonochromeWebProxy(inst.url, relayNode, proxyEngine);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                        monoWebUrl === inst.url
                          ? 'bg-[#fa243c] text-white'
                          : 'bg-white/5 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {inst.name}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={wispServer}
                    onChange={(e) => {
                      const nextWisp = e.target.value;
                      setWispServer(nextWisp);
                      configureServiceWorkerWisp(nextWisp, proxyEngine, relayNode);
                      loadMonochromeWebProxy(monoWebUrl, relayNode, proxyEngine);
                    }}
                    className="bg-black border border-white/15 text-emerald-300 text-[11px] px-2 py-1 rounded outline-none font-mono"
                  >
                    {WISP_SERVER_PRESETS.map((w) => (
                      <option key={w.id} value={w.wispUrl} className="bg-zinc-900 text-white">
                        Wisp: {w.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      const nextEngine: ProxyEngine =
                        proxyEngine === 'scramjet' ? 'ultraviolet' : 'scramjet';
                      setProxyEngine(nextEngine);
                      loadMonochromeWebProxy(monoWebUrl, relayNode, nextEngine);
                    }}
                    className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono"
                  >
                    SW: {proxyEngine === 'scramjet' ? 'Scramjet (/scramjet/)' : 'Ultraviolet (/uv/service/)'}
                  </button>

                  <select
                    value={relayNode}
                    onChange={(e) => {
                      const nextNode = e.target.value as ProxyRelayNodeId;
                      setRelayNode(nextNode);
                      loadMonochromeWebProxy(monoWebUrl, nextNode, proxyEngine);
                    }}
                    className="bg-black border border-white/15 text-white text-[11px] px-2 py-1 rounded outline-none"
                  >
                    {PROXY_RELAY_SERVERS.map((srv) => (
                      <option key={srv.id} value={srv.id} className="bg-zinc-900 text-white">
                        Relay: {srv.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => loadMonochromeWebProxy(monoWebUrl, relayNode, proxyEngine)}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px]"
                  >
                    再読込
                  </button>
                </div>
              </div>

              <div className="flex-1 relative bg-white">
                {monoWebLoading && (
                  <div className="absolute inset-0 z-20 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center text-xs text-white font-mono">
                    Wisp ({wispServer}) + {proxyEngine.toUpperCase()} Service Worker 経由で {monoWebUrl} を接続中...
                  </div>
                )}
                {monoWebSwSrc ? (
                  <iframe
                    src={monoWebSwSrc}
                    onLoad={() => setMonoWebLoading(false)}
                    className="w-full h-full border-0 bg-white"
                    title="monochrome-wisp-sw-proxy"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                ) : (
                  <iframe
                    srcDoc={monoWebSrcDoc}
                    onLoad={() => setMonoWebLoading(false)}
                    className="w-full h-full border-0 bg-white"
                    title="monochrome-sw-proxy"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                )}
              </div>
            </div>
          )}

          {/* VIEW 10: SYNTHESIZER */}
          {activeNav === 'synth' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div className="h-64 w-full max-w-lg bg-black/40 p-4 rounded-lg overflow-hidden relative border border-white/10">
                  <canvas ref={canvasRef} className="h-full w-full" />
                </div>

                <div className="mt-6">
                  <button
                    onClick={togglePlay}
                    className="px-6 py-2.5 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] font-semibold text-xs text-white transition"
                  >
                    {isPlaying ? 'Pause Synthesis' : 'Start Synthesis'}
                  </button>
                </div>
              </div>

              <div className="w-72 border-l border-white/10 p-5 flex flex-col justify-between bg-black/30 overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Oscillator Configuration
                  </h3>

                  <div>
                    <label className="text-[11px] text-white/60 mb-1.5 block">Waveform</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 border border-white/10 rounded">
                      {(['sawtooth', 'sine', 'triangle', 'square'] as OscillatorType[]).map(
                        (wf) => (
                          <button
                            key={wf}
                            onClick={() => setWaveform(wf)}
                            className={`py-1 rounded text-xs capitalize font-medium transition ${
                              waveform === wf
                                ? 'bg-[#fa243c] text-white'
                                : 'text-white/60 hover:text-white'
                            }`}
                          >
                            {wf}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">Frequency</span>
                      <span className="font-mono text-white">{baseFreq} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={55}
                      max={660}
                      value={baseFreq}
                      onChange={(e) => setBaseFreq(Number(e.target.value))}
                      className="w-full accent-[#fa243c] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">Harmonics</span>
                      <span className="font-mono text-white">{harmonics}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      value={harmonics}
                      onChange={(e) => setHarmonics(Number(e.target.value))}
                      className="w-full accent-[#fa243c] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">Filter Cutoff</span>
                      <span className="font-mono text-white">{filterCutoff} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={200}
                      max={4000}
                      value={filterCutoff}
                      onChange={(e) => setFilterCutoff(Number(e.target.value))}
                      className="w-full accent-[#fa243c] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 11: DRUMPAD & FREQUENCY */}
          {activeNav === 'drumpad' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <DrumPadTunerView />
            </div>
          )}

          {/* VIEW 12: WISP v1 + ULTRAVIOLET / SCRAMJET SERVICE WORKER PROXY SETTINGS */}
          {activeNav === 'proxy' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-3xl">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Wisp v1 Server &amp; Ultraviolet / Scramjet Service Worker Settings
                </h2>
                <p className="text-xs text-white/55 mt-1">
                  Wisp v1 WebSocket マルチプレクサーと Service Worker (/uv/service/* および /scramjet/*) を使用して api.monochrome.tf のフル尺ストリーム・同期歌詞・Webプレイヤーを中継します。
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-xl apple-liquid-glass">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Wisp v1 Multiplexer Server (wss://)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Active: {wispServer} ({proxyLatency}ms)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {WISP_SERVER_PRESETS.map((w) => {
                    const active = wispServer === w.wispUrl;
                    return (
                      <button
                        key={w.id}
                        onClick={async () => {
                          setWispServer(w.wispUrl);
                          configureServiceWorkerWisp(w.wispUrl, proxyEngine, relayNode);
                          const res = await testWispServerConnection(w.wispUrl);
                          setProxyLatency(res.latencyMs);
                          setActiveRelayLabel(`${w.name} (${res.mode})`);
                          setStatusBanner(`Wisp サーバーを ${w.wispUrl} に切り替えました (${res.latencyMs}ms)`);
                        }}
                        className={`p-3 rounded-lg border text-left transition flex flex-col justify-between gap-1 ${
                          active
                            ? 'bg-[#fa243c]/20 border-[#fa243c] text-white'
                            : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{w.name}</span>
                          <span className="text-[10px] font-mono text-white/50">{w.region}</span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-300 truncate">{w.wispUrl}</div>
                        <div className="text-[11px] text-white/50">{w.description}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customWispUrlInput}
                    onChange={(e) => setCustomWispUrlInput(e.target.value)}
                    placeholder="カスタム Wisp サーバー URL (例: wss://wisp.mercurywork.shop/)"
                    className="flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#fa243c]"
                  />
                  <button
                    onClick={async () => {
                      const clean = customWispUrlInput.trim();
                      if (!clean) return;
                      setWispServer(clean);
                      setCustomWispUrlInput('');
                      configureServiceWorkerWisp(clean, proxyEngine, relayNode);
                      const res = await testWispServerConnection(clean);
                      setProxyLatency(res.latencyMs);
                      setActiveRelayLabel(`Custom Wisp (${clean})`);
                      setStatusBanner(`カスタム Wisp サーバー ${clean} を適用しました (${res.latencyMs}ms)`);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold transition"
                  >
                    Wisp 適用
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl apple-liquid-glass space-y-3">
                <span className="text-xs font-semibold text-white block">
                  Service Worker Proxy Engine (Ultraviolet / Scramjet):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setProxyEngine('scramjet');
                      configureServiceWorkerWisp(wispServer, 'scramjet', relayNode);
                      setStatusBanner('Scramjet v3 Service Worker (/scramjet/*) に切り替えました');
                    }}
                    className={`p-3.5 rounded-lg border text-left transition ${
                      proxyEngine === 'scramjet'
                        ? 'bg-[#fa243c]/20 border-[#fa243c] text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">
                      Scramjet v3 Service Worker (/scramjet/*)
                    </div>
                    <div className="text-[11px] text-white/55 mt-1">
                      Service Worker 内で DOM・fetch・XHR・History API をフックし、Wisp トンネル経由で SPA や音声ストリームを直接ルーティングします。
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setProxyEngine('ultraviolet');
                      configureServiceWorkerWisp(wispServer, 'ultraviolet', relayNode);
                      setStatusBanner('Ultraviolet v3.2 Service Worker (/uv/service/*) に切り替えました');
                    }}
                    className={`p-3.5 rounded-lg border text-left transition ${
                      proxyEngine === 'ultraviolet'
                        ? 'bg-[#fa243c]/20 border-[#fa243c] text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">
                      Ultraviolet v3.2 Service Worker (/uv/service/*)
                    </div>
                    <div className="text-[11px] text-white/55 mt-1">
                      XOR エンコード URL ルーティング (/uv/service/) と $uv クライアントランタイム注入により CORS 制限を回避します。
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 13: COMPREHENSIVE MUSIC & DOLBY ATMOS SETTINGS (音質・取得サイト・DL品質・MV画質・Dolby Atmos) */}
          {activeNav === 'settings' && (
            <div className="flex-1 p-6 sm:p-8 pb-36 overflow-y-auto space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#fa243c]">
                    Monochrome Hi-Fi &amp; Spatial Audio Engine
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    音楽・Dolby Atmos・品質設定
                  </h1>
                  <p className="text-xs text-white/55 mt-1">
                    ストリーミング音質、取得元サイト、楽曲ダウンロード品質、MV画質、および 3D Dolby Atmos 空間オーディオをリアルタイムに変更できます。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => triggerTrackDownload(currentTrack)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg"
                >
                  <span className="material-symbols-rounded text-[18px]">download</span>
                  <span>
                    再生中の曲をダウンロード ({musicSettings.downloadQuality.toUpperCase()})
                  </span>
                </button>
              </div>

              {/* 1. Dolby Atmos 3D Spatial Audio Engine Card */}
              <div className="p-5 rounded-2xl apple-liquid-glass border border-white/15 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-rounded text-cyan-300 text-xl">
                        spatial_audio_off
                      </span>
                      <h2 className="text-base font-bold text-white">
                        Dolby Atmos 3D 空間オーディオ (Web Audio 3D DSP)
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          musicSettings.dolbyAtmosEnabled
                            ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {musicSettings.dolbyAtmosEnabled
                          ? `ACTIVE · ${musicSettings.dolbyAtmosPreset.toUpperCase()}`
                          : 'OFF (STEREO BYPASS)'}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      3D Haas ステレオワイドナー + 立体音響コンボルバーリバーブ + サブベース/プレゼンスダイナミックEQ + マスターコンプレッサーによる空間オーディオ処理。
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !musicSettings.dolbyAtmosEnabled;
                      updateMusicSettings({ dolbyAtmosEnabled: next });
                      setStatusBanner(
                        next
                          ? `Dolby Atmos (${musicSettings.dolbyAtmosPreset.toUpperCase()}) を有効化しました`
                          : 'Dolby Atmos をオフにしました (ステレオ原音出力)'
                      );
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition border ${
                      musicSettings.dolbyAtmosEnabled
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.5)]'
                        : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {musicSettings.dolbyAtmosEnabled ? 'Dolby Atmos: ON' : 'Dolby Atmos: OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {(
                    [
                      {
                        id: 'theater',
                        title: 'Theater 3D Hall (映画館サラウンド)',
                        desc: '広大な3Dホール残響と82Hz重低音ブーストでライブ会場・映画館の臨場感を再現',
                      },
                      {
                        id: 'binaural',
                        title: 'Binaural 360° (ヘッドホン立体定位)',
                        desc: 'イヤフォン・ヘッドホン向けに最適化された360度空間定位とボーカル明瞭化',
                      },
                      {
                        id: 'studio',
                        title: 'Studio Reference (マスタリング原音空間)',
                        desc: 'タイトな初期反射と高精度ダイナミックEQによるスタジオモニター空間',
                      },
                    ] as const
                  ).map((preset) => {
                    const active = musicSettings.dolbyAtmosPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          updateMusicSettings({
                            dolbyAtmosEnabled: true,
                            dolbyAtmosPreset: preset.id,
                          });
                          setStatusBanner(`Dolby Atmos モードを「${preset.title}」に変更しました`);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition ${
                          active && musicSettings.dolbyAtmosEnabled
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                            : 'bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{preset.title}</span>
                          {active && musicSettings.dolbyAtmosEnabled && (
                            <span className="text-[10px] font-mono text-cyan-300">選択中</span>
                          )}
                        </div>
                        <div className="text-[11px] text-white/55 mt-1 leading-relaxed">
                          {preset.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Streaming Audio Quality & Source Site Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Streaming Audio Quality */}
                <div className="p-5 rounded-2xl apple-liquid-glass border border-white/15 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      ストリーミング再生音質 (Streaming Bitrate)
                    </h3>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      フル尺再生時の音声ビットレートを選択します（変更すると即座に次回ストリームから反映されます）。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(
                      [
                        { id: 'lossless', label: 'Lossless FLAC (999kbps)', sub: '最高音質・ハイレゾ相当' },
                        { id: '320', label: '320 kbps Hi-Fi (推奨)', sub: '高音質・高速フル尺再生' },
                        { id: '192', label: '192 kbps High', sub: 'バランス重視・安定通信' },
                        { id: '128', label: '128 kbps Standard', sub: '通信量節約モード' },
                      ] as const
                    ).map((q) => {
                      const active = musicSettings.streamingQuality === q.id;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            updateMusicSettings({ streamingQuality: q.id });
                            setStatusBanner(`ストリーミング再生音質を ${q.label} に変更しました`);
                            if (isPlaying) {
                              startTrackPlayback(currentTrack, currentTime);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition ${
                            active
                              ? 'bg-[#fa243c]/25 border-[#fa243c] text-white'
                              : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="text-xs font-bold">{q.label}</div>
                          <div className="text-[10px] text-white/50 mt-0.5">{q.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Audio Source Site Selection */}
                <div className="p-5 rounded-2xl apple-liquid-glass border border-white/15 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      楽曲・音源を取得するサイト (Source Engine)
                    </h3>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      30秒試聴制限を回避してフル尺音源を取得する優先プロバイダーを指定します。
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        {
                          id: 'auto',
                          label: '自動マルチソース (推奨)',
                          sub: 'GDStudio + JioSaavn 320k + Kuwo を並列検索しフル尺を優先',
                        },
                        {
                          id: 'monochrome',
                          label: 'api.monochrome.tf',
                          sub: 'Monochrome Music 公式ストリームノード',
                        },
                        {
                          id: 'saavn',
                          label: 'JioSaavn 320kbps Full',
                          sub: '全曲100%フル尺 (3〜5分) AAC/MP4 ストリーム',
                        },
                        {
                          id: 'netease',
                          label: 'NetEase Cloud Hi-Res',
                          sub: 'J-Pop / ボカロ / アニソン + 同期歌詞に最適',
                        },
                        {
                          id: 'kuwo',
                          label: 'Kuwo Lossless Engine',
                          sub: '制限楽曲のフル尺代替ストリームに最適',
                        },
                      ] as const
                    ).map((s) => {
                      const active = musicSettings.sourceSite === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            updateMusicSettings({ sourceSite: s.id });
                            setStatusBanner(`音源取得サイトを「${s.label}」に設定しました`);
                            if (isPlaying) {
                              startTrackPlayback(currentTrack, currentTime);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition ${
                            active
                              ? 'bg-[#fa243c]/25 border-[#fa243c] text-white'
                              : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="text-xs font-bold">{s.label}</div>
                          <div className="text-[10px] text-white/50 mt-0.5">{s.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Download Quality & MV Video Quality Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Track Download Quality */}
                <div className="p-5 rounded-2xl apple-liquid-glass border border-white/15 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      曲のダウンロード品質 (Download Format &amp; Bitrate)
                    </h3>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      曲一覧やプレイヤーバーの「DL」ボタンを押した際の保存フォーマットと音質を設定します。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(
                      [
                        { id: 'flac', label: 'FLAC Lossless', sub: '無劣化スタジオ品質 (.flac / .m4a)' },
                        { id: '320', label: '320 kbps Hi-Fi', sub: '最高品質 MP3 / M4A' },
                        { id: '192', label: '192 kbps High', sub: '標準高音質' },
                        { id: '128', label: '128 kbps Compact', sub: '軽量ファイルサイズ' },
                      ] as const
                    ).map((dq) => {
                      const active = musicSettings.downloadQuality === dq.id;
                      return (
                        <button
                          key={dq.id}
                          type="button"
                          onClick={() => {
                            updateMusicSettings({ downloadQuality: dq.id });
                            setStatusBanner(`ダウンロード品質を ${dq.label} に設定しました`);
                          }}
                          className={`p-3 rounded-xl border text-left transition ${
                            active
                              ? 'bg-cyan-500/25 border-cyan-400 text-white'
                              : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="text-xs font-bold">{dq.label}</div>
                          <div className="text-[10px] text-white/50 mt-0.5">{dq.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MV Video Quality */}
                <div className="p-5 rounded-2xl apple-liquid-glass border border-white/15 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      MV (ミュージックビデオ) 画質設定
                    </h3>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      Monochrome / Apple Music Video / YouTube MV ステージの再生解像度を選択します。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(
                      [
                        { id: '2160p', label: '4K UHD (2160p)', sub: '超高精細マスター映像' },
                        { id: '1080p', label: '1080p Full HD (推奨)', sub: '高画質・なめらか再生' },
                        { id: '720p', label: '720p HD', sub: '高速読み込み・省メモリ' },
                        { id: '480p', label: '480p SD', sub: '軽量・低負荷モード' },
                      ] as const
                    ).map((mq) => {
                      const active = musicSettings.mvQuality === mq.id;
                      return (
                        <button
                          key={mq.id}
                          type="button"
                          onClick={() => {
                            updateMusicSettings({ mvQuality: mq.id });
                            setStatusBanner(`MV画質を ${mq.label} に設定しました`);
                          }}
                          className={`p-3 rounded-xl border text-left transition ${
                            active
                              ? 'bg-[#fa243c]/25 border-[#fa243c] text-white'
                              : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="text-xs font-bold">{mq.label}</div>
                          <div className="text-[10px] text-white/50 mt-0.5">{mq.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT-HAND COLLAPSIBLE APPLE MUSIC LIVE LYRICS DRAWER */}
          {showLyricsDrawer && activeNav !== 'lyrics' && renderAppleMusicLyricsPanel(false)}
        </main>
      </div>

      {/* ===================================================================
          DRAGGABLE & MINIMIZABLE LIQUID GLASS PLAYER PILL / DOCK
          (画面内の自由なドラッグ移動＋最小化でコンパクトなミニピルに変形)
         =================================================================== */}
      <div
        className="absolute bottom-2.5 left-3 right-3 z-30 pointer-events-none flex justify-center"
        style={{
          transform: `translate3d(${pillOffset.x}px, ${pillOffset.y}px, 0)`,
          transition: isDraggingPill ? 'none' : 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {isPillMinimized ? (
          /* COMPACT FLOATING MINI-PILL MODE (最小化時のコンパクトミニピル) */
          <div
            onPointerDown={handlePillPointerDown}
            onPointerMove={handlePillPointerMove}
            onPointerUp={handlePillPointerUp}
            onPointerCancel={handlePillPointerUp}
            className="pointer-events-auto relative rounded-2xl liquid-glass-music-dock liquid-glass-window overflow-hidden px-3.5 py-2 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/25 cursor-grab active:cursor-grabbing max-w-md"
            title="ドラッグして移動 / ボタンで操作・展開"
          >
            {/* Moving Artwork Underglow */}
            <div
              className="absolute inset-0 pointer-events-none opacity-55 blur-xl"
              style={{
                background: `linear-gradient(125deg, ${artworkPalette.c1}, ${artworkPalette.c2}, ${artworkPalette.c3})`,
              }}
            />

            <span className="material-symbols-rounded text-sm text-white/50 relative z-10 select-none">
              drag_indicator
            </span>

            <div
              onClick={() => setIsArtworkMaximized((m) => !m)}
              data-no-pill-drag="true"
              className="relative z-10 w-9 h-9 rounded-xl overflow-hidden bg-zinc-900 border border-white/25 shrink-0 cursor-pointer"
              title="アートワークを最大化"
            >
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${currentTrack.coverGradient}`} />
              )}
            </div>

            <div className="relative z-10 min-w-0 max-w-[165px]">
              <div className="text-xs font-bold text-white truncate">{currentTrack.title}</div>
              <button
                type="button"
                data-no-pill-drag="true"
                onClick={() => openArtistPage(currentTrack.artist)}
                className="text-[10px] text-white/75 hover:text-[#fa243c] hover:underline truncate block text-left"
              >
                {cleanPrimaryArtistName(currentTrack.artist)}
              </button>
            </div>

            {musicSettings.dolbyAtmosEnabled && (
              <span className="relative z-10 px-1.5 py-0.5 rounded bg-cyan-500/25 border border-cyan-300/40 text-[9px] font-mono text-cyan-200 shrink-0">
                Atmos
              </span>
            )}

            <div className="relative z-10 flex items-center gap-1" data-no-pill-drag="true">
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-xl bg-white text-zinc-950 flex items-center justify-center hover:scale-105 transition shadow"
                title={isPlaying ? '一時停止' : '再生'}
              >
                <span className="material-symbols-rounded text-[20px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button
                type="button"
                onClick={nextTrack}
                className="w-7 h-7 rounded-lg text-white/85 hover:text-white hover:bg-white/15 flex items-center justify-center transition"
                title="次の曲"
              >
                <span className="material-symbols-rounded text-[18px]">skip_next</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPillMinimized(false)}
                className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition ml-0.5"
                title="フルプレイヤーバーに展開"
              >
                <span className="material-symbols-rounded text-[16px]">open_in_full</span>
              </button>
            </div>
          </div>
        ) : (
          /* FULL LIQUID GLASS DOCK MODE (ドラッグ移動＆最小化対応フルピル) */
          <div
            onPointerDown={handlePillPointerDown}
            onPointerMove={handlePillPointerMove}
            onPointerUp={handlePillPointerUp}
            onPointerCancel={handlePillPointerUp}
            className="pointer-events-auto relative w-full max-w-6xl rounded-2xl liquid-glass-music-dock liquid-glass-window overflow-hidden px-3.5 sm:px-5 py-2.5 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
          >
            {/* Moving Artwork-Pattern Gradient Underglow Inside the Liquid Glass Dock */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-65">
              <div
                className="absolute -inset-8 blur-2xl opacity-55 artwork-dock-underglow transition-all duration-1000"
                style={{
                  background: `linear-gradient(125deg, ${artworkPalette.c1} 0%, ${artworkPalette.c2} 33%, ${artworkPalette.c3} 66%, ${artworkPalette.c4} 100%)`,
                  animationPlayState: isPlaying ? 'running' : 'paused',
                }}
              />
              {currentTrack.artworkUrl && (
                <>
                  <img
                    src={currentTrack.artworkUrl}
                    alt=""
                    className="absolute -top-1/2 -left-1/4 w-[90%] h-[220%] object-cover blur-[42px] saturate-[2.4] opacity-40 artwork-fluid-orb-1"
                    style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                  />
                  <img
                    src={currentTrack.artworkUrl}
                    alt=""
                    className="absolute -bottom-1/2 -right-1/4 w-[90%] h-[220%] object-cover blur-[46px] saturate-[2.4] opacity-35 artwork-fluid-orb-2 mix-blend-screen"
                    style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                  />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/20 to-white/[0.06]" />
            </div>

            {/* Top Drag Handle & Interactive Scrubber Row */}
            <div className="relative z-10 flex items-center gap-2">
              <div
                className="flex items-center gap-1 text-white/45 hover:text-white/80 text-[10px] font-mono pr-1 select-none"
                title="ここをドラッグして再生ピルを自由な位置へ移動"
              >
                <span className="material-symbols-rounded text-[15px]">drag_indicator</span>
              </div>

              <span className="text-[10px] font-mono tabular-nums text-white/75 w-9 text-right">
                {hoverScrubTime !== null ? formatSecs(hoverScrubTime) : formatSecs(currentTime)}
              </span>
              <div
                data-no-pill-drag="true"
                className="flex-1 h-1.5 rounded-full bg-white/15 hover:h-2 cursor-pointer relative overflow-hidden group transition-all"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setHoverScrubTime(pos * currentTrack.duration);
                }}
                onMouseLeave={() => setHoverScrubTime(null)}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seekToSeconds(pos * currentTrack.duration);
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                  style={{
                    width: `${Math.min(100, (currentTime / Math.max(1, currentTrack.duration)) * 100)}%`,
                    background: `linear-gradient(90deg, ${artworkPalette.c1}, ${artworkPalette.c2}, ${artworkPalette.c3})`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono tabular-nums text-white/75 w-9">
                {formatSecs(currentTrack.duration)}
              </span>

              {/* Pill Position Reset & Minimize Controls */}
              <div className="flex items-center gap-1 pl-1" data-no-pill-drag="true">
                {(pillOffset.x !== 0 || pillOffset.y !== 0) && (
                  <button
                    type="button"
                    onClick={() => setPillOffset({ x: 0, y: 0 })}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9px] font-mono text-white/75 hover:text-white transition"
                    title="ピルの位置を中央下部にリセット"
                  >
                    位置戻す
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPillMinimized(true)}
                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center transition"
                  title="コンパクトなミニピルに最小化"
                >
                  <span className="material-symbols-rounded text-[15px]">close_fullscreen</span>
                </button>
              </div>
            </div>

            {/* Main Dock Controls Row */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              {/* Left: Now Playing Artwork + Title + Clickable Artist */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  data-no-pill-drag="true"
                  onClick={() => setIsArtworkMaximized((m) => !m)}
                  className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-white/25 shrink-0 cursor-pointer shadow-[0_8px_20px_rgba(0,0,0,0.5)] hover:scale-105 transition group"
                  title="クリックしてアートワークを最大化 (背景グラデーション連動)"
                >
                  {currentTrack.artworkUrl ? (
                    <img
                      src={currentTrack.artworkUrl}
                      alt={currentTrack.title}
                      className={`w-full h-full object-cover transition-transform duration-700 ${
                        isPlaying ? 'scale-105' : 'scale-100'
                      }`}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${currentTrack.coverGradient}`} />
                  )}
                  {isPlaying && (
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/65 backdrop-blur-md border border-white/20 flex items-end gap-[2px]">
                      <span className="w-[2px] h-2 bg-rose-400 animate-pulse" />
                      <span className="w-[2px] h-3 bg-cyan-300 animate-pulse" />
                      <span className="w-[2px] h-1.5 bg-amber-300 animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      data-no-pill-drag="true"
                      onClick={() => setIsArtworkMaximized((m) => !m)}
                      className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:underline"
                      title="クリックしてアートワークを最大化"
                    >
                      {currentTrack.title}
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[9px] font-mono text-white/80 shrink-0">
                      {musicSettings.streamingQuality === 'lossless'
                        ? 'Lossless FLAC'
                        : `${musicSettings.streamingQuality}kbps Full`}
                    </span>
                    {musicSettings.dolbyAtmosEnabled && (
                      <span className="hidden md:inline-block px-1.5 py-0.5 rounded bg-cyan-500/25 border border-cyan-300/40 text-[9px] font-mono text-cyan-200 shrink-0">
                        Dolby Atmos
                      </span>
                    )}
                    {isBuffering && (
                      <span className="text-[10px] font-mono text-rose-300 animate-pulse shrink-0">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-white/75 truncate mt-0.5">
                    <button
                      type="button"
                      data-no-pill-drag="true"
                      onClick={() => openArtistPage(currentTrack.artist)}
                      className="hover:text-[#fa243c] hover:underline font-bold truncate transition text-white shrink-0"
                      title={`${cleanPrimaryArtistName(currentTrack.artist)} のアーティストページを開く`}
                    >
                      {cleanPrimaryArtistName(currentTrack.artist)}
                    </button>
                    <span className="text-white/40">·</span>
                    <span className="text-white/65 truncate font-medium">
                      {currentTrack.lyrics[currentLyricIndex]?.text
                        ? `♪ ${currentTrack.lyrics[currentLyricIndex]?.text}`
                        : currentTrack.album}
                    </span>
                  </div>
                </div>
              </div>

              {/* Center: Liquid Glass Transport Controls */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" data-no-pill-drag="true">
                <button
                  type="button"
                  onClick={() => setIsShuffle(!isShuffle)}
                  title="シャッフル"
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                    isShuffle
                      ? 'text-white bg-white/20 border border-white/30 shadow-inner'
                      : 'text-white/65 hover:text-white hover:bg-white/[0.1]'
                  }`}
                >
                  <span className="material-symbols-rounded text-[18px]">shuffle</span>
                </button>
                <button
                  type="button"
                  onClick={prevTrack}
                  title="前の曲"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/[0.12] active:scale-95 transition"
                >
                  <span className="material-symbols-rounded text-[22px]">skip_previous</span>
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  title={isPlaying ? '一時停止' : '再生'}
                  className="w-10 h-10 rounded-xl bg-white text-zinc-950 hover:scale-105 active:scale-95 flex items-center justify-center transition shadow-[0_8px_24px_rgba(255,255,255,0.35)]"
                >
                  <span
                    className="material-symbols-rounded text-[24px]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                  >
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={nextTrack}
                  title="次の曲"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/[0.12] active:scale-95 transition"
                >
                  <span className="material-symbols-rounded text-[22px]">skip_next</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRepeat(!isRepeat)}
                  title="リピート"
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                    isRepeat
                      ? 'text-white bg-white/20 border border-white/30 shadow-inner'
                      : 'text-white/65 hover:text-white hover:bg-white/[0.1]'
                  }`}
                >
                  <span className="material-symbols-rounded text-[18px]">repeat</span>
                </button>
              </div>

              {/* Right: Dock Action Buttons (Dolby Atmos, DL, MV, Artist, Lyrics, Settings, Volume) */}
              <div
                className="flex items-center justify-end gap-1.5 flex-1"
                data-no-pill-drag="true"
              >
                <button
                  type="button"
                  onClick={() => {
                    const next = !musicSettings.dolbyAtmosEnabled;
                    updateMusicSettings({ dolbyAtmosEnabled: next });
                    setStatusBanner(
                      next
                        ? `Dolby Atmos (${musicSettings.dolbyAtmosPreset.toUpperCase()}) ON`
                        : 'Dolby Atmos OFF'
                    );
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition hidden md:flex items-center gap-1 whitespace-nowrap border ${
                    musicSettings.dolbyAtmosEnabled
                      ? 'bg-cyan-500/30 border-cyan-300 text-cyan-100 shadow-sm'
                      : 'bg-white/[0.08] border-white/15 text-white/65 hover:text-white'
                  }`}
                  title="Dolby Atmos 3D 空間オーディオ ON/OFF"
                >
                  <span>Atmos</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerTrackDownload(currentTrack)}
                  className="px-2 py-1 rounded-lg bg-white/[0.1] border border-white/15 text-cyan-200 hover:bg-cyan-500 hover:text-slate-950 text-[11px] font-semibold transition hidden sm:inline-block"
                  title={`この曲をダウンロード (${musicSettings.downloadQuality.toUpperCase()})`}
                >
                  DL
                </button>

                <button
                  type="button"
                  onClick={() => openTrackMv(currentTrack)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap border ${
                    activeNav === 'mv'
                      ? 'bg-[#fa243c] border-[#fa243c] text-white shadow-md'
                      : 'bg-white/[0.1] border-white/15 text-white/85 hover:text-white hover:bg-white/20'
                  }`}
                  title="公式ミュージックビデオ (MV) を開く"
                >
                  <span className="material-symbols-rounded text-[15px]">smart_display</span>
                  <span>MV</span>
                </button>

                <button
                  type="button"
                  onClick={() => openArtistPage(currentTrack.artist)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition hidden sm:flex items-center gap-1 whitespace-nowrap border ${
                    activeNav === 'artist'
                      ? 'bg-[#fa243c] border-[#fa243c] text-white shadow-md'
                      : 'bg-white/[0.1] border-white/15 text-white/85 hover:text-white hover:bg-white/20'
                  }`}
                  title="アーティストページを開く"
                >
                  <span className="material-symbols-rounded text-[15px]">person</span>
                  <span>歌手</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLyricsDrawer((s) => !s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap border ${
                    showLyricsDrawer || activeNav === 'lyrics'
                      ? 'bg-[#fa243c] border-[#fa243c] text-white shadow-md'
                      : 'bg-white/[0.1] border-white/15 text-white/85 hover:text-white hover:bg-white/20'
                  }`}
                >
                  歌詞
                </button>

                <button
                  type="button"
                  onClick={() => setActiveNav(activeNav === 'settings' ? 'browse' : 'settings')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition border ${
                    activeNav === 'settings'
                      ? 'bg-[#fa243c] border-[#fa243c] text-white shadow-md'
                      : 'bg-white/[0.1] border-white/15 text-white/85 hover:text-white hover:bg-white/20'
                  }`}
                  title="音質・取得サイト・DL品質・MV画質・Dolby Atmos 設定"
                >
                  設定
                </button>

                <div className="hidden xl:flex items-center gap-1.5 pl-1">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/[0.12] transition"
                    title={isMuted ? 'ミュート解除' : 'ミュート'}
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
                    </span>
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      if (isMuted) setIsMuted(false);
                    }}
                    className="w-16 accent-[#fa243c] cursor-pointer h-1 bg-white/25"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
