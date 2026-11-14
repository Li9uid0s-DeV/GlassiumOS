import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOS } from './OSContext';
import { AppId } from './types';
import { Icon } from './Icon';
import { AppLogo } from './AppLogo';
import {
  GLASISPECT_MATERIALS,
  Glassium6BetaConfig,
  loadGlassium6BetaConfig,
  materialAcousticSynth,
  buildGlasispectSurfaceStyle,
} from './glasispectMaterialEngine';

export const PINNABLE_APPS_CATALOG: { appId: AppId; labelJa: string; labelEn: string; icon: string }[] = [
  { appId: 'browser', labelJa: 'ブラウザ', labelEn: 'Browser', icon: 'browser' },
  { appId: 'entertainment', labelJa: 'エンタメ (動画・映画)', labelEn: 'Entertainment', icon: 'entertainment' },
  { appId: 'synth', labelJa: 'ミュージック', labelEn: 'Music', icon: 'synth' },
  { appId: 'notepad', labelJa: 'エディタ・メモ', labelEn: 'Editor', icon: 'notepad' },
  { appId: 'terminal', labelJa: 'ターミナル', labelEn: 'Terminal', icon: 'terminal' },
  { appId: 'explorer', labelJa: 'ファイル', labelEn: 'Files', icon: 'explorer' },
  { appId: 'calculator', labelJa: '電卓', labelEn: 'Calculator', icon: 'calculator' },
  { appId: 'weather', labelJa: '天気', labelEn: 'Weather', icon: 'weather' },
  { appId: 'calendar', labelJa: 'カレンダー', labelEn: 'Calendar', icon: 'calendar' },
  { appId: 'clock', labelJa: '時計・タイマー', labelEn: 'Clock', icon: 'clock' },
  { appId: 'game', labelJa: 'ゲーム', labelEn: 'Games', icon: 'game' },
  { appId: 'paint', labelJa: 'ペイントスタジオ', labelEn: 'Paint Studio', icon: 'paint' },
  { appId: 'studio', labelJa: 'Glassium Studio', labelEn: 'Studio', icon: 'studio' },
  { appId: 'taskmanager', labelJa: 'タスクマネージャー', labelEn: 'Task Manager', icon: 'taskmanager' },
  { appId: 'appstore', labelJa: 'アプリストア', labelEn: 'App Store', icon: 'appstore' },
  { appId: 'ai', labelJa: 'AI アシスタント', labelEn: 'AI Assistant', icon: 'ai' },
  { appId: 'settings', labelJa: '設定', labelEn: 'Settings', icon: 'settings' },
];

const CURATED_NEWS_ITEMS = [
  {
    id: 'n1',
    category: 'Technology',
    title: 'GlassiumOS 6 future (BETA) — Glasispect UI 2: Material 光学・音響エンジン公開',
    summary: 'マウスカーソルを光源としたリアルタイム乱反射と、12種の宝石・自然マテリアルによるプロシージャル音響合成を搭載。',
    time: '10分前',
  },
  {
    id: 'n2',
    category: 'Design',
    title: 'Cloud / Fog タスクバーと Side Dock カスタマイズ機能がベータ提供開始',
    summary: 'マウスを下部に移動すると雲が凝結して現れる Cloud/Fog モードや、最大9個のアプリ固定・AI/News/検索表示切替に対応。',
    time: '32分前',
  },
  {
    id: 'n3',
    category: 'Science',
    title: '次世代メタマテリアル光学シミュレーションとブラウザ Web Audio 物理音源の融合',
    summary: 'ルビー・サファイア・ダイヤモンドなどの屈折率と、鉄・革・水・氷・葉・木の摩擦音響特性をリアルタイム再現。',
    time: '1時間前',
  },
  {
    id: 'n4',
    category: 'Entertainment',
    title: 'Bing 日替わり自然壁紙がマルチCDN対応でデスクトップ＆ロック画面に完全対応',
    summary: 'GitHub Pages や Google Apps Script 環境でも途切れない高精細ネイチャーフォト配信を実現。',
    time: '2時間前',
  },
];

/**
 * Global Mouse Light Source & Diffuse Reflection + Material Sound Controller
 */
export const Glassium6MaterialLightOverlay: React.FC = () => {
  const { volume, soundEnabled } = useOS();
  const [cfg, setCfg] = useState<Glassium6BetaConfig>(() => loadGlassium6BetaConfig());
  const [cursor, setCursor] = useState<{ x: number; y: number; speed: number; isDown: boolean }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 600,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    speed: 0,
    isDown: false,
  });
  const lastPosRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    const onCfgChange = () => setCfg(loadGlassium6BetaConfig());
    window.addEventListener('glassium6-beta-config-changed', onCfgChange);
    return () => window.removeEventListener('glassium6-beta-config-changed', onCfgChange);
  }, []);

  useEffect(() => {
    const isMaterialActive =
      cfg.betaEnabled ||
      cfg.uiDesignStyle === 'glasispect-material' ||
      (cfg.taskbarVariant !== 'glassium5-default' && cfg.dockSurfaceStyle === 'glasispect-material');

    if (!isMaterialActive) return;

    const handlePointerDown = () => {
      setCursor((prev) => ({ ...prev, isDown: true }));
      if (soundEnabled && cfg.materialSoundEnabled) {
        materialAcousticSynth.playClick(cfg.activeMaterial, volume / 100);
      }
    };

    const handlePointerUp = () => {
      setCursor((prev) => ({ ...prev, isDown: false, speed: 0 }));
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(1, now - lastPosRef.current.t);
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const dist = Math.hypot(dx, dy);
      const speed = (dist / dt) * 16;
      lastPosRef.current = { x: e.clientX, y: e.clientY, t: now };

      setCursor((prev) => ({
        x: e.clientX,
        y: e.clientY,
        speed,
        isDown: prev.isDown,
      }));

      // Play material friction/drag sound when dragging with mouse button pressed
      if (e.buttons > 0 && dist > 4 && soundEnabled && cfg.materialSoundEnabled) {
        materialAcousticSynth.playDrag(cfg.activeMaterial, dist, volume / 100);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [
    cfg.betaEnabled,
    cfg.uiDesignStyle,
    cfg.taskbarVariant,
    cfg.dockSurfaceStyle,
    cfg.activeMaterial,
    cfg.materialSoundEnabled,
    soundEnabled,
    volume,
  ]);

  if (!cfg.betaEnabled || cfg.uiDesignStyle !== 'glasispect-material') {
    return null;
  }

  const mat = GLASISPECT_MATERIALS[cfg.activeMaterial] || GLASISPECT_MATERIALS.sapphire;
  const [r1, g1, b1] = mat.rgb;
  const [r2, g2, b2] = mat.secondaryRgb;
  const intensity = (cfg.diffuseLightIntensity / 100) * mat.specularIntensity;
  const lobeCount = mat.scatterLobes;

  return (
    <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden select-none">
      {/* Primary Mouse Light Source Core + Diffuse Scatter Halo */}
      <div
        style={{
          left: cursor.x,
          top: cursor.y,
          width: Math.round(320 + mat.roughness * 260),
          height: Math.round(320 + mat.roughness * 260),
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, rgba(255,255,255,${(0.22 * intensity).toFixed(3)}) 0%, rgba(${r2},${g2},${b2},${(0.18 * intensity).toFixed(3)}) 28%, rgba(${r1},${g1},${b1},${(0.08 * intensity).toFixed(3)}) 58%, transparent 78%)`,
          mixBlendMode: 'screen',
        }}
        className="fixed rounded-full transition-transform duration-75"
      />

      {/* Multi-lobe Diffuse Reflection Rays / Caustics around the Mouse Light Source */}
      {Array.from({ length: lobeCount }).map((_, idx) => {
        const angleRad = (idx * (Math.PI * 2)) / lobeCount + (cursor.x + cursor.y) * 0.0025;
        const radius = (42 + idx * 14) * (1 - mat.roughness * 0.35);
        const lx = cursor.x + Math.cos(angleRad) * radius;
        const ly = cursor.y + Math.sin(angleRad) * radius;
        const size = Math.round(28 + (idx % 3) * 18 + mat.roughness * 36);
        return (
          <div
            key={idx}
            style={{
              left: lx,
              top: ly,
              width: size,
              height: size,
              transform: `translate(-50%, -50%) rotate(${Math.round((angleRad * 180) / Math.PI)}deg)`,
              background:
                mat.id === 'diamond'
                  ? `radial-gradient(circle, rgba(${idx % 2 === 0 ? '56,189,248' : '244,114,182'},${(0.28 * intensity).toFixed(3)}) 0%, transparent 72%)`
                  : `radial-gradient(circle, rgba(${r2},${g2},${b2},${(0.24 * intensity).toFixed(3)}) 0%, rgba(${r1},${g1},${b1},${(0.08 * intensity).toFixed(3)}) 55%, transparent 75%)`,
              borderRadius: mat.surfacePattern === 'facets' ? '22%' : '9999px',
              mixBlendMode: 'screen',
            }}
            className="fixed"
          />
        );
      })}
    </div>
  );
};

interface Glassium6TaskbarRendererProps {
  cfg: Glassium6BetaConfig;
  onStartClick: (btnEl: HTMLButtonElement | null) => void;
  startOpen: boolean;
  onToggleTray: () => void;
  trayOpen: boolean;
  timeStr: string;
  dateStr: string;
}

export const Glassium6TaskbarRenderer: React.FC<Glassium6TaskbarRendererProps> = ({
  cfg,
  onStartClick,
  startOpen,
  onToggleTray,
  trayOpen,
  timeStr,
  dateStr,
}) => {
  const {
    windows,
    openApp,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    activeDesktopId,
    theme,
    volume,
    soundEnabled,
    quickSettings,
  } = useOS();

  const isLight = theme === 'light';
  const currentDesktopWindows = windows.filter(
    (w) => !w.desktopId || w.desktopId === activeDesktopId
  );

  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 500, y: 40 });
  const [isMouseRevealed, setIsMouseRevealed] = useState<boolean>(cfg.autoHideMode === 'always');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [newsOpen, setNewsOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);

  const variant = cfg.taskbarVariant;
  const isVertical = variant === 'side-dock' || variant === 'sidebar';
  const isCloudFog = variant === 'cloud-fog';

  // Track mouse movement for Cloud/Fog gathering, auto-hide revealing, and Glasispect diffuse light
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        setMousePos({ x: e.clientX, y: e.clientY });
      }

      if (isCloudFog) {
        // Cloud/Fog always condenses when mouse moves toward bottom
        const nearBottom = e.clientY >= window.innerHeight - 85;
        if (nearBottom || startOpen || trayOpen || newsOpen || searchOpen) {
          setIsMouseRevealed(true);
        } else if (e.clientY < window.innerHeight - 135) {
          setIsMouseRevealed(false);
        }
        return;
      }

      if (cfg.autoHideMode === 'always') {
        setIsMouseRevealed(true);
        return;
      }

      // Auto-hide mode ('mouse-bottom')
      const nearBottom = e.clientY >= window.innerHeight - 48;
      const nearLeft = isVertical && cfg.sidePosition === 'left' && e.clientX <= 48;
      const nearRight =
        isVertical && cfg.sidePosition === 'right' && e.clientX >= window.innerWidth - 48;

      if (nearBottom || nearLeft || nearRight || startOpen || trayOpen || newsOpen || searchOpen) {
        setIsMouseRevealed(true);
      } else if (
        e.clientY < window.innerHeight - 110 &&
        (!isVertical ||
          (cfg.sidePosition === 'left' && e.clientX > 110) ||
          (cfg.sidePosition === 'right' && e.clientX < window.innerWidth - 110))
      ) {
        setIsMouseRevealed(false);
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, [
    isCloudFog,
    cfg.autoHideMode,
    isVertical,
    cfg.sidePosition,
    startOpen,
    trayOpen,
    newsOpen,
    searchOpen,
  ]);

  const handleAppLaunchOrToggle = (appId: AppId) => {
    if (soundEnabled && cfg.materialSoundEnabled && cfg.dockSurfaceStyle === 'glasispect-material') {
      materialAcousticSynth.playClick(cfg.activeMaterial, volume / 100);
    }
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

  const pinnedAppsList = cfg.pinnedApps.slice(0, 9);
  const mat = GLASISPECT_MATERIALS[cfg.activeMaterial] || GLASISPECT_MATERIALS.sapphire;
  const useGlasispectSurface = cfg.dockSurfaceStyle === 'glasispect-material';
  const glasispectStyle = useGlasispectSurface
    ? buildGlasispectSurfaceStyle(mat, mousePos.x, mousePos.y, cfg.diffuseLightIntensity, isLight)
    : null;

  const filteredSearch = PINNABLE_APPS_CATALOG.filter(
    (a) =>
      !searchText.trim() ||
      a.labelJa.toLowerCase().includes(searchText.toLowerCase()) ||
      a.labelEn.toLowerCase().includes(searchText.toLowerCase()) ||
      a.appId.toLowerCase().includes(searchText.toLowerCase())
  ).slice(0, 6);

  // ==========================================================================
  // 1. CLOUD / FOG TASKBAR (マウスを下に移動すると雲が集まってきてタスクバーになる)
  // ==========================================================================
  if (isCloudFog) {
    const gatherSec = cfg.cloudGatherSpeed;
    const opacityVal = cfg.cloudOpacity / 100;
    const cloudHex = cfg.cloudColor || '#38bdf8';

    return (
      <>
        {/* Bottom hover sensor strip */}
        <div
          className="fixed bottom-0 inset-x-0 h-6 z-[4999]"
          onMouseEnter={() => setIsMouseRevealed(true)}
        />

        <div
          ref={barRef}
          onMouseEnter={() => setIsMouseRevealed(true)}
          className={`fixed bottom-0 inset-x-0 h-20 z-[5000] flex items-end justify-center pb-3 pointer-events-none select-none`}
        >
          {/* Gathering Cloud / Fog Layers */}
          <div
            style={{
              transitionDuration: `${gatherSec}s`,
              opacity: isMouseRevealed ? opacityVal : 0,
              transform: isMouseRevealed ? 'translateY(0) scale(1)' : 'translateY(38px) scale(0.88)',
            }}
            className="pointer-events-auto relative px-7 py-2.5 rounded-full flex items-center gap-3 transition-all ease-out"
          >
            {/* Volumetric Cloud Puffs Behind Taskbar */}
            <div
              style={{
                background: `radial-gradient(ellipse at 50% 60%, ${cloudHex}88 0%, ${cloudHex}33 52%, transparent 80%)`,
                transitionDuration: `${gatherSec}s`,
                transform: isMouseRevealed ? 'translateX(0) scale(1.12)' : 'translateX(-120px) scale(0.5)',
              }}
              className="pointer-events-none absolute -inset-x-10 -inset-y-4 rounded-full blur-2xl transition-all"
            />
            <div
              style={{
                background: `radial-gradient(circle at 25% 50%, rgba(255,255,255,0.55) 0%, ${cloudHex}55 45%, transparent 75%)`,
                transitionDuration: `${gatherSec * 1.1}s`,
                transform: isMouseRevealed ? 'translateX(0) scale(1)' : 'translateX(-90px) translateY(20px) scale(0.4)',
              }}
              className="pointer-events-none absolute -left-8 -top-3 w-44 h-16 rounded-full blur-xl transition-all"
            />
            <div
              style={{
                background: `radial-gradient(circle at 75% 50%, rgba(255,255,255,0.55) 0%, ${cloudHex}55 45%, transparent 75%)`,
                transitionDuration: `${gatherSec * 1.1}s`,
                transform: isMouseRevealed ? 'translateX(0) scale(1)' : 'translateX(90px) translateY(20px) scale(0.4)',
              }}
              className="pointer-events-none absolute -right-8 -top-3 w-44 h-16 rounded-full blur-xl transition-all"
            />
            <div
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.26) 0%, ${cloudHex}44 100%)`,
                boxShadow: `0 12px 42px ${cloudHex}55, inset 0 2px 6px rgba(255,255,255,0.65)`,
                border: '1px solid rgba(255,255,255,0.45)',
              }}
              className="absolute inset-0 rounded-full backdrop-blur-2xl"
            />

            {/* Start Button */}
            <button
              ref={startBtnRef}
              type="button"
              onClick={() => onStartClick(startBtnRef.current)}
              className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition cursor-pointer"
              title="Start"
            >
              <AppLogo size={22} glow={startOpen} />
            </button>

            <div className="relative z-10 h-5 w-px bg-white/30" />

            {/* Core Fixed Cloud Taskbar Icons (Detailed customization intentionally disabled per spec) */}
            <div className="relative z-10 flex items-center gap-2">
              {(['browser', 'entertainment', 'synth', 'notepad', 'explorer', 'weather', 'settings'] as AppId[]).map(
                (appId) => {
                  const wins = currentDesktopWindows.filter((w) => w.appId === appId);
                  const active = wins.length > 0;
                  return (
                    <button
                      key={appId}
                      type="button"
                      onClick={() => handleAppLaunchOrToggle(appId)}
                      className="relative w-10 h-10 rounded-full flex items-center justify-center hover:-translate-y-1 hover:scale-110 active:scale-95 transition cursor-pointer"
                      title={appId}
                    >
                      <Icon name={appId} size={22} />
                      {active && (
                        <span
                          style={{ backgroundColor: cloudHex }}
                          className="absolute -bottom-0.5 w-2 h-1 rounded-full shadow"
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            <div className="relative z-10 h-5 w-px bg-white/30" />

            {/* Cloud Clock & Tray */}
            <button
              type="button"
              onClick={onToggleTray}
              className="relative z-10 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition"
            >
              <Icon name="Cloud" size={14} />
              <span>{timeStr}</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  // ==========================================================================
  // 2. DOCK / SIDE DOCK / TASKBAR / SIDEBAR
  // Supports Glass UI (従来) or Glasispect UI 2: Material + Max 9 Pinned Apps + AI / News / Search toggles
  // ==========================================================================

  const containerPositionClasses = (() => {
    if (variant === 'dock') {
      return `fixed bottom-3 left-1/2 -translate-x-1/2 z-[5000] rounded-3xl px-3.5 py-2 flex items-center gap-2 transition-all duration-300 ${
        isMouseRevealed ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
      }`;
    }
    if (variant === 'side-dock') {
      const isLeft = cfg.sidePosition === 'left';
      return `fixed top-1/2 -translate-y-1/2 ${
        isLeft ? 'left-3' : 'right-3'
      } z-[5000] rounded-3xl py-3.5 px-2 flex flex-col items-center gap-2 transition-all duration-300 ${
        isMouseRevealed
          ? 'translate-x-0 opacity-100'
          : isLeft
          ? '-translate-x-20 opacity-0 pointer-events-none'
          : 'translate-x-20 opacity-0 pointer-events-none'
      }`;
    }
    if (variant === 'sidebar') {
      const isLeft = cfg.sidePosition === 'left';
      return `fixed inset-y-0 ${
        isLeft ? 'left-0 border-r' : 'right-0 border-l'
      } z-[5000] w-16 py-3 px-1.5 flex flex-col items-center justify-between transition-all duration-300 ${
        isMouseRevealed
          ? 'translate-x-0 opacity-100'
          : isLeft
          ? '-translate-x-full opacity-0 pointer-events-none'
          : 'translate-x-full opacity-0 pointer-events-none'
      }`;
    }
    // variant === 'taskbar' (Dockと一緒、形が違うだけ — 横幅いっぱいのバー形状)
    return `fixed bottom-0 inset-x-0 h-12 z-[5000] px-4 flex items-center justify-between border-t transition-all duration-300 ${
      isMouseRevealed ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
    }`;
  })();

  const glassDefaultClasses = isLight
    ? 'bg-white/80 backdrop-blur-2xl border border-slate-300/80 text-slate-900 shadow-2xl'
    : 'bg-slate-950/80 backdrop-blur-2xl border border-white/15 text-white shadow-[0_20px_60px_rgba(0,0,0,0.65)]';

  return (
    <>
      {/* Edge Hover Sensor when autoHideMode === 'mouse-bottom' */}
      {cfg.autoHideMode === 'mouse-bottom' && (
        <div
          onMouseEnter={() => setIsMouseRevealed(true)}
          className={
            isVertical
              ? `fixed inset-y-0 ${cfg.sidePosition === 'left' ? 'left-0' : 'right-0'} w-3 z-[4999]`
              : 'fixed bottom-0 inset-x-0 h-3 z-[4999]'
          }
        />
      )}

      {/* Search Popover (when Search UI is enabled & clicked in vertical/compact docks) */}
      <AnimatePresence>
        {cfg.showSearchUI && searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            style={useGlasispectSurface && glasispectStyle ? glasispectStyle : undefined}
            className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-[5300] w-80 sm:w-96 rounded-3xl p-3.5 backdrop-blur-3xl border shadow-2xl ${
              isLight ? 'bg-white/95 border-slate-300 text-slate-900' : 'bg-slate-950/95 border-white/20 text-white'
            }`}
          >
            <div className="flex items-center gap-2 pb-2.5 border-b border-current/10">
              <Icon name="Search" size={15} className="text-cyan-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="アプリを検索して起動..."
                autoFocus
                className="flex-1 bg-transparent text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="opacity-60 hover:opacity-100 cursor-pointer"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {filteredSearch.map((item) => (
                <button
                  key={item.appId}
                  type="button"
                  onClick={() => {
                    handleAppLaunchOrToggle(item.appId);
                    setSearchOpen(false);
                    setSearchText('');
                  }}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/10 text-left text-xs font-bold transition cursor-pointer"
                >
                  <Icon name={item.appId} size={20} />
                  <span>{item.labelJa}</span>
                  <span className="text-[10px] opacity-50 ml-auto font-mono">{item.labelEn}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* News Flyout Panel (when News Button is enabled & clicked) */}
      <AnimatePresence>
        {cfg.showNewsButton && newsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            style={useGlasispectSurface && glasispectStyle ? glasispectStyle : undefined}
            className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-[5300] w-[360px] sm:w-[420px] max-w-[92vw] rounded-3xl p-4 backdrop-blur-3xl border shadow-2xl space-y-3 ${
              isLight ? 'bg-white/95 border-slate-300 text-slate-900' : 'bg-slate-950/95 border-white/20 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b border-current/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Icon name="Globe" size={16} className="text-cyan-400" />
                <div>
                  <div className="text-xs font-black">Glassium News & Future Feed</div>
                  <div className="text-[10px] opacity-60">最新ニュース・アップデート速報</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {CURATED_NEWS_ITEMS.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-2xl bg-white/[0.06] border border-white/10 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] opacity-70">
                    <span className="font-mono font-bold text-cyan-300">{n.category}</span>
                    <span>{n.time}</span>
                  </div>
                  <div className="text-xs font-bold leading-snug">{n.title}</div>
                  <div className="text-[11px] opacity-75 leading-relaxed">{n.summary}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dock / Side Dock / Taskbar / Sidebar Surface */}
      <div
        ref={barRef}
        onMouseEnter={() => setIsMouseRevealed(true)}
        style={
          useGlasispectSurface && glasispectStyle
            ? {
                background: glasispectStyle.background,
                boxShadow: glasispectStyle.boxShadow,
                borderColor: glasispectStyle.borderColor,
              }
            : undefined
        }
        className={`${containerPositionClasses} ${glassDefaultClasses} backdrop-blur-3xl select-none`}
      >
        {/* ZONE 1: Start + Optional Search / News / AI */}
        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1.5`}>
          <button
            ref={startBtnRef}
            type="button"
            onClick={() => onStartClick(startBtnRef.current)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-white/15 active:scale-95 transition cursor-pointer"
            title="GlassiumOS Start"
          >
            <AppLogo size={21} glow={startOpen} />
          </button>

          {cfg.showSearchUI && (
            <>
              {variant === 'taskbar' ? (
                <div className="flex items-center gap-2 px-3 h-8 rounded-xl bg-black/25 border border-white/15 w-36 sm:w-48">
                  <Icon name="Search" size={13} className="opacity-65 shrink-0" />
                  <input
                    type="text"
                    value={searchText}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setSearchOpen(true);
                    }}
                    placeholder="検索..."
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen((v) => !v)}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                    searchOpen ? 'bg-cyan-400/25 text-cyan-300' : 'hover:bg-white/15'
                  }`}
                  title="アプリ検索 (Search UI)"
                >
                  <Icon name="Search" size={18} fluent={false} />
                </button>
              )}
            </>
          )}

          {cfg.showAIButton && (
            <button
              type="button"
              onClick={() => handleAppLaunchOrToggle('ai')}
              className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-white/15 active:scale-95 transition cursor-pointer"
              title="AI Assistant"
            >
              <Icon name="ai" size={22} />
            </button>
          )}

          {cfg.showNewsButton && (
            <button
              type="button"
              onClick={() => setNewsOpen((v) => !v)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                newsOpen ? 'bg-cyan-400/25 text-cyan-300 ring-1 ring-cyan-400/50' : 'hover:bg-white/15'
              }`}
              title="Glassium News フィード"
            >
              <Icon name="FileText" size={18} fluent={false} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div
          className={
            isVertical ? 'w-6 h-px bg-current/15 my-0.5' : 'h-6 w-px bg-current/15 mx-0.5'
          }
        />

        {/* ZONE 2: Up to 9 User-Pinned Apps */}
        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1.5`}>
          {pinnedAppsList.map((appId) => {
            const wins = currentDesktopWindows.filter((w) => w.appId === appId);
            const active = wins.length > 0;
            const anyVisible = wins.some((w) => !w.minimized);
            return (
              <button
                key={appId}
                type="button"
                onClick={() => handleAppLaunchOrToggle(appId)}
                className={`group relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
                  anyVisible
                    ? 'bg-white/20 shadow-inner scale-105'
                    : 'hover:bg-white/15 hover:scale-110 active:scale-95'
                }`}
                title={appId}
              >
                <Icon name={appId} size={23} />
                {active && (
                  <span
                    style={{ backgroundColor: useGlasispectSurface ? mat.colorHex : 'var(--os-accent)' }}
                    className={`absolute rounded-full transition-all ${
                      isVertical
                        ? `${cfg.sidePosition === 'left' ? 'left-0.5' : 'right-0.5'} w-1 ${
                            anyVisible ? 'h-4' : 'h-1.5'
                          }`
                        : `bottom-0.5 h-1 ${anyVisible ? 'w-4' : 'w-1.5'}`
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div
          className={
            isVertical ? 'w-6 h-px bg-current/15 my-0.5' : 'h-6 w-px bg-current/15 mx-0.5'
          }
        />

        {/* ZONE 3: Material Badge + System Tray & Clock */}
        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-2`}>
          {useGlasispectSurface && !isVertical && (
            <span
              style={{
                backgroundColor: `rgba(${mat.rgb.join(',')}, 0.24)`,
                borderColor: `rgba(${mat.secondaryRgb.join(',')}, 0.5)`,
              }}
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold tracking-tight"
              title={mat.propertiesJa}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: mat.colorHex }}
              />
              <span>{mat.nameJa}</span>
            </span>
          )}

          <button
            type="button"
            onClick={onToggleTray}
            className={`rounded-2xl hover:bg-white/15 transition cursor-pointer flex ${
              isVertical ? 'flex-col px-1.5 py-2 gap-1' : 'flex-row px-2.5 py-1.5 gap-2'
            } items-center`}
            title="クイックコントロール・時計"
          >
            <div className="flex items-center gap-1">
              <Icon
                name="Wifi"
                size={12}
                fluent={false}
                className={quickSettings.wifi ? 'text-cyan-400' : 'opacity-40'}
              />
              <Icon
                name={soundEnabled && volume > 0 ? 'Volume2' : 'VolumeX'}
                size={12}
                fluent={false}
                className={soundEnabled && volume > 0 ? 'text-cyan-400' : 'opacity-40'}
              />
            </div>
            <div className="text-center leading-tight">
              <div className="text-[11px] font-mono font-bold tabular-nums">{timeStr}</div>
              {!isVertical && <div className="text-[9px] opacity-60">{dateStr}</div>}
            </div>
          </button>
        </div>
      </div>
    </>
  );
};
