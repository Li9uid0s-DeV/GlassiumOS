import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '../Icon';
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

type SynthTab = 'player' | 'lyrics' | 'monochrome-web' | 'synth' | 'drumpad' | 'proxy';
type PlayerStageMode = 'split' | 'lyrics-focus' | 'visualizer-focus';

function resolveInitialSynthTab(tab?: string): SynthTab {
  if (tab === 'drumpad' || tab === 'tuner') return 'drumpad';
  if (tab === 'lyrics') return 'lyrics';
  if (tab === 'monochrome-web') return 'monochrome-web';
  if (tab === 'synth') return 'synth';
  if (tab === 'proxy') return 'proxy';
  return 'player';
}

const INITIAL_ENRICHED_CATALOG: MonochromeTrack[] = MONOCHROME_CATALOG.map((t) => ({
  ...t,
  lyrics: enrichLyricsWithWordTiming(t.lyrics, t.duration),
}));

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

  const [activeTab, setActiveTab] = useState<SynthTab>(() => resolveInitialSynthTab(initialTab));
  const [stageMode, setStageMode] = useState<PlayerStageMode>('split');
  const [showLibrarySidebar, setShowLibrarySidebar] = useState<boolean>(true);

  useEffect(() => {
    if (initialTab) setActiveTab(resolveInitialSynthTab(initialTab));
  }, [initialTab]);

  // Proxy Engine & Relay Server State
  const [proxyEngine, setProxyEngine] = useState<ProxyEngine>('scramjet');
  const [relayNode, setRelayNode] = useState<ProxyRelayNodeId>('auto');
  const [activeRelayLabel, setActiveRelayLabel] = useState<string>('SW + Multi-Node Ready');
  const [proxyLatency, setProxyLatency] = useState(14);
  const [isBuffering, setIsBuffering] = useState(false);

  // Track Catalog State (Curated + Live Monochrome / Saavn / Audius / iTunes Search Tracks)
  const [tracks, setTracks] = useState<MonochromeTrack[]>(INITIAL_ENRICHED_CATALOG);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack: MonochromeTrack =
    tracks[currentTrackIndex] ?? tracks[0] ?? INITIAL_ENRICHED_CATALOG[0];

  // High-Precision Playback State (currentTime in floating-point seconds, 50ms resolution)
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
    'Apple Music Sing リアルタイム同期歌詞 & フル尺ストリーミング準備完了'
  );

  // Monochrome.st Service Worker Web Proxy Tab State
  const [monoWebUrl, setMonoWebUrl] = useState<string>('https://monochrome.st');
  const [monoWebSrcDoc, setMonoWebSrcDoc] = useState<string>('');
  const [monoWebLoading, setMonoWebLoading] = useState<boolean>(false);

  // Translucent Synth Controls
  const [waveform, setWaveform] = useState<OscillatorType>('sawtooth');
  const [baseFreq, setBaseFreq] = useState(220); // A3
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

  // Latency jitter simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setProxyLatency(Math.floor(10 + Math.random() * 8));
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

  // Effective lyric synchronization time (incorporates fine-tuning offset)
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

  // Smoothly auto-scroll active lyric line to vertical center of the Apple Music lyrics container
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
    if (activeTab === 'player' || activeTab === 'lyrics') {
      scrollToActiveLyric(false);
    }
  }, [currentLyricIndex, activeTab, stageMode, scrollToActiveLyric]);

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

  // Fetch Synchronized Lyrics from LRCLIB for a given track
  const loadLyricsForTrack = useCallback(async (track: MonochromeTrack) => {
    setIsFetchingLyrics(true);
    try {
      const synced = await fetchSynchronizedLyricsFromLrclib(
        track.title,
        track.artist,
        track.duration
      );
      if (synced && synced.length > 0) {
        setTracks((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, lyrics: synced } : t))
        );
        setStatusBanner(
          `✓ Apple Music Sing 同期歌詞を取得完了: ${track.title} (${synced.length}行)`
        );
      }
    } catch {
      // keep existing lyrics
    } finally {
      setIsFetchingLyrics(false);
    }
  }, []);

  // Load Monochrome.st / Monochrome.tf inside the built-in Service Worker Proxy Web Tab
  const loadMonochromeWebProxy = useCallback(
    async (targetUrl = monoWebUrl, node: ProxyRelayNodeId = relayNode) => {
      setMonoWebLoading(true);
      setStatusBanner(`🌐 Service Worker マルチノードプロキシで ${targetUrl} を取得中...`);
      try {
        const res = await fetchHtmlViaProxyCascade(targetUrl, node);
        setMonoWebSrcDoc(res.html);
        setActiveRelayLabel(res.usedNode);
        setStatusBanner(`✓ ${targetUrl} をプロキシ中継サーバー [${res.usedNode}] 経由で接続しました`);
      } catch {
        setStatusBanner(
          `⚠️ ${targetUrl} の中継に失敗しました。上部のプロキシノードを切り替えて再試行してください`
        );
      } finally {
        setMonoWebLoading(false);
      }
    },
    [monoWebUrl, relayNode]
  );

  useEffect(() => {
    if (activeTab === 'monochrome-web' && !monoWebSrcDoc && !monoWebLoading) {
      loadMonochromeWebProxy(monoWebUrl, relayNode);
    }
  }, [activeTab, loadMonochromeWebProxy, monoWebLoading, monoWebSrcDoc, monoWebUrl, relayNode]);

  // -----------------------------------------------------------------------
  // Playback Toggle & Track Changing (Full-Length Audio Stream + Hybrid Engine)
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
              `🎵 フル尺再生中 (${Math.floor(track.duration / 60)}:${String(
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
      const idx = tracks.findIndex((t) => t.id === trackToPlay.id);
      const resolvedIdx = idx >= 0 ? idx : 0;
      setIsBuffering(true);
      setCurrentTrackIndex(resolvedIdx);
      setCurrentTime(0);
      setLyricOffsetSec(0);
      setUserScrolledLyrics(false);
      fullPlayheadRef.current = 0;

      // Always fetch synchronized LRC lyrics from LRCLIB for live tracks if not yet loaded
      if (trackToPlay.id.startsWith('mono-live-') && trackToPlay.lyrics.length <= 3) {
        loadLyricsForTrack(trackToPlay);
      }

      // Resolve verified full-length stream URL in background if not yet resolved
      if (trackToPlay.id.startsWith('mono-live-') && !trackToPlay.isFullLengthStream) {
        resolveFullLengthAudioStream(
          trackToPlay.title,
          trackToPlay.artist,
          trackToPlay.monoTrackId
        )
          .then((resolved) => {
            if (resolved && resolved.audioUrl) {
              setTracks((prev) =>
                prev.map((t) =>
                  t.id === trackToPlay.id
                    ? {
                        ...t,
                        audioUrl: resolved.audioUrl,
                        isFullLengthStream: true,
                        format: resolved.format,
                        bitrate: resolved.bitrate,
                      }
                    : t
                )
              );
              if (audioElRef.current && audioElRef.current.src !== resolved.audioUrl) {
                const resumeSec = fullPlayheadRef.current;
                audioElRef.current.src = resolved.audioUrl;
                audioElRef.current.playbackRate = playbackRate;
                audioElRef.current.currentTime = resumeSec;
                audioElRef.current.play().catch(() => {});
                setStatusBanner(
                  `✓ フル尺ストリーム接続完了 (${resolved.bitrate}): ${trackToPlay.title}`
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
      }, 150);
    },
    [loadLyricsForTrack, playbackRate, startTrackPlayback, tracks]
  );

  // Search Live Tracks from Monochrome / Saavn / Audius / iTunes & auto-play / load lyrics
  const handleOnlineMusicSearch = useCallback(
    async (qOverride?: string) => {
      const q = (qOverride ?? searchQuery).trim() || 'YOASOBI';
      setIsSearchingOnline(true);
      setStatusBanner(`🌐 フル尺楽曲ストリーム & 同期歌詞を検索中: "${q}"...`);
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
          setStatusBanner(
            `✓ "${q}" のフル尺楽曲を ${enrichedLive.length} 件取得しました！ クリックで即座に再生＆Apple Music同期歌詞を表示します`
          );
          loadLyricsForTrack(enrichedLive[0]);
        } else {
          setStatusBanner(
            `⚠️ "${q}" のストリームが見つかりませんでした。別キーワードまたは Monochrome.st タブをお試しください`
          );
        }
      } catch {
        setStatusBanner('⚠️ オンライン検索中にタイムアウトしました。別の中継ノードをお試しください');
      } finally {
        setIsSearchingOnline(false);
      }
    },
    [loadLyricsForTrack, searchQuery]
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
  // Liquid Visualizer Canvas Animation Loop
  // -----------------------------------------------------------------------
  useEffect(() => {
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

      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.28;

      ctx.beginPath();
      const numPoints = 64;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const val = dataArray[i % dataArray.length] / 255;
        const r = baseRadius + val * 52;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const radialGrad = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.25,
        cx,
        cy,
        baseRadius + 64
      );
      radialGrad.addColorStop(0, 'rgba(249, 115, 22, 0.42)');
      radialGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.24)');
      radialGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
      ctx.fillStyle = radialGrad;
      ctx.fill();

      ctx.strokeStyle = isPlaying ? '#fb923c' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const numBars = 40;
      const barWidth = w / numBars;
      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * 2] / 255;
        const barHeight = val * (h * 0.32);
        const x = i * barWidth;
        const y = h - barHeight;

        const barGrad = ctx.createLinearGradient(0, y, 0, h);
        barGrad.addColorStop(0, '#fb923c');
        barGrad.addColorStop(1, 'rgba(249, 115, 22, 0.04)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(x + 2, y, Math.max(2, barWidth - 4), barHeight);
      }

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, currentTrack.audioUrl, activeTab, stageMode]);

  // Clean up on component unmount
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
  // Apple Music Sing Lyric Line Renderer (Word-by-Word Fill + Blur Depth + ••• Interlude)
  // -----------------------------------------------------------------------
  const renderAppleMusicLyricsPanel = (compactHeader = false) => {
    return (
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* Top Apple Music Sing Control Bar */}
        <div className="px-5 py-2.5 border-b border-white/10 bg-black/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <Icon name="Mic2" size={14} className="text-orange-400" />
            <span className="text-xs font-bold tracking-tight text-white">
              Apple Music Sing ライブ同期歌詞
            </span>
            <span className="text-[11px] text-white/45 font-mono tabular-nums">
              · {currentTrack.lyrics.length}行
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Sync Offset Calibration Controls (-0.2s / 0.0s / +0.2s) */}
            <div className="flex items-center bg-white/[0.06] border border-white/10 px-1.5 py-0.5 text-[10px] font-mono tabular-nums">
              <span className="text-white/50 mr-1">同期補正:</span>
              <button
                onClick={() => setLyricOffsetSec((o) => Math.round((o - 0.2) * 10) / 10)}
                className="px-1.5 py-0.5 hover:bg-white/15 text-white/80 hover:text-white transition"
                title="歌詞を0.2秒遅らせる"
              >
                -0.2s
              </button>
              <button
                onClick={() => setLyricOffsetSec(0)}
                className={`px-1.5 py-0.5 font-bold transition ${
                  lyricOffsetSec === 0 ? 'text-orange-400' : 'text-cyan-300 underline'
                }`}
                title="クリックで0.0sにリセット"
              >
                {lyricOffsetSec >= 0 ? `+${lyricOffsetSec.toFixed(1)}s` : `${lyricOffsetSec.toFixed(1)}s`}
              </button>
              <button
                onClick={() => setLyricOffsetSec((o) => Math.round((o + 0.2) * 10) / 10)}
                className="px-1.5 py-0.5 hover:bg-white/15 text-white/80 hover:text-white transition"
                title="歌詞を0.2秒早める"
              >
                +0.2s
              </button>
            </div>

            {/* Apple Music Sing Vocal Boost Toggle */}
            <button
              onClick={() => setVocalBoost((v) => !v)}
              className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 transition border ${
                vocalBoost
                  ? 'bg-orange-500 text-black border-orange-400'
                  : 'bg-white/[0.06] text-white/75 border-white/10 hover:bg-white/15 hover:text-white'
              }`}
              title="Apple Music Sing ボーカル帯域ブースト"
            >
              <Icon name="Mic2" size={11} />
              <span>Sing {vocalBoost ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => loadLyricsForTrack(currentTrack)}
              disabled={isFetchingLyrics}
              className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/15 border border-white/10 text-[11px] text-white/80 hover:text-white transition"
              title="LRCLIBから同期歌詞を再取得"
            >
              {isFetchingLyrics ? '同期中...' : '歌詞再取得'}
            </button>
          </div>
        </div>

        {/* Floating "Return to Auto-Sync" Button when user scrolls manually */}
        {userScrolledLyrics && (
          <div className="absolute top-14 right-6 z-20">
            <button
              onClick={() => {
                setUserScrolledLyrics(false);
                scrollToActiveLyric(true);
              }}
              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs shadow-xl flex items-center gap-1.5 transition"
            >
              <Icon name="Play" size={12} />
              <span>現在の歌詞へ戻る</span>
            </button>
          </div>
        )}

        {/* Main Apple Music Scrolling Lyrics Viewport */}
        <div
          ref={lyricsContainerRef}
          onWheel={handleManualLyricsWheel}
          className={`flex-1 overflow-y-auto px-6 sm:px-10 ${
            compactHeader ? 'py-10' : 'py-14'
          } space-y-6 select-none scroll-smooth`}
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

            // Apple Music optical depth blur & opacity curve based on distance from active line
            let depthStyle = 'opacity-25 blur-[1.6px] hover:opacity-85 hover:blur-0 scale-[0.96]';
            if (isActive) {
              depthStyle = 'opacity-100 blur-0 scale-100';
            } else if (distance === 1) {
              depthStyle = 'opacity-55 blur-[0.4px] hover:opacity-90 hover:blur-0 scale-[0.98]';
            } else if (distance === 2) {
              depthStyle = 'opacity-38 blur-[0.9px] hover:opacity-85 hover:blur-0 scale-[0.97]';
            }

            // Interlude / Instrumental Break (• • •)
            if (line.isInterlude) {
              if (!isActive && distance > 1) return null;
              return (
                <div
                  key={`interlude-${idx}`}
                  id={`apple-lyric-line-${idx}`}
                  onClick={() => seekToSeconds(line.time)}
                  className={`cursor-pointer transition-all duration-500 py-3 px-4 origin-left ${
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
                          className={`inline-block w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                            lit
                              ? 'bg-white scale-125 shadow-[0_0_14px_rgba(255,255,255,0.95)]'
                              : 'bg-white/30 scale-95'
                          }`}
                        />
                      );
                    })}
                    {isActive && (
                      <div className="w-24 h-1 bg-white/15 overflow-hidden ml-2">
                        <div
                          className="h-full bg-white/80 transition-all duration-100"
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
                className={`group cursor-pointer transition-all duration-500 py-2 px-4 origin-left rounded-xl hover:bg-white/[0.04] ${depthStyle}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  {/* Left-Aligned Bold Apple Music Sing Typography with Word-by-Word Fill */}
                  <div
                    className={`font-extrabold tracking-tight leading-snug transition-all duration-300 ${
                      isActive
                        ? 'text-2xl sm:text-3xl md:text-[32px]'
                        : 'text-lg sm:text-xl md:text-2xl text-white/85'
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
                                  ? '-translate-y-[2px] text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.75)]'
                                  : isWordSung
                                  ? '-translate-y-[1px] text-white drop-shadow-[0_0_10px_rgba(251,146,60,0.45)]'
                                  : 'text-white/35'
                              }`}
                            >
                              {w.text}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className={isActive ? 'text-white' : 'text-white/80'}>
                        {line.text}
                      </span>
                    )}
                  </div>

                  {/* Subtle Timestamp on Hover or Active Line */}
                  <span
                    className={`text-[11px] font-mono tabular-nums shrink-0 transition-opacity ${
                      isActive
                        ? 'opacity-75 text-orange-300'
                        : 'opacity-0 group-hover:opacity-70 text-white/60'
                    }`}
                  >
                    {formatSecs(line.time)}
                  </span>
                </div>

                {/* Subtle Active Line Progress Bar */}
                {isActive && (
                  <div className="mt-2 h-0.5 w-28 bg-white/15 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-white via-orange-300 to-orange-500 transition-all duration-75"
                      style={{ width: `${Math.round(lineProgress * 100)}%` }}
                    />
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

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950 text-white select-none overflow-hidden font-sans relative">
      {/* Dynamic Ambient Artwork Blurred Backdrop (Apple Music Live Lyrics Atmosphere) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {currentTrack.artworkUrl ? (
          <img
            src={currentTrack.artworkUrl}
            alt=""
            className="w-full h-full object-cover scale-150 blur-[90px] opacity-30 transition-all duration-1000"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${currentTrack.coverGradient} opacity-45 blur-3xl transition-all duration-1000`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/75 via-zinc-950/65 to-zinc-950/95" />
      </div>

      {/* Hidden HTML5 Audio Element for Live Monochrome / Full-Length AAC & FLAC Streams */}
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

      {/* -------------------------------------------------------------------
          Top Navigation Header
         ------------------------------------------------------------------- */}
      <div className="relative z-10 flex items-center justify-between px-4 bg-black/60 backdrop-blur-xl border-b border-white/10 shrink-0 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2.5 py-2.5 shrink-0">
          <button
            onClick={() => setShowLibrarySidebar((s) => !s)}
            className="p-1.5 bg-white/[0.06] hover:bg-white/15 text-white/80 hover:text-white transition"
            title={showLibrarySidebar ? 'サイドバーを隠す' : '楽曲検索サイドバーを表示'}
          >
            <Icon name="List" size={14} />
          </button>
          <Icon name="Music" size={16} className="text-orange-400" />
          <span className="text-xs font-bold tracking-wider uppercase text-white">
            Monochrome Music
          </span>
          <span className="text-[11px] text-white/50 font-mono tabular-nums hidden sm:inline">
            · {activeRelayLabel} ({proxyLatency}ms)
          </span>
        </div>

        {/* Primary View Mode Navigation Tabs */}
        <div className="flex items-center gap-3 shrink-0">
          {[
            { id: 'player' as const, label: 'プレイヤー & 同期歌詞', icon: 'Disc' },
            { id: 'lyrics' as const, label: '歌詞シアター', icon: 'Mic2' },
            { id: 'monochrome-web' as const, label: 'Monochrome.st (SWプロキシ)', icon: 'Globe' },
            { id: 'synth' as const, label: 'シンセ', icon: 'Sliders' },
            { id: 'drumpad' as const, label: 'ドラム・周波数', icon: 'Volume2' },
            { id: 'proxy' as const, label: 'プロキシ設定', icon: 'Server' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 border-b-2 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <Icon name={t.icon} size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() =>
              openApp('browser', {
                payload: { url: 'about:gcs' },
              })
            }
            className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition"
            title="storage.googleapis.com ゲートウェイで開く"
          >
            <Icon name="HardDrive" size={12} />
            <span>GCS起動</span>
          </button>
          <button
            onClick={() =>
              openApp('browser', {
                payload: { url: currentTrack.sourceUrl || 'https://monochrome.st' },
              })
            }
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1 transition"
            title="ブラウザで開く"
          >
            <Icon name="Globe" size={12} />
            <span>ブラウザ</span>
          </button>
        </div>
      </div>

      {/* Sub-Header Status & Stage Mode Switcher */}
      <div className="relative z-10 px-4 py-1.5 bg-zinc-900/75 backdrop-blur-md border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/70 shrink-0">
        <span className="truncate font-mono">{statusBanner}</span>

        {activeTab === 'player' && (
          <div className="flex items-center gap-1 bg-black/45 p-0.5 border border-white/10 shrink-0">
            {[
              { id: 'split' as const, label: '分割: アート + 歌詞' },
              { id: 'lyrics-focus' as const, label: '歌詞ワイド' },
              { id: 'visualizer-focus' as const, label: 'ビジュアライザー' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setStageMode(m.id)}
                className={`px-2.5 py-0.5 text-[11px] font-medium transition ${
                  stageMode === m.id
                    ? 'bg-orange-500 text-black font-bold'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------
          Main View Body
         ------------------------------------------------------------------- */}
      <div className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        {/* =================================================================
            TAB 1: UNIFIED APPLE MUSIC PLAYER + LIVE LYRICS + SEARCH SIDEBAR
           ================================================================= */}
        {activeTab === 'player' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left Collapsible Library & Live Monochrome Search Sidebar */}
            {showLibrarySidebar && (
              <div className="w-full md:w-80 lg:w-88 border-r border-white/10 flex flex-col bg-black/35 backdrop-blur-xl shrink-0 min-h-0">
                <div className="p-3 border-b border-white/10 space-y-2.5">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleOnlineMusicSearch();
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <div className="flex-1 flex items-center gap-2 bg-white/[0.07] border border-white/15 focus-within:border-orange-400 px-2.5 py-1.5 text-xs transition">
                      <Icon name="Search" size={13} className="text-orange-400 shrink-0" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="曲名・アーティストを検索 (フル尺)..."
                        className="bg-transparent text-white outline-none w-full text-xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-white/40 hover:text-white"
                        >
                          <Icon name="X" size={12} />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingOnline}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs shrink-0 transition"
                    >
                      {isSearchingOnline ? '検索中...' : '検索'}
                    </button>
                  </form>

                  {/* 1-Click Artist Quick Search Buttons */}
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_ARTIST_SHORTCUTS.map((artist) => (
                      <button
                        key={artist}
                        onClick={() => {
                          setSearchQuery(artist);
                          handleOnlineMusicSearch(artist);
                        }}
                        className="px-2 py-0.5 bg-white/[0.06] hover:bg-orange-500/25 text-[10px] text-white/75 hover:text-orange-200 transition"
                      >
                        {artist}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Track List */}
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {filteredTracks.map((track) => {
                    const isCurrent = track.id === currentTrack.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => playTrack(track)}
                        className={`p-2.5 flex items-center gap-3 cursor-pointer transition ${
                          isCurrent ? 'bg-orange-500/20' : 'hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="relative w-11 h-11 shrink-0 overflow-hidden border border-white/15">
                          {track.artworkUrl ? (
                            <img
                              src={track.artworkUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-br ${track.coverGradient} flex items-center justify-center`}
                            >
                              <Icon
                                name="Music"
                                size={16}
                                className={isCurrent ? 'text-orange-400' : 'text-white/60'}
                              />
                            </div>
                          )}
                          {isCurrent && isPlaying && (
                            <div className="absolute inset-0 bg-black/55 flex items-end justify-center gap-0.5 pb-2">
                              <span className="w-1 h-3 bg-orange-400 animate-pulse" />
                              <span className="w-1 h-5 bg-orange-300 animate-pulse" />
                              <span className="w-1 h-2.5 bg-orange-400 animate-pulse" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-bold truncate ${
                              isCurrent ? 'text-orange-300' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </div>
                          <div className="text-[11px] text-white/55 truncate">{track.artist}</div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-mono tabular-nums text-white/65">
                            {formatSecs(track.duration)}
                          </div>
                          <div className="text-[9px] font-mono text-orange-400/90">
                            {track.isFullLengthStream ? 'FULL 320K' : 'FULL SYNC'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Center/Right Stage: Artwork + Visualizer + Apple Music Live Lyrics */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              {/* Left/Center Now Playing Artwork & Visualizer Column (Shown in 'split' and 'visualizer-focus' modes) */}
              {stageMode !== 'lyrics-focus' && (
                <div
                  className={`${
                    stageMode === 'split'
                      ? 'w-full lg:w-88 xl:w-96 border-b lg:border-b-0 lg:border-r border-white/10'
                      : 'flex-1'
                  } p-6 flex flex-col items-center justify-center bg-black/20 shrink-0 overflow-y-auto`}
                >
                  <div className="max-w-sm w-full flex flex-col items-center gap-4">
                    {/* Album Artwork + Circular Audio Spectrum Visualizer */}
                    <div
                      className={`relative ${
                        stageMode === 'visualizer-focus' ? 'w-72 h-72 sm:w-80 sm:h-80' : 'w-56 h-56'
                      } glass-panel p-2 shadow-2xl flex items-center justify-center overflow-hidden border border-white/15 group`}
                    >
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      />

                      <div
                        onClick={togglePlay}
                        className={`w-36 h-36 bg-gradient-to-br ${currentTrack.coverGradient} border border-white/20 flex flex-col items-center justify-center p-3 text-center shadow-2xl group-hover:scale-105 transition cursor-pointer relative overflow-hidden`}
                      >
                        {currentTrack.artworkUrl ? (
                          <img
                            src={currentTrack.artworkUrl}
                            alt={currentTrack.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-90"
                          />
                        ) : (
                          <Icon name="Disc" size={36} className="text-white/80 mb-2" />
                        )}
                        <div className="relative z-10 bg-black/65 backdrop-blur-xs px-2 py-1 w-full">
                          <div className="text-xs font-bold text-white truncate">
                            {currentTrack.title}
                          </div>
                          <div className="text-[10px] text-white/75 truncate">
                            {currentTrack.artist}
                          </div>
                        </div>
                      </div>

                      {isBuffering && (
                        <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-mono text-orange-400">
                          <Icon name="RotateCw" size={16} className="animate-spin" />
                          <span>Connecting Full Stream...</span>
                        </div>
                      )}
                    </div>

                    {/* Track Title, Artist & Audio Metadata */}
                    <div className="text-center space-y-1 w-full">
                      <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
                        {currentTrack.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-white/70 font-medium truncate">
                        {currentTrack.artist}
                      </p>
                      <p className="text-[11px] text-white/45 font-mono truncate">
                        {currentTrack.album} · {currentTrack.bitrate}
                      </p>
                    </div>

                    {/* Quick Action Strip under Artwork */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                      <button
                        onClick={() => seekToSeconds(currentTime - 10)}
                        className="px-2.5 py-1 bg-white/[0.07] hover:bg-white/15 text-[11px] font-mono text-white/80 hover:text-white transition"
                      >
                        -10s
                      </button>
                      <button
                        onClick={() => seekToSeconds(currentTime + 10)}
                        className="px-2.5 py-1 bg-white/[0.07] hover:bg-white/15 text-[11px] font-mono text-white/80 hover:text-white transition"
                      >
                        +10s
                      </button>
                      <button
                        onClick={() =>
                          setPlaybackRate((r) => (r === 1.0 ? 1.25 : r === 1.25 ? 0.85 : 1.0))
                        }
                        className="px-2.5 py-1 bg-white/[0.07] hover:bg-white/15 text-[11px] font-mono text-orange-300 transition"
                        title="再生速度切替"
                      >
                        {playbackRate}x
                      </button>
                      <button
                        onClick={() =>
                          setStageMode((m) => (m === 'lyrics-focus' ? 'split' : 'lyrics-focus'))
                        }
                        className="px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/35 border border-orange-400/30 text-[11px] font-semibold text-orange-300 transition"
                      >
                        歌詞を拡大
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Right Column: Live Apple Music Sing Synchronized Lyrics */}
              {stageMode !== 'visualizer-focus' && renderAppleMusicLyricsPanel(true)}
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 2: FULL-BLEED APPLE MUSIC LYRICS THEATER VIEW
           ================================================================= */}
        {activeTab === 'lyrics' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left Floating Artwork & Track Details Column */}
            <div className="w-full md:w-80 p-6 border-r border-white/10 flex flex-col justify-between shrink-0 bg-black/30 backdrop-blur-xl">
              <div className="space-y-5">
                {currentTrack.artworkUrl ? (
                  <img
                    src={currentTrack.artworkUrl}
                    alt={currentTrack.title}
                    className="w-48 h-48 object-cover border border-white/20 shadow-2xl mx-auto"
                  />
                ) : (
                  <div
                    className={`w-48 h-48 bg-gradient-to-br ${currentTrack.coverGradient} border border-white/20 flex items-center justify-center shadow-2xl mx-auto`}
                  >
                    <Icon name="Music" size={40} className="text-white/80" />
                  </div>
                )}
                <div className="text-center space-y-1">
                  <h3 className="text-base font-extrabold text-white">{currentTrack.title}</h3>
                  <p className="text-xs text-white/65">{currentTrack.artist}</p>
                  <p className="text-[11px] text-white/40 font-mono">
                    {currentTrack.album} · {formatSecs(currentTrack.duration)}
                  </p>
                </div>

                <div className="p-3 bg-white/[0.04] border border-white/10 text-[11px] space-y-1.5 font-mono text-white/65">
                  <div className="flex justify-between">
                    <span>Sync Engine:</span>
                    <span className="text-orange-400 font-bold">Apple Music Sing LRC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolution:</span>
                    <span className="text-emerald-400">50ms (20fps Word Fill)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Full Duration:</span>
                    <span className="text-cyan-300">{formatSecs(currentTrack.duration)}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-white/45 text-center">
                任意の歌詞フレーズをクリックすると、その秒数へ即座にシークします
              </div>
            </div>

            {/* Full-Bleed Apple Music Lyrics Viewport */}
            {renderAppleMusicLyricsPanel(false)}
          </div>
        )}

        {/* =================================================================
            TAB 3: MONOCHROME.ST / MONOCHROME.TF SERVICE WORKER WEB PROXY
           ================================================================= */}
        {activeTab === 'monochrome-web' && (
          <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
            <div className="px-4 py-2 bg-zinc-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-white/60 font-mono text-[11px]">サーバー選択:</span>
                {MONOCHROME_INSTANCES.map((inst) => (
                  <button
                    key={inst.url}
                    onClick={() => {
                      setMonoWebUrl(inst.url);
                      loadMonochromeWebProxy(inst.url, relayNode);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold transition ${
                      monoWebUrl === inst.url
                        ? 'bg-orange-500 text-black'
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
                  className="bg-black border border-white/15 text-cyan-300 text-[11px] px-2 py-1 outline-none"
                >
                  {PROXY_RELAY_SERVERS.map((srv) => (
                    <option key={srv.id} value={srv.id} className="bg-zinc-900 text-white">
                      Relay: {srv.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => loadMonochromeWebProxy(monoWebUrl, relayNode)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px]"
                >
                  再読込
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-white">
              {monoWebLoading && (
                <div className="absolute inset-0 z-20 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-xs text-orange-300 font-mono">
                  <Icon name="RefreshCw" size={22} className="animate-spin text-orange-400" />
                  <span>Service Worker プロキシ経由で {monoWebUrl} を接続中...</span>
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

        {/* =================================================================
            TAB 4: TRANSLUCENT SYNTHESIZER & OSCILLATORS VIEW
           ================================================================= */}
        {activeTab === 'synth' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-zinc-950/80">
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
              <div className="absolute top-4 left-4 flex items-center gap-2 text-xs font-semibold text-orange-400">
                <Icon name="Sliders" size={16} />
                <span>Web Audio Harmonic Oscillators</span>
              </div>

              <div className="h-64 w-full max-w-lg glass-panel p-4 overflow-hidden relative border border-orange-500/20 shadow-2xl">
                <canvas ref={canvasRef} className="h-full w-full" />
              </div>

              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className={`px-6 py-2.5 font-semibold text-xs flex items-center gap-2 transition shadow-lg ${
                    isPlaying
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  <Icon name={isPlaying ? 'Pause' : 'Play'} size={16} />
                  <span>{isPlaying ? 'Pause Synthesis' : 'Start Synthesis'}</span>
                </button>
              </div>
            </div>

            <div className="w-80 border-l border-white/10 p-5 flex flex-col justify-between bg-black/40 overflow-y-auto">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                  Oscillator Configuration
                </h3>

                <div>
                  <label className="text-[11px] text-white/60 mb-1.5 block">
                    Waveform Geometry
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 border border-white/10">
                    {(['sawtooth', 'sine', 'triangle', 'square'] as OscillatorType[]).map((wf) => (
                      <button
                        key={wf}
                        onClick={() => setWaveform(wf)}
                        className={`py-1 text-xs capitalize font-medium transition ${
                          waveform === wf
                            ? 'bg-orange-500 text-white'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {wf}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Fundamental Frequency</span>
                    <span className="font-mono text-orange-400">{baseFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={55}
                    max={660}
                    value={baseFreq}
                    onChange={(e) => setBaseFreq(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Harmonics Count</span>
                    <span className="font-mono text-orange-400">{harmonics} Overtones</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={harmonics}
                    onChange={(e) => setHarmonics(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Biquad Filter Cutoff</span>
                    <span className="font-mono text-orange-400">{filterCutoff} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={4000}
                    value={filterCutoff}
                    onChange={(e) => setFilterCutoff(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="text-[10px] text-white/40 pt-4 border-t border-white/10">
                Processed via Glasispect Web Audio Pipeline with zero rendering latency.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'drumpad' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <DrumPadTunerView />
          </div>
        )}

        {/* =================================================================
            TAB 5: PROXY DIAGNOSTICS, RELAY NODES & GCS GATEWAY
           ================================================================= */}
        {activeTab === 'proxy' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Icon name="Server" size={18} className="text-orange-400" />
                <span>Monochrome.st Service Worker Proxy &amp; Multi-Node Relay</span>
              </h2>
              <p className="text-xs text-white/60 mt-1">
                自動探索した複数の中継プロキシサーバーと Service Worker (`./sw-proxy.js`)
                を組み合わせ、GitHub Pages や storage.googleapis.com 上でも 404
                エラーなしでフル尺楽曲・同期歌詞・Webページを取得します。
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-orange-300">
                利用可能なプロキシ中継サーバー (クリックで切替):
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
                      className={`p-3.5 border text-left transition flex flex-col justify-between gap-1 ${
                        active
                          ? 'bg-orange-500/15 border-orange-400 text-white'
                          : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{srv.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-black/50 text-cyan-300">
                          {srv.region}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-orange-300/90">
                        {srv.endpointLabel}
                      </div>
                      <div className="text-[11px] text-white/55">{srv.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-zinc-900/60 border-t border-white/10 space-y-3">
              <span className="text-xs font-semibold text-white uppercase tracking-wider block">
                Active Rewriter Protocol:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setProxyEngine('scramjet')}
                  className={`p-3 border text-left transition flex items-start gap-3 ${
                    proxyEngine === 'scramjet'
                      ? 'bg-orange-500/20 border-orange-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                  }`}
                >
                  <Icon name="Zap" size={20} className="text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Scramjet Engine v3 (SW + srcDoc)
                    </div>
                    <div className="text-[11px] text-white/60 mt-0.5">
                      AST Rewriter + Service Worker トンネル。クロスオリジン制限や X-Frame-Options
                      を回避します。
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setProxyEngine('ultraviolet')}
                  className={`p-3 border text-left transition flex items-start gap-3 ${
                    proxyEngine === 'ultraviolet'
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                  }`}
                >
                  <Icon name="Shield" size={20} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Ultraviolet Engine v2.0</div>
                    <div className="text-[11px] text-white/60 mt-0.5">
                      XORエンコード URL トンネリングと Service Worker キャッシュ制御。
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------
          Bottom Apple Music Transport Bar & Precision Hover Scrubber
         ------------------------------------------------------------------- */}
      <div className="relative z-20 p-3 bg-black/75 backdrop-blur-2xl border-t border-white/10 shrink-0 flex flex-col gap-2">
        {/* Interactive Scrubber with Hover Time Preview */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono tabular-nums text-white/60 w-10 text-right">
            {formatSecs(currentTime)}
          </span>
          <div
            className="flex-1 h-2 bg-white/15 hover:h-2.5 cursor-pointer relative transition-all group"
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
            {hoverScrubTime !== null && (
              <div
                className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 bg-zinc-900 border border-white/20 text-[10px] font-mono tabular-nums text-orange-300 pointer-events-none"
                style={{
                  left: `${Math.min(96, Math.max(4, (hoverScrubTime / Math.max(1, currentTrack.duration)) * 100))}%`,
                }}
              >
                {formatSecs(hoverScrubTime)}
              </div>
            )}
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-white transition-all duration-75"
              style={{
                width: `${Math.min(100, (currentTime / Math.max(1, currentTrack.duration)) * 100)}%`,
              }}
            />
          </div>
          <span className="text-[11px] font-mono tabular-nums text-white/60 w-10">
            {formatSecs(currentTrack.duration)}
          </span>
        </div>

        {/* Transport Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Current Track Mini Card */}
          <div className="flex items-center gap-3 w-56 min-w-0">
            {currentTrack.artworkUrl ? (
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="w-10 h-10 object-cover border border-white/15 shrink-0"
              />
            ) : (
              <div
                className={`w-10 h-10 bg-gradient-to-br ${currentTrack.coverGradient} border border-white/15 flex items-center justify-center shrink-0`}
              >
                <Icon name="Music" size={14} className="text-white/80" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{currentTrack.title}</div>
              <div className="text-[11px] text-white/55 truncate">{currentTrack.artist}</div>
            </div>
          </div>

          {/* Center: Transport Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-1.5 transition ${
                isShuffle ? 'text-orange-400' : 'text-white/45 hover:text-white'
              }`}
              title="シャッフル"
            >
              <Icon name="Shuffle" size={14} />
            </button>
            <button
              onClick={prevTrack}
              className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 transition"
              title="前の曲 / 先頭へ"
            >
              <Icon name="SkipBack" size={18} />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-white hover:bg-orange-400 text-black active:scale-95 flex items-center justify-center shadow-lg transition"
              title={isPlaying ? '一時停止' : '再生'}
            >
              <Icon name={isPlaying ? 'Pause' : 'Play'} size={18} />
            </button>
            <button
              onClick={nextTrack}
              className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 transition"
              title="次の曲"
            >
              <Icon name="SkipForward" size={18} />
            </button>
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={`p-1.5 transition ${
                isRepeat ? 'text-orange-400' : 'text-white/45 hover:text-white'
              }`}
              title="リピート"
            >
              <Icon name="Repeat" size={14} />
            </button>
          </div>

          {/* Right: Quick Lyrics Toggle & Volume Control */}
          <div className="flex items-center gap-3 w-56 justify-end">
            <button
              onClick={() => {
                if (activeTab !== 'player') {
                  setActiveTab('player');
                  setStageMode('split');
                } else {
                  setStageMode((m) => (m === 'lyrics-focus' ? 'split' : 'lyrics-focus'));
                }
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 border transition ${
                stageMode === 'lyrics-focus' || activeTab === 'lyrics'
                  ? 'bg-orange-500 text-black border-orange-400'
                  : 'bg-white/[0.08] text-white/80 border-white/10 hover:text-white'
              }`}
              title="Apple Music 同期歌詞表示切替"
            >
              <Icon name="Mic2" size={12} />
              <span className="hidden sm:inline">歌詞</span>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-white/65 hover:text-white transition"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              <Icon name={isMuted || volume === 0 ? 'VolumeX' : 'Volume2'} size={16} />
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
              className="w-20 accent-orange-500 cursor-pointer h-1 bg-white/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
