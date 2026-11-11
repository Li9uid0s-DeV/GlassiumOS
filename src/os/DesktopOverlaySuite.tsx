import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from './OSContext';
import { Icon } from './Icon';
import { AppId } from './types';

interface SavedTileWindowItem {
  appId: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SavedTileGroup {
  id: string;
  name: string;
  createdAt: string;
  items: SavedTileWindowItem[];
}

interface PipMediaState {
  title: string;
  subtitle?: string;
  videoUrl?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
}

const TILE_GROUPS_STORAGE_KEY = 'glassium_saved_window_tile_groups_v1';

const DEFAULT_PIP_PRESETS: PipMediaState[] = [
  {
    title: 'YOASOBI - アイドル (Official MV)',
    subtitle: 'YOASOBI · Official Music Video',
    youtubeId: 'ZRtdQ81jPUQ',
  },
  {
    title: 'Creepy Nuts - Bling-Bang-Bang-Born',
    subtitle: 'Creepy Nuts · Official MV',
    youtubeId: 'mLW35YMzELE',
  },
  {
    title: '米津玄師 - KICK BACK',
    subtitle: 'Kenshi Yonezu · Official MV',
    youtubeId: 'M2cckDmNLMI',
  },
  {
    title: 'Big Buck Bunny 60fps HD Stream',
    subtitle: 'Direct HTML5 Video Stream',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
];

export function DesktopOverlaySuite() {
  const {
    windows,
    openApp,
    minimizeWindow,
    restoreWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    snapAllWindows5050,
    theme,
    setTheme,
    surfaceColorMode,
    setSurfaceColorMode,
    addDeskNote,
    resolvedAccentHex,
  } = useOS();

  // ============================================================================
  // 1. SPOTLIGHT COMMAND PALETTE (Ctrl + K / Alt + Space)
  // ============================================================================
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const spotlightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') ||
        (e.altKey && e.code === 'Space')
      ) {
        e.preventDefault();
        setSpotlightOpen((prev) => !prev);
      } else if (e.key === 'Escape' && spotlightOpen) {
        setSpotlightOpen(false);
      }
    };
    const onOpenSpotlight = () => setSpotlightOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('glassium-open-spotlight', onOpenSpotlight);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('glassium-open-spotlight', onOpenSpotlight);
    };
  }, [spotlightOpen]);

  useEffect(() => {
    if (spotlightOpen) {
      setSelectedIndex(0);
      setTimeout(() => spotlightInputRef.current?.focus(), 40);
    } else {
      setSpotlightQuery('');
    }
  }, [spotlightOpen]);

  // Parse natural timer query like "3分タイマー", "10分", "45秒", "5m timer"
  const parsedTimerSeconds = useMemo(() => {
    const q = spotlightQuery.trim();
    if (!q) return null;
    const minMatch = q.match(/(\d+)\s*(?:分|min|m)\b/i);
    const secMatch = q.match(/(\d+)\s*(?:秒|sec|s)\b/i);
    if (minMatch || secMatch) {
      const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
      const secs = secMatch ? parseInt(secMatch[1], 10) : 0;
      const total = mins * 60 + secs;
      if (total > 0) return total;
    }
    return null;
  }, [spotlightQuery]);

  const spotlightActions = useMemo(() => {
    const q = spotlightQuery.trim().toLowerCase();
    const list: {
      id: string;
      category: string;
      title: string;
      subtitle: string;
      icon: string;
      run: () => void;
    }[] = [];

    if (parsedTimerSeconds) {
      const mins = Math.floor(parsedTimerSeconds / 60);
      const secs = parsedTimerSeconds % 60;
      const label =
        mins > 0 && secs > 0 ? `${mins}分${secs}秒` : mins > 0 ? `${mins}分` : `${secs}秒`;
      list.push({
        id: `cmd-timer-${parsedTimerSeconds}`,
        category: 'タイマー即時開始',
        title: `⏱ ${label}タイマーを開始`,
        subtitle: 'Clockアプリのカウントダウンと上部タイマーピルを即時起動します',
        icon: 'Clock',
        run: () => {
          openApp('clock', { payload: { tab: 'timer' } });
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('glassium-timer-command', {
                detail: { action: 'start-seconds', seconds: parsedTimerSeconds },
              })
            );
          }, 120);
        },
      });
    }

    const baseItems: {
      id: string;
      category: string;
      title: string;
      subtitle: string;
      icon: string;
      keywords: string;
      run: () => void;
    }[] = [
      {
        id: 'app-synth',
        category: 'アプリ起動',
        title: 'Glassium Music (音楽・Apple Music歌詞・Singカラオケ)',
        subtitle: 'フル尺再生・同期歌詞・ボーカル音量調整・イコライザー',
        icon: 'Music',
        keywords: 'music synth song karaoke lyrics 音楽 歌詞 カラオケ',
        run: () => openApp('synth'),
      },
      {
        id: 'app-garageband',
        category: 'アプリ起動',
        title: 'GarageBand Studio (作曲・Musicアプリ書き出し)',
        subtitle: 'ピアノ・ドラム・ギターのマルチトラック録音＆1クリック書き出し',
        icon: 'Piano',
        keywords: 'garageband daw piano drum guitar 作曲 ピアノ ドラム ギター 録音',
        run: () => openApp('garageband'),
      },
      {
        id: 'app-clock-timer',
        category: 'タイマー・時計',
        title: '3分タイマーをすぐ開始',
        subtitle: '上部タイマーピル＆円形プログレスバーで3分カウントダウン',
        icon: 'Clock',
        keywords: 'timer 3分 タイマー 時計 カウントダウン',
        run: () => {
          openApp('clock', { payload: { tab: 'timer' } });
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('glassium-timer-command', {
                detail: { action: 'start-seconds', seconds: 180 },
              })
            );
          }, 120);
        },
      },
      {
        id: 'app-weather',
        category: 'アプリ起動',
        title: '天気 & 雨雲レーダー (Weather)',
        subtitle: '都市検索・積雪・リアルタイム気象データとライブ壁紙連携',
        icon: 'CloudSun',
        keywords: 'weather rain snow 天気 雨 雪 気温',
        run: () => openApp('weather'),
      },
      {
        id: 'theme-dynamic-dark',
        category: '背景・外観モード',
        title: '背景色を「動的 (黒＋背景色ブレンド)」に切り替え',
        subtitle: 'ダークモードの黒にライブ壁紙の色が溶け込む動的サーフェス',
        icon: 'Sparkles',
        keywords: 'dynamic dark theme 背景 動的 ダーク 黒',
        run: () => {
          setTheme('dark');
          setSurfaceColorMode('dynamic-dark');
        },
      },
      {
        id: 'theme-dynamic-light',
        category: '背景・外観モード',
        title: '背景色を「動的 (白＋背景色ほんのりブレンド)」に切り替え',
        subtitle: 'ライトモードの白に壁紙の色が上品に混ざる動的サーフェス',
        icon: 'Sun',
        keywords: 'dynamic light theme 背景 動的 ライト 白',
        run: () => {
          setTheme('light');
          setSurfaceColorMode('dynamic-light');
        },
      },
      {
        id: 'pip-open',
        category: 'マルチタスク',
        title: 'PiP ミニ動画プレイヤー (常に最前面) を起動',
        subtitle: '作業しながらMVや動画をデスクトップの隅で再生',
        icon: 'Tv',
        keywords: 'pip video mv 動画 小窓 ミニプレイヤー',
        run: () => {
          setPipMedia((prev) => prev || DEFAULT_PIP_PRESETS[0]);
        },
      },
      {
        id: 'desk-note-add',
        category: 'マルチタスク',
        title: 'デスクトップに付箋メモを追加',
        subtitle: 'ドラッグ移動＆カラー変更できるフローティング付箋',
        icon: 'FileText',
        keywords: 'note sticky memo 付箋 メモ',
        run: () => addDeskNote(),
      },
      {
        id: 'win-snap-5050',
        category: 'ウィンドウ整理',
        title: '開いているウィンドウを左右50:50に並べてタイル保存',
        subtitle: 'ワンクリックで左右分割＆タイルグループに記憶',
        icon: 'Columns',
        keywords: 'snap tile window ウィンドウ 分割 左右 タイル',
        run: () => {
          snapAllWindows5050();
          setTimeout(() => saveCurrentWindowsAsTileGroup('左右50:50分割セット'), 150);
        },
      },
      {
        id: 'app-settings',
        category: 'アプリ起動',
        title: 'OS設定 (Settings)',
        subtitle: '動的背景ブレンド・アクセントカラー・季節のライブ壁紙設定',
        icon: 'Settings',
        keywords: 'settings 設定 壁紙 テーマ',
        run: () => openApp('settings'),
      },
      {
        id: 'app-browser',
        category: 'アプリ起動',
        title: 'Glassium Browser (プロキシ対応ブラウザ)',
        subtitle: 'Webブラウジングとプロキシ検索',
        icon: 'Globe',
        keywords: 'browser web ブラウザ 検索',
        run: () => openApp('browser'),
      },
    ];

    const filtered = q
      ? baseItems.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.subtitle.toLowerCase().includes(q) ||
            item.keywords.toLowerCase().includes(q)
        )
      : baseItems;

    list.push(...filtered);

    if (q.length >= 2) {
      list.push({
        id: `play-song-query-${q}`,
        category: 'Music 楽曲検索・即時再生',
        title: `🎵 「${spotlightQuery.trim()}」をMusicアプリで検索して再生`,
        subtitle: 'Glassium Grooveを開いて該当楽曲をストリーミング再生します',
        icon: 'Music',
        run: () => {
          openApp('synth');
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('glassium-music-command', {
                detail: { action: 'play-query', query: spotlightQuery.trim() },
              })
            );
          }, 180);
        },
      });
    }

    return list;
  }, [
    spotlightQuery,
    parsedTimerSeconds,
    openApp,
    setTheme,
    setSurfaceColorMode,
    addDeskNote,
    snapAllWindows5050,
  ]);

  // ============================================================================
  // 2. WINDOW TILE GROUP MEMORY & 1-CLICK GROUP MINIMIZE / RESTORE (#8)
  // ============================================================================
  const [tileGroups, setTileGroups] = useState<SavedTileGroup[]>(() => {
    try {
      const raw = localStorage.getItem(TILE_GROUPS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [tileManagerOpen, setTileManagerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(TILE_GROUPS_STORAGE_KEY, JSON.stringify(tileGroups));
    } catch {
      // ignore
    }
  }, [tileGroups]);

  useEffect(() => {
    const onToggleTileManager = () => setTileManagerOpen((v) => !v);
    window.addEventListener('glassium-toggle-tile-manager', onToggleTileManager);
    return () => window.removeEventListener('glassium-toggle-tile-manager', onToggleTileManager);
  }, []);

  const visibleWindows = useMemo(
    () => windows.filter((w) => !w.closed && !w.minimized),
    [windows]
  );

  const saveCurrentWindowsAsTileGroup = (customName?: string) => {
    const openWins = windows.filter((w) => !w.closed);
    if (openWins.length === 0) return;
    const groupName =
      customName ||
      `${openWins
        .slice(0, 3)
        .map((w) => w.title)
        .join(' + ')}${openWins.length > 3 ? ` 他${openWins.length - 3}件` : ''}`;

    const items: SavedTileWindowItem[] = openWins.map((w) => ({
      appId: w.appId,
      title: w.title,
      x: Math.round(w.x),
      y: Math.round(w.y),
      width: Math.round(w.width),
      height: Math.round(w.height),
    }));

    const newGroup: SavedTileGroup = {
      id: `tile-grp-${Date.now()}`,
      name: groupName,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items,
    };
    setTileGroups((prev) => [newGroup, ...prev].slice(0, 8));
  };

  const restoreTileGroup = (group: SavedTileGroup) => {
    group.items.forEach((item) => {
      const existing = windows.find((w) => w.appId === item.appId && !w.closed);
      if (existing) {
        restoreWindow(existing.id);
        moveWindow(existing.id, item.x, item.y);
        resizeWindow(existing.id, item.width, item.height);
        focusWindow(existing.id);
      } else {
        openApp(item.appId);
      }
    });
  };

  const minimizeTileGroup = (group: SavedTileGroup) => {
    const appSet = new Set(group.items.map((i) => i.appId));
    windows.forEach((w) => {
      if (!w.closed && appSet.has(w.appId)) {
        minimizeWindow(w.id);
      }
    });
  };

  const minimizeAllVisibleWindows = () => {
    visibleWindows.forEach((w) => minimizeWindow(w.id));
  };

  // ============================================================================
  // 3. PICTURE-IN-PICTURE (PiP) ALWAYS-ON-TOP MINI VIDEO PLAYER (#10)
  // ============================================================================
  const [pipMedia, setPipMedia] = useState<PipMediaState | null>(null);
  const [pipLarge, setPipLarge] = useState(false);
  const [pipPos, setPipPos] = useState<{ x: number; y: number }>({ x: 24, y: 76 });
  const pipDragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const onOpenPip = (e: Event) => {
      const detail = (e as CustomEvent<PipMediaState>).detail;
      if (detail && (detail.videoUrl || detail.youtubeId)) {
        setPipMedia(detail);
      } else {
        setPipMedia((prev) => prev || DEFAULT_PIP_PRESETS[0]);
      }
    };
    window.addEventListener('glassium-open-pip', onOpenPip);
    return () => window.removeEventListener('glassium-open-pip', onOpenPip);
  }, []);

  const handlePipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, select, iframe, video')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pipDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pipPos.x,
      origY: pipPos.y,
    };
  };

  const handlePipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pipDragRef.current) return;
    const dx = e.clientX - pipDragRef.current.startX;
    const dy = e.clientY - pipDragRef.current.startY;
    setPipPos({
      x: Math.max(12, Math.min(window.innerWidth - 320, pipDragRef.current.origX + dx)),
      y: Math.max(48, Math.min(window.innerHeight - 220, pipDragRef.current.origY + dy)),
    });
  };

  const handlePipPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pipDragRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    pipDragRef.current = null;
  };

  return (
    <>
      {/* ====================================================================
          1. SPOTLIGHT COMMAND PALETTE MODAL (Ctrl + K / Alt + Space)
         ==================================================================== */}
      <AnimatePresence>
        {spotlightOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={() => setSpotlightOpen(false)}
            className="fixed inset-0 z-[9500] bg-black/55 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4 select-none"
          >
            <motion.div
              initial={{ y: -18, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -12, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl liquid-glass-window border border-white/25 shadow-[0_28px_80px_rgba(0,0,0,0.75)] overflow-hidden text-white"
            >
              {/* Search Input Bar */}
              <div className="px-4 py-3.5 border-b border-white/15 flex items-center gap-3 bg-slate-950/65">
                <Icon name="Search" size={18} className="text-cyan-400 shrink-0" />
                <input
                  ref={spotlightInputRef}
                  value={spotlightQuery}
                  onChange={(e) => {
                    setSpotlightQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedIndex((i) =>
                        spotlightActions.length > 0 ? (i + 1) % spotlightActions.length : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedIndex((i) =>
                        spotlightActions.length > 0
                          ? (i - 1 + spotlightActions.length) % spotlightActions.length
                          : 0
                      );
                    } else if (e.key === 'Enter' && spotlightActions[selectedIndex]) {
                      e.preventDefault();
                      spotlightActions[selectedIndex].run();
                      setSpotlightOpen(false);
                    }
                  }}
                  placeholder="アプリ起動、曲名再生、「3分タイマー」、動的テーマ切替、PiP動画..."
                  className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-white/45 outline-none"
                />
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/65">
                  Ctrl+K / Esc
                </span>
              </div>

              {/* Quick Filter / Mode Chips */}
              <div className="px-4 py-2 bg-slate-900/50 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-white/50 font-mono">クイック操作:</span>
                  <button
                    type="button"
                    onClick={() => setSpotlightQuery('3分タイマー')}
                    className="px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-cyan-200 font-semibold cursor-pointer"
                  >
                    ⏱ 3分タイマー
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      setSurfaceColorMode('dynamic-dark');
                      setSpotlightOpen(false);
                    }}
                    className="px-2 py-0.5 rounded-md bg-violet-500/20 hover:bg-violet-500/35 border border-violet-400/30 text-violet-200 font-semibold cursor-pointer"
                  >
                    🎨 動的 (黒＋背景色)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      setSurfaceColorMode('dynamic-light');
                      setSpotlightOpen(false);
                    }}
                    className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/30 text-amber-200 font-semibold cursor-pointer"
                  >
                    ☀️ 動的 (白＋背景色)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPipMedia((prev) => prev || DEFAULT_PIP_PRESETS[0]);
                      setSpotlightOpen(false);
                    }}
                    className="px-2 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/30 text-rose-200 font-semibold cursor-pointer"
                  >
                    📺 PiP 小窓動画
                  </button>
                </div>
                <span className="text-[10px] text-white/45 font-mono">
                  現在: {theme === 'light' ? 'ライト' : 'ダーク'} / {surfaceColorMode}
                </span>
              </div>

              {/* Action Results List */}
              <div className="max-h-[52vh] overflow-y-auto p-2 space-y-1 bg-slate-950/75">
                {spotlightActions.map((item, idx) => {
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        item.run();
                        setSpotlightOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition cursor-pointer ${
                        active
                          ? 'bg-white/15 border border-white/25 shadow-lg'
                          : 'hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          style={
                            active ? { backgroundColor: resolvedAccentHex } : undefined
                          }
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            active ? 'text-slate-950' : 'bg-white/10 text-cyan-300'
                          }`}
                        >
                          <Icon name={item.icon} size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {item.title}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white/70 shrink-0">
                              {item.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-white/55 truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-white/45 shrink-0">
                        Enter ↵
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          2. WINDOW TILE GROUP MEMORY & 1-CLICK MINIMIZE/RESTORE DRAWER (#8)
         ==================================================================== */}
      <AnimatePresence>
        {tileManagerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-[4600] w-[92vw] max-w-md rounded-2xl liquid-glass-window border border-white/25 bg-slate-950/90 backdrop-blur-2xl p-4 shadow-2xl text-white select-none"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Icon name="Columns" size={16} className="text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-white">
                    タイルグループ記憶 ＆ 一括最小化・復元
                  </div>
                  <div className="text-[10px] text-white/55">
                    複数ウィンドウの配置をセット保存し、1クリックで最小化・復元できます
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTileManagerOpen(false)}
                className="w-6 h-6 rounded-lg hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
              >
                <Icon name="X" size={13} />
              </button>
            </div>

            {/* Quick Tile Actions */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  snapAllWindows5050();
                  setTimeout(() => saveCurrentWindowsAsTileGroup('左右50:50分割ペア'), 150);
                }}
                className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/35 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Icon name="Columns" size={14} />
                <span>左右分割して保存</span>
              </button>
              <button
                type="button"
                onClick={() => saveCurrentWindowsAsTileGroup()}
                disabled={windows.filter((w) => !w.closed).length === 0}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-40"
              >
                <Icon name="Plus" size={14} />
                <span>現在の配置を記憶</span>
              </button>
            </div>

            {visibleWindows.length > 0 && (
              <button
                type="button"
                onClick={minimizeAllVisibleWindows}
                className="w-full mb-3 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <span>現在表示中の {visibleWindows.length} ウィンドウを一括最小化</span>
              </button>
            )}

            {/* Saved Tile Groups List */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
              {tileGroups.length === 0 ? (
                <div className="text-center py-5 text-[11px] text-white/45 border border-dashed border-white/15 rounded-xl">
                  保存されたタイルグループはまだありません。
                  <br />
                  「左右分割して保存」または「現在の配置を記憶」を押すと登録されます。
                </div>
              ) : (
                tileGroups.map((grp) => (
                  <div
                    key={grp.id}
                    className="p-2.5 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{grp.name}</div>
                      <div className="text-[10px] text-white/50 font-mono">
                        {grp.items.length} ウィンドウ · {grp.createdAt} 保存
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => restoreTileGroup(grp)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-400 text-slate-950 text-[10px] font-black hover:bg-cyan-300 cursor-pointer"
                      >
                        一括復元
                      </button>
                      <button
                        type="button"
                        onClick={() => minimizeTileGroup(grp)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/85 text-[10px] font-bold cursor-pointer"
                      >
                        最小化
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTileGroups((prev) => prev.filter((item) => item.id !== grp.id))
                        }
                        className="w-6 h-6 rounded-lg hover:bg-rose-500/30 text-white/50 hover:text-rose-200 flex items-center justify-center cursor-pointer"
                        title="削除"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          3. PICTURE-IN-PICTURE (PiP) ALWAYS-ON-TOP MINI VIDEO PLAYER (#10)
         ==================================================================== */}
      <AnimatePresence>
        {pipMedia && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{
              position: 'fixed',
              right: pipPos.x,
              bottom: pipPos.y,
              width: pipLarge ? 440 : 320,
              zIndex: 4800,
              touchAction: 'none',
            }}
            onPointerDown={handlePipPointerDown}
            onPointerMove={handlePipPointerMove}
            onPointerUp={handlePipPointerUp}
            onPointerCancel={handlePipPointerUp}
            className="rounded-2xl overflow-hidden liquid-glass-window border border-white/25 bg-slate-950/92 shadow-[0_24px_60px_rgba(0,0,0,0.75)] select-none"
          >
            {/* PiP Drag Header */}
            <div className="px-3 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="text-[11px] font-bold text-white truncate">
                  PiP · {pipMedia.title}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={pipMedia.youtubeId || pipMedia.videoUrl || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = DEFAULT_PIP_PRESETS.find(
                      (p) => p.youtubeId === val || p.videoUrl === val
                    );
                    if (found) setPipMedia(found);
                  }}
                  className="bg-white/10 border border-white/15 rounded px-1.5 py-0.5 text-[10px] text-white outline-none max-w-[105px]"
                  title="チャンネル切替"
                >
                  {DEFAULT_PIP_PRESETS.map((p) => (
                    <option
                      key={p.title}
                      value={p.youtubeId || p.videoUrl}
                      className="bg-slate-900 text-white"
                    >
                      {p.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setPipLarge((v) => !v)}
                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white cursor-pointer"
                  title="サイズ切替"
                >
                  {pipLarge ? '小' : '大'}
                </button>
                <button
                  type="button"
                  onClick={() => setPipMedia(null)}
                  className="w-5 h-5 rounded hover:bg-rose-500/80 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
                  title="PiPを閉じる"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            </div>

            {/* Video Surface */}
            <div className="aspect-video w-full bg-black relative">
              {pipMedia.videoUrl ? (
                <video
                  key={pipMedia.videoUrl}
                  src={pipMedia.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              ) : pipMedia.youtubeId ? (
                <iframe
                  key={pipMedia.youtubeId}
                  src={`https://www.youtube-nocookie.com/embed/${pipMedia.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  title={pipMedia.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
