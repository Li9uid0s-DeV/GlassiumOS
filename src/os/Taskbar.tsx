import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from './OSContext';
import { TASKBAR_APPS, AppId } from './types';
import { Icon } from './Icon';
import { StartMenu } from './StartMenu';
import { AIAssistant } from './AIAssistant';
import { AppLogo } from './AppLogo';

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
  { appId: 'synth', label: 'Music', keywords: 'audio synth player 音楽', icon: 'Music' },
  { appId: 'calendar', label: 'Calendar', keywords: 'date schedule tasks カレンダー', icon: 'Calendar' },
  { appId: 'weather', label: 'Weather', keywords: 'forecast temperature 天気', icon: 'CloudSun' },
  { appId: 'clock', label: 'Clock', keywords: 'time alarm timer 時計', icon: 'Clock' },
  { appId: 'ai', label: 'AI Assistant', keywords: 'gemini chat copilot アシスタント', icon: 'Sparkles' },
  { appId: 'taskmanager', label: 'Task Manager', keywords: 'processes windows cpu memory タスク', icon: 'Cpu' },
  { appId: 'appstore', label: 'App Store', keywords: 'install store ストア', icon: 'Store' },
];

export function Taskbar(_props?: TaskbarProps) {
  void _props;
  const {
    windows,
    openApp,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    quickSettings,
    toggleQuick,
    taskbarAlign,
    startOpen,
    setStartOpen,
    installedApps,
    launchInstalledApp,
    shellMode,
    volume,
    setVolume,
    soundEnabled,
    setSoundEnabled,
    activeDesktopId,
    taskViewOpen,
    setTaskViewOpen,
    toggleTaskView,
    theme,
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
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [startPos, setStartPos] = useState<{ x: number; width: number } | null>(null);

  const updateStartPos = useCallback(() => {
    if (startBtnRef.current) {
      const rect = startBtnRef.current.getBoundingClientRect();
      setStartPos({ x: rect.left, width: rect.width });
    }
  }, []);

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
  const isZorin = shellMode === 'zorin';

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
          4. SAMSUNG DEX / CHROMEOS / ZORIN SHELLS
         ============================================================== */}
      {(isDeX || isChromeOS || isZorin) && (
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
          5. GLASSIUMOS-V4.0 FLAT TASKBAR (DEFAULT)
         ============================================================== */}
      {!isXP && !isVista && !isWin10 && !isDeX && !isChromeOS && !isZorin && (
        <div
          className={`fixed bottom-0 inset-x-0 h-12 w-screen z-[5000] backdrop-blur-2xl flex items-center justify-between px-3 select-none transition-colors duration-200 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] ${
            isLight
              ? 'bg-slate-100/90 text-slate-900 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]'
              : 'bg-slate-900/80 text-white'
          }`}
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100vw', borderRadius: 0 }}
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
              title="GlassiumOS-V4.0 Start"
            >
              <AppLogo size={20} glow={startOpen} />
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
                <button
                  key={app.appId}
                  onClick={() => handleAppClick(app.appId)}
                  className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 group ${
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
                return (
                  <button
                    key={win.id}
                    onClick={() => handleAppClick(win.appId as AppId)}
                    className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 group ${
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
                  <button
                    key={`${app.id || app.appId}-${idx}`}
                    onClick={() => handleInstalledAppClick(app.id || app.appId)}
                    className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 group ${
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

      {/* Flat Quick Settings Flyout (Brightness removed as requested) */}
      <AnimatePresence>
        {trayOpen && (
          <>
            <div className="fixed inset-0 z-[5100]" onClick={() => setTrayOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`fixed bottom-14 right-3 z-[5200] w-72 max-w-[calc(100vw-24px)] rounded-xl p-4 backdrop-blur-2xl border shadow-2xl ${
                isLight
                  ? 'bg-white/95 border-slate-900/12 text-slate-900'
                  : 'bg-slate-900/90 border-white/15 text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wide">Quick Controls</span>
                <button
                  onClick={() => {
                    setTrayOpen(false);
                    openApp('settings');
                  }}
                  className="text-[11px] os-accent-text hover:underline flex items-center gap-1 transition"
                >
                  <Icon name="Settings" size={12} />
                  <span>Settings</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { key: 'wifi' as const, label: 'Wi-Fi', icon: 'Wifi' },
                  { key: 'bluetooth' as const, label: 'Bluetooth', icon: 'Bluetooth' },
                  { key: 'darkMode' as const, label: 'Dark Mode', icon: 'Moon' },
                ].map((q) => (
                  <button
                    key={q.key}
                    onClick={() => toggleQuick(q.key)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition ${
                      quickSettings[q.key]
                        ? 'os-accent-bg border-transparent'
                        : isLight
                        ? 'bg-slate-900/5 border-slate-900/10 text-slate-700 hover:bg-slate-900/10'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Icon name={q.icon} size={15} />
                    <span className="text-[10px] font-medium">{q.label}</span>
                  </button>
                ))}
              </div>

              <div
                className={`rounded-lg p-3 border ${
                  isLight ? 'bg-slate-900/[0.03] border-slate-900/10' : 'bg-white/[0.04] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="flex items-center gap-1.5 hover:opacity-80 transition"
                  >
                    <Icon
                      name={soundEnabled && volume > 0 ? 'Volume2' : 'VolumeX'}
                      size={13}
                      className="os-accent-text"
                    />
                    <span>Master Volume</span>
                  </button>
                  <span className="font-mono text-[11px] opacity-65">
                    {soundEnabled ? `${volume}%` : 'Muted'}
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
                    if (val > 0 && !soundEnabled) setSoundEnabled(true);
                  }}
                  className="glass-slider w-full"
                />
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
