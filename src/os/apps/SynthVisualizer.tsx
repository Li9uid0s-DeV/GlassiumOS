import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { globalAudio, SpatialAudioDetails } from '../globalAudioManager';
import { backendFetch } from '../backendConfig';
import { DrumPadTunerView } from './ExtraAppsSuite';
import { MusicEqualizerPanel } from './MusicEqualizerPanel';
import {
  translateLyricsBatchViaServer,
  getLyricTranslation,
} from '../karaokeGuide';

type MusicNavId =
  | 'home'
  | 'browse'
  | 'collection-detail'
  | 'playlists'
  | 'mv'
  | 'artist'
  | 'favorites'
  | 'songs'
  | 'recent'
  | 'lyrics'
  | 'eq'
  | 'settings'
  | 'monochrome-web'
  | 'synth'
  | 'drumpad'
  | 'proxy';

export type CollectionKind = 'PLAYLIST' | 'ALBUM' | 'EP' | 'SINGLE';

export interface MusicCollectionViewData {
  id: string;
  kind: CollectionKind;
  title: string;
  subtitle: string;
  creator: string;
  year: number;
  artworkUrl: string;
  coverGradient: string;
  sourceService?: string;
  tracks: MonochromeTrack[];
}

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

export interface ArtistAlbumItem {
  id: string;
  collectionId: string;
  title: string;
  artist: string;
  artworkUrl: string;
  year: number;
  trackCount: number;
  genre: string;
}

export interface ArtistSingleItem {
  id: string;
  collectionId: string;
  title: string;
  cleanTitle: string;
  artist: string;
  artworkUrl: string;
  year: number;
  trackCount: number;
  audioUrl: string;
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
  topTracks?: MonochromeTrack[];
  albums?: ArtistAlbumItem[];
  singles?: ArtistSingleItem[];
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

const CLIENT_ARTIST_ALIASES: Record<string, string[]> = {
  yoasobi: ['yoasobi', 'ヨアソビ'],
  vaundy: ['vaundy', 'バウンディ'],
  '米津玄師': ['米津玄師', 'kenshiyonezu', 'yonezukenshi'],
  kenshiyonezu: ['米津玄師', 'kenshiyonezu', 'yonezukenshi'],
  'official髭男dism': ['official髭男dism', 'officialhigedandism'],
  officialhigedandism: ['official髭男dism', 'officialhigedandism'],
  ado: ['ado', 'アド'],
  mrsgreenapple: ['mrsgreenapple', 'ミセスグリーンアップル'],
  creepynuts: ['creepynuts', 'クリーピーナッツ'],
  tuki: ['tuki', 'ツキ'],
  dualipa: ['dualipa', 'デュアリパ'],
  daftpunk: ['daftpunk', 'ダフトパンク'],
};

function normArtistCompare(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s\-_()（）【】「」『』〜~・.,!?'"]/g, '');
}

function isSameArtistClient(candidateArtist: string, targetArtist: string): boolean {
  if (!candidateArtist || !targetArtist) return false;
  if (/cover|tribute|karaoke|歌ってみた|翻唱|オルゴール/i.test(candidateArtist)) return false;
  const targetClean = normArtistCompare(cleanPrimaryArtistName(targetArtist));
  const allowed = new Set<string>([
    targetClean,
    ...(CLIENT_ARTIST_ALIASES[targetClean] || []).map(normArtistCompare),
  ]);
  const candClean = normArtistCompare(cleanPrimaryArtistName(candidateArtist));
  if (allowed.has(candClean)) return true;
  const parts = candidateArtist
    .split(/[,、/&×()]/)
    .map(normArtistCompare)
    .filter(Boolean);
  return parts.some((p) => allowed.has(p));
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
    title: '勇者 (The Brave)',
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
    id: 'mv-kinggnu-specialz',
    youtubeId: 'fhzKLBZJC3w',
    title: 'SPECIALZ',
    artist: 'King Gnu',
    album: 'THE GREATEST UNKNOWN',
    durationLabel: '3:58',
    viewsLabel: '1.4億回視聴',
    year: 2023,
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

const ARTIST_METADATA_MAP: Record<string, Omit<ArtistProfileData, 'name' | 'mvs'>> = {
  YOASOBI: {
    englishName: 'Ayase & ikura',
    genre: 'J-Pop',
    monthlyListeners: '1,180万人 / 月',
    bio: 'コンポーザーのAyaseとボーカルのikuraによる音楽ユニット。『夜に駆ける』『アイドル』『勇者』などを発表。',
    bannerGradient: 'from-rose-600 via-fuchsia-600 to-indigo-900',
    avatarUrl: 'https://img.youtube.com/vi/ZRtdQ81jPUQ/hqdefault.jpg',
  },
  米津玄師: {
    englishName: 'Kenshi Yonezu',
    genre: 'J-Pop / Rock',
    monthlyListeners: '960万人 / 月',
    bio: 'シンガーソングライター。『Lemon』『KICK BACK』『地球儀』『さよーならまたいつか！』などを発表。',
    bannerGradient: 'from-amber-600 via-orange-700 to-zinc-900',
    avatarUrl: 'https://img.youtube.com/vi/M2cckDmNLMI/hqdefault.jpg',
  },
  Ado: {
    englishName: 'Ado',
    genre: 'J-Pop / Vocal',
    monthlyListeners: '890万人 / 月',
    bio: 'シンガー。『うっせぇわ』『新時代』『唱』などを発表。',
    bannerGradient: 'from-blue-700 via-indigo-800 to-slate-950',
    avatarUrl: 'https://img.youtube.com/vi/pgXpM4l_MwI/hqdefault.jpg',
  },
  Official髭男dism: {
    englishName: 'Official HIGE DANdism',
    genre: 'J-Pop / Band',
    monthlyListeners: '780万人 / 月',
    bio: '4人組ピアノポップバンド。『Pretender』『Subtitle』『ミックスナッツ』などを発表。',
    bannerGradient: 'from-cyan-600 via-teal-700 to-slate-900',
    avatarUrl: 'https://img.youtube.com/vi/TQ8WlA2GXbk/hqdefault.jpg',
  },
  'Mrs. GREEN APPLE': {
    englishName: 'Mrs. GREEN APPLE',
    genre: 'J-Pop / Rock',
    monthlyListeners: '1,020万人 / 月',
    bio: '3人組ロックバンド。『ケセラセラ』『ダンスホール』『ライラック』などを発表。',
    bannerGradient: 'from-emerald-600 via-green-700 to-teal-950',
    avatarUrl: 'https://img.youtube.com/vi/QjrkrVmC-8M/hqdefault.jpg',
  },
  Vaundy: {
    englishName: 'Vaundy',
    genre: 'J-Pop / R&B / Rock',
    monthlyListeners: '710万人 / 月',
    bio: 'マルチアーティスト。『怪獣の花唄』『踊り子』『タイムパラドックス』などを発表。',
    bannerGradient: 'from-purple-600 via-violet-800 to-zinc-950',
    avatarUrl: 'https://img.youtube.com/vi/UM9XNpgrqVk/hqdefault.jpg',
  },
  'Creepy Nuts': {
    englishName: 'R-指定 & DJ松永',
    genre: 'Hip-Hop',
    monthlyListeners: '940万人 / 月',
    bio: 'ラッパー「R-指定」とDJ「DJ松永」によるヒップホップユニット。『Bling-Bang-Bang-Born』『オトノケ』などを発表。',
    bannerGradient: 'from-yellow-500 via-amber-700 to-zinc-950',
    avatarUrl: 'https://img.youtube.com/vi/mLW35YMzELE/hqdefault.jpg',
  },
  'Daft Punk': {
    englishName: 'Daft Punk',
    genre: 'Electronic / House',
    monthlyListeners: '2,150万人 / 月',
    bio: 'エレクトロニック・ミュージック・デュオ。『Discovery』『Random Access Memories』などを発表。',
    bannerGradient: 'from-cyan-500 via-blue-700 to-indigo-950',
    avatarUrl: 'https://img.youtube.com/vi/FGBhQbmPwH8/hqdefault.jpg',
  },
};

const SPOTIFY_SEARCH_CATEGORIES = [
  {
    id: 'jpop',
    title: 'J-Pop',
    query: 'YOASOBI 米津玄師 Mrs. GREEN APPLE',
    gradient: 'from-rose-600 to-pink-800',
    coverUrl: 'https://img.youtube.com/vi/ZRtdQ81jPUQ/hqdefault.jpg',
  },
  {
    id: 'anime',
    title: 'アニメ & ゲーム',
    query: 'アニメ 主題歌 LiSA YOASOBI',
    gradient: 'from-violet-600 to-indigo-900',
    coverUrl: 'https://img.youtube.com/vi/OIBODIPC_8Y/hqdefault.jpg',
  },
  {
    id: 'vocaloid',
    title: 'ボカロ / Vocaloid',
    query: '初音ミク DECO*27 ピノキオピー',
    gradient: 'from-cyan-500 to-teal-800',
    coverUrl: 'https://img.youtube.com/vi/pgXpM4l_MwI/hqdefault.jpg',
  },
  {
    id: 'rock',
    title: 'ロック & バンド',
    query: 'King Gnu Official髭男dism Vaundy',
    gradient: 'from-amber-600 to-red-800',
    coverUrl: 'https://img.youtube.com/vi/TQ8WlA2GXbk/hqdefault.jpg',
  },
  {
    id: 'electronic',
    title: 'ダンス & EDM',
    query: 'Daft Punk Avicii Alan Walker',
    gradient: 'from-blue-600 to-indigo-950',
    coverUrl: 'https://img.youtube.com/vi/FGBhQbmPwH8/hqdefault.jpg',
  },
  {
    id: 'hiphop',
    title: 'ヒップホップ',
    query: 'Creepy Nuts Bling-Bang-Bang-Born',
    gradient: 'from-orange-500 to-amber-900',
    coverUrl: 'https://img.youtube.com/vi/mLW35YMzELE/hqdefault.jpg',
  },
  {
    id: 'chill',
    title: 'Lo-Fi & チル',
    query: 'Nujabes Lo-Fi Chillhop',
    gradient: 'from-emerald-600 to-teal-900',
    coverUrl: 'https://img.youtube.com/vi/UM9XNpgrqVk/hqdefault.jpg',
  },
  {
    id: 'kpop',
    title: 'K-Pop',
    query: 'NewJeans ILLIT LE SSERAFIM',
    gradient: 'from-fuchsia-600 to-purple-900',
    coverUrl: 'https://img.youtube.com/vi/QjrkrVmC-8M/hqdefault.jpg',
  },
  {
    id: 'citypop',
    title: 'シティポップ',
    query: '藤井 風 竹内まりや シティポップ',
    gradient: 'from-sky-600 to-slate-900',
    coverUrl: 'https://img.youtube.com/vi/SX_ViT4Ra7k/hqdefault.jpg',
  },
  {
    id: 'classical',
    title: 'ピアノ & 室内楽',
    query: '久石譲 坂本龍一 Piano',
    gradient: 'from-stone-600 to-zinc-900',
    coverUrl: 'https://img.youtube.com/vi/by4SYYWlhEs/hqdefault.jpg',
  },
];

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
    title: `${track.title} — Music Video`,
    artist: cleanArtist,
    album: track.album,
    durationLabel: '3:45',
    viewsLabel: 'Music Video',
    year: 2024,
    thumbnailUrl: track.artworkUrl,
  };
}

function resolveInitialNav(tab?: string): MusicNavId {
  if (tab === 'drumpad' || tab === 'tuner') return 'drumpad';
  if (tab === 'eq' || tab === 'equalizer' || tab === 'aieq') return 'eq';
  if (tab === 'mv') return 'mv';
  if (tab === 'artist') return 'artist';
  if (tab === 'lyrics') return 'lyrics';
  if (tab === 'settings') return 'settings';
  if (tab === 'monochrome-web') return 'monochrome-web';
  if (tab === 'synth') return 'synth';
  if (tab === 'proxy') return 'proxy';
  if (tab === 'browse' || tab === 'search') return 'browse';
  return 'home';
}

const INITIAL_ENRICHED_CATALOG: MonochromeTrack[] = MONOCHROME_CATALOG.map((t) => ({
  ...t,
  lyrics: enrichLyricsWithWordTiming(t.lyrics, t.duration),
}));

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

function easeAppleMusicSpring(t: number): number {
  return 1 - Math.pow(1 - t, 3.6);
}

const FAVORITES_STORAGE_KEY = 'glassium_apple_music_favorites_v3';
const RECENT_STORAGE_KEY = 'glassium_apple_music_recent_v3';
const CUSTOM_PLAYLISTS_STORAGE_KEY = 'glassium_music_playlists_u4';

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

const BUILTIN_COLLECTIONS: MusicCollectionViewData[] = [
  {
    id: 'pl-jpop-hits',
    kind: 'PLAYLIST',
    title: 'Tokyo Top Hits',
    subtitle: '日本のストリーミングチャート上位曲を集めたプレイリスト',
    creator: 'Glassium Music',
    year: 2025,
    artworkUrl: INITIAL_ENRICHED_CATALOG[0]?.artworkUrl || 'https://img.youtube.com/vi/ZRtdQ81jPUQ/hqdefault.jpg',
    coverGradient: 'from-rose-600 via-fuchsia-800 to-slate-950',
    sourceService: 'GlassiumOS',
    tracks: INITIAL_ENRICHED_CATALOG.slice(0, 6),
  },
  {
    id: 'pl-night-drive',
    kind: 'PLAYLIST',
    title: 'Midnight Liquid Drive',
    subtitle: '夜のドライブや作業に合うエレクトロ・J-Popミックス',
    creator: 'Glassium Music',
    year: 2025,
    artworkUrl: INITIAL_ENRICHED_CATALOG[1]?.artworkUrl || 'https://img.youtube.com/vi/by4SYYWlhEs/hqdefault.jpg',
    coverGradient: 'from-cyan-600 via-indigo-900 to-slate-950',
    sourceService: 'GlassiumOS',
    tracks: INITIAL_ENRICHED_CATALOG.slice(1, 7),
  },
  {
    id: 'alb-the-book-3',
    kind: 'ALBUM',
    title: 'THE BOOK 3',
    subtitle: 'YOASOBI · アルバム',
    creator: 'YOASOBI',
    year: 2023,
    artworkUrl: INITIAL_ENRICHED_CATALOG[0]?.artworkUrl || 'https://img.youtube.com/vi/ZRtdQ81jPUQ/hqdefault.jpg',
    coverGradient: 'from-pink-600 via-rose-900 to-zinc-950',
    tracks: INITIAL_ENRICHED_CATALOG.filter((t) => t.artist.includes('YOASOBI')),
  },
  {
    id: 'ep-lost-corner',
    kind: 'EP',
    title: 'LOST CORNER Sessions',
    subtitle: '米津玄師 · EP',
    creator: '米津玄師',
    year: 2024,
    artworkUrl: 'https://img.youtube.com/vi/M2cckDmNLMI/hqdefault.jpg',
    coverGradient: 'from-amber-600 via-orange-900 to-zinc-950',
    tracks: INITIAL_ENRICHED_CATALOG.filter((t) => t.artist.includes('米津玄師') || t.title.includes('Lemon')),
  },
  {
    id: 'single-bling',
    kind: 'SINGLE',
    title: 'Bling-Bang-Bang-Born',
    subtitle: 'Creepy Nuts · シングル',
    creator: 'Creepy Nuts',
    year: 2024,
    artworkUrl: 'https://img.youtube.com/vi/mLW35YMzELE/hqdefault.jpg',
    coverGradient: 'from-yellow-500 via-amber-800 to-zinc-950',
    tracks: INITIAL_ENRICHED_CATALOG.filter((t) => t.artist.includes('Creepy') || t.title.includes('Bling')),
  },
  {
    id: 'alb-discovery',
    kind: 'ALBUM',
    title: 'Discovery',
    subtitle: 'Daft Punk · アルバム',
    creator: 'Daft Punk',
    year: 2001,
    artworkUrl: 'https://img.youtube.com/vi/FGBhQbmPwH8/hqdefault.jpg',
    coverGradient: 'from-blue-600 via-indigo-900 to-black',
    tracks: INITIAL_ENRICHED_CATALOG.slice(-4),
  },
];

export function SynthVisualizerApp({ initialTab }: { initialTab?: string } = {}) {
  const { resolvedAccentHex } = useOS();

  const [activeNav, setActiveNav] = useState<MusicNavId>(() => resolveInitialNav(initialTab));
  const [previousNav, setPreviousNav] = useState<MusicNavId>('home');
  const [homeFilterChip, setHomeFilterChip] = useState<'all' | 'music' | 'playlists' | 'albums'>('all');
  const [showLyricsDrawer, setShowLyricsDrawer] = useState<boolean>(false);
  const [isArtworkMaximized, setIsArtworkMaximized] = useState<boolean>(false);
  const [selectedArtistName, setSelectedArtistName] = useState<string>('YOASOBI');
  const [liveArtistProfile, setLiveArtistProfile] = useState<ArtistProfileData | null>(null);
  const [isFetchingArtist, setIsFetchingArtist] = useState<boolean>(false);
  const [activeMvItem, setActiveMvItem] = useState<MusicVideoItem>(OFFICIAL_MV_CATALOG[0]);
  const [liveMvCatalog, setLiveMvCatalog] = useState<MusicVideoItem[]>(OFFICIAL_MV_CATALOG);
  const [isFetchingMv, setIsFetchingMv] = useState<boolean>(false);
  const [customMvYoutubeInput, setCustomMvYoutubeInput] = useState<string>('');

  // Collection Detail State (2nd Image Layout for Playlists / Albums / EPs / Singles)
  const [selectedCollection, setSelectedCollection] = useState<MusicCollectionViewData>(
    BUILTIN_COLLECTIONS[0]
  );

  // User Imported / Custom Playlists State
  const [userPlaylists, setUserPlaylists] = useState<MusicCollectionViewData[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PLAYLISTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PLAYLISTS_STORAGE_KEY, JSON.stringify(userPlaylists));
    } catch {
      // ignore
    }
  }, [userPlaylists]);

  // External Playlist Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importService, setImportService] = useState<'Spotify' | 'Apple Music' | 'YouTube Music' | 'URL / テキスト'>('Spotify');
  const [importPlaylistName, setImportPlaylistName] = useState('');
  const [importSourceUrlOrText, setImportSourceUrlOrText] = useState('');
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);

  // User Custom Playlist Creation & Track Management State
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [includeCurrentTrackInNew, setIncludeCurrentTrackInNew] = useState(true);
  const [trackForPlaylistPicker, setTrackForPlaylistPicker] = useState<MonochromeTrack | null>(null);

  // Detailed 3D Spatial Audio State (Synced with globalAudio)
  const [spatialDetails, setSpatialDetails] = useState<SpatialAudioDetails>(
    () => globalAudio.getState().spatialDetails
  );

  const updateSpatialDetails = useCallback((patch: Partial<SpatialAudioDetails>) => {
    globalAudio.setSpatialDetails(patch);
    setSpatialDetails(globalAudio.getState().spatialDetails);
  }, []);

  useEffect(() => {
    if (initialTab) setActiveNav(resolveInitialNav(initialTab));
  }, [initialTab]);

  // Proxy Engine, Wisp v1 & Relay Server State
  const [proxyEngine] = useState<ProxyEngine>('scramjet');
  const [relayNode, setRelayNode] = useState<ProxyRelayNodeId>('auto');
  const [wispServer, setWispServer] = useState<string>(WISP_SERVER_PRESETS[0].wispUrl);
  const [customWispUrlInput, setCustomWispUrlInput] = useState<string>('');
  const [, setActiveRelayLabel] = useState<string>('api.monochrome.tf');
  const [, setProxyLatency] = useState(11);
  const [isBuffering, setIsBuffering] = useState(false);

  // Track Catalog State
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

  // Favorites State
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
      // ignore
    }
    return [INITIAL_ENRICHED_CATALOG[0]];
  });

  // Recently Played State
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
    return INITIAL_ENRICHED_CATALOG.slice(0, 6);
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteTracks));
    } catch {
      // ignore
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

  // Playback State
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
  const [statusBanner, setStatusBanner] = useState<string>('ストリーミング準備完了');

  // Lyric Translation State (JA -> EN, EN -> JA, Other -> JA)
  const [showLyricsTranslation, setShowLyricsTranslation] = useState<boolean>(true);
  const [serverLyricTranslations, setServerLyricTranslations] = useState<Record<string, string>>({});
  const [isTranslatingLyrics, setIsTranslatingLyrics] = useState<boolean>(false);

  // Translate lyrics whenever currentTrack.lyrics changes
  useEffect(() => {
    let cancelled = false;
    const rawLines = (currentTrack.lyrics || [])
      .filter((l) => !l.isInterlude && l.text && l.text.trim())
      .map((l) => l.text.trim());
    if (rawLines.length === 0) return;

    setIsTranslatingLyrics(true);
    translateLyricsBatchViaServer(rawLines)
      .then((map) => {
        if (!cancelled) {
          setServerLyricTranslations((prev) => ({ ...prev, ...map }));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTranslatingLyrics(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack.id, currentTrack.lyrics]);

  // Web Proxy State
  const [monoWebUrl, setMonoWebUrl] = useState<string>('https://monochrome.tf');
  const [monoWebSwSrc, setMonoWebSwSrc] = useState<string>('');
  const [monoWebSrcDoc, setMonoWebSrcDoc] = useState<string>('');
  const [monoWebLoading, setMonoWebLoading] = useState<boolean>(false);

  // Synth Controls
  const [waveform, setWaveform] = useState<OscillatorType>('sawtooth');
  const [baseFreq, setBaseFreq] = useState(220);
  const [harmonics, setHarmonics] = useState(3);
  const [filterCutoff, setFilterCutoff] = useState(1400);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  const oscNodesRef = useRef<OscillatorNode[]>([]);
  const musicIntervalRef = useRef<number | null>(null);
  const rafSyncIdRef = useRef<number | null>(null);
  const lastFramePerfRef = useRef<number>(0);
  const scrollAnimRafRef = useRef<number | null>(null);
  const fullPlayheadRef = useRef<number>(0);
  const userScrollTimeoutRef = useRef<number | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<number | null>(null);

  const [showCustomLyricEditor, setShowCustomLyricEditor] = useState(false);
  const [customLyricInput, setCustomLyricInput] = useState('');

  const [musicSettings, setMusicSettings] = useState<MusicSettingsConfig>(() => getMusicSettings());

  const updateMusicSettings = useCallback((patch: Partial<MusicSettingsConfig>) => {
    const updated = saveMusicSettings(patch);
    setMusicSettings(updated);
    if (
      typeof patch.dolbyAtmosEnabled === 'boolean' ||
      patch.dolbyAtmosPreset !== undefined
    ) {
      globalAudio.setDolbyAtmos(updated.dolbyAtmosEnabled, updated.dolbyAtmosPreset);
    }
    return updated;
  }, []);

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
        `ダウンロード開始 (${musicSettings.downloadQuality.toUpperCase()}): ${track.title}`
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
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
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

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const maxHalfW = Math.max(300, Math.round(winW / 2 - 30));
    const maxH = 40;
    const minH = -Math.max(250, Math.round(winH - 80));

    const clampedX = Math.max(-maxHalfW, Math.min(maxHalfW, pillDragStartRef.current.originX + dx));
    const clampedY = Math.max(minH, Math.min(maxH, pillDragStartRef.current.originY + dy));
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
      setSpatialDetails(aState.spatialDetails);
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
            prev &&
            prev.id === aState.track!.id &&
            prev.lyrics &&
            prev.lyrics.length > aState.track!.lyrics.length
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

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tracks;
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

  const effectiveLyricTime = useMemo(
    () => Math.max(0, currentTime + lyricOffsetSec),
    [currentTime, lyricOffsetSec]
  );

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
        // ignore
      }
    });
    oscNodesRef.current = [];
  }, []);

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
        // Immediately pipe fetched lyrics into DeepL automatic translation
        const rawLines = synced
          .filter((l) => !l.isInterlude && l.text && l.text.trim())
          .map((l) => l.text.trim());
        if (rawLines.length > 0) {
          setIsTranslatingLyrics(true);
          translateLyricsBatchViaServer(rawLines)
            .then((map) => {
              setServerLyricTranslations((prev) => ({ ...prev, ...map }));
            })
            .finally(() => {
              setIsTranslatingLyrics(false);
            });
        }
      }
    } catch {
      // keep existing
    } finally {
      if (reqSeq === lyricFetchSeqRef.current) {
        setIsFetchingLyrics(false);
      }
    }
  }, []);

  useEffect(() => {
    const initial = INITIAL_ENRICHED_CATALOG[0];
    if (initial) {
      loadLyricsForTrack(initial);
    }
  }, [loadLyricsForTrack]);

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
        setTimeout(() => setMonoWebLoading(false), 450);
        return;
      }

      try {
        const res = await fetchHtmlViaProxyCascade(targetUrl, node);
        setMonoWebSwSrc('');
        setMonoWebSrcDoc(res.html);
        setActiveRelayLabel(res.usedNode);
      } catch {
        // ignore
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

  const startTrackPlayback = useCallback(
    (track: MonochromeTrack, startAtSec = 0) => {
      stopAllAudio();
      fullPlayheadRef.current = startAtSec;
      globalAudio.setVolume(isMuted ? 0 : volume);
      globalAudio.setPlaybackRate(playbackRate);
      globalAudio.playTrack(track, startAtSec);
    },
    [isMuted, playbackRate, stopAllAudio, volume]
  );

  const playTrack = useCallback(
    (trackToPlay: MonochromeTrack) => {
      const rawIdStr = String(trackToPlay.monoTrackId || trackToPlay.id || '').trim();
      const isNonNetease = /^(?:mono-itunes-|itunes-|album-|single-|artist-|imp-)/i.test(rawIdStr);
      const cleanNumericId = isNonNetease
        ? ''
        : rawIdStr
            .replace(/^mono-live-gd-/, '')
            .replace(/^mono-gd-/, '')
            .replace(/^mono-live-tf-/, '')
            .replace(/^mono-live-/, '')
            .trim();
      const exactPlayUrl = `/api/music/play?id=${encodeURIComponent(
        /^\d+$/.test(cleanNumericId) ? cleanNumericId : ''
      )}&title=${encodeURIComponent(trackToPlay.title)}&artist=${encodeURIComponent(
        cleanPrimaryArtistName(trackToPlay.artist)
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

      loadLyricsForTrack(normalizedTrack);
      startTrackPlayback(normalizedTrack, 0);
    },
    [loadLyricsForTrack, startTrackPlayback]
  );

  const handleOnlineMusicSearch = useCallback(
    async (qOverride?: string) => {
      const q = (qOverride ?? searchQuery).trim() || 'YOASOBI';
      setIsSearchingOnline(true);
      setStatusBanner(`"${q}" を検索中...`);
      try {
        const liveResults = await searchMonochromeLiveTracks(q);
        if (liveResults.length > 0) {
          const enrichedLive = liveResults.map((t) => ({
            ...t,
            lyrics: enrichLyricsWithWordTiming(t.lyrics, t.duration),
          }));
          setLastSearchedQuery(q);
          setTracks(enrichedLive);

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
            activeNav !== 'home' &&
            activeNav !== 'artist'
          ) {
            setActiveNav('browse');
          }
          setStatusBanner(`"${q}" の検索結果: ${enrichedLive.length} 曲`);
        } else {
          setStatusBanner(`"${q}" の楽曲が見つかりませんでした`);
        }
      } catch {
        setStatusBanner('検索中にエラーが発生しました');
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

  const seekToSeconds = useCallback((targetSec: number) => {
    globalAudio.seek(targetSec);
    setCurrentTime(targetSec);
    setUserScrolledLyrics(false);
  }, []);

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

  // Open a Playlist / Album / EP / Single in the 2nd-Image Spotify Detail View
  const openCollectionDetail = useCallback(
    async (collection: MusicCollectionViewData, fetchCollectionId?: string) => {
      if (activeNav !== 'collection-detail') {
        setPreviousNav(activeNav);
      }
      setSelectedCollection(collection);
      setActiveNav('collection-detail');

      if (fetchCollectionId || collection.tracks.length === 0) {
        try {
          const resp = await backendFetch(
            `/api/music/album?collectionId=${encodeURIComponent(
              fetchCollectionId || ''
            )}&album=${encodeURIComponent(collection.title)}&artist=${encodeURIComponent(
              collection.creator
            )}`
          );
          if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data.tracks) && data.tracks.length > 0) {
              const mapped: MonochromeTrack[] = data.tracks.map(
                (item: Record<string, unknown>, idx: number) => ({
                  id: String(item.id || `col-t-${idx}`),
                  monoTrackId: String(item.monoTrackId || ''),
                  title: String(item.title || 'Track'),
                  artist: String(item.artist || collection.creator),
                  album: String(item.album || collection.title),
                  coverGradient: collection.coverGradient,
                  coverAccent: resolvedAccentHex,
                  artworkUrl: item.artworkUrl
                    ? String(item.artworkUrl)
                    : collection.artworkUrl,
                  audioUrl: String(
                    item.audioUrl ||
                      `/api/music/play?title=${encodeURIComponent(
                        String(item.title || '')
                      )}&artist=${encodeURIComponent(collection.creator)}`
                  ),
                  isFullLengthStream: true,
                  duration: Number(item.duration) || 215,
                  format: 'Full-Length Stream',
                  bitrate: '320 kbps',
                  genre: String(item.genre || collection.kind),
                  year: Number(item.year) || collection.year,
                  lyrics: enrichLyricsWithWordTiming(
                    [
                      {
                        time: 0,
                        text: `${String(item.title || '')} — ${collection.creator}`,
                      },
                    ],
                    Number(item.duration) || 215
                  ),
                })
              );
              setSelectedCollection((prev) => ({
                ...prev,
                tracks: mapped,
              }));
            }
          }
        } catch {
          // keep existing tracks
        }
      }
    },
    [activeNav, resolvedAccentHex]
  );

  // Create a User Custom Playlist
  const handleCreateCustomPlaylist = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const title = newPlaylistTitle.trim() || `マイプレイリスト #${userPlaylists.length + 1}`;
      const subtitle = newPlaylistDesc.trim() || '自分で作成したカスタムプレイリスト';
      const initialTracks = includeCurrentTrackInNew && currentTrack ? [currentTrack] : [];
      const customPl: MusicCollectionViewData = {
        id: `pl-user-${Date.now()}`,
        kind: 'PLAYLIST',
        title,
        subtitle,
        creator: 'あなた (Glassium User)',
        year: new Date().getFullYear(),
        artworkUrl:
          initialTracks[0]?.artworkUrl ||
          currentTrack?.artworkUrl ||
          INITIAL_ENRICHED_CATALOG[0]?.artworkUrl ||
          '',
        coverGradient: 'from-cyan-600 via-blue-900 to-slate-950',
        sourceService: 'カスタム作成',
        tracks: initialTracks,
      };
      setUserPlaylists((prev) => [customPl, ...prev]);
      setSelectedCollection(customPl);
      setActiveNav('collection-detail');
      setShowCreatePlaylistModal(false);
      setNewPlaylistTitle('');
      setNewPlaylistDesc('');
      setStatusBanner(`プレイリスト「${title}」を作成しました`);
    },
    [currentTrack, includeCurrentTrackInNew, newPlaylistDesc, newPlaylistTitle, userPlaylists.length]
  );

  // Add a Track to a User Custom Playlist
  const handleAddTrackToPlaylist = useCallback(
    (playlistId: string, track: MonochromeTrack) => {
      setUserPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          const exists = pl.tracks.some((t) => t.id === track.id);
          const nextTracks = exists ? pl.tracks : [...pl.tracks, track];
          const updated = {
            ...pl,
            artworkUrl: pl.artworkUrl || track.artworkUrl || '',
            tracks: nextTracks,
          };
          if (selectedCollection.id === playlistId) {
            setSelectedCollection(updated);
          }
          return updated;
        })
      );
      setTrackForPlaylistPicker(null);
      setStatusBanner(`「${track.title}」をプレイリストに追加しました`);
    },
    [selectedCollection.id]
  );

  // Remove a Track from a User Custom Playlist
  const handleRemoveTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      setUserPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          const updated = {
            ...pl,
            tracks: pl.tracks.filter((t) => t.id !== trackId),
          };
          if (selectedCollection.id === playlistId) {
            setSelectedCollection(updated);
          }
          return updated;
        })
      );
      setStatusBanner('プレイリストから曲を削除しました');
    },
    [selectedCollection.id]
  );

  // Import Playlist from External Service (Spotify / Apple Music / YouTube Music / Text)
  const handleImportExternalPlaylist = useCallback(
    async (e?: React.FormEvent, presetQuery?: { service: 'Spotify' | 'Apple Music' | 'YouTube Music'; name: string; rawText: string }) => {
      if (e) e.preventDefault();
      const targetService = presetQuery?.service || importService;
      const targetName = (presetQuery?.name || importPlaylistName).trim() || `${targetService} インポート`;
      const targetRaw = (presetQuery?.rawText || importSourceUrlOrText).trim();
      if (!targetRaw) return;

      setIsImportingPlaylist(true);
      try {
        const resp = await backendFetch('/api/music/import-playlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: targetService,
            name: targetName,
            urlOrText: targetRaw,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.playlist && Array.isArray(data.playlist.tracks)) {
            const importedTracks: MonochromeTrack[] = data.playlist.tracks.map(
              (t: Record<string, unknown>, idx: number) => ({
                id: String(t.id || `imp-${Date.now()}-${idx}`),
                monoTrackId: String(t.monoTrackId || ''),
                title: String(t.title || 'Track'),
                artist: String(t.artist || 'Artist'),
                album: String(t.album || targetName),
                coverGradient: 'from-emerald-600 via-teal-900 to-slate-950',
                coverAccent: resolvedAccentHex,
                artworkUrl: t.artworkUrl ? String(t.artworkUrl) : INITIAL_ENRICHED_CATALOG[0]?.artworkUrl,
                audioUrl: String(
                  t.audioUrl ||
                    `/api/music/play?title=${encodeURIComponent(
                      String(t.title || '')
                    )}&artist=${encodeURIComponent(String(t.artist || ''))}`
                ),
                isFullLengthStream: true,
                duration: Number(t.duration) || 210,
                format: 'Imported Track',
                bitrate: '320 kbps',
                genre: 'Playlist',
                year: Number(t.year) || 2025,
                lyrics: enrichLyricsWithWordTiming(
                  [{ time: 0, text: `${String(t.title || '')} — ${String(t.artist || '')}` }],
                  Number(t.duration) || 210
                ),
              })
            );

            const newCollection: MusicCollectionViewData = {
              id: `pl-imported-${Date.now()}`,
              kind: 'PLAYLIST',
              title: String(data.playlist.name || targetName),
              subtitle: `${targetService} からインポートしたプレイリスト`,
              creator: `${targetService} Import`,
              year: new Date().getFullYear(),
              artworkUrl:
                importedTracks[0]?.artworkUrl ||
                INITIAL_ENRICHED_CATALOG[0]?.artworkUrl ||
                '',
              coverGradient: 'from-emerald-600 via-cyan-800 to-slate-950',
              sourceService: targetService,
              tracks: importedTracks.length > 0 ? importedTracks : INITIAL_ENRICHED_CATALOG.slice(0, 5),
            };

            setUserPlaylists((prev) => [newCollection, ...prev]);
            setShowImportModal(false);
            setImportPlaylistName('');
            setImportSourceUrlOrText('');
            openCollectionDetail(newCollection);
            setStatusBanner(
              `${targetService} から「${newCollection.title}」(${newCollection.tracks.length}曲) をインポートしました`
            );
          }
        }
      } catch {
        setStatusBanner('プレイリストのインポートに失敗しました');
      } finally {
        setIsImportingPlaylist(false);
      }
    },
    [importPlaylistName, importService, importSourceUrlOrText, openCollectionDetail, resolvedAccentHex]
  );

  // Artwork Palette Extraction
  const [artworkPalette, setArtworkPalette] = useState<{
    c1: string;
    c2: string;
    c3: string;
    c4: string;
  }>({
    c1: resolvedAccentHex,
    c2: '#8b5cf6',
    c3: '#06b6d4',
    c4: '#f59e0b',
  });

  useEffect(() => {
    let cancelled = false;
    const getFallbackPalette = (grad: string) => {
      const g = (grad || '').toLowerCase();
      if (g.includes('rose') || g.includes('pink')) {
        return { c1: resolvedAccentHex, c2: '#a855f7', c3: '#ec4899', c4: '#fb7185' };
      }
      if (g.includes('cyan') || g.includes('blue')) {
        return { c1: '#06b6d4', c2: '#3b82f6', c3: '#6366f1', c4: '#2dd4bf' };
      }
      return { c1: resolvedAccentHex, c2: '#06b6d4', c3: '#8b5cf6', c4: '#10b981' };
    };

    setArtworkPalette(getFallbackPalette(currentTrack.coverGradient));
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
              const w = 1 + sat * 4 + (lum > 25 && lum < 235 ? 1.5 : 0.2);
              rSum += r * w;
              gSum += g * w;
              bSum += b * w;
              weightSum += w;
            }
          }
          if (weightSum === 0) return resolvedAccentHex;
          const r = Math.min(255, Math.round(rSum / weightSum + 15));
          const g = Math.min(255, Math.round(gSum / weightSum + 15));
          const b = Math.min(255, Math.round(bSum / weightSum + 15));
          return `rgb(${r}, ${g}, ${b})`;
        };

        if (!cancelled) {
          setArtworkPalette({
            c1: sampleQuadrant(0, 0),
            c2: sampleQuadrant(1, 0),
            c3: sampleQuadrant(0, 1),
            c4: sampleQuadrant(1, 1),
          });
        }
      } catch {
        // ignore CORS canvas taint
      }
    };
    img.src = currentTrack.artworkUrl;
    return () => {
      cancelled = true;
    };
  }, [currentTrack.artworkUrl, currentTrack.coverGradient, resolvedAccentHex]);

  // Broadcast Now Playing Dock state to OS Desktop
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
          volume: isMuted ? 0 : volume,
          lyricLine: activeLyricText,
          palette: artworkPalette,
        },
      })
    );
  }, [isPlaying, currentTrack, currentTime, currentLyricIndex, artworkPalette, volume, isMuted]);

  // 60fps Audio Sync Loop
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
        setCurrentTime((prev) => (Math.abs(activeSec - prev) >= 0.2 ? activeSec : prev));
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
  }, [isPlaying, currentTrack, isRepeat, nextTrack, playbackRate]);

  useEffect(() => {
    const targetGain = isMuted ? 0 : volume;
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(targetGain, audioCtxRef.current.currentTime);
    }
    globalAudio.setVolume(targetGain);
    globalAudio.setPlaybackRate(playbackRate);
  }, [volume, isMuted, playbackRate]);

  useEffect(() => {
    if (filterNodeRef.current && audioCtxRef.current) {
      const targetFreq = vocalBoost ? Math.min(4800, filterCutoff + 1100) : filterCutoff;
      filterNodeRef.current.frequency.setValueAtTime(targetFreq, audioCtxRef.current.currentTime);
    }
  }, [filterCutoff, vocalBoost]);

  // Visualizer Canvas Loop (for Synth tab)
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
        barGrad.addColorStop(0, resolvedAccentHex);
        barGrad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(x + 2, y, Math.max(2, barWidth - 4), barHeight);
      }

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, currentTrack.audioUrl, activeNav, resolvedAccentHex]);

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

  // Fetch MV & Artist Helpers
  const fetchLiveMvsForQuery = useCallback(
    async (title: string, artist: string, switchActive = true) => {
      const cleanArtist = cleanPrimaryArtistName(artist);
      const currentSettings = getMusicSettings();
      setIsFetchingMv(true);
      try {
        const resp = await backendFetch(
          `/api/music/mv?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(
            cleanArtist
          )}&q=${encodeURIComponent(`${cleanArtist} ${title}`.trim())}&quality=${encodeURIComponent(
            currentSettings.mvQuality
          )}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.mvs) && data.mvs.length > 0) {
            const mapped: MusicVideoItem[] = data.mvs.map(
              (m: Record<string, unknown>, idx: number) => ({
                id: String(m.id || `mv-live-${idx}`),
                videoUrl: m.videoUrl ? String(m.videoUrl) : undefined,
                youtubeId: m.youtubeId ? String(m.youtubeId) : undefined,
                title: String(m.title || title || 'Music Video'),
                artist: String(m.artist || cleanArtist),
                album: String(m.album || ''),
                durationLabel: String(m.durationLabel || '3:45'),
                viewsLabel: String(m.viewsLabel || 'Music Video'),
                year: Number(m.year || 2024),
                thumbnailUrl: m.thumbnailUrl ? String(m.thumbnailUrl) : undefined,
              })
            );
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
        // ignore
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

  const fetchArtistProfileFromApi = useCallback(
    async (artistName: string) => {
      const cleanArtist = cleanPrimaryArtistName(artistName);
      setIsFetchingArtist(true);
      try {
        const resp = await backendFetch(`/api/music/artist?name=${encodeURIComponent(cleanArtist)}`);
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
                viewsLabel: String(m.viewsLabel || 'Official MV'),
                year: Number(m.year || 2024),
                thumbnailUrl: m.thumbnailUrl ? String(m.thumbnailUrl) : undefined,
              }))
            : [];

          const apiTopTracks: MonochromeTrack[] = Array.isArray(data.topTracks)
            ? data.topTracks
                .filter((t: Record<string, unknown>) =>
                  isSameArtistClient(String(t.artist || cleanArtist), cleanArtist)
                )
                .map((t: Record<string, unknown>, idx: number) => {
                  const dur = Number(t.duration) || 215;
                  return {
                    id: String(t.id || `artist-top-${idx}`),
                    monoTrackId: String(t.monoTrackId || ''),
                    title: String(t.title || 'Track'),
                    artist: cleanArtist,
                    album: String(t.album || 'Single'),
                    coverGradient: 'from-rose-950 via-zinc-900 to-black',
                    coverAccent: resolvedAccentHex,
                    artworkUrl: t.artworkUrl ? String(t.artworkUrl) : undefined,
                    audioUrl: String(
                      t.audioUrl ||
                        `/api/music/play?title=${encodeURIComponent(
                          String(t.title || '')
                        )}&artist=${encodeURIComponent(cleanArtist)}`
                    ),
                    isFullLengthStream: true,
                    duration: dur,
                    format: 'Full-Length Stream',
                    bitrate: '320 kbps',
                    genre: String(t.genre || 'J-Pop'),
                    year: Number(t.year) || 2025,
                    lyrics: enrichLyricsWithWordTiming(
                      [{ time: 0, text: `${String(t.title || '')} — ${cleanArtist}` }],
                      dur
                    ),
                  };
                })
            : [];

          const apiAlbums: ArtistAlbumItem[] = Array.isArray(data.albums)
            ? data.albums.map((a: Record<string, unknown>, idx: number) => ({
                id: String(a.id || `album-${idx}`),
                collectionId: String(a.collectionId || ''),
                title: String(a.title || 'Album'),
                artist: cleanArtist,
                artworkUrl: String(a.artworkUrl || ''),
                year: Number(a.year) || 2024,
                trackCount: Number(a.trackCount) || 10,
                genre: String(a.genre || 'Album'),
              }))
            : [];

          const apiSingles: ArtistSingleItem[] = Array.isArray(data.singles)
            ? data.singles.map((s: Record<string, unknown>, idx: number) => ({
                id: String(s.id || `single-${idx}`),
                collectionId: String(s.collectionId || ''),
                title: String(s.title || 'Single'),
                cleanTitle: String(s.cleanTitle || s.title || 'Single'),
                artist: cleanArtist,
                artworkUrl: String(s.artworkUrl || ''),
                year: Number(s.year) || 2024,
                trackCount: Number(s.trackCount) || 1,
                audioUrl: String(
                  s.audioUrl ||
                    `/api/music/play?title=${encodeURIComponent(
                      String(s.cleanTitle || s.title || '')
                    )}&artist=${encodeURIComponent(cleanArtist)}`
                ),
              }))
            : [];

          const presetMeta = ARTIST_METADATA_MAP[cleanArtist];
          setLiveArtistProfile({
            name: String(data.name || cleanArtist),
            englishName: presetMeta?.englishName || cleanArtist,
            genre: String(data.genre || presetMeta?.genre || 'Artist'),
            monthlyListeners: String(
              data.monthlyListeners || presetMeta?.monthlyListeners || '840万人 / 月'
            ),
            bio: presetMeta?.bio || String(data.bio || `${cleanArtist} のプロフィール。`),
            bannerGradient:
              presetMeta?.bannerGradient || 'from-cyan-700 via-indigo-800 to-slate-950',
            avatarUrl: String(data.avatarUrl || presetMeta?.avatarUrl || ''),
            bannerUrl: String(data.bannerUrl || data.avatarUrl || ''),
            topTracks: apiTopTracks,
            albums: apiAlbums,
            singles: apiSingles,
            mvs: apiMvs,
          });
        }
      } catch {
        // ignore
      } finally {
        setIsFetchingArtist(false);
      }
    },
    [resolvedAccentHex]
  );

  const openArtistPage = useCallback(
    (artistName: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const cleanArtist = cleanPrimaryArtistName(artistName);
      setSelectedArtistName(cleanArtist);
      setActiveNav('artist');
      fetchArtistProfileFromApi(cleanArtist);
    },
    [fetchArtistProfileFromApi]
  );

  useEffect(() => {
    if (activeNav === 'artist') {
      fetchArtistProfileFromApi(selectedArtistName);
    }
  }, [activeNav, selectedArtistName, fetchArtistProfileFromApi]);

  const artistStrictTopTracks = useMemo(() => {
    const cleanSelected = cleanPrimaryArtistName(selectedArtistName);
    if (
      liveArtistProfile &&
      normArtistCompare(liveArtistProfile.name) === normArtistCompare(cleanSelected) &&
      liveArtistProfile.topTracks &&
      liveArtistProfile.topTracks.length > 0
    ) {
      return liveArtistProfile.topTracks;
    }
    return INITIAL_ENRICHED_CATALOG.filter((t) => isSameArtistClient(t.artist, cleanSelected));
  }, [selectedArtistName, liveArtistProfile]);

  const activeArtistProfile: ArtistProfileData = useMemo(() => {
    const cleanSelected = cleanPrimaryArtistName(selectedArtistName);
    if (
      liveArtistProfile &&
      normArtistCompare(liveArtistProfile.name) === normArtistCompare(cleanSelected)
    ) {
      const matchedTrackArt = artistStrictTopTracks[0]?.artworkUrl;
      return {
        ...liveArtistProfile,
        avatarUrl: liveArtistProfile.avatarUrl || matchedTrackArt || '',
        mvs:
          liveArtistProfile.mvs.length > 0
            ? liveArtistProfile.mvs
            : OFFICIAL_MV_CATALOG.filter((m) => isSameArtistClient(m.artist, cleanSelected)),
      };
    }

    const meta = ARTIST_METADATA_MAP[cleanSelected];
    const matchedTrackArt = artistStrictTopTracks[0]?.artworkUrl || '';
    const artistMvs = OFFICIAL_MV_CATALOG.filter((m) =>
      isSameArtistClient(m.artist, cleanSelected)
    );

    return {
      name: cleanSelected,
      englishName: meta?.englishName || cleanSelected,
      genre: meta?.genre || 'Artist',
      monthlyListeners: meta?.monthlyListeners || '680万人 / 月',
      bio: meta?.bio || `${cleanSelected} のアーティストページ。`,
      bannerGradient: meta?.bannerGradient || 'from-cyan-700 via-indigo-800 to-slate-950',
      avatarUrl: meta?.avatarUrl || matchedTrackArt || '',
      topTracks: artistStrictTopTracks,
      albums: [],
      singles: [],
      mvs: artistMvs,
    };
  }, [selectedArtistName, liveArtistProfile, artistStrictTopTracks]);

  // All Collections (Built-in + User Imported + Favorites Playlist)
  const allPlaylistsAndCollections = useMemo(() => {
    const favCollection: MusicCollectionViewData = {
      id: 'pl-favorites',
      kind: 'PLAYLIST',
      title: 'お気に入りソング',
      subtitle: 'お気に入り登録した曲',
      creator: 'あなた',
      year: 2025,
      artworkUrl:
        favoriteTracks[0]?.artworkUrl ||
        INITIAL_ENRICHED_CATALOG[0]?.artworkUrl ||
        '',
      coverGradient: 'from-indigo-600 via-violet-800 to-slate-950',
      sourceService: 'Library',
      tracks: favoriteTracks,
    };
    return [favCollection, ...userPlaylists, ...BUILTIN_COLLECTIONS];
  }, [favoriteTracks, userPlaylists]);

  // -----------------------------------------------------------------------
  // Apple Music Live Lyrics & DeepL Bilingual Translation Panel
  // -----------------------------------------------------------------------
  const renderSyncedLyricsPanel = (fullScreenMode = false) => {
    const currentFav = isFavorite(currentTrack.id);
    const effectivePlayhead = currentTime + lyricOffsetSec;

    return (
      <div
        className={`${
          fullScreenMode
            ? 'flex-1'
            : 'w-full lg:w-[430px] xl:w-[480px] border-l border-white/[0.12]'
        } flex flex-col min-h-0 relative overflow-hidden shrink-0 bg-zinc-950/80`}
      >
        {/* Apple Music Dynamic Blurred Album Artwork Mesh Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          {currentTrack.artworkUrl ? (
            <>
              <img
                src={currentTrack.artworkUrl}
                alt=""
                className="absolute -inset-16 w-[135%] h-[135%] max-w-none object-cover blur-[72px] saturate-200 opacity-55 scale-125 transition-all duration-1000"
              />
              <img
                src={currentTrack.artworkUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-[96px] saturate-150 opacity-35 mix-blend-screen"
              />
            </>
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${currentTrack.coverGradient} blur-3xl opacity-55`}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 20% 25%, ${artworkPalette.c1}44 0%, transparent 55%), radial-gradient(circle at 80% 75%, ${artworkPalette.c2}44 0%, transparent 60%), linear-gradient(180deg, rgba(9,9,11,0.45) 0%, rgba(9,9,11,0.72) 100%)`,
            }}
          />
        </div>

        {/* Minimal Floating Apple Music Lyrics Header */}
        <div className="px-5 py-3 border-b border-white/[0.08] bg-black/20 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-rounded text-base text-white/90">lyrics</span>
            <span className="text-xs font-bold tracking-tight text-white/95">
              Apple Music Live Lyrics
            </span>
            {isTranslatingLyrics && (
              <span className="text-[10px] text-white/60 font-mono animate-pulse">
                · DeepL 翻訳同期中...
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* DeepL Translation Toggle */}
            <button
              type="button"
              onClick={() => setShowLyricsTranslation((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer ${
                showLyricsTranslation
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-white/10 text-white/75 hover:bg-white/20 hover:text-white'
              }`}
              title="DeepL 自動通訳表示の切り替え"
            >
              <span className="material-symbols-rounded text-xs">translate</span>
              <span>通訳 {showLyricsTranslation ? 'ON' : 'OFF'}</span>
            </button>

            {/* Sync Offset Controls */}
            <div className="flex items-center bg-white/10 px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded-lg">
              <button
                onClick={() => setLyricOffsetSec((o) => Math.round((o - 0.2) * 10) / 10)}
                className="px-1.5 py-0.5 hover:bg-white/15 rounded text-white/75 hover:text-white transition"
              >
                -0.2s
              </button>
              <button
                onClick={() => setLyricOffsetSec(0)}
                className="px-1.5 py-0.5 font-semibold text-white/90"
              >
                {lyricOffsetSec >= 0 ? `+${lyricOffsetSec.toFixed(1)}s` : `${lyricOffsetSec.toFixed(1)}s`}
              </button>
              <button
                onClick={() => setLyricOffsetSec((o) => Math.round((o + 0.2) * 10) / 10)}
                className="px-1.5 py-0.5 hover:bg-white/15 rounded text-white/75 hover:text-white transition"
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
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
            >
              編集
            </button>

            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                currentFav
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              {currentFav ? '♥ 保存済' : '♡ 保存'}
            </button>

            <button
              onClick={() => loadLyricsForTrack(currentTrack)}
              disabled={isFetchingLyrics}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-[11px] text-white/80 hover:bg-white/20 hover:text-white transition"
            >
              {isFetchingLyrics ? '取得中...' : '再取得'}
            </button>
          </div>
        </div>

        {showCustomLyricEditor && (
          <div className="p-4 border-b border-white/[0.12] bg-black/75 backdrop-blur-3xl space-y-2.5 z-20">
            <div className="text-[11px] font-semibold text-white/90">
              歌詞データ編集 (LRC / TTML / JSON)
            </div>
            <textarea
              value={customLyricInput}
              onChange={(e) => setCustomLyricInput(e.target.value)}
              rows={4}
              className="w-full rounded-md bg-black/60 border border-white/15 p-2.5 text-[11px] font-mono text-white/90 outline-none"
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
                  }
                }}
                style={{ backgroundColor: resolvedAccentHex }}
                className="px-3.5 py-1 rounded text-white text-xs font-semibold"
              >
                適用
              </button>
            </div>
          </div>
        )}

        {userScrolledLyrics && (
          <div className="absolute top-16 right-5 z-20">
            <button
              onClick={() => {
                setUserScrolledLyrics(false);
                scrollToActiveLyric(true);
              }}
              className="px-4 py-1.5 rounded-full bg-white/90 text-black font-bold text-xs shadow-xl hover:bg-white transition cursor-pointer"
            >
              同期に戻る
            </button>
          </div>
        )}

        {/* Apple Music Live Lyrics Scroll Container */}
        <div
          ref={lyricsContainerRef}
          onWheel={handleManualLyricsWheel}
          onTouchMove={handleManualLyricsWheel}
          className={`relative z-10 flex-1 overflow-y-auto ${
            fullScreenMode ? 'px-8 sm:px-16 py-16' : 'px-6 py-12'
          } space-y-7 select-none`}
          style={{
            maskImage:
              'linear-gradient(to bottom, transparent 0%, black 10%, black 88%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 10%, black 88%, transparent 100%)',
          }}
        >
          <div className="h-12" />
          {currentTrack.lyrics.map((line: LyricLine, idx: number) => {
            const isActive = idx === currentLyricIndex;
            const isPast = idx < currentLyricIndex;
            const distance = Math.abs(idx - currentLyricIndex);

            // Apple Music progressive optical depth-of-field blur
            const appleBlurClass = isActive
              ? 'blur-0 opacity-100 scale-[1.03]'
              : distance === 1
              ? 'blur-[1px] opacity-45 scale-100'
              : distance === 2
              ? 'blur-[2.2px] opacity-30 scale-[0.98]'
              : 'blur-[3.5px] opacity-20 scale-[0.96]';

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
                  className={`cursor-pointer py-4 px-3 rounded-2xl transition-all duration-500 origin-left ${appleBlurClass} hover:blur-0 hover:opacity-90`}
                >
                  <div className="flex items-center gap-3">
                    {[0, 1, 2].map((dotIdx) => {
                      const pulseScale = isActive
                        ? 1 + 0.35 * Math.sin(effectivePlayhead * 4.5 - dotIdx * 0.9)
                        : 1;
                      return (
                        <span
                          key={dotIdx}
                          style={{
                            transform: `scale(${pulseScale.toFixed(2)})`,
                          }}
                          className={`inline-block w-3.5 h-3.5 rounded-full transition-transform duration-150 ${
                            isActive
                              ? 'bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)]'
                              : 'bg-white/35'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            }

            const translation = showLyricsTranslation
              ? getLyricTranslation(line.text, serverLyricTranslations)
              : '';

            const nextLineTime =
              line.endTime ??
              currentTrack.lyrics[idx + 1]?.time ??
              line.time + 4.5;
            const lineDuration = Math.max(0.4, nextLineTime - line.time);
            const lineProgress = isActive
              ? Math.max(0, Math.min(1, (effectivePlayhead - line.time) / lineDuration))
              : isPast
              ? 1
              : 0;

            return (
              <div
                key={idx}
                id={`apple-lyric-line-${idx}`}
                onClick={() => {
                  seekToSeconds(line.time);
                  if (!isPlaying) togglePlay();
                }}
                className={`group cursor-pointer py-3 px-4 -mx-4 rounded-2xl transition-all duration-500 ease-out origin-left ${appleBlurClass} hover:blur-0 hover:opacity-95 hover:bg-white/[0.06]`}
              >
                {/* Primary Lyric Line with Apple Music Sing Word-by-Word Fill */}
                <div
                  className={`font-extrabold tracking-tight leading-[1.22] transition-all duration-300 ${
                    fullScreenMode
                      ? 'text-2xl sm:text-4xl lg:text-[40px]'
                      : 'text-xl sm:text-2xl'
                  } ${
                    isActive
                      ? 'text-white drop-shadow-[0_4px_26px_rgba(255,255,255,0.38)]'
                      : 'text-white/85'
                  }`}
                >
                  {isActive && Array.isArray(line.words) && line.words.length > 0 ? (
                    <span className="inline">
                      {line.words.map((w, wIdx) => {
                        const wDur = Math.max(0.08, w.end - w.start);
                        const wProg = Math.max(
                          0,
                          Math.min(1, (effectivePlayhead - w.start) / wDur)
                        );
                        const isWordSung = wProg >= 1;
                        const isWordCurrent = wProg > 0 && wProg < 1;
                        return (
                          <span
                            key={wIdx}
                            style={
                              isWordCurrent
                                ? {
                                    backgroundImage: `linear-gradient(90deg, #ffffff ${Math.round(
                                      wProg * 100
                                    )}%, rgba(255,255,255,0.42) ${Math.round(wProg * 100)}%)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    transform: 'translateY(-1px)',
                                  }
                                : undefined
                            }
                            className={`inline-block transition-transform duration-150 ${
                              isWordSung
                                ? 'text-white'
                                : isWordCurrent
                                ? 'text-white'
                                : 'text-white/45'
                            }`}
                          >
                            {w.text}
                          </span>
                        );
                      })}
                    </span>
                  ) : isActive ? (
                    <span
                      style={{
                        backgroundImage: `linear-gradient(90deg, #ffffff ${Math.round(
                          lineProgress * 100
                        )}%, rgba(255,255,255,0.55) ${Math.min(
                          100,
                          Math.round(lineProgress * 100) + 12
                        )}%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {line.text}
                    </span>
                  ) : (
                    <span>{line.text}</span>
                  )}
                </div>

                {/* Apple Music Clean Bilingual DeepL Sub-line */}
                {showLyricsTranslation && translation && (
                  <div
                    className={`mt-2 font-semibold tracking-tight leading-snug transition-opacity duration-300 ${
                      fullScreenMode ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'
                    } ${isActive ? 'text-white/85' : 'text-white/55'}`}
                  >
                    {translation}
                  </div>
                )}
              </div>
            );
          })}
          <div className="h-44" />
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Track Table Renderer (Spotify-style Clean Numbered Table with OS Accent)
  // -----------------------------------------------------------------------
  const renderSpotifyTrackTable = (list: MonochromeTrack[], emptyMessage: string) => {
    if (list.length === 0) {
      return <div className="py-16 text-center text-sm text-white/45">{emptyMessage}</div>;
    }

    return (
      <div className="w-full">
        <div className="grid grid-cols-[36px_minmax(160px,2fr)_minmax(110px,1.2fr)_minmax(100px,1fr)_140px_52px] items-center px-4 py-2 border-b border-white/[0.08] text-[11px] font-medium text-white/45 uppercase tracking-wider">
          <span>#</span>
          <span>タイトル</span>
          <span className="hidden sm:block">アーティスト</span>
          <span className="hidden md:block">アルバム</span>
          <span className="text-center">操作</span>
          <span className="text-right">時間</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {list.map((track, idx) => {
            const isCurrent = track.id === currentTrack.id;
            const fav = isFavorite(track.id);
            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => playTrack(track)}
                style={
                  isCurrent
                    ? { backgroundColor: `${resolvedAccentHex}24` }
                    : undefined
                }
                className={`grid grid-cols-[36px_minmax(160px,2fr)_minmax(110px,1.2fr)_minmax(100px,1fr)_140px_52px] items-center px-4 py-2.5 cursor-pointer transition rounded-xl ${
                  isCurrent ? 'text-white' : 'hover:bg-white/[0.06]'
                }`}
              >
                <div className="text-xs font-mono tabular-nums text-white/45 flex items-center">
                  {isCurrent && isPlaying ? (
                    <span
                      className="material-symbols-rounded text-[18px]"
                      style={{ color: resolvedAccentHex }}
                    >
                      equalizer
                    </span>
                  ) : isCurrent ? (
                    <span
                      className="material-symbols-rounded text-[18px]"
                      style={{ color: resolvedAccentHex }}
                    >
                      play_arrow
                    </span>
                  ) : (
                    <span className="w-5 text-center text-white/45 text-[11px]">{idx + 1}</span>
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
                      <div className={`w-full h-full bg-gradient-to-br ${track.coverGradient}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      style={isCurrent ? { color: resolvedAccentHex } : undefined}
                      className="text-xs font-bold truncate text-white"
                    >
                      {track.title}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => openArtistPage(track.artist, e)}
                      className="text-[11px] text-white/55 hover:text-white hover:underline truncate sm:hidden block text-left"
                    >
                      {cleanPrimaryArtistName(track.artist)}
                    </button>
                  </div>
                </div>

                {/* Artist */}
                <div className="hidden sm:block truncate pr-3">
                  <button
                    type="button"
                    onClick={(e) => openArtistPage(track.artist, e)}
                    className="text-xs text-white/75 hover:text-white hover:underline truncate transition text-left"
                  >
                    {cleanPrimaryArtistName(track.artist)}
                  </button>
                </div>

                {/* Album */}
                <div className="hidden md:block text-xs text-white/45 truncate pr-3">
                  {track.album}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => openTrackMv(track, e)}
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/20 text-white/85 text-[10px] font-semibold transition border border-white/15"
                  >
                    MV
                  </button>
                  <button
                    type="button"
                    onClick={(e) => triggerTrackDownload(track, e)}
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/20 text-white/85 text-[10px] font-semibold transition border border-white/15"
                  >
                    DL
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackForPlaylistPicker(track);
                    }}
                    title="自分のプレイリストに追加"
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/20 text-white/85 text-[10px] font-semibold transition border border-white/15"
                  >
                    +PL
                  </button>
                  {activeNav === 'collection-detail' &&
                    selectedCollection.id.startsWith('pl-user-') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTrackFromPlaylist(selectedCollection.id, track.id);
                        }}
                        title="このプレイリストから削除"
                        className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 text-[10px] font-semibold transition border border-rose-400/30"
                      >
                        削除
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(track, e)}
                    style={
                      fav
                        ? {
                            backgroundColor: resolvedAccentHex,
                            borderColor: resolvedAccentHex,
                            color: '#ffffff',
                          }
                        : undefined
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                      fav
                        ? ''
                        : 'bg-transparent text-white/45 border-white/15 hover:text-white hover:border-white/40'
                    }`}
                  >
                    {fav ? '保存済' : '保存'}
                  </button>
                </div>

                {/* Duration */}
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

  // -----------------------------------------------------------------------
  // Detailed 3D HRTF Spatial Audio & Soundstage Panel Renderer
  // -----------------------------------------------------------------------
  const renderSpatialAudioDetailPanel = () => {
    const ROOM_MODELS: {
      id: SpatialAudioDetails['roomModel'];
      label: string;
      desc: string;
    }[] = [
      { id: 'studio', label: 'Studio Nearfield', desc: '原音忠実・モニター室' },
      { id: 'binaural', label: 'HRTF バイノーラル', desc: 'ヘッドホン3D頭部伝達関数' },
      { id: 'theater', label: 'Cinema 7.1.4', desc: '映画館サラウンド音場' },
      { id: 'concert-hall', label: 'Symphony Hall', desc: 'コンサートホール残響' },
      { id: 'club-arena', label: 'Club Arena', desc: '重低音アリーナ空間' },
      { id: 'cathedral', label: 'Cathedral Dome', desc: '大聖堂ロングディケイ' },
    ];

    return (
      <div className="rounded-2xl apple-liquid-glass border border-white/15 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-lg" style={{ color: resolvedAccentHex }}>
                spatial_audio_off
              </span>
              <span>3D 立体音響 (HRTF Spatial Audio) 詳細設定</span>
            </h3>
            <p className="text-[11px] text-white/55 mt-0.5">
              音源定位 (方位角・仰角・距離)、ルーム音響モデル、ステレオ幅、サブベース、残響をリアルタイム制御
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateSpatialDetails({ autoOrbit: !spatialDetails.autoOrbit })}
              style={
                spatialDetails.autoOrbit
                  ? { backgroundColor: resolvedAccentHex }
                  : undefined
              }
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                spatialDetails.autoOrbit
                  ? 'text-white shadow-md'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              360°自動回転: {spatialDetails.autoOrbit ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => {
                updateMusicSettings({ dolbyAtmosEnabled: true });
                updateSpatialDetails({
                  enabled: true,
                  roomModel: 'binaural',
                  azimuthDeg: 0,
                  elevationDeg: 8,
                  distanceMeters: 1.4,
                  stereoWidth: 135,
                  reverbWet: 28,
                  roomDecaySec: 1.8,
                  crossfeed: 25,
                  subBassBoostDb: 3.5,
                  vocalClarityDb: 2.5,
                  airBrillianceDb: 3.0,
                  autoOrbit: false,
                });
                setStatusBanner('立体音響パラメータを標準推奨値にリセットしました');
              }}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80"
            >
              推奨値に戻す
            </button>
          </div>
        </div>

        {/* Room Acoustic Model Selector */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-white/80">1. ルーム音響モデル (Room Acoustics)</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROOM_MODELS.map((rm) => {
              const active = spatialDetails.roomModel === rm.id;
              return (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => {
                    updateMusicSettings({ dolbyAtmosEnabled: true });
                    updateSpatialDetails({ enabled: true, roomModel: rm.id });
                  }}
                  style={
                    active
                      ? {
                          backgroundColor: `${resolvedAccentHex}28`,
                          borderColor: resolvedAccentHex,
                        }
                      : undefined
                  }
                  className={`p-2.5 rounded-xl border text-left transition ${
                    active
                      ? 'text-white shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{rm.label}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">{rm.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D Positioning (Azimuth, Elevation, Distance, Orbit Speed) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/80">
              2. 3D サウンドステージ定位 (HRTF 音源位置)
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { label: '正面', az: 0, el: 0, dist: 1.2 },
                { label: '前方ワイド', az: 25, el: 12, dist: 1.6 },
                { label: '頭上ドーム', az: 0, el: 40, dist: 1.8 },
                { label: 'ライブ最前列', az: -15, el: 5, dist: 0.9 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    updateSpatialDetails({
                      azimuthDeg: p.az,
                      elevationDeg: p.el,
                      distanceMeters: p.dist,
                      autoOrbit: false,
                    })
                  }
                  className="px-2 py-0.5 rounded-md bg-white/[0.07] hover:bg-white/15 text-[10px] font-semibold text-white/80"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">水平方位角 (Azimuth 左右角度)</span>
                <span className="font-mono font-bold text-white">{spatialDetails.azimuthDeg}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={spatialDetails.azimuthDeg}
                onChange={(e) =>
                  updateSpatialDetails({ azimuthDeg: Number(e.target.value), autoOrbit: false })
                }
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>-180° (左後方)</span>
                <span>0° (正面)</span>
                <span>+180° (右後方)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">垂直仰角 (Elevation 高さ角度)</span>
                <span className="font-mono font-bold text-white">{spatialDetails.elevationDeg}°</span>
              </div>
              <input
                type="range"
                min={-45}
                max={45}
                step={1}
                value={spatialDetails.elevationDeg}
                onChange={(e) => updateSpatialDetails({ elevationDeg: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>-45° (下方)</span>
                <span>0° (耳の高さ)</span>
                <span>+45° (頭上)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">音源距離 (Distance 奥行き)</span>
                <span className="font-mono font-bold text-white">
                  {spatialDetails.distanceMeters.toFixed(1)} m
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={spatialDetails.distanceMeters}
                onChange={(e) => updateSpatialDetails({ distanceMeters: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>0.5m (耳元)</span>
                <span>2.0m (標準)</span>
                <span>5.0m (ホール奥)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">ステレオ拡張幅 (Stereo Width)</span>
                <span className="font-mono font-bold text-white">{spatialDetails.stereoWidth}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={200}
                step={5}
                value={spatialDetails.stereoWidth}
                onChange={(e) => updateSpatialDetails({ stereoWidth: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>50% (ナロー)</span>
                <span>100% (原音)</span>
                <span>200% (超ワイド)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Acoustic Character & Psychoacoustic Sliders */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-bold text-white/80">
            3. 空間残響・低域LFE・ボーカル明瞭度・超高域Air調整
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">空間リバーブ量 (Wet)</span>
                <span className="font-mono text-white">{spatialDetails.reverbWet}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={spatialDetails.reverbWet}
                onChange={(e) => updateSpatialDetails({ reverbWet: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">残響ディケイ時間</span>
                <span className="font-mono text-white">{spatialDetails.roomDecaySec.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={6.0}
                step={0.1}
                value={spatialDetails.roomDecaySec}
                onChange={(e) => updateSpatialDetails({ roomDecaySec: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">バイノーラル Crossfeed</span>
                <span className="font-mono text-white">{spatialDetails.crossfeed}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={spatialDetails.crossfeed}
                onChange={(e) => updateSpatialDetails({ crossfeed: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">LFE 重低音ブースト (55Hz)</span>
                <span className="font-mono text-white">
                  {spatialDetails.subBassBoostDb >= 0 ? `+${spatialDetails.subBassBoostDb}` : spatialDetails.subBassBoostDb} dB
                </span>
              </div>
              <input
                type="range"
                min={-6}
                max={12}
                step={0.5}
                value={spatialDetails.subBassBoostDb}
                onChange={(e) => updateSpatialDetails({ subBassBoostDb: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">ボーカル定位明瞭度 (2.8kHz)</span>
                <span className="font-mono text-white">
                  {spatialDetails.vocalClarityDb >= 0 ? `+${spatialDetails.vocalClarityDb}` : spatialDetails.vocalClarityDb} dB
                </span>
              </div>
              <input
                type="range"
                min={-6}
                max={12}
                step={0.5}
                value={spatialDetails.vocalClarityDb}
                onChange={(e) => updateSpatialDetails({ vocalClarityDb: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">超高域 Air 輝き (12kHz)</span>
                <span className="font-mono text-white">
                  {spatialDetails.airBrillianceDb >= 0 ? `+${spatialDetails.airBrillianceDb}` : spatialDetails.airBrillianceDb} dB
                </span>
              </div>
              <input
                type="range"
                min={-6}
                max={12}
                step={0.5}
                value={spatialDetails.airBrillianceDb}
                onChange={(e) => updateSpatialDetails({ airBrillianceDb: Number(e.target.value) })}
                style={{ accentColor: resolvedAccentHex }}
                className="w-full cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const showMaximizedArtworkBg = activeNav === 'lyrics' || isArtworkMaximized;

  return (
    <div className="flex h-full w-full flex-col bg-[#0f1116] text-white select-none overflow-hidden font-sans relative">
      {/* ===================================================================
          EXTERNAL PLAYLIST IMPORT MODAL (Spotify / Apple Music / YouTube Music)
         =================================================================== */}
      {showImportModal && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl animate-fadeIn"
          onClick={() => setShowImportModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl apple-liquid-glass border border-white/20 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  別サービスからプレイリストをインポート
                </h2>
                <p className="text-xs text-white/55 mt-0.5">
                  Spotify、Apple Music、YouTube Music の共有URLまたは曲リストを取り込みます
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/75"
              >
                ✕
              </button>
            </div>

            {/* Service Selector */}
            <div className="grid grid-cols-4 gap-2">
              {(['Spotify', 'Apple Music', 'YouTube Music', 'URL / テキスト'] as const).map(
                (srv) => {
                  const active = importService === srv;
                  return (
                    <button
                      key={srv}
                      type="button"
                      onClick={() => setImportService(srv)}
                      style={
                        active
                          ? {
                              backgroundColor: `${resolvedAccentHex}30`,
                              borderColor: resolvedAccentHex,
                            }
                          : undefined
                      }
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                        active
                          ? 'text-white'
                          : 'bg-white/[0.04] border-white/10 text-white/65 hover:text-white'
                      }`}
                    >
                      {srv}
                    </button>
                  );
                }
              )}
            </div>

            {/* Quick One-Click Sample Playlists from External Services */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-white/60">
                ワンクリックで人気プレイリストを取り込む:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    service: 'Spotify' as const,
                    name: 'Spotify Top Hits Japan',
                    rawText: 'YOASOBI - アイドル\n米津玄師 - KICK BACK\nCreepy Nuts - Bling-Bang-Bang-Born\nMrs. GREEN APPLE - ライラック',
                  },
                  {
                    service: 'Apple Music' as const,
                    name: 'Apple Music J-Pop Now',
                    rawText: 'Vaundy - 怪獣の花唄\nOfficial髭男dism - Subtitle\nAdo - 唱\n藤井 風 - 満ちてゆく',
                  },
                  {
                    service: 'YouTube Music' as const,
                    name: 'YouTube Anime & Viral',
                    rawText: 'YOASOBI - 勇者\nKing Gnu - SPECIALZ\nCreepy Nuts - オトノケ\nDaft Punk - One More Time',
                  },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={isImportingPlaylist}
                    onClick={() => handleImportExternalPlaylist(undefined, preset)}
                    className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-left transition"
                  >
                    <div
                      className="text-[10px] font-bold"
                      style={{ color: resolvedAccentHex }}
                    >
                      {preset.service}
                    </div>
                    <div className="text-xs font-semibold text-white truncate mt-0.5">
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleImportExternalPlaylist} className="space-y-3">
              <div>
                <label className="text-xs text-white/70 block mb-1">
                  プレイリスト名 (任意)
                </label>
                <input
                  value={importPlaylistName}
                  onChange={(e) => setImportPlaylistName(e.target.value)}
                  placeholder={`${importService} マイプレイリスト`}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">
                  プレイリストURL または 曲リスト (1行に1曲「アーティスト - 曲名」)
                </label>
                <textarea
                  value={importSourceUrlOrText}
                  onChange={(e) => setImportSourceUrlOrText(e.target.value)}
                  rows={4}
                  placeholder={`https://open.spotify.com/playlist/...\nまたは:\nYOASOBI - 夜に駆ける\n米津玄師 - Lemon\nOfficial髭男dism - Pretender`}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/80"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isImportingPlaylist || !importSourceUrlOrText.trim()}
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg disabled:opacity-40 transition"
                >
                  {isImportingPlaylist ? 'インポート中...' : 'インポート実行'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          USER CUSTOM PLAYLIST CREATION MODAL (自分でプレイリスト作成)
         =================================================================== */}
      {showCreatePlaylistModal && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl animate-fadeIn"
          onClick={() => setShowCreatePlaylistModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl apple-liquid-glass border border-white/20 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">新しいプレイリストを作成</h2>
                <p className="text-xs text-white/55 mt-0.5">
                  自分だけのオリジナルプレイリストを作成して楽曲を自由に追加できます
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePlaylistModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/75"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomPlaylist} className="space-y-3.5">
              <div>
                <label className="text-xs text-white/75 block mb-1 font-semibold">
                  プレイリスト名
                </label>
                <input
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  placeholder={`マイプレイリスト #${userPlaylists.length + 1}`}
                  autoFocus
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-white/75 block mb-1 font-semibold">
                  説明・メモ (任意)
                </label>
                <input
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="作業用BGM、ドライブ用、お気に入り曲など"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none"
                />
              </div>

              {currentTrack && (
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.05] border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCurrentTrackInNew}
                    onChange={(e) => setIncludeCurrentTrackInNew(e.target.checked)}
                    style={{ accentColor: resolvedAccentHex }}
                    className="rounded"
                  />
                  <span className="text-xs text-white/85 truncate">
                    現在選択中の曲「{currentTrack.title}」を最初の曲として追加する
                  </span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/80"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition"
                >
                  作成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          ADD TRACK TO USER PLAYLIST MODAL (+PL Picker)
         =================================================================== */}
      {trackForPlaylistPicker && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl animate-fadeIn"
          onClick={() => setTrackForPlaylistPicker(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl apple-liquid-glass border border-white/20 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">
                  プレイリストに曲を追加
                </h2>
                <p className="text-xs text-white/60 truncate mt-0.5">
                  対象曲: {trackForPlaylistPicker.title} — {trackForPlaylistPicker.artist}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrackForPlaylistPicker(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/75"
              >
                ✕
              </button>
            </div>

            {userPlaylists.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-white/60">
                  まだカスタムプレイリストがありません。新しく作成してこの曲を追加しましょう！
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const target = trackForPlaylistPicker;
                    setTrackForPlaylistPicker(null);
                    const customPl: MusicCollectionViewData = {
                      id: `pl-user-${Date.now()}`,
                      kind: 'PLAYLIST',
                      title: 'マイプレイリスト #1',
                      subtitle: '自分で作成したカスタムプレイリスト',
                      creator: 'あなた (Glassium User)',
                      year: new Date().getFullYear(),
                      artworkUrl: target.artworkUrl || '',
                      coverGradient: 'from-cyan-600 via-blue-900 to-slate-950',
                      sourceService: 'カスタム作成',
                      tracks: [target],
                    };
                    setUserPlaylists((prev) => [customPl, ...prev]);
                    setSelectedCollection(customPl);
                    setActiveNav('collection-detail');
                    setStatusBanner(`「マイプレイリスト #1」を作成し、「${target.title}」を追加しました`);
                  }}
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg"
                >
                  + 新規プレイリストを作成して追加
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {userPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => handleAddTrackToPlaylist(pl.id, trackForPlaylistPicker)}
                    className="w-full p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.14] border border-white/10 flex items-center justify-between text-left transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{pl.title}</div>
                      <div className="text-[10px] text-white/50">
                        {pl.tracks.length}曲 · {pl.creator}
                      </div>
                    </div>
                    <span
                      style={{ backgroundColor: resolvedAccentHex }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shrink-0"
                    >
                      + 追加
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          ARTWORK-ADAPTIVE MOVING GRADIENT ENGINE
         =================================================================== */}
      {showMaximizedArtworkBg && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-700">
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
          <div className="absolute inset-0 bg-[#0b0c12]/60 backdrop-blur-[36px]" />
        </div>
      )}

      {/* ===================================================================
          MAXIMIZED ARTWORK OVERLAY MODAL
         =================================================================== */}
      {isArtworkMaximized && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 pb-36 bg-black/40 backdrop-blur-xl animate-fadeIn"
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
              <span>閉じる</span>
            </button>
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border border-white/30 shadow-2xl bg-zinc-900">
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
                className="text-sm font-semibold text-white/85 hover:underline transition"
              >
                {cleanPrimaryArtistName(currentTrack.artist)}
              </button>
              <p className="text-xs text-white/55">{currentTrack.album}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          IN-APP TOP MUSIC PILL / DOCK BAR (Matches ClockApp Top Timer Pill)
         =================================================================== */}
      <div className="relative z-20 flex items-center justify-center px-3 pt-2 pb-0.5 shrink-0">
        <div
          onClick={() => setActiveNav('lyrics')}
          className="cursor-pointer px-4 py-1.5 rounded-full bg-black/55 backdrop-blur-2xl border border-white/20 hover:border-white/35 shadow-xl flex items-center gap-3 max-w-full transition-all duration-300"
          title="クリックして Apple Music ライブ歌詞を表示"
        >
          {/* Smooth Circular Track Progress Ring + Artwork */}
          <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="2.8"
                fill="transparent"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                stroke={artworkPalette.c1 || resolvedAccentHex}
                strokeWidth="2.8"
                fill="transparent"
                strokeDasharray="94.25"
                strokeDashoffset={
                  94.25 -
                  (94.25 *
                    Math.min(
                      100,
                      (currentTime / Math.max(1, currentTrack.duration || 210)) * 100
                    )) /
                    100
                }
                strokeLinecap="round"
                className="clock-timer-progress-circle is-running"
              />
            </svg>
            <div className="absolute inset-[3.5px] rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt=""
                  className={`w-full h-full object-cover ${
                    isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                  }`}
                />
              ) : (
                <span className="material-symbols-rounded text-[12px] text-white/80">
                  music_note
                </span>
              )}
            </div>
          </div>

          {/* Track Readout & Active Lyric Snippet */}
          <div className="min-w-0 max-w-[200px] sm:max-w-[340px] flex flex-col justify-center">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider shrink-0"
                style={{ color: resolvedAccentHex }}
              >
                NOW PLAYING
              </span>
              <span className="text-xs font-extrabold text-white truncate">
                {currentTrack.title}
              </span>
              <span className="text-[10px] text-white/60 truncate">
                · {cleanPrimaryArtistName(currentTrack.artist)}
              </span>
            </div>
            <div className="text-[10px] text-white/85 truncate font-medium">
              {currentTrack.lyrics && currentLyricIndex >= 0 && currentTrack.lyrics[currentLyricIndex]
                ? `♪ ${currentTrack.lyrics[currentLyricIndex].text}`
                : `${formatSecs(currentTime)} / ${formatSecs(currentTrack.duration)}`}
            </div>
          </div>

          {/* Transport Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 border-l border-white/15 pl-2.5 shrink-0"
          >
            <button
              type="button"
              onClick={prevTrack}
              className="w-6 h-6 rounded-full hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="前の曲"
            >
              <span className="material-symbols-rounded text-[16px]">skip_previous</span>
            </button>
            <button
              type="button"
              onClick={togglePlay}
              style={{ backgroundColor: isPlaying ? '#fbbf24' : resolvedAccentHex }}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-slate-950 hover:brightness-110 transition cursor-pointer"
            >
              {isPlaying ? '一時停止' : '再生'}
            </button>
            <button
              type="button"
              onClick={nextTrack}
              className="w-6 h-6 rounded-full hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="次の曲"
            >
              <span className="material-symbols-rounded text-[16px]">skip_next</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          MAIN SPOTIFY-INSPIRED LIQUID GLASS WORKSPACE
         =================================================================== */}
      <div className="relative z-10 flex-1 min-h-0 flex overflow-hidden p-2 gap-2">
        {/* -----------------------------------------------------------------
            LEFT SIDEBAR (Spotify + GlassiumOS Liquid Glass Panel)
           ----------------------------------------------------------------- */}
        <aside className="w-60 rounded-2xl apple-liquid-glass border border-white/[0.12] flex flex-col justify-between p-3 pb-36 shrink-0 overflow-y-auto">
          <div className="space-y-4">
            {/* Brand Header */}
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-2">
                <div
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-md"
                >
                  <span className="material-symbols-rounded text-[18px]">graphic_eq</span>
                </div>
                <div>
                  <div className="text-xs font-extrabold tracking-tight text-white">
                    Glassium Groove
                  </div>
                  <div className="text-[10px] text-white/45 font-mono">GlassiumOS 5 u4</div>
                </div>
              </div>
            </div>

            {/* Primary Navigation (Home / Search / Library / Lyrics / Settings) */}
            <div className="space-y-1">
              {(
                [
                  { id: 'home', label: 'ホーム', icon: 'home' },
                  { id: 'browse', label: '検索', icon: 'search' },
                  { id: 'lyrics', label: '歌詞 & 翻訳', icon: 'translate' },
                  { id: 'mv', label: 'ミュージックビデオ', icon: 'smart_display' },
                  { id: 'artist', label: 'アーティスト', icon: 'person' },
                  { id: 'eq', label: 'イコライザー (EQ)', icon: 'equalizer' },
                  { id: 'settings', label: '設定', icon: 'settings' },
                ] as { id: MusicNavId; label: string; icon: string }[]
              ).map((item) => {
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    style={
                      active
                        ? {
                            backgroundColor: resolvedAccentHex,
                            color: '#ffffff',
                          }
                        : undefined
                    }
                    className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      active
                        ? 'shadow-md'
                        : 'text-white/75 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-rounded text-[18px] shrink-0">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Your Library & Playlists Section (with Create & External Service Import Buttons) */}
            <div className="pt-2 border-t border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                  マイライブラリ
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreatePlaylistModal(true)}
                    style={{ color: resolvedAccentHex }}
                    className="text-[11px] font-bold hover:underline flex items-center gap-0.5"
                    title="自分で新しいプレイリストを作成"
                  >
                    <span className="material-symbols-rounded text-[15px]">playlist_add</span>
                    <span>作成</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="text-[11px] font-bold text-white/70 hover:text-white hover:underline flex items-center gap-0.5"
                    title="Spotify / Apple Music / YouTube Music からプレイリストを取り込む"
                  >
                    <span className="material-symbols-rounded text-[15px]">add</span>
                    <span>取込</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylistModal(true)}
                  className="py-2 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-left flex items-center gap-2 transition"
                >
                  <div
                    style={{ backgroundColor: `${resolvedAccentHex}28`, color: resolvedAccentHex }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <span className="material-symbols-rounded text-[16px]">add</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">新規作成</div>
                    <div className="text-[9px] text-white/50 truncate">自作リスト</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="py-2 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-left flex items-center gap-2 transition"
                >
                  <div
                    style={{ backgroundColor: `${resolvedAccentHex}28`, color: resolvedAccentHex }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <span className="material-symbols-rounded text-[16px]">cloud_download</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">外部取込</div>
                    <div className="text-[9px] text-white/50 truncate">Spotify等</div>
                  </div>
                </button>
              </div>

              {/* Playlists, Albums, EPs, Singles quick list */}
              <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                {allPlaylistsAndCollections.map((col) => {
                  const isSelected =
                    activeNav === 'collection-detail' && selectedCollection.id === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => openCollectionDetail(col)}
                      className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl text-left transition ${
                        isSelected ? 'bg-white/[0.14]' : 'hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
                        {col.artworkUrl ? (
                          <img
                            src={col.artworkUrl}
                            alt={col.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${col.coverGradient}`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">
                          {col.title}
                        </div>
                        <div className="text-[10px] text-white/45 truncate">
                          {col.kind} · {col.creator}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Songs & Recent Library Shortcuts */}
              <div className="pt-1 space-y-1">
                {(
                  [
                    { id: 'songs', label: 'すべての曲', count: tracks.length, icon: 'library_music' },
                    { id: 'recent', label: '再生履歴', count: recentTracks.length, icon: 'history' },
                    { id: 'synth', label: 'シンセサイザー', count: 0, icon: 'piano' },
                  ] as { id: MusicNavId; label: string; count: number; icon: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                      activeNav === item.id
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="material-symbols-rounded text-[16px]">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count > 0 && (
                      <span className="text-[10px] font-mono text-white/40">{item.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* -----------------------------------------------------------------
            MAIN STAGE (Rounded Liquid Glass Viewport)
           ----------------------------------------------------------------- */}
        <main className="flex-1 min-w-0 rounded-2xl apple-liquid-glass border border-white/[0.12] flex overflow-hidden relative">
          {/* ===============================================================
              VIEW 1: MAIN HOME VIEW (3枚目: Spotify風 2列クイックカード + 横シェルフ + Liquid Glass)
             =============================================================== */}
          {activeNav === 'home' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-8">
              {/* Top Filter Chips & Import Button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {(
                    [
                      { id: 'all', label: 'すべて' },
                      { id: 'music', label: '音楽' },
                      { id: 'playlists', label: 'プレイリスト' },
                      { id: 'albums', label: 'アルバム・EP・シングル' },
                    ] as const
                  ).map((chip) => {
                    const active = homeFilterChip === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setHomeFilterChip(chip.id)}
                        style={
                          active
                            ? { backgroundColor: resolvedAccentHex, color: '#ffffff' }
                            : undefined
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                          active
                            ? 'shadow-md'
                            : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.14]'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreatePlaylistModal(true)}
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition"
                  >
                    <span className="material-symbols-rounded text-[16px]">playlist_add</span>
                    <span>+ 自分でプレイリスト作成</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                  >
                    <span className="material-symbols-rounded text-[16px]">cloud_download</span>
                    <span>他サービスから取込</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav('browse')}
                    className="px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                  >
                    <span className="material-symbols-rounded text-[16px]">search</span>
                    <span>検索</span>
                  </button>
                </div>
              </div>

              {/* Spotify-Style 2/3-Column Top Quick-Access Grid (6 Horizontal Liquid Glass Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allPlaylistsAndCollections.slice(0, 6).map((col) => (
                  <div
                    key={col.id}
                    onClick={() => openCollectionDetail(col)}
                    className="group relative flex items-center justify-between rounded-xl overflow-hidden bg-white/[0.06] hover:bg-white/[0.13] border border-white/[0.08] transition cursor-pointer pr-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 bg-zinc-900 shrink-0 overflow-hidden">
                        {col.artworkUrl ? (
                          <img
                            src={col.artworkUrl}
                            alt={col.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${col.coverGradient}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {col.title}
                        </div>
                        <div className="text-[10px] text-white/50 truncate mt-0.5">
                          {col.kind} · {col.creator}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (col.tracks.length > 0) {
                          playTrack(col.tracks[0]);
                        } else {
                          openCollectionDetail(col);
                        }
                      }}
                      style={{ backgroundColor: resolvedAccentHex }}
                      className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition duration-200 shrink-0"
                    >
                      <span className="material-symbols-rounded text-xl">play_arrow</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Shelf 1: Playlists & Imported Collections (Clicking opens 2nd-image Detail Layout) */}
              {(homeFilterChip === 'all' || homeFilterChip === 'playlists') && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                      おすすめプレイリスト
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      style={{ color: resolvedAccentHex }}
                      className="text-xs font-bold hover:underline"
                    >
                      + 別サービスからインポート
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {allPlaylistsAndCollections
                      .filter((c) => c.kind === 'PLAYLIST')
                      .map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => openCollectionDetail(pl)}
                          className="group p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition cursor-pointer flex flex-col gap-3"
                        >
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 shadow-lg">
                            {pl.artworkUrl ? (
                              <img
                                src={pl.artworkUrl}
                                alt={pl.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${pl.coverGradient}`} />
                            )}
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-white border border-white/15">
                              {pl.sourceService || 'PLAYLIST'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (pl.tracks.length > 0) playTrack(pl.tracks[0]);
                              }}
                              style={{ backgroundColor: resolvedAccentHex }}
                              className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full text-white flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition duration-200"
                            >
                              <span className="material-symbols-rounded text-2xl">play_arrow</span>
                            </button>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-white truncate">
                              {pl.title}
                            </div>
                            <div className="text-[11px] text-white/50 line-clamp-2 mt-0.5">
                              {pl.subtitle}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* Shelf 2: Popular Albums, EPs & Singles (Clicking opens 2nd-image Detail Layout) */}
              {(homeFilterChip === 'all' || homeFilterChip === 'albums') && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                      人気のアルバム・EP・シングル
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {allPlaylistsAndCollections
                      .filter((c) => c.kind !== 'PLAYLIST')
                      .map((alb) => (
                        <div
                          key={alb.id}
                          onClick={() => openCollectionDetail(alb)}
                          className="group p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition cursor-pointer flex flex-col gap-3"
                        >
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 shadow-lg">
                            {alb.artworkUrl ? (
                              <img
                                src={alb.artworkUrl}
                                alt={alb.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${alb.coverGradient}`} />
                            )}
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-white border border-white/15">
                              {alb.kind}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (alb.tracks.length > 0) playTrack(alb.tracks[0]);
                              }}
                              style={{ backgroundColor: resolvedAccentHex }}
                              className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full text-white flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition duration-200"
                            >
                              <span className="material-symbols-rounded text-2xl">play_arrow</span>
                            </button>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-white truncate">
                              {alb.title}
                            </div>
                            <div className="text-[11px] text-white/50 truncate mt-0.5">
                              {alb.year}年 · {alb.creator}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* Shelf 3: Quick Play Tracks */}
              {(homeFilterChip === 'all' || homeFilterChip === 'music') && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                      人気の楽曲
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveNav('songs')}
                      className="text-xs text-white/60 hover:text-white"
                    >
                      すべて表示
                    </button>
                  </div>
                  {renderSpotifyTrackTable(tracks.slice(0, 8), '楽曲がありません')}
                </section>
              )}
            </div>
          )}

          {/* ===============================================================
              VIEW 2: COLLECTION DETAIL VIEW (2枚目: プレイリスト・アルバム・EP・シングル詳細画面)
             =============================================================== */}
          {activeNav === 'collection-detail' && (
            <div className="flex-1 overflow-y-auto pb-36">
              {/* Top Gradient & Liquid Glass Header */}
              <div
                className={`relative p-6 sm:p-8 bg-gradient-to-b ${selectedCollection.coverGradient} border-b border-white/10`}
              >
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveNav(previousNav === 'collection-detail' ? 'home' : previousNav)}
                    className="px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 text-xs font-semibold text-white flex items-center gap-1 transition"
                  >
                    <span className="material-symbols-rounded text-sm">arrow_back</span>
                    <span>戻る</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                  {/* Large Cover Artwork */}
                  <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-zinc-900 shadow-[0_24px_60px_rgba(0,0,0,0.75)] border border-white/20 shrink-0">
                    {selectedCollection.artworkUrl ? (
                      <img
                        src={selectedCollection.artworkUrl}
                        alt={selectedCollection.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${selectedCollection.coverGradient}`}
                      />
                    )}
                  </div>

                  {/* Metadata Column */}
                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-black/40 border border-white/15 text-[11px] font-mono font-bold uppercase tracking-wider text-white/90">
                      <span>{selectedCollection.kind}</span>
                      {selectedCollection.sourceService && (
                        <span>· {selectedCollection.sourceService}</span>
                      )}
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                      {selectedCollection.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-white/75 max-w-2xl">
                      {selectedCollection.subtitle}
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-white/80 pt-1">
                      <span className="font-bold text-white">{selectedCollection.creator}</span>
                      <span>•</span>
                      <span>{selectedCollection.year}年</span>
                      <span>•</span>
                      <span>{selectedCollection.tracks.length}曲</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Controls Bar (Large Circular OS-Accent Play Button, Shuffle, Import) */}
              <div className="px-6 sm:px-8 py-5 flex items-center gap-4 border-b border-white/[0.06] bg-black/20">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCollection.tracks.length > 0) {
                      playTrack(selectedCollection.tracks[0]);
                    }
                  }}
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition"
                  title="再生"
                >
                  <span
                    className="material-symbols-rounded text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_arrow
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShuffle((s) => !s)}
                  style={isShuffle ? { color: resolvedAccentHex } : undefined}
                  className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/75 transition"
                  title="シャッフル再生"
                >
                  <span className="material-symbols-rounded text-xl">shuffle</span>
                </button>

                {selectedCollection.id.startsWith('pl-user-') && currentTrack && (
                  <button
                    type="button"
                    onClick={() => handleAddTrackToPlaylist(selectedCollection.id, currentTrack)}
                    style={{ backgroundColor: `${resolvedAccentHex}30`, borderColor: resolvedAccentHex }}
                    className="px-4 py-2 rounded-full border text-xs font-bold text-white flex items-center gap-1.5 transition"
                  >
                    <span className="material-symbols-rounded text-sm">add</span>
                    <span>再生中の曲「{currentTrack.title}」をここに追加</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCreatePlaylistModal(true)}
                  className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                >
                  <span className="material-symbols-rounded text-sm">playlist_add</span>
                  <span>新規プレイリスト作成</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                >
                  <span className="material-symbols-rounded text-sm">cloud_download</span>
                  <span>別サービスから追加</span>
                </button>
              </div>

              {/* Numbered Tracklist Table */}
              <div className="p-6 sm:p-8 pt-4">
                {renderSpotifyTrackTable(
                  selectedCollection.tracks,
                  'このコレクションにはまだ曲がありません'
                )}
              </div>
            </div>
          )}

          {/* ===============================================================
              VIEW 3: SEARCH VIEW (1枚目: Spotify風 検索バー + カラフルなブラウズタイル + Liquid Glass)
             =============================================================== */}
          {activeNav === 'browse' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-7">
              {/* Top Search Header Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleOnlineMusicSearch();
                  }}
                  className="flex-1 max-w-xl flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] focus-within:bg-white/[0.14] border border-white/15 rounded-full px-4 py-2.5 shadow-inner transition"
                >
                  <span className="material-symbols-rounded text-white/60 text-xl">search</span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="何を聴きたいですか？ (曲名・アーティスト・アルバム)"
                    className="bg-transparent text-white placeholder-white/45 outline-none w-full text-xs sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setLastSearchedQuery('');
                        setTracks(INITIAL_ENRICHED_CATALOG);
                      }}
                      className="text-xs text-white/50 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </form>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOnlineMusicSearch()}
                    disabled={isSearchingOnline}
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-5 py-2.5 rounded-full text-white text-xs font-bold shadow-md transition"
                  >
                    {isSearchingOnline ? '検索中...' : '検索'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white transition"
                  >
                    プレイリスト取込
                  </button>
                </div>
              </div>

              {/* Search Results Top Card + Songs when searching */}
              {searchQuery.trim() && filteredTracks.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Top Result Card */}
                  <div className="lg:col-span-5 space-y-3">
                    <h2 className="text-base font-extrabold text-white">上位の検索結果</h2>
                    <div
                      onClick={() => playTrack(filteredTracks[0])}
                      className="group p-5 rounded-2xl apple-liquid-glass border border-white/15 hover:bg-white/[0.08] transition cursor-pointer relative space-y-4"
                    >
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-900 shadow-xl">
                        {filteredTracks[0].artworkUrl ? (
                          <img
                            src={filteredTracks[0].artworkUrl}
                            alt={filteredTracks[0].title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${filteredTracks[0].coverGradient}`}
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-xl font-black text-white truncate">
                          {filteredTracks[0].title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/65 mt-1">
                          <span>曲</span>
                          <span>•</span>
                          <span className="font-bold text-white">{filteredTracks[0].artist}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{ backgroundColor: resolvedAccentHex }}
                        className="absolute bottom-5 right-5 w-12 h-12 rounded-full text-white flex items-center justify-center shadow-xl"
                      >
                        <span className="material-symbols-rounded text-2xl">play_arrow</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Top 4 Songs */}
                  <div className="lg:col-span-7 space-y-3">
                    <h2 className="text-base font-extrabold text-white">曲</h2>
                    <div className="space-y-1">
                      {filteredTracks.slice(0, 4).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => playTrack(t)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.07] cursor-pointer transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                              {t.artworkUrl && (
                                <img
                                  src={t.artworkUrl}
                                  alt={t.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">{t.title}</div>
                              <div className="text-[11px] text-white/55 truncate">{t.artist}</div>
                            </div>
                          </div>
                          <div className="text-xs font-mono text-white/50">
                            {formatSecs(t.duration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Spotify-Style "すべて閲覧" (Browse All Category Cards with Liquid Glass) */}
              <div className="space-y-3">
                <h2 className="text-lg font-extrabold tracking-tight text-white">
                  すべて閲覧
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {SPOTIFY_SEARCH_CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setSearchQuery(cat.query);
                        handleOnlineMusicSearch(cat.query);
                      }}
                      className={`group relative h-28 sm:h-32 rounded-2xl overflow-hidden p-4 bg-gradient-to-br ${cat.gradient} border border-white/20 shadow-lg cursor-pointer hover:scale-[1.02] transition`}
                    >
                      <div className="text-sm sm:text-base font-extrabold text-white tracking-tight relative z-10">
                        {cat.title}
                      </div>
                      {cat.coverUrl && (
                        <img
                          src={cat.coverUrl}
                          alt={cat.title}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shadow-2xl absolute -bottom-2 -right-2 rotate-[22deg] group-hover:rotate-[14deg] group-hover:scale-105 transition duration-300 border border-white/20"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Search Results Table */}
              <div className="space-y-3">
                <h2 className="text-base font-bold text-white">
                  楽曲一覧 ({filteredTracks.length}曲)
                </h2>
                {renderSpotifyTrackTable(filteredTracks, '検索結果がありません')}
              </div>
            </div>
          )}

          {/* ===============================================================
              VIEW 4: SETTINGS TAB (4枚目: Spotify風 クリーン設定UI + 音質 + EQ + バージョン仕様)
             =============================================================== */}
          {activeNav === 'settings' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 pb-36">
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="border-b border-white/10 pb-4">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    設定
                  </h1>
                  <p className="text-xs text-white/55 mt-1">
                    音質、イコライザー (EQ)、プレイリスト連携、およびバージョン情報
                  </p>
                </div>

                {/* Section 1: 音質 (Audio Quality) */}
                <section className="rounded-2xl apple-liquid-glass border border-white/15 p-5 space-y-4">
                  <h2 className="text-base font-bold text-white">音質</h2>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        ストリーミング音質
                      </div>
                      <div className="text-[11px] text-white/55">
                        オンライン再生時のビットレートを選択します
                      </div>
                    </div>
                    <select
                      value={musicSettings.streamingQuality}
                      onChange={(e) => {
                        const val = e.target.value as MusicSettingsConfig['streamingQuality'];
                        updateMusicSettings({ streamingQuality: val });
                      }}
                      className="bg-black/60 border border-white/20 rounded-xl px-3.5 py-2 text-xs font-semibold text-white outline-none"
                    >
                      <option value="128">標準 (128 kbps)</option>
                      <option value="192">高音質 (192 kbps)</option>
                      <option value="320">最高音質 (320 kbps)</option>
                      <option value="lossless">ロスレス (FLAC)</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-white/[0.06]">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        ダウンロード音質
                      </div>
                      <div className="text-[11px] text-white/55">
                        楽曲をローカルに保存する際のフォーマット
                      </div>
                    </div>
                    <select
                      value={musicSettings.downloadQuality}
                      onChange={(e) => {
                        const val = e.target.value as MusicSettingsConfig['downloadQuality'];
                        updateMusicSettings({ downloadQuality: val });
                      }}
                      className="bg-black/60 border border-white/20 rounded-xl px-3.5 py-2 text-xs font-semibold text-white outline-none"
                    >
                      <option value="128">128 kbps MP3</option>
                      <option value="192">192 kbps MP3</option>
                      <option value="320">320 kbps MP3/M4A</option>
                      <option value="flac">FLAC ロスレス</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        音源ストリーム取得先
                      </div>
                      <div className="text-[11px] text-white/55">
                        優先して使用する音源サーバー
                      </div>
                    </div>
                    <select
                      value={musicSettings.sourceSite}
                      onChange={(e) => {
                        const val = e.target.value as MusicSettingsConfig['sourceSite'];
                        updateMusicSettings({ sourceSite: val });
                      }}
                      className="bg-black/60 border border-white/20 rounded-xl px-3.5 py-2 text-xs font-semibold text-white outline-none"
                    >
                      <option value="auto">自動選択 (推奨)</option>
                      <option value="monochrome">api.monochrome.tf</option>
                      <option value="saavn">JioSaavn (320kbps)</option>
                      <option value="netease">NetEase Cloud</option>
                      <option value="kuwo">Kuwo</option>
                    </select>
                  </div>
                </section>

                {/* Section 2: イコライザー (EQ) & 立体音響 */}
                <section className="rounded-2xl apple-liquid-glass border border-white/15 p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">
                        イコライザー (EQ) &amp; 立体音響
                      </h2>
                      <p className="text-[11px] text-white/55">
                        10バンド周波数調整および空間オーディオ設定
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateMusicSettings({
                          dolbyAtmosEnabled: !musicSettings.dolbyAtmosEnabled,
                        })
                      }
                      style={
                        musicSettings.dolbyAtmosEnabled
                          ? { backgroundColor: resolvedAccentHex }
                          : undefined
                      }
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                        musicSettings.dolbyAtmosEnabled
                          ? 'text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      立体音響: {musicSettings.dolbyAtmosEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <MusicEqualizerPanel
                    currentTrackGenre={currentTrack.genre}
                    onStatusMessage={(msg) => setStatusBanner(msg)}
                  />
                </section>

                {/* Section 2.5: 3D 立体音響 (HRTF Spatial Audio) 詳細設定 */}
                {renderSpatialAudioDetailPanel()}

                {/* Section 3: 歌詞翻訳 & 外部プレイリスト連携 */}
                <section className="rounded-2xl apple-liquid-glass border border-white/15 p-5 space-y-4">
                  <h2 className="text-base font-bold text-white">
                    歌詞翻訳 &amp; プレイリスト連携
                  </h2>

                  <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        歌詞の自動翻訳を表示
                      </div>
                      <div className="text-[11px] text-white/55">
                        日本語は英語に、英語は日本語に、その他の言語は日本語に翻訳します
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLyricsTranslation((v) => !v)}
                      style={
                        showLyricsTranslation
                          ? { backgroundColor: resolvedAccentHex }
                          : undefined
                      }
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                        showLyricsTranslation ? 'text-white' : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {showLyricsTranslation ? '有効' : '無効'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        外部サービスからプレイリストをインポート
                      </div>
                      <div className="text-[11px] text-white/55">
                        Spotify、Apple Music、YouTube Music のプレイリストを取り込みます
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      style={{ backgroundColor: resolvedAccentHex }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white transition"
                    >
                      インポート画面を開く
                    </button>
                  </div>
                </section>

                {/* Section 4: バージョン・仕様情報 (GlassiumOS 5 u4) */}
                <section className="rounded-2xl apple-liquid-glass border border-white/15 p-5 space-y-3">
                  <h2 className="text-base font-bold text-white">バージョン・仕様</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="text-white/50 text-[11px]">システムバージョン</div>
                      <div className="font-bold text-white mt-0.5">GlassiumOS 5 u4</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="text-white/50 text-[11px]">アプリケーション</div>
                      <div className="font-bold text-white mt-0.5">
                        Glassium Groove 5.0 u4
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="text-white/50 text-[11px]">オーディオ処理</div>
                      <div className="font-bold text-white mt-0.5">
                        Web Audio 10バンド BiquadFilter EQ
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="text-white/50 text-[11px]">歌詞・翻訳仕様</div>
                      <div className="font-bold text-white mt-0.5">
                        LRCLIB 同期歌詞 / 日↔英・多言語→日翻訳
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* VIEW: MV */}
          {activeNav === 'mv' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    ミュージックビデオ (MV)
                  </h1>
                  <p className="text-xs text-white/55 mt-1">
                    {activeMvItem.title} — {activeMvItem.artist}
                    {isFetchingMv ? ' · 読み込み中...' : ''}
                  </p>
                </div>

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
                        title: `${currentTrack.title} (MV)`,
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
                    placeholder="曲名・歌手名でMV検索..."
                    className="w-60 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/15 text-xs text-white outline-none"
                  />
                  <button
                    type="submit"
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold"
                  >
                    MV検索
                  </button>
                </form>
              </div>

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
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
                      MVを読み込み中...
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {liveMvCatalog.map((mv) => {
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
                      className="group cursor-pointer rounded-xl overflow-hidden apple-liquid-glass border border-white/10 hover:border-white/30 transition flex flex-col"
                    >
                      <div className="aspect-video w-full relative overflow-hidden bg-zinc-900">
                        {thumb && (
                          <img
                            src={thumb}
                            alt={mv.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-xs font-bold text-white truncate">{mv.title}</div>
                        <div className="text-[11px] text-white/60 truncate mt-0.5">{mv.artist}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: ARTIST PAGE (Clicking any Album/Single opens the 2nd-Image Detail Layout) */}
          {activeNav === 'artist' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-8">
              <div className="flex flex-wrap items-center gap-1.5">
                {POPULAR_ARTIST_SHORTCUTS.map((artist) => (
                  <button
                    key={artist}
                    type="button"
                    onClick={() => openArtistPage(artist)}
                    style={
                      selectedArtistName === artist
                        ? { backgroundColor: resolvedAccentHex }
                        : undefined
                    }
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      selectedArtistName === artist
                        ? 'text-white'
                        : 'bg-white/[0.06] text-white/75 hover:bg-white/[0.14]'
                    }`}
                  >
                    {artist}
                  </button>
                ))}
              </div>

              <div
                className={`relative rounded-2xl overflow-hidden border border-white/20 bg-gradient-to-br ${activeArtistProfile.bannerGradient} p-6 sm:p-8 shadow-2xl`}
              >
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl shrink-0 bg-zinc-900">
                    {activeArtistProfile.avatarUrl && (
                      <img
                        src={activeArtistProfile.avatarUrl}
                        alt={activeArtistProfile.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <div className="text-xs text-white/80 font-mono">
                      {activeArtistProfile.monthlyListeners}
                      {isFetchingArtist ? ' · 読み込み中...' : ''}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                      {activeArtistProfile.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-white/85 max-w-2xl">
                      {activeArtistProfile.bio}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (artistStrictTopTracks.length > 0) {
                            playTrack(artistStrictTopTracks[0]);
                          }
                        }}
                        style={{ backgroundColor: resolvedAccentHex }}
                        className="px-5 py-2 rounded-full text-white text-xs font-bold shadow-lg"
                      >
                        人気曲を再生
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">人気曲</h2>
                {renderSpotifyTrackTable(artistStrictTopTracks, '楽曲が見つかりませんでした')}
              </div>

              {activeArtistProfile.albums && activeArtistProfile.albums.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-white">アルバム</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {activeArtistProfile.albums.map((alb) => (
                      <div
                        key={alb.id}
                        onClick={() =>
                          openCollectionDetail(
                            {
                              id: alb.id,
                              kind: 'ALBUM',
                              title: alb.title,
                              subtitle: `${alb.artist} · アルバム`,
                              creator: alb.artist,
                              year: alb.year,
                              artworkUrl: alb.artworkUrl,
                              coverGradient: activeArtistProfile.bannerGradient,
                              tracks: [],
                            },
                            alb.collectionId
                          )
                        }
                        className="group cursor-pointer rounded-2xl p-3 bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 transition flex flex-col gap-2"
                      >
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-900">
                          {alb.artworkUrl && (
                            <img
                              src={alb.artworkUrl}
                              alt={alb.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="text-xs font-bold text-white truncate">{alb.title}</div>
                        <div className="text-[11px] text-white/50">
                          {alb.year}年 · アルバム
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeArtistProfile.singles && activeArtistProfile.singles.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-white">シングル &amp; EP</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {activeArtistProfile.singles.map((sg) => (
                      <div
                        key={sg.id}
                        onClick={() =>
                          openCollectionDetail({
                            id: sg.id,
                            kind: sg.trackCount > 1 ? 'EP' : 'SINGLE',
                            title: sg.cleanTitle,
                            subtitle: `${sg.artist} · ${sg.trackCount > 1 ? 'EP' : 'シングル'}`,
                            creator: sg.artist,
                            year: sg.year,
                            artworkUrl: sg.artworkUrl,
                            coverGradient: activeArtistProfile.bannerGradient,
                            tracks: [
                              {
                                id: sg.id,
                                monoTrackId: '',
                                title: sg.cleanTitle,
                                artist: sg.artist,
                                album: sg.title,
                                coverGradient: activeArtistProfile.bannerGradient,
                                coverAccent: resolvedAccentHex,
                                artworkUrl: sg.artworkUrl,
                                audioUrl: sg.audioUrl,
                                isFullLengthStream: true,
                                duration: 215,
                                format: 'Stream',
                                bitrate: '320 kbps',
                                genre: 'Single',
                                year: sg.year,
                                lyrics: [{ time: 0, text: `${sg.cleanTitle} — ${sg.artist}` }],
                              },
                            ],
                          })
                        }
                        className="group cursor-pointer rounded-2xl p-3 bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 transition flex items-center gap-3"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-900 shrink-0">
                          {sg.artworkUrl && (
                            <img
                              src={sg.artworkUrl}
                              alt={sg.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {sg.cleanTitle}
                          </div>
                          <div className="text-[10px] text-white/50">
                            {sg.year}年 · {sg.trackCount > 1 ? 'EP' : 'シングル'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: FAVORITES */}
          {activeNav === 'favorites' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                お気に入り ({favoriteTracks.length}曲)
              </h1>
              {renderSpotifyTrackTable(favoriteTracks, 'お気に入りに登録された曲がまだありません')}
            </div>
          )}

          {/* VIEW: ALL SONGS */}
          {activeNav === 'songs' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                すべての曲 ({filteredTracks.length}曲)
              </h1>
              {renderSpotifyTrackTable(filteredTracks, '楽曲がありません')}
            </div>
          )}

          {/* VIEW: RECENT */}
          {activeNav === 'recent' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-36 space-y-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                再生履歴 ({recentTracks.length}曲)
              </h1>
              {renderSpotifyTrackTable(recentTracks, '再生履歴がありません')}
            </div>
          )}

          {/* VIEW: FULL-SCREEN APPLE MUSIC LIVE LYRICS & TRANSLATION */}
          {activeNav === 'lyrics' && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative bg-zinc-950">
              {/* Shared Apple Music Blurred Artwork Backdrop across both columns */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
                {currentTrack.artworkUrl && (
                  <img
                    src={currentTrack.artworkUrl}
                    alt=""
                    className="absolute -inset-20 w-[140%] h-[140%] max-w-none object-cover blur-[88px] saturate-200 opacity-50"
                  />
                )}
                <div className="absolute inset-0 bg-black/40" />
              </div>

              <div className="relative z-10 w-full lg:w-[380px] xl:w-[420px] p-6 sm:p-10 flex flex-col justify-center items-center border-b lg:border-b-0 lg:border-r border-white/[0.08] shrink-0">
                <div className="w-full max-w-[290px] space-y-6">
                  <div
                    className={`aspect-square w-full rounded-3xl overflow-hidden bg-zinc-900 border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.65)] transition-transform duration-700 ${
                      isPlaying ? 'scale-100' : 'scale-95 opacity-85'
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
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                      {currentTrack.title}
                    </h2>
                    <button
                      type="button"
                      onClick={() => openArtistPage(currentTrack.artist)}
                      className="text-sm sm:text-base font-semibold text-white/75 hover:text-white hover:underline truncate block"
                    >
                      {cleanPrimaryArtistName(currentTrack.artist)}
                    </button>
                    <p className="text-xs text-white/50 truncate">{currentTrack.album}</p>
                  </div>
                </div>
              </div>
              {renderSyncedLyricsPanel(true)}
            </div>
          )}

          {/* VIEW: EQUALIZER */}
          {activeNav === 'eq' && (
            <div className="flex-1 p-6 sm:p-8 pb-36 overflow-y-auto space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  10バンド イコライザー (EQ)
                </h1>
                <p className="text-xs text-white/55 mt-1">
                  周波数スライダーまたはプリセットで音質を調整できます
                </p>
              </div>
              <MusicEqualizerPanel
                currentTrackGenre={currentTrack.genre}
                onStatusMessage={(msg) => setStatusBanner(msg)}
              />
              {renderSpatialAudioDetailPanel()}
            </div>
          )}

          {/* VIEW: MONOCHROME WEB PROXY */}
          {activeNav === 'monochrome-web' && (
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
              <div className="px-4 py-2 bg-zinc-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {MONOCHROME_INSTANCES.map((inst) => (
                    <button
                      key={inst.name}
                      onClick={() => {
                        setMonoWebUrl(inst.url);
                        loadMonochromeWebProxy(inst.url, relayNode, proxyEngine);
                      }}
                      style={
                        monoWebUrl === inst.url
                          ? { backgroundColor: resolvedAccentHex }
                          : undefined
                      }
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                        monoWebUrl === inst.url ? 'text-white' : 'bg-white/5 text-white/70'
                      }`}
                    >
                      {inst.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={relayNode}
                    onChange={(e) => {
                      const nextNode = e.target.value as ProxyRelayNodeId;
                      setRelayNode(nextNode);
                      loadMonochromeWebProxy(monoWebUrl, nextNode, proxyEngine);
                    }}
                    className="bg-black border border-white/15 text-white text-[11px] px-2 py-1 rounded"
                  >
                    {PROXY_RELAY_SERVERS.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1 relative bg-white">
                {monoWebSwSrc ? (
                  <iframe
                    src={monoWebSwSrc}
                    className="w-full h-full border-0 bg-white"
                    title="monochrome-wisp-sw-proxy"
                  />
                ) : (
                  <iframe
                    srcDoc={monoWebSrcDoc}
                    className="w-full h-full border-0 bg-white"
                    title="monochrome-sw-proxy"
                  />
                )}
              </div>
            </div>
          )}

          {/* VIEW: SYNTH */}
          {activeNav === 'synth' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="h-64 w-full max-w-lg bg-black/40 p-4 rounded-xl border border-white/10">
                  <canvas ref={canvasRef} className="h-full w-full" />
                </div>
                <div className="mt-6">
                  <button
                    onClick={togglePlay}
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-6 py-2.5 rounded-xl font-semibold text-xs text-white"
                  >
                    {isPlaying ? '一時停止' : '再生'}
                  </button>
                </div>
              </div>
              <div className="w-72 border-l border-white/10 p-5 space-y-4 bg-black/30">
                <div>
                  <label className="text-[11px] text-white/60 mb-1.5 block">波形</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['sawtooth', 'sine', 'triangle', 'square'] as OscillatorType[]).map((wf) => (
                      <button
                        key={wf}
                        onClick={() => setWaveform(wf)}
                        style={
                          waveform === wf ? { backgroundColor: resolvedAccentHex } : undefined
                        }
                        className={`py-1.5 rounded text-xs capitalize font-medium ${
                          waveform === wf ? 'text-white' : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {wf}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">基本周波数</span>
                    <span className="font-mono text-white">{baseFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={55}
                    max={660}
                    value={baseFreq}
                    onChange={(e) => setBaseFreq(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">倍音</span>
                    <span className="font-mono text-white">{harmonics}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={harmonics}
                    onChange={(e) => setHarmonics(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">フィルター</span>
                    <span className="font-mono text-white">{filterCutoff} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={4000}
                    value={filterCutoff}
                    onChange={(e) => setFilterCutoff(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW: DRUMPAD */}
          {activeNav === 'drumpad' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <DrumPadTunerView />
            </div>
          )}

          {/* VIEW: PROXY */}
          {activeNav === 'proxy' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-3xl">
              <h2 className="text-lg font-bold text-white">プロキシ設定</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {WISP_SERVER_PRESETS.map((w) => (
                  <button
                    key={w.id}
                    onClick={async () => {
                      setWispServer(w.wispUrl);
                      configureServiceWorkerWisp(w.wispUrl, proxyEngine, relayNode);
                      const res = await testWispServerConnection(w.wispUrl);
                      setProxyLatency(res.latencyMs);
                    }}
                    className="p-3 rounded-xl border border-white/10 bg-white/[0.04] text-left"
                  >
                    <div className="text-xs font-bold text-white">{w.name}</div>
                    <div className="text-[11px] font-mono text-white/60 truncate">{w.wispUrl}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customWispUrlInput}
                  onChange={(e) => setCustomWispUrlInput(e.target.value)}
                  placeholder="wss://..."
                  className="flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                  onClick={() => {
                    if (customWispUrlInput.trim()) setWispServer(customWispUrlInput.trim());
                  }}
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold"
                >
                  適用
                </button>
              </div>
            </div>
          )}

          {/* RIGHT-HAND COLLAPSIBLE LYRICS & TRANSLATION DRAWER */}
          {showLyricsDrawer && activeNav !== 'lyrics' && renderSyncedLyricsPanel(false)}
        </main>
      </div>

      {/* ===================================================================
          DRAGGABLE & MINIMIZABLE LIQUID GLASS PLAYER BAR (Synced with OS Accent)
         =================================================================== */}
      <div
        className="absolute bottom-2.5 left-3 right-3 z-30 pointer-events-none flex justify-center"
        style={{
          transform: `translate3d(${pillOffset.x}px, ${pillOffset.y}px, 0)`,
          transition: isDraggingPill ? 'none' : 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {isPillMinimized ? (
          <div
            onPointerDown={handlePillPointerDown}
            onPointerMove={handlePillPointerMove}
            onPointerUp={handlePillPointerUp}
            onPointerCancel={handlePillPointerUp}
            style={{ touchAction: 'none' }}
            className="pointer-events-auto relative rounded-2xl liquid-glass-music-dock liquid-glass-window overflow-hidden px-3.5 py-2 flex items-center gap-3 shadow-2xl border border-white/25 cursor-grab active:cursor-grabbing max-w-md select-none"
          >
            <div
              onClick={() => setIsArtworkMaximized((m) => !m)}
              data-no-pill-drag="true"
              className="relative z-10 w-9 h-9 rounded-xl overflow-hidden bg-zinc-900 border border-white/25 shrink-0 cursor-pointer"
            >
              {currentTrack.artworkUrl && (
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="relative z-10 min-w-0 max-w-[165px]">
              <div className="text-xs font-bold text-white truncate">{currentTrack.title}</div>
              <div className="text-[10px] text-white/70 truncate">
                {cleanPrimaryArtistName(currentTrack.artist)}
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-1" data-no-pill-drag="true">
              <button
                type="button"
                onClick={togglePlay}
                style={{ backgroundColor: resolvedAccentHex }}
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center shadow"
              >
                <span className="material-symbols-rounded text-[20px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsPillMinimized(false)}
                className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-[16px]">open_in_full</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onPointerDown={handlePillPointerDown}
            onPointerMove={handlePillPointerMove}
            onPointerUp={handlePillPointerUp}
            onPointerCancel={handlePillPointerUp}
            style={{ touchAction: 'none' }}
            className="pointer-events-auto relative w-full max-w-6xl rounded-2xl liquid-glass-music-dock liquid-glass-window overflow-hidden px-4 sm:px-5 py-2.5 flex flex-col gap-2 cursor-grab active:cursor-grabbing select-none"
          >
            {/* Scrubber Row */}
            <div className="relative z-10 flex items-center gap-2">
              <span className="text-[10px] font-mono tabular-nums text-white/75 w-9 text-right">
                {hoverScrubTime !== null ? formatSecs(hoverScrubTime) : formatSecs(currentTime)}
              </span>
              <div
                data-no-pill-drag="true"
                className="flex-1 h-1.5 rounded-full bg-white/15 hover:h-2 cursor-pointer relative overflow-hidden transition-all"
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
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.min(
                      100,
                      (currentTime / Math.max(1, currentTrack.duration)) * 100
                    )}%`,
                    backgroundColor: resolvedAccentHex,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono tabular-nums text-white/75 w-9">
                {formatSecs(currentTrack.duration)}
              </span>
              <button
                type="button"
                data-no-pill-drag="true"
                onClick={() => setIsPillMinimized(true)}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/25 text-white/80 flex items-center justify-center"
                title="最小化"
              >
                <span className="material-symbols-rounded text-[14px]">close_fullscreen</span>
              </button>
            </div>

            {/* Transport & Actions Row */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              {/* Left: Track Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  data-no-pill-drag="true"
                  onClick={() => setIsArtworkMaximized((m) => !m)}
                  className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 border border-white/25 shrink-0 cursor-pointer"
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {currentTrack.title}
                    </span>
                    {isBuffering && (
                      <span className="text-[10px] font-mono text-white/60 animate-pulse">
                        読込中...
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/70 truncate">
                    {cleanPrimaryArtistName(currentTrack.artist)} · {statusBanner}
                  </div>
                </div>
              </div>

              {/* Center: Play/Pause/Prev/Next */}
              <div className="flex items-center gap-1.5 shrink-0" data-no-pill-drag="true">
                <button
                  type="button"
                  onClick={() => setIsShuffle(!isShuffle)}
                  style={isShuffle ? { color: resolvedAccentHex } : undefined}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white/65 hover:text-white"
                >
                  <span className="material-symbols-rounded text-[18px]">shuffle</span>
                </button>
                <button
                  type="button"
                  onClick={prevTrack}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/90 hover:bg-white/10"
                >
                  <span className="material-symbols-rounded text-[22px]">skip_previous</span>
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="w-10 h-10 rounded-full text-white hover:scale-105 active:scale-95 flex items-center justify-center transition shadow-lg"
                >
                  <span
                    className="material-symbols-rounded text-[24px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={nextTrack}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/90 hover:bg-white/10"
                >
                  <span className="material-symbols-rounded text-[22px]">skip_next</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRepeat(!isRepeat)}
                  style={isRepeat ? { color: resolvedAccentHex } : undefined}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white/65 hover:text-white"
                >
                  <span className="material-symbols-rounded text-[18px]">repeat</span>
                </button>
              </div>

              {/* Right: Lyrics, EQ, Settings, Volume */}
              <div
                className="flex items-center justify-end gap-1.5 flex-1"
                data-no-pill-drag="true"
              >
                <button
                  type="button"
                  onClick={() => setShowLyricsDrawer((s) => !s)}
                  style={
                    showLyricsDrawer || activeNav === 'lyrics'
                      ? { backgroundColor: resolvedAccentHex, borderColor: resolvedAccentHex }
                      : undefined
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 border ${
                    showLyricsDrawer || activeNav === 'lyrics'
                      ? 'text-white'
                      : 'bg-white/[0.08] border-white/15 text-white/85 hover:bg-white/15'
                  }`}
                >
                  <span className="material-symbols-rounded text-[15px]">translate</span>
                  <span>歌詞・翻訳</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveNav(activeNav === 'eq' ? 'home' : 'eq')}
                  style={
                    activeNav === 'eq'
                      ? { backgroundColor: resolvedAccentHex, borderColor: resolvedAccentHex }
                      : undefined
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 border ${
                    activeNav === 'eq'
                      ? 'text-white'
                      : 'bg-white/[0.08] border-white/15 text-white/85 hover:bg-white/15'
                  }`}
                >
                  <span className="material-symbols-rounded text-[15px]">equalizer</span>
                  <span>EQ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveNav(activeNav === 'settings' ? 'home' : 'settings')}
                  style={
                    activeNav === 'settings'
                      ? { backgroundColor: resolvedAccentHex, borderColor: resolvedAccentHex }
                      : undefined
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 border ${
                    activeNav === 'settings'
                      ? 'text-white'
                      : 'bg-white/[0.08] border-white/15 text-white/85 hover:bg-white/15'
                  }`}
                >
                  <span className="material-symbols-rounded text-[15px]">tune</span>
                  <span>設定</span>
                </button>

                <div className="hidden xl:flex items-center gap-1.5 pl-1">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/75 hover:text-white"
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
                    style={{ accentColor: resolvedAccentHex }}
                    className="w-16 cursor-pointer h-1 bg-white/25"
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
