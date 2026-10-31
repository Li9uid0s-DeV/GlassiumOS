import { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOS } from './OSContext';
import { WindowFrame } from './WindowFrame';
import { Taskbar } from './Taskbar';
import { NotificationCenter } from './NotificationCenter';
import { WALLPAPERS, WallpaperOrbs } from './wallpapers';
import { LiquidShader } from './LiquidShader';
import { SpaceWallpaper } from './SpaceWallpaper';
import { Live2DWallpaper } from './Live2DWallpaper';
import { LockScreen } from './LockScreen';
import { TerminalApp } from './apps/Terminal';
import { NotepadApp } from './apps/Notepad';
import { FileExplorerApp } from './apps/FileExplorer';
import { BrowserApp } from './apps/Browser';
import { SettingsApp } from './apps/Settings';
import { GameApp } from './apps/Game';
import { AppStoreApp } from './apps/AppStore';
import { SystemMonitorApp } from './apps/SystemMonitor';
import { CalendarApp } from './apps/CalendarApp';
import { WeatherApp } from './apps/Weather';
import { ClockApp } from './apps/ClockApp';
import { AIAssistantApp } from './apps/AIAssistantApp';
import { Calculator } from './apps/Calculator';
import { TaskManager } from './apps/TaskManager';
import { SynthVisualizerApp } from './apps/SynthVisualizer';
import { Icon } from './Icon';
import { AppId, TASKBAR_APPS } from './types';
import { AppLogo } from './AppLogo';

function renderApp(appId: string, payload?: unknown) {
  switch (appId) {
    case 'terminal':
      return <TerminalApp />;
    case 'notepad':
      return <NotepadApp payload={payload as { fileName?: string; content?: string }} />;
    case 'explorer':
      return <FileExplorerApp payload={payload as { folderPath?: string[] }} />;
    case 'browser':
      return <BrowserApp payload={payload as { url?: string; isImage?: boolean }} />;
    case 'settings':
      return <SettingsApp />;
    case 'game':
      return <GameApp payload={payload as { gameId?: string }} />;
    case 'appstore':
      return <AppStoreApp />;
    case 'calculator':
      return <Calculator />;
    case 'taskmanager':
      return <TaskManager />;
    case 'sysmon':
      return <SystemMonitorApp />;
    case 'calendar':
      return <CalendarApp />;
    case 'synth':
      return <SynthVisualizerApp />;
    case 'weather':
      return <WeatherApp />;
    case 'clock':
      return <ClockApp />;
    case 'ai':
      return <AIAssistantApp />;
    default:
      return <CustomAppView payload={payload as { url?: string; isCustomApp?: boolean }} />;
  }
}

class WindowErrorBoundary extends Component<
  { children: ReactNode; appTitle?: string },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: ReactNode; appTitle?: string }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Unexpected application error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Window app error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-950/90 p-6 text-center text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
            <Icon name="XCircle" size={22} />
          </div>
          <div className="text-sm font-semibold">{this.props.appTitle || 'Application'} encountered an issue</div>
          <div className="max-w-md text-xs text-white/50">{this.state.errorMsg}</div>
          <button
            onClick={() => this.setState({ hasError: false, errorMsg: '' })}
            className="mt-1 rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/15 transition"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CustomAppView({ payload }: { payload?: { url?: string; isCustomApp?: boolean; appInfo?: { url?: string; name?: string } } }) {
  const rawUrl = payload?.url || payload?.appInfo?.url;
  if (!rawUrl) {
    return <div className="flex h-full w-full items-center justify-center text-white/40 text-sm">Unable to load app.</div>;
  }
  const src = rawUrl.startsWith('/api/proxy') ? rawUrl : `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
  return (
    <div className="h-full w-full min-w-0 min-h-0 bg-zinc-950">
      <iframe
        src={src}
        className="h-full w-full border-0"
        title={payload?.appInfo?.name || 'custom app'}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}

export function Desktop() {
  const {
    windows,
    wallpaper,
    customWallpapers,
    selectedCustomId,
    liteMode,
    transparency,
    locked,
    lockSystem,
    unlockSystem,
    user,
    showWelcome,
    setWelcome,
    shellMode,
    setShellMode,
    designEngine,
    nebulaPreset,
    openApp,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    installedApps,
    launchInstalledApp,
    calendarTasks,
    dynamicIslandEvent,
    androidQuickSettings,
    toggleAndroidQuick,
    closeWindow,
    desktops,
    activeDesktopId,
    taskViewOpen,
    setTaskViewOpen,
    toggleTaskView,
    switchDesktop,
    createDesktop,
    removeDesktop,
    moveWindowToDesktop,
    desktopIconPositions,
    updateDesktopIconPosition,
    resetDesktopIconPositions,
    deskNotes,
    addDeskNote,
    updateDeskNote,
    deleteDeskNote,
    snapAllWindows5050,
  } = useOS();

  const [time, setTime] = useState(new Date());
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [draggingIcon, setDraggingIcon] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggingNote, setDraggingNote] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const customWallpaper = customWallpapers.find((c) => c.id === selectedCustomId);
  const useLive2D = wallpaper === 'live2d' && !liteMode;
  const useShader = wallpaper === 'shader' && !liteMode;
  const useSpace = wallpaper === 'space' && !liteMode;
  const shaderOpacity = transparency / 100;

  const activeDesktopWindows = windows.filter(
    (w) => !w.desktopId || w.desktopId === activeDesktopId
  );

  const handleAppClick = (appId: string) => {
    if (appId === 'recycle') {
      openApp('explorer', { payload: { folderPath: ['Recycle Bin'] } });
      return;
    }
    const wins = activeDesktopWindows.filter((w) => w.appId === appId);
    if (wins.length === 0) {
      openApp(appId as AppId);
    } else {
      const top = wins.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
      if (top.minimized) restoreWindow(top.id);
      else {
        const visibleWins = activeDesktopWindows.filter((w) => !w.minimized);
        const isTopmost =
          visibleWins.length > 0 &&
          visibleWins.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id === top.id;
        if (isTopmost) minimizeWindow(top.id);
        else focusWindow(top.id);
      }
    }
  };

  const handleIconPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    appId: string,
    initialX: number,
    initialY: number
  ) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    setSelectedIconId(appId);
    setContextMenu(null);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let moved = false;
    let latestX = initialX;
    let latestY = initialY;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      if (!moved && Math.hypot(dx, dy) > 6) {
        moved = true;
      }
      if (moved) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        latestX = Math.max(8, Math.min(vw - 88, initialX + dx));
        latestY = Math.max(8, Math.min(vh - 132, initialY + dy));
        setDraggingIcon({ id: appId, x: latestX, y: latestY });
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDraggingIcon(null);
      if (moved) {
        updateDesktopIconPosition(appId, latestX, latestY);
      } else {
        handleAppClick(appId);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleNotePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    noteId: string,
    initialX: number,
    initialY: number
  ) => {
    if ((e.target as HTMLElement).closest('button, textarea')) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    let curX = initialX;
    let curY = initialY;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      curX = Math.max(12, Math.min(window.innerWidth - 220, initialX + dx));
      curY = Math.max(12, Math.min(window.innerHeight - 180, initialY + dy));
      setDraggingNote({ id: noteId, x: curX, y: curY });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDraggingNote(null);
      updateDeskNote(noteId, { x: curX, y: curY });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const DESKTOP_APPS_LIST = [
    { id: 'browser', label: 'Browser', icon: 'browser' },
    { id: 'notepad', label: 'Editor', icon: 'notepad' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'calculator', label: 'Calculator', icon: 'calculator' },
    { id: 'explorer', label: 'Files', icon: 'explorer' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'game', label: 'Games', icon: 'game' },
    { id: 'synth', label: 'Music', icon: 'synth' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    { id: 'weather', label: 'Weather', icon: 'weather' },
    { id: 'clock', label: 'Clock', icon: 'clock' },
    { id: 'ai', label: 'AI Assistant', icon: 'ai' },
    { id: 'sysmon', label: 'Monitor', icon: 'sysmon' },
    { id: 'taskmanager', label: 'Task Manager', icon: 'taskmanager' },
    { id: 'appstore', label: 'App Store', icon: 'appstore' },
    { id: 'recycle', label: 'Trash', icon: 'recycle' },
  ];

  return (
    <div
      className={`relative h-full w-full overflow-hidden select-none engine-${designEngine} ${liteMode ? 'lite-mode' : ''}`}
      onPointerDown={() => {
        setSelectedIconId(null);
        setContextMenu(null);
      }}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('.liquid-glass-window')) return;
        e.preventDefault();
        const x = Math.min(e.clientX, window.innerWidth - 240);
        const y = Math.min(e.clientY, window.innerHeight - 280);
        setContextMenu({ x, y });
      }}
    >
      {/* Base wallpaper gradient */}
      <div
        className="absolute inset-0 animated-gradient"
        style={{ background: (WALLPAPERS[wallpaper] ?? WALLPAPERS.live2d).style }}
      />

      {/* Custom wallpaper image overlay */}
      {customWallpaper && (
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundImage: `url(${customWallpaper.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      )}

      {/* 2D Interactive Aurora Silk Live Wallpaper (Default on initial startup) */}
      {useLive2D && !customWallpaper && <Live2DWallpaper lite={false} />}

      {/* 3D Black Hole Raymarching Space live wallpaper */}
      {useSpace && !customWallpaper && <SpaceWallpaper lite={false} preset={nebulaPreset} />}

      {/* WebGL liquid shader overlay */}
      {useShader && !customWallpaper && <LiquidShader lite={false} opacity={shaderOpacity} />}

      {/* Floating orbs */}
      {!liteMode && !useLive2D && !useShader && !useSpace && !customWallpaper && <WallpaperOrbs />}

      {/* ========================================================
          1. MAC DESKTOP SHELL: Top Menu Bar + Magnified Bottom Dock
         ======================================================== */}
      {shellMode === 'mac' && (
        <>
          {/* Mac Top Global Bar */}
          <div className="fixed top-0 inset-x-0 h-7 bg-black/40 backdrop-blur-xl border-b border-white/10 z-40 px-4 flex items-center justify-between text-xs text-white/90">
            <div className="flex items-center gap-4">
              <div className="cursor-pointer hover:opacity-80" onClick={() => openApp('settings')}>
                <AppLogo size={16} />
              </div>
              <span className="font-bold tracking-tight">GlassiumOS-V4.0</span>
              <span className="text-white/60 hover:text-white cursor-pointer" onClick={() => openApp('explorer')}>Files</span>
              <span className="text-white/60 hover:text-white cursor-pointer" onClick={() => openApp('settings')}>Settings</span>
              <span className="text-white/60 hover:text-white cursor-pointer" onClick={() => setShellMode('windows')}>View</span>
              <span className="text-white/60 hover:text-white cursor-pointer" onClick={() => openApp('terminal')}>Terminal</span>
            </div>

            <div className="flex items-center gap-3 font-medium text-[11px]">
              <Icon name="Wifi" size={13} />
              <Icon name="Battery" size={13} />
              <button
                onClick={() => setNotifCenterOpen(!notifCenterOpen)}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-white/10"
              >
                <Icon name="Bell" size={12} />
                <span className="tabular-nums font-mono">{timeStr}</span>
              </button>
            </div>
          </div>

          {/* Mac Magnified Bottom Dock */}
          <div className="fixed bottom-3 inset-x-0 flex justify-center z-40 pointer-events-none">
            <div className="liquid-glass-card p-2 rounded-2xl flex items-center gap-2 pointer-events-auto shadow-2xl">
              {TASKBAR_APPS.map((app) => {
                const wins = windows.filter((w) => w.appId === app.appId);
                const active = wins.length > 0;
                return (
                  <button
                    key={app.appId}
                    onClick={() => handleAppClick(app.appId)}
                    className="mac-dock-item relative h-11 w-11 rounded-xl glass-panel flex items-center justify-center text-white hover:border-orange-400"
                    title={app.label}
                  >
                    <Icon name={app.icon} size={22} className="text-white" />
                    {active && <span className="app-active-pip" />}
                  </button>
                );
              })}

              <button
                onClick={() => handleAppClick('calculator')}
                className="mac-dock-item relative h-11 w-11 rounded-xl glass-panel flex items-center justify-center text-white"
                title="Calculator Pro"
              >
                <Icon name="Calculator" size={22} className="text-amber-400" />
              </button>

              <button
                onClick={() => handleAppClick('taskmanager')}
                className="mac-dock-item relative h-11 w-11 rounded-xl glass-panel flex items-center justify-center text-white"
                title="Task Manager"
              >
                <Icon name="Cpu" size={22} className="text-sky-400" />
              </button>

              {installedApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => launchInstalledApp(app.id)}
                  className="mac-dock-item relative h-11 w-11 rounded-xl glass-panel flex items-center justify-center text-white hover:border-orange-400"
                  title={app.name}
                >
                  <Icon name={app.icon} size={22} className="text-white" />
                  <span className="app-active-pip" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          2. UBUNTU LINUX SHELL: Left Vertical Launcher + Top Activity Bar
         ======================================================== */}
      {shellMode === 'ubuntu' && (
        <>
          {/* Top Activity Bar */}
          <div className="fixed top-0 inset-x-0 h-7 bg-slate-950/80 backdrop-blur-md border-b border-white/10 z-40 px-3 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-cyan-300 cursor-pointer" onClick={() => openApp('terminal')}>Activities</span>
              <span className="text-white/60">GlassiumOS-V4.0</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px]">{dateStr} {timeStr}</span>
              <button onClick={() => setNotifCenterOpen(!notifCenterOpen)} className="p-1 hover:bg-white/10 rounded">
                <Icon name="Bell" size={13} />
              </button>
              <button onClick={lockSystem} className="p-1 hover:bg-white/10 rounded" title="Power / Lock">
                <Icon name="Power" size={13} className="text-rose-400" />
              </button>
            </div>
          </div>

          {/* Left Vertical Launcher */}
          <div className="fixed left-0 top-7 bottom-0 w-16 bg-black/60 backdrop-blur-2xl border-r border-white/10 z-40 flex flex-col items-center py-3 justify-between">
            <div className="flex flex-col items-center gap-2 w-full">
              <button
                onClick={() => openApp('settings')}
                className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/40 mb-2"
                title="Ubuntu Grid"
              >
                <Icon name="SlidersHorizontal" size={20} />
              </button>

              {TASKBAR_APPS.map((app) => {
                const wins = windows.filter((w) => w.appId === app.appId);
                const active = wins.length > 0;
                return (
                  <button
                    key={app.appId}
                    onClick={() => handleAppClick(app.appId)}
                    className={`relative h-11 w-11 rounded-xl flex items-center justify-center transition ${
                      active ? 'bg-white/20 border-l-2 border-orange-400' : 'hover:bg-white/10'
                    }`}
                    title={app.label}
                  >
                    <Icon name={app.icon} size={20} className="text-white" />
                  </button>
                );
              })}

              <button
                onClick={() => handleAppClick('calculator')}
                className="relative h-11 w-11 rounded-xl flex items-center justify-center hover:bg-white/10 text-amber-400"
                title="Calculator"
              >
                <Icon name="Calculator" size={20} />
              </button>

              <button
                onClick={() => handleAppClick('taskmanager')}
                className="relative h-11 w-11 rounded-xl flex items-center justify-center hover:bg-white/10 text-sky-400"
                title="Task Manager"
              >
                <Icon name="Cpu" size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button onClick={() => setShellMode('windows')} className="p-2 text-white/60 hover:text-white" title="Switch to Windows 11">
                <Icon name="LayoutGrid" size={16} />
              </button>
              <button onClick={lockSystem} className="p-2 text-white/60 hover:text-white" title="Lock">
                <Icon name="Lock" size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          3. ANDROID SHELL: Top Status Bar + Material You App Grid + Bottom Nav Pill
         ======================================================== */}
      {shellMode === 'android' && (
        <div className="fixed inset-0 z-30 flex flex-col justify-between bg-black/40 backdrop-blur-md select-none p-4">
          {/* Android Status Bar */}
          <div className="flex items-center justify-between text-xs text-white px-2">
            <span className="font-semibold">{timeStr}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-400">5G</span>
              <Icon name="Wifi" size={14} />
              <Icon name="BatteryCharging" size={14} className="text-emerald-400" />
            </div>
          </div>

          {/* Android Google Search Pill */}
          <div
            onClick={() => openApp('browser')}
            className="mx-auto mt-3 flex w-full max-w-md cursor-pointer items-center justify-between rounded-full bg-white/10 px-4 py-2.5 backdrop-blur-xl ring-1 ring-white/15 hover:bg-white/15"
          >
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Icon name="Search" size={15} className="text-sky-400" />
              <span>Search LiquidOS or type URL...</span>
            </div>
            <Icon name="Mic" size={15} className="text-white/60" />
          </div>

          {/* Android Quick Settings Pill Row */}
          <div className="mx-auto mt-2 flex w-full max-w-md items-center justify-between gap-1.5 px-1">
            <button
              onClick={() => toggleAndroidQuick('wifi')}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-medium flex items-center justify-center gap-1 transition ${
                androidQuickSettings.wifi ? 'bg-sky-500/30 text-sky-300 ring-1 ring-sky-400/40' : 'bg-white/5 text-white/50'
              }`}
            >
              <Icon name="Wifi" size={12} />
              <span>Wi-Fi</span>
            </button>
            <button
              onClick={() => toggleAndroidQuick('bluetooth')}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-medium flex items-center justify-center gap-1 transition ${
                androidQuickSettings.bluetooth ? 'bg-sky-500/30 text-sky-300 ring-1 ring-sky-400/40' : 'bg-white/5 text-white/50'
              }`}
            >
              <Icon name="Bluetooth" size={12} />
              <span>BT</span>
            </button>
            <button
              onClick={() => toggleAndroidQuick('flashlight')}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-medium flex items-center justify-center gap-1 transition ${
                androidQuickSettings.flashlight ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-400/40' : 'bg-white/5 text-white/50'
              }`}
            >
              <Icon name="Flashlight" size={12} />
              <span>Torch</span>
            </button>
            <button
              onClick={() => toggleAndroidQuick('doNotDisturb')}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-medium flex items-center justify-center gap-1 transition ${
                androidQuickSettings.doNotDisturb ? 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-400/40' : 'bg-white/5 text-white/50'
              }`}
            >
              <Icon name="Moon" size={12} />
              <span>DND</span>
            </button>
          </div>

          {/* Android Material You App Grid */}
          <div className="my-auto grid grid-cols-4 sm:grid-cols-5 gap-4 max-w-xl mx-auto w-full py-4">
            {DESKTOP_APPS_LIST.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAppClick(item.id as AppId)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition active:scale-90 hover:bg-white/10"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-purple-500/30 flex items-center justify-center ring-1 ring-white/20 shadow-lg shadow-sky-500/10">
                  <Icon name={item.icon} size={26} className="text-sky-300" />
                </div>
                <span className="text-[11px] font-medium text-white/90 text-center truncate max-w-[70px]">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Android Bottom Navigation Gesture Bar */}
          <div className="flex items-center justify-center gap-12 pb-2">
            <button onClick={() => setShellMode('windows')} className="p-2 text-white/70 hover:text-white" title="Back / Desktop">
              <Icon name="ChevronLeft" size={20} />
            </button>
            <button onClick={() => setNotifCenterOpen(true)} className="h-1.5 w-32 rounded-full bg-white/60 hover:bg-white transition" title="Home Bar" />
            <button onClick={() => openApp('taskmanager')} className="p-2 text-white/70 hover:text-white" title="Recent Apps">
              <Icon name="Square" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          4. iOS SPRINGBOARD SHELL: Dynamic Island + 4x6 App Grid + Home Bar
         ======================================================== */}
      {shellMode === 'ios' && (
        <div className="fixed inset-0 z-30 flex flex-col justify-between bg-black/40 backdrop-blur-md select-none p-4">
          {/* iOS Dynamic Island Status Bar */}
          <div className="flex items-center justify-between text-xs text-white px-3">
            <span className="font-semibold">{timeStr}</span>
            {/* Dynamic Island Pill */}
            <div
              onClick={() => setNotifCenterOpen(!notifCenterOpen)}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-black/90 px-4 py-1.5 text-white ring-1 ring-white/25 shadow-2xl hover:scale-105 transition"
            >
              <span className={`h-2 w-2 rounded-full ${dynamicIslandEvent ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              <span className="text-[11px] font-medium font-sans">
                {dynamicIslandEvent ? `${dynamicIslandEvent.title}${dynamicIslandEvent.subtitle ? ` · ${dynamicIslandEvent.subtitle}` : ''}` : 'LiquidOS v4.0.0 Active'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="Wifi" size={13} />
              <Icon name="Battery" size={13} />
            </div>
          </div>

          {/* iOS SpringBoard Grid */}
          <div className="my-auto grid grid-cols-4 sm:grid-cols-4 gap-4 max-w-sm mx-auto w-full py-4">
            {DESKTOP_APPS_LIST.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAppClick(item.id as AppId)}
                className="flex flex-col items-center gap-1.5 p-1 rounded-2xl transition active:scale-85 hover:opacity-80"
              >
                <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-xl flex items-center justify-center ring-1 ring-white/20 shadow-xl">
                  <Icon name={item.icon} size={26} className="text-white" />
                </div>
                <span className="text-[10px] font-medium text-white/90 text-center truncate max-w-[65px]">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* iOS Bottom Dock */}
          <div className="mx-auto w-full max-w-sm rounded-3xl bg-white/10 backdrop-blur-2xl p-2.5 flex items-center justify-around ring-1 ring-white/15 shadow-2xl">
            <button onClick={() => openApp('browser')} className="h-12 w-12 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-md">
              <Icon name="Globe" size={24} />
            </button>
            <button onClick={() => openApp('notepad')} className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md">
              <Icon name="FileText" size={24} />
            </button>
            <button onClick={() => openApp('terminal')} className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-md">
              <Icon name="SquareTerminal" size={24} />
            </button>
            <button onClick={() => openApp('settings')} className="h-12 w-12 rounded-xl bg-slate-600 flex items-center justify-center text-white shadow-md">
              <Icon name="Settings" size={24} />
            </button>
          </div>

          {/* iOS Bottom Home Bar */}
          <div className="flex justify-center pt-2">
            <div
              onClick={() => setShellMode('windows')}
              className="h-1 w-36 rounded-full bg-white/70 hover:bg-white cursor-pointer transition"
              title="Swipe Up to Switch Shell"
            />
          </div>
        </div>
      )}

      {/* ========================================================
          5. AUTHENTIC WINDOWS 8 METRO START SCREEN (FLAT LIVE TILES)
         ======================================================== */}
      {(shellMode === 'metro' || shellMode === 'windows8') && (
        <div className="fixed inset-0 z-30 p-6 sm:p-10 overflow-x-auto overflow-y-auto flex flex-col justify-between bg-[#001f3f]/85 backdrop-blur-2xl select-none font-sans">
          {/* Windows 8 Top Header */}
          <div className="flex items-center justify-between shrink-0 mb-6 max-w-7xl w-full mx-auto">
            <div className="flex items-center gap-4">
              <span className="text-3xl sm:text-4xl font-light text-white tracking-wide">Start</span>
              <span className="text-xs px-2.5 py-1 rounded bg-[#00aba9]/30 text-[#00aba9] font-mono border border-[#00aba9]/40 font-bold">
                Windows 8.1 Metro
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShellMode('windows')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs text-white font-medium flex items-center gap-2 transition active:scale-95 border border-white/10"
              >
                <Icon name="Monitor" size={14} className="text-cyan-300" />
                <span>Desktop Mode</span>
              </button>

              <div className="flex items-center gap-2 pl-3 border-l border-white/20">
                <div className="w-8 h-8 rounded-full bg-[#0050ef] flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.[0] || 'U'}
                </div>
                <span className="text-xs text-white/90 font-medium hidden sm:inline">{user?.name || 'Administrator'}</span>
              </div>
            </div>
          </div>

          {/* Windows 8 Live Tiles Groups (Horizontally & Vertically Scrollable) */}
          <div className="my-auto max-w-7xl w-full mx-auto py-2">
            <div
              className="flex gap-8 overflow-x-auto pb-4 pt-1 touch-pan-x scrollbar-thin scroll-smooth"
              onWheel={(e) => {
                if (e.deltaY) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              {/* GROUP 1: Productivity & AI */}
              <div className="shrink-0 space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-white/60 mb-2 pl-1">Productivity & AI</div>
                <div className="grid grid-cols-2 gap-2.5 w-72 sm:w-80">
                  {/* AI Copilot Pro (Wide Tile) */}
                  <div
                    onClick={() => { openApp('ai'); }}
                    className="col-span-2 h-28 bg-[#0050ef] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start">
                      <Icon name="Bot" size={26} className="text-white group-hover:scale-110 transition" />
                      <span className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 uppercase tracking-wider">Gemini 3.8</span>
                    </div>
                    <div>
                      <div className="text-base font-bold leading-tight">Liquid Copilot AI Studio</div>
                      <div className="text-[11px] text-white/80">Autonomous OS Assistant</div>
                    </div>
                  </div>

                  {/* Liquid Browser */}
                  <div
                    onClick={() => { openApp('browser'); }}
                    className="h-28 bg-[#00aba9] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="Globe" size={24} className="group-hover:scale-110 transition" />
                    <span className="text-xs font-bold">Browser</span>
                  </div>

                  {/* File Explorer */}
                  <div
                    onClick={() => { openApp('explorer'); }}
                    className="h-28 bg-[#f0a30a] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="FolderOpen" size={24} className="group-hover:scale-110 transition" />
                    <span className="text-xs font-bold">File Explorer</span>
                  </div>
                </div>
              </div>

              {/* GROUP 2: Orbital Glance & Alarms */}
              <div className="shrink-0 space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-white/60 mb-2 pl-1">Glance & Time</div>
                <div className="grid grid-cols-2 gap-2.5 w-72 sm:w-80">
                  {/* Weather Live Tile (Wide) */}
                  <div
                    onClick={() => { openApp('weather'); }}
                    className="col-span-2 h-28 bg-[#1ba1e2] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <div className="flex justify-between items-start">
                      <Icon name="CloudSun" size={28} className="text-white" />
                      <div className="text-right">
                        <span className="text-2xl font-light font-mono">21°C</span>
                        <div className="text-[10px] text-white/80">Tokyo · Sunny</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold flex justify-between items-center">
                      <span>Cosmic Weather</span>
                      <span className="text-[10px] font-mono opacity-80">H:24° L:15°</span>
                    </div>
                  </div>

                  {/* Clock & Alarms */}
                  <div
                    onClick={() => { openApp('clock'); }}
                    className="h-28 bg-[#7158e2] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="Clock" size={24} />
                    <div>
                      <div className="text-xs font-bold">Clock & Alarm</div>
                      <div className="text-[10px] font-mono opacity-80">{timeStr}</div>
                    </div>
                  </div>

                  {/* Calendar & Tasks */}
                  <div
                    onClick={() => { openApp('calendar'); }}
                    className="h-28 bg-[#00a300] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="Calendar" size={24} />
                    <div>
                      <div className="text-xs font-bold">Calendar</div>
                      <div className="text-[10px] opacity-80">{calendarTasks.length} Tasks</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GROUP 3: Gaming & Audio */}
              <div className="shrink-0 space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-white/60 mb-2 pl-1">Games & Media</div>
                <div className="grid grid-cols-2 gap-2.5 w-72 sm:w-80">
                  {/* 3D Cosmic Velocity (Wide Tile) */}
                  <div
                    onClick={() => { openApp('game'); }}
                    className="col-span-2 h-28 bg-[#d80073] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <div className="flex justify-between items-start">
                      <Icon name="Flame" size={26} className="text-white group-hover:rotate-12 transition" />
                      <span className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 uppercase tracking-wider">3D Racer</span>
                    </div>
                    <div>
                      <div className="text-base font-bold">Cosmic Velocity 3D</div>
                      <div className="text-[11px] text-white/80">Touch & Keyboard Glider</div>
                    </div>
                  </div>

                  {/* Monochrome Music */}
                  <div
                    onClick={() => { openApp('synth'); }}
                    className="h-28 bg-[#e67e22] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="Music" size={24} />
                    <span className="text-xs font-bold">Monochrome Music</span>
                  </div>

                  {/* App Store */}
                  <div
                    onClick={() => { openApp('appstore'); }}
                    className="h-28 bg-[#0050ef] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="Store" size={24} />
                    <span className="text-xs font-bold">Store</span>
                  </div>
                </div>
              </div>

              {/* GROUP 4: System Tools */}
              <div className="shrink-0 space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-white/60 mb-2 pl-1">System & Tools</div>
                <div className="grid grid-cols-2 gap-2.5 w-72 sm:w-80">
                  {/* Task Manager */}
                  <div
                    onClick={() => { openApp('taskmanager'); }}
                    className="h-28 bg-[#2d89ef] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="Cpu" size={24} />
                    <span className="text-xs font-bold">Task Manager</span>
                  </div>

                  {/* Calculator */}
                  <div
                    onClick={() => { openApp('calculator'); }}
                    className="h-28 bg-[#a200ff] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="Calculator" size={24} />
                    <span className="text-xs font-bold">Calculator Pro</span>
                  </div>

                  {/* Terminal */}
                  <div
                    onClick={() => { openApp('terminal'); }}
                    className="h-28 bg-[#333333] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="SquareTerminal" size={24} />
                    <span className="text-xs font-bold">Terminal</span>
                  </div>

                  {/* Settings */}
                  <div
                    onClick={() => { openApp('settings'); }}
                    className="h-28 bg-[#00a300] hover:brightness-110 active:scale-98 p-3 flex flex-col justify-between text-white cursor-pointer transition shadow-lg group"
                  >
                    <Icon name="Settings" size={24} />
                    <span className="text-xs font-bold">Settings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Windows 8 All Apps Section (Launch ANY app directly) */}
          <div className="border-t border-white/10 pt-4 max-w-7xl w-full mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold tracking-widest text-white/50 flex items-center gap-1.5">
                <Icon name="ChevronDown" size={14} className="text-cyan-400" /> All Apps
              </span>
              <span className="text-[11px] text-white/40 font-mono">Tap any icon to launch</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {DESKTOP_APPS_LIST.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAppClick(item.id as AppId)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded hover:bg-white/10 active:scale-95 transition shrink-0 w-20"
                >
                  <div className="w-10 h-10 bg-white/15 flex items-center justify-center text-white shadow">
                    <Icon name={item.icon} size={20} className="text-cyan-300" />
                  </div>
                  <span className="text-[10px] text-white/80 font-medium truncate max-w-full">
                    {item.label}
                  </span>
                </button>
              ))}

              {installedApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => launchInstalledApp(app.id)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded hover:bg-white/10 active:scale-95 transition shrink-0 w-20"
                >
                  <div className="w-10 h-10 bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-white shadow">
                    <Icon name={app.icon} size={20} className="text-orange-300" />
                  </div>
                  <span className="text-[10px] text-white/80 font-medium truncate max-w-full">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-white/40 font-mono shrink-0 pt-3 max-w-7xl w-full mx-auto border-t border-white/5">
            <div className="flex items-center gap-2">
              <AppLogo size={16} />
              <span>LiquidOS-4.1.0-Beta Metro Live</span>
            </div>
            <div>Swipe horizontally or tap to launch tiles</div>
          </div>
        </div>
      )}

      {/* ========================================================
          FREE-DRAGGABLE DESKTOP ICONS & DESK WORKSPACE CONTROLS
         ======================================================== */}
      {['windows', 'windows11', 'windows10', 'vista', 'xp', 'dex', 'chromeos', 'zorin'].includes(shellMode) && (
        <>
          <div className="absolute inset-0 z-10 pointer-events-none">
            {DESKTOP_APPS_LIST.map((item, idx) => {
              const savedPos = desktopIconPositions[item.id] ?? {
                x: 16 + Math.floor(idx / 6) * 92,
                y: 16 + (idx % 6) * 94,
              };
              const isDraggingThis = draggingIcon?.id === item.id;
              const x = isDraggingThis ? draggingIcon.x : savedPos.x;
              const y = isDraggingThis ? draggingIcon.y : savedPos.y;
              const isSelected = selectedIconId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onPointerDown={(e) => handleIconPointerDown(e, item.id, savedPos.x, savedPos.y)}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    zIndex: isDraggingThis ? 50 : isSelected ? 20 : 10,
                    touchAction: 'none',
                  }}
                  className={`pointer-events-auto flex flex-col items-center gap-1.5 w-[84px] py-2 px-1.5 rounded-2xl text-white/95 cursor-grab active:cursor-grabbing transition-shadow duration-150 group ${
                    isDraggingThis
                      ? 'bg-slate-900/65 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_16px_36px_rgba(0,0,0,0.55)] scale-105 ring-1 ring-cyan-400/50'
                      : isSelected
                      ? 'bg-slate-900/45 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)] ring-1 ring-white/25'
                      : 'hover:bg-slate-900/40 hover:backdrop-blur-md hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.35)]'
                  }`}
                  title={`${item.label} (ドラッグで自由に移動 / クリックで起動)`}
                >
                  <div className="w-11 h-11 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-150 shrink-0 pointer-events-none">
                    <Icon name={item.id} size={38} />
                  </div>
                  <span
                    className={`text-[11px] font-medium text-center truncate max-w-full px-1 leading-tight select-none pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${
                      shellMode === 'xp' ? 'text-white font-bold' : 'text-white/95 group-hover:text-white'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* Desk Sticky Notes ("デスク付箋") */}
            {deskNotes.map((note) => {
              const isDraggingThis = draggingNote?.id === note.id;
              const nx = isDraggingThis ? draggingNote.x : note.x;
              const ny = isDraggingThis ? draggingNote.y : note.y;
              const colorMap: Record<typeof note.color, string> = {
                cyan: 'from-cyan-500/25 to-sky-900/40 border-cyan-400/30',
                violet: 'from-violet-500/25 to-purple-900/40 border-violet-400/30',
                amber: 'from-amber-500/25 to-orange-900/40 border-amber-400/30',
                emerald: 'from-emerald-500/25 to-teal-900/40 border-emerald-400/30',
                rose: 'from-rose-500/25 to-pink-900/40 border-rose-400/30',
              };
              return (
                <div
                  key={note.id}
                  onPointerDown={(e) => handleNotePointerDown(e, note.id, note.x, note.y)}
                  style={{
                    position: 'absolute',
                    left: nx,
                    top: ny,
                    zIndex: isDraggingThis ? 45 : 15,
                    touchAction: 'none',
                  }}
                  className={`pointer-events-auto w-56 rounded-2xl bg-gradient-to-br ${colorMap[note.color]} backdrop-blur-xl border shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_40px_rgba(0,0,0,0.45)] p-3 flex flex-col gap-2`}
                >
                  <div className="flex items-center justify-between cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-1.5">
                      {(['cyan', 'violet', 'amber', 'emerald', 'rose'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateDeskNote(note.id, { color: c })}
                          className={`w-3 h-3 rounded-full border border-white/40 transition ${
                            c === 'cyan'
                              ? 'bg-cyan-400'
                              : c === 'violet'
                              ? 'bg-violet-400'
                              : c === 'amber'
                              ? 'bg-amber-400'
                              : c === 'emerald'
                              ? 'bg-emerald-400'
                              : 'bg-rose-400'
                          } ${note.color === c ? 'scale-125 ring-1 ring-white' : 'opacity-60 hover:opacity-100'}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteDeskNote(note.id)}
                      className="text-white/50 hover:text-rose-300 transition p-0.5"
                      title="付箋を削除"
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </div>
                  <textarea
                    value={note.text}
                    onChange={(e) => updateDeskNote(note.id, { text: e.target.value })}
                    rows={4}
                    className="w-full bg-transparent border-0 outline-none resize-none text-xs text-white/95 placeholder:text-white/40 leading-relaxed select-text"
                    placeholder="メモを入力..."
                  />
                </div>
              );
            })}
          </div>

          {/* Top-Right Subtle 2.5D Desk Workspace Pill */}
          <div className="fixed top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-900/45 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_24px_rgba(0,0,0,0.4)] text-xs text-white/90 pointer-events-auto">
            <button
              type="button"
              onClick={toggleTaskView}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-white/10 transition"
              title="仮想デスクトップ / タスクビュー (Desk View)"
            >
              <Icon name="LayoutGrid" size={13} className="text-cyan-300" />
              <span className="font-medium">
                {desktops.find((d) => d.id === activeDesktopId)?.name || 'デスクトップ 1'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 text-white/70 font-mono">
                {activeDesktopWindows.length}
              </span>
            </button>
            <div className="h-3.5 w-px bg-white/15" />
            <button
              type="button"
              onClick={addDeskNote}
              className="p-1 rounded-xl hover:bg-white/10 text-white/75 hover:text-white transition"
              title="デスク付箋を追加"
            >
              <Icon name="Plus" size={13} />
            </button>
            <button
              type="button"
              onClick={() => resetDesktopIconPositions(false)}
              className="p-1 rounded-xl hover:bg-white/10 text-white/75 hover:text-white transition"
              title="デスクトップアイコンを自動整列"
            >
              <Icon name="RefreshCw" size={12} />
            </button>
          </div>
        </>
      )}

      {/* Desktop Right-Click Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-56 rounded-2xl bg-slate-900/80 backdrop-blur-2xl border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_20px_50px_rgba(0,0,0,0.65)] p-1.5 text-xs text-white/90"
          >
            <button
              type="button"
              onClick={() => {
                resetDesktopIconPositions(false);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
            >
              <Icon name="LayoutGrid" size={14} className="text-cyan-300" />
              <span>アイコンを自動整列</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetDesktopIconPositions(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
            >
              <Icon name="Grid3x3" size={14} className="text-violet-300" />
              <span>アイコンをグリッドに揃える</span>
            </button>
            <div className="my-1 border-t border-white/10" />
            <button
              type="button"
              onClick={() => {
                addDeskNote();
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
            >
              <Icon name="FileText" size={14} className="text-amber-300" />
              <span>デスク付箋を追加</span>
            </button>
            <button
              type="button"
              onClick={() => {
                toggleTaskView();
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
            >
              <Icon name="Monitor" size={14} className="text-emerald-300" />
              <span>仮想デスクトップ / タスクビュー</span>
            </button>
            <button
              type="button"
              onClick={() => {
                snapAllWindows5050();
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
            >
              <Icon name="Columns" size={14} className="text-sky-300" />
              <span>ウィンドウを左右に並べる</span>
            </button>
            <div className="my-1 border-t border-white/10" />
            <button
              type="button"
              onClick={() => {
                openApp('ai');
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
            >
              <Icon name="Sparkles" size={14} className="text-fuchsia-300" />
              <span>AIアシスタントを開く</span>
            </button>
            <button
              type="button"
              onClick={() => {
                openApp('settings');
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
            >
              <Icon name="Settings" size={14} className="text-white/70" />
              <span>ディスプレイとテーマ設定</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          WINDOWS VISTA SIDEBAR WITH LIVE GADGETS (AERO GLASS)
         ======================================================== */}
      {shellMode === 'vista' && (
        <div className="hidden lg:flex fixed right-0 top-0 bottom-10 w-44 z-20 flex-col items-center p-3 gap-4 bg-gradient-to-l from-slate-950/70 to-transparent border-l border-sky-400/20 backdrop-blur-md pointer-events-auto">
          {/* Vista Gadget 1: Analog Clock */}
          <div className="w-36 h-36 rounded-full bg-slate-900/80 border-2 border-sky-400/50 shadow-2xl relative flex items-center justify-center p-2 ring-2 ring-white/10">
            {/* Clock Face Notches */}
            <div className="absolute inset-2 rounded-full border border-sky-400/20 flex items-center justify-center">
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-0.5 h-2 bg-sky-300/60"
                  style={{
                    transform: `rotate(${deg}deg) translateY(-54px)`,
                  }}
                />
              ))}
            </div>

            {/* Hour hand */}
            <div
              className="absolute w-1 h-9 bg-white rounded-full origin-bottom"
              style={{
                transform: `rotate(${(time.getHours() % 12 + time.getMinutes() / 60) * 30}deg) translateY(-50%)`,
                boxShadow: '0 0 4px rgba(0,0,0,0.8)',
              }}
            />

            {/* Minute hand */}
            <div
              className="absolute w-0.5 h-12 bg-sky-200 rounded-full origin-bottom"
              style={{
                transform: `rotate(${(time.getMinutes() + time.getSeconds() / 60) * 6}deg) translateY(-50%)`,
                boxShadow: '0 0 4px rgba(0,0,0,0.8)',
              }}
            />

            {/* Second hand */}
            <div
              className="absolute w-0.5 h-14 bg-orange-500 rounded-full origin-bottom"
              style={{
                transform: `rotate(${time.getSeconds() * 6}deg) translateY(-40%)`,
              }}
            />

            {/* Center Cap */}
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400 border border-white z-10 shadow" />
            <div className="absolute bottom-6 text-[8px] font-mono text-sky-300/80 uppercase tracking-widest">
              VISTA
            </div>
          </div>

          {/* Vista Gadget 2: Dual CPU & RAM Meter */}
          <div className="w-36 rounded-2xl bg-slate-900/80 border border-sky-400/30 p-2.5 flex flex-col gap-2 shadow-xl">
            <div className="flex items-center justify-between text-[10px] text-sky-300 font-semibold uppercase tracking-wider">
              <span>CPU Meter</span>
              <Icon name="Activity" size={12} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              {/* CPU dial */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-sky-400/40 relative flex items-center justify-center bg-black/40">
                  <div
                    className="absolute w-0.5 h-5 bg-sky-400 origin-bottom"
                    style={{ transform: `rotate(${-60 + (time.getSeconds() * 3) % 120}deg) translateY(-50%)` }}
                  />
                  <div className="w-1.5 h-1.5 rounded-full bg-white z-10" />
                </div>
                <span className="text-[9px] text-white/60 mt-1">CPU 24%</span>
              </div>

              {/* RAM dial */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-emerald-400/40 relative flex items-center justify-center bg-black/40">
                  <div
                    className="absolute w-0.5 h-5 bg-emerald-400 origin-bottom"
                    style={{ transform: `rotate(${-30 + (time.getSeconds() * 2) % 100}deg) translateY(-50%)` }}
                  />
                  <div className="w-1.5 h-1.5 rounded-full bg-white z-10" />
                </div>
                <span className="text-[9px] text-white/60 mt-1">RAM 3.4G</span>
              </div>
            </div>
          </div>

          {/* Vista Gadget 3: Quick Weather Note */}
          <div className="w-36 rounded-2xl bg-amber-500/10 border border-amber-400/30 p-2.5 text-xs text-amber-200/90 shadow-xl flex items-center gap-2">
            <Icon name="Sun" size={18} className="text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-white">Tokyo</div>
              <div className="text-[9px] text-amber-300/80">21°C · Clear</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ACTIVE FLOATING WINDOWS (Filtered by Current Virtual Desktop)
         ======================================================== */}
      <AnimatePresence>
        {activeDesktopWindows.map((win) => (
          <WindowFrame key={win.id} win={win}>
            <WindowErrorBoundary appTitle={win.title}>
              {renderApp(win.appId, win.payload)}
            </WindowErrorBoundary>
          </WindowFrame>
        ))}
      </AnimatePresence>

      {/* ========================================================
          WINDOWS 11 TASK VIEW / VIRTUAL DESKTOPS OVERLAY ("デスク機能")
         ======================================================== */}
      <AnimatePresence>
        {taskViewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setTaskViewOpen(false)}
            className="fixed inset-0 bottom-12 z-[4900] bg-slate-950/70 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 select-none"
          >
            {/* Top Header */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between max-w-6xl w-full mx-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 via-violet-500/25 to-cyan-500/30 border border-white/15 flex items-center justify-center text-cyan-300 shadow-lg">
                  <Icon name="LayoutGrid" size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    タスクビュー ＆ 仮想デスクトップ
                  </h2>
                  <p className="text-xs text-white/50">
                    {desktops.find((d) => d.id === activeDesktopId)?.name} — 実行中のウィンドウを管理・別のデスクへ移動できます
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTaskViewOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition"
              >
                <Icon name="X" size={14} />
                <span>閉じる</span>
              </button>
            </div>

            {/* Center: Open Windows Grid on Current Desktop */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="my-auto max-w-6xl w-full mx-auto py-6 overflow-y-auto max-h-[56vh]"
            >
              {activeDesktopWindows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl bg-slate-900/45 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]">
                  <Icon name="Monitor" size={36} className="text-white/30 mb-3" />
                  <div className="text-sm font-semibold text-white/80">
                    このデスクトップで開いているウィンドウはありません
                  </div>
                  <div className="text-xs text-white/45 mt-1">
                    デスクトップアイコンまたは下のタスクバーからアプリを起動できます
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeDesktopWindows.map((win) => (
                    <div
                      key={win.id}
                      onClick={() => {
                        restoreWindow(win.id);
                        setTaskViewOpen(false);
                      }}
                      className="group relative rounded-2xl bg-slate-900/65 hover:bg-slate-900/85 border border-white/15 hover:border-cyan-400/50 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_16px_40px_rgba(0,0,0,0.5)] cursor-pointer transition-all flex flex-col justify-between h-44"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon name={win.appId || win.icon} size={22} />
                          <span className="text-xs font-semibold text-white truncate">
                            {win.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeWindow(win.id);
                          }}
                          className="h-6 w-6 rounded-lg bg-white/10 hover:bg-rose-600 text-white/70 hover:text-white flex items-center justify-center transition"
                          title="ウィンドウを閉じる"
                        >
                          <Icon name="X" size={13} />
                        </button>
                      </div>

                      <div className="my-auto flex items-center justify-center py-3 rounded-xl bg-black/30 border border-white/5">
                        <Icon name={win.appId || win.icon} size={42} />
                      </div>

                      {/* Move Window to Another Desktop */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px]">
                        <span className="text-white/45">
                          {win.minimized ? '最小化中' : win.maximized ? '最大化中' : '表示中'}
                        </span>
                        {desktops.length > 1 && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-white/40 mr-1">移動:</span>
                            {desktops
                              .filter((d) => d.id !== activeDesktopId)
                              .map((d) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => moveWindowToDesktop(win.id, d.id)}
                                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-cyan-500/30 text-cyan-200 text-[10px] transition"
                                >
                                  {d.name}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom: Virtual Desktops Bar ("新しいデスクトップ" / Switching) */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-6xl w-full mx-auto rounded-2xl bg-slate-900/75 backdrop-blur-2xl border border-white/15 p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-3 overflow-x-auto"
            >
              {desktops.map((desk) => {
                const isCurrent = desk.id === activeDesktopId;
                const count = windows.filter(
                  (w) => (!w.desktopId && desk.id === 'desk-1') || w.desktopId === desk.id
                ).length;
                return (
                  <div
                    key={desk.id}
                    onClick={() => switchDesktop(desk.id)}
                    className={`relative shrink-0 w-44 h-24 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all border ${
                      isCurrent
                        ? 'bg-gradient-to-br from-fuchsia-500/25 via-violet-500/20 to-cyan-500/25 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate">
                        {desk.name}
                      </span>
                      {desktops.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDesktop(desk.id);
                          }}
                          className="h-5 w-5 rounded-md hover:bg-rose-500/80 text-white/50 hover:text-white flex items-center justify-center transition"
                          title="このデスクトップを削除"
                        >
                          <Icon name="X" size={11} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span>{count} 個のウィンドウ</span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 text-[10px] font-medium">
                          現在
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={createDesktop}
                className="shrink-0 w-44 h-24 rounded-xl border border-dashed border-white/25 hover:border-cyan-400/60 bg-white/[0.03] hover:bg-white/[0.08] flex flex-col items-center justify-center gap-1.5 text-white/75 hover:text-white transition"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon name="Plus" size={16} className="text-cyan-300" />
                </div>
                <span className="text-xs font-medium">新しいデスクトップ</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Banner */}
      <AnimatePresence>
        {showWelcome && user && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onAnimationComplete={() => {
              setTimeout(() => setWelcome(false), 5000);
            }}
            className="liquid-glass-taskbar fixed top-4 left-1/2 -translate-x-1/2 z-[100] rounded-2xl px-6 py-3 flex items-center gap-3"
          >
            <Icon name="Sparkles" size={17} className="text-cyan-400" />
            <span className="text-sm text-white/90 font-medium">
              Welcome back, {user.name}.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Shell Mode Taskbar (Windows 11, 10, Vista, XP, DeX, ChromeOS, Zorin) */}
      {['windows', 'windows11', 'windows10', 'vista', 'xp', 'dex', 'chromeos', 'zorin'].includes(shellMode) && (
        <Taskbar onLock={lockSystem} />
      )}

      {/* Notification Center Overlay */}
      <NotificationCenter isOpen={notifCenterOpen} onClose={() => setNotifCenterOpen(false)} />

      {/* Lock screen overlay */}
      <LockScreen
        locked={locked}
        onUnlock={unlockSystem}
        expectedPassword={user?.password}
        userName={user?.name}
      />
    </div>
  );
}
