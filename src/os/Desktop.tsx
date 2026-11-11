import React, { Component, ErrorInfo, ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOS } from './OSContext';
import { WindowFrame } from './WindowFrame';
import { Taskbar } from './Taskbar';
import { NotificationCenter } from './NotificationCenter';
import { WALLPAPERS, WallpaperOrbs } from './wallpapers';
import { LiquidShader } from './LiquidShader';
import { SpaceWallpaper } from './SpaceWallpaper';
import { Live2DWallpaper } from './Live2DWallpaper';
import { DynamicWorldWallpaper } from './DynamicWorldWallpaper';
import { LockScreen } from './LockScreen';
import { TerminalApp } from './apps/Terminal';
import { NotepadApp } from './apps/Notepad';
import { FileExplorerApp } from './apps/FileExplorer';
import { AppStoreApp } from './apps/AppStore';
import { CalendarApp } from './apps/CalendarApp';
import { WeatherApp } from './apps/Weather';
import { ClockApp } from './apps/ClockApp';
import { AIAssistantApp } from './apps/AIAssistantApp';
import { Calculator } from './apps/Calculator';
import { TaskManager } from './apps/TaskManager';
import { renderExtraApp } from './apps/ExtraAppsSuite';
import { Icon } from './Icon';
import { AppId, TASKBAR_APPS, DESKTOP_ICON_SIZE_PRESETS } from './types';
import { AppLogo } from './AppLogo';
import { GlasiusCard } from './GlasiusCard';
import { InitialSetupWizard, InitialSetupResult } from './InitialSetupWizard';
import { DesktopOverlaySuite } from './DesktopOverlaySuite';

const BrowserApp = lazy(() => import('./apps/Browser').then((m) => ({ default: m.BrowserApp })));
const SettingsApp = lazy(() => import('./apps/Settings').then((m) => ({ default: m.SettingsApp })));
const GameApp = lazy(() => import('./apps/Game').then((m) => ({ default: m.GameApp })));
const SynthVisualizerApp = lazy(() =>
  import('./apps/SynthVisualizer').then((m) => ({ default: m.SynthVisualizerApp }))
);
const EntertainmentApp = lazy(() =>
  import('./apps/Entertainment').then((m) => ({ default: m.EntertainmentApp }))
);
const GlassiumStudioApp = lazy(() =>
  import('./apps/GlassiumStudio').then((m) => ({ default: m.GlassiumStudioApp }))
);
const RetroCadeApp = lazy(() =>
  import('./apps/RetroCade').then((m) => ({ default: m.RetroCadeApp }))
);
const GlassiumSonicStudio = lazy(() =>
  import('./apps/GlassiumOfficeSuite').then((m) => ({ default: m.GlassiumSonicStudio }))
);
const GlassiumSheetApp = lazy(() =>
  import('./apps/GlassiumOfficeSuite').then((m) => ({ default: m.GlassiumSheetApp }))
);
const GlassiumStageApp = lazy(() =>
  import('./apps/GlassiumOfficeSuite').then((m) => ({ default: m.GlassiumStageApp }))
);
const GlassiumNoteApp = lazy(() =>
  import('./apps/GlassiumOfficeSuite').then((m) => ({ default: m.GlassiumNoteApp }))
);
const GlassiumTsxRunnerApp = lazy(() =>
  import('./apps/GlassiumOfficeSuite').then((m) => ({ default: m.GlassiumTsxRunnerApp }))
);
const GarageBandApp = lazy(() =>
  import('./apps/GarageBand').then((m) => ({ default: m.GarageBandApp }))
);

function renderApp(appId: string, payload?: unknown) {
  switch (appId) {
    case 'terminal':
      return <TerminalApp />;
    case 'notepad':
    case 'markdown':
    case 'diff':
    case 'wordcount':
      return <NotepadApp initialTab={appId} payload={payload as { fileName?: string; content?: string }} />;
    case 'explorer':
      return <FileExplorerApp payload={payload as { folderPath?: string[] }} />;
    case 'browser':
      return <BrowserApp payload={payload as { url?: string; isImage?: boolean }} />;
    case 'settings':
      return <SettingsApp />;
    case 'game':
    case 'minesweeper':
    case 'tictactoe':
    case 'memory':
    case 'typing':
    case 'sudoku':
      return <GameApp initialTab={appId} payload={payload as { gameId?: string }} />;
    case 'appstore':
      return <AppStoreApp />;
    case 'calculator':
    case 'unitconverter':
    case 'bmi':
    case 'expense':
      return <Calculator initialTab={appId} />;
    case 'taskmanager':
    case 'sysmon':
    case 'sysinfo':
      return <TaskManager initialTab={appId} />;
    case 'calendar':
    case 'kanban':
    case 'habit':
    case 'whiteboard':
      return <CalendarApp initialTab={appId} />;
    case 'synth':
    case 'drumpad':
    case 'tuner':
      return <SynthVisualizerApp initialTab={appId} />;
    case 'entertainment':
      return <EntertainmentApp initialTab={appId} payload={payload as { videoId?: string; mode?: string }} />;
    case 'weather':
      return <WeatherApp />;
    case 'clock':
    case 'pomodoro':
    case 'worldclock':
      return <ClockApp initialTab={(payload as { tab?: string } | undefined)?.tab || appId} />;
    case 'ai':
      return <AIAssistantApp />;
    case 'studio':
    case 'jsonformat':
    case 'regex':
    case 'base64':
    case 'morse':
    case 'passgen':
      return <GlassiumStudioApp initialTab={appId} />;
    case 'retrocade':
      return <RetroCadeApp />;
    case 'sonicstudio':
      return <GlassiumSonicStudio />;
    case 'glassexcel':
      return <GlassiumSheetApp />;
    case 'glassppt':
      return <GlassiumStageApp />;
    case 'glassnote':
      return <GlassiumNoteApp />;
    case 'tsxrunner': {
      const tsxPayload = payload as { tsxSource?: string; title?: string } | undefined;
      return <GlassiumTsxRunnerApp initialCode={tsxPayload?.tsxSource} initialTitle={tsxPayload?.title} />;
    }
    case 'garageband':
      return <GarageBandApp />;
    default: {
      const extra = renderExtraApp(appId);
      if (extra) return extra;
      return <CustomAppView payload={payload as { url?: string; isCustomApp?: boolean }} />;
    }
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
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
}

export function Desktop() {
  const {
    windows,
    mountedWindows,
    wallpaper,
    setWallpaper,
    customWallpapers,
    selectedCustomId,
    setSelectedCustomId,
    theme,
    accentColor,
    uiStyle,
    liteMode,
    transparency,
    locked,
    lockSystem,
    unlockSystem,
    user,
    setUser,
    setTheme,
    setAccentColor,
    setUiStyle,
    triggerDynamicIsland,
    showWelcome,
    setWelcome,
    shellMode,
    setShellMode,
    designEngine,
    nebulaPreset,
    openApp,
    focusWindow,
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
    desktopIconSize,
    setDesktopIconSize,
    gridSnapEnabled,
    setGridSnapEnabled,
    isWallpaperBright,
    resolvedAccentHex,
    resolvedAccentRgb,
    deskNotes,
    addDeskNote,
    updateDeskNote,
    deleteDeskNote,
    snapAllWindows5050,
  } = useOS();

  const [time, setTime] = useState(new Date());
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [setupWizardOpen, setSetupWizardOpen] = useState<boolean>(() => {
    const done = localStorage.getItem('glassium_setup_completed');
    return !done || !user;
  });

  useEffect(() => {
    const handleReopenSetup = () => setSetupWizardOpen(true);
    window.addEventListener('open-glassium-setup', handleReopenSetup);
    return () => window.removeEventListener('open-glassium-setup', handleReopenSetup);
  }, []);
  const [draggingIcon, setDraggingIcon] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggingNote, setDraggingNote] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showGlasiusWidget, setShowGlasiusWidget] = useState<boolean>(() => {
    return localStorage.getItem('glassium_show_desktop_widget') === 'true';
  });
  const [showWhatsNewModal, setShowWhatsNewModal] = useState<boolean>(() => {
    return localStorage.getItem('glassium_v5.0_u4_whats_new_dismissed') !== 'true';
  });

  useEffect(() => {
    const handleOpenU4Notes = () => setShowWhatsNewModal(true);
    window.addEventListener('open-glassium-u3-notes', handleOpenU4Notes);
    window.addEventListener('open-glassium-u4-notes', handleOpenU4Notes);
    return () => {
      window.removeEventListener('open-glassium-u3-notes', handleOpenU4Notes);
      window.removeEventListener('open-glassium-u4-notes', handleOpenU4Notes);
    };
  }, []);

  // Global OS Music State & Floating Bottom Liquid Glass Dock State
  const [musicState, setMusicState] = useState<{
    trackId?: string;
    isPlaying: boolean;
    title?: string;
    artist?: string;
    album?: string;
    artworkUrl?: string;
    coverGradient?: string;
    currentTime?: number;
    duration?: number;
    volume?: number;
    lyricLine?: string;
    nextLyricLine?: string;
    palette?: { c1: string; c2: string; c3: string; c4: string };
  } | null>(null);
  const [pillDismissed, setPillDismissed] = useState(false);
  const [topMusicPillDismissed, setTopMusicPillDismissed] = useState(false);
  const [musicPillExpanded, setMusicPillExpanded] = useState(false);
  const [desktopPillMinimized, setDesktopPillMinimized] = useState(false);
  const [desktopPillOffset, setDesktopPillOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingDesktopPill, setIsDraggingDesktopPill] = useState(false);
  const [isMouseNearTop, setIsMouseNearTop] = useState(false);
  const [isHoveringTopBar, setIsHoveringTopBar] = useState(false);
  const topBarHideTimerRef = useRef<number | null>(null);
  const lastMusicTrackKeyRef = useRef<string>('');
  const wasMusicPlayingRef = useRef<boolean>(false);
  const wasTimerRunningRef = useRef<boolean>(false);
  const desktopPillDragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const handleDesktopPillPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, [data-no-dock-drag="true"]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingDesktopPill(true);
    desktopPillDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: desktopPillOffset.x,
      origY: desktopPillOffset.y,
    };
  };

  const handleDesktopPillPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!desktopPillDragRef.current) return;
    const dx = e.clientX - desktopPillDragRef.current.startX;
    const dy = e.clientY - desktopPillDragRef.current.startY;
    setDesktopPillOffset({
      x: Math.max(-520, Math.min(520, desktopPillDragRef.current.origX + dx)),
      y: Math.max(-680, Math.min(40, desktopPillDragRef.current.origY + dy)),
    });
  };

  const handleDesktopPillPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!desktopPillDragRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    desktopPillDragRef.current = null;
    setIsDraggingDesktopPill(false);
  };

  // OS-Level Top Timer Pill / Dock State
  const [timerPillState, setTimerPillState] = useState<{
    running: boolean;
    remaining: number;
    duration: number;
    formatted: string;
    remainingPercent: number;
    progressPercent: number;
    isLowTime: boolean;
  } | null>(null);
  const [timerPillDismissed, setTimerPillDismissed] = useState(false);
  const [timerPillExpanded, setTimerPillExpanded] = useState(false);

  // OS-Level Top Weather Alert Pill & GarageBand Recording Pill State (#2)
  const [weatherPillState, setWeatherPillState] = useState<{
    active: boolean;
    locationLabel: string;
    weatherLabel: string;
    condition: string;
    temperatureC: number;
    snowAccumulation: number;
    alertMessage: string;
  } | null>(null);
  const [weatherPillDismissed, setWeatherPillDismissed] = useState(false);

  const [garageBandPillState, setGarageBandPillState] = useState<{
    isPlaying: boolean;
    isRecording: boolean;
    bpm: number;
    currentBar: number;
    instrumentName: string;
    trackCount: number;
  } | null>(null);
  const [garageBandPillDismissed, setGarageBandPillDismissed] = useState(false);

  // Auto-show Top Pill Bar when user moves mouse cursor near the top of the screen
  useEffect(() => {
    const handleTopMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 52) {
        if (topBarHideTimerRef.current) {
          window.clearTimeout(topBarHideTimerRef.current);
          topBarHideTimerRef.current = null;
        }
        setIsMouseNearTop(true);
      } else if (e.clientY > 145) {
        if (!topBarHideTimerRef.current) {
          topBarHideTimerRef.current = window.setTimeout(() => {
            setIsMouseNearTop(false);
            topBarHideTimerRef.current = null;
          }, 320);
        }
      }
    };
    window.addEventListener('mousemove', handleTopMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleTopMouseMove);
      if (topBarHideTimerRef.current) {
        window.clearTimeout(topBarHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onTimerState = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setTimerPillState(detail);
        if (detail.running && !wasTimerRunningRef.current) {
          setTimerPillDismissed(false);
        }
        wasTimerRunningRef.current = Boolean(detail.running);
      }
    };
    window.addEventListener('glassium-timer-state', onTimerState);
    return () => window.removeEventListener('glassium-timer-state', onTimerState);
  }, []);

  useEffect(() => {
    const onMusicState = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setMusicState(detail);
        const trackKey = `${detail.trackId || ''}::${detail.title || ''}::${detail.artist || ''}`;
        const isNewTrack = trackKey !== lastMusicTrackKeyRef.current;
        const justStartedPlaying = Boolean(detail.isPlaying) && !wasMusicPlayingRef.current;
        if (detail.isPlaying && (isNewTrack || justStartedPlaying)) {
          setPillDismissed(false);
          setTopMusicPillDismissed(false);
        }
        lastMusicTrackKeyRef.current = trackKey;
        wasMusicPlayingRef.current = Boolean(detail.isPlaying);
      }
    };
    window.addEventListener('glassium-music-state', onMusicState);
    return () => window.removeEventListener('glassium-music-state', onMusicState);
  }, []);

  useEffect(() => {
    const onWeatherPill = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setWeatherPillState(detail);
      }
    };
    const onGarageBandPill = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setGarageBandPillState(detail);
        if (detail.isPlaying || detail.isRecording) {
          setGarageBandPillDismissed(false);
        }
      }
    };
    window.addEventListener('glassium-weather-pill-state', onWeatherPill);
    window.addEventListener('glassium-garageband-pill-state', onGarageBandPill);
    return () => {
      window.removeEventListener('glassium-weather-pill-state', onWeatherPill);
      window.removeEventListener('glassium-garageband-pill-state', onGarageBandPill);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const customWallpaper = customWallpapers.find((c) => c.id === selectedCustomId);
  const useDynamicWorld = wallpaper === 'dynamic-world' && !liteMode;
  const useLive2D = (wallpaper === 'live2d' || wallpaper === 'golden-sparkle') && !liteMode;
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
    const installedMatch = installedApps.find((a) => a.id === appId || a.appId === appId);
    if (installedMatch && (installedMatch.isCustom || installedMatch.tsxSource || installedMatch.url || installedMatch.builtInAppId)) {
      launchInstalledApp(installedMatch.id);
      return;
    }
    const wins = windows.filter((w) => w.appId === appId);
    if (wins.length === 0) {
      openApp(appId as AppId);
    } else {
      const top = wins.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
      if (top.desktopId && top.desktopId !== activeDesktopId) {
        moveWindowToDesktop(top.id, activeDesktopId);
      }
      restoreWindow(top.id);
      focusWindow(top.id);
    }
  };

  const iconPreset = DESKTOP_ICON_SIZE_PRESETS[desktopIconSize] ?? DESKTOP_ICON_SIZE_PRESETS.medium;
  const useDarkDesktopText = isWallpaperBright;

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
        latestX = Math.max(8, Math.min(vw - iconPreset.boxW - 8, initialX + dx));
        latestY = Math.max(8, Math.min(vh - iconPreset.boxH - 56, initialY + dy));
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

  const CORE_DESKTOP_APPS = [
    { id: 'browser', label: 'Browser', icon: 'browser' },
    { id: 'notepad', label: 'Editor', icon: 'notepad' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'calculator', label: 'Calculator', icon: 'calculator' },
    { id: 'explorer', label: 'Files', icon: 'explorer' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'game', label: 'Games', icon: 'game' },
    { id: 'synth', label: 'Music', icon: 'synth' },
    { id: 'entertainment', label: 'Entertainment', icon: 'entertainment' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    { id: 'weather', label: 'Weather', icon: 'weather' },
    { id: 'clock', label: 'Clock', icon: 'clock' },
    { id: 'ai', label: 'AI Assistant', icon: 'ai' },
    { id: 'studio', label: 'Glassium Studio', icon: 'studio' },
    { id: 'paint', label: 'Spect Studio', icon: 'paint' },
    { id: 'taskmanager', label: 'Task Manager', icon: 'taskmanager' },
    { id: 'appstore', label: 'App Store', icon: 'appstore' },
  ];

  const coreIds = new Set(CORE_DESKTOP_APPS.map((a) => a.id));
  const downloadedDesktopApps = (installedApps || [])
    .filter((a) => a && a.id !== 'glassword' && a.appId !== 'glassword' && !coreIds.has(a.id) && !coreIds.has(a.appId))
    .map((a) => ({
      id: a.builtInAppId || a.id,
      label: a.name.replace(/\s*\(.*?\)\s*/g, ''),
      icon: a.builtInAppId || a.icon || a.id,
    }));

  const DESKTOP_APPS_LIST = [
    ...CORE_DESKTOP_APPS,
    ...downloadedDesktopApps,
    { id: 'recycle', label: 'Trash', icon: 'recycle' },
  ];

  if (locked) {
    return (
      <div
        data-theme={theme}
        data-accent={accentColor}
        data-ui-style={uiStyle}
        style={
          {
            '--os-accent': resolvedAccentHex,
            '--os-accent-rgb': resolvedAccentRgb,
          } as React.CSSProperties
        }
        className="relative h-full w-full overflow-hidden select-none"
      >
        <LockScreen
          locked={locked}
          onUnlock={unlockSystem}
          expectedPassword={user?.password}
          userName={user?.name}
          userAvatar={user?.avatar}
        />
        <AnimatePresence>
          {setupWizardOpen && (
            <InitialSetupWizard
              initialUser={user}
              initialUiStyle={uiStyle}
              initialTheme={theme}
              initialAccent={accentColor}
              onComplete={(result: InitialSetupResult) => {
                setUser(result.user);
                setUiStyle(result.uiStyle);
                setTheme(result.theme);
                setAccentColor(result.accentColor);
                localStorage.setItem('glassium_setup_completed', 'true');
                setSetupWizardOpen(false);
                triggerDynamicIsland('Setup Complete', `ようこそ、${result.user.name}さん`, 'Sparkles');
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      data-accent={accentColor}
      data-ui-style={uiStyle}
      style={
        {
          '--os-accent': resolvedAccentHex,
          '--os-accent-rgb': resolvedAccentRgb,
        } as React.CSSProperties
      }
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

      {/* Dynamic World Live Wallpaper (Location, Terrain, Weather, Snow Accumulation, Time, Wind, Season, Events) */}
      {useDynamicWorld && !customWallpaper && <DynamicWorldWallpaper showControllerHud={true} />}

      {/* 2D Interactive Aurora Silk & PS5 Golden Sparkle Live Wallpaper */}
      {useLive2D && !customWallpaper && (
        <Live2DWallpaper
          lite={false}
          auroraColor={wallpaper === 'golden-sparkle' ? 'golden-sparkle' : undefined}
        />
      )}

      {/* 3D Black Hole Raymarching Space live wallpaper */}
      {useSpace && !customWallpaper && <SpaceWallpaper lite={false} preset={nebulaPreset} />}

      {/* WebGL liquid shader overlay */}
      {useShader && !customWallpaper && <LiquidShader lite={false} opacity={shaderOpacity} />}

      {/* Floating orbs */}
      {!liteMode && !useDynamicWorld && !useLive2D && !useShader && !useSpace && !customWallpaper && <WallpaperOrbs />}

      {/* ========================================================
          1. MAC DESKTOP SHELL: Top Menu Bar + Magnified Bottom Dock
         ======================================================== */}
      {shellMode === 'mac' && (
        <>
          {/* Mac Top Global Bar (Zero Border Line) */}
          <div className="fixed top-0 inset-x-0 h-7 bg-black/40 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.35)] z-40 px-4 flex items-center justify-between text-xs text-white/90">
            <div className="flex items-center gap-4">
              <div className="cursor-pointer hover:opacity-80" onClick={() => openApp('settings')}>
                <AppLogo size={16} />
              </div>
              <span className="font-bold tracking-tight">GlassiumOS 5 u4</span>
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
              <span className="text-white/60">GlassiumOS 5</span>
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
              <span>Search GlassiumOS 5 or type URL...</span>
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
              onClick={() => {
                if (musicState?.isPlaying) {
                  openApp('synth');
                } else {
                  setNotifCenterOpen(!notifCenterOpen);
                }
              }}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-black/90 px-4 py-1.5 text-white ring-1 ring-white/25 shadow-2xl hover:scale-105 transition"
            >
              {musicState?.isPlaying ? (
                <>
                  <span className="material-symbols-rounded text-cyan-400 text-sm animate-pulse">music_note</span>
                  <span className="text-[11px] font-medium font-sans truncate max-w-[140px] sm:max-w-[190px]">
                    {musicState.title || '再生中'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(
                        new CustomEvent('glassium-music-command', { detail: { action: 'toggle-play' } })
                      );
                    }}
                    title="一時停止"
                    className="ml-0.5 text-white/80 hover:text-cyan-300"
                  >
                    <span className="material-symbols-rounded text-sm">pause</span>
                  </button>
                </>
              ) : (
                <>
                  <span className={`h-2 w-2 rounded-full ${dynamicIslandEvent ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                  <span className="text-[11px] font-medium font-sans">
                    {dynamicIslandEvent ? `${dynamicIslandEvent.title}${dynamicIslandEvent.subtitle ? ` · ${dynamicIslandEvent.subtitle}` : ''}` : 'GlassiumOS 5 Active'}
                  </span>
                </>
              )}
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
                      <div className="text-base font-bold leading-tight">GlassiumOS 5 AI Assistant</div>
                      <div className="text-[11px] text-white/80">Integrated OS Assistant</div>
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
              <span>GlassiumOS 5 Metro Live</span>
            </div>
            <div>Swipe horizontally or tap to launch tiles</div>
          </div>
        </div>
      )}

      {/* ========================================================
          GRID-SNAPPED DESKTOP ICONS & DESK WORKSPACE CONTROLS
         ======================================================== */}
      {['windows', 'windows11', 'windows10', 'vista', 'xp', 'dex', 'chromeos', 'zorin'].includes(shellMode) && (
        <>
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Visual Grid Overlay & Target Slot ("規定の場所") while dragging */}
            {draggingIcon && gridSnapEnabled && (() => {
              const padX = 16;
              const padY = 16;
              const maxCols = Math.max(1, Math.floor((window.innerWidth - padX * 2) / iconPreset.cellW));
              const maxRows = Math.max(1, Math.floor((window.innerHeight - 68 - padY) / iconPreset.cellH));
              const targetCol = Math.max(0, Math.min(maxCols - 1, Math.round((draggingIcon.x - padX) / iconPreset.cellW)));
              const targetRow = Math.max(0, Math.min(maxRows - 1, Math.round((draggingIcon.y - padY) / iconPreset.cellH)));
              const slotLeft = padX + targetCol * iconPreset.cellW;
              const slotTop = padY + targetRow * iconPreset.cellH;

              return (
                <>
                  {/* Subtle desktop grid lines while dragging so user sees defined slots */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                    style={{
                      backgroundImage: useDarkDesktopText
                        ? `linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)`
                        : `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                      backgroundSize: `${iconPreset.cellW}px ${iconPreset.cellH}px`,
                      backgroundPosition: `${padX}px ${padY}px`,
                    }}
                  />
                  {/* Highlighted Target Grid Slot ("規定の場所") */}
                  <div
                    style={{
                      position: 'absolute',
                      left: slotLeft,
                      top: slotTop,
                      width: iconPreset.boxW,
                      height: iconPreset.boxH,
                    }}
                    className={`rounded-xl border-2 border-dashed transition-all duration-100 flex items-end justify-center pb-1 ${
                      useDarkDesktopText
                        ? 'border-slate-900/55 bg-slate-900/10'
                        : 'border-cyan-400/75 bg-cyan-400/15'
                    }`}
                  >
                    <span
                      className={`text-[9px] font-mono px-1 rounded ${
                        useDarkDesktopText ? 'text-slate-900/80 bg-white/75' : 'text-cyan-200 bg-slate-950/70'
                      }`}
                    >
                      {targetCol + 1},{targetRow + 1}
                    </span>
                  </div>
                </>
              );
            })()}

            {DESKTOP_APPS_LIST.map((item, idx) => {
              const savedPos = desktopIconPositions[item.id] ?? {
                x: 16 + Math.floor(idx / 6) * iconPreset.cellW,
                y: 16 + (idx % 6) * iconPreset.cellH,
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
                    width: iconPreset.boxW,
                    height: iconPreset.boxH,
                    zIndex: isDraggingThis ? 50 : isSelected ? 20 : 10,
                    touchAction: 'none',
                  }}
                  className={`pointer-events-auto flex flex-col items-center justify-center gap-1.5 py-1.5 px-1 rounded-xl cursor-grab active:cursor-grabbing transition-[background-color,box-shadow,transform] duration-150 group ${
                    isDraggingThis
                      ? useDarkDesktopText
                        ? 'bg-white/85 backdrop-blur-md shadow-lg scale-105 ring-1 ring-slate-900/30'
                        : 'bg-slate-900/75 backdrop-blur-md shadow-xl scale-105 ring-1 ring-cyan-400/55'
                      : isSelected
                      ? useDarkDesktopText
                        ? 'bg-slate-900/15 backdrop-blur-sm ring-1 ring-slate-900/35'
                        : 'bg-white/15 backdrop-blur-sm ring-1 ring-white/35'
                      : useDarkDesktopText
                      ? 'hover:bg-slate-900/10'
                      : 'hover:bg-white/10'
                  }`}
                  title={`${item.label} (ドラッグでグリッド移動 / クリックで起動)`}
                >
                  <div
                    style={{ width: iconPreset.iconPx + 6, height: iconPreset.iconPx + 6 }}
                    className="flex items-center justify-center group-hover:scale-105 transition-transform duration-150 shrink-0 pointer-events-none"
                  >
                    <Icon name={item.icon || item.id} size={iconPreset.iconPx} />
                  </div>
                  <span
                    className={`${iconPreset.fontClass} text-center truncate max-w-full px-1 leading-tight select-none pointer-events-none transition-colors duration-150 ${
                      useDarkDesktopText
                        ? 'text-slate-900 font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]'
                        : shellMode === 'xp'
                        ? 'text-white font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]'
                        : 'text-white/95 font-medium group-hover:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]'
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
              const colorMapDark: Record<typeof note.color, string> = {
                cyan: 'bg-slate-900/80 border-cyan-400/40 text-white',
                violet: 'bg-slate-900/80 border-violet-400/40 text-white',
                amber: 'bg-slate-900/80 border-amber-400/40 text-white',
                emerald: 'bg-slate-900/80 border-emerald-400/40 text-white',
                rose: 'bg-slate-900/80 border-rose-400/40 text-white',
              };
              const colorMapLight: Record<typeof note.color, string> = {
                cyan: 'bg-cyan-50/95 border-cyan-400/60 text-slate-900',
                violet: 'bg-violet-50/95 border-violet-400/60 text-slate-900',
                amber: 'bg-amber-50/95 border-amber-400/60 text-slate-900',
                emerald: 'bg-emerald-50/95 border-emerald-400/60 text-slate-900',
                rose: 'bg-rose-50/95 border-rose-400/60 text-slate-900',
              };
              const noteStyle = (theme === 'light' || useDarkDesktopText)
                ? colorMapLight[note.color]
                : colorMapDark[note.color];

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
                  className={`pointer-events-auto w-56 rounded-xl ${noteStyle} backdrop-blur-xl border shadow-lg p-3 flex flex-col gap-2`}
                >
                  <div className="flex items-center justify-between cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-1.5">
                      {(['cyan', 'violet', 'amber', 'emerald', 'rose'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateDeskNote(note.id, { color: c })}
                          className={`w-3 h-3 rounded-full border border-black/20 transition ${
                            c === 'cyan'
                              ? 'bg-cyan-400'
                              : c === 'violet'
                              ? 'bg-violet-400'
                              : c === 'amber'
                              ? 'bg-amber-400'
                              : c === 'emerald'
                              ? 'bg-emerald-400'
                              : 'bg-rose-400'
                          } ${note.color === c ? 'scale-125 ring-1 ring-current' : 'opacity-60 hover:opacity-100'}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteDeskNote(note.id)}
                      className="opacity-60 hover:opacity-100 hover:text-rose-500 transition p-0.5"
                      title="付箋を削除"
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </div>
                  <textarea
                    value={note.text}
                    onChange={(e) => updateDeskNote(note.id, { text: e.target.value })}
                    rows={4}
                    className="w-full bg-transparent border-0 outline-none resize-none text-xs text-current placeholder:opacity-45 leading-relaxed select-text"
                    placeholder="メモを入力..."
                  />
                </div>
              );
            })}
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
            className={`w-60 rounded-xl backdrop-blur-2xl border shadow-2xl p-1.5 text-xs ${
              theme === 'light'
                ? 'bg-white/95 border-slate-200 text-slate-900'
                : 'bg-slate-900/90 border-white/15 text-white/90'
            }`}
          >
            {/* Quick Icon Size Selector */}
            <div className="px-2.5 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-55 mb-1.5">
                アプリアイコンのサイズ
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['small', 'medium', 'large'] as DesktopIconSize[]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setDesktopIconSize(sz);
                    }}
                    className={`py-1 rounded-md text-[11px] font-medium border transition ${
                      desktopIconSize === sz
                        ? 'os-accent-soft border font-semibold'
                        : theme === 'light'
                        ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    {DESKTOP_ICON_SIZE_PRESETS[sz].labelJa}
                  </button>
                ))}
              </div>
            </div>

            <div className={`my-1 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`} />

            <button
              type="button"
              onClick={() => {
                setGridSnapEnabled(!gridSnapEnabled);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon name="Grid3x3" size={14} className="os-accent-text" />
                <span>グリッドに自動スナップ</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${gridSnapEnabled ? 'os-accent-soft' : 'opacity-45'}`}>
                {gridSnapEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetDesktopIconPositions(false);
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <Icon name="LayoutGrid" size={14} className="text-cyan-500" />
              <span>アイコンを規定位置に整列</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetDesktopIconPositions(true);
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <Icon name="Grid3x3" size={14} className="text-violet-500" />
              <span>現在の位置をグリッドに揃える</span>
            </button>
            <div className={`my-1 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`} />
            <button
              type="button"
              onClick={() => {
                addDeskNote();
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <Icon name="FileText" size={14} className="text-amber-500" />
              <span>デスク付箋を追加</span>
            </button>
            <button
              type="button"
              onClick={() => {
                toggleTaskView();
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <Icon name="Monitor" size={14} className="text-emerald-500" />
              <span>仮想デスクトップ / タスクビュー</span>
            </button>
            <button
              type="button"
              onClick={() => {
                snapAllWindows5050();
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <Icon name="Columns" size={14} className="text-sky-500" />
              <span>ウィンドウを左右に並べる</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !showGlasiusWidget;
                setShowGlasiusWidget(next);
                localStorage.setItem('glassium_show_desktop_widget', next ? 'true' : 'false');
                setContextMenu(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon name="Clock" size={14} className="text-cyan-400" />
                <span>デスクトップ時計ウィジェット</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${showGlasiusWidget ? 'os-accent-soft' : 'opacity-45'}`}>
                {showGlasiusWidget ? 'ON' : 'OFF'}
              </span>
            </button>
            <div className={`my-1 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`} />
            <button
              type="button"
              onClick={() => {
                setSelectedCustomId(null);
                setWallpaper('dynamic-world');
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <span className="text-sm">🌍</span>
              <span>季節のライブ壁紙 (場所・天候・積雪設定)</span>
            </button>
            <div className={`my-1 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`} />
            <button
              type="button"
              onClick={() => {
                openApp('settings');
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              <Icon name="Settings" size={14} className="text-cyan-400" />
              <span>OS設定</span>
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

      {/* Signature GlasiusCard Spatial HUD (Top-Left Weather/Info, Bottom-Left Liquid Glass Clock & Volume, Right-Side Notifications & Pure Chat AI) */}
      {showGlasiusWidget && (
        <GlasiusCard
          onClose={() => {
            setShowGlasiusWidget(false);
            localStorage.setItem('glassium_show_desktop_widget', 'false');
          }}
        />
      )}

      {/* ========================================================
          ACTIVE FLOATING WINDOWS (Filtered by Current Virtual Desktop)
         ======================================================== */}
      <AnimatePresence>
        {mountedWindows.map((win) => (
          <WindowFrame
            key={win.id}
            win={win}
            isHidden={Boolean(win.closed || win.minimized || ((win.desktopId || 'desk-1') !== activeDesktopId))}
          >
            <WindowErrorBoundary key={`${win.id}-${win.appId}`} appTitle={win.title}>
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-slate-950/60 text-xs text-white/60">
                    読み込み中...
                  </div>
                }
              >
                {renderApp(win.appId, win.payload)}
              </Suspense>
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

      {/* What's New Release Notes Modal (GlassiumOS 5 u4) */}
      <AnimatePresence>
        {showWhatsNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6"
            onClick={() => {
              localStorage.setItem('glassium_v5.0_u4_whats_new_dismissed', 'true');
              setShowWhatsNewModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[88vh] liquid-glass-window rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl flex flex-col gap-5 overflow-hidden relative text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <AppLogo size={30} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                        GlassiumOS 5 u4 アップデート内容
                      </h2>
                      <span
                        className="px-2.5 py-0.5 rounded-md border text-[10px] font-mono font-bold"
                        style={{
                          backgroundColor: `rgba(${resolvedAccentRgb}, 0.2)`,
                          borderColor: `rgba(${resolvedAccentRgb}, 0.45)`,
                          color: resolvedAccentHex,
                        }}
                      >
                        UPDATE 4 (GlassiumOS 5 u4)
                      </span>
                    </div>
                    <p className="text-xs text-white/60 font-mono mt-0.5">
                      GlassiumOS 5 u4 · GlasispectUI Liquid Glass Edition
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('glassium_v5.0_u4_whats_new_dismissed', 'true');
                    setShowWhatsNewModal(false);
                  }}
                  className="p-1.5 text-white/60 hover:text-white transition cursor-pointer"
                >
                  <Icon name="X" size={18} />
                </button>
              </div>

              {/* Release Notes Content List */}
              <div className="flex-1 overflow-y-auto pr-1 text-xs divide-y divide-white/10 space-y-1">
                <div className="py-3.5 first:pt-0 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-cyan-300 text-sm">
                      1. 音楽アプリ (Glassium Music)：新UI・外部プレイリスト読込・歌詞翻訳・設定タブ
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('glassium_v5.0_u4_whats_new_dismissed', 'true');
                        setShowWhatsNewModal(false);
                        openApp('synth');
                      }}
                      className="px-3 py-1 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold transition cursor-pointer"
                    >
                      音楽アプリを開く →
                    </button>
                  </div>
                  <p className="text-white/75 leading-relaxed">
                    Liquid Glassデザインを維持したホーム・検索・プレイリスト/アルバム/EP/シングル詳細・設定画面に刷新。設定タブから音質・10バンドEQ・バージョン仕様を確認でき、他サービスからのプレイリスト取り込みと歌詞翻訳（日本語↔英語、他言語→日本語）に対応しました。アクセントカラーはOS設定に連動します。
                  </p>
                </div>

                <div className="py-3.5 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sky-300 text-sm">
                      2. 天気アプリ：地点検索・地点登録・雨雲レーダーマップ・5分自動更新サーバー連携
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('glassium_v5.0_u4_whats_new_dismissed', 'true');
                        setShowWhatsNewModal(false);
                        openApp('weather');
                      }}
                      className="px-3 py-1 rounded-lg bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400/40 text-sky-200 text-[11px] font-bold transition cursor-pointer"
                    >
                      天気アプリを開く →
                    </button>
                  </div>
                  <p className="text-white/75 leading-relaxed">
                    世界中の都市・地点を検索して登録でき、RainViewer雨雲レーダーを重ねたマップ表示に対応。サーバー経由で5分ごとに気象データを自動更新します。
                  </p>
                </div>

                <div className="py-3.5 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-emerald-300 text-sm">
                      3. Microsoft Store風 App Store・プログレスバー・Officeスイート・立体音響・TSXアプリ追加
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('glassium_v5.0_u4_whats_new_dismissed', 'true');
                          setShowWhatsNewModal(false);
                          openApp('appstore');
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold transition cursor-pointer"
                      >
                        App Storeを開く →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('glassium_v5.0_u4_whats_new_dismissed', 'true');
                          setShowWhatsNewModal(false);
                          openApp('sonicstudio');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        Glassium Sonic 3D
                      </button>
                    </div>
                  </div>
                  <p className="text-white/75 leading-relaxed">
                    App StoreのUIを刷新し、ダウンロード時の進捗バー表示に対応。App StoreからOS全体の音を立体音響化・EQ調整できる「Glassium Sonic 3D」、表計算「Glassium Sheet」、プレゼン「Glassium Stage」、デジタルノート「Glassium Note」、および独自の.tsxアプリを開発・アップロードして実行できる「Glassium TSX Studio」をダウンロードできます。
                  </p>
                </div>

                <div className="py-3.5 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-amber-300 text-sm">
                      4. 動的アクセントカラー修正・Bing日替わり画像プロキシ修正・Liquid Glass ロック画面時計
                    </span>
                  </div>
                  <p className="text-white/75 leading-relaxed">
                    壁紙やテーマに応じた動的アクセントカラーの反映修正、サーバー経由のBing日替わり壁紙取得、およびロック画面のLiquid Glass時計表示に対応しました。
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-white/50 font-mono">
                  GlassiumOS 5 u4
                </span>
                <button
                  onClick={() => {
                    localStorage.setItem('glassium_v5.0_u4_whats_new_dismissed', 'true');
                    setShowWhatsNewModal(false);
                  }}
                  style={{ backgroundColor: resolvedAccentHex }}
                  className="px-5 py-2 rounded-xl text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer shadow-lg"
                >
                  GlassiumOS 5 u4 をはじめる
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          OS-LEVEL TOP FLOATING PILL / DOCK BAR
          Auto-reveals smoothly when moving the mouse cursor to the top edge
         ======================================================== */}
      {/* Subtle Top Edge Sensor Indicator (always visible when top bar is tucked away) */}
      <div
        onMouseEnter={() => setIsMouseNearTop(true)}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-[4499] h-3 w-48 flex items-start justify-center pt-1 cursor-pointer transition-opacity duration-300 ${
          isMouseNearTop || isHoveringTopBar ? 'opacity-0 pointer-events-none' : 'opacity-75 hover:opacity-100'
        }`}
        title="マウスを上に移動してトップバー・ピルを表示"
      >
        <div className="h-1 w-20 rounded-full bg-white/35 shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
      </div>

      <div
        onMouseEnter={() => {
          if (topBarHideTimerRef.current) {
            window.clearTimeout(topBarHideTimerRef.current);
            topBarHideTimerRef.current = null;
          }
          setIsHoveringTopBar(true);
          setIsMouseNearTop(true);
        }}
        onMouseLeave={() => {
          setIsHoveringTopBar(false);
          setMusicPillExpanded(false);
          setTimerPillExpanded(false);
        }}
        className={`fixed top-2.5 left-1/2 -translate-x-1/2 z-[4500] flex flex-wrap items-start justify-center gap-2 max-w-[96vw] select-none transition-all duration-300 ease-out ${
          isMouseNearTop || isHoveringTopBar
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        {/* Quick Spotlight (Ctrl+K) & Window Tile Group Memory Trigger Pill */}
        <div className="pointer-events-auto flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-950/90 backdrop-blur-2xl border border-white/15 hover:border-white/30 shadow-xl transition">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('glassium-open-spotlight'))}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white/85 hover:text-cyan-300 transition cursor-pointer px-1"
            title="Spotlight コマンドパレット (Ctrl+K / Alt+Space)"
          >
            <Icon name="Search" size={12} className="text-cyan-400" />
            <span className="hidden sm:inline">検索・コマンド</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-white/60">
              ⌘K
            </span>
          </button>
          <span className="h-3.5 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('glassium-toggle-tile-manager'))}
            className="flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-violet-300 transition cursor-pointer px-1"
            title="ウィンドウ・タイルグループ記憶＆一括最小化/復元"
          >
            <Icon name="Columns" size={12} className="text-violet-400" />
            <span className="hidden md:inline">タイル記憶</span>
          </button>
          {musicState && (pillDismissed || topMusicPillDismissed) && (
            <>
              <span className="h-3.5 w-px bg-white/15" />
              <button
                type="button"
                onClick={() => {
                  setPillDismissed(false);
                  setTopMusicPillDismissed(false);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-300 hover:text-rose-200 transition cursor-pointer px-1"
                title="非表示にした音楽ピルを再表示"
              >
                <Icon name="Music" size={11} className="text-rose-400" />
                <span>音楽ピル復帰</span>
              </button>
            </>
          )}
        </div>

        {/* 1. EXPANDABLE TOP TIMER PILL (#1) */}
        <AnimatePresence>
          {timerPillState &&
            !timerPillDismissed &&
            (timerPillState.running ||
              timerPillState.remaining < timerPillState.duration ||
              windows.some((w) => w.appId === 'clock')) && (
              <motion.div
                key="os-top-timer-pill"
                initial={{ y: -50, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -40, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                onMouseEnter={() => setTimerPillExpanded(true)}
                onMouseLeave={() => setTimerPillExpanded(false)}
                className="pointer-events-auto"
              >
                <div
                  onClick={() => setTimerPillExpanded((v) => !v)}
                  className={`cursor-pointer px-4 py-1.5 rounded-3xl backdrop-blur-2xl border transition-all duration-300 flex flex-col gap-2 shadow-2xl ${
                    timerPillState.isLowTime && timerPillState.running
                      ? 'bg-rose-950/90 border-rose-400/65 clock-timer-low-card'
                      : timerPillState.running
                      ? 'bg-slate-950/88 border-cyan-400/50 shadow-[0_10px_30px_rgba(6,182,212,0.28)]'
                      : 'bg-slate-950/82 border-white/20 hover:border-white/35'
                  }`}
                  title="ホバーまたはクリックでタイマー操作を展開"
                >
                  <div className="flex items-center gap-3">
                    {/* Smooth Circular Progress Ring */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openApp('clock', { payload: { tab: 'timer' } });
                      }}
                      className="relative w-7 h-7 flex items-center justify-center shrink-0"
                      title="Clockアプリを開く"
                    >
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          stroke="rgba(255,255,255,0.14)"
                          strokeWidth="3.2"
                          fill="transparent"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          stroke={timerPillState.isLowTime ? '#fb7185' : '#22d3ee'}
                          strokeWidth="3.2"
                          fill="transparent"
                          strokeDasharray="87.96"
                          strokeDashoffset={
                            87.96 - (87.96 * timerPillState.remainingPercent) / 100
                          }
                          strokeLinecap="round"
                          className={`clock-timer-progress-circle ${
                            timerPillState.running
                              ? timerPillState.isLowTime
                                ? 'is-low-time'
                                : 'is-running'
                              : ''
                          }`}
                        />
                      </svg>
                      <Icon
                        name="Clock"
                        size={12}
                        className={
                          timerPillState.isLowTime ? 'text-rose-300' : 'text-cyan-300'
                        }
                      />
                    </div>

                    {/* Countdown Readout */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openApp('clock', { payload: { tab: 'timer' } });
                      }}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                          timerPillState.isLowTime && timerPillState.running
                            ? 'text-rose-300 animate-pulse'
                            : 'text-cyan-300'
                        }`}
                      >
                        TIMER
                      </span>
                      <span
                        className={`text-sm sm:text-base font-black font-mono tabular-nums tracking-tight ${
                          timerPillState.isLowTime && timerPillState.running
                            ? 'text-rose-200'
                            : 'text-white'
                        }`}
                      >
                        {timerPillState.formatted}
                      </span>
                    </div>

                    {/* Quick Controls inside Top Pill */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 border-l border-white/15 pl-2.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('glassium-timer-command', {
                              detail: { action: 'toggle' },
                            })
                          )
                        }
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer ${
                          timerPillState.running
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                            : timerPillState.isLowTime
                            ? 'bg-rose-500 text-white hover:bg-rose-400'
                            : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                        }`}
                      >
                        {timerPillState.running ? '一時停止' : '開始'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('glassium-timer-command', {
                              detail: { action: 'add-seconds', seconds: 60 },
                            })
                          )
                        }
                        className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-white/85 cursor-pointer"
                        title="1分追加"
                      >
                        +1m
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimerPillDismissed(true)}
                        className="w-5 h-5 rounded-full hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center transition cursor-pointer"
                        title="ピルを隠す"
                      >
                        <Icon name="X" size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Hover/Click Expanded Timer Controls (+30s, +1m, +5m, Reset, Open App) */}
                  {timerPillExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-1.5 text-[10px]"
                    >
                      <div className="flex items-center gap-1">
                        {[
                          { label: '+30s', secs: 30 },
                          { label: '+1m', secs: 60 },
                          { label: '+5m', secs: 300 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              window.dispatchEvent(
                                new CustomEvent('glassium-timer-command', {
                                  detail: { action: 'add-seconds', seconds: preset.secs },
                                })
                              )
                            }
                            className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-cyan-500/30 text-white font-mono font-bold cursor-pointer transition"
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent('glassium-timer-command', {
                                detail: { action: 'reset' },
                              })
                            )
                          }
                          className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-rose-500/30 text-white/80 hover:text-rose-200 font-bold cursor-pointer transition"
                        >
                          リセット
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => openApp('clock', { payload: { tab: 'timer' } })}
                        className="px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 font-bold cursor-pointer"
                      >
                        時計を開く →
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* 2. EXPANDABLE TOP MUSIC PILL (#1: Hover/Click Expansion with Seek, Volume, 2-Line Lyrics & Waveform) */}
        <AnimatePresence>
          {musicState &&
            !topMusicPillDismissed &&
            (musicState.isPlaying || windows.some((w) => w.appId === 'synth')) && (
              <motion.div
                key="os-top-music-pill"
                initial={{ y: -50, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -40, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                onMouseEnter={() => setMusicPillExpanded(true)}
                onMouseLeave={() => setMusicPillExpanded(false)}
                className="pointer-events-auto"
              >
                <div
                  onClick={() => setMusicPillExpanded((v) => !v)}
                  className={`relative overflow-hidden cursor-pointer px-4 py-1.5 rounded-3xl backdrop-blur-2xl border transition-all duration-300 flex flex-col gap-2 shadow-2xl ${
                    musicState.isPlaying
                      ? 'bg-slate-950/90 border-white/25 shadow-[0_10px_32px_rgba(244,63,94,0.28)]'
                      : 'bg-slate-950/82 border-white/15 hover:border-white/30'
                  }`}
                  title="ホバーまたはクリックでシークバー・音量・2行歌詞を展開"
                >
                  {/* Subtle Artwork Ambient Glow Inside Top Pill */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-35 blur-xl transition-all duration-700"
                    style={{
                      background: `linear-gradient(90deg, ${
                        musicState.palette?.c1 || '#fa243c'
                      } 0%, ${musicState.palette?.c2 || '#8b5cf6'} 50%, ${
                        musicState.palette?.c3 || '#06b6d4'
                      } 100%)`,
                    }}
                  />

                  <div className="relative z-10 flex items-center gap-3">
                    {/* Smooth Circular Progress Ring + Album Artwork */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openApp('synth');
                      }}
                      className="relative w-8 h-8 flex items-center justify-center shrink-0"
                      title="Musicアプリを開く"
                    >
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          stroke="rgba(255,255,255,0.16)"
                          strokeWidth="2.8"
                          fill="transparent"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          stroke={musicState.palette?.c1 || resolvedAccentHex}
                          strokeWidth="2.8"
                          fill="transparent"
                          strokeDasharray="97.39"
                          strokeDashoffset={
                            97.39 -
                            (97.39 *
                              Math.min(
                                100,
                                ((musicState.currentTime || 0) /
                                  Math.max(1, musicState.duration || 210)) *
                                  100
                              )) /
                              100
                          }
                          strokeLinecap="round"
                          className="clock-timer-progress-circle is-running"
                        />
                      </svg>
                      <div className="absolute inset-[4px] rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                        {musicState.artworkUrl ? (
                          <img
                            src={musicState.artworkUrl}
                            alt=""
                            className={`w-full h-full object-cover ${
                              musicState.isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                            }`}
                          />
                        ) : (
                          <Icon name="Music" size={11} className="text-rose-300" />
                        )}
                      </div>
                    </div>

                    {/* Track Title, Artist & Synchronized Live Lyric Snippet */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openApp('synth');
                      }}
                      className="min-w-0 max-w-[175px] sm:max-w-[250px] flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300 shrink-0">
                          MUSIC
                        </span>
                        <span className="text-xs font-extrabold text-white truncate">
                          {musicState.title || 'Now Playing'}
                        </span>
                        <span className="text-[10px] text-white/60 truncate">
                          · {musicState.artist || 'Artist'}
                        </span>
                      </div>
                      {musicState.lyricLine ? (
                        <span className="text-[10px] text-white/90 font-semibold truncate">
                          ♪ {musicState.lyricLine}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/55 font-mono tabular-nums truncate">
                          {Math.floor((musicState.currentTime || 0) / 60)}:
                          {String(Math.floor((musicState.currentTime || 0) % 60)).padStart(2, '0')} /{' '}
                          {Math.floor((musicState.duration || 210) / 60)}:
                          {String(Math.floor((musicState.duration || 210) % 60)).padStart(2, '0')}
                        </span>
                      )}
                    </div>

                    {/* Animated Mini Equalizer Waveform Bars */}
                    <div className="hidden sm:flex items-end gap-0.5 h-3.5 px-1">
                      {[0, 1, 2, 3, 4].map((barIdx) => (
                        <span
                          key={barIdx}
                          style={{
                            height: musicState.isPlaying
                              ? `${35 + ((Math.floor((musicState.currentTime || 0) * 10) + barIdx * 3) % 65)}%`
                              : '25%',
                            backgroundColor: musicState.palette?.c1 || resolvedAccentHex,
                          }}
                          className="w-0.5 rounded-full transition-all duration-150"
                        />
                      ))}
                    </div>

                    {/* Quick Transport Controls inside Top Music Pill */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 border-l border-white/15 pl-2.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('glassium-music-command', { detail: { action: 'prev' } })
                          )
                        }
                        className="w-6 h-6 rounded-full hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
                        title="前の曲"
                      >
                        <span className="material-symbols-rounded text-[16px]">skip_previous</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('glassium-music-command', {
                              detail: { action: 'toggle-play' },
                            })
                          )
                        }
                        className="px-2.5 py-0.5 rounded-full bg-white text-slate-950 hover:bg-white/90 text-[10px] font-black transition cursor-pointer flex items-center gap-0.5"
                        title={musicState.isPlaying ? '一時停止' : '再生'}
                      >
                        <span>{musicState.isPlaying ? '一時停止' : '再生'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('glassium-music-command', { detail: { action: 'next' } })
                          )
                        }
                        className="w-6 h-6 rounded-full hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
                        title="次の曲"
                      >
                        <span className="material-symbols-rounded text-[16px]">skip_next</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTopMusicPillDismissed(true);
                          setMusicPillExpanded(false);
                        }}
                        className="w-5 h-5 rounded-full hover:bg-rose-500/40 text-white/50 hover:text-white flex items-center justify-center transition cursor-pointer"
                        title="再生中でも音楽ピルを消す"
                      >
                        <Icon name="X" size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Top Music Pill Panel: 2-Line Lyrics, Interactive Seek Scrubber & Volume Slider */}
                  {musicPillExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="relative z-10 pt-2 border-t border-white/15 flex flex-col gap-2 min-w-[290px] sm:min-w-[360px]"
                    >
                      {/* 2-Line Synchronized Live Lyrics Display */}
                      <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 space-y-0.5">
                        <div className="text-[11px] font-extrabold text-white truncate">
                          {musicState.lyricLine
                            ? `♪ ${musicState.lyricLine}`
                            : `♪ ${musicState.title || '再生中'} — ${musicState.artist || ''}`}
                        </div>
                        <div className="text-[10px] text-white/55 truncate">
                          {musicState.nextLyricLine || 'Apple Music Live Lyrics 同期中'}
                        </div>
                      </div>

                      {/* Interactive Seek Bar */}
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/75">
                        <span className="w-8 text-right tabular-nums">
                          {Math.floor((musicState.currentTime || 0) / 60)}:
                          {String(Math.floor((musicState.currentTime || 0) % 60)).padStart(2, '0')}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(1, Math.round(musicState.duration || 210))}
                          value={Math.round(musicState.currentTime || 0)}
                          onChange={(e) =>
                            window.dispatchEvent(
                              new CustomEvent('glassium-music-command', {
                                detail: { action: 'seek', time: Number(e.target.value) },
                              })
                            )
                          }
                          style={{ accentColor: musicState.palette?.c1 || resolvedAccentHex }}
                          className="flex-1 h-1.5 cursor-pointer"
                        />
                        <span className="w-8 tabular-nums">
                          {Math.floor((musicState.duration || 210) / 60)}:
                          {String(Math.floor((musicState.duration || 210) % 60)).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Volume Slider & Quick Lyrics/Sing Shortcut */}
                      <div className="flex items-center justify-between gap-3 text-[10px]">
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="material-symbols-rounded text-xs text-white/70">
                            volume_up
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.02}
                            value={musicState.volume ?? 0.8}
                            onChange={(e) =>
                              window.dispatchEvent(
                                new CustomEvent('glassium-music-command', {
                                  detail: { action: 'set-volume', volume: Number(e.target.value) },
                                })
                              )
                            }
                            style={{ accentColor: resolvedAccentHex }}
                            className="w-24 h-1 cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openApp('synth', { payload: { tab: 'lyrics' } })}
                            className="px-2 py-0.5 rounded-md bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 font-bold cursor-pointer"
                          >
                            歌詞・Singカラオケ →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* 3. TOP WEATHER & PRECIPITATION ALERT PILL (#2) */}
        <AnimatePresence>
          {weatherPillState?.active && !weatherPillDismissed && (
            <motion.div
              key="os-top-weather-pill"
              initial={{ y: -45, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -35, opacity: 0, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <div
                onClick={() => openApp('weather')}
                className="cursor-pointer px-3.5 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-950/95 backdrop-blur-2xl border border-sky-400/45 shadow-[0_8px_24px_rgba(56,189,248,0.22)] flex items-center gap-2 text-xs text-white transition"
                title="クリックして天気・雨雲レーダーを開く"
              >
                <Icon name="CloudRain" size={13} className="text-sky-300 shrink-0" />
                <span className="text-[11px] font-bold text-sky-100 truncate max-w-[230px]">
                  {weatherPillState.alertMessage}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWeatherPillDismissed(true);
                  }}
                  className="w-4 h-4 rounded-full hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center"
                  title="閉じる"
                >
                  <Icon name="X" size={10} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. TOP GARAGEBAND RECORDING / PLAYBACK PILL (#2) */}
        <AnimatePresence>
          {garageBandPillState &&
            !garageBandPillDismissed &&
            (garageBandPillState.isPlaying ||
              garageBandPillState.isRecording ||
              windows.some((w) => w.appId === 'garageband')) && (
              <motion.div
                key="os-top-garageband-pill"
                initial={{ y: -45, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -35, opacity: 0, scale: 0.9 }}
                className="pointer-events-auto"
              >
                <div
                  onClick={() => openApp('garageband')}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-full backdrop-blur-2xl border flex items-center gap-2.5 text-xs text-white shadow-2xl transition ${
                    garageBandPillState.isRecording
                      ? 'bg-rose-950/90 border-rose-400/70 shadow-[0_8px_28px_rgba(244,63,94,0.35)]'
                      : 'bg-slate-950/85 border-amber-400/45'
                  }`}
                  title="クリックして GarageBand Studio を表示"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      garageBandPillState.isRecording
                        ? 'bg-rose-500 animate-ping'
                        : garageBandPillState.isPlaying
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                    {garageBandPillState.isRecording ? 'GB REC' : 'GARAGEBAND'}
                  </span>
                  <span className="text-[11px] font-bold text-white truncate max-w-[130px]">
                    {garageBandPillState.instrumentName} · Bar {garageBandPillState.currentBar}
                  </span>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 border-l border-white/15 pl-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('glassium-garageband-command', {
                            detail: { action: 'toggle-play' },
                          })
                        )
                      }
                      className="px-2 py-0.5 rounded-full bg-white text-slate-950 text-[10px] font-black cursor-pointer"
                    >
                      {garageBandPillState.isPlaying ? '停止' : '再生'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('glassium-garageband-command', {
                            detail: { action: 'export-to-music' },
                          })
                        )
                      }
                      className="px-2 py-0.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-bold cursor-pointer"
                      title="GarageBandの曲をMusicアプリへワンクリック書き出し"
                    >
                      🎵 Musicへ送る
                    </button>
                    <button
                      type="button"
                      onClick={() => setGarageBandPillDismissed(true)}
                      className="w-4 h-4 rounded-full hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center"
                    >
                      <Icon name="X" size={10} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* ========================================================
          OS-LEVEL FLOATING BOTTOM DOCK MUSIC BAR (GlassiumOS Liquid Glass Dock)
          Fixed at bottom of screen with real-time artwork-pattern moving gradient
         ======================================================== */}
      <AnimatePresence>
        {musicState?.isPlaying && !pillDismissed && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-14 sm:bottom-16 left-1/2 z-[4200] max-w-[94vw] w-auto pointer-events-auto"
            style={{
              transform: `translate3d(calc(-50% + ${desktopPillOffset.x}px), ${desktopPillOffset.y}px, 0)`,
              transition: isDraggingDesktopPill ? 'none' : undefined,
            }}
          >
            {desktopPillMinimized ? (
              <div
                onPointerDown={handleDesktopPillPointerDown}
                onPointerMove={handleDesktopPillPointerMove}
                onPointerUp={handleDesktopPillPointerUp}
                onPointerCancel={handleDesktopPillPointerUp}
                className="relative group px-3 py-1.5 rounded-2xl liquid-glass-music-dock liquid-glass-window overflow-hidden flex items-center gap-2.5 cursor-grab active:cursor-grabbing shadow-2xl"
                title="ドラッグして移動 / 展開ボタンで元のサイズへ"
              >
                <span className="material-symbols-rounded text-xs text-white/50 select-none">
                  drag_indicator
                </span>
                <button
                  type="button"
                  data-no-dock-drag="true"
                  onClick={() => openApp('synth')}
                  className="w-7 h-7 rounded-lg overflow-hidden bg-slate-800 border border-white/25 shrink-0"
                >
                  {musicState.artworkUrl ? (
                    <img src={musicState.artworkUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-rounded text-cyan-400 text-sm">music_note</span>
                  )}
                </button>
                <span className="text-xs font-bold text-white truncate max-w-[130px]">
                  {musicState.title || 'Playing'}
                </span>
                <button
                  type="button"
                  data-no-dock-drag="true"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('glassium-music-command', { detail: { action: 'toggle-play' } })
                    )
                  }
                  className="w-7 h-7 rounded-lg bg-white text-slate-950 flex items-center justify-center"
                >
                  <span className="material-symbols-rounded text-base">
                    {musicState.isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button
                  type="button"
                  data-no-dock-drag="true"
                  onClick={() => setDesktopPillMinimized(false)}
                  className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
                  title="展開"
                >
                  <span className="material-symbols-rounded text-xs">open_in_full</span>
                </button>
                <button
                  type="button"
                  data-no-dock-drag="true"
                  onClick={() => setPillDismissed(true)}
                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-rose-500/40 text-white/70 hover:text-white flex items-center justify-center"
                  title="再生中でもピルを消す"
                >
                  <span className="material-symbols-rounded text-xs">close</span>
                </button>
              </div>
            ) : (
              <div
                onPointerDown={handleDesktopPillPointerDown}
                onPointerMove={handleDesktopPillPointerMove}
                onPointerUp={handleDesktopPillPointerUp}
                onPointerCancel={handleDesktopPillPointerUp}
                className="relative group px-4 py-2.5 rounded-2xl liquid-glass-music-dock liquid-glass-window overflow-hidden flex flex-col gap-1.5 transition cursor-grab active:cursor-grabbing"
              >
                {/* Real-Time Moving Artwork-Pattern Gradient Behind the Liquid Glass Dock */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-70">
                  <div
                    className="absolute -inset-6 blur-2xl opacity-60 artwork-dock-underglow transition-all duration-1000"
                    style={{
                      background: `linear-gradient(125deg, ${
                        musicState.palette?.c1 || '#fa243c'
                      } 0%, ${musicState.palette?.c2 || '#8b5cf6'} 35%, ${
                        musicState.palette?.c3 || '#06b6d4'
                      } 70%, ${musicState.palette?.c4 || '#f59e0b'} 100%)`,
                    }}
                  />
                  {musicState.artworkUrl && (
                    <>
                      <img
                        src={musicState.artworkUrl}
                        alt=""
                        className="absolute -top-1/2 -left-1/4 w-[85%] h-[220%] object-cover blur-[32px] saturate-[2.4] opacity-45 artwork-fluid-orb-1"
                      />
                      <img
                        src={musicState.artworkUrl}
                        alt=""
                        className="absolute -bottom-1/2 -right-1/4 w-[85%] h-[220%] object-cover blur-[36px] saturate-[2.4] opacity-40 artwork-fluid-orb-2 mix-blend-screen"
                      />
                    </>
                  )}
                  <div className="absolute inset-0 bg-slate-950/45" />
                </div>

                <div className="relative z-10 flex items-center gap-3">
                  <span
                    className="material-symbols-rounded text-sm text-white/45 select-none"
                    title="ドラッグしてピルを移動"
                  >
                    drag_indicator
                  </span>

                  {/* Artwork Thumbnail / Clickable to open SynthVisualizer */}
                  <button
                    type="button"
                    data-no-dock-drag="true"
                    onClick={() => openApp('synth')}
                    title="Music プレイヤーを開く"
                    className="relative z-10 w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-white/25 shrink-0 shadow-[0_6px_16px_rgba(0,0,0,0.5)] group-hover:scale-105 transition flex items-center justify-center cursor-pointer"
                  >
                    {musicState.artworkUrl ? (
                      <img
                        src={musicState.artworkUrl}
                        alt={musicState.title || 'Track Artwork'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-rounded text-cyan-400 text-lg">music_note</span>
                    )}
                  </button>

                  {/* Title, Artist, & Realtime Synchronized Lyric Line */}
                  <div
                    data-no-dock-drag="true"
                    onClick={() => openApp('synth')}
                    className="relative z-10 min-w-0 max-w-[180px] sm:max-w-[290px] cursor-pointer flex flex-col justify-center"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-bold text-white tracking-tight truncate">
                        {musicState.title || 'Playing Track'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openApp('synth', { payload: { tab: 'artist' } });
                          setTimeout(() => {
                            window.dispatchEvent(
                              new CustomEvent('glassium-music-command', {
                                detail: {
                                  action: 'open-artist',
                                  artist: musicState.artist || 'YOASOBI',
                                },
                              })
                            );
                          }, 80);
                        }}
                        className="text-[11px] text-white/85 hover:text-[#fa243c] hover:underline truncate font-semibold"
                        title="アーティストページを開く"
                      >
                        · {musicState.artist || 'Official Artist'}
                      </button>
                    </div>
                    {musicState.lyricLine ? (
                      <span className="text-[10.5px] text-white/85 font-medium truncate flex items-center gap-1">
                        <span className="material-symbols-rounded text-[13px] text-rose-400">lyrics</span>
                        <span className="truncate">{musicState.lyricLine}</span>
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-white/50 truncate block">
                        {musicState.album || 'Lossless Hi-Fi Stream'}
                      </span>
                    )}
                  </div>

                  {/* Quick MV / Artist / Transport Buttons inside Liquid Glass Dock */}
                  <div
                    data-no-dock-drag="true"
                    className="relative z-10 flex items-center gap-1 shrink-0 border-l border-white/15 pl-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => openApp('synth', { payload: { tab: 'mv' } })}
                      title="MVを開く"
                      className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-[16px]">smart_display</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openApp('synth', { payload: { tab: 'artist' } });
                        setTimeout(() => {
                          window.dispatchEvent(
                            new CustomEvent('glassium-music-command', {
                              detail: {
                                action: 'open-artist',
                                artist: musicState.artist || 'YOASOBI',
                              },
                            })
                          );
                        }, 80);
                      }}
                      title="アーティストページ"
                      className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-[16px]">person</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('glassium-music-command', { detail: { action: 'prev' } })
                        )
                      }
                      title="前の曲"
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 active:scale-90 transition cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-[19px]">skip_previous</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('glassium-music-command', { detail: { action: 'toggle-play' } })
                        )
                      }
                      title={musicState.isPlaying ? '一時停止' : '再生'}
                      className="w-8 h-8 rounded-xl bg-white text-slate-950 flex items-center justify-center font-bold shadow-[0_6px_18px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition cursor-pointer"
                    >
                      <span
                        className="material-symbols-rounded text-[20px] leading-none"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                      >
                        {musicState.isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('glassium-music-command', { detail: { action: 'next' } })
                        )
                      }
                      title="次の曲"
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 active:scale-90 transition cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-[19px]">skip_next</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDesktopPillMinimized(true)}
                      title="ミニピルに最小化"
                      className="ml-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-white/65 hover:text-white hover:bg-white/15 transition cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-[15px]">close_fullscreen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPillDismissed(true)}
                      title="ドックを隠す (バックグラウンド再生は継続)"
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-[15px]">close</span>
                    </button>
                  </div>
                </div>

                {/* Liquid Glass Dock Progress Bar */}
                <div className="relative z-10 w-full h-1 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full transition-all duration-150"
                    style={{
                      width: `${Math.min(
                        100,
                        ((musicState.currentTime || 0) / Math.max(1, musicState.duration || 210)) * 100
                      )}%`,
                      background: `linear-gradient(90deg, ${
                        musicState.palette?.c1 || '#fa243c'
                      }, ${musicState.palette?.c2 || '#a855f7'}, ${
                        musicState.palette?.c3 || '#06b6d4'
                      })`,
                    }}
                  />
                </div>
              </div>
            )}
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
        userAvatar={user?.avatar}
      />

      {/* Initial Setup Wizard (First Launch Account, Theme, UI Style, Accent, & Password) */}
      <AnimatePresence>
        {setupWizardOpen && (
          <InitialSetupWizard
            initialUser={user}
            initialUiStyle={uiStyle}
            initialTheme={theme}
            initialAccent={accentColor}
            onComplete={(result: InitialSetupResult) => {
              setUser(result.user);
              setUiStyle(result.uiStyle);
              setTheme(result.theme);
              setAccentColor(result.accentColor);
              localStorage.setItem('glassium_setup_completed', 'true');
              setSetupWizardOpen(false);
              triggerDynamicIsland('Setup Complete', `ようこそ、${result.user.name}さん`, 'Sparkles');
            }}
          />
        )}
      </AnimatePresence>

      {/* Spotlight Command Palette (Ctrl+K), Tile Group Memory & Always-on-Top PiP Video Player */}
      <DesktopOverlaySuite />
    </div>
  );
}
