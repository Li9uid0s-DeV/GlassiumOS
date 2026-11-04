import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ProxyEngine,
  ProxyRelayNodeId,
  PROXY_RELAY_SERVERS,
  MONOCHROME_CATALOG,
  MONOCHROME_INSTANCES,
  MonochromeTrack,
  LyricLine,
  enrichLyricsWithWordTiming,
  searchMonochromeLiveTracks,
  resolveFullLengthAudioStream,
  fetchSynchronizedLyricsFromLrclib,
  fetchHtmlViaProxyCascade,
} from '../proxyService';
import { useOS } from '../OSContext';
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

const FAVORITES_STORAGE_KEY = 'glassium_apple_music_favorites_v1';
const RECENT_STORAGE_KEY = 'glassium_apple_music_recent_v1';

const POPULAR_ARTIST_SHORTCUTS = [
  'YOASOBI',
  'Kenshi Yonezu',
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

  // Proxy Engine & Relay Server State
  const [proxyEngine, setProxyEngine] = useState<ProxyEngine>('scramjet');
  const [relayNode, setRelayNode] = useState<ProxyRelayNodeId>('auto');
  const [activeRelayLabel, setActiveRelayLabel] = useState<string>('api.monochrome.tf');
  const [proxyLatency, setProxyLatency] = useState(12);
  const [isBuffering, setIsBuffering] = useState(false);

  // Track Catalog State
  const [tracks, setTracks] = useState<MonochromeTrack[]>(INITIAL_ENRICHED_CATALOG);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack: MonochromeTrack =
    tracks[currentTrackIndex] ?? tracks[0] ?? INITIAL_ENRICHED_CATALOG[0];

  // Favorites State (Persisted in localStorage)
  const [favoriteTracks, setFavoriteTracks] = useState<MonochromeTrack[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
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
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_ENRICHED_CATALOG.slice(0, 3);
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

  // High-Precision Playback State (50ms resolution)
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
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string>(
    'api.monochrome.tf 接続完了 — フル尺再生・Apple Music 同期歌詞'
  );

  // api.monochrome.tf / monochrome.tf Web Proxy State
  const [monoWebUrl, setMonoWebUrl] = useState<string>('https://monochrome.tf');
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

  // Procedural Synth Music Engine Refs
  const oscNodesRef = useRef<OscillatorNode[]>([]);
  const musicIntervalRef = useRef<number | null>(null);
  const playheadTimerRef = useRef<number | null>(null);
  const fullPlayheadRef = useRef<number>(0);
  const userScrollTimeoutRef = useRef<number | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setProxyLatency(Math.floor(10 + Math.random() * 7));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Filter tracks locally or show live search results
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase();
    const localMatches = tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
    );
    return localMatches.length > 0 ? localMatches : tracks;
  }, [searchQuery, tracks]);

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

  // Smoothly auto-scroll active lyric line to center of Apple Music lyrics container
  const scrollToActiveLyric = useCallback(
    (force = false) => {
      if (userScrolledLyrics && !force) return;
      const container = lyricsContainerRef.current;
      const activeEl = document.getElementById(`apple-lyric-line-${currentLyricIndex}`);
      if (container && activeEl) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const currentScroll = container.scrollTop;
        const targetTop =
          currentScroll +
          (activeRect.top - containerRect.top) -
          containerRect.height * 0.36 +
          activeRect.height * 0.5;
        container.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        });
      }
    },
    [currentLyricIndex, userScrolledLyrics]
  );

  useEffect(() => {
    if (showLyricsDrawer || activeNav === 'lyrics') {
      scrollToActiveLyric(false);
    }
  }, [currentLyricIndex, showLyricsDrawer, activeNav, scrollToActiveLyric]);

  const handleManualLyricsWheel = () => {
    setUserScrolledLyrics(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = window.setTimeout(() => {
      setUserScrolledLyrics(false);
    }, 4500);
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

  const startProceduralAudio = useCallback(
    (track: MonochromeTrack) => {
      stopAllAudio();
      const ctx = initAudioContext();
      if (!ctx || !filterNodeRef.current) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const { synthParams } = track;
      const secondsPerBeat = 60 / synthParams.tempo;
      let step = 0;

      const playChordStep = () => {
        if (!ctx || !filterNodeRef.current) return;
        const chordIndex = Math.floor(step / 4) % synthParams.chords.length;
        const currentChord = synthParams.chords[chordIndex] ?? [110, 130.81, 164.81];
        const bassFreq = synthParams.bassFreqs[chordIndex] ?? 55;

        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bassFreq, ctx.currentTime);

        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.26, ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + secondsPerBeat * 3.8);

        bassOsc.connect(bassGain);
        bassGain.connect(filterNodeRef.current);
        bassOsc.start();
        bassOsc.stop(ctx.currentTime + secondsPerBeat * 4);

        currentChord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = synthParams.leadType;
          osc.frequency.setValueAtTime(freq * (vocalBoost ? 2.0 : 1.5), ctx.currentTime);

          const chordGain = ctx.createGain();
          chordGain.gain.setValueAtTime(0.08 / (idx + 1), ctx.currentTime);
          chordGain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + secondsPerBeat * 1.8);

          osc.connect(chordGain);
          chordGain.connect(filterNodeRef.current!);
          osc.start();
          osc.stop(ctx.currentTime + secondsPerBeat * 2);
        });

        step++;
      };

      playChordStep();
      musicIntervalRef.current = window.setInterval(playChordStep, secondsPerBeat * 1000);
    },
    [initAudioContext, stopAllAudio, vocalBoost]
  );

  // Fetch Synchronized Lyrics from api.monochrome.tf / LRCLIB
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
        setStatusBanner(
          `同期歌詞を取得完了: ${track.title} (${synced.length}行)`
        );
      }
    } catch {
      // keep existing lyrics
    } finally {
      setIsFetchingLyrics(false);
    }
  }, []);

  // Load Monochrome Web Proxy Tab
  const loadMonochromeWebProxy = useCallback(
    async (targetUrl = monoWebUrl, node: ProxyRelayNodeId = relayNode) => {
      setMonoWebLoading(true);
      setStatusBanner(`Service Worker プロキシで ${targetUrl} を取得中...`);
      try {
        const res = await fetchHtmlViaProxyCascade(targetUrl, node);
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
    [monoWebUrl, relayNode]
  );

  useEffect(() => {
    if (activeNav === 'monochrome-web' && !monoWebSrcDoc && !monoWebLoading) {
      loadMonochromeWebProxy(monoWebUrl, relayNode);
    }
  }, [activeNav, loadMonochromeWebProxy, monoWebLoading, monoWebSrcDoc, monoWebUrl, relayNode]);

  // -----------------------------------------------------------------------
  // Playback Toggle & Track Changing (api.monochrome.tf Full-Length Stream)
  // -----------------------------------------------------------------------
  const startTrackPlayback = useCallback(
    (track: MonochromeTrack, startAtSec = 0) => {
      stopAllAudio();
      fullPlayheadRef.current = startAtSec;
      if (track.audioUrl && audioElRef.current) {
        const audio = audioElRef.current;
        audio.src = track.audioUrl;
        audio.volume = isMuted ? 0 : volume;
        audio.playbackRate = playbackRate;
        audio.currentTime = startAtSec;
        audio
          .play()
          .then(() => {
            setStatusBanner(
              `再生中 (${Math.floor(track.duration / 60)}:${String(
                Math.floor(track.duration % 60)
              ).padStart(2, '0')}): ${track.title} — ${track.artist}`
            );
          })
          .catch(() => {
            startProceduralAudio(track);
          });
      } else {
        startProceduralAudio(track);
      }
    },
    [isMuted, playbackRate, startProceduralAudio, stopAllAudio, volume]
  );

  const playTrack = useCallback(
    (trackToPlay: MonochromeTrack) => {
      setTracks((prev) => {
        const exists = prev.some((t) => t.id === trackToPlay.id);
        return exists ? prev : [trackToPlay, ...prev];
      });
      setRecentTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== trackToPlay.id);
        return [trackToPlay, ...filtered].slice(0, 24);
      });

      const idx = tracks.findIndex((t) => t.id === trackToPlay.id);
      const resolvedIdx = idx >= 0 ? idx : 0;
      setIsBuffering(true);
      setCurrentTrackIndex(resolvedIdx);
      setCurrentTime(0);
      setLyricOffsetSec(0);
      setUserScrolledLyrics(false);
      fullPlayheadRef.current = 0;

      if (trackToPlay.id.startsWith('mono-live-') && trackToPlay.lyrics.length <= 3) {
        loadLyricsForTrack(trackToPlay);
      }

      if (trackToPlay.id.startsWith('mono-live-') && !trackToPlay.isFullLengthStream) {
        resolveFullLengthAudioStream(
          trackToPlay.title,
          trackToPlay.artist,
          trackToPlay.monoTrackId
        )
          .then((resolved) => {
            if (resolved && resolved.audioUrl) {
              const updater = (list: MonochromeTrack[]) =>
                list.map((t) =>
                  t.id === trackToPlay.id
                    ? {
                        ...t,
                        audioUrl: resolved.audioUrl,
                        isFullLengthStream: true,
                        format: resolved.format,
                        bitrate: resolved.bitrate,
                      }
                    : t
                );
              setTracks(updater);
              setFavoriteTracks(updater);
              setRecentTracks(updater);

              if (audioElRef.current && audioElRef.current.src !== resolved.audioUrl) {
                const resumeSec = fullPlayheadRef.current;
                audioElRef.current.src = resolved.audioUrl;
                audioElRef.current.playbackRate = playbackRate;
                audioElRef.current.currentTime = resumeSec;
                audioElRef.current.play().catch(() => {});
                setStatusBanner(
                  `api.monochrome.tf フル尺ストリーム接続完了 (${resolved.bitrate}): ${trackToPlay.title}`
                );
              }
            }
          })
          .catch(() => {});
      }

      setTimeout(() => {
        setIsBuffering(false);
        setIsPlaying(true);
        startTrackPlayback(trackToPlay, 0);
      }, 140);
    },
    [loadLyricsForTrack, playbackRate, startTrackPlayback, tracks]
  );

  // Search Live Tracks from api.monochrome.tf
  const handleOnlineMusicSearch = useCallback(
    async (qOverride?: string) => {
      const q = (qOverride ?? searchQuery).trim() || 'YOASOBI';
      setIsSearchingOnline(true);
      setStatusBanner(`api.monochrome.tf から楽曲と同期歌詞を検索中: "${q}"...`);
      try {
        const liveResults = await searchMonochromeLiveTracks(q);
        if (liveResults.length > 0) {
          const enrichedLive = liveResults.map((t) => ({
            ...t,
            lyrics: enrichLyricsWithWordTiming(t.lyrics, t.duration),
          }));
          setTracks([...enrichedLive, ...INITIAL_ENRICHED_CATALOG]);
          setCurrentTrackIndex(0);
          setCurrentTime(0);
          fullPlayheadRef.current = 0;
          if (activeNav !== 'songs' && activeNav !== 'browse' && activeNav !== 'listen-now') {
            setActiveNav('songs');
          }
          setStatusBanner(
            `api.monochrome.tf から "${q}" の楽曲を ${enrichedLive.length} 件取得しました`
          );
          loadLyricsForTrack(enrichedLive[0]);
        } else {
          setStatusBanner(
            `"${q}" のストリームが見つかりませんでした。別のキーワードをお試しください`
          );
        }
      } catch {
        setStatusBanner('検索中にタイムアウトしました。別の中継ノードをお試しください');
      } finally {
        setIsSearchingOnline(false);
      }
    },
    [activeNav, loadLyricsForTrack, searchQuery]
  );

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAllAudio();
    } else {
      setIsBuffering(true);
      setTimeout(() => {
        setIsBuffering(false);
        setIsPlaying(true);
        startTrackPlayback(currentTrack, fullPlayheadRef.current);
      }, 120);
    }
  };

  const seekToSeconds = useCallback(
    (targetSec: number) => {
      const clamped = Math.max(0, Math.min(currentTrack.duration, targetSec));
      fullPlayheadRef.current = clamped;
      setCurrentTime(clamped);
      setUserScrolledLyrics(false);
      if (audioElRef.current && currentTrack.audioUrl) {
        const nativeDur = audioElRef.current.duration;
        if (Number.isFinite(nativeDur) && nativeDur > 0) {
          audioElRef.current.currentTime = clamped % nativeDur;
        } else {
          audioElRef.current.currentTime = clamped;
        }
      }
    },
    [currentTrack.audioUrl, currentTrack.duration]
  );

  const nextTrack = useCallback(() => {
    let nextIdx = currentTrackIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * tracks.length);
    } else if (nextIdx >= tracks.length) {
      nextIdx = 0;
    }
    const nextItem = tracks[nextIdx] ?? tracks[0];
    if (nextItem) playTrack(nextItem);
  }, [currentTrackIndex, isShuffle, playTrack, tracks]);

  const prevTrack = () => {
    if (currentTime > 4) {
      seekToSeconds(0);
      return;
    }
    let prevIdx = currentTrackIndex - 1;
    if (prevIdx < 0) {
      prevIdx = tracks.length - 1;
    }
    const prevItem = tracks[prevIdx] ?? tracks[0];
    if (prevItem) playTrack(prevItem);
  };

  // High-Precision 20fps (50ms) Playhead Tracking for Apple Music-grade Sub-Second Lyric Sync
  useEffect(() => {
    if (isPlaying) {
      const stepSec = 0.05 * playbackRate;
      playheadTimerRef.current = window.setInterval(() => {
        const audio = audioElRef.current;
        const targetFullDuration = Math.max(60, currentTrack.duration || 210);

        if (
          currentTrack.audioUrl &&
          audio &&
          !audio.paused &&
          Number.isFinite(audio.duration) &&
          audio.duration >= 65
        ) {
          const sec = audio.currentTime;
          fullPlayheadRef.current = sec;
          setCurrentTime(sec);
          if (sec >= targetFullDuration - 0.15) {
            if (isRepeat) {
              audio.currentTime = 0;
              fullPlayheadRef.current = 0;
              setCurrentTime(0);
            } else {
              nextTrack();
            }
          }
        } else {
          fullPlayheadRef.current += stepSec;
          const nextSec = fullPlayheadRef.current;
          if (nextSec >= targetFullDuration) {
            if (isRepeat) {
              fullPlayheadRef.current = 0;
              setCurrentTime(0);
              if (audio && currentTrack.audioUrl) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
              }
            } else {
              nextTrack();
              fullPlayheadRef.current = 0;
              setCurrentTime(0);
            }
          } else {
            setCurrentTime(nextSec);
          }
        }
      }, 50);
    } else {
      if (playheadTimerRef.current) {
        clearInterval(playheadTimerRef.current);
        playheadTimerRef.current = null;
      }
    }
    return () => {
      if (playheadTimerRef.current) {
        clearInterval(playheadTimerRef.current);
        playheadTimerRef.current = null;
      }
    };
  }, [isPlaying, currentTrack, isRepeat, nextTrack, playbackRate]);

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
  // Apple Music Sing Synchronized Lyrics Panel (No Emojis, No Decorative Icons)
  // -----------------------------------------------------------------------
  const renderAppleMusicLyricsPanel = (fullScreenMode = false) => {
    const currentFav = isFavorite(currentTrack.id);
    return (
      <div
        className={`${
          fullScreenMode
            ? 'flex-1'
            : 'w-full lg:w-[400px] xl:w-[440px] border-l border-white/[0.08]'
        } flex flex-col min-h-0 relative overflow-hidden bg-black/30 backdrop-blur-2xl shrink-0`}
      >
        {/* Lyrics Control Header */}
        <div className="px-5 py-3 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold tracking-tight text-white">
              Lyrics
            </span>
            <span className="text-[11px] text-white/40 font-mono tabular-nums">
              · {currentTrack.lyrics.length} lines
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Sync Offset Calibration Controls (-0.2s / 0.0s / +0.2s) */}
            <div className="flex items-center bg-white/[0.06] border border-white/10 px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded-md">
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
              onClick={() => toggleFavorite(currentTrack)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                currentFav
                  ? 'bg-[#fa243c] text-white border-[#fa243c]'
                  : 'bg-white/[0.06] text-white/75 border-white/10 hover:text-white'
              }`}
            >
              {currentFav ? 'お気に入り済' : 'お気に入り追加'}
            </button>

            <button
              onClick={() => loadLyricsForTrack(currentTrack)}
              disabled={isFetchingLyrics}
              className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/15 border border-white/10 text-[11px] text-white/80 hover:text-white transition"
            >
              {isFetchingLyrics ? '同期中...' : '再同期'}
            </button>
          </div>
        </div>

        {/* Floating "Return to Auto-Sync" Button when user scrolls manually */}
        {userScrolledLyrics && (
          <div className="absolute top-14 right-5 z-20">
            <button
              onClick={() => {
                setUserScrolledLyrics(false);
                scrollToActiveLyric(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#fa243c] hover:bg-[#e01e35] text-white font-semibold text-xs shadow-xl transition"
            >
              同期スクロールに戻る
            </button>
          </div>
        )}

        {/* Scrolling Apple Music Lyrics Viewport */}
        <div
          ref={lyricsContainerRef}
          onWheel={handleManualLyricsWheel}
          className={`flex-1 overflow-y-auto ${
            fullScreenMode ? 'px-8 sm:px-14 py-14' : 'px-6 py-10'
          } space-y-6 select-none scroll-smooth`}
        >
          <div className="h-10" />
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

            let depthStyle = 'opacity-25 blur-[1.5px] hover:opacity-85 hover:blur-0 scale-[0.96]';
            if (isActive) {
              depthStyle = 'opacity-100 blur-0 scale-100';
            } else if (distance === 1) {
              depthStyle = 'opacity-55 blur-[0.4px] hover:opacity-90 hover:blur-0 scale-[0.98]';
            } else if (distance === 2) {
              depthStyle = 'opacity-38 blur-[0.9px] hover:opacity-85 hover:blur-0 scale-[0.97]';
            }

            // Apple Music Instrumental Interlude (• • •)
            if (line.isInterlude) {
              if (!isActive && distance > 1) return null;
              return (
                <div
                  key={`interlude-${idx}`}
                  id={`apple-lyric-line-${idx}`}
                  onClick={() => seekToSeconds(line.time)}
                  className={`cursor-pointer transition-all duration-500 py-3 px-3 origin-left ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-35 scale-90'
                  }`}
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
                              ? 'bg-white scale-125 shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                              : 'bg-white/25 scale-95'
                          }`}
                        />
                      );
                    })}
                    {isActive && (
                      <div className="w-20 h-0.5 bg-white/15 overflow-hidden ml-2">
                        <div
                          className="h-full bg-white/85 transition-all duration-100"
                          style={{ width: `${Math.round(lineProgress * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                id={`apple-lyric-line-${idx}`}
                onClick={() => seekToSeconds(line.time)}
                className={`group cursor-pointer transition-all duration-500 py-2 px-3 origin-left rounded-lg hover:bg-white/[0.04] ${depthStyle}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div
                    className={`font-bold tracking-tight leading-snug transition-all duration-300 ${
                      fullScreenMode
                        ? isActive
                          ? 'text-2xl sm:text-3xl md:text-4xl'
                          : 'text-xl sm:text-2xl text-white/80'
                        : isActive
                        ? 'text-xl sm:text-2xl'
                        : 'text-base sm:text-lg text-white/80'
                    }`}
                  >
                    {isActive && line.words && line.words.length > 0 ? (
                      <span className="inline">
                        {line.words.map((w, wIdx) => {
                          const wSpan = Math.max(0.08, w.end - w.start);
                          const wProg = Math.max(
                            0,
                            Math.min(1, (effectiveLyricTime - w.start) / wSpan)
                          );
                          const isWordSung = wProg >= 0.98;
                          const isWordCurrent = wProg > 0 && wProg < 0.98;

                          return (
                            <span
                              key={wIdx}
                              className={`inline-block whitespace-pre-wrap transition-transform duration-150 ${
                                isWordCurrent
                                  ? '-translate-y-[2px] text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.75)]'
                                  : isWordSung
                                  ? '-translate-y-[1px] text-white'
                                  : 'text-white/35'
                              }`}
                            >
                              {w.text}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className={isActive ? 'text-white' : 'text-white/75'}>
                        {line.text}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-mono tabular-nums shrink-0 transition-opacity ${
                      isActive
                        ? 'opacity-70 text-white/70'
                        : 'opacity-0 group-hover:opacity-65 text-white/50'
                    }`}
                  >
                    {formatSecs(line.time)}
                  </span>
                </div>

                {isActive && (
                  <div className="mt-2 h-0.5 w-24 bg-white/15 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-75"
                      style={{ width: `${Math.round(lineProgress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <div className="h-40" />
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
                {/* Index or Equalizer Bars */}
                <div className="text-xs font-mono tabular-nums text-white/45">
                  {isCurrent && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 h-2.5 bg-[#fa243c] animate-pulse" />
                      <span className="w-0.5 h-3.5 bg-[#fa243c] animate-pulse" />
                      <span className="w-0.5 h-2 bg-[#fa243c] animate-pulse" />
                    </div>
                  ) : (
                    <span>{idx + 1}</span>
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

      {/* Hidden HTML5 Audio Element for api.monochrome.tf Full-Length Streams */}
      <audio
        ref={audioElRef}
        crossOrigin="anonymous"
        onEnded={() => {
          const targetDuration = Math.max(60, currentTrack.duration || 210);
          if (fullPlayheadRef.current < targetDuration - 4 && audioElRef.current) {
            audioElRef.current.currentTime = 0;
            audioElRef.current.play().catch(() => {
              startProceduralAudio(currentTrack);
            });
            return;
          }
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
          TOP APPLE MUSIC PLAYER BAR (Transport + LCD Now Playing + Controls)
         =================================================================== */}
      <div className="relative z-20 h-14 px-4 bg-[#1c1c1e]/90 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
        {/* Left: Apple Music Transport Controls (Pure Minimalist Labels, No Decorative Icons) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              isShuffle ? 'text-[#fa243c] bg-[#fa243c]/15' : 'text-white/55 hover:text-white'
            }`}
          >
            Shuffle
          </button>
          <button
            onClick={prevTrack}
            className="px-2.5 py-1 rounded text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08] transition"
          >
            Prev
          </button>
          <button
            onClick={togglePlay}
            className="px-3.5 py-1 rounded-md bg-white text-black hover:bg-white/90 text-xs font-bold tracking-tight transition"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={nextTrack}
            className="px-2.5 py-1 rounded text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08] transition"
          >
            Next
          </button>
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              isRepeat ? 'text-[#fa243c] bg-[#fa243c]/15' : 'text-white/55 hover:text-white'
            }`}
          >
            Repeat
          </button>
        </div>

        {/* Center: Signature Apple Music LCD Now Playing Display + Scrubber */}
        <div className="flex-1 max-w-xl h-10 bg-black/45 border border-white/[0.08] rounded-md flex flex-col justify-between overflow-hidden relative">
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
              className="text-[11px] font-medium text-white/60 hover:text-white transition"
            >
              {isMuted || volume === 0 ? 'Muted' : 'Vol'}
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
            LEFT APPLE MUSIC SIDEBAR (Clean Typography, Zero Icons/Emojis)
           ----------------------------------------------------------------- */}
        <aside className="w-56 bg-[#18181b]/85 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col justify-between p-3 shrink-0 overflow-y-auto">
          <div className="space-y-5">
            {/* Search Box (Queries api.monochrome.tf) */}
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
                  placeholder="検索 (api.monochrome.tf)"
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
                      className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-[#fa243c] text-[11px] text-white/75 hover:text-white transition"
                    >
                      {artist}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured Now Playing Banner Card */}
              <div className="p-6 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col sm:flex-row items-center gap-6">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg overflow-hidden bg-zinc-900 border border-white/15 shrink-0 shadow-2xl">
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
                    Now Playing · {currentTrack.format}
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
                      className="px-5 py-2 rounded-md bg-[#fa243c] hover:bg-[#e01e35] text-white text-xs font-semibold transition"
                    >
                      {isPlaying ? '一時停止' : '再生'}
                    </button>
                    <button
                      onClick={() => toggleFavorite(currentTrack)}
                      className={`px-4 py-2 rounded-md text-xs font-semibold border transition ${
                        isFavorite(currentTrack.id)
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.06] text-white border-white/15 hover:bg-white/15'
                      }`}
                    >
                      {isFavorite(currentTrack.id) ? 'お気に入り登録済' : 'お気に入りに追加'}
                    </button>
                    <button
                      onClick={() => setShowLyricsDrawer((s) => !s)}
                      className="px-4 py-2 rounded-md bg-white/[0.06] hover:bg-white/15 border border-white/15 text-xs font-medium text-white transition"
                    >
                      {showLyricsDrawer ? '歌詞パネルを閉じる' : '歌詞パネルを開く'}
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

              {/* All Songs / Search Results Table */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">
                  トラック一覧 ({filteredTracks.length}曲)
                </h3>
                {renderAppleMusicSongTable(filteredTracks, '楽曲が見つかりません')}
              </div>
            </div>
          )}

          {/* VIEW 2: BROWSE (見つける) */}
          {activeNav === 'browse' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  見つける (api.monochrome.tf カタログ)
                </h1>
                <p className="text-xs text-white/50 mt-1">
                  アーティストをクリックすると api.monochrome.tf からフル尺ストリームと同期歌詞を取得します
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {POPULAR_ARTIST_SHORTCUTS.map((artist) => (
                  <button
                    key={artist}
                    onClick={() => {
                      setSearchQuery(artist);
                      handleOnlineMusicSearch(artist);
                    }}
                    className="p-4 rounded-lg bg-white/[0.04] hover:bg-[#fa243c]/20 border border-white/[0.08] hover:border-[#fa243c] text-left transition"
                  >
                    <div className="text-sm font-bold text-white">{artist}</div>
                    <div className="text-[11px] text-white/45 mt-1">api.monochrome.tf 検索</div>
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
              <div className="border-b border-white/[0.08] pb-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  すべての曲
                </h1>
                <p className="text-xs text-white/50 mt-1">{statusBanner}</p>
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

          {/* VIEW 6: FULL-SCREEN LYRICS (歌詞フル画面) */}
          {activeNav === 'lyrics' && renderAppleMusicLyricsPanel(true)}

          {/* VIEW 7: API.MONOCHROME.TF WEB PROXY */}
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
                        loadMonochromeWebProxy(inst.url, relayNode);
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

                <div className="flex items-center gap-2">
                  <select
                    value={relayNode}
                    onChange={(e) => {
                      const nextNode = e.target.value as ProxyRelayNodeId;
                      setRelayNode(nextNode);
                      loadMonochromeWebProxy(monoWebUrl, nextNode);
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
                    onClick={() => loadMonochromeWebProxy(monoWebUrl, relayNode)}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px]"
                  >
                    再読込
                  </button>
                </div>
              </div>

              <div className="flex-1 relative bg-white">
                {monoWebLoading && (
                  <div className="absolute inset-0 z-20 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center text-xs text-white font-mono">
                    Service Worker プロキシ経由で {monoWebUrl} を接続中...
                  </div>
                )}
                <iframe
                  srcDoc={monoWebSrcDoc}
                  className="w-full h-full border-0 bg-white"
                  title="monochrome-sw-proxy"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
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

          {/* VIEW 10: PROXY SETTINGS */}
          {activeNav === 'proxy' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-3xl">
              <div>
                <h2 className="text-lg font-bold text-white">
                  api.monochrome.tf Service Worker Proxy &amp; Relay Settings
                </h2>
                <p className="text-xs text-white/55 mt-1">
                  プライマリエンドポイント https://api.monochrome.tf と複数のフォールバックプロキシを使用して、フル尺楽曲と同期歌詞を取得します。
                </p>
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

              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10 space-y-3">
                <span className="text-xs font-semibold text-white block">
                  Rewriter Protocol:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setProxyEngine('scramjet')}
                    className={`p-3 rounded-lg border text-left transition ${
                      proxyEngine === 'scramjet'
                        ? 'bg-[#fa243c]/20 border-[#fa243c] text-white'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">
                      Scramjet Engine v3 (SW + srcDoc)
                    </div>
                    <div className="text-[11px] text-white/55 mt-0.5">
                      Service Worker トンネル経由で api.monochrome.tf のストリームと歌詞を中継します。
                    </div>
                  </button>

                  <button
                    onClick={() => setProxyEngine('ultraviolet')}
                    className={`p-3 rounded-lg border text-left transition ${
                      proxyEngine === 'ultraviolet'
                        ? 'bg-[#fa243c]/20 border-[#fa243c] text-white'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">Ultraviolet Engine v2.0</div>
                    <div className="text-[11px] text-white/55 mt-0.5">
                      エンコード URL トンネリングと Service Worker キャッシュ制御。
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT-HAND COLLAPSIBLE APPLE MUSIC LIVE LYRICS DRAWER */}
          {showLyricsDrawer && activeNav !== 'lyrics' && renderAppleMusicLyricsPanel(false)}
        </main>
      </div>
    </div>
  );
}
