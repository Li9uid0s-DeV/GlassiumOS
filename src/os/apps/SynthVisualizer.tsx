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
  | 'favorites'
  | 'songs'
  | 'recent'
  | 'lyrics'
  | 'monochrome-web'
  | 'synth'
  | 'drumpad'
  | 'proxy';

function resolveInitialNav(tab?: string): AppleMusicNavId {
  if (tab === 'drumpad' || tab === 'tuner') return 'drumpad';
  if (tab === 'lyrics') return 'lyrics';
  if (tab === 'monochrome-web') return 'monochrome-web';
  if (tab === 'synth') return 'synth';
  if (tab === 'proxy') return 'proxy';
  return 'listen-now';
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
      const exactPlayUrl = `./api/music/play?id=${encodeURIComponent(
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
  const [showLyricsDrawer, setShowLyricsDrawer] = useState<boolean>(true);

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
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [vocalBoost, setVocalBoost] = useState(false);
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

  // Audio Element, Context & Nodes Refs
  const audioElRef = useRef<HTMLAudioElement | null>(null);
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
        setActiveTrackOverride(aState.track);
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
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
  }, []);

  // Fetch Synchronized Lyrics from /api/music/lyrics / GDStudio / LRCLIB
  const loadLyricsForTrack = useCallback(async (track: MonochromeTrack) => {
    setIsFetchingLyrics(true);
    try {
      const synced = await fetchSynchronizedLyricsFromLrclib(
        track.title,
        track.artist,
        track.duration,
        track.monoTrackId
      );
      if (synced && synced.length > 0) {
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
          `同期歌詞を取得完了: ${track.title} — ${track.artist} (${synced.length}行)`
        );
      }
    } catch {
      // keep existing lyrics
    } finally {
      setIsFetchingLyrics(false);
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
          : `./api/music/play?id=${encodeURIComponent(
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

      // Always fetch full synchronized LRC lyrics if the track only has placeholder/short lyrics
      if (!normalizedTrack.lyrics || normalizedTrack.lyrics.length <= 12) {
        loadLyricsForTrack(normalizedTrack);
      }

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

          if (activeNav !== 'songs' && activeNav !== 'browse' && activeNav !== 'listen-now') {
            setActiveNav('songs');
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

  // Broadcast Now Playing Pill state to OS Desktop & listen for remote pill commands
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
        },
      })
    );
  }, [isPlaying, currentTrack, currentTime, currentLyricIndex]);

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
      const cmd = (e as CustomEvent<{ action?: string }>).detail?.action;
      if (cmd === 'toggle-play') {
        togglePlay();
      } else if (cmd === 'next') {
        nextTrack();
      } else if (cmd === 'prev') {
        prevTrack();
      }
    };
    window.addEventListener('glassium-music-command', onMusicCommand);
    return () => window.removeEventListener('glassium-music-command', onMusicCommand);
  }, [togglePlay, nextTrack, prevTrack]);

  // -----------------------------------------------------------------------
  // 60fps High-Precision requestAnimationFrame Lyric & Audio Sync Engine
  // (Runs ONLY while isPlaying is true; stops immediately on pause)
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

      const audio = audioElRef.current;
      const targetFullDuration = Math.max(60, currentTrack.duration || 210);
      let activeSec = fullPlayheadRef.current;

      // Read directly from HTML5 <audio> element at 60fps when streaming a track
      if (currentTrack.audioUrl && audio) {
        if (!audio.paused && Number.isFinite(audio.currentTime)) {
          activeSec = audio.currentTime;
          fullPlayheadRef.current = activeSec;
        } else {
          // While buffering or holding, keep the stable current playhead
          activeSec = fullPlayheadRef.current;
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

      // Advance only when audio has truly completed (audio.ended is true) or time exceeded
      if (audio && audio.ended) {
        if (isRepeat) {
          fullPlayheadRef.current = 0;
          setCurrentTime(0);
          if (currentTrack.audioUrl) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
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

  // Volume, Mute & PlaybackRate adjustments
  useEffect(() => {
    const targetGain = isMuted ? 0 : volume;
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(targetGain, audioCtxRef.current.currentTime);
    }
    if (audioElRef.current) {
      audioElRef.current.volume = targetGain;
      audioElRef.current.playbackRate = playbackRate;
    }
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
  // Apple Music Track Table Renderer (Used in Songs, Favorites, Recent, Browse)
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
        <div className="grid grid-cols-[36px_minmax(180px,2fr)_minmax(120px,1.3fr)_minmax(120px,1.3fr)_88px_56px] items-center px-4 py-2 border-b border-white/[0.08] text-[11px] font-medium text-white/45">
          <span>#</span>
          <span>曲名</span>
          <span className="hidden sm:block">アーティスト</span>
          <span className="hidden md:block">アルバム</span>
          <span className="text-center">お気に入り</span>
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
                className={`grid grid-cols-[36px_minmax(180px,2fr)_minmax(120px,1.3fr)_minmax(120px,1.3fr)_88px_56px] items-center px-4 py-2.5 cursor-pointer transition rounded-md ${
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
                  <div className="w-10 h-10 rounded overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
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
                    <div className="text-[11px] text-white/45 truncate sm:hidden">
                      {track.artist}
                    </div>
                  </div>
                </div>

                {/* Artist */}
                <div className="hidden sm:block text-xs text-white/65 truncate pr-3">
                  {track.artist}
                </div>

                {/* Album */}
                <div className="hidden md:block text-xs text-white/45 truncate pr-3">
                  {track.album}
                </div>

                {/* Favorite Registration Button */}
                <div className="flex justify-center">
                  <button
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

  return (
    <div className="flex h-full w-full flex-col bg-[#121214] text-white select-none overflow-hidden font-sans relative">
      {/* Subtle Ambient Artwork Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {currentTrack.artworkUrl ? (
          <img
            src={currentTrack.artworkUrl}
            alt=""
            className="w-full h-full object-cover scale-150 blur-[110px] opacity-25 transition-all duration-1000"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${currentTrack.coverGradient} opacity-35 blur-3xl transition-all duration-1000`}
          />
        )}
        <div className="absolute inset-0 bg-[#121214]/80" />
      </div>

      {/* Hidden HTML5 Audio Element for Full-Length 320kbps Streams */}
      <audio
        ref={audioElRef}
        preload="auto"
        onLoadedMetadata={(e) => {
          const nativeDur = e.currentTarget.duration;
          if (Number.isFinite(nativeDur) && nativeDur >= 40) {
            const exactSecs = Math.round(nativeDur);
            setTracks((prev) =>
              prev.map((t) => (t.id === currentTrack.id ? { ...t, duration: exactSecs } : t))
            );
            setActiveTrackOverride((prev) =>
              prev && prev.id === currentTrack.id ? { ...prev, duration: exactSecs } : prev
            );
          }
        }}
        onError={(e) => {
          console.warn('Audio stream glitch, auto-recovering:', e);
          const audio = audioElRef.current;
          if (audio && currentTrack.audioUrl && isPlaying) {
            setTimeout(() => {
              audio.play().catch(() => {});
            }, 500);
          }
        }}
        onEnded={() => {
          if (isRepeat && audioElRef.current) {
            fullPlayheadRef.current = 0;
            setCurrentTime(0);
            audioElRef.current.currentTime = 0;
            audioElRef.current.play().catch(() => {});
          } else {
            nextTrack();
          }
        }}
      />

      {/* ===================================================================
          TOP APPLE MUSIC PLAYER BAR (Liquid Glass + Transport + LCD Display)
         =================================================================== */}
      <div className="relative z-20 h-14 px-4 apple-liquid-glass-bar flex items-center justify-between gap-4 shrink-0">
        {/* Left: Apple Music Transport Controls with Google Material Symbols */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            title="シャッフル"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isShuffle ? 'text-[#fa243c] bg-[#fa243c]/15' : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <span className="material-symbols-rounded text-[18px]">shuffle</span>
          </button>
          <button
            onClick={prevTrack}
            title="前の曲"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/85 hover:text-white hover:bg-white/[0.08] transition"
          >
            <span className="material-symbols-rounded text-[22px]">skip_previous</span>
          </button>
          <button
            onClick={togglePlay}
            title={isPlaying ? '一時停止' : '再生'}
            className="w-9 h-9 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition shadow-md"
          >
            <span
              className="material-symbols-rounded text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            onClick={nextTrack}
            title="次の曲"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/85 hover:text-white hover:bg-white/[0.08] transition"
          >
            <span className="material-symbols-rounded text-[22px]">skip_next</span>
          </button>
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            title="リピート"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isRepeat ? 'text-[#fa243c] bg-[#fa243c]/15' : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <span className="material-symbols-rounded text-[18px]">repeat</span>
          </button>
        </div>

        {/* Center: Signature Apple Music Liquid Glass LCD Now Playing Display + Scrubber */}
        <div className="flex-1 max-w-xl h-10 apple-liquid-glass-pill rounded-lg flex flex-col justify-between overflow-hidden relative">
          <div className="flex items-center justify-between px-3 pt-1 gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-xs overflow-hidden bg-zinc-800 shrink-0">
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
              <div className="min-w-0 flex items-baseline gap-2 truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {currentTrack.title}
                </span>
                <span className="text-[11px] text-white/55 truncate">
                  {currentTrack.artist} — {currentTrack.album}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isBuffering && (
                <span className="text-[10px] font-mono text-[#fa243c] animate-pulse">
                  Loading
                </span>
              )}
              <button
                onClick={(e) => toggleFavorite(currentTrack, e)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  isFavorite(currentTrack.id)
                    ? 'bg-[#fa243c] text-white'
                    : 'bg-white/[0.08] text-white/65 hover:text-white'
                }`}
              >
                {isFavorite(currentTrack.id) ? 'お気に入り済' : '+ お気に入り'}
              </button>
              <span className="text-[10px] font-mono tabular-nums text-white/50">
                {hoverScrubTime !== null ? formatSecs(hoverScrubTime) : formatSecs(currentTime)} /{' '}
                {formatSecs(currentTrack.duration)}
              </span>
            </div>
          </div>

          {/* Interactive Bottom Edge Scrubber */}
          <div
            className="w-full h-1.5 bg-white/10 cursor-pointer relative"
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
              className="h-full bg-[#fa243c] transition-all duration-75"
              style={{
                width: `${Math.min(100, (currentTime / Math.max(1, currentTrack.duration)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Right: Volume, Sing Boost & Apple Music Lyrics Drawer Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/65 hover:text-white hover:bg-white/[0.08] transition"
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
              className="w-20 accent-[#fa243c] cursor-pointer h-1 bg-white/20"
            />
          </div>

          <button
            onClick={() =>
              setPlaybackRate((r) => (r === 1.0 ? 1.25 : r === 1.25 ? 0.85 : 1.0))
            }
            className="px-2 py-1 rounded bg-white/[0.08] text-white/70 hover:text-white text-[11px] font-mono transition"
          >
            {playbackRate}x
          </button>

          <button
            onClick={() => setVocalBoost((v) => !v)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
              vocalBoost
                ? 'bg-[#fa243c] text-white'
                : 'bg-white/[0.08] text-white/70 hover:text-white'
            }`}
          >
            Sing
          </button>

          <button
            onClick={() => setShowLyricsDrawer((s) => !s)}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              showLyricsDrawer || activeNav === 'lyrics'
                ? 'bg-[#fa243c] text-white'
                : 'bg-white/[0.08] text-white/75 hover:text-white'
            }`}
          >
            歌詞
          </button>
        </div>
      </div>

      {/* ===================================================================
          MAIN APPLE MUSIC WORKSPACE (Left Sidebar + Center Stage + Lyrics)
         =================================================================== */}
      <div className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        {/* -----------------------------------------------------------------
            LEFT APPLE MUSIC LIQUID GLASS SIDEBAR (Clean Typography, Zero Icons)
           ----------------------------------------------------------------- */}
        <aside className="w-56 apple-liquid-glass border-r border-white/[0.12] flex flex-col justify-between p-3 shrink-0 overflow-y-auto">
          <div className="space-y-5">
            {/* Search Box (Queries official releases) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleOnlineMusicSearch();
              }}
              className="space-y-1.5"
            >
              <div className="flex items-center bg-white/[0.07] border border-white/15 focus-within:border-[#fa243c] rounded-md px-2.5 py-1.5">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="公式楽曲を検索 (曲名・歌手)..."
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
                className="w-full py-1.5 rounded-md bg-[#fa243c] hover:bg-[#e01e35] text-white font-semibold text-xs transition"
              >
                {isSearchingOnline ? '検索中...' : '楽曲検索'}
              </button>
            </form>

            {/* Official Catalog Source Transparency Badge */}
            <div className="px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] space-y-1">
              <div className="font-semibold text-[10px] text-white/85 flex items-center gap-1.5">
                <span className="material-symbols-rounded text-xs text-emerald-400">verified</span>
                <span>公式音源のみ配信</span>
              </div>
              <p className="text-[9px] text-white/50 leading-tight">
                配信元: Apple Music (iTunes Japan) 公式カタログ &amp; Monochrome Hi-Fi。歌ってみた・非公式カバーは除外済みです。
              </p>
            </div>

            {/* Section 1: Apple Music */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Apple Music
              </div>
              {(
                [
                  { id: 'listen-now', label: 'いま聴く' },
                  { id: 'browse', label: '見つける' },
                  { id: 'lyrics', label: '歌詞フル画面' },
                ] as { id: AppleMusicNavId; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
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

            {/* Section 3: Studio & api.monochrome.tf Proxy */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                スタジオ &amp; API
              </div>
              {(
                [
                  { id: 'monochrome-web', label: 'api.monochrome.tf Web' },
                  { id: 'synth', label: 'シンセサイザー' },
                  { id: 'drumpad', label: 'ドラム & 周波数' },
                  { id: 'proxy', label: 'プロキシ設定' },
                ] as { id: AppleMusicNavId; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
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
          {/* VIEW 1: LISTEN NOW (いま聴く) */}
          {activeNav === 'listen-now' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    いま聴く
                  </h1>
                  <p className="text-xs text-white/50 mt-1">{statusBanner}</p>
                </div>

                {/* Quick Artist Search Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_ARTIST_SHORTCUTS.map((artist) => (
                    <button
                      key={artist}
                      onClick={() => {
                        setSearchQuery(artist);
                        handleOnlineMusicSearch(artist);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition ${
                        searchQuery === artist
                          ? 'bg-[#fa243c] text-white font-semibold'
                          : 'bg-white/[0.06] hover:bg-[#fa243c] text-white/75 hover:text-white'
                      }`}
                    >
                      {artist}
                    </button>
                  ))}
                </div>
              </div>

              {/* When searching, show Search Results Table IMMEDIATELY at the top */}
              {(searchQuery.trim().length > 0 || lastSearchedQuery.length > 0) && (
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.1]">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {isSearchingOnline
                        ? `"${searchQuery}" を検索中...`
                        : `"${lastSearchedQuery || searchQuery}" の検索結果 (${filteredTracks.length}曲) — クリックでその曲をフル尺再生`}
                    </h3>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setLastSearchedQuery('');
                        setTracks(INITIAL_ENRICHED_CATALOG);
                      }}
                      className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/15 text-[11px] text-white/75 hover:text-white transition"
                    >
                      検索をクリア
                    </button>
                  </div>
                  {renderAppleMusicSongTable(filteredTracks, '該当する楽曲が見つかりません')}
                </div>
              )}

              {/* Featured Now Playing Liquid Glass Hero Card */}
              <div className="p-6 rounded-2xl apple-liquid-glass flex flex-col sm:flex-row items-center gap-6">
                <div
                  className={`w-36 h-36 sm:w-44 sm:h-44 rounded-xl overflow-hidden bg-zinc-900 border border-white/20 shrink-0 shadow-2xl transition-transform duration-500 ${
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

                <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#fa243c]">
                    Now Playing · 60fps Time-Synced Lyrics · {currentTrack.format}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="text-sm text-white/70 truncate">
                    {currentTrack.artist} — {currentTrack.album}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      onClick={togglePlay}
                      className="px-5 py-2 rounded-lg bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold transition shadow-lg flex items-center gap-1.5"
                    >
                      <span
                        className="material-symbols-rounded text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                      >
                        {isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                      <span>{isPlaying ? '一時停止' : 'フル尺再生'}</span>
                    </button>
                    <button
                      onClick={() => setActiveNav('lyrics')}
                      className="px-4 py-2 rounded-lg apple-liquid-glass-pill hover:bg-white/20 text-xs font-semibold text-white transition"
                    >
                      歌詞フル画面ステージ
                    </button>
                    <button
                      onClick={() => toggleFavorite(currentTrack)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition ${
                        isFavorite(currentTrack.id)
                          ? 'bg-white text-black border-white'
                          : 'apple-liquid-glass-pill text-white hover:bg-white/15'
                      }`}
                    >
                      {isFavorite(currentTrack.id) ? 'お気に入り登録済' : 'お気に入りに追加'}
                    </button>
                    <button
                      onClick={() => setShowLyricsDrawer((s) => !s)}
                      className="px-4 py-2 rounded-lg apple-liquid-glass-pill hover:bg-white/15 text-xs font-medium text-white transition"
                    >
                      {showLyricsDrawer ? '右歌詞パネルを閉じる' : '右歌詞パネルを開く'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Favorites Quick Section (if any) */}
              {favoriteTracks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">お気に入り</h3>
                    <button
                      onClick={() => setActiveNav('favorites')}
                      className="text-xs text-[#fa243c] hover:underline"
                    >
                      すべて表示 ({favoriteTracks.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {favoriteTracks.slice(0, 4).map((track) => (
                      <div
                        key={track.id}
                        onClick={() => playTrack(track)}
                        className="group cursor-pointer space-y-2 p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition"
                      >
                        <div className="aspect-square w-full rounded overflow-hidden bg-zinc-900">
                          {track.artworkUrl ? (
                            <img
                              src={track.artworkUrl}
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-br ${track.coverGradient}`}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {track.title}
                          </div>
                          <div className="text-[11px] text-white/50 truncate">{track.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Songs / Catalog Table (shown when not already rendered in search box above) */}
              {!(searchQuery.trim().length > 0 || lastSearchedQuery.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white">
                    おすすめフル尺トラック ({filteredTracks.length}曲)
                  </h3>
                  {renderAppleMusicSongTable(filteredTracks, '楽曲が見つかりません')}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: BROWSE (見つける) */}
          {activeNav === 'browse' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    見つける (楽曲・アーティスト検索)
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
                    className="w-full sm:w-64 px-3 py-1.5 rounded-md bg-white/[0.07] border border-white/15 focus:border-[#fa243c] text-xs text-white placeholder-white/40 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingOnline}
                    className="px-4 py-1.5 rounded-md bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold shrink-0 transition"
                  >
                    {isSearchingOnline ? '検索中...' : '検索'}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {POPULAR_ARTIST_SHORTCUTS.map((artist) => (
                  <button
                    key={artist}
                    onClick={() => {
                      setSearchQuery(artist);
                      handleOnlineMusicSearch(artist);
                    }}
                    className={`p-4 rounded-lg border text-left transition ${
                      searchQuery === artist
                        ? 'bg-[#fa243c]/25 border-[#fa243c]'
                        : 'bg-white/[0.04] hover:bg-[#fa243c]/20 border-white/[0.08] hover:border-[#fa243c]'
                    }`}
                  >
                    <div className="text-sm font-bold text-white">{artist}</div>
                    <div className="text-[11px] text-white/45 mt-1">フル尺ストリーム検索</div>
                  </button>
                ))}
              </div>

              {renderAppleMusicSongTable(filteredTracks, '検索結果がありません')}
            </div>
          )}

          {/* VIEW 3: FAVORITES (お気に入り) */}
          {activeNav === 'favorites' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
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
                    className="px-4 py-1.5 rounded-md bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold transition"
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

          {/* VIEW 4: ALL SONGS (すべての曲) */}
          {activeNav === 'songs' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
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
                    className="w-full sm:w-64 px-3 py-1.5 rounded-md bg-white/[0.07] border border-white/15 focus:border-[#fa243c] text-xs text-white placeholder-white/40 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingOnline}
                    className="px-4 py-1.5 rounded-md bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold shrink-0 transition"
                  >
                    {isSearchingOnline ? '検索中...' : '検索'}
                  </button>
                </form>
              </div>
              {renderAppleMusicSongTable(filteredTracks, '楽曲がありません')}
            </div>
          )}

          {/* VIEW 5: RECENTLY PLAYED (最近再生した項目) */}
          {activeNav === 'recent' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  最近再生した項目
                </h1>
                <p className="text-xs text-white/50 mt-1">再生履歴 ({recentTracks.length}曲)</p>
              </div>
              {renderAppleMusicSongTable(recentTracks, '再生履歴がまだありません')}
            </div>
          )}

          {/* VIEW 6: FULL-SCREEN LYRICS (Apple Music Immersive 2-Column Liquid Glass Stage) */}
          {activeNav === 'lyrics' && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              {/* Left Column: Floating Liquid Glass Artwork, Scrubber & Transport */}
              <div className="w-full lg:w-[380px] xl:w-[430px] p-6 sm:p-8 flex flex-col justify-center items-center apple-liquid-glass border-b lg:border-b-0 lg:border-r border-white/[0.12] shrink-0">
                <div className="w-full max-w-[300px] space-y-6">
                  {/* Dynamic Spring-Scaled Artwork */}
                  <div
                    className={`aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/20 transition-all duration-700 ${
                      isPlaying
                        ? 'scale-100 shadow-[0_28px_60px_rgba(0,0,0,0.68)]'
                        : 'scale-[0.9] opacity-75 shadow-[0_12px_30px_rgba(0,0,0,0.45)]'
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

                  {/* Title, Artist & Favorite Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                        {currentTrack.title}
                      </h2>
                      <p className="text-sm text-white/65 truncate mt-0.5">
                        {currentTrack.artist}
                      </p>
                      <p className="text-[11px] text-white/40 font-mono truncate mt-0.5">
                        {currentTrack.album} · {currentTrack.bitrate}
                      </p>
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(currentTrack, e)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
                        isFavorite(currentTrack.id)
                          ? 'bg-[#fa243c] text-white'
                          : 'apple-liquid-glass-pill text-white/80 hover:text-white'
                      }`}
                    >
                      {isFavorite(currentTrack.id) ? '登録済' : 'お気に入り'}
                    </button>
                  </div>

                  {/* Interactive Liquid Glass Timeline Scrubber */}
                  <div className="space-y-2">
                    <div
                      className="w-full h-2 rounded-full bg-white/15 cursor-pointer overflow-hidden relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        seekToSeconds(pos * currentTrack.duration);
                      }}
                    >
                      <div
                        className="h-full bg-white rounded-full transition-all duration-75"
                        style={{
                          width: `${Math.min(
                            100,
                            (currentTime / Math.max(1, currentTrack.duration)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-white/55">
                      <span>{formatSecs(currentTime)}</span>
                      <span>
                        -{formatSecs(Math.max(0, currentTrack.duration - currentTime))}
                      </span>
                    </div>
                  </div>

                  {/* Liquid Glass Transport Controls with Material Symbols */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setIsShuffle(!isShuffle)}
                      title="シャッフル"
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                        isShuffle
                          ? 'bg-[#fa243c] text-white'
                          : 'apple-liquid-glass-pill text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-rounded text-[20px]">shuffle</span>
                    </button>
                    <button
                      onClick={prevTrack}
                      title="前の曲"
                      className="w-11 h-11 rounded-full apple-liquid-glass-pill flex items-center justify-center text-white hover:bg-white/20 transition"
                    >
                      <span className="material-symbols-rounded text-[24px]">skip_previous</span>
                    </button>
                    <button
                      onClick={togglePlay}
                      title={isPlaying ? '一時停止' : '再生'}
                      className="w-14 h-14 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition shadow-xl"
                    >
                      <span
                        className="material-symbols-rounded text-[30px]"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                      >
                        {isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    <button
                      onClick={nextTrack}
                      title="次の曲"
                      className="w-11 h-11 rounded-full apple-liquid-glass-pill flex items-center justify-center text-white hover:bg-white/20 transition"
                    >
                      <span className="material-symbols-rounded text-[24px]">skip_next</span>
                    </button>
                    <button
                      onClick={() => setIsRepeat(!isRepeat)}
                      title="リピート"
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                        isRepeat
                          ? 'bg-[#fa243c] text-white'
                          : 'apple-liquid-glass-pill text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-rounded text-[20px]">repeat</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Full-Screen 60fps Time-Synced Lyrics Stage */}
              {renderAppleMusicLyricsPanel(true)}
            </div>
          )}

          {/* VIEW 7: API.MONOCHROME.TF WEB PROXY (Wisp v1 + UV/Scramjet Service Worker) */}
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

          {/* VIEW 8: SYNTHESIZER */}
          {activeNav === 'synth' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div className="h-64 w-full max-w-lg bg-black/40 p-4 rounded-lg overflow-hidden relative border border-white/10">
                  <canvas ref={canvasRef} className="h-full w-full" />
                </div>

                <div className="mt-6">
                  <button
                    onClick={togglePlay}
                    className="px-6 py-2.5 rounded-md bg-[#fa243c] hover:bg-[#e01e35] font-semibold text-xs text-white transition"
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

          {/* VIEW 9: DRUMPAD & FREQUENCY */}
          {activeNav === 'drumpad' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <DrumPadTunerView />
            </div>
          )}

          {/* VIEW 10: WISP v1 + ULTRAVIOLET / SCRAMJET SERVICE WORKER PROXY SETTINGS */}
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

              {/* Wisp Server Selection & Custom Wisp Endpoint */}
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
                    className="flex-1 bg-black/50 border border-white/15 rounded-md px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#fa243c]"
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
                    className="px-4 py-1.5 rounded-md bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold transition"
                  >
                    Wisp 適用
                  </button>
                </div>
              </div>

              {/* Service Worker Engine Protocol (Ultraviolet vs Scramjet) */}
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

              <div className="space-y-2">
                <div className="text-xs font-semibold text-white/75">
                  プロキシ中継ノード選択:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {PROXY_RELAY_SERVERS.map((srv) => {
                    const active = relayNode === srv.id;
                    return (
                      <button
                        key={srv.id}
                        onClick={() => {
                          setRelayNode(srv.id);
                          setActiveRelayLabel(srv.name);
                          configureServiceWorkerWisp(wispServer, proxyEngine, srv.id);
                        }}
                        className={`p-3.5 rounded-lg border text-left transition flex flex-col justify-between gap-1 ${
                          active
                            ? 'bg-[#fa243c]/15 border-[#fa243c] text-white'
                            : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{srv.name}</span>
                          <span className="text-[10px] font-mono text-white/50">
                            {srv.region}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-white/80">
                          {srv.endpointLabel}
                        </div>
                        <div className="text-[11px] text-white/50">{srv.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* RIGHT-HAND COLLAPSIBLE APPLE MUSIC LIVE LYRICS DRAWER */}
          {showLyricsDrawer && activeNav !== 'lyrics' && renderAppleMusicLyricsPanel(false)}
        </main>
      </div>

      {/* ===================================================================
          FLOATING NOW PLAYING PILL (Appears automatically when music is playing)
         =================================================================== */}
      {isPlaying && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[92%] sm:max-w-xl w-full">
          <div className="apple-liquid-glass-pill rounded-full px-3.5 py-2 border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.75)] flex items-center justify-between gap-3">
            {/* Artwork + Live Equalizer + Track Info */}
            <div
              onClick={() => setActiveNav('lyrics')}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            >
              <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-900 border border-white/25 shrink-0">
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
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-0.5 h-3 shrink-0">
                    <span className="w-0.5 h-2.5 bg-[#fa243c] animate-pulse" />
                    <span className="w-0.5 h-3.5 bg-[#fa243c] animate-pulse" />
                    <span className="w-0.5 h-2 bg-[#fa243c] animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-white truncate">
                    {currentTrack.title}
                  </span>
                  <span className="text-[11px] text-white/55 truncate hidden sm:inline">
                    · {currentTrack.artist}
                  </span>
                </div>
                <div className="text-[11px] text-white/75 truncate mt-0.5">
                  {currentTrack.lyrics[currentLyricIndex]?.text ||
                    `${currentTrack.artist} — ${currentTrack.album}`}
                </div>
              </div>
            </div>

            {/* Material Symbols Playback Controls inside Pill */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={prevTrack}
                className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center text-white transition"
                title="前の曲"
              >
                <span className="material-symbols-rounded text-[20px]">skip_previous</span>
              </button>
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition shadow"
                title="一時停止"
              >
                <span
                  className="material-symbols-rounded text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                >
                  pause
                </span>
              </button>
              <button
                onClick={nextTrack}
                className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center text-white transition"
                title="次の曲"
              >
                <span className="material-symbols-rounded text-[20px]">skip_next</span>
              </button>
              <button
                onClick={() => setActiveNav(activeNav === 'lyrics' ? 'listen-now' : 'lyrics')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  activeNav === 'lyrics'
                    ? 'bg-[#fa243c] text-white'
                    : 'hover:bg-white/15 text-white/80 hover:text-white'
                }`}
                title="歌詞ステージ切替"
              >
                <span className="material-symbols-rounded text-[18px]">lyrics</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
