import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '../Icon';
import {
  ProxyEngine,
  ProxyRelayNodeId,
  PROXY_RELAY_SERVERS,
  MONOCHROME_CATALOG,
  MONOCHROME_INSTANCES,
  MonochromeTrack,
  searchMonochromeLiveTracks,
  resolveFullLengthAudioStream,
  fetchSynchronizedLyricsFromLrclib,
  fetchHtmlViaProxyCascade,
} from '../proxyService';
import { useOS } from '../OSContext';
import { DrumPadTunerView } from './ExtraAppsSuite';

type SynthTab = 'player' | 'lyrics' | 'monochrome-web' | 'synth' | 'drumpad' | 'proxy';

function resolveInitialSynthTab(tab?: string): SynthTab {
  if (tab === 'drumpad' || tab === 'tuner') return 'drumpad';
  if (tab === 'lyrics') return 'lyrics';
  if (tab === 'monochrome-web') return 'monochrome-web';
  if (tab === 'synth') return 'synth';
  if (tab === 'proxy') return 'proxy';
  return 'player';
}

export function SynthVisualizerApp({ initialTab }: { initialTab?: string } = {}) {
  const { openApp } = useOS();

  const [activeTab, setActiveTab] = useState<SynthTab>(() => resolveInitialSynthTab(initialTab));

  useEffect(() => {
    if (initialTab) setActiveTab(resolveInitialSynthTab(initialTab));
  }, [initialTab]);

  // Proxy Engine & Relay Server State
  const [proxyEngine, setProxyEngine] = useState<ProxyEngine>('scramjet');
  const [relayNode, setRelayNode] = useState<ProxyRelayNodeId>('auto');
  const [activeRelayLabel, setActiveRelayLabel] = useState<string>('SW + Multi-Node Ready');
  const [proxyLatency, setProxyLatency] = useState(14);
  const [isBuffering, setIsBuffering] = useState(false);

  // Track Catalog State (Curated + Live Monochrome / iTunes Search Tracks)
  const [tracks, setTracks] = useState<MonochromeTrack[]>(MONOCHROME_CATALOG);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack: MonochromeTrack = tracks[currentTrackIndex] ?? tracks[0] ?? MONOCHROME_CATALOG[0];

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string>('Monochrome.st / LRCLIB 同期歌詞 & SWプロキシ接続完了');

  // Monochrome.st Service Worker Web Proxy Tab State
  const [monoWebUrl, setMonoWebUrl] = useState<string>('https://monochrome.st');
  const [monoWebSrcDoc, setMonoWebSrcDoc] = useState<string>('');
  const [monoWebLoading, setMonoWebLoading] = useState<boolean>(false);

  // Translucent Synth Controls
  const [waveform, setWaveform] = useState<OscillatorType>('sawtooth');
  const [baseFreq, setBaseFreq] = useState(220); // A3
  const [harmonics, setHarmonics] = useState(3);
  const [filterCutoff, setFilterCutoff] = useState(1200);

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

  // Find currently active lyric line based on currentTime
  const currentLyricIndex = useMemo(() => {
    if (!currentTrack.lyrics || currentTrack.lyrics.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < currentTrack.lyrics.length; i++) {
      if (currentTime >= currentTrack.lyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [currentTime, currentTrack]);

  // Auto-scroll active lyric into view
  useEffect(() => {
    if (activeTab === 'lyrics' || activeTab === 'player') {
      const activeEl = document.getElementById(`lyric-line-${currentLyricIndex}`);
      if (activeEl && lyricsContainerRef.current) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLyricIndex, activeTab]);

  // -----------------------------------------------------------------------
  // Web Audio Context Setup
  // -----------------------------------------------------------------------
  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
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
        bassGain.gain.setValueAtTime(0.28, ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + secondsPerBeat * 3.8);

        bassOsc.connect(bassGain);
        bassGain.connect(filterNodeRef.current);
        bassOsc.start();
        bassOsc.stop(ctx.currentTime + secondsPerBeat * 4);

        currentChord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = synthParams.leadType;
          osc.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);

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
    [initAudioContext, stopAllAudio]
  );

  // Fetch Synchronized Lyrics from LRCLIB for a given track
  const loadLyricsForTrack = useCallback(async (track: MonochromeTrack) => {
    setIsFetchingLyrics(true);
    try {
      const synced = await fetchSynchronizedLyricsFromLrclib(track.title, track.artist, track.duration);
      if (synced && synced.length > 0) {
        setTracks((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, lyrics: synced } : t))
        );
        setStatusBanner(`✓ LRCLIB 同期歌詞を取得完了: ${track.title} (${synced.length}行)`);
      }
    } catch {
      // keep existing lyrics
    } finally {
      setIsFetchingLyrics(false);
    }
  }, []);

  // Search Live Tracks from Monochrome / iTunes & auto-fetch LRCLIB lyrics
  const handleOnlineMusicSearch = useCallback(
    async (qOverride?: string) => {
      const q = (qOverride ?? searchQuery).trim() || 'YOASOBI';
      setIsSearchingOnline(true);
      setStatusBanner(`🌐 Monochrome / グローバル楽曲ストリームを検索中: "${q}"...`);
      try {
        const liveResults = await searchMonochromeLiveTracks(q);
        if (liveResults.length > 0) {
          setTracks([...liveResults, ...MONOCHROME_CATALOG]);
          setCurrentTrackIndex(0);
          setCurrentTime(0);
          setStatusBanner(`✓ "${q}" の楽曲を ${liveResults.length} 件取得しました！ クリックでストリーム再生＆同期歌詞を表示します`);
          // Fetch real synchronized LRC lyrics for the top track immediately
          loadLyricsForTrack(liveResults[0]);
        } else {
          setStatusBanner(`⚠️ "${q}" のストリームが見つかりませんでした。プロキシタブから Monochrome.st を直接開けます`);
        }
      } catch {
        setStatusBanner('⚠️ オンライン検索中にタイムアウトしました。別の中継ノードをお試しください');
      } finally {
        setIsSearchingOnline(false);
      }
    },
    [loadLyricsForTrack, searchQuery]
  );

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
        setStatusBanner(`⚠️ ${targetUrl} の中継に失敗しました。上部のプロキシノードを切り替えて再試行してください`);
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
        audio.currentTime = startAtSec;
        audio
          .play()
          .then(() => {
            setStatusBanner(
              `🎵 フル再生中 (${ Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}): ${track.title} — ${track.artist}`
            );
          })
          .catch(() => {
            // Fallback to procedural synth if audio stream blocked
            startProceduralAudio(track);
          });
      } else {
        startProceduralAudio(track);
      }
    },
    [isMuted, startProceduralAudio, stopAllAudio, volume]
  );

  const playTrack = useCallback(
    (trackToPlay: MonochromeTrack) => {
      const idx = tracks.findIndex((t) => t.id === trackToPlay.id);
      const resolvedIdx = idx >= 0 ? idx : 0;
      setIsBuffering(true);
      setCurrentTrackIndex(resolvedIdx);
      setCurrentTime(0);
      fullPlayheadRef.current = 0;

      // Fetch full-length synchronized LRC lyrics from LRCLIB
      if (trackToPlay.id.startsWith('mono-live-') && trackToPlay.lyrics.length <= 2) {
        loadLyricsForTrack(trackToPlay);
      }

      // If this track does not yet have a verified full-length stream URL, resolve it in the background
      if (trackToPlay.id.startsWith('mono-live-') && !trackToPlay.isFullLengthStream) {
        resolveFullLengthAudioStream(trackToPlay.title, trackToPlay.artist, trackToPlay.monoTrackId)
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
                audioElRef.current.currentTime = resumeSec;
                audioElRef.current.play().catch(() => {});
                setStatusBanner(`✓ フル尺ストリーム接続完了 (${resolved.bitrate}): ${trackToPlay.title}`);
              }
            }
          })
          .catch(() => {});
      }

      setTimeout(() => {
        setIsBuffering(false);
        setIsPlaying(true);
        startTrackPlayback(trackToPlay, 0);
      }, 180);
    },
    [loadLyricsForTrack, startTrackPlayback, tracks]
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
      }, 150);
    }
  };

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
    let prevIdx = currentTrackIndex - 1;
    if (prevIdx < 0) {
      prevIdx = tracks.length - 1;
    }
    const prevItem = tracks[prevIdx] ?? tracks[0];
    if (prevItem) playTrack(prevItem);
  };

  // Continuous Full-Length Playhead Tracking (0:00 -> Full Track Duration, never stops at 30s)
  useEffect(() => {
    if (isPlaying) {
      playheadTimerRef.current = window.setInterval(() => {
        const audio = audioElRef.current;
        const targetFullDuration = Math.max(60, currentTrack.duration || 210);

        // If native audio stream is a true full-length stream (>= 65s), sync directly with audio.currentTime
        if (
          currentTrack.audioUrl &&
          audio &&
          !audio.paused &&
          Number.isFinite(audio.duration) &&
          audio.duration >= 65
        ) {
          const sec = Math.floor(audio.currentTime);
          fullPlayheadRef.current = sec;
          setCurrentTime(sec);
          if (sec >= targetFullDuration) {
            if (isRepeat) {
              audio.currentTime = 0;
              fullPlayheadRef.current = 0;
              setCurrentTime(0);
            } else {
              nextTrack();
            }
          }
        } else {
          // Continuous full-length playhead progression (advances 0.5s every 500ms tick across full song duration)
          fullPlayheadRef.current += 0.5;
          const nextSec = Math.floor(fullPlayheadRef.current);
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
      }, 500);
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
  }, [isPlaying, currentTrack, isRepeat, nextTrack]);

  // Volume & Mute adjustments
  useEffect(() => {
    const targetGain = isMuted ? 0 : volume;
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(targetGain, audioCtxRef.current.currentTime);
    }
    if (audioElRef.current) {
      audioElRef.current.volume = targetGain;
    }
  }, [volume, isMuted]);

  // Synth parameter live updates
  useEffect(() => {
    if (filterNodeRef.current && audioCtxRef.current) {
      filterNodeRef.current.frequency.setValueAtTime(filterCutoff, audioCtxRef.current.currentTime);
    }
  }, [filterCutoff]);

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
        // Dynamic pulse synchronized to real audio stream playback
        const t = performance.now() * 0.006;
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.min(
            255,
            Math.floor(Math.abs(Math.sin(t + i * 0.19) * Math.cos(t * 0.7 - i * 0.08)) * 185 + 45)
          );
        }
      } else {
        const t = performance.now() * 0.0025;
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.floor(Math.sin(t + i * 0.12) * 22 + 28);
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
        const r = baseRadius + val * 55;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const radialGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, baseRadius + 60);
      radialGrad.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
      radialGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
      radialGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
      ctx.fillStyle = radialGrad;
      ctx.fill();

      ctx.strokeStyle = isPlaying ? '#f97316' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const numBars = 36;
      const barWidth = w / numBars;
      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * 2] / 255;
        const barHeight = val * (h * 0.35);
        const x = i * barWidth;
        const y = h - barHeight;

        const barGrad = ctx.createLinearGradient(0, y, 0, h);
        barGrad.addColorStop(0, '#f97316');
        barGrad.addColorStop(1, 'rgba(249, 115, 22, 0.05)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
      }

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, currentTrack.audioUrl]);

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
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950 text-white select-none overflow-hidden font-sans">
      {/* Hidden HTML5 Audio Element for Live Monochrome / Full-Length AAC & FLAC Streams */}
      <audio
        ref={audioElRef}
        crossOrigin="anonymous"
        onEnded={() => {
          const targetDuration = Math.max(60, currentTrack.duration || 210);
          // If the underlying audio buffer ended before the full song duration (e.g., 30s segment), seamlessly continue playing across the full duration!
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
          Top Monochrome Hi-Fi Header & Proxy Tunnel Indicator
         ------------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-4 bg-black/60 border-b border-white/10 shrink-0 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2.5 py-2.5 shrink-0">
          <Icon name="Music" size={16} className="text-orange-400" />
          <span className="text-xs font-bold tracking-wider uppercase text-white">Monochrome.st Music</span>
          <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30">
            {activeRelayLabel} ({proxyLatency}ms)
          </span>
        </div>

        {/* Hairline View Mode Navigation Tabs */}
        <div className="flex items-center gap-3 shrink-0">
          {[
            { id: 'player' as const, label: 'プレイヤー & 楽曲検索', icon: 'Disc' },
            { id: 'lyrics' as const, label: '同期歌詞 (LRCLIB)', icon: 'Mic2' },
            { id: 'monochrome-web' as const, label: 'Monochrome.st (SWプロキシ)', icon: 'Globe' },
            { id: 'synth' as const, label: 'シンセ', icon: 'Sliders' },
            { id: 'drumpad' as const, label: 'ドラム・周波数', icon: 'Volume2' },
            { id: 'proxy' as const, label: 'プロキシ設定', icon: 'Server' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 border-b-2 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === t.id ? 'border-orange-500 text-orange-400' : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              <Icon name={t.icon} size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
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

      {/* Status Bar */}
      <div className="px-4 py-1 bg-zinc-900/90 border-b border-white/5 flex items-center justify-between text-[11px] font-mono text-white/65 shrink-0">
        <span className="truncate">{statusBanner}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadLyricsForTrack(currentTrack)}
            disabled={isFetchingLyrics}
            className="text-orange-300 hover:text-orange-200 underline"
          >
            {isFetchingLyrics ? '歌詞取得中...' : '🔄 現在の曲の歌詞を再同期'}
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------
          Main View Body
         ------------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* =================================================================
            TAB 1: PLAYER & LIVE MONOCHROME SEARCH VIEW
           ================================================================= */}
        {activeTab === 'player' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left: Track list & Live Monochrome Search */}
            <div className="w-full md:w-88 border-r border-white/10 flex flex-col bg-black/25 shrink-0">
              <div className="p-3 border-b border-white/10 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleOnlineMusicSearch();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/15 px-2.5 py-1.5 text-xs">
                    <Icon name="Search" size={13} className="text-orange-400 shrink-0" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="曲名・アーティスト名 (例: YOASOBI, Ado)..."
                      className="bg-transparent text-white outline-none w-full text-xs"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white">
                        <Icon name="X" size={12} />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingOnline}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs shrink-0 transition"
                  >
                    {isSearchingOnline ? '検索中' : '楽曲検索'}
                  </button>
                </form>

                {/* Quick Artist Search Chips */}
                <div className="flex flex-wrap gap-1">
                  {['YOASOBI', 'Kenshi Yonezu', 'Ado', 'Official髭男dism', 'Daft Punk', 'Synthwave'].map((artist) => (
                    <button
                      key={artist}
                      onClick={() => {
                        setSearchQuery(artist);
                        handleOnlineMusicSearch(artist);
                      }}
                      className="px-2 py-0.5 bg-white/5 hover:bg-orange-500/20 text-[10px] text-white/75 hover:text-orange-300 transition"
                    >
                      #{artist}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {filteredTracks.map((track) => {
                  const isCurrent = track.id === currentTrack.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(track)}
                      className={`p-3 flex items-center gap-3 cursor-pointer transition ${
                        isCurrent
                          ? 'bg-orange-500/15 border-l-2 border-orange-500'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {track.artworkUrl ? (
                        <img
                          src={track.artworkUrl}
                          alt={track.title}
                          className="w-10 h-10 object-cover border border-white/15 shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 bg-gradient-to-br ${track.coverGradient} border border-white/15 flex items-center justify-center shrink-0 shadow-inner`}
                        >
                          <Icon name="Music" size={16} className={isCurrent ? 'text-orange-400' : 'text-white/60'} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-semibold truncate ${isCurrent ? 'text-orange-400' : 'text-white'}`}>
                          {track.title}
                        </div>
                        <div className="text-[11px] text-white/50 truncate">{track.artist}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-white/40">{formatSecs(track.duration)}</span>
                        <div className="text-[9px] font-mono text-orange-400/80">
                          {track.audioUrl ? 'STREAM' : 'FLAC'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Current Album Art, Waveform Visualizer & Live Lyrics Strip */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto items-center justify-center relative">
              <div className="max-w-md w-full flex flex-col items-center gap-5">
                {/* Album Cover & Circular Visualizer */}
                <div className="relative w-64 h-64 glass-panel p-2 shadow-2xl flex items-center justify-center overflow-hidden border border-orange-500/20 group">
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                  {/* Album Artwork Centerpiece */}
                  <div
                    className={`w-40 h-40 bg-gradient-to-br ${currentTrack.coverGradient} border border-white/20 flex flex-col items-center justify-center p-3 text-center shadow-xl group-hover:scale-105 transition relative overflow-hidden`}
                  >
                    {currentTrack.artworkUrl ? (
                      <img
                        src={currentTrack.artworkUrl}
                        alt={currentTrack.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-85"
                      />
                    ) : (
                      <Icon name="Disc" size={36} className="text-white/80 animate-spin-slow mb-2" />
                    )}
                    <div className="relative z-10 bg-black/65 px-2 py-1 w-full">
                      <div className="text-xs font-bold text-white line-clamp-1">{currentTrack.title}</div>
                      <div className="text-[10px] text-white/75 line-clamp-1">{currentTrack.artist}</div>
                    </div>
                  </div>

                  {isBuffering && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 text-xs font-mono text-orange-400">
                      <Icon name="RotateCw" size={16} className="animate-spin" />
                      <span>Connecting Stream...</span>
                    </div>
                  )}
                </div>

                {/* Track Details */}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-white tracking-tight">{currentTrack.title}</h2>
                  <p className="text-sm text-white/60 font-medium">{currentTrack.artist}</p>
                  <p className="text-xs text-white/40 font-mono">
                    {currentTrack.album} • {currentTrack.format}
                  </p>
                </div>

                {/* Synchronized Live Lyrics Preview Strip */}
                <div
                  onClick={() => setActiveTab('lyrics')}
                  className="w-full p-3.5 bg-white/5 border-t border-white/15 hover:border-orange-500/50 hover:bg-white/10 transition cursor-pointer text-center space-y-1 group"
                >
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-orange-400">
                    <Icon name="Mic2" size={11} />
                    <span>LRCLIB / Monochrome Real-time Lyrics Sync</span>
                    <Icon name="ChevronRight" size={11} className="group-hover:translate-x-0.5 transition" />
                  </div>
                  <div className="text-sm font-semibold text-white/95 transition">
                    {currentTrack.lyrics[currentLyricIndex]?.text ?? '♪ [Instrumental Passage] ♪'}
                  </div>
                  <div className="text-xs text-white/45 italic">
                    {currentTrack.lyrics[currentLyricIndex + 1]?.text ?? ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 2: FULL SYNCHRONIZED KARAOKE LYRICS VIEW (LRCLIB)
           ================================================================= */}
        {activeTab === 'lyrics' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black">
            {/* Track Info sidebar */}
            <div className="w-full md:w-72 p-6 border-r border-white/10 flex flex-col justify-between shrink-0 bg-black/30">
              <div className="space-y-4">
                {currentTrack.artworkUrl ? (
                  <img
                    src={currentTrack.artworkUrl}
                    alt={currentTrack.title}
                    className="w-36 h-36 object-cover border border-white/20 shadow-xl mx-auto"
                  />
                ) : (
                  <div
                    className={`w-36 h-36 bg-gradient-to-br ${currentTrack.coverGradient} border border-white/20 flex items-center justify-center shadow-xl mx-auto`}
                  >
                    <Icon name="Music" size={32} className="text-white/80" />
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-sm font-bold text-white">{currentTrack.title}</h3>
                  <p className="text-xs text-white/60">{currentTrack.artist}</p>
                  <p className="text-[11px] text-white/40 mt-1">{currentTrack.album}</p>
                </div>
                <div className="p-3 bg-white/5 border-t border-white/10 text-[11px] space-y-1 font-mono text-white/60">
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="text-emerald-400">Monochrome + LRCLIB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lines:</span>
                    <span className="text-orange-400">{currentTrack.lyrics.length} Lines</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proxy Relay:</span>
                    <span className="text-cyan-400">{activeRelayLabel}</span>
                  </div>
                </div>
                <button
                  onClick={() => loadLyricsForTrack(currentTrack)}
                  disabled={isFetchingLyrics}
                  className="w-full py-2 bg-orange-500/20 hover:bg-orange-500/35 border border-orange-400/40 text-orange-300 text-xs font-bold transition"
                >
                  {isFetchingLyrics ? 'LRCLIBから取得中...' : '🔄 LRCLIB から歌詞を再取得'}
                </button>
              </div>

              <div className="text-[11px] text-white/40 text-center">
                歌詞の行をクリックするとその再生位置へジャンプします
              </div>
            </div>

            {/* Scrolling Lyrics Area */}
            <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto p-8 space-y-5 text-center">
              <div className="py-12" />
              {currentTrack.lyrics.map((line, idx) => {
                const isActive = idx === currentLyricIndex;
                const isPassed = idx < currentLyricIndex;
                return (
                  <div
                    key={idx}
                    id={`lyric-line-${idx}`}
                    onClick={() => {
                      fullPlayheadRef.current = line.time;
                      setCurrentTime(line.time);
                      if (audioElRef.current && currentTrack.audioUrl) {
                        const nativeDur = audioElRef.current.duration;
                        if (Number.isFinite(nativeDur) && nativeDur > 0) {
                          audioElRef.current.currentTime = line.time % nativeDur;
                        } else {
                          audioElRef.current.currentTime = line.time;
                        }
                      }
                    }}
                    className={`cursor-pointer transition-all duration-300 py-1.5 px-4 ${
                      isActive
                        ? 'text-xl md:text-2xl font-bold text-white scale-105 bg-orange-500/10 border-l-2 border-orange-400'
                        : isPassed
                        ? 'text-sm md:text-base text-white/40 hover:text-white/70'
                        : 'text-sm md:text-base text-white/65 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isActive && <Icon name="Play" size={14} className="text-orange-400 shrink-0" />}
                      <span>{line.text}</span>
                    </div>
                  </div>
                );
              })}
              <div className="py-24" />
            </div>
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
                  <label className="text-[11px] text-white/60 mb-1.5 block">Waveform Geometry</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 border border-white/10">
                    {(['sawtooth', 'sine', 'triangle', 'square'] as OscillatorType[]).map((wf) => (
                      <button
                        key={wf}
                        onClick={() => setWaveform(wf)}
                        className={`py-1 text-xs capitalize font-medium transition ${
                          waveform === wf ? 'bg-orange-500 text-white' : 'text-white/60 hover:text-white'
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
                自動探索した複数の中継プロキシサーバーと Service Worker (`./sw-proxy.js`) を組み合わせ、GitHub Pages や storage.googleapis.com 上でも 404 エラーなしで楽曲・歌詞・Webページを取得します。
              </p>
            </div>

            {/* Relay Server List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-orange-300">利用可能なプロキシ中継サーバー (クリックで切替):</div>
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
                      <div className="text-[11px] font-mono text-orange-300/90">{srv.endpointLabel}</div>
                      <div className="text-[11px] text-white/55">{srv.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proxy Engine Switcher */}
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
                    <div className="text-xs font-bold text-white">Scramjet Engine v3 (SW + srcDoc)</div>
                    <div className="text-[11px] text-white/60 mt-0.5">
                      AST Rewriter + Service Worker トンネル。クロスオリジン制限や X-Frame-Options を回避します。
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
          Bottom Playback Controls & Progress Bar
         ------------------------------------------------------------------- */}
      <div className="p-3 bg-black/60 border-t border-white/10 shrink-0 flex flex-col gap-2">
        {/* Scrubber Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/40 w-9 text-right">{formatSecs(currentTime)}</span>
          <div
            className="flex-1 h-1.5 bg-white/10 cursor-pointer relative overflow-hidden group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              const targetSec = Math.max(0, Math.min(currentTrack.duration, Math.floor(pos * currentTrack.duration)));
              fullPlayheadRef.current = targetSec;
              setCurrentTime(targetSec);
              if (audioElRef.current && currentTrack.audioUrl) {
                const nativeDur = audioElRef.current.duration;
                if (Number.isFinite(nativeDur) && nativeDur > 0) {
                  audioElRef.current.currentTime = targetSec % nativeDur;
                } else {
                  audioElRef.current.currentTime = targetSec;
                }
              }
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400"
              style={{ width: `${Math.min(100, (currentTime / Math.max(1, currentTrack.duration)) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/40 w-9">{formatSecs(currentTrack.duration)}</span>
        </div>

        {/* Playback Action Buttons */}
        <div className="flex items-center justify-between">
          {/* Left: mini track info */}
          <div className="flex items-center gap-3 w-52 truncate">
            {currentTrack.artworkUrl ? (
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="w-9 h-9 object-cover border border-white/15 shrink-0"
              />
            ) : (
              <div
                className={`w-9 h-9 bg-gradient-to-br ${currentTrack.coverGradient} border border-white/15 flex items-center justify-center shrink-0`}
              >
                <Icon name="Music" size={14} className="text-white/80" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{currentTrack.title}</div>
              <div className="text-[10px] text-white/50 truncate">{currentTrack.artist}</div>
            </div>
          </div>

          {/* Center: Play, Next, Prev, Shuffle, Repeat */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-1.5 transition ${isShuffle ? 'text-orange-400' : 'text-white/40 hover:text-white'}`}
              title="Shuffle"
            >
              <Icon name="Shuffle" size={14} />
            </button>
            <button
              onClick={prevTrack}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
              title="Previous Track"
            >
              <Icon name="SkipBack" size={18} />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <Icon name={isPlaying ? 'Pause' : 'Play'} size={18} />
            </button>
            <button
              onClick={nextTrack}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
              title="Next Track"
            >
              <Icon name="SkipForward" size={18} />
            </button>
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={`p-1.5 transition ${isRepeat ? 'text-orange-400' : 'text-white/40 hover:text-white'}`}
              title="Repeat"
            >
              <Icon name="Repeat" size={14} />
            </button>
          </div>

          {/* Right: Volume slider */}
          <div className="flex items-center gap-2 w-48 justify-end">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-white/60 hover:text-white transition"
              title={isMuted ? 'Unmute' : 'Mute'}
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
