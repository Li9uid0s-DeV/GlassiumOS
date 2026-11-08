import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from './OSContext';
import { TASKBAR_APPS, AppId } from './types';
import { Icon } from './Icon';
import { StartMenu } from './StartMenu';
import { AIAssistant } from './AIAssistant';
import { AppLogo } from './AppLogo';
import { requestAIChat } from './aiClient';
import { getMusicState, subscribeMusicState, MusicPlayerState } from './musicBridge';
import { globalAudio } from './globalAudioManager';

interface TaskbarProps {
  onLock?: () => void;
}

const SEARCHABLE_APPS: { appId: AppId; label: string; keywords: string; icon: string }[] = [
  { appId: 'browser', label: 'Browser', keywords: 'web internet search ブラウザ', icon: 'Globe' },
  { appId: 'notepad', label: 'Editor', keywords: 'text code note メモ エディタ', icon: 'FileText' },
  { appId: 'terminal', label: 'Terminal', keywords: 'shell console bash 端末 ターミナル', icon: 'SquareTerminal' },
  { appId: 'explorer', label: 'Files', keywords: 'folder directory explorer ファイル', icon: 'FolderOpen' },
  { appId: 'calculator', label: 'Calculator', keywords: 'math calc 電卓 計算', icon: 'Calculator' },
  { appId: 'settings', label: 'Settings', keywords: 'config preferences theme 設定', icon: 'Settings' },
  { appId: 'game', label: 'Games', keywords: 'play arcade 2048 snake tetris ゲーム', icon: 'Gamepad2' },
  { appId: 'synth', label: 'Music', keywords: 'audio synth player 音楽 曲 歌', icon: 'Music' },
  { appId: 'entertainment', label: 'Entertainment (動画・アニメ・映画)', keywords: 'video movie anime tv youtube shorts prime shows streamex flixhd maple 動画 映画 アニメ ショーツ', icon: 'Tv' },
  { appId: 'calendar', label: 'Calendar', keywords: 'date schedule tasks カレンダー', icon: 'Calendar' },
  { appId: 'weather', label: 'Weather', keywords: 'forecast temperature 天気', icon: 'CloudSun' },
  { appId: 'clock', label: 'Clock', keywords: 'time alarm timer 時計', icon: 'Clock' },
  { appId: 'ai', label: 'AI Assistant', keywords: 'gemini chat copilot アシスタント', icon: 'Sparkles' },
  { appId: 'taskmanager', label: 'Task Manager', keywords: 'processes windows cpu memory タスク', icon: 'Cpu' },
  { appId: 'appstore', label: 'App Store', keywords: 'install store ストア', icon: 'Store' },
  { appId: 'paint', label: 'Paint Studio', keywords: 'draw canvas art ペイント お絵かき', icon: 'Palette' },
  { appId: 'pomodoro', label: 'Pomodoro Timer', keywords: 'focus study timer ポモドーロ 集中', icon: 'Clock' },
  { appId: 'unitconverter', label: 'Unit Converter', keywords: 'length weight temp 単位変換', icon: 'SlidersHorizontal' },
  { appId: 'colorpicker', label: 'Color Studio', keywords: 'rgb hex palette カラー 色', icon: 'Palette' },
  { appId: 'passgen', label: 'Password Generator', keywords: 'security key パスワード', icon: 'Key' },
  { appId: 'qrcode', label: 'QR Matrix Studio', keywords: 'qr barcode QRコード', icon: 'Grid3x3' },
  { appId: 'jsonformat', label: 'JSON Formatter', keywords: 'json format validate 整形', icon: 'Code2' },
  { appId: 'regex', label: 'Regex Tester', keywords: 'regexp pattern 正規表現', icon: 'Search' },
  { appId: 'markdown', label: 'Markdown Reader', keywords: 'md preview マークダウン', icon: 'FileText' },
  { appId: 'kanban', label: 'Kanban Board', keywords: 'todo project task カンバン', icon: 'LayoutGrid' },
  { appId: 'habit', label: 'Habit Tracker', keywords: 'routine streak 習慣', icon: 'CheckCircle2' },
  { appId: 'expense', label: 'Expense Ledger', keywords: 'budget money 家計簿 収支', icon: 'Calculator' },
  { appId: 'bmi', label: 'Health & BMI', keywords: 'weight health 健康 BMI', icon: 'Activity' },
  { appId: 'worldclock', label: 'World Clock Hub', keywords: 'timezone global 世界時計', icon: 'Globe' },
  { appId: 'morse', label: 'Morse & Cipher', keywords: 'morse code モールス 暗号', icon: 'Zap' },
  { appId: 'base64', label: 'Base64 & URL Tool', keywords: 'encode decode エンコード', icon: 'Code2' },
  { appId: 'diff', label: 'Text Diff Viewer', keywords: 'compare difference 差分', icon: 'Layers' },
  { appId: 'wordcount', label: 'Word Analyzer', keywords: 'character count 文字数', icon: 'FileText' },
  { appId: 'flashcards', label: 'Flashcards Deck', keywords: 'study quiz 暗記 カード', icon: 'BookOpen' },
  { appId: 'whiteboard', label: 'Idea Board', keywords: 'sticky brainstorm アイデア 付箋', icon: 'PenTool' },
  { appId: 'drumpad', label: '808 Drum Pad', keywords: 'beat drum music ドラム', icon: 'Music' },
  { appId: 'tuner', label: 'Frequency Synth', keywords: 'hz pitch audio 周波数', icon: 'Volume2' },
  { appId: 'minesweeper', label: 'Minesweeper', keywords: 'mine puzzle マインスイーパー', icon: 'Gamepad2' },
  { appId: 'tictactoe', label: 'Tic-Tac-Toe AI', keywords: 'ox game マルバツ 〇×', icon: 'Grid3x3' },
  { appId: 'memory', label: 'Memory Match', keywords: 'cards match 神経衰弱', icon: 'Sparkles' },
  { appId: 'typing', label: 'Typing Trainer', keywords: 'wpm keyboard タイピング', icon: 'SquareTerminal' },
  { appId: 'sudoku', label: 'Mini Sudoku', keywords: 'number puzzle ナンプレ 数独', icon: 'Grid3x3' },
  { appId: 'periodic', label: 'Periodic Table', keywords: 'chemistry elements 元素周期表', icon: 'Sparkles' },
  { appId: 'dictionary', label: 'Tech Lexicon', keywords: 'words lexicon 辞典 辞書', icon: 'BookOpen' },
  { appId: 'sysinfo', label: 'System Diagnostics', keywords: 'hardware specs システム診断', icon: 'Cpu' },
];

export function Taskbar(_props?: TaskbarProps) {
  void _props;
  const {
    windows,
    openApp,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    closeWindow,
    quickSettings,
    toggleQuick,
    taskbarAlign,
    autoHideTaskbar,
    startOpen,
    setStartOpen,
    installedApps,
    launchInstalledApp,
    shellMode,
    setShellMode,
    setTheme,
    setWallpaper,
    setAuroraColor,
    volume,
    setVolume,
    brightness,
    setBrightness,
    soundEnabled,
    setSoundEnabled,
    activeDesktopId,
    taskViewOpen,
    setTaskViewOpen,
    toggleTaskView,
    theme,
    lockSystem,
    snapAllWindows5050,
    closeAllWindows,
    autoLockMinutes,
    setAutoLockMinutes,
  } = useOS();
  const isLight = theme === 'light';

  const currentDesktopWindows = windows.filter(
    (w) => !w.desktopId || w.desktopId === activeDesktopId
  );

  const [trayOpen, setTrayOpen] = useState(false);
  const [calendarFlyoutOpen, setCalendarFlyoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [now, setNow] = useState(new Date());
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number } | null>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [startPos, setStartPos] = useState<{ x: number; width: number } | null>(null);

  // Live Music State for Quick Controls
  const [musicState, setMusicState] = useState<MusicPlayerState | null>(() => getMusicState());

  useEffect(() => {
    return subscribeMusicState((st) => {
      setMusicState(st);
    });
  }, []);

  // OS-Level Integrated AI Omnibar state (GlassiumOS 5)
  const [aiOmniInput, setAiOmniInput] = useState('');
  const [aiOmniReply, setAiOmniReply] = useState<string | null>(null);
  const [aiOmniLoading, setAiOmniLoading] = useState(false);
  const [aiOmniOpen, setAiOmniOpen] = useState(false);

  const handleRunOmniAI = async () => {
    const q = aiOmniInput.trim();
    if (!q || aiOmniLoading) return;
    setAiOmniLoading(true);
    setAiOmniOpen(true);
    try {
      const res = await requestAIChat({ message: q });
      const act = res.action || res.osAction;
      if (act && act.type) {
        const target = String(act.target ?? act.value ?? '');
        if (act.type === 'open_app' || act.type === 'open') {
          openApp(target as AppId);
        } else if (act.type === 'set_shell' || act.type === 'shell') {
          setShellMode(target as Parameters<typeof setShellMode>[0]);
        } else if (act.type === 'set_theme' || act.type === 'theme') {
          if (target === 'light' || target === 'dark') setTheme(target);
        } else if (act.type === 'set_wallpaper' || act.type === 'wallpaper') {
          setWallpaper(target as Parameters<typeof setWallpaper>[0]);
        } else if (act.type === 'set_aurora') {
          setWallpaper('live2d');
          setAuroraColor(target as Parameters<typeof setAuroraColor>[0]);
        } else if (act.type === 'set_volume' || act.type === 'volume') {
          const v = Number(target);
          if (Number.isFinite(v)) setVolume(Math.max(0, Math.min(100, v)));
        } else if (act.type === 'lock_screen' || act.type === 'lock') {
          lockSystem();
        } else if (act.type === 'snap_windows') {
          snapAllWindows5050();
        } else if (act.type === 'close_all') {
          closeAllWindows();
        }
      }
      setAiOmniReply(res.reply);
      setAiOmniInput('');
    } catch {
      setAiOmniReply('応答を取得できませんでした。');
    } finally {
      setAiOmniLoading(false);
    }
  };

  const handleMouseEnterIcon = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: rect.left + rect.width / 2 });
    setHoveredApp(appId);
  };

  const updateStartPos = useCallback(() => {
    if (startBtnRef.current) {
      const rect = startBtnRef.current.getBoundingClientRect();
      setStartPos({ x: rect.left, width: rect.width });
    }
  }, []);

  const [isTaskbarHovered, setIsTaskbarHovered] = useState(false);

  useEffect(() => {
    if (!autoHideTaskbar) {
      setIsTaskbarHovered(true);
      return;
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY >= window.innerHeight - 14 || startOpen || trayOpen || calendarFlyoutOpen || aiOmniOpen) {
        setIsTaskbarHovered(true);
      } else if (e.clientY < window.innerHeight - 60) {
        setIsTaskbarHovered(false);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [autoHideTaskbar, startOpen, trayOpen, calendarFlyoutOpen, aiOmniOpen]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    window.addEventListener('resize', updateStartPos);
    updateStartPos();
    return () => {
      clearInterval(t);
      window.removeEventListener('resize', updateStartPos);
    };
  }, [updateStartPos, taskbarAlign]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        (!searchDropdownRef.current || !searchDropdownRef.current.contains(target))
      ) {
        setSearchFocused(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredSearchApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SEARCHABLE_APPS.slice(0, 6);
    return SEARCHABLE_APPS.filter(
      (a) => a.label.toLowerCase().includes(q) || a.keywords.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  const handleStartClick = () => {
    updateStartPos();
    setSearchFocused(false);
    setTrayOpen(false);
    setTaskViewOpen(false);
    setAiOmniOpen(false);
    setStartOpen(!startOpen);
  };

  const handleAppClick = (appId: AppId) => {
    const wins = currentDesktopWindows.filter((w) => w.appId === appId);
    if (wins.length === 0) {
      openApp(appId);
    } else {
      const top = wins.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
      if (top.minimized) restoreWindow(top.id);
      else {
        const visibleWins = currentDesktopWindows.filter((w) => !w.minimized);
        const isTopmost =
          visibleWins.length > 0 &&
          visibleWins.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id === top.id;
        if (isTopmost) minimizeWindow(top.id);
        else focusWindow(top.id);
      }
    }
  };

  const handleInstalledAppClick = (appId: string) => {
    const wins = currentDesktopWindows.filter((w) => w.appId === appId);
    if (wins.length === 0) {
      launchInstalledApp(appId);
    } else {
      const top = wins.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
      if (top.minimized) restoreWindow(top.id);
      else {
        const visibleWins = currentDesktopWindows.filter((w) => !w.minimized);
        const isTopmost =
          visibleWins.length > 0 &&
          visibleWins.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id === top.id;
        if (isTopmost) minimizeWindow(top.id);
        else focusWindow(top.id);
      }
    }
  };

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const isXP = shellMode === 'xp';
  const isVista = shellMode === 'vista';
  const isWin10 = shellMode === 'windows10';
  const isDeX = shellMode === 'dex';
  const isChromeOS = shellMode === 'chromeos';
  const isGlassium5 = shellMode === 'windows';

  return (
    <>
      <StartMenu open={startOpen} onClose={() => setStartOpen(false)} startPos={startPos} />

      {/* ==============================================================
          1. WINDOWS XP LUNA TASKBAR
         ============================================================== */}
      {isXP && (
        <div
          className="fixed bottom-0 inset-x-0 h-10 w-screen z-[5000] flex items-center justify-between select-none shadow-2xl font-sans"
          style={{
            background: 'linear-gradient(to bottom, #245edb 0%, #3f88f8 8%, #1f57ce 50%, #1545ad 100%)',
            borderTop: '2px solid #3876fc',
          }}
        >
          <div className="flex items-center h-full">
            <button
              ref={startBtnRef}
              onClick={handleStartClick}
              className="h-full px-4 rounded-r-2xl flex items-center gap-2 shadow-lg transition active:brightness-95 group font-bold italic"
              style={{
                background: 'linear-gradient(to bottom, #388200 0%, #5aa700 20%, #3c8200 80%, #205900 100%)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), 2px 0 4px rgba(0,0,0,0.4)',
                borderRight: '1px solid #1a4d00',
              }}
              title="Start"
            >
              <AppLogo size={18} />
              <span className="text-white text-base tracking-wide font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                start
              </span>
            </button>

            <div className="flex items-center gap-1 px-2 overflow-x-auto max-w-xl">
              {windows.map((win) => {
                const isActive = !win.minimized;
                return (
                  <button
                    key={win.id}
                    onClick={() => {
                      if (win.minimized) restoreWindow(win.id);
                      else focusWindow(win.id);
                    }}
                    className={`h-7 px-2.5 rounded-sm flex items-center gap-1.5 text-xs text-white max-w-[140px] truncate border font-medium ${
                      isActive
                        ? 'bg-[#1545ad] border-[#0e307c] shadow-inner font-bold'
                        : 'bg-[#2f71cd] hover:bg-[#3d83e6] border-[#4b8ff5]'
                    }`}
                    title={win.title}
                  >
                    <Icon name={win.icon} size={13} className="text-amber-200 shrink-0" />
                    <span className="truncate">{win.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="flex items-center gap-2 h-full px-3 text-white border-l-2 border-[#1545ad]"
            style={{ background: 'linear-gradient(to bottom, #092484 0%, #153fb5 50%, #0d2e96 100%)' }}
          >
            <div className="flex items-center gap-1.5 text-white/90">
              <Icon name="Volume2" size={14} className="hover:text-amber-300 cursor-pointer" onClick={() => setTrayOpen(!trayOpen)} />
              <Icon name="Wifi" size={14} />
            </div>
            <div className="text-xs font-bold text-white tabular-nums tracking-wide font-mono pl-1">
              {timeStr}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          2. WINDOWS VISTA AERO GLASS TASKBAR
         ============================================================== */}
      {isVista && (
        <div
          className="fixed bottom-0 inset-x-0 h-10 w-screen z-[5000] flex items-center justify-between select-none shadow-2xl font-sans bg-slate-900/60 backdrop-blur-xl border-t border-sky-400/30"
        >
          <div className="flex items-center h-full pl-2">
            <button
              ref={startBtnRef}
              onClick={handleStartClick}
              className="relative -top-1 w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 shadow-xl bg-slate-900/80 border border-white/40"
              title="Start"
            >
              <AppLogo size={20} glow={startOpen} />
            </button>

            <div className="flex items-center gap-1.5 px-3 overflow-x-auto max-w-xl">
              {windows.map((win) => {
                const isActive = !win.minimized;
                return (
                  <button
                    key={win.id}
                    onClick={() => {
                      if (win.minimized) restoreWindow(win.id);
                      else focusWindow(win.id);
                    }}
                    className={`h-7 px-3 rounded-md flex items-center gap-2 text-xs text-white max-w-[150px] truncate border transition ${
                      isActive
                        ? 'bg-sky-500/25 border-sky-400/60 shadow-lg shadow-sky-500/20 font-semibold'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                    title={win.title}
                  >
                    <Icon name={win.icon} size={14} className="text-sky-300 shrink-0" />
                    <span className="truncate">{win.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 h-full px-4 text-white">
            <AIAssistant />
            <div className="flex items-center gap-1.5 text-white/80 cursor-pointer" onClick={() => setTrayOpen(!trayOpen)}>
              <Icon name="Wifi" size={14} />
              <Icon name="Volume2" size={14} />
            </div>
            <div className="text-right leading-tight">
              <div className="text-xs font-semibold text-white/95 tabular-nums font-mono">{timeStr}</div>
              <div className="text-[9px] text-white/50">{dateStr}</div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          3. WINDOWS 10 TASKBAR
         ============================================================== */}
      {isWin10 && (
        <div
          className="fixed bottom-0 inset-x-0 h-10 w-screen z-[5000] flex items-center justify-between select-none shadow-2xl font-sans bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 text-white"
        >
          <div className="flex items-center h-full">
            <button
              ref={startBtnRef}
              onClick={handleStartClick}
              className={`h-10 w-12 flex items-center justify-center hover:bg-white/10 transition ${
                startOpen ? 'bg-white/20' : ''
              }`}
              title="GlassiumOS Start"
            >
              <AppLogo size={18} glow={startOpen} />
            </button>

            <div className="flex items-center h-full">
              {TASKBAR_APPS.map((app) => {
                const wins = windows.filter((w) => w.appId === app.appId);
                const active = wins.length > 0;
                const anyVisible = wins.some((w) => !w.minimized);
                return (
                  <button
                    key={app.appId}
                    onClick={() => handleAppClick(app.appId)}
                    className={`relative h-10 w-11 flex items-center justify-center hover:bg-white/10 transition ${
                      anyVisible ? 'bg-white/15' : ''
                    }`}
                    title={app.label}
                  >
                    <Icon name={app.icon} size={16} className="text-white" />
                    {active && (
                      <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 ${anyVisible ? 'opacity-100' : 'opacity-50'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center h-full px-2 gap-1 text-white">
            <AIAssistant />
            <div className="flex items-center gap-1.5 px-2 hover:bg-white/10 h-full cursor-pointer" onClick={() => setTrayOpen(!trayOpen)}>
              <Icon name="Wifi" size={13} />
              <Icon name="Volume2" size={13} />
            </div>
            <div className="px-2 hover:bg-white/10 h-full flex flex-col justify-center text-right leading-tight cursor-pointer" onClick={() => setCalendarFlyoutOpen(!calendarFlyoutOpen)}>
              <div className="text-[11px] font-mono">{timeStr}</div>
              <div className="text-[9px] text-white/60">{dateStr}</div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          4. SAMSUNG DEX / CHROMEOS SHELLS
         ============================================================== */}
      {(isDeX || isChromeOS) && (
        <div
          className="fixed bottom-0 inset-x-0 h-11 w-screen z-[5000] flex items-center justify-between px-3 select-none font-sans bg-slate-900/60 backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.45)] text-white"
        >
          <div className="flex items-center gap-2">
            <button
              ref={startBtnRef}
              onClick={handleStartClick}
              className="h-8 w-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/15 transition"
              title="GlassiumOS Menu"
            >
              <AppLogo size={18} glow={startOpen} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {TASKBAR_APPS.map((app) => {
              const wins = windows.filter((w) => w.appId === app.appId);
              const active = wins.length > 0;
              return (
                <button
                  key={app.appId}
                  onClick={() => handleAppClick(app.appId)}
                  className={`relative h-8 w-8 rounded-xl flex items-center justify-center transition ${
                    active ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                  title={app.label}
                >
                  <Icon name={app.icon} size={16} className="text-white" />
                  {active && <span className="absolute bottom-0.5 w-1.5 h-0.5 rounded-full bg-cyan-400" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <AIAssistant />
            <button
              onClick={() => setTrayOpen(!trayOpen)}
              className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono"
            >
              <Icon name="Wifi" size={13} className="text-cyan-400" />
              <Icon name="Volume2" size={13} className="text-fuchsia-400" />
              <span className="font-semibold text-white">{timeStr}</span>
            </button>
          </div>
        </div>
      )}

      {/* ==============================================================
          5. GLASSIUMOS 5 MINIMAL HAIRLINE TASKBAR (shellMode === 'windows')
         ============================================================== */}
      {isGlassium5 && (
        <>
          {autoHideTaskbar && (
            <div
              className="fixed bottom-0 left-0 right-0 h-1.5 z-[5001] cursor-pointer"
              onMouseEnter={() => setIsTaskbarHovered(true)}
            />
          )}

          {/* OS-Level Integrated AI Omnibar Reply Popover */}
          <AnimatePresence>
            {aiOmniOpen && (aiOmniReply || aiOmniLoading) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.14 }}
                className={`fixed bottom-12 left-4 z-[5400] w-96 max-w-[calc(100vw-32px)] backdrop-blur-2xl border-t-2 border-[var(--os-accent)] shadow-2xl p-4 font-sans ${
                  isLight ? 'bg-white/95 text-slate-900' : 'bg-slate-950/95 text-white'
                }`}
              >
                <div className={`flex items-center justify-between pb-2 mb-2 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Icon name="Sparkles" size={14} className="text-[var(--os-accent)]" />
                    <span>GlassiumOS 5 AI コア応答</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAiOmniOpen(false);
                        openApp('ai');
                      }}
                      className="text-[11px] text-[var(--os-accent)] hover:underline"
                    >
                      AI アプリを開く
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiOmniOpen(false)}
                      className="opacity-50 hover:opacity-100"
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </div>
                </div>
                <div className="text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {aiOmniLoading ? '処理中...' : aiOmniReply}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={`fixed bottom-0 inset-x-0 h-11 w-screen z-[5000] backdrop-blur-2xl flex items-center justify-between px-4 select-none transition-all duration-200 border-t ${
              autoHideTaskbar && !isTaskbarHovered ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
            } ${
              isLight
                ? 'bg-white/85 border-slate-300/80 text-slate-900'
                : 'bg-slate-950/88 border-white/10 text-white'
            }`}
            onMouseEnter={() => setIsTaskbarHovered(true)}
          >
            {/* Left: Start Logo + OS-Level AI & App Omnibar + Desk View */}
            <div className="flex items-center gap-4 min-w-0" ref={searchContainerRef}>
              <button
                ref={startBtnRef}
                type="button"
                onClick={handleStartClick}
                className="h-11 px-2 flex items-center gap-2 transition-opacity hover:opacity-100 relative"
                title="GlassiumOS 5 u4 スタート"
              >
                {startOpen && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--os-accent)]" />}
                <AppLogo size={20} />
                <span className="text-xs font-bold tracking-tight hidden md:inline">GlassiumOS 5 u4</span>
              </button>

              <div className={`h-4 w-px ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />

              {/* Hairline Integrated Search & OS AI Omnibar */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 h-7 border-b transition-all ${
                  searchFocused
                    ? 'w-36 sm:w-44 border-[var(--os-accent)]'
                    : isLight
                    ? 'w-28 sm:w-36 border-slate-300'
                    : 'w-28 sm:w-36 border-white/15'
                }`}>
                  <Icon name="Search" size={13} className={searchFocused ? 'text-[var(--os-accent)]' : 'opacity-45'} />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => {
                      setStartOpen(false);
                      setTrayOpen(false);
                      setTaskViewOpen(false);
                      setSearchFocused(true);
                    }}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchFocused(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredSearchApps.length > 0) {
                        openApp(filteredSearchApps[0].appId);
                        setSearchQuery('');
                        setSearchFocused(false);
                      } else if (e.key === 'Escape') {
                        setSearchFocused(false);
                      }
                    }}
                    placeholder="アプリ検索"
                    className="w-full bg-transparent outline-none text-xs"
                  />
                </div>

                {/* Direct OS AI Command / Question Omnibar */}
                <div className={`hidden lg:flex items-center gap-2 h-7 border-b transition-all w-48 xl:w-60 ${
                  aiOmniInput ? 'border-[var(--os-accent)]' : isLight ? 'border-slate-300' : 'border-white/15'
                }`}>
                  <Icon name="Sparkles" size={13} className="text-[var(--os-accent)] shrink-0" />
                  <input
                    type="text"
                    value={aiOmniInput}
                    onChange={(e) => setAiOmniInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRunOmniAI();
                    }}
                    placeholder="AI操作・質問 (例: ライトモード / 計算)"
                    className="w-full bg-transparent outline-none text-xs"
                  />
                  {aiOmniInput && (
                    <button
                      type="button"
                      onClick={handleRunOmniAI}
                      className="text-[10px] font-bold text-[var(--os-accent)] shrink-0"
                    >
                      実行
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTaskView}
                className={`h-11 px-2 flex items-center justify-center relative transition-opacity ${
                  taskViewOpen ? 'text-[var(--os-accent)]' : 'opacity-65 hover:opacity-100'
                }`}
                title="仮想デスクトップ"
              >
                {taskViewOpen && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--os-accent)]" />}
                <Icon name="Layers" size={16} />
              </button>
            </div>

            {/* Center: Borderless Hairline Indicator App Icons */}
            <div
              className={`flex items-center gap-1 h-full ${
                taskbarAlign === 'left' ? 'justify-start pl-4' : 'justify-center'
              } flex-1 max-w-xl px-2`}
            >
              {TASKBAR_APPS.map((app) => {
                const wins = currentDesktopWindows.filter((w) => w.appId === app.appId);
                const active = wins.length > 0;
                const anyVisible = wins.some((w) => !w.minimized);
                return (
                  <div
                    key={app.appId}
                    className="relative h-full flex items-center shrink-0"
                    onMouseEnter={(e) => handleMouseEnterIcon(e, app.appId)}
                    onMouseLeave={() => { setHoveredApp(null); setHoverPos(null); }}
                  >
                    <button
                      onClick={() => handleAppClick(app.appId)}
                      className={`relative h-full px-2.5 flex items-center justify-center transition-opacity ${
                        anyVisible ? 'opacity-100' : active ? 'opacity-85' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={app.label}
                    >
                      {active && (
                        <span
                          className={`absolute top-0 left-1 right-1 h-0.5 bg-[var(--os-accent)] transition-all ${
                            anyVisible ? 'opacity-100' : 'opacity-45'
                          }`}
                        />
                      )}
                      <Icon name={app.appId} size={20} />
                    </button>
                  </div>
                );
              })}

              {/* Non-pinned open windows */}
              {currentDesktopWindows
                .filter(
                  (w, idx, arr) =>
                    !TASKBAR_APPS.some((t) => t.appId === w.appId) &&
                    !installedApps.some((i) => i.appId === w.appId) &&
                    arr.findIndex((x) => x.appId === w.appId) === idx
                )
                .map((win) => {
                  const anyVisible = !win.minimized;
                  return (
                    <button
                      key={win.id}
                      onClick={() => handleAppClick(win.appId as AppId)}
                      className="relative h-full px-2.5 flex items-center justify-center shrink-0"
                      title={win.title}
                    >
                      <span
                        className={`absolute top-0 left-1 right-1 h-0.5 bg-[var(--os-accent)] ${
                          anyVisible ? 'opacity-100' : 'opacity-45'
                        }`}
                      />
                      <Icon name={win.appId} size={20} />
                    </button>
                  );
                })}
            </div>

            {/* Right: Minimal Hairline System Tray */}
            <div className="flex items-center gap-3 h-full min-w-0 justify-end">
              <AIAssistant />
              <div className={`h-4 w-px shrink-0 ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />
              <button
                onClick={() => setTrayOpen((v) => !v)}
                className="flex items-center gap-2.5 h-full px-2 transition-opacity opacity-85 hover:opacity-100"
                title="システムコントロール"
              >
                <div className="flex items-center gap-1.5">
                  <Icon name="Wifi" size={13} className={quickSettings.wifi ? 'text-[var(--os-accent)]' : 'opacity-40'} />
                  <Icon
                    name={soundEnabled && volume > 0 ? 'Volume2' : 'VolumeX'}
                    size={13}
                    className={soundEnabled && volume > 0 ? 'text-[var(--os-accent)]' : 'opacity-40'}
                  />
                </div>
                <div className="text-right leading-tight hidden sm:block">
                  <div className="text-[11px] font-medium tabular-nums font-mono">{timeStr}</div>
                  <div className="text-[9px] opacity-55">{dateStr}</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ==============================================================
          6. WINDOWS 11 TASKBAR (shellMode === 'windows11')
         ============================================================== */}
      {!isXP && !isVista && !isWin10 && !isDeX && !isChromeOS && !isGlassium5 && (
        <>
          {autoHideTaskbar && (
            <div
              className="fixed bottom-0 left-0 right-0 h-1.5 z-[5001] cursor-pointer"
              onMouseEnter={() => setIsTaskbarHovered(true)}
            />
          )}
          <div
            className={`fixed bottom-0 inset-x-0 h-12 w-screen z-[5000] backdrop-blur-2xl flex items-center justify-between px-3 select-none transition-all duration-200 shadow-[0_-8px_32px_rgba(0,0,0,0.3)] ${
              autoHideTaskbar && !isTaskbarHovered ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
            } ${
              isLight
                ? 'bg-slate-100/45 text-slate-900 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]'
                : 'bg-slate-900/38 text-white'
            }`}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100vw', borderRadius: 0 }}
            onMouseEnter={() => setIsTaskbarHovered(true)}
          >
          {/* Left: Start Button + Flat App Search Bar + Task View */}
          <div className="flex items-center gap-2 min-w-0" ref={searchContainerRef}>
            <button
              ref={startBtnRef}
              type="button"
              onClick={handleStartClick}
              className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 ${
                startOpen
                  ? 'os-accent-soft border scale-95'
                  : isLight
                  ? 'bg-slate-900/5 hover:bg-slate-900/10 active:scale-95'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] active:scale-95'
              }`}
              title="Windows 11 Start"
            >
              <AppLogo size={20} />
            </button>

            {/* Flat Search Bar */}
            <div className="relative">
              <div
                className={`flex items-center gap-2 h-8 px-3 rounded-lg border transition-all duration-200 ${
                  searchFocused
                    ? isLight
                      ? 'w-44 sm:w-56 bg-white border-slate-300 shadow-sm'
                      : 'w-44 sm:w-56 bg-slate-950/80 border-white/20 shadow-sm'
                    : isLight
                    ? 'w-32 sm:w-44 bg-slate-900/5 hover:bg-slate-900/8 border-slate-900/10'
                    : 'w-32 sm:w-44 bg-white/[0.06] hover:bg-white/[0.10] border-white/10'
                }`}
              >
                <Icon
                  name="Search"
                  size={13}
                  className={searchFocused ? 'os-accent-text shrink-0' : 'opacity-50 shrink-0'}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    setStartOpen(false);
                    setTrayOpen(false);
                    setTaskViewOpen(false);
                    setSearchFocused(true);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchFocused(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredSearchApps.length > 0) {
                      openApp(filteredSearchApps[0].appId);
                      setSearchQuery('');
                      setSearchFocused(false);
                    } else if (e.key === 'Escape') {
                      setSearchFocused(false);
                    }
                  }}
                  placeholder="検索"
                  className={`w-full bg-transparent border-0 outline-none text-xs ${
                    isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white/95 placeholder:text-white/45'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="opacity-45 hover:opacity-90 transition"
                  >
                    <Icon name="X" size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Windows 11 Task View / Virtual Desktops Button */}
            <button
              type="button"
              onClick={toggleTaskView}
              className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 ${
                taskViewOpen
                  ? 'os-accent-soft border'
                  : isLight
                  ? 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-700 hover:text-slate-900 active:scale-95'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white active:scale-95'
              }`}
              title="タスクビュー ＆ 仮想デスクトップ (Desk View)"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <rect x="2.5" y="4.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.15" />
                <path d="M8.5 19.5H19C20.3807 19.5 21.5 18.3807 21.5 17V8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Center: Curated Essential Taskbar Icons */}
          <div
            className={`flex items-center gap-1 ${
              taskbarAlign === 'left' ? 'justify-start pl-3' : 'justify-center'
            } flex-1 max-w-xl px-2`}
          >
            {TASKBAR_APPS.map((app) => {
              const wins = currentDesktopWindows.filter((w) => w.appId === app.appId);
              const active = wins.length > 0;
              const anyVisible = wins.some((w) => !w.minimized);
              return (
                <div
                  key={app.appId}
                  className="relative group shrink-0"
                  onMouseEnter={(e) => handleMouseEnterIcon(e, app.appId)}
                  onMouseLeave={() => { setHoveredApp(null); setHoverPos(null); }}
                >
                  <button
                    onClick={() => handleAppClick(app.appId)}
                    className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 group ${
                      anyVisible
                        ? isLight
                          ? 'bg-slate-900/10'
                          : 'bg-white/15'
                        : isLight
                        ? 'hover:bg-slate-900/6 active:scale-95'
                        : 'hover:bg-white/10 active:scale-95'
                    }`}
                    title={app.label}
                  >
                    <Icon
                      name={app.appId}
                      size={22}
                      className="transition-transform duration-150 group-hover:scale-105"
                    />
                    {active && (
                      <span
                        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full os-accent-bg transition-all ${
                          anyVisible ? 'w-4' : 'w-1.5 opacity-70'
                        }`}
                      />
                    )}
                  </button>

                  {/* Windows 11 Interactive Taskbar Window Hover Preview Card */}
                  <AnimatePresence>
                    {hoveredApp === app.appId && hoverPos && wins.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.12 }}
                        style={{ left: hoverPos.x, transform: 'translateX(-50%)' }}
                        onMouseEnter={() => setHoveredApp(app.appId)}
                        onMouseLeave={() => { setHoveredApp(null); setHoverPos(null); }}
                        className="fixed bottom-14 z-[5500] flex items-center gap-2 p-2 rounded-xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl pointer-events-auto text-white font-sans max-w-[90vw] overflow-x-auto"
                      >
                        {wins.map((win) => (
                          <div
                            key={win.id}
                            className="w-48 flex flex-col gap-1.5 p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/40 transition group shrink-0"
                          >
                            <div className="flex items-center justify-between gap-1 px-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Icon name={app.appId} size={13} className="text-cyan-400 shrink-0" />
                                <span className="text-[11px] font-medium text-white/90 truncate">{win.title}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeWindow(win.id);
                                  if (wins.length <= 1) {
                                    setHoveredApp(null);
                                    setHoverPos(null);
                                  }
                                }}
                                className="w-5 h-5 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-rose-600 transition shrink-0"
                                title="閉じる"
                              >
                                <Icon name="X" size={12} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (win.minimized) restoreWindow(win.id);
                                else focusWindow(win.id);
                                setHoveredApp(null);
                                setHoverPos(null);
                              }}
                              className="h-28 w-full bg-black/60 rounded border border-white/10 group-hover:border-cyan-400/30 overflow-hidden relative flex flex-col justify-between p-2 text-left transition cursor-pointer"
                            >
                              <div className="w-full h-4 bg-white/10 rounded-sm flex items-center px-1.5 gap-1 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                <span className="text-[9px] text-white/50 truncate ml-1 font-mono">{win.title}</span>
                              </div>

                              <div className="flex-1 my-1 flex items-center justify-center">
                                <Icon name={app.appId} size={28} className="text-white/30 group-hover:scale-110 group-hover:text-cyan-400/70 transition-all" />
                              </div>

                              <div className="text-[9px] text-white/40 font-mono truncate text-center">
                                {win.minimized ? '最小化中 (クリックで再開)' : 'クリックでアクティブ化'}
                              </div>
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Open non-pinned windows */}
            {currentDesktopWindows
              .filter(
                (w, idx, arr) =>
                  !TASKBAR_APPS.some((t) => t.appId === w.appId) &&
                  !installedApps.some((i) => i.appId === w.appId) &&
                  arr.findIndex((x) => x.appId === w.appId) === idx
              )
              .map((win) => {
                const anyVisible = !win.minimized;
                const wins = currentDesktopWindows.filter((w) => w.appId === win.appId);
                return (
                  <div
                    key={win.id}
                    className="relative group shrink-0"
                    onMouseEnter={(e) => handleMouseEnterIcon(e, win.appId)}
                    onMouseLeave={() => { setHoveredApp(null); setHoverPos(null); }}
                  >
                    <button
                      onClick={() => handleAppClick(win.appId as AppId)}
                      className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 group ${
                        anyVisible
                          ? isLight
                            ? 'bg-slate-900/10'
                            : 'bg-white/15'
                          : isLight
                          ? 'hover:bg-slate-900/6 active:scale-95'
                          : 'hover:bg-white/10 active:scale-95'
                      }`}
                      title={win.title}
                    >
                      <Icon name={win.appId} size={22} className="transition-transform duration-150 group-hover:scale-105" />
                      <span
                        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full os-accent-bg transition-all ${
                          anyVisible ? 'w-4' : 'w-1.5 opacity-70'
                        }`}
                      />
                    </button>

                    {/* Windows 11 Live Preview Card */}
                    <AnimatePresence>
                      {hoveredApp === win.appId && hoverPos && wins.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.12 }}
                          style={{ left: hoverPos.x, transform: 'translateX(-50%)' }}
                          onMouseEnter={() => setHoveredApp(win.appId)}
                          onMouseLeave={() => { setHoveredApp(null); setHoverPos(null); }}
                          className="fixed bottom-14 z-[5500] flex items-center gap-2 p-2 rounded-xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl pointer-events-auto text-white font-sans max-w-[90vw] overflow-x-auto"
                        >
                          {wins.map((w) => (
                            <div
                              key={w.id}
                              className="w-48 flex flex-col gap-1.5 p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/40 transition group shrink-0"
                            >
                              <div className="flex items-center justify-between gap-1 px-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Icon name={w.appId} size={13} className="text-cyan-400 shrink-0" />
                                  <span className="text-[11px] font-medium text-white/90 truncate">{w.title}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeWindow(w.id);
                                    if (wins.length <= 1) {
                                      setHoveredApp(null);
                                      setHoverPos(null);
                                    }
                                  }}
                                  className="w-5 h-5 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-rose-600 transition shrink-0"
                                  title="閉じる"
                                >
                                  <Icon name="X" size={12} />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (w.minimized) restoreWindow(w.id);
                                  else focusWindow(w.id);
                                  setHoveredApp(null);
                                  setHoverPos(null);
                                }}
                                className="h-28 w-full bg-black/60 rounded border border-white/10 group-hover:border-cyan-400/30 overflow-hidden relative flex flex-col justify-between p-2 text-left transition cursor-pointer"
                              >
                                <div className="w-full h-4 bg-white/10 rounded-sm flex items-center px-1.5 gap-1 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                  <span className="text-[9px] text-white/50 truncate ml-1 font-mono">{w.title}</span>
                                </div>

                                <div className="flex-1 my-1 flex items-center justify-center">
                                  <Icon name={w.appId} size={28} className="text-white/30 group-hover:scale-110 group-hover:text-cyan-400/70 transition-all" />
                                </div>

                                <div className="text-[9px] text-white/40 font-mono truncate text-center">
                                  {w.minimized ? '最小化中 (クリックで再開)' : 'クリックでアクティブ化'}
                                </div>
                              </button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

            {/* Installed apps */}
            {installedApps.length > 0 && (
              <div className={`h-4 w-px mx-0.5 shrink-0 ${isLight ? 'bg-slate-900/15' : 'bg-white/10'}`} />
            )}
            {installedApps
              .filter(
                (app, idx, arr) =>
                  !TASKBAR_APPS.some((t) => t.appId === app.appId) &&
                  arr.findIndex((x) => (x.id || x.appId) === (app.id || app.appId)) === idx
              )
              .slice(0, 3)
              .map((app, idx) => {
                const wins = currentDesktopWindows.filter((w) => w.appId === app.appId);
                const active = wins.length > 0;
                const anyVisible = wins.some((w) => !w.minimized);
                return (
                  <div
                    key={`${app.id || app.appId}-${idx}`}
                    className="relative group shrink-0"
                    onMouseEnter={(e) => handleMouseEnterIcon(e, app.id || app.appId)}
                    onMouseLeave={() => { setHoveredApp(null); setHoverPos(null); }}
                  >
                    <button
                      onClick={() => handleInstalledAppClick(app.id || app.appId)}
                      className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 group ${
                        anyVisible
                          ? isLight
                            ? 'bg-slate-900/10'
                            : 'bg-white/15'
                          : isLight
                          ? 'hover:bg-slate-900/6 active:scale-95'
                          : 'hover:bg-white/10 active:scale-95'
                      }`}
                      title={app.name}
                    >
                      <Icon name={app.icon} size={22} className="transition-transform duration-150 group-hover:scale-105" />
                      {active && (
                        <span
                          className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full os-accent-bg transition-all ${
                            anyVisible ? 'w-4' : 'w-1.5 opacity-60'
                          }`}
                        />
                      )}
                    </button>

                    {/* Live Preview Card for Installed Apps */}
                    <AnimatePresence>
                      {hoveredApp === (app.id || app.appId) && hoverPos && wins.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.12 }}
                          style={{ left: hoverPos.x, transform: 'translateX(-50%)' }}
                          onMouseEnter={() => setHoveredApp(app.id || app.appId)}
                          onMouseLeave={() => { setHoveredApp(null); setHoverPos(null); }}
                          className="fixed bottom-14 z-[5500] flex items-center gap-2 p-2 rounded-xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl pointer-events-auto text-white font-sans max-w-[90vw] overflow-x-auto"
                        >
                          {wins.map((w) => (
                            <div
                              key={w.id}
                              className="w-48 flex flex-col gap-1.5 p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/40 transition group shrink-0"
                            >
                              <div className="flex items-center justify-between gap-1 px-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Icon name={app.icon} size={13} className="text-cyan-400 shrink-0" />
                                  <span className="text-[11px] font-medium text-white/90 truncate">{w.title}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeWindow(w.id);
                                    if (wins.length <= 1) {
                                      setHoveredApp(null);
                                      setHoverPos(null);
                                    }
                                  }}
                                  className="w-5 h-5 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-rose-600 transition shrink-0"
                                  title="閉じる"
                                >
                                  <Icon name="X" size={12} />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (w.minimized) restoreWindow(w.id);
                                  else focusWindow(w.id);
                                  setHoveredApp(null);
                                  setHoverPos(null);
                                }}
                                className="h-28 w-full bg-black/60 rounded border border-white/10 group-hover:border-cyan-400/30 overflow-hidden relative flex flex-col justify-between p-2 text-left transition cursor-pointer"
                              >
                                <div className="w-full h-4 bg-white/10 rounded-sm flex items-center px-1.5 gap-1 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                  <span className="text-[9px] text-white/50 truncate ml-1 font-mono">{w.title}</span>
                                </div>

                                <div className="flex-1 my-1 flex items-center justify-center">
                                  <Icon name={app.icon} size={28} className="text-white/30 group-hover:scale-110 group-hover:text-cyan-400/70 transition-all" />
                                </div>

                                <div className="text-[9px] text-white/40 font-mono truncate text-center">
                                  {w.minimized ? '最小化中 (クリックで再開)' : 'クリックでアクティブ化'}
                                </div>
                              </button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </div>

          {/* Right: Flat System Tray */}
          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            <AIAssistant />
            <div className={`h-4 w-px mx-0.5 shrink-0 ${isLight ? 'bg-slate-900/15' : 'bg-white/10'}`} />
            <button
              onClick={() => setTrayOpen((v) => !v)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition ${
                isLight
                  ? 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-900'
                  : 'bg-white/[0.05] hover:bg-white/[0.12] text-white'
              }`}
              title="System Controls"
            >
              <div className="flex items-center gap-1.5">
                <Icon name="Wifi" size={13} className={quickSettings.wifi ? 'os-accent-text' : 'opacity-40'} />
                <Icon
                  name={soundEnabled && volume > 0 ? 'Volume2' : 'VolumeX'}
                  size={13}
                  className={soundEnabled && volume > 0 ? 'os-accent-text' : 'opacity-40'}
                />
              </div>
              <div className="text-right leading-tight hidden sm:block">
                <div className="text-[11px] font-medium tabular-nums font-mono">{timeStr}</div>
                <div className="text-[9px] opacity-55">{dateStr}</div>
              </div>
            </button>
          </div>
        </div>
      </>
    )}

      {/* Instant App Search Dropdown */}
      <AnimatePresence>
        {searchFocused && (
          <motion.div
            ref={searchDropdownRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={`fixed bottom-14 left-3 z-[5200] w-64 rounded-xl backdrop-blur-2xl border p-2 overflow-hidden shadow-2xl ${
              isLight
                ? 'bg-white/95 border-slate-900/12 text-slate-900'
                : 'bg-slate-900/90 border-white/15 text-white'
            }`}
          >
            <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider opacity-45">
              Applications
            </div>
            <div className="space-y-0.5">
              {filteredSearchApps.length > 0 ? (
                filteredSearchApps.map((item) => (
                  <button
                    key={item.appId}
                    type="button"
                    onClick={() => {
                      openApp(item.appId);
                      setSearchQuery('');
                      setSearchFocused(false);
                    }}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition group ${
                      isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon name={item.appId} size={22} />
                    </div>
                    <span className="text-xs font-medium truncate">
                      {item.label}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs opacity-45">
                  該当するアプリがありません
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redesigned Liquid Glass Quick Controls Center + Live Now Playing Music Player */}
      <AnimatePresence>
        {trayOpen && (
          <>
            <div className="fixed inset-0 z-[5100]" onClick={() => setTrayOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={`fixed bottom-14 right-3 z-[5200] w-[360px] sm:w-[390px] max-w-[calc(100vw-24px)] rounded-3xl p-4 backdrop-blur-3xl border shadow-[0_24px_80px_rgba(0,0,0,0.65)] space-y-3.5 select-none ${
                isLight
                  ? 'bg-white/95 border-slate-900/15 text-slate-900'
                  : 'bg-slate-950/92 border-white/15 text-white'
              }`}
            >
              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-black tracking-wide uppercase">
                    Quick Controls Center
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTrayOpen(false);
                      lockSystem();
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                      isLight
                        ? 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-700'
                        : 'bg-white/10 hover:bg-white/20 text-white/85'
                    }`}
                    title="今すぐ画面をロック"
                  >
                    <Icon name="Lock" size={12} />
                    <span>ロック</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTrayOpen(false);
                      openApp('settings');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-[11px] text-cyan-300 font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Icon name="Settings" size={12} />
                    <span>設定</span>
                  </button>
                </div>
              </div>

              {/* LIVE NOW PLAYING MUSIC CARD (Shown prominently when music is playing or loaded) */}
              {musicState?.currentTrack ? (
                <div
                  className={`p-3.5 rounded-2xl border relative overflow-hidden transition-all ${
                    musicState.isPlaying
                      ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900/90 to-fuchsia-950/60 border-cyan-400/40 shadow-lg text-white'
                      : isLight
                      ? 'bg-slate-900/5 border-slate-900/10'
                      : 'bg-white/[0.05] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => {
                        setTrayOpen(false);
                        openApp('synth');
                      }}
                      className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/20 shadow-md cursor-pointer group"
                      style={{
                        background:
                          musicState.currentTrack.coverGradient ||
                          'linear-gradient(135deg, #06b6d4, #6366f1)',
                      }}
                    >
                      {musicState.currentTrack.artworkUrl ? (
                        <img
                          src={musicState.currentTrack.artworkUrl}
                          alt={musicState.currentTrack.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <Icon name="Music" size={20} />
                        </div>
                      )}
                      {musicState.isPlaying && (
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[8px] font-mono text-cyan-300 font-bold">
                          LIVE
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1">
                          <Icon name="Music" size={10} />
                          <span>{musicState.isPlaying ? 'NOW PLAYING' : 'PAUSED'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTrayOpen(false);
                            openApp('synth');
                          }}
                          className="text-[10px] text-cyan-300 hover:underline font-bold cursor-pointer"
                        >
                          Musicを開く ↗
                        </button>
                      </div>
                      <div className="text-xs font-black truncate mt-0.5">
                        {musicState.currentTrack.title}
                      </div>
                      <div className="text-[11px] opacity-70 truncate">
                        {musicState.currentTrack.artist}
                      </div>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => globalAudio.prev()}
                        className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                        title="前の曲"
                      >
                        <Icon name="SkipBack" size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => globalAudio.togglePlay()}
                        className="w-8 h-8 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-md transition cursor-pointer"
                        title={musicState.isPlaying ? '一時停止' : '再生'}
                      >
                        <Icon name={musicState.isPlaying ? 'Pause' : 'Play'} size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => globalAudio.next()}
                        className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                        title="次の曲"
                      >
                        <Icon name="SkipForward" size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Seek Bar */}
                  <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono opacity-85">
                    <span>
                      {Math.floor((musicState.currentTime || 0) / 60)}:
                      {Math.floor((musicState.currentTime || 0) % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, musicState.duration || musicState.currentTrack.duration || 180)}
                      value={Math.min(
                        musicState.currentTime || 0,
                        musicState.duration || musicState.currentTrack.duration || 180
                      )}
                      onChange={(e) => globalAudio.seek(Number(e.target.value))}
                      className="flex-1 h-1 accent-cyan-400 cursor-pointer"
                    />
                    <span>
                      {Math.floor(
                        (musicState.duration || musicState.currentTrack.duration || 180) / 60
                      )}
                      :
                      {Math.floor(
                        (musicState.duration || musicState.currentTrack.duration || 180) % 60
                      )
                        .toString()
                        .padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setTrayOpen(false);
                    openApp('synth');
                  }}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    isLight
                      ? 'bg-slate-900/5 hover:bg-slate-900/10 border-slate-900/10'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Icon name="Music" size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Glassium Music Player</div>
                      <div className="text-[10px] opacity-60">
                        クリックして音楽を再生 (Monochrome / Piped / Invidious)
                      </div>
                    </div>
                  </div>
                  <Icon name="Play" size={14} className="text-cyan-400" />
                </div>
              )}

              {/* Quick Toggle Tiles Grid (2x3) */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    key: 'wifi' as const,
                    label: 'Wi-Fi',
                    sub: quickSettings.wifi ? 'Connected' : 'Off',
                    icon: 'Wifi',
                  },
                  {
                    key: 'bluetooth' as const,
                    label: 'Bluetooth',
                    sub: quickSettings.bluetooth ? 'On' : 'Off',
                    icon: 'Bluetooth',
                  },
                  {
                    key: 'darkMode' as const,
                    label: 'ダークモード',
                    sub: quickSettings.darkMode ? 'Dark' : 'Light',
                    icon: 'Moon',
                  },
                  {
                    key: 'dnd' as const,
                    label: '集中モード',
                    sub: quickSettings.dnd ? 'DND On' : 'Off',
                    icon: 'BellOff',
                  },
                  {
                    key: 'liteMode' as const,
                    label: '軽量モード',
                    sub: quickSettings.liteMode ? '60FPS Eco' : 'Full GPU',
                    icon: 'Zap',
                  },
                  {
                    key: 'batterySaver' as const,
                    label: '省電力',
                    sub: quickSettings.batterySaver ? 'Active' : 'Standard',
                    icon: 'BatteryCharging',
                  },
                ].map((q) => (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => toggleQuick(q.key)}
                    className={`flex flex-col items-start gap-1 p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                      quickSettings[q.key]
                        ? 'os-accent-bg border-transparent shadow-md'
                        : isLight
                        ? 'bg-slate-900/5 border-slate-900/10 text-slate-700 hover:bg-slate-900/10'
                        : 'bg-white/[0.05] border-white/10 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    <Icon name={q.icon} size={15} />
                    <div className="min-w-0 w-full">
                      <div className="text-[11px] font-bold truncate">{q.label}</div>
                      <div className="text-[9px] opacity-75 truncate">{q.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Volume & Brightness Sliders */}
              <div
                className={`rounded-2xl p-3 border space-y-3 ${
                  isLight ? 'bg-slate-900/[0.03] border-slate-900/10' : 'bg-white/[0.04] border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="flex items-center gap-1.5 font-bold hover:opacity-80 transition cursor-pointer"
                    >
                      <Icon
                        name={soundEnabled && volume > 0 ? 'Volume2' : 'VolumeX'}
                        size={13}
                        className="os-accent-text"
                      />
                      <span>システム音量</span>
                    </button>
                    <span className="font-mono text-[11px] font-bold opacity-75">
                      {soundEnabled ? `${volume}%` : 'ミュート'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={soundEnabled ? volume : 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setVolume(val);
                      globalAudio.setVolume(val / 100);
                      if (val > 0 && !soundEnabled) setSoundEnabled(true);
                    }}
                    className="glass-slider w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Icon name="Sun" size={13} className="text-amber-400" />
                      <span>画面の明るさ</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold opacity-75">
                      {brightness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="glass-slider w-full"
                  />
                </div>
              </div>

              {/* Auto-Lock Timeout Quick Selector */}
              <div
                className={`rounded-2xl p-3 border space-y-2 ${
                  isLight ? 'bg-slate-900/[0.03] border-slate-900/10' : 'bg-white/[0.04] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold flex items-center gap-1.5">
                    <Icon name="Clock" size={12} className="text-cyan-400" />
                    <span>自動画面ロック時間</span>
                  </span>
                  <span className="font-mono text-[10px] text-cyan-400 font-bold">
                    {autoLockMinutes === 0 ? 'オフ (常時ON)' : `${autoLockMinutes}分後`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { m: 0, label: 'オフ' },
                    { m: 1, label: '1分' },
                    { m: 5, label: '5分' },
                    { m: 15, label: '15分' },
                    { m: 30, label: '30分' },
                  ].map((opt) => (
                    <button
                      key={opt.m}
                      type="button"
                      onClick={() => setAutoLockMinutes(opt.m)}
                      className={`py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        autoLockMinutes === opt.m
                          ? 'bg-cyan-400 text-slate-950 shadow'
                          : isLight
                          ? 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-700'
                          : 'bg-white/5 hover:bg-white/15 text-white/75'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Standalone Calendar Flyout Popup */}
      <AnimatePresence>
        {calendarFlyoutOpen && (
          <>
            <div className="fixed inset-0 z-[5200]" onClick={() => setCalendarFlyoutOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-3 bottom-14 z-[5300] w-80 p-4 rounded-3xl bg-slate-900/90 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] text-white select-none flex flex-col gap-3"
            >
              <div className="flex items-center justify-between pb-2">
                <div className="text-sm font-bold flex items-center gap-2">
                  <Icon name="Calendar" size={16} className="text-cyan-400" />
                  <span>{now.toLocaleDateString('ja-JP', { month: 'long', year: 'numeric' })}</span>
                </div>
                <button
                  onClick={() => setCalendarFlyoutOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>

              {/* Mini Month Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                  <div key={d} className={`font-semibold py-1 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-white/65'}`}>
                    {d}
                  </div>
                ))}
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1;
                  const isToday = day === now.getDate();
                  return (
                    <div
                      key={day}
                      className={`h-7 rounded-xl flex items-center justify-center text-xs font-medium transition ${
                        isToday
                          ? 'bg-cyan-500 text-black font-bold shadow-md'
                          : 'hover:bg-white/10 text-white/90'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
                <span className="font-mono">{timeStr}</span>
                <span className="text-cyan-300 font-medium">予定 2件</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
