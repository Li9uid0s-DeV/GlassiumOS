import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS, Wallpaper, AuroraColor } from '../OSContext';
import {
  AppId,
  ShellMode,
  DesignEngine,
  LockScreenStyle,
  SleepClockStyle,
  SleepBackground,
  ClockPosition,
  DesktopIconSize,
  DESKTOP_ICON_SIZE_PRESETS,
  ACCENT_COLOR_PRESETS,
  ThemeMode,
  NebulaPreset,
} from '../types';
import {
  DynamicWorldWallpaperConfig,
  DYNAMIC_LOCATION_PRESETS,
  loadDynamicWorldConfig,
  saveDynamicWorldConfig,
} from '../DynamicWorldWallpaper';
import { WALLPAPERS } from '../wallpapers';
import { Icon } from '../Icon';
import { requestAIChat } from '../aiClient';
import {
  getBackendBaseUrl,
  setBackendBaseUrl,
  resolveBackendUrl,
  autoConnectBackendServer,
  getBackendConnectionState,
} from '../backendConfig';
import {
  DEFAULT_BING_WALLPAPERS,
  BingWallpaperItem,
  LockWallpaperConfig,
  LockWallpaperMode,
  fetchBingWallpapers,
  getDesktopBingIndex,
  setDesktopBingIndex,
  loadLockWallpaperConfig,
  saveLockWallpaperConfig,
  makeFallbackNatureSvgDataUri,
} from '../bingWallpaperService';
import {
  GLASISPECT_MATERIALS,
  GLASISPECT_MATERIAL_LIST,
  GlasispectMaterialId,
  Glassium6BetaConfig,
  TaskbarVariant as Glassium6TaskbarVariant,
  GlasispectIconStyle as Glassium6IconStyle,
  loadGlassium6BetaConfig,
  saveGlassium6BetaConfig,
  materialAcousticSynth,
} from '../glasispectMaterialEngine';
import { PINNABLE_APPS_CATALOG } from '../Glassium6BetaOverlay';

const WALLPAPER_KEYS = Object.keys(WALLPAPERS) as Wallpaper[];

type NavCategory = 'system' | 'personalization' | 'apps' | 'accounts';

type SystemSubView = 'main' | 'display' | 'sound' | 'power' | 'multitasking' | 'language' | 'aicomponents';
type PersonalizationSubView = 'main' | 'uistyle' | 'surface' | 'accent' | 'wallpaper' | 'glass';
type AccountsSubView = 'main' | 'profile' | 'security';

interface NavItem {
  id: NavCategory;
  labelJa: string;
  labelEn: string;
  icon: string;
  badgeGradient: string;
  iconColor: string;
}

const SIDEBAR_NAV: NavItem[] = [
  {
    id: 'system',
    labelJa: 'システム',
    labelEn: 'System',
    icon: 'Monitor',
    badgeGradient: 'from-sky-500/25 to-cyan-500/10 border-sky-400/25',
    iconColor: 'text-sky-400',
  },
  {
    id: 'personalization',
    labelJa: '個人用設定',
    labelEn: 'Personalization',
    icon: 'Palette',
    badgeGradient: 'from-fuchsia-500/25 to-rose-500/10 border-fuchsia-400/25',
    iconColor: 'text-fuchsia-400',
  },
  {
    id: 'apps',
    labelJa: 'アプリ',
    labelEn: 'Apps',
    icon: 'LayoutGrid',
    badgeGradient: 'from-emerald-500/25 to-teal-500/10 border-emerald-400/25',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'accounts',
    labelJa: 'アカウント',
    labelEn: 'Accounts',
    icon: 'User',
    badgeGradient: 'from-amber-500/25 to-orange-500/10 border-amber-400/25',
    iconColor: 'text-amber-400',
  },
];

interface SystemCard {
  id: SystemSubView;
  titleJa: string;
  titleEn: string;
  descJa: string;
  descEn: string;
  icon: string;
  badgeGradient: string;
  iconColor: string;
}

const SYSTEM_CARDS: SystemCard[] = [
  {
    id: 'display',
    titleJa: 'ディスプレイと背景',
    titleEn: 'Display & Wallpapers',
    descJa: 'オーロラライブ背景、Golden Sparkle、アイコンサイズ、グリッド整列',
    descEn: 'Live aurora backgrounds, Golden Sparkle, icon sizing, grid alignment',
    icon: 'Monitor',
    badgeGradient: 'from-cyan-500/25 via-sky-500/15 to-blue-600/10 border-cyan-400/30',
    iconColor: 'text-cyan-300',
  },
  {
    id: 'sound',
    titleJa: 'サウンド',
    titleEn: 'Sound',
    descJa: 'マスター音量とシステム効果音のバランス調整',
    descEn: 'Master volume and system sound effects',
    icon: 'Volume2',
    badgeGradient: 'from-emerald-500/25 via-teal-500/15 to-cyan-600/10 border-emerald-400/30',
    iconColor: 'text-emerald-300',
  },
  {
    id: 'power',
    titleJa: '電源とスリープ',
    titleEn: 'Power & Sleep',
    descJa: '画面スリープ、ロック画面スタイル、スリープ時計の配置',
    descEn: 'Screen sleep, lock screen style, sleep clock layout',
    icon: 'BatteryCharging',
    badgeGradient: 'from-amber-500/25 via-orange-500/15 to-yellow-600/10 border-amber-400/30',
    iconColor: 'text-amber-300',
  },
  {
    id: 'multitasking',
    titleJa: 'マルチタスクとタスクバー',
    titleEn: 'Multitasking & Taskbar',
    descJa: 'ウィンドウ左右スナップ整列、タスクバー配置、自動非表示',
    descEn: 'Split window snap, taskbar alignment, auto-hide behavior',
    icon: 'Layers',
    badgeGradient: 'from-violet-500/25 via-indigo-500/15 to-purple-600/10 border-violet-400/30',
    iconColor: 'text-violet-300',
  },
  {
    id: 'language',
    titleJa: '言語と地域',
    titleEn: 'Language & Region',
    descJa: 'システム全体の表示言語とローカライズ設定',
    descEn: 'System display language and regional formatting',
    icon: 'Globe',
    badgeGradient: 'from-blue-500/25 via-indigo-500/15 to-sky-600/10 border-blue-400/30',
    iconColor: 'text-blue-300',
  },
  {
    id: 'aicomponents',
    titleJa: 'AI アシスタント',
    titleEn: 'AI Assistant',
    descJa: 'OS操作の自動実行、応答スタイル、エンジンの接続診断',
    descEn: 'Automated OS actions, response style, and engine diagnostics',
    icon: 'Sparkles',
    badgeGradient: 'from-fuchsia-500/25 via-pink-500/15 to-rose-600/10 border-fuchsia-400/30',
    iconColor: 'text-fuchsia-300',
  },
];

const RESTORED_DEFAULT_LIVE2D_PALETTES: {
  id: AuroraColor;
  label: string;
  desc: string;
  cssGradient: string;
  accentWave: string;
}[] = [
  {
    id: 'golden-sparkle',
    label: 'Golden Sparkle',
    desc: 'PS5風 黄金の光の波・ボケ玉・4方向ダイヤモンドスパークル',
    cssGradient: 'linear-gradient(135deg, #060402 0%, #3b2306 38%, #d97706 74%, #fde047 100%)',
    accentWave: '#fde047',
  },
  {
    id: 'amethyst-cyan-silk',
    label: 'Amethyst & Cyan Silk',
    desc: 'GlassiumOS 4.7 復刻: マウス連動 S字シルクオーロラ',
    cssGradient: 'linear-gradient(135deg, #030712 0%, #0e7490 48%, #4c1d95 100%)',
    accentWave: '#38bdf8',
  },
  {
    id: 'abyssal-deep-ocean',
    label: 'Abyssal Deep Ocean',
    desc: 'GlassiumOS 4.7 復刻: 深海アビスブルーとアクア発光シルク',
    cssGradient: 'linear-gradient(135deg, #010916 0%, #062845 50%, #0284c7 100%)',
    accentWave: '#0ea5e9',
  },
  {
    id: 'polar-emerald-aurora',
    label: 'Polar Emerald Aurora',
    desc: 'GlassiumOS 4.7 復刻: 極地エメラルドとスカイブルーのオーロラ帯',
    cssGradient: 'linear-gradient(135deg, #011f18 0%, #059669 50%, #0369a1 100%)',
    accentWave: '#10b981',
  },
  {
    id: 'neon-cyber-dusk',
    label: 'Neon Cyber Dusk',
    desc: 'GlassiumOS 4.7 復刻: サイバーマゼンタ＆ネオンシアンの黄昏',
    cssGradient: 'linear-gradient(135deg, #090418 0%, #701a75 50%, #06b6d4 100%)',
    accentWave: '#e879f9',
  },
  {
    id: 'crimson-rose-nebula',
    label: 'Crimson Rose Nebula',
    desc: 'GlassiumOS 4.7 復刻: クリムゾンローズ星雲とアンバーシルク',
    cssGradient: 'linear-gradient(135deg, #1a0612 0%, #9f1239 50%, #d97706 100%)',
    accentWave: '#f43f5e',
  },
];

const AURORA_PALETTES: {
  id: AuroraColor;
  label: string;
  desc: string;
  cssGradient: string;
  accentWave: string;
}[] = [
  {
    id: 'golden-sparkle',
    label: 'Golden Sparkle',
    desc: 'Volumetric golden waves, warm bokeh orbs & diamond starlight sparkles',
    cssGradient: 'linear-gradient(135deg, #060402 0%, #3b2306 38%, #d97706 74%, #fde047 100%)',
    accentWave: '#fde047',
  },
  {
    id: 'cyan-violet',
    label: 'Cyan & Violet Silk',
    desc: 'Deep indigo night with cyan and violet aurora waves',
    cssGradient: 'linear-gradient(135deg, #020617 0%, #0e7490 50%, #4c1d95 100%)',
    accentWave: '#38bdf8',
  },
  {
    id: 'emerald-sky',
    label: 'Polar Emerald Sky',
    desc: 'Northern emerald curtains with sky-blue particles',
    cssGradient: 'linear-gradient(135deg, #022c22 0%, #059669 52%, #0369a1 100%)',
    accentWave: '#34d399',
  },
  {
    id: 'rose-gold',
    label: 'Crimson Rose Gold',
    desc: 'Warm rose nebula with amber gold silk ribbons',
    cssGradient: 'linear-gradient(135deg, #1f1224 0%, #be123c 50%, #d97706 100%)',
    accentWave: '#fb7185',
  },
  {
    id: 'ocean-blue',
    label: 'Abyssal Ocean Blue',
    desc: 'Deep marine blue with bioluminescent aqua currents',
    cssGradient: 'linear-gradient(135deg, #020b18 0%, #0369a1 52%, #1d4ed8 100%)',
    accentWave: '#38bdf8',
  },
  {
    id: 'sunset-magenta',
    label: 'Sunset Magenta',
    desc: 'Twilight fuchsia and warm dusk horizon waves',
    cssGradient: 'linear-gradient(135deg, #180628 0%, #a21caf 50%, #e11d48 100%)',
    accentWave: '#e879f9',
  },
  {
    id: 'solar-gold',
    label: 'Solar Corona Gold',
    desc: 'Radiant amber corona streams over deep violet space',
    cssGradient: 'linear-gradient(135deg, #1a1005 0%, #b45309 50%, #581c87 100%)',
    accentWave: '#facc15',
  },
  {
    id: 'arctic-ice',
    label: 'Arctic Crystal Ice',
    desc: 'Crisp glacier cyan and frost-white shimmer',
    cssGradient: 'linear-gradient(135deg, #081426 0%, #0891b2 55%, #bae6fd 100%)',
    accentWave: '#67e8f9',
  },
  {
    id: 'sakura-silk',
    label: 'Sakura Silk Breeze',
    desc: 'Floating cherry blossom petals over twilight plum',
    cssGradient: 'linear-gradient(135deg, #1a0b16 0%, #9d174d 52%, #f472b6 100%)',
    accentWave: '#f9a8d4',
  },
  {
    id: 'cyber-grid',
    label: 'Cyber Horizon Grid',
    desc: 'Perspective synthwave horizon grid with neon aurora',
    cssGradient: 'linear-gradient(135deg, #030712 0%, #1e1b4b 50%, #06b6d4 100%)',
    accentWave: '#22d3ee',
  },
  {
    id: 'starlight-pulse',
    label: 'Starlight Constellation',
    desc: 'Connected starlight nodes and deep cosmos waves',
    cssGradient: 'linear-gradient(135deg, #02040a 0%, #1e1b4b 55%, #4f46e5 100%)',
    accentWave: '#a5b4fc',
  },
];

const CLASSIC_LIVE2D_PALETTES: {
  id: AuroraColor;
  label: string;
  desc: string;
  cssGradient: string;
  accentWave: string;
}[] = [
  {
    id: 'classic-aurora-orbs',
    label: 'Classic Aurora & Meteors',
    desc: '旧バージョン復刻: 浮遊ボケ玉・オーロラカーテン・流れ星',
    cssGradient: 'linear-gradient(135deg, #030712 0%, #1e1b4b 48%, #0284c7 100%)',
    accentWave: '#38bdf8',
  },
  {
    id: 'classic-synthwave-sun',
    label: 'Retrowave Sunset Sun',
    desc: '旧バージョン復刻: 80s シンセウェイヴ太陽とネオン地平線グリッド',
    cssGradient: 'linear-gradient(135deg, #090014 0%, #701a75 50%, #f43f5e 100%)',
    accentWave: '#f43f5e',
  },
  {
    id: 'classic-deep-ocean',
    label: 'Bioluminescent Deep Sea',
    desc: '旧バージョン復刻: 海底に差し込む光の筋と発光バブル',
    cssGradient: 'linear-gradient(135deg, #010a14 0%, #0369a1 52%, #0d9488 100%)',
    accentWave: '#2dd4bf',
  },
  {
    id: 'classic-matrix-rain',
    label: 'Cyber Matrix Digital Rain',
    desc: '旧バージョン復刻: サイバーネティック・デジタルコードレイン',
    cssGradient: 'linear-gradient(135deg, #010804 0%, #064e3b 55%, #10b981 100%)',
    accentWave: '#34d399',
  },
  {
    id: 'classic-galaxy-vortex',
    label: 'Spiral Galaxy Vortex',
    desc: '旧バージョン復刻: 回転する銀河スパイラルと星雲コア',
    cssGradient: 'linear-gradient(135deg, #020208 0%, #3b0764 52%, #2563eb 100%)',
    accentWave: '#c084fc',
  },
  {
    id: 'classic-crystal-net',
    label: 'Liquid Crystal Network',
    desc: '旧バージョン復刻: マウス連動クリスタル・ニューラルネットワーク',
    cssGradient: 'linear-gradient(135deg, #030816 0%, #1e3a8a 52%, #06b6d4 100%)',
    accentWave: '#38bdf8',
  },
  {
    id: 'classic-fireflies-forest',
    label: 'Enchanted Forest Fireflies',
    desc: '旧バージョン復刻: 幻想的な夜の森と黄金色に明滅する蛍の光',
    cssGradient: 'linear-gradient(135deg, #02100d 0%, #065f46 55%, #ca8a04 100%)',
    accentWave: '#facc15',
  },
  {
    id: 'classic-plasma-nebula',
    label: 'Liquid Plasma Bokeh Orbs',
    desc: '旧バージョン復刻: 多色発光プラズマオーブの流体ブレンド',
    cssGradient: 'linear-gradient(135deg, #060314 0%, #581c87 50%, #db2777 100%)',
    accentWave: '#e879f9',
  },
];

const SPACE_3D_PRESETS: {
  id: NebulaPreset;
  label: string;
  desc: string;
  cssGradient: string;
  ringColor: string;
}[] = [
  {
    id: 'gargantua',
    label: '3D Gargantua Singularity',
    desc: '3D ブラックホール・黄金の相対論的降着円盤と環を持つ惑星',
    cssGradient: 'linear-gradient(135deg, #000000 0%, #431407 52%, #d97706 100%)',
    ringColor: '#f59e0b',
  },
  {
    id: 'ultraviolet',
    label: '3D Cosmic Ultraviolet',
    desc: '3D ウルトラバイオレット・クエーサー降着円盤と深宇宙星雲',
    cssGradient: 'linear-gradient(135deg, #030014 0%, #4c1d95 52%, #a855f7 100%)',
    ringColor: '#c084fc',
  },
  {
    id: 'indigo',
    label: '3D Deep Indigo Horizon',
    desc: '3D ディープインディゴ・蒼白く輝く事象の地平線',
    cssGradient: 'linear-gradient(135deg, #020617 0%, #1e3a8a 52%, #3b82f6 100%)',
    ringColor: '#60a5fa',
  },
  {
    id: 'cyan-quasar',
    label: '3D Cyan Quasar Jet',
    desc: '3D シアンクエーサー・高エネルギーシアン光学リング',
    cssGradient: 'linear-gradient(135deg, #020b18 0%, #155e75 52%, #06b6d4 100%)',
    ringColor: '#22d3ee',
  },
  {
    id: 'solar-flare',
    label: '3D Solar Flare Corona',
    desc: '3D ソーラーフレア・灼熱のコロナプラズマ円盤',
    cssGradient: 'linear-gradient(135deg, #1a0505 0%, #7c2d12 52%, #ef4444 100%)',
    ringColor: '#fb923c',
  },
];

interface ShellModeOption {
  id: ShellMode;
  label: string;
  desc: string;
  mockupType: 'gl5' | 'win11' | 'win10' | 'win8' | 'ubuntu' | 'mac' | 'dex' | 'chromeos';
}

const SHELL_MODES: ShellModeOption[] = [
  {
    id: 'windows',
    label: 'GlasispectUI (GlassiumOS 5 u4 標準)',
    desc: '直線と余白による GlasispectUI ミニマルデザイン・タスクバーAIオムニバー統合',
    mockupType: 'gl5',
  },
  {
    id: 'windows11',
    label: 'Windows 11',
    desc: '中央揃えタスクバーとフローティングスタートメニュー',
    mockupType: 'win11',
  },
  {
    id: 'windows10',
    label: 'Windows 10',
    desc: '左揃えタスクバーとライブタイルスタートメニュー',
    mockupType: 'win10',
  },
  {
    id: 'windows8',
    label: 'Windows 8.1',
    desc: 'フルスクリーンスタート画面とライブタイルグリッド',
    mockupType: 'win8',
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu Desktop',
    desc: '左垂直ランチャードックと上部アクティビティバー',
    mockupType: 'ubuntu',
  },
  {
    id: 'mac',
    label: 'macOS',
    desc: '上部メニューバー、左上の3色ウィンドウボタン、下部Dock',
    mockupType: 'mac',
  },
  {
    id: 'dex',
    label: 'DeX Workstation',
    desc: 'デスクトップワークステーション＆アプリランチャー',
    mockupType: 'dex',
  },
  {
    id: 'chromeos',
    label: 'ChromeOS',
    desc: 'ボトムシェルフとアプリランチャー',
    mockupType: 'chromeos',
  },
];

const DESIGN_ENGINES: { id: DesignEngine; label: string; desc: string; cssBg: string }[] = [
  {
    id: 'liquid-glass',
    label: 'Liquid Refraction Glass',
    desc: '屈折と反射を伴う液体ガラスサーフェス',
    cssBg: 'linear-gradient(135deg, rgba(8,145,178,0.7), rgba(88,28,135,0.7))',
  },
  {
    id: 'windows-mica',
    label: 'Flat Mica Surface',
    desc: '落ち着いた半透明マイカサーフェス',
    cssBg: 'linear-gradient(135deg, #0f172a, #1e293b)',
  },
  {
    id: 'frosted-blur',
    label: 'Frosted Acrylic',
    desc: '高精細すりガラスディープアクリル',
    cssBg: 'linear-gradient(135deg, #020617, #172554)',
  },
  {
    id: 'dark-slate',
    label: 'Crisp High-Contrast Slate',
    desc: 'ハイコントラストで明瞭なフラットスレート',
    cssBg: 'linear-gradient(135deg, #090d16, #000000)',
  },
  {
    id: 'cyberpunk-neon',
    label: 'Cyberpunk HUD Neon',
    desc: '高輝度アクセントラインとダークサーフェス',
    cssBg: 'linear-gradient(135deg, #000000, #083344, #064e3b)',
  },
  {
    id: 'miuix-glass',
    label: 'Soft Translucent Glass',
    desc: '滑らかな透過グラデーションサーフェス',
    cssBg: 'linear-gradient(135deg, #312e81, #581c87, #831843)',
  },
];

const PRESET_AVATARS = [
  { id: 'av-1', name: 'Cyber Pilot', icon: 'Bot' },
  { id: 'av-2', name: 'Glass Architect', icon: 'Layers' },
  { id: 'av-3', name: 'Astro Nomad', icon: 'Sparkles' },
  { id: 'av-4', name: 'Pixel Hacker', icon: 'Terminal' },
  { id: 'av-5', name: 'Neon Wave', icon: 'Zap' },
  { id: 'av-6', name: 'Aurora Explorer', icon: 'Compass' },
  { id: 'av-7', name: 'Minimal Slate', icon: 'User' },
  { id: 'av-8', name: 'Retro Gamer', icon: 'Gamepad2' },
];

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-[var(--os-accent)]' : 'bg-slate-400/50 dark:bg-white/20'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        } my-0.5`}
      />
    </button>
  );
}

function CustomSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  valueText,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  label?: string;
  valueText?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="font-semibold opacity-90">{label}</span>
          <span className="font-mono text-[var(--os-accent)] font-bold">{valueText ?? value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="glass-slider w-full cursor-pointer"
      />
    </div>
  );
}

function ShellMockupDiagram({ type }: { type: ShellModeOption['mockupType'] }) {
  if (type === 'gl5') {
    return (
      <div
        className="w-full h-16 p-2 flex flex-col justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)' }}
      >
        <div className="self-center w-28 h-8 bg-slate-900 border-t-2 border-cyan-400 p-1 grid grid-cols-2 gap-1">
          <div className="border-r border-white/10 pr-1 flex flex-col justify-between">
            <div className="h-1 w-full bg-cyan-400/70" />
            <div className="h-1 w-3/4 bg-white/30" />
          </div>
          <div className="flex flex-col justify-between">
            <div className="h-1 w-full bg-white/30" />
            <div className="h-1 w-2/3 bg-white/20" />
          </div>
        </div>
        <div className="w-full h-3 bg-slate-950 border-t border-white/15 flex items-center justify-between px-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-cyan-400" />
            <div className="w-10 h-1 bg-cyan-400/50" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 border-t border-cyan-400 bg-white/20" />
            <div className="w-2 h-2 bg-white/20" />
          </div>
          <div className="w-4 h-1 bg-white/30" />
        </div>
      </div>
    );
  }

  if (type === 'win11') {
    return (
      <div
        className="w-full h-16 p-2 flex flex-col justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #1e3a8a 100%)' }}
      >
        <div className="self-center w-24 h-8 rounded bg-slate-900/90 p-1 flex flex-col justify-between">
          <div className="grid grid-cols-4 gap-0.5">
            <div className="w-2 h-1.5 rounded bg-sky-400/80" />
            <div className="w-2 h-1.5 rounded bg-violet-400/80" />
            <div className="w-2 h-1.5 rounded bg-emerald-400/80" />
            <div className="w-2 h-1.5 rounded bg-amber-400/80" />
          </div>
        </div>
        <div className="w-full h-3 bg-slate-950/80 flex items-center justify-center gap-1.5 px-2">
          <div className="w-2.5 h-2 bg-sky-400" />
          <div className="w-2 h-2 bg-white/40" />
          <div className="w-2 h-2 bg-white/40" />
        </div>
      </div>
    );
  }

  if (type === 'win10') {
    return (
      <div
        className="w-full h-16 p-2 flex flex-col justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #090d16 0%, #172554 100%)' }}
      >
        <div className="w-20 h-9 bg-zinc-900 p-1 grid grid-cols-2 gap-1">
          <div className="bg-blue-600/80" />
          <div className="bg-cyan-600/80" />
          <div className="bg-emerald-600/80" />
          <div className="bg-purple-600/80" />
        </div>
        <div className="w-full h-3 bg-black flex items-center justify-start gap-1 px-1.5">
          <div className="w-2.5 h-2.5 bg-blue-500" />
          <div className="w-8 h-2 bg-white/15" />
          <div className="w-2 h-2 bg-white/40" />
        </div>
      </div>
    );
  }

  if (type === 'win8') {
    return (
      <div
        className="w-full h-16 p-2 flex flex-col justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #042f2e 0%, #065f46 100%)' }}
      >
        <div className="w-full h-full grid grid-cols-4 gap-1 p-0.5">
          <div className="bg-teal-600 p-0.5 font-mono text-[6px] text-white">Mail</div>
          <div className="bg-purple-600 p-0.5 font-mono text-[6px] text-white">Store</div>
          <div className="bg-blue-600 p-0.5 font-mono text-[6px] text-white">Photos</div>
          <div className="bg-amber-600 p-0.5 font-mono text-[6px] text-white">Music</div>
        </div>
      </div>
    );
  }

  if (type === 'ubuntu') {
    return (
      <div
        className="w-full h-16 p-1 flex overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #2b0922 0%, #7c2d12 100%)' }}
      >
        <div className="w-4 h-full bg-black/60 flex flex-col items-center py-1 gap-1">
          <div className="w-2.5 h-2.5 bg-orange-500" />
          <div className="w-2 h-2 bg-white/40" />
          <div className="w-2 h-2 bg-white/40" />
        </div>
        <div className="flex-1 flex flex-col justify-between p-1">
          <div className="w-full h-2.5 bg-black/50 flex items-center justify-between px-1">
            <span className="text-[6px] text-orange-300 font-mono">Activities</span>
            <span className="text-[6px] text-white/70">16:45</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'mac') {
    return (
      <div
        className="w-full h-16 p-1 flex flex-col justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #3b0764 0%, #881337 100%)' }}
      >
        <div className="w-full h-2.5 bg-black/50 px-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[6px] text-white/70 font-mono">Finder</span>
        </div>
        <div className="self-center w-28 h-3 rounded-full bg-white/25 flex items-center justify-center gap-1.5 px-2 mb-0.5">
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <div className="w-2 h-2 rounded-full bg-rose-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    );
  }

  if (type === 'dex') {
    return (
      <div
        className="w-full h-16 p-1.5 flex flex-col justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)' }}
      >
        <div className="flex-1" />
        <div className="w-full h-3 bg-black/60 flex items-center justify-between px-1.5">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-blue-500" />
            <div className="w-2 h-2 bg-white/40" />
          </div>
          <div className="text-[6px] text-blue-200 font-mono">DeX</div>
        </div>
      </div>
    );
  }

  if (type === 'chromeos') {
    return (
      <div
        className="w-full h-16 p-1.5 flex flex-col justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)' }}
      >
        <div className="flex-1" />
        <div className="self-center w-32 h-3.5 rounded-full bg-black/60 flex items-center justify-between px-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <div className="w-2 h-2 rounded-full bg-white/40" />
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
        </div>
      </div>
    );
  }

  return null;
}

export function SettingsApp() {
  const {
    wallpaper,
    setWallpaper,
    customWallpapers,
    addCustomWallpaper,
    selectedCustomId,
    setSelectedCustomId,
    theme,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    customThemeHex,
    setCustomThemeHex,
    activeThemeRgb,
    resolvedAccentHex,
    resolvedAccentRgb,
    language,
    setLanguage,
    setUiStyle,
    shellMode,
    setShellMode,
    designEngine,
    setDesignEngine,
    nebulaPreset,
    setNebulaPreset,
    lockScreenStyle,
    setLockScreenStyle,
    sleepClockStyle,
    setSleepClockStyle,
    sleepBackground,
    setSleepBackground,
    clockPosition,
    setClockPosition,
    blurAmount,
    setBlurAmount,
    cornerRadius,
    setCornerRadius,
    transparency,
    setTransparency,
    glassWobble,
    setGlassWobble,
    auroraColor,
    setAuroraColor,
    auroraSpeed,
    setAuroraSpeed,
    auroraIntensity,
    setAuroraIntensity,
    auroraParticles,
    setAuroraParticles,
    volume,
    setVolume,
    soundEnabled,
    setSoundEnabled,
    playSound,
    user,
    setUser,
    lockSystem,
    installedApps,
    openApp,
    addNotification,
    snapAllWindows5050,
    taskbarAlign,
    setTaskbarAlign,
    autoHideTaskbar,
    setAutoHideTaskbar,
    desktopIconSize,
    setDesktopIconSize,
    gridSnapEnabled,
    setGridSnapEnabled,
    resetDesktopIconPositions,
    autoLockMinutes,
    setAutoLockMinutes,
  } = useOS();

  const isLight = theme === 'light';
  const [dynWorldCfg, setDynWorldCfg] = useState<DynamicWorldWallpaperConfig>(() => loadDynamicWorldConfig());
  const updateDynWorld = (patch: Partial<DynamicWorldWallpaperConfig>) => {
    setDynWorldCfg((prev) => {
      const next = { ...prev, ...patch };
      saveDynamicWorldConfig(next);
      return next;
    });
  };
  const [activeCategory, setActiveCategory] = useState<NavCategory>('system');
  const [systemSubView, setSystemSubView] = useState<SystemSubView>('main');
  const [personalSubView, setPersonalSubView] = useState<PersonalizationSubView>('main');
  const [accountsSubView, setAccountsSubView] = useState<AccountsSubView>('main');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lockWallpaperInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Bing Daily Wallpaper & Lock Screen Wallpaper state
  const [bingList, setBingList] = useState<BingWallpaperItem[]>(DEFAULT_BING_WALLPAPERS);
  const [desktopBingIdx, setDesktopBingIdxState] = useState<number>(() => getDesktopBingIndex());
  const [lockWallCfg, setLockWallCfg] = useState<LockWallpaperConfig>(() =>
    loadLockWallpaperConfig()
  );

  useEffect(() => {
    let active = true;
    fetchBingWallpapers()
      .then((items) => {
        if (active && Array.isArray(items) && items.length > 0) {
          setBingList(items);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onLockWallChanged = () => setLockWallCfg(loadLockWallpaperConfig());
    const onDesktopBingChanged = () => setDesktopBingIdxState(getDesktopBingIndex());
    window.addEventListener('glassium-lock-wallpaper-changed', onLockWallChanged);
    window.addEventListener('glassium-desktop-bing-changed', onDesktopBingChanged);
    return () => {
      window.removeEventListener('glassium-lock-wallpaper-changed', onLockWallChanged);
      window.removeEventListener('glassium-desktop-bing-changed', onDesktopBingChanged);
    };
  }, []);

  const updateLockWallpaper = (patch: Partial<LockWallpaperConfig>) => {
    const next: LockWallpaperConfig = { ...lockWallCfg, ...patch };
    setLockWallCfg(next);
    saveLockWallpaperConfig(next);
  };

  // 【BETA】GlassiumOS 6 future — Glasispect UI 2: Material, Icon Styles & Taskbar/Dock state
  const [betaCfg, setBetaCfg] = useState<Glassium6BetaConfig>(() => loadGlassium6BetaConfig());

  useEffect(() => {
    const onBetaChanged = () => setBetaCfg(loadGlassium6BetaConfig());
    window.addEventListener('glassium6-beta-config-changed', onBetaChanged);
    return () => window.removeEventListener('glassium6-beta-config-changed', onBetaChanged);
  }, []);

  const updateBetaCfg = (patch: Partial<Glassium6BetaConfig>) => {
    const next: Glassium6BetaConfig = {
      ...betaCfg,
      ...patch,
      pinnedApps: Array.isArray(patch.pinnedApps)
        ? patch.pinnedApps.slice(0, 9)
        : betaCfg.pinnedApps.slice(0, 9),
    };
    setBetaCfg(next);
    saveGlassium6BetaConfig(next);
  };

  const toggleBetaPinnedApp = (appId: AppId) => {
    const exists = betaCfg.pinnedApps.includes(appId);
    if (exists) {
      if (betaCfg.pinnedApps.length <= 1) {
        addNotification({
          title: 'GlassiumOS 6 future (BETA)',
          message: '最低1つのアプリはピン留めしておく必要があります。',
        });
        return;
      }
      updateBetaCfg({ pinnedApps: betaCfg.pinnedApps.filter((id) => id !== appId) });
    } else {
      if (betaCfg.pinnedApps.length >= 9) {
        addNotification({
          title: 'GlassiumOS 6 future (BETA)',
          message: 'ピン留めできるアプリは最大9個までです。別のアプリのピン留めを解除してから選択してください。',
        });
        return;
      }
      updateBetaCfg({ pinnedApps: [...betaCfg.pinnedApps, appId] });
    }
  };

  // AI Assistant & Koyeb Backend state
  const [aiResponseStyle, setAiResponseStyle] = useState<'balanced' | 'concise' | 'detailed'>('balanced');
  const [aiAutoExecute, setAiAutoExecute] = useState(true);
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiTestMessage, setAiTestMessage] = useState('');
  const [koyebUrlInput, setKoyebUrlInput] = useState<string>(() => getBackendBaseUrl());
  const [koyebTestStatus, setKoyebTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('success');
  const [koyebTestMessage, setKoyebTestMessage] = useState<string>(() => {
    const st = getBackendConnectionState();
    return `自動接続済み (${st.url}) — 稼働エンジン: ${st.engines.join(', ')}`;
  });

  useEffect(() => {
    let mounted = true;
    autoConnectBackendServer().then((st) => {
      if (!mounted) return;
      setKoyebTestStatus('success');
      setKoyebTestMessage(
        language === 'ja'
          ? `自動接続済み (${st.url}) — 稼働エンジン: ${st.engines.join(', ')}`
          : `Auto-Connected (${st.url}) — Active engines: ${st.engines.join(', ')}`
      );
    });
    return () => {
      mounted = false;
    };
  }, [language]);

  // Accounts state
  const [profileName, setProfileName] = useState(user?.name || 'Administrator');
  const [profilePassword, setProfilePassword] = useState(user?.password || '');
  const [profileEmail, setProfileEmail] = useState('user@glassium.os');
  const [profileRole, setProfileRole] = useState<'Administrator' | 'Developer' | 'Guest'>('Administrator');
  const [selectedAvatarIcon, setSelectedAvatarIcon] = useState(user?.avatar || 'User');
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [securityPin, setSecurityPin] = useState('1234');
  const [accountSaved, setAccountSaved] = useState(false);

  // App search
  const [appSearch, setAppSearch] = useState('');

  const compressImageFile = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('画像データが不正です'));
          return;
        }
        const img = new Image();
        img.onerror = () => reject(new Error('画像のデコードに失敗しました'));
        img.onload = () => {
          let w = img.naturalWidth || img.width || maxWidth;
          let h = img.naturalHeight || img.height || maxHeight;
          const scale = Math.min(1, maxWidth / w, maxHeight / h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  const handleCustomWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 1440, 900, 0.78);
      addCustomWallpaper(file.name.replace(/\.[^.]+$/, ''), compressedDataUrl);
      playSound('notify');
      addNotification({ title: 'Display', message: 'カスタム壁紙を最適化して適用しました' });
    } catch {
      addNotification({ title: 'Display', message: '壁紙画像の読み込みまたは保存に失敗しました' });
    }
  };

  const handleLockWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 1440, 900, 0.78);
      updateLockWallpaper({
        mode: 'custom',
        customImageUrl: compressedDataUrl,
        customImageName: file.name.replace(/\.[^.]+$/, ''),
      });
      playSound('notify');
      addNotification({
        title: 'Lock Screen',
        message: 'ロック画面のカスタム壁紙を更新しました',
      });
    } catch {
      addNotification({
        title: 'Lock Screen',
        message: 'ロック画面用の壁紙画像の読み込みに失敗しました',
      });
    }
  };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 256, 256, 0.82);
      setCustomAvatarUrl(compressedDataUrl);
      playSound('notify');
    } catch {
      addNotification({ title: 'Account', message: 'アバター画像の読み込みに失敗しました' });
    }
  };

  const handleTestAIConnection = async () => {
    setAiTestStatus('testing');
    setAiTestMessage('GlassiumOS 5 AI エンジンへ接続確認中...');
    playSound('click');

    try {
      const data = await requestAIChat({
        message: 'こんにちは',
      });
      if (data.reply) {
        setAiTestStatus('success');
        setAiTestMessage(`AI エンジン正常稼働中 (${data.model || 'GlassiumOS 5 AI Engine'})`);
        addNotification({ title: 'AI Assistant', message: 'GlassiumOS 5 AI エンジンは正常に稼働しています。' });
      } else {
        throw new Error('応答が空でした');
      }
    } catch (err: unknown) {
      setAiTestStatus('error');
      setAiTestMessage(`確認エラー: ${err instanceof Error ? err.message : '再試行してください'}`);
    }
  };

  const handleSaveAndTestKoyebUrl = async () => {
    const cleaned = koyebUrlInput.trim().replace(/\/+$/, '');
    setBackendBaseUrl(cleaned);
    setKoyebUrlInput(cleaned);
    setKoyebTestStatus('testing');
    setKoyebTestMessage(isJa ? 'Koyeb サーバー (/api/health) へ接続テスト中...' : 'Testing Koyeb server (/api/health)...');
    playSound('click');

    try {
      const target = resolveBackendUrl('/api/health');
      const res = await fetch(target, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKoyebTestStatus('success');
      const engineList = Array.isArray(data.engines) ? data.engines.join(', ') : 'uv, scramjet, music, movie, ai';
      setKoyebTestMessage(
        isJa
          ? `接続成功！稼働エンジン: ${engineList}`
          : `Connected! Active engines: ${engineList}`
      );
      addNotification({
        title: 'Koyeb Server Connected',
        message: isJa
          ? 'Koyeb バックエンドサーバーに接続しました。UV / Scramjet / 音楽 / 映画 / AI がサーバー経由で動作します。'
          : 'Connected to Koyeb backend server.',
      });
    } catch (err: unknown) {
      setKoyebTestStatus('error');
      setKoyebTestMessage(
        isJa
          ? `接続エラー: ${err instanceof Error ? err.message : 'URLまたはKoyebの稼働状態を確認してください'}`
          : `Connection failed: ${err instanceof Error ? err.message : 'Check URL and Koyeb service status'}`
      );
    }
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({
      name: profileName.trim() || 'Administrator',
      avatar: customAvatarUrl || selectedAvatarIcon,
      password: profilePassword.trim() || undefined,
      createdAt: user?.createdAt || Date.now(),
    });
    playSound('notify');
    setAccountSaved(true);
    addNotification({ title: 'Accounts', message: 'アカウントプロファイルを更新しました。' });
    setTimeout(() => setAccountSaved(false), 3000);
  };

  const handleSelectShellMode = (smId: ShellMode) => {
    playSound('click');
    setShellMode(smId);
    if (smId === 'mac') setUiStyle('macos');
    else if (smId === 'dex') setUiStyle('one-ui');
    else if (smId === 'chromeos') setUiStyle('material3');
    else setUiStyle('glassium');
  };

  const handleSelectSurfaceEngine = (deId: DesignEngine) => {
    playSound('click');
    setDesignEngine(deId);

    if (deId === 'liquid-glass') {
      setBlurAmount(24);
      setCornerRadius(18);
      setTransparency(78);
      setGlassWobble(75);
    } else if (deId === 'windows-mica') {
      setBlurAmount(14);
      setCornerRadius(12);
      setTransparency(90);
      setGlassWobble(20);
    } else if (deId === 'frosted-blur') {
      setBlurAmount(38);
      setCornerRadius(16);
      setTransparency(65);
      setGlassWobble(85);
    } else if (deId === 'dark-slate') {
      setBlurAmount(8);
      setCornerRadius(8);
      setTransparency(95);
      setGlassWobble(0);
    } else if (deId === 'cyberpunk-neon') {
      setBlurAmount(16);
      setCornerRadius(6);
      setTransparency(85);
      setGlassWobble(50);
    } else if (deId === 'miuix-glass') {
      setBlurAmount(28);
      setCornerRadius(24);
      setTransparency(72);
      setGlassWobble(60);
    }
  };

  const isJa = language === 'ja';

  const getSystemCardValueLabel = (cardId: SystemSubView): string => {
    switch (cardId) {
      case 'display':
        return wallpaper === 'golden-sparkle' || auroraColor === 'golden-sparkle'
          ? 'Golden Sparkle'
          : WALLPAPERS[wallpaper]?.label || wallpaper;
      case 'sound':
        return `${volume}%`;
      case 'power':
        return lockScreenStyle === 'hyperos3' ? 'Glassium Depth' : lockScreenStyle;
      case 'multitasking':
        return taskbarAlign === 'center'
          ? isJa
            ? '中央揃え'
            : 'Centered'
          : isJa
          ? '左揃え'
          : 'Left';
      case 'language':
        return isJa ? '日本語' : 'English';
      case 'aicomponents':
        return aiAutoExecute ? (isJa ? '有効' : 'Active') : isJa ? '手動' : 'Manual';
      default:
        return '';
    }
  };

  const renderBreadcrumbHeader = (titleJa: string, titleEn: string, onBack: () => void) => (
    <div className={`flex items-center gap-2.5 mb-6 pb-3 border-b ${isLight ? 'border-slate-300/80' : 'border-white/[0.08]'}`}>
      <button
        type="button"
        onClick={() => {
          playSound('click');
          onBack();
        }}
        className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
          isLight
            ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800 shadow-xs'
            : 'bg-white/[0.05] border-white/[0.1] hover:bg-white/[0.1] text-white/90'
        }`}
        title={isJa ? '戻る' : 'Back'}
      >
        <Icon name="ArrowLeft" size={15} />
      </button>
      <h2 className="text-base font-bold tracking-tight">{isJa ? titleJa : titleEn}</h2>
    </div>
  );

  const isDynamicSurfaceMode =
    themeMode === 'dynamic' || themeMode === 'dynamic-dark' || themeMode === 'dynamic-light';
  const rowHoverClass = isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/[0.04]';
  const dividerClass = isLight ? 'divide-slate-200/80 border-slate-200/80' : 'divide-white/[0.07] border-white/[0.08]';
  const cardSurfaceClass = isLight
    ? 'bg-[var(--os-surface-elevated)] border border-slate-300/75 shadow-xs rounded-2xl overflow-hidden'
    : 'bg-[var(--os-surface-elevated)] border border-white/[0.12] rounded-2xl overflow-hidden';

  const renderGlassium6BetaStudio = () => {
    const activeMat =
      GLASISPECT_MATERIALS[betaCfg.activeMaterial] || GLASISPECT_MATERIAL_LIST[0];
    const gemstoneMaterials = GLASISPECT_MATERIAL_LIST.filter((m) => m.category === 'gemstone');
    const physicalMaterials = GLASISPECT_MATERIAL_LIST.filter((m) => m.category === 'natural');
    const isCloudFog = betaCfg.taskbarVariant === 'cloud-fog';
    const isCustomDockOrTaskbar =
      betaCfg.taskbarVariant === 'dock' ||
      betaCfg.taskbarVariant === 'side-dock' ||
      betaCfg.taskbarVariant === 'taskbar' ||
      betaCfg.taskbarVariant === 'sidebar';
    const isVerticalSide =
      betaCfg.taskbarVariant === 'side-dock' || betaCfg.taskbarVariant === 'sidebar';

    return (
      <div className={`${cardSurfaceClass} p-5 space-y-5 border border-fuchsia-400/35`}>
        {/* Header & Beta Mode Toggle */}
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-fuchsia-500/30 to-cyan-500/30 border border-fuchsia-400/50 text-fuchsia-200 text-[10px] font-mono font-bold">
                【BETA】GlassiumOS 6 future
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono opacity-80">
                デフォルトOS表記: GlassiumOS 5 (u4 fix 1)
              </span>
            </div>
            <h3 className="text-sm font-bold tracking-tight">
              Glasispect UI 2: Material ＆ 次世代タスクバー / アイコンラボ
            </h3>
            <p className="text-[11px] opacity-65 leading-relaxed">
              マウスが光源となり乱反射する「Glasispect UI 2: Material」（宝石6種＋鉄・革・水・氷・葉っぱ・木）、クリック＆ドラッグ時の素材別物理サウンド、3種類のアイコンスタイル（従来 / クリスタル / マテリアル）、5種類の次世代タスクバー＆Dockを試せます。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold">
                {betaCfg.betaEnabled ? 'BETA 有効' : 'GlassiumOS 5 標準'}
              </div>
              <div className="text-[10px] opacity-55">
                {betaCfg.betaEnabled ? 'Glasispect UI 2 稼働中' : 'クリックでBETA機能を有効化'}
              </div>
            </div>
            <ToggleSwitch
              checked={betaCfg.betaEnabled}
              onChange={(val) => {
                updateBetaCfg({
                  betaEnabled: val,
                  uiDesignStyle: val ? 'glasispect-material' : 'glass-ui',
                });
                materialAcousticSynth.playClick(betaCfg.activeMaterial);
                addNotification({
                  title: '【BETA】GlassiumOS 6 future',
                  message: val
                    ? 'Glasispect UI 2: Material（マウス光源乱反射＆素材別サウンド）を有効化しました。'
                    : 'GlassiumOS 5 標準モードに戻しました。',
                });
              }}
            />
          </div>
        </div>

        {/* 1. Icon Style Selector: Classic vs Crystal vs Material */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold">
                1. アイコンスタイル選択 (従来 / クリスタルスタイル / マテリアルスタイル)
              </h4>
              <p className="text-[11px] opacity-60">
                従来アイコンは一切作り変えずそのまま維持し、クリスタルカットまたは現在の素材（{activeMat.nameJa}）を纏ったアイコンへ切り替えられます
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(
              [
                {
                  id: 'classic' as Glassium6IconStyle,
                  title: '従来 (Classic)',
                  sub: '作り変えない既存のGlassiumOS 5標準アイコン',
                },
                {
                  id: 'crystal' as Glassium6IconStyle,
                  title: 'クリスタルスタイル (Crystal)',
                  sub: '多面体プリズムカット＆宝石屈折ハイライト',
                },
                {
                  id: 'material' as Glassium6IconStyle,
                  title: 'マテリアルスタイル (Material)',
                  sub: `選択素材「${activeMat.nameJa}」の質感・光沢・色`,
                },
              ] as const
            ).map((st) => {
              const active = betaCfg.iconStyle === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    updateBetaCfg({ iconStyle: st.id });
                    materialAcousticSynth.playClick(betaCfg.activeMaterial);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                    active
                      ? 'bg-[var(--os-accent)]/15 border-[var(--os-accent)] ring-1 ring-[var(--os-accent)]'
                      : isLight
                      ? 'bg-slate-200/60 hover:bg-slate-200 border-slate-300'
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{st.title}</span>
                    {active && <Icon name="CheckCircle2" size={15} className="text-[var(--os-accent)]" />}
                  </div>
                  {/* Live Icon Trio Preview */}
                  <div className="flex items-center gap-2 py-1">
                    <Icon
                      name="browser"
                      size={28}
                      forceIconStyle={st.id}
                      forceMaterialId={betaCfg.activeMaterial}
                    />
                    <Icon
                      name="synth"
                      size={28}
                      forceIconStyle={st.id}
                      forceMaterialId={betaCfg.activeMaterial}
                    />
                    <Icon
                      name="settings"
                      size={28}
                      forceIconStyle={st.id}
                      forceMaterialId={betaCfg.activeMaterial}
                    />
                    <Icon
                      name="game"
                      size={28}
                      forceIconStyle={st.id}
                      forceMaterialId={betaCfg.activeMaterial}
                    />
                  </div>
                  <div className="text-[10px] opacity-65 leading-snug">{st.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Glasispect UI 2: Material — 12 Materials (6 Gemstones + 6 Physical/Natural) & Acoustic Synth */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold">
                2. Glasispect UI 2: Material — 素材・宝石と乱反射＆物理サウンド (全12種)
              </h4>
              <p className="text-[11px] opacity-60">
                マウスが光源となって素材ごとに異なる屈折率・粗さで乱反射し、クリックやドラッグ操作で素材特有の音が鳴ります
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => materialAcousticSynth.playClick(betaCfg.activeMaterial)}
                className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-200 text-[11px] font-bold cursor-pointer"
              >
                🔊 クリック音試聴
              </button>
              <button
                type="button"
                onClick={() => materialAcousticSynth.playDrag(betaCfg.activeMaterial, 1.4)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold cursor-pointer"
              >
                ✨ ドラッグ摩擦音試聴
              </button>
            </div>
          </div>

          {/* Gemstones (6) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-fuchsia-300">
              💎 宝石マテリアル (Gemstones — 色と光学屈折・高音クリスタル共鳴)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gemstoneMaterials.map((mat) => {
                const selected = betaCfg.activeMaterial === mat.id;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => {
                      updateBetaCfg({
                        betaEnabled: true,
                        uiDesignStyle: 'glasispect-material',
                        dockSurfaceStyle: 'glasispect-material',
                        activeMaterial: mat.id as GlasispectMaterialId,
                      });
                      materialAcousticSynth.playClick(mat.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                      selected
                        ? 'border-white ring-2 ring-[var(--os-accent)] shadow-lg'
                        : 'border-white/15 opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, rgba(${mat.rgb.join(', ')}, 0.42), rgba(${mat.secondaryRgb.join(', ')}, 0.25))`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">
                        {mat.badgeEmoji} {mat.nameJa}
                      </span>
                      <span className="text-[9px] font-mono opacity-80">
                        n={mat.refractionIndex.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] opacity-80 mt-1 line-clamp-1">{mat.subtitleJa}</div>
                    <div className="text-[9px] font-mono text-cyan-200/90 mt-0.5">
                      音: {mat.soundDescriptionJa}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Physical / Natural Materials (6: Iron, Leather, Water, Ice, Leaf, Wood) */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-emerald-300">
              🌿 自然・物理マテリアル (鉄・革・水・氷・葉っぱ・木 — 異方性反射＆物理音響)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {physicalMaterials.map((mat) => {
                const selected = betaCfg.activeMaterial === mat.id;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => {
                      updateBetaCfg({
                        betaEnabled: true,
                        uiDesignStyle: 'glasispect-material',
                        dockSurfaceStyle: 'glasispect-material',
                        activeMaterial: mat.id as GlasispectMaterialId,
                      });
                      materialAcousticSynth.playClick(mat.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                      selected
                        ? 'border-white ring-2 ring-[var(--os-accent)] shadow-lg'
                        : 'border-white/15 opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, rgba(${mat.rgb.join(', ')}, 0.42), rgba(${mat.secondaryRgb.join(', ')}, 0.25))`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">
                        {mat.badgeEmoji} {mat.nameJa}
                      </span>
                      <span className="text-[9px] font-mono opacity-80">
                        粗さ {Math.round(mat.roughness * 100)}%
                      </span>
                    </div>
                    <div className="text-[10px] opacity-80 mt-1 line-clamp-1">{mat.subtitleJa}</div>
                    <div className="text-[9px] font-mono text-emerald-200/90 mt-0.5">
                      音: {mat.soundDescriptionJa}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mouse Light Diffuse Intensity & Material Sound Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 items-center">
            <CustomSlider
              min={15}
              max={100}
              value={betaCfg.diffuseLightIntensity}
              onChange={(val) => updateBetaCfg({ diffuseLightIntensity: val })}
              label="マウス光源の乱反射強度 (Diffuse Light Reflection)"
              valueText={`${betaCfg.diffuseLightIntensity}%`}
            />
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div>
                <div className="text-xs font-bold">クリック＆ドラッグ時の素材サウンド</div>
                <div className="text-[10px] opacity-60">
                  マウスでドラッグ・クリックした際に「{activeMat.nameJa}」の音を鳴らす
                </div>
              </div>
              <ToggleSwitch
                checked={betaCfg.materialSoundEnabled}
                onChange={(val) => updateBetaCfg({ materialSoundEnabled: val })}
              />
            </div>
          </div>
        </div>

        {/* 3. Taskbar / Dock Variant Selector (GlassiumOS 5 Default + 5 Beta Variants) */}
        <div className="pt-3 border-t border-white/10 space-y-3.5">
          <div>
            <h4 className="text-xs font-bold">
              3. タスクバー / Dock の種類 (GlassiumOS 6 future BETA UI)
            </h4>
            <p className="text-[11px] opacity-60">
              「Cloud / Fog」「Dock」「Side Dock」「タスクバー (Taskbar)」「サイドバー (Sidebar)」または従来の「GlassiumOS 5 標準」から選択できます
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(
              [
                {
                  id: 'glassium5-default' as Glassium6TaskbarVariant,
                  label: 'GlassiumOS 5 標準',
                  desc: 'デフォルトのGlassiumOS 5タスクバー',
                },
                {
                  id: 'cloud-fog' as Glassium6TaskbarVariant,
                  label: '☁️ Cloud / Fog',
                  desc: 'マウスを下に移動すると雲が集まりタスクバー化',
                },
                {
                  id: 'dock' as Glassium6TaskbarVariant,
                  label: '🛸 Dock (下部ドック)',
                  desc: '最大9アプリ・AI・News・検索UIを詳細設定可能',
                },
                {
                  id: 'side-dock' as Glassium6TaskbarVariant,
                  label: '📐 Side Dock (左右ドック)',
                  desc: '画面の左または右に配置できるフローティングDock',
                },
                {
                  id: 'taskbar' as Glassium6TaskbarVariant,
                  label: '▬ タスクバー (Taskbar)',
                  desc: 'Dockと同じ詳細カスタマイズが可能な全幅バー',
                },
                {
                  id: 'sidebar' as Glassium6TaskbarVariant,
                  label: '▮ サイドバー (Sidebar)',
                  desc: 'タスクバーの縦（左右フルハイト）バージョン',
                },
              ] as const
            ).map((tb) => {
              const active = betaCfg.taskbarVariant === tb.id;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => {
                    updateBetaCfg({
                      taskbarVariant: tb.id,
                      betaEnabled: tb.id === 'glassium5-default' ? betaCfg.betaEnabled : true,
                    });
                    materialAcousticSynth.playClick(betaCfg.activeMaterial);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'bg-[var(--os-accent)] text-black font-bold border-transparent shadow-md'
                      : isLight
                      ? 'bg-slate-200/70 hover:bg-slate-300/70 text-slate-800 border-slate-300'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                >
                  <div className="text-xs font-bold">{tb.label}</div>
                  <div className={`text-[10px] mt-1 leading-snug ${active ? 'opacity-85' : 'opacity-60'}`}>
                    {tb.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cloud / Fog Exclusive Customization (Only Color, Opacity, Gather Speed — Detailed app customization disabled per spec) */}
          {isCloudFog && (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-cyan-200">
                    ☁️ Cloud / Fog 専用カスタマイズ (色・薄さ・集まるスピード)
                  </div>
                  <div className="text-[11px] opacity-70">
                    ※ Cloud / Fog モードではマウスを画面下部に移動すると雲が凝結してタスクバーになります（仕様により詳しいピン留め等のカスタマイズは不可で、色・薄さ・集まるスピードのみ変更可能です）。
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-[11px] font-bold mb-1.5">
                    雲の色 (Cloud / Fog Color)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={betaCfg.cloudColor}
                      onChange={(e) => updateBetaCfg({ cloudColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-white/30 bg-transparent"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['#e0f2fe', '#c084fc', '#fbcfe8', '#a7f3d0', '#fde68a', '#93c5fd'].map(
                        (hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => updateBetaCfg({ cloudColor: hex })}
                            style={{ backgroundColor: hex }}
                            className="w-5 h-5 rounded-full border border-white/40 cursor-pointer hover:scale-110 transition"
                            title={hex}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                <CustomSlider
                  min={20}
                  max={95}
                  value={betaCfg.cloudOpacity}
                  onChange={(val) => updateBetaCfg({ cloudOpacity: val })}
                  label="雲の薄さ・濃度 (Opacity)"
                  valueText={`${betaCfg.cloudOpacity}%`}
                />

                <CustomSlider
                  min={0.4}
                  max={2.5}
                  step={0.1}
                  value={betaCfg.cloudGatherSpeed}
                  onChange={(val) => updateBetaCfg({ cloudGatherSpeed: val })}
                  label="雲が集まるスピード (Speed)"
                  valueText={`${betaCfg.cloudGatherSpeed.toFixed(1)}x`}
                />
              </div>
            </div>
          )}

          {/* Detailed Customization for Dock / Side Dock / Taskbar / Sidebar */}
          {isCustomDockOrTaskbar && (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/15 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div>
                  <div className="text-xs font-bold text-fuchsia-200">
                    🛠️ {betaCfg.taskbarVariant.toUpperCase()} 詳細カスタマイズ
                  </div>
                  <div className="text-[11px] opacity-65">
                    サーフェスデザイン（従来 Glass UI / Glasispect UI 2: Material）、表示方法、左右位置、ピン留めアプリ（最大9個）、AI / News / 検索UI の表示・非表示を設定できます
                  </div>
                </div>
              </div>

              {/* Surface Design & Visibility Mode & Side Position */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Design: Glass UI (Classic) vs Glasispect UI 2: Material */}
                <div className="p-3 rounded-xl bg-black/25 border border-white/10 space-y-2">
                  <div className="text-[11px] font-bold opacity-80">デザイン質感</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateBetaCfg({ dockSurfaceStyle: 'glass-ui' })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        betaCfg.dockSurfaceStyle === 'glass-ui'
                          ? 'bg-[var(--os-accent)] text-black'
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      Glass UI (従来)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBetaCfg({ dockSurfaceStyle: 'glasispect-material' })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        betaCfg.dockSurfaceStyle === 'glasispect-material'
                          ? 'bg-[var(--os-accent)] text-black'
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      Glasispect UI 2
                    </button>
                  </div>
                </div>

                {/* Display Mode: Always vs Mouse Move Reveal */}
                <div className="p-3 rounded-xl bg-black/25 border border-white/10 space-y-2">
                  <div className="text-[11px] font-bold opacity-80">表示形式</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateBetaCfg({ autoHideMode: 'always' })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        betaCfg.autoHideMode === 'always'
                          ? 'bg-[var(--os-accent)] text-black'
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      常に表示
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBetaCfg({ autoHideMode: 'mouse-bottom' })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        betaCfg.autoHideMode === 'mouse-bottom'
                          ? 'bg-[var(--os-accent)] text-black'
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      端へ移動で表示
                    </button>
                  </div>
                </div>

                {/* Left / Right Side Position (for Side Dock & Sidebar) */}
                <div className="p-3 rounded-xl bg-black/25 border border-white/10 space-y-2">
                  <div className="text-[11px] font-bold opacity-80">
                    配置場所 {isVerticalSide ? '(Side Dock / Sidebar)' : '(横バー時は中央/全幅)'}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={!isVerticalSide}
                      onClick={() => updateBetaCfg({ sidePosition: 'left' })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        !isVerticalSide
                          ? 'opacity-40 cursor-not-allowed bg-white/5'
                          : betaCfg.sidePosition === 'left'
                          ? 'bg-[var(--os-accent)] text-black'
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      ◀ 画面の左 (Left)
                    </button>
                    <button
                      type="button"
                      disabled={!isVerticalSide}
                      onClick={() => updateBetaCfg({ sidePosition: 'right' })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        !isVerticalSide
                          ? 'opacity-40 cursor-not-allowed bg-white/5'
                          : betaCfg.sidePosition === 'right'
                          ? 'bg-[var(--os-accent)] text-black'
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      画面の右 (Right) ▶
                    </button>
                  </div>
                </div>
              </div>

              {/* Feature Buttons Show/Hide: AI Button, News Button, Search UI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/10">
                  <div>
                    <div className="text-xs font-bold">✨ AI ボタン表示</div>
                    <div className="text-[10px] opacity-60">AI アシスタント起動ボタン</div>
                  </div>
                  <ToggleSwitch
                    checked={betaCfg.showAIButton}
                    onChange={(val) => updateBetaCfg({ showAIButton: val })}
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/10">
                  <div>
                    <div className="text-xs font-bold">📰 News ボタン表示</div>
                    <div className="text-[10px] opacity-60">最新ニュースフィードボタン</div>
                  </div>
                  <ToggleSwitch
                    checked={betaCfg.showNewsButton}
                    onChange={(val) => updateBetaCfg({ showNewsButton: val })}
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/10">
                  <div>
                    <div className="text-xs font-bold">🔍 検索 UI 表示</div>
                    <div className="text-[10px] opacity-60">クイックアプリ検索ボックス</div>
                  </div>
                  <ToggleSwitch
                    checked={betaCfg.showSearchUI}
                    onChange={(val) => updateBetaCfg({ showSearchUI: val })}
                  />
                </div>
              </div>

              {/* Pinned Apps Selector (Up to 9 Apps) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold">
                      📌 ピン留めするアプリの選択 (最大 9 個)
                    </span>
                    <span className="ml-2 text-[11px] opacity-65">
                      クリックしてピン留め / 解除を切り替え
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                      betaCfg.pinnedApps.length >= 9
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    選択中: {betaCfg.pinnedApps.length} / 9 個
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PINNABLE_APPS_CATALOG.map((item) => {
                    const isPinned = betaCfg.pinnedApps.includes(item.appId);
                    const orderIdx = betaCfg.pinnedApps.indexOf(item.appId);
                    return (
                      <button
                        key={item.appId}
                        type="button"
                        onClick={() => {
                          toggleBetaPinnedApp(item.appId);
                          materialAcousticSynth.playClick(betaCfg.activeMaterial);
                        }}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 relative ${
                          isPinned
                            ? 'bg-[var(--os-accent)]/20 border-[var(--os-accent)] font-bold'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <Icon name={item.appId} size={18} />
                        <span className="text-[11px] truncate">{item.labelJa}</span>
                        {isPinned && (
                          <span className="ml-auto px-1.5 py-0.2 rounded bg-[var(--os-accent)] text-black text-[9px] font-mono font-bold">
                            {orderIdx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{ backgroundColor: 'var(--os-surface-solid)' }}
      className={`flex h-full w-full select-none overflow-hidden font-sans transition-colors duration-300 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#090d16] text-slate-100'
      }`}
    >
      {/* Left Sidebar Navigation */}
      <div
        style={{ backgroundColor: 'var(--os-titlebar)' }}
        className={`w-60 shrink-0 border-r px-3.5 py-4 flex flex-col justify-between transition-colors duration-300 ${
          isLight ? 'bg-slate-100/90 border-slate-200/90' : 'bg-black/35 border-white/[0.07]'
        }`}
      >
        <div className="space-y-5">
          {/* User Compact Profile */}
          <div className={`flex items-center gap-3 px-2 pb-3.5 border-b ${isLight ? 'border-slate-200/90' : 'border-white/[0.08]'}`}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500/25 to-indigo-500/15 border border-white/15 text-[var(--os-accent)] flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-inner">
              {customAvatarUrl ? (
                <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Icon name={selectedAvatarIcon || 'User'} size={19} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold tracking-tight truncate">{profileName}</div>
              <div className="text-[11px] opacity-50 truncate">{profileRole}</div>
            </div>
          </div>

          {/* Navigation Items with Custom Bespoke Squircle Icon Badges */}
          <nav className="space-y-1">
            {SIDEBAR_NAV.map((nav) => {
              const active = activeCategory === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setActiveCategory(nav.id);
                    setSystemSubView('main');
                    setPersonalSubView('main');
                    setAccountsSubView('main');
                  }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs transition-all ${
                    active
                      ? isLight
                        ? 'bg-white text-slate-950 font-bold shadow-xs border border-slate-200/80'
                        : 'bg-white/[0.09] text-white font-bold border border-white/[0.12] shadow-sm'
                      : isLight
                      ? 'text-slate-700 font-medium hover:bg-slate-200/60'
                      : 'text-slate-300/85 font-medium hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${nav.badgeGradient} border flex items-center justify-center shrink-0 ${nav.iconColor}`}
                  >
                    <Icon name={nav.icon} size={15} />
                  </span>
                  <span className="tracking-tight">{isJa ? nav.labelJa : nav.labelEn}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Version Tag & u4(fix 1) Release Notes Button */}
        <div
          className={`px-2.5 pt-3 text-[11px] border-t flex items-center justify-between font-mono ${
            isLight ? 'border-slate-200/90' : 'border-white/[0.07]'
          }`}
        >
          <span className="opacity-65 font-bold">GlassiumOS 5 u4(fix 1)</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-glassium-u4-notes'))}
            className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 text-[10px] font-bold transition cursor-pointer"
          >
            u4(fix 1)
          </button>
        </div>
      </div>

      {/* Main Content View Container */}
      <div className="flex-1 overflow-y-auto px-7 py-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {/* ==================== 1. SYSTEM CATEGORY ==================== */}
          {activeCategory === 'system' && (
            <motion.div
              key="cat-system"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-5"
            >
              {systemSubView === 'main' ? (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">
                        {isJa ? 'システム (GlassiumOS 5 u4(fix 1))' : 'System (GlassiumOS 5 u4(fix 1))'}
                      </h1>
                      <p className="text-xs opacity-50 mt-1">
                        {isJa
                          ? 'ディスプレイ、動的環境背景、サウンド、電源、マルチタスク環境を管理します'
                          : 'Manage display, dynamic world backgrounds, audio, power, and multitasking behavior'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-glassium-u4-notes'))}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/25 to-fuchsia-500/25 hover:from-cyan-500/40 hover:to-fuchsia-500/40 border border-cyan-400/40 text-xs font-bold text-cyan-200 flex items-center gap-2 transition cursor-pointer shadow-md"
                    >
                      <Icon name="Sparkles" size={15} className="text-cyan-300" />
                      <span>GlassiumOS 5 u4(fix 1) アップデート一覧を見る</span>
                    </button>
                  </div>

                  {/* u4(fix 1) Update List Card */}
                  <div className={`${cardSurfaceClass} p-4 space-y-3`}>
                    <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 text-[10px] font-mono font-bold">
                          u4(fix 1)
                        </span>
                        <span className="text-xs font-bold">
                          GlassiumOS 5 u4(fix 1) アップデート一覧
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-glassium-u4-notes'))}
                        className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                      >
                        詳細モーダルを開く →
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                        <div className="font-bold text-fuchsia-300">
                          【Fix 1] テーマ・アクセントカラーの24bit自由選択＆OS全体・Liquid Glass色反映
                        </div>
                        <div className="text-[11px] opacity-65 mt-0.5 leading-relaxed">
                          プリセット固定を廃止し、壁紙からの連続24bit RGB自動抽出＆自由カラーピッカーに対応。OS全体のウィンドウ・タイトルバーへのテーマ色反映と、Liquid Glass領域のガラス色（ティント）変更に対応。
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                        <div className="font-bold text-rose-300">
                          【Fix 1] 音楽アプリのフル尺再生・歌詞同期ズレ修正・再生中ピル消去＆上部バー自動表示
                        </div>
                        <div className="text-[11px] opacity-65 mt-0.5 leading-relaxed">
                          フル尺ストリーム解決強化とプレビュー時のPreviewバッジ表示、ミリ秒単位の歌詞同期、再生中でも消せる音楽ピル、マウス上端移動時の上部バー表示、デスクトップペット削除を反映。
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                        <div className="font-bold text-indigo-300">
                          【Fix 1] Ultraviolet XORプロキシ復号修正・ゲームカタログ・映画/アニメ検索＆Wisp通信改善
                        </div>
                        <div className="text-[11px] opacity-65 mt-0.5 leading-relaxed">
                          Ultraviolet URLの%60復号バグ（F1）、/api/proxy・/api/html-runner・/api/games/catalog（F2）、Naruto等を含む映画・アニメ検索（F3）、AI状態フラグ（D1）、Wispプリセット整理（D2）、Renderコールドスタート待機延長（D3）を修正。
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 【BETA】GlassiumOS 6 future: Glasispect UI 2: Material & Taskbar/Icon Studio */}
                  {renderGlassium6BetaStudio()}

                  <div className={`${cardSurfaceClass} divide-y ${dividerClass}`}>
                    {SYSTEM_CARDS.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setSystemSubView(card.id);
                        }}
                        className={`w-full flex items-center justify-between py-4 px-4 transition text-left group ${rowHoverClass}`}
                      >
                        <div className="flex items-center gap-4 min-w-0 pr-4">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.badgeGradient} border flex items-center justify-center shrink-0 shadow-inner ${card.iconColor}`}
                          >
                            <Icon name={card.icon} size={19} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold tracking-tight group-hover:text-[var(--os-accent)] transition-colors">
                              {isJa ? card.titleJa : card.titleEn}
                            </div>
                            <div className="text-[11px] opacity-50 truncate mt-0.5 leading-relaxed">
                              {isJa ? card.descJa : card.descEn}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[11px] font-medium opacity-45 group-hover:opacity-75 transition-opacity">
                            {getSystemCardValueLabel(card.id)}
                          </span>
                          <Icon
                            name="ChevronRight"
                            size={15}
                            className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 transition"
                          />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Backend Server Connection Card (Render / Koyeb / Railway) */}
                  <div className={`${cardSurfaceClass} p-4 space-y-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 via-cyan-500/15 to-blue-600/10 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner text-emerald-300">
                          <Icon name="Server" size={19} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold tracking-tight">
                            {isJa ? 'バックエンドサーバー接続 (Render / Koyeb)' : 'Backend Server (Render / Koyeb)'}
                          </div>
                          <div className="text-[11px] opacity-50 mt-0.5 leading-relaxed">
                            {isJa
                              ? 'GitHub Pages / 独自ドメイン運用時にサーバーURL（Render / Koyeb 等）を設定すると、Ultraviolet・Scramjet・フル尺音楽・映画・AIがサーバー経由で動作します'
                              : 'Connect your Render or Koyeb server URL for Ultraviolet, Scramjet, Full Music, Movie & AI APIs'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="url"
                        value={koyebUrlInput}
                        onChange={(e) => setKoyebUrlInput(e.target.value)}
                        placeholder="https://glassiumos-backend-2.onrender.com"
                        className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-mono border outline-none transition ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                            : 'bg-black/40 border-white/15 text-white focus:border-cyan-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleSaveAndTestKoyebUrl}
                        className="px-4 py-2 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110 shrink-0"
                      >
                        {isJa ? '保存して接続テスト' : 'Save & Test'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBackendBaseUrl('https://glassiumos-backend-2.onrender.com');
                          setKoyebUrlInput('https://glassiumos-backend-2.onrender.com');
                          setKoyebTestStatus('idle');
                          setKoyebTestMessage(
                            isJa
                              ? '標準サーバー (https://glassiumos-backend-2.onrender.com) に設定しました'
                              : 'Reset to default server (https://glassiumos-backend-2.onrender.com)'
                          );
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 ${
                          isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-white/80 hover:bg-white/15'
                        }`}
                      >
                        {isJa ? '初期値に戻す' : 'Reset'}
                      </button>
                    </div>

                    {koyebTestMessage && (
                      <div
                        className={`p-2.5 rounded-xl text-[11px] font-medium border-l-2 ${
                          koyebTestStatus === 'success'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : koyebTestStatus === 'error'
                            ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                            : 'border-sky-500 bg-sky-500/10 text-sky-400'
                        }`}
                      >
                        {koyebTestMessage}
                      </div>
                    )}
                  </div>
                </>
              ) : systemSubView === 'display' ? (
                /* ---------------- DISPLAY & WALLPAPERS SUB-PAGE ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('ディスプレイと背景', 'Display & Wallpapers', () => setSystemSubView('main'))}

                  {/* 0. Dynamic World Wallpaper Control Studio (Location, Terrain, Weather & Snow Accumulation) */}
                  <div className={`${cardSurfaceClass} p-4 space-y-3 border border-cyan-400/30`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-bold tracking-tight">
                            季節・場所・天候・積雪ライブ壁紙 (Dynamic World Wallpaper)
                          </h3>
                        </div>
                        <p className="text-[11px] opacity-65 mt-0.5">
                          場所設定に応じて都市部（高層ビル・密集住宅）、埼玉・郊外平原（遠い山と広い原っぱ）、山岳部（連なる山々）に地形が変化し、全12種の天候や積雪量の増加がリアルタイムに反映されます
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setSelectedCustomId(null);
                          setWallpaper('dynamic-world');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          wallpaper === 'dynamic-world' && !selectedCustomId
                            ? 'bg-[var(--os-accent)] text-black shadow-md'
                            : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30'
                        }`}
                      >
                        {wallpaper === 'dynamic-world' && !selectedCustomId ? '✓ 適用中 (Dynamic World)' : 'この動的背景を適用'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                      <div>
                        <label className="block text-[10px] opacity-65 mb-1 font-semibold">
                          📍 場所設定 (Location)
                        </label>
                        <select
                          value={dynWorldCfg.locationId}
                          onChange={(e) => {
                            setSelectedCustomId(null);
                            setWallpaper('dynamic-world');
                            updateDynWorld({ locationId: e.target.value });
                          }}
                          className={`w-full p-2 rounded-lg text-xs border outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        >
                          {DYNAMIC_LOCATION_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.labelJa}
                            </option>
                          ))}
                        </select>
                        {dynWorldCfg.locationId === 'custom' && (
                          <input
                            type="text"
                            value={dynWorldCfg.customLocationName || ''}
                            onChange={(e) => {
                              setSelectedCustomId(null);
                              setWallpaper('dynamic-world');
                              updateDynWorld({ customLocationName: e.target.value });
                            }}
                            placeholder="例: さいたま / 渋谷 / 軽井沢..."
                            className={`mt-1.5 w-full p-1.5 rounded-lg text-xs border outline-none ${
                              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                            }`}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] opacity-65 mb-1 font-semibold">
                          🏞️ 地形・街並みスタイル (Terrain)
                        </label>
                        <select
                          value={dynWorldCfg.terrainType}
                          onChange={(e) => {
                            setSelectedCustomId(null);
                            setWallpaper('dynamic-world');
                            updateDynWorld({
                              terrainType: e.target.value as DynamicWorldWallpaperConfig['terrainType'],
                            });
                          }}
                          className={`w-full p-2 rounded-lg text-xs border outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        >
                          <option value="auto">🔄 場所から自動判定</option>
                          <option value="suburban-plains">🌾 埼玉・郊外平原 (遠い山と広い原)</option>
                          <option value="urban">🏙️ 都市部 (高層ビル・密集住宅)</option>
                          <option value="mountain">⛰️ 山岳部 (連なる山々・森林)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] opacity-65 mb-1 font-semibold">
                          🌦️ 天候 (Weather — 全12種 + 自動連動)
                        </label>
                        <select
                          value={dynWorldCfg.weather}
                          onChange={(e) => {
                            setSelectedCustomId(null);
                            setWallpaper('dynamic-world');
                            const nextW = e.target.value as DynamicWorldWallpaperConfig['weather'];
                            updateDynWorld({
                              weather: nextW,
                              ...(nextW === 'HeavySnow' && dynWorldCfg.snowAccumulation < 40
                                ? { snowAccumulation: 65 }
                                : nextW === 'Snow' && dynWorldCfg.snowAccumulation < 15
                                ? { snowAccumulation: 30 }
                                : {}),
                            });
                          }}
                          className={`w-full p-2 rounded-lg text-xs border outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        >
                          <option value="auto">🔄 現地の天気に自動連動</option>
                          <option value="Sunny">☀️ 快晴 (Sunny)</option>
                          <option value="PartlyCloudy">🌤️ 晴れ時々曇り (Partly Cloudy)</option>
                          <option value="Cloudy">☁️ 曇天 (Cloudy)</option>
                          <option value="LightRain">🌦️ 小雨・霧雨 (Light Rain)</option>
                          <option value="Rainy">🌧️ 雨 (Rainy)</option>
                          <option value="HeavyRain">⛈️ 豪雨・暴風雨 (Heavy Rain)</option>
                          <option value="Thunderstorm">⚡ 雷雨・稲妻 (Thunderstorm)</option>
                          <option value="Fog">🌫️ 霧・濃霧 (Fog)</option>
                          <option value="Snow">❄️ 雪 (Snow)</option>
                          <option value="HeavySnow">🌨️ 大雪・吹雪 (Heavy Snow)</option>
                          <option value="Sunshower">🌈 天気雨・虹 (Sunshower)</option>
                          <option value="Aurora">🌌 オーロラ (Aurora)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                      <div>
                        <label className="block text-[10px] opacity-65 mb-1 font-semibold">
                          ❄️ 積雪量 ({Math.round(dynWorldCfg.snowAccumulation)}%)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={dynWorldCfg.snowAccumulation}
                            onChange={(e) => {
                              setSelectedCustomId(null);
                              setWallpaper('dynamic-world');
                              updateDynWorld({ snowAccumulation: Number(e.target.value) });
                            }}
                            className="flex-1 accent-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomId(null);
                              setWallpaper('dynamic-world');
                              updateDynWorld({
                                snowAccumulation: dynWorldCfg.snowAccumulation >= 80 ? 0 : 85,
                              });
                            }}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold"
                          >
                            {dynWorldCfg.snowAccumulation >= 80 ? '除雪' : '豪雪'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] opacity-65 mb-1 font-semibold">季節 (Season)</label>
                        <select
                          value={dynWorldCfg.season}
                          onChange={(e) => {
                            setSelectedCustomId(null);
                            setWallpaper('dynamic-world');
                            updateDynWorld({ season: e.target.value as DynamicWorldWallpaperConfig['season'] });
                          }}
                          className={`w-full p-2 rounded-lg text-xs border outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        >
                          <option value="auto">自動 (現在の月)</option>
                          <option value="spring">春 (桜吹雪)</option>
                          <option value="summer">夏 (新緑・蛍)</option>
                          <option value="autumn">秋 (紅葉・落ち葉)</option>
                          <option value="winter">冬 (銀世界・雪)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] opacity-65 mb-1 font-semibold">
                          風速 ({dynWorldCfg.windSpeedMs.toFixed(1)} m/s) / 風向 ({dynWorldCfg.windDirection})
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min={0}
                            max={30}
                            step={0.5}
                            value={dynWorldCfg.windSpeedMs}
                            onChange={(e) => {
                              setSelectedCustomId(null);
                              setWallpaper('dynamic-world');
                              updateDynWorld({ autoSyncLiveWeather: false, windSpeedMs: Number(e.target.value) });
                            }}
                            className="flex-1 accent-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateDynWorld({
                                windDirection: dynWorldCfg.windDirection === 'W→E' ? 'E→W' : 'W→E',
                              })
                            }
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold"
                          >
                            {dynWorldCfg.windDirection}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] opacity-65 mb-1 font-semibold">
                          時間帯 (Time of Day)
                        </label>
                        <select
                          value={dynWorldCfg.timeOfDay}
                          onChange={(e) => {
                            setSelectedCustomId(null);
                            setWallpaper('dynamic-world');
                            updateDynWorld({ timeOfDay: e.target.value as DynamicWorldWallpaperConfig['timeOfDay'] });
                          }}
                          className={`w-full p-2 rounded-lg text-xs border outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        >
                          <option value="auto">自動 (現在時刻連動)</option>
                          <option value="dawn">🌅 夜明け・朝焼け</option>
                          <option value="day">☀️ 昼 (青空)</option>
                          <option value="dusk">🌇 夕暮れ (サンセット)</option>
                          <option value="night">🌙 夜・星空</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 0B. Bing Daily Nature Wallpaper Studio (Desktop Background & Lock Screen) */}
                  <div className={`${cardSurfaceClass} p-4 space-y-3.5 border border-emerald-400/30`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                            BING DAILY
                          </span>
                          <h3 className="text-[13px] font-bold tracking-tight">
                            Bing 日替わり自然壁紙 (デスクトップ背景 & ロック画面対応)
                          </h3>
                        </div>
                        <p className="text-[11px] opacity-65 mt-0.5">
                          GitHub Pages や script.google.com でも直接表示できるマルチCDN構成。デスクトップ背景にもロック画面にもワンクリックで設定できます。
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setSelectedCustomId(null);
                            setWallpaper('bing');
                            addNotification({
                              title: 'Desktop Wallpaper',
                              message: 'デスクトップ背景を「Bing 日替わり自然壁紙」に設定しました。',
                            });
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            wallpaper === 'bing' && !selectedCustomId
                              ? 'bg-[var(--os-accent)] text-black shadow-md'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                          }`}
                        >
                          {wallpaper === 'bing' && !selectedCustomId
                            ? '✓ デスクトップ適用中'
                            : 'デスクトップ背景に適用'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playSound('click');
                            updateLockWallpaper({ mode: 'bing', bingIndex: desktopBingIdx });
                            addNotification({
                              title: 'Lock Screen',
                              message: 'ロック画面の壁紙を「Bing 日替わり自然壁紙」に設定しました。',
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            lockWallCfg.mode === 'bing'
                              ? 'bg-cyan-400 text-slate-950 shadow-md'
                              : 'bg-white/10 hover:bg-white/15 text-white/85 border border-white/15'
                          }`}
                        >
                          {lockWallCfg.mode === 'bing' ? '✓ ロック画面適用中' : 'ロック画面にも適用'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      {bingList.map((item, idx) => {
                        const isDesktopActive =
                          wallpaper === 'bing' && !selectedCustomId && desktopBingIdx === idx;
                        const isLockActive =
                          lockWallCfg.mode === 'bing' && lockWallCfg.bingIndex === idx;
                        return (
                          <div
                            key={item.startdate || idx}
                            className={`group relative rounded-xl overflow-hidden border transition h-28 flex flex-col justify-between p-2.5 ${
                              isDesktopActive || isLockActive
                                ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                : 'border-white/15 opacity-90 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={item.rawUrl || item.url}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const imgEl = e.currentTarget;
                                if (item.backupUrl && imgEl.src !== item.backupUrl) {
                                  imgEl.src = item.backupUrl;
                                } else {
                                  imgEl.src = makeFallbackNatureSvgDataUri(item.title);
                                }
                              }}
                              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />

                            <div className="relative z-10 flex items-center justify-between gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-black/65 text-[9px] font-mono text-emerald-300 font-bold">
                                #{idx + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                {isDesktopActive && (
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--os-accent)] text-black text-[9px] font-bold">
                                    Desktop
                                  </span>
                                )}
                                {isLockActive && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 text-[9px] font-bold">
                                    Lock
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="relative z-10 space-y-1.5">
                              <div className="text-[11px] font-bold text-white truncate drop-shadow">
                                {item.title}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    playSound('click');
                                    setSelectedCustomId(null);
                                    setWallpaper('bing');
                                    setDesktopBingIndex(idx);
                                    setDesktopBingIdxState(idx);
                                  }}
                                  className="flex-1 py-1 px-1.5 rounded bg-white/20 hover:bg-[var(--os-accent)] hover:text-black text-white text-[10px] font-bold transition cursor-pointer"
                                >
                                  デスクトップに設定
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    playSound('click');
                                    updateLockWallpaper({ mode: 'bing', bingIndex: idx });
                                  }}
                                  className="py-1 px-2 rounded bg-black/60 hover:bg-cyan-400 hover:text-slate-950 text-cyan-200 text-[10px] font-bold transition cursor-pointer"
                                  title="ロック画面に設定"
                                >
                                  ロック画面
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 0C. Lock Screen Wallpaper Customization Studio */}
                  <div className={`${cardSurfaceClass} p-4 space-y-3.5 border border-sky-400/30`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-mono font-bold">
                            LOCK SCREEN
                          </span>
                          <h3 className="text-[13px] font-bold tracking-tight">
                            ロック画面の壁紙設定 (Lock Screen Wallpaper)
                          </h3>
                        </div>
                        <p className="text-[11px] opacity-65 mt-0.5">
                          ロック画面の背景を「Bing 日替わり自然壁紙」「デスクトップ背景と同期」「システム壁紙プリセット」「3D 深度テーマ」「カスタム画像」から自由に変更できます
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => lockSystem()}
                        className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Icon name="Lock" size={13} />
                        <span>ロック画面をプレビュー</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      {(
                        [
                          { id: 'bing' as LockWallpaperMode, label: '🏞️ Bing 日替わり', sub: '自然風景 (6枚)' },
                          { id: 'sync-desktop' as LockWallpaperMode, label: '🖥️ デスクトップ同期', sub: '同じ壁紙を使用' },
                          { id: 'preset' as LockWallpaperMode, label: '🎨 プリセット壁紙', sub: 'システム壁紙' },
                          { id: 'depth' as LockWallpaperMode, label: '🏔️ 3D 深度山岳', sub: 'グラデーション' },
                          { id: 'custom' as LockWallpaperMode, label: '🖼️ カスタム画像', sub: '好きな画像を設定' },
                        ] as const
                      ).map((m) => {
                        const active = lockWallCfg.mode === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              playSound('click');
                              updateLockWallpaper({ mode: m.id });
                            }}
                            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                              active
                                ? 'bg-[var(--os-accent)] text-black font-bold border-transparent shadow-md'
                                : isLight
                                ? 'bg-slate-200/70 hover:bg-slate-300/70 text-slate-800 border-slate-300'
                                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                            }`}
                          >
                            <div className="text-xs font-bold">{m.label}</div>
                            <div className={`text-[10px] mt-0.5 ${active ? 'opacity-85' : 'opacity-55'}`}>
                              {m.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {lockWallCfg.mode === 'preset' && (
                      <div className="pt-2 border-t border-white/10">
                        <label className="block text-[11px] font-bold mb-2 opacity-80">
                          ロック画面に表示するシステム壁紙プリセットを選択:
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {WALLPAPER_KEYS.map((k) => {
                            const wp = WALLPAPERS[k];
                            const selected = lockWallCfg.presetWallpaper === k;
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => {
                                  playSound('click');
                                  updateLockWallpaper({ mode: 'preset', presetWallpaper: k });
                                }}
                                style={{ background: wp?.preview || 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}
                                className={`p-2 rounded-lg text-left h-14 flex flex-col justify-end relative overflow-hidden border ${
                                  selected
                                    ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                    : 'border-white/15 opacity-85 hover:opacity-100'
                                }`}
                              >
                                <span
                                  style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                                  className="text-[10px] font-bold truncate"
                                >
                                  {wp?.label || k}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {lockWallCfg.mode === 'depth' && (
                      <div className="pt-2 border-t border-white/10">
                        <label className="block text-[11px] font-bold mb-2 opacity-80">
                          ロック画面の 3D 深度マウンテン背景テーマを選択:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {(
                            [
                              { id: 'alpine', label: '🏔️ Alpine Ridge (蒼氷)' },
                              { id: 'aurora', label: '🌌 Aurora Crest (極光)' },
                              { id: 'cyber-arch', label: '🔮 Cyber Arch (紫電)' },
                              { id: 'golden-dusk', label: '🌇 Golden Dusk (黄金)' },
                            ] as const
                          ).map((sc) => (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => {
                                playSound('click');
                                updateLockWallpaper({ mode: 'depth', depthScene: sc.id });
                              }}
                              className={`p-2.5 rounded-xl font-bold text-center border transition cursor-pointer ${
                                lockWallCfg.depthScene === sc.id
                                  ? 'bg-[var(--os-accent)] text-black border-transparent'
                                  : 'bg-white/5 hover:bg-white/10 border-white/10'
                              }`}
                            >
                              {sc.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {lockWallCfg.mode === 'custom' && (
                      <div className="pt-2 border-t border-white/10 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] opacity-80">
                            {lockWallCfg.customImageUrl
                              ? `現在のロック画面画像: ${lockWallCfg.customImageName || 'カスタム画像'}`
                              : 'ロック画面用の画像をアップロードするか、下のカスタム壁紙から選択してください'}
                          </span>
                          <button
                            type="button"
                            onClick={() => lockWallpaperInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110 cursor-pointer"
                          >
                            ロック画面用の画像をアップロード
                          </button>
                          <input
                            ref={lockWallpaperInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLockWallpaperUpload}
                            className="hidden"
                          />
                        </div>
                        {customWallpapers.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {customWallpapers.map((cw) => (
                              <button
                                key={cw.id}
                                type="button"
                                onClick={() => {
                                  playSound('click');
                                  updateLockWallpaper({
                                    mode: 'custom',
                                    customImageUrl: cw.dataUrl,
                                    customImageName: cw.name,
                                  });
                                }}
                                style={{
                                  backgroundImage: `url(${cw.dataUrl})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                                className={`h-16 rounded-lg p-2 flex items-end border ${
                                  lockWallCfg.customImageUrl === cw.dataUrl
                                    ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                    : 'border-white/15 opacity-85 hover:opacity-100'
                                }`}
                              >
                                <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded truncate">
                                  {cw.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1. Built-In Wallpapers with Guaranteed Inline CSS Previews */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-[13px] font-bold tracking-tight">
                          {isJa ? 'システム壁紙・Golden Sparkle' : 'System Wallpapers & Golden Sparkle'}
                        </h3>
                        <p className="text-[11px] opacity-50 mt-0.5">
                          {isJa
                            ? 'クリックすると即座にデスクトップ背景へ反映されます'
                            : 'Select a preset to apply immediately to your desktop'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {WALLPAPER_KEYS.map((k) => {
                        const wp = WALLPAPERS[k];
                        const selected = wallpaper === k && !selectedCustomId;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setSelectedCustomId(null);
                              setWallpaper(k);
                            }}
                            style={{ background: wp?.preview || 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}
                            className={`p-3 text-left transition relative overflow-hidden flex flex-col justify-between h-24 ${
                              selected
                                ? 'border-t-2 border-t-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                          >
                            {/* Subtle visual horizon wave inside preview */}
                            <svg
                              viewBox="0 0 200 60"
                              className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-12 opacity-35"
                              preserveAspectRatio="none"
                            >
                              <path
                                d="M0,30 C50,10 150,50 200,20 L200,60 L0,60 Z"
                                fill="rgba(255,255,255,0.22)"
                              />
                            </svg>

                            <div className="relative z-10 flex items-center justify-between">
                              <span
                                style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#ffffff' }}
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                              >
                                {k}
                              </span>
                              {selected && (
                                <span
                                  style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#38bdf8' }}
                                  className="p-0.5 rounded-full"
                                >
                                  <Icon name="CheckCircle2" size={16} />
                                </span>
                              )}
                            </div>
                            <div
                              style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}
                              className="relative z-10 text-xs font-bold truncate"
                            >
                              {wp?.label || k}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Custom Uploaded Wallpapers */}
                  <div className={`pt-5 border-t space-y-3 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">カスタム壁紙のアップロード (Custom Image Wallpaper)</h3>
                        <p className="text-[11px] opacity-60">お好みの画像ファイルをデスクトップ壁紙として追加・選択します</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        画像をアップロード
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCustomWallpaperUpload}
                        className="hidden"
                      />
                    </div>

                    {customWallpapers.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        {customWallpapers.map((cw) => {
                          const isSelected = selectedCustomId === cw.id;
                          return (
                            <button
                              key={cw.id}
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setSelectedCustomId(cw.id);
                              }}
                              style={{
                                backgroundImage: `url(${cw.dataUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                              className={`p-3 text-left transition relative overflow-hidden flex flex-col justify-between h-24 ${
                                isSelected ? 'ring-2 ring-[var(--os-accent)]' : 'opacity-90 hover:opacity-100'
                              }`}
                            >
                              <div className="relative z-10 flex items-center justify-between">
                                <span
                                  style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#ffffff' }}
                                  className="text-[10px] font-bold px-2 py-0.5"
                                >
                                  CUSTOM
                                </span>
                                {isSelected && (
                                  <span
                                    style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#38bdf8' }}
                                    className="p-0.5 rounded-full"
                                  >
                                    <Icon name="CheckCircle2" size={16} />
                                  </span>
                                )}
                              </div>
                              <div
                                style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                                className="relative z-10 text-xs font-bold truncate"
                              >
                                {cw.name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Restored 2-Versions-Ago Default Live2D Wallpapers (5 Colors) + Current 10 Presets */}
                  <div className={`pt-5 border-t space-y-4 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">
                          復刻デフォルト Live2D 壁紙 (Restored Default Live2D — 5 Signature Colors)
                        </h3>
                        <p className="text-[11px] opacity-60">
                          2つ前のバージョンのデフォルトだった Live2D シルクオーロラ壁紙（全5色）
                        </p>
                      </div>
                      <ToggleSwitch checked={auroraParticles} onChange={setAuroraParticles} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {RESTORED_DEFAULT_LIVE2D_PALETTES.map((p) => {
                        const selected = wallpaper === 'live2d' && !selectedCustomId && auroraColor === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setSelectedCustomId(null);
                              setWallpaper('live2d');
                              setAuroraColor(p.id);
                            }}
                            style={{ background: p.cssGradient }}
                            className={`p-3 text-left transition relative overflow-hidden h-24 flex flex-col justify-between ${
                              selected
                                ? 'border-t-2 border-t-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                          >
                            <svg
                              viewBox="0 0 200 60"
                              className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-14 opacity-55"
                              preserveAspectRatio="none"
                            >
                              <circle cx="155" cy="20" r="14" fill={p.accentWave} fillOpacity="0.45" />
                              <path
                                d="M0,32 Q50,6 100,28 T200,16 L200,60 L0,60 Z"
                                fill={p.accentWave}
                                fillOpacity="0.45"
                              />
                            </svg>

                            <div className="relative z-10 flex items-center justify-between">
                              <span
                                style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                                className="text-xs font-bold"
                              >
                                {p.label}
                              </span>
                              {selected && (
                                <span
                                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}
                                  className="p-0.5 rounded-full"
                                >
                                  <Icon name="CheckCircle2" size={16} />
                                </span>
                              )}
                            </div>
                            <span
                              style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                              className="relative z-10 text-[10px] line-clamp-1"
                            >
                              {p.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className={`pt-4 border-t ${isLight ? 'border-slate-300/70' : 'border-white/[0.08]'}`}>
                      <h3 className="text-xs font-bold">現行 2D ライブ壁紙コレクション (Current 10 Live Wallpapers)</h3>
                      <p className="text-[11px] opacity-60 mb-3">
                        既存の 2D ライブ壁紙コレクションもすべてそのまま利用可能です
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {AURORA_PALETTES.map((p) => {
                        const selected = wallpaper === 'live2d' && !selectedCustomId && auroraColor === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setSelectedCustomId(null);
                              setWallpaper('live2d');
                              setAuroraColor(p.id);
                            }}
                            style={{ background: p.cssGradient }}
                            className={`p-3 text-left transition relative overflow-hidden h-24 flex flex-col justify-between ${
                              selected
                                ? 'border-t-2 border-t-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                          >
                            {/* Decorative ribbon wave preview */}
                            <svg
                              viewBox="0 0 200 60"
                              className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-14 opacity-45"
                              preserveAspectRatio="none"
                            >
                              <path
                                d="M0,35 Q50,5 100,30 T200,18 L200,60 L0,60 Z"
                                fill={p.accentWave}
                                fillOpacity="0.45"
                              />
                            </svg>

                            <div className="relative z-10 flex items-center justify-between">
                              <span
                                style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                                className="text-xs font-bold"
                              >
                                {p.label}
                              </span>
                              {selected && (
                                <span
                                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}
                                  className="p-0.5 rounded-full"
                                >
                                  <Icon name="CheckCircle2" size={16} />
                                </span>
                              )}
                            </div>
                            <span
                              style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                              className="relative z-10 text-[10px] line-clamp-1"
                            >
                              {p.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 3B. Restored Classic 2D Live Wallpapers (8 Previous-Version Live Wallpapers) */}
                    <div className={`pt-4 border-t space-y-3 ${isLight ? 'border-slate-300/70' : 'border-white/[0.08]'}`}>
                      <div>
                        <h3 className="text-xs font-bold">
                          旧バージョン復刻 2D ライブ壁紙 (Restored Classic 2D Live Wallpapers)
                        </h3>
                        <p className="text-[11px] opacity-60">
                          前のバージョンまで搭載されていたボケ玉＆流れ星、レトロ太陽、深海、マトリックス、銀河渦、蛍の森などの2Dライブ壁紙
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CLASSIC_LIVE2D_PALETTES.map((p) => {
                          const selected = wallpaper === 'live2d' && !selectedCustomId && auroraColor === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setSelectedCustomId(null);
                                setWallpaper('live2d');
                                setAuroraColor(p.id);
                              }}
                              style={{ background: p.cssGradient }}
                              className={`p-3 text-left transition relative overflow-hidden h-24 flex flex-col justify-between ${
                                selected
                                  ? 'border-t-2 border-t-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                  : 'opacity-90 hover:opacity-100'
                              }`}
                            >
                              {/* Decorative classic orb & wave preview */}
                              <svg
                                viewBox="0 0 200 60"
                                className="pointer-events-none absolute inset-0 w-full h-full opacity-50"
                                preserveAspectRatio="none"
                              >
                                <circle cx="155" cy="22" r="16" fill={p.accentWave} fillOpacity="0.45" />
                                <circle cx="45" cy="36" r="10" fill="#ffffff" fillOpacity="0.25" />
                                <path
                                  d="M0,42 Q60,18 120,38 T200,24 L200,60 L0,60 Z"
                                  fill={p.accentWave}
                                  fillOpacity="0.35"
                                />
                              </svg>

                              <div className="relative z-10 flex items-center justify-between">
                                <span
                                  style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                                  className="text-xs font-bold"
                                >
                                  {p.label}
                                </span>
                                {selected && (
                                  <span
                                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}
                                    className="p-0.5 rounded-full"
                                  >
                                    <Icon name="CheckCircle2" size={16} />
                                  </span>
                                )}
                              </div>
                              <span
                                style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                                className="relative z-10 text-[10px] line-clamp-1"
                              >
                                {p.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3C. Restored 3D Space Black Hole & WebGL Shader Live Wallpapers */}
                    <div className={`pt-4 border-t space-y-3 ${isLight ? 'border-slate-300/70' : 'border-white/[0.08]'}`}>
                      <div>
                        <h3 className="text-xs font-bold">
                          旧バージョン復刻 3D 宇宙ブラックホール ＆ WebGL シェーダーライブ壁紙
                        </h3>
                        <p className="text-[11px] opacity-60">
                          Three.js レイマーチングによる 3D ブラックホール（全5プリセット）および Liquid Silk 3D シェーダー
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {SPACE_3D_PRESETS.map((sp) => {
                          const selected = wallpaper === 'space' && !selectedCustomId && nebulaPreset === sp.id;
                          return (
                            <button
                              key={sp.id}
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setSelectedCustomId(null);
                                setWallpaper('space');
                                setNebulaPreset(sp.id);
                              }}
                              style={{ background: sp.cssGradient }}
                              className={`p-3 text-left transition relative overflow-hidden h-24 flex flex-col justify-between ${
                                selected
                                  ? 'border-t-2 border-t-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                  : 'opacity-90 hover:opacity-100'
                              }`}
                            >
                              {/* Black Hole Singularity Accretion Disk Preview */}
                              <svg
                                viewBox="0 0 200 80"
                                className="pointer-events-none absolute inset-0 w-full h-full opacity-70"
                                preserveAspectRatio="xMidYMid slice"
                              >
                                <ellipse
                                  cx="145"
                                  cy="40"
                                  rx="36"
                                  ry="11"
                                  fill="none"
                                  stroke={sp.ringColor}
                                  strokeWidth="4"
                                  strokeOpacity="0.65"
                                  transform="rotate(-14 145 40)"
                                />
                                <circle cx="145" cy="40" r="12" fill="#000000" stroke={sp.ringColor} strokeWidth="2" />
                              </svg>

                              <div className="relative z-10 flex items-center justify-between">
                                <span
                                  style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                                  className="text-xs font-bold"
                                >
                                  {sp.label}
                                </span>
                                {selected && (
                                  <span
                                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}
                                    className="p-0.5 rounded-full"
                                  >
                                    <Icon name="CheckCircle2" size={16} />
                                  </span>
                                )}
                              </div>
                              <span
                                style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                                className="relative z-10 text-[10px] line-clamp-1"
                              >
                                {sp.desc}
                              </span>
                            </button>
                          );
                        })}

                        {/* WebGL Liquid Silk 3D Shader Card */}
                        {(() => {
                          const selected = wallpaper === 'shader' && !selectedCustomId;
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setSelectedCustomId(null);
                                setWallpaper('shader');
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #090d16 0%, #311042 48%, #c2410c 100%)',
                              }}
                              className={`p-3 text-left transition relative overflow-hidden h-24 flex flex-col justify-between ${
                                selected
                                  ? 'border-t-2 border-t-[var(--os-accent)] ring-2 ring-[var(--os-accent)]'
                                  : 'opacity-90 hover:opacity-100'
                              }`}
                            >
                              <svg
                                viewBox="0 0 200 80"
                                className="pointer-events-none absolute inset-0 w-full h-full opacity-70"
                                preserveAspectRatio="xMidYMid slice"
                              >
                                <circle
                                  cx="145"
                                  cy="40"
                                  r="20"
                                  fill="none"
                                  stroke="#fb923c"
                                  strokeWidth="3"
                                  strokeOpacity="0.7"
                                />
                                <circle cx="145" cy="40" r="11" fill="#000000" stroke="#fde047" strokeWidth="1.5" />
                              </svg>

                              <div className="relative z-10 flex items-center justify-between">
                                <span
                                  style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                                  className="text-xs font-bold"
                                >
                                  3D Liquid Silk Shader
                                </span>
                                {selected && (
                                  <span
                                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}
                                    className="p-0.5 rounded-full"
                                  >
                                    <Icon name="CheckCircle2" size={16} />
                                  </span>
                                )}
                              </div>
                              <span
                                style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                                className="relative z-10 text-[10px] line-clamp-1"
                              >
                                WebGL 相対論的プラズマ＆フォトンリングシェーダー
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                      <CustomSlider
                        min={0.2}
                        max={3}
                        step={0.1}
                        value={auroraSpeed}
                        onChange={setAuroraSpeed}
                        label="アニメーション流速 (Speed)"
                        valueText={`${auroraSpeed.toFixed(1)}x`}
                      />
                      <CustomSlider
                        min={20}
                        max={100}
                        value={auroraIntensity}
                        onChange={setAuroraIntensity}
                        label="エフェクト輝度 (Intensity)"
                        valueText={`${auroraIntensity}%`}
                      />
                    </div>
                  </div>

                  {/* 4. Desktop Icon Size & Grid Placement */}
                  <div className={`pt-5 border-t space-y-4 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">デスクトップグリッドスナップ</h3>
                        <p className="text-[11px] opacity-60">アイコンをグリッドに沿って自動整列します</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => resetDesktopIconPositions(true)}
                          className={`px-3 py-1 text-xs font-semibold transition ${
                            isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-white/10 hover:bg-white/15 text-white'
                          }`}
                        >
                          アイコン整列リセット
                        </button>
                        <ToggleSwitch checked={gridSnapEnabled} onChange={setGridSnapEnabled} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {(['small', 'medium', 'large'] as DesktopIconSize[]).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setDesktopIconSize(sz);
                          }}
                          className={`p-2.5 text-xs text-center transition ${
                            desktopIconSize === sz
                              ? 'bg-[var(--os-accent)] text-black font-bold'
                              : isLight
                              ? 'bg-slate-200/70 hover:bg-slate-300/70 text-slate-800'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          {DESKTOP_ICON_SIZE_PRESETS[sz].labelJa}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'sound' ? (
                /* ---------------- SOUND SUB-PAGE ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('サウンド', 'Sound', () => setSystemSubView('main'))}

                  <div className="space-y-4">
                    <CustomSlider
                      min={0}
                      max={100}
                      value={volume}
                      onChange={setVolume}
                      label={isJa ? 'マスター音量' : 'Master Volume'}
                      valueText={`${volume}%`}
                    />

                    <div className={`pt-4 border-t flex items-center justify-between ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <div>
                        <div className="text-[13px] font-bold tracking-tight">
                          {isJa ? 'システム効果音' : 'System Sound Effects'}
                        </div>
                        <div className="text-[11px] opacity-50 mt-0.5">
                          {isJa
                            ? 'クリック音、ウィンドウ起動音、通知音を再生します'
                            : 'Play interface clicks, window transitions, and notification chimes'}
                        </div>
                      </div>
                      <ToggleSwitch checked={soundEnabled} onChange={setSoundEnabled} />
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'power' ? (
                /* ---------------- POWER & SLEEP ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('電源とスリープ・自動ロック', 'Power, Sleep & Auto-Lock', () => setSystemSubView('main'))}

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-bold tracking-tight">
                          {isJa ? '画面スリープ・ロック起動' : 'Sleep & Lock Screen'}
                        </h3>
                        <p className="text-[11px] opacity-50 mt-0.5">
                          {isJa
                            ? 'Bing日替わり自然壁紙ロック画面（上にスライドでロック解除）を即座に起動します'
                            : 'Enter Bing daily nature lock screen immediately'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => lockSystem()}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        {isJa ? '今すぐロック' : 'Lock Now'}
                      </button>
                    </div>

                    {/* Auto-Lock Timeout Selector */}
                    <div className={`pt-4 border-t space-y-3 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-[13px] font-bold tracking-tight">
                            {isJa ? '画面の自動ロックまでの時間' : 'Screen Auto-Lock Timeout'}
                          </h3>
                          <p className="text-[11px] opacity-50 mt-0.5">
                            {isJa
                              ? '無操作状態が続いたときに自動でロック画面に切り替わるまでの時間を設定します（「オフ」で自動ロック無効）'
                              : 'Automatically lock screen after inactivity (choose Off to disable)'}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
                          {autoLockMinutes === 0 ? 'オフ (無効)' : `${autoLockMinutes}分`}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-xs">
                        {[
                          { m: 0, label: 'オフ' },
                          { m: 1, label: '1分' },
                          { m: 3, label: '3分' },
                          { m: 5, label: '5分' },
                          { m: 10, label: '10分' },
                          { m: 15, label: '15分' },
                          { m: 30, label: '30分' },
                          { m: 60, label: '60分' },
                        ].map((item) => (
                          <button
                            key={item.m}
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setAutoLockMinutes(item.m);
                              addNotification({
                                title: '自動ロック設定',
                                message:
                                  item.m === 0
                                    ? '画面の自動ロックを「オフ」にしました。'
                                    : `自動ロックまでの時間を「${item.m}分」に設定しました。`,
                              });
                            }}
                            className={`py-2.5 px-2 rounded-xl font-bold text-center transition cursor-pointer ${
                              autoLockMinutes === item.m
                                ? 'bg-[var(--os-accent)] text-black shadow-md'
                                : isLight
                                ? 'bg-slate-200/70 hover:bg-slate-300/70 text-slate-800'
                                : 'bg-white/5 hover:bg-white/10 text-white/80'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {isJa ? 'ロック画面スタイル' : 'Lock Screen Style'}
                        </label>
                        <select
                          value={lockScreenStyle}
                          onChange={(e) => setLockScreenStyle(e.target.value as LockScreenStyle)}
                          className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        >
                          <option value="hyperos3">GlassiumOS 5 Depth</option>
                          <option value="windows-hello">Windows Hello</option>
                          <option value="miuix">Minimal Clean</option>
                          <option value="cosmic-liquid">Ambient Glass</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {isJa ? 'スリープ時計スタイル' : 'Sleep Clock Style'}
                        </label>
                        <select
                          value={sleepClockStyle}
                          onChange={(e) => setSleepClockStyle(e.target.value as SleepClockStyle)}
                          className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        >
                          <option value="depth">3D Depth Clock</option>
                          <option value="analog">Analog Clock</option>
                          <option value="minimal">Minimal Line</option>
                          <option value="vertical">Vertical Clock</option>
                          <option value="cyber">Cyber HUD</option>
                        </select>
                      </div>
                    </div>

                    <div className={`pt-4 border-t space-y-3 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-semibold">
                            {isJa ? 'ロック画面の壁紙モード (Lock Screen Wallpaper)' : 'Lock Screen Wallpaper Mode'}
                          </label>
                          <p className="text-[11px] opacity-55">
                            {isJa
                              ? 'ロック画面の背景を Bing 日替わり自然壁紙・デスクトップ同期・プリセット・カスタム画像から選択します'
                              : 'Choose Bing Daily Nature, Desktop Sync, Preset, or Custom Image for Lock Screen'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSystemSubView('display')}
                          className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                        >
                          詳細なロック画面壁紙設定を開く →
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        {(
                          [
                            { id: 'bing' as LockWallpaperMode, label: '🏞️ Bing自然' },
                            { id: 'sync-desktop' as LockWallpaperMode, label: '🖥️ デスクトップ同期' },
                            { id: 'preset' as LockWallpaperMode, label: '🎨 プリセット' },
                            { id: 'depth' as LockWallpaperMode, label: '🏔️ 3D深度山岳' },
                            { id: 'custom' as LockWallpaperMode, label: '🖼️ カスタム画像' },
                          ] as const
                        ).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              playSound('click');
                              updateLockWallpaper({ mode: m.id });
                            }}
                            className={`p-2.5 rounded-xl text-center font-bold transition cursor-pointer ${
                              lockWallCfg.mode === m.id
                                ? 'bg-[var(--os-accent)] text-black shadow-md'
                                : isLight
                                ? 'bg-slate-200/70 hover:bg-slate-300/70'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`pt-4 border-t ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <label className="block text-xs font-semibold mb-2">
                        {isJa ? 'スリープ背景テーマ' : 'Sleep Background'}
                      </label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(['aurora', 'void', 'matrix', 'galaxy', 'retro', 'wallpaper'] as SleepBackground[]).map((bg) => (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => setSleepBackground(bg)}
                            className={`p-2.5 rounded-xl text-center capitalize transition ${
                              sleepBackground === bg
                                ? 'bg-[var(--os-accent)] text-black font-bold'
                                : isLight
                                ? 'bg-slate-200/70 hover:bg-slate-300/70'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            {bg}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`pt-4 border-t ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <label className="block text-xs font-semibold mb-2">
                        {isJa ? '時計の配置場所' : 'Clock Position'}
                      </label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(['top', 'center', 'bottom'] as ClockPosition[]).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setClockPosition(pos)}
                            className={`p-2.5 rounded-xl text-center uppercase font-mono transition ${
                              clockPosition === pos
                                ? 'bg-[var(--os-accent)] text-black font-bold'
                                : isLight
                                ? 'bg-slate-200/70 hover:bg-slate-300/70'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'multitasking' ? (
                /* ---------------- MULTITASKING & TASKBAR ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('マルチタスクとタスクバー', 'Multitasking & Taskbar', () => setSystemSubView('main'))}

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-bold tracking-tight">
                          {isJa ? 'ウィンドウ左右スナップ整列' : 'Split-Screen Window Snap'}
                        </h3>
                        <p className="text-[11px] opacity-50 mt-0.5">
                          {isJa
                            ? '開いているウィンドウを画面の左右に均等配置します'
                            : 'Tile open desktop windows side by side automatically'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click');
                          snapAllWindows5050();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        {isJa ? 'ウィンドウ整列' : 'Snap Windows'}
                      </button>
                    </div>

                    <div className={`pt-4 border-t flex items-center justify-between ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <div>
                        <h3 className="text-[13px] font-bold tracking-tight">
                          {isJa ? 'タスクバーのアイコン配置' : 'Taskbar Alignment'}
                        </h3>
                        <p className="text-[11px] opacity-50 mt-0.5">
                          {isJa ? '中央揃えまたは左揃えを切り替えます' : 'Choose centered or left-aligned taskbar icons'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTaskbarAlign('center')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            taskbarAlign === 'center'
                              ? 'bg-[var(--os-accent)] text-black font-bold'
                              : isLight
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          {isJa ? '中央揃え' : 'Center'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskbarAlign('left')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            taskbarAlign === 'left'
                              ? 'bg-[var(--os-accent)] text-black font-bold'
                              : isLight
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          {isJa ? '左揃え' : 'Left'}
                        </button>
                      </div>
                    </div>

                    <div className={`pt-4 border-t flex items-center justify-between ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <div>
                        <h3 className="text-[13px] font-bold tracking-tight">
                          {isJa ? 'タスクバーを自動的に隠す' : 'Automatically Hide Taskbar'}
                        </h3>
                        <p className="text-[11px] opacity-50 mt-0.5">
                          {isJa
                            ? 'カーソルを画面下部に移動した際のみ表示します'
                            : 'Reveal the taskbar only when hovering near the bottom edge'}
                        </p>
                      </div>
                      <ToggleSwitch checked={autoHideTaskbar} onChange={setAutoHideTaskbar} />
                    </div>

                    {/* 【BETA】GlassiumOS 6 future: Taskbar, Dock, Cloud/Fog & Glasispect UI 2: Material */}
                    <div className="pt-4 border-t border-white/10">
                      {renderGlassium6BetaStudio()}
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'language' ? (
                /* ---------------- LANGUAGE & REGION ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('言語と地域', 'Language & Region', () => setSystemSubView('main'))}

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-[13px] font-bold tracking-tight mb-1">
                        {isJa ? 'システムの表示言語' : 'System Display Language'}
                      </h3>
                      <p className="text-[11px] opacity-50 mb-4">
                        {isJa
                          ? '選択した言語ルールに沿ってシステム全体の表記を統一します'
                          : 'Unify all interface labels and descriptions in your preferred language'}
                      </p>

                      <div className={`${cardSurfaceClass} divide-y ${dividerClass}`}>
                        <button
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setLanguage('ja');
                            addNotification({ title: '言語設定', message: 'システム言語を日本語に設定しました。' });
                          }}
                          className={`w-full py-4 px-4 text-left flex items-center justify-between transition ${rowHoverClass}`}
                        >
                          <div>
                            <div className={`text-[13px] font-bold tracking-tight ${language === 'ja' ? 'text-[var(--os-accent)]' : ''}`}>
                              日本語
                            </div>
                            <div className="text-[11px] opacity-50 mt-0.5">システム全体の表記を日本語に統一します</div>
                          </div>
                          {language === 'ja' && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setLanguage('en');
                            addNotification({ title: 'Language Changed', message: 'System language set to English.' });
                          }}
                          className={`w-full py-4 px-4 text-left flex items-center justify-between transition ${rowHoverClass}`}
                        >
                          <div>
                            <div className={`text-[13px] font-bold tracking-tight ${language === 'en' ? 'text-[var(--os-accent)]' : ''}`}>
                              English
                            </div>
                            <div className="text-[11px] opacity-50 mt-0.5">Unify all system labels in English</div>
                          </div>
                          {language === 'en' && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ---------------- AI ASSISTANT SETTINGS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('AI アシスタント', 'AI Assistant', () => setSystemSubView('main'))}

                  <div className={`${cardSurfaceClass} divide-y ${dividerClass} px-4`}>
                    <div className="py-4 flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-bold tracking-tight">
                          {isJa ? 'OS操作の自動実行' : 'Auto-Execute OS Actions'}
                        </div>
                        <div className="text-[11px] opacity-50 mt-0.5">
                          {isJa
                            ? 'AIへの自然言語指示を即座にシステム設定やアプリ起動へ反映します'
                            : 'Automatically execute system changes and app launches from natural language'}
                        </div>
                      </div>
                      <ToggleSwitch checked={aiAutoExecute} onChange={setAiAutoExecute} />
                    </div>

                    <div className="py-4 flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-bold tracking-tight">
                          {isJa ? '応答スタイル' : 'Response Style'}
                        </div>
                        <div className="text-[11px] opacity-50 mt-0.5">
                          {isJa ? 'AIアシスタントおよび文章作成支援の回答トーン' : 'Tone and detail level for AI responses'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(
                          [
                            { id: 'concise', labelJa: '簡潔', labelEn: 'Concise' },
                            { id: 'balanced', labelJa: '標準', labelEn: 'Balanced' },
                            { id: 'detailed', labelJa: '詳細', labelEn: 'Detailed' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setAiResponseStyle(st.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              aiResponseStyle === st.id
                                ? 'bg-[var(--os-accent)] text-black font-bold'
                                : isLight
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-white/10 text-white'
                            }`}
                          >
                            {isJa ? st.labelJa : st.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="py-4 flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-bold tracking-tight">
                          {isJa ? 'AI エンジン接続診断' : 'AI Engine Diagnostics'}
                        </div>
                        <div className="text-[11px] opacity-50 mt-0.5">
                          {isJa
                            ? '推論エンドポイントの稼働状態を確認します'
                            : 'Verify server-side AI endpoint connectivity'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTestAIConnection}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                        >
                          {isJa ? '接続テスト' : 'Test Connection'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openApp('ai')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold ${
                            isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/10 text-white'
                          }`}
                        >
                          {isJa ? '開く' : 'Open AI'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {aiTestMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs border-l-2 ${
                        aiTestStatus === 'success'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : aiTestStatus === 'error'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                          : 'border-sky-500 bg-sky-500/10 text-sky-400'
                      }`}
                    >
                      {aiTestMessage}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ==================== 2. PERSONALIZATION CATEGORY ==================== */}
          {activeCategory === 'personalization' && (
            <motion.div
              key="cat-personalization"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-5"
            >
              {personalSubView === 'main' ? (
                <>
                  <div className="mb-5">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {isJa ? '個人用設定' : 'Personalization'}
                    </h1>
                    <p className="text-xs opacity-50 mt-1">
                      {isJa
                        ? 'シェルレイアウト、Golden Sparkle / オーロラ背景、マテリアル質感、アクセントカラーをカスタマイズします'
                        : 'Customize shell layout, Golden Sparkle / Aurora backgrounds, surface materials, and accent colors'}
                    </p>
                  </div>

                  <div className={`${cardSurfaceClass} divide-y ${dividerClass}`}>
                    <div className="py-4 px-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/25 to-slate-500/10 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
                            <Icon name="Moon" size={19} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold tracking-tight">
                                {isJa ? 'ライト / ダーク / 動的 (背景カラー・外観モード)' : 'Appearance & Dynamic Surface Mode'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono opacity-80">
                                現在:{' '}
                                {isDynamicSurfaceMode
                                  ? `動的 (${theme === 'dark' ? '黒＋背景色' : '白＋背景色'})`
                                  : theme === 'dark'
                                  ? 'ダーク'
                                  : 'ライト'}
                              </span>
                            </div>
                            <div className="text-[11px] opacity-50 mt-0.5">
                              {isJa
                                ? 'ダーク、ライトに加えて「動的」を選択すると、ダーク時は黒＋背景色、ライト時は白＋少し背景色が混ざった色になります'
                                : 'Choose Dark, Light, or Dynamic (blends wallpaper color with black in Dark mode or white in Light mode)'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {(
                          [
                            {
                              id: 'dark' as ThemeMode,
                              labelJa: 'ダーク',
                              labelEn: 'Dark',
                              subJa: '常時ダークモード',
                              icon: 'Moon',
                            },
                            {
                              id: 'light' as ThemeMode,
                              labelJa: 'ライト',
                              labelEn: 'Light',
                              subJa: '常時ライトモード',
                              icon: 'Sun',
                            },
                            {
                              id: 'dynamic' as ThemeMode,
                              labelJa: '動的 (背景色ブレンド)',
                              labelEn: 'Dynamic Blend',
                              subJa: 'ダーク時は黒＋背景色 / ライト時は白＋少し背景色',
                              icon: 'Sparkles',
                            },
                            {
                              id: 'dynamic-dark' as ThemeMode,
                              labelJa: '動的ダーク (黒＋背景色)',
                              labelEn: 'Dynamic Dark',
                              subJa: '黒と壁紙の色を混ぜたダーク背景',
                              icon: 'Palette',
                            },
                            {
                              id: 'dynamic-light' as ThemeMode,
                              labelJa: '動的ライト (白＋背景色)',
                              labelEn: 'Dynamic Light',
                              subJa: '白に少し壁紙の色が混ざったライト背景',
                              icon: 'Sun',
                            },
                            {
                              id: 'system' as ThemeMode,
                              labelJa: 'OS / 日没連動',
                              labelEn: 'Auto / Sunset',
                              subJa: '時間帯やOS設定に合わせて自動切替',
                              icon: 'CloudSun',
                            },
                          ] as const
                        ).map((opt) => {
                          const active =
                            themeMode === opt.id ||
                            (opt.id === 'system' && themeMode === 'sunset-sunrise');
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setThemeMode(opt.id);
                              }}
                              className={`p-2.5 rounded-xl text-left transition flex flex-col justify-between border cursor-pointer ${
                                active
                                  ? 'bg-[var(--os-accent)] text-black font-bold border-transparent shadow-md'
                                  : isLight
                                  ? 'bg-slate-200/75 hover:bg-slate-300/75 text-slate-800 border-slate-300/80'
                                  : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold">{isJa ? opt.labelJa : opt.labelEn}</span>
                                <Icon name={opt.icon} size={14} />
                              </div>
                              <span className={`text-[10px] mt-1 leading-tight ${active ? 'opacity-85' : 'opacity-55'}`}>
                                {opt.subJa}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* OS-Wide Theme & Liquid Glass Color Control (Auto Wallpaper Continuous Extraction + 24-bit Free Color Picker) */}
                      <div
                        className={`mt-2 p-3.5 rounded-xl border space-y-3 ${
                          isLight
                            ? 'bg-white/75 border-slate-300/80 text-slate-800'
                            : 'bg-black/35 border-white/15 text-white'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-7 h-7 rounded-lg border border-white/30 shadow-inner shrink-0"
                              style={{ background: 'var(--os-glass-window-bg)' }}
                              title="Liquid Glass 透過ティントプレビュー"
                            />
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                <span>
                                  {isJa
                                    ? 'OS全体テーマ＆Liquid Glass ティントカラー'
                                    : 'OS-Wide Theme & Liquid Glass Tint Color'}
                                </span>
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full border border-white/40"
                                  style={{
                                    backgroundColor: `rgb(${activeThemeRgb[0]}, ${activeThemeRgb[1]}, ${activeThemeRgb[2]})`,
                                  }}
                                />
                              </div>
                              <div className="text-[10px] opacity-65">
                                {!isDynamicSurfaceMode
                                  ? '現在「通常ダーク/ライト（固定色モード）」のため、壁紙を変えてもOS背景色・ガラス色は動的に変化しません'
                                  : customThemeHex
                                  ? `自由指定カラー (${customThemeHex}) を全アプリ＆Liquid Glassに反映中`
                                  : `壁紙からプリセットに丸めず連続抽出 (RGB: ${activeThemeRgb.join(', ')}) を全アプリ＆ガラスに反映中`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setThemeMode('dynamic-dark');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                isDynamicSurfaceMode && theme === 'dark'
                                  ? 'bg-[var(--os-accent)] text-black shadow-xs'
                                  : 'bg-white/10 hover:bg-white/20 opacity-75'
                              }`}
                            >
                              黒＋テーマ色 (動的ダーク)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setThemeMode('dynamic-light');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                isDynamicSurfaceMode && theme === 'light'
                                  ? 'bg-[var(--os-accent)] text-black shadow-xs'
                                  : 'bg-slate-300/60 hover:bg-slate-300 text-slate-800 opacity-75'
                              }`}
                            >
                              白＋テーマ色 (動的ライト)
                            </button>
                          </div>
                        </div>

                        {/* Free 24-bit Theme & Glass Color Picker */}
                        <div className="pt-2 border-t border-current/10 flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <label className="relative flex items-center gap-2 cursor-pointer px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold">
                              <input
                                type="color"
                                value={
                                  customThemeHex ||
                                  `#${activeThemeRgb
                                    .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
                                    .join('')}`
                                }
                                onChange={(e) => {
                                  const hex = e.target.value;
                                  setCustomThemeHex(hex);
                                  setAccentColor(hex);
                                  if (!isDynamicSurfaceMode) {
                                    setThemeMode(theme === 'light' ? 'dynamic-light' : 'dynamic-dark');
                                  }
                                }}
                                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                              />
                              <span>{isJa ? '自由に色を選ぶ (24bit)' : 'Pick Any Color'}</span>
                            </label>

                            <input
                              type="text"
                              value={
                                customThemeHex ||
                                `#${activeThemeRgb
                                  .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
                                  .join('')}`
                              }
                              onChange={(e) => {
                                const v = e.target.value.trim();
                                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                                  setCustomThemeHex(v);
                                  setAccentColor(v);
                                  if (!isDynamicSurfaceMode) {
                                    setThemeMode(theme === 'light' ? 'dynamic-light' : 'dynamic-dark');
                                  }
                                }
                              }}
                              placeholder="#38bdf8"
                              className={`w-24 px-2 py-1 rounded-lg border font-mono text-xs outline-none ${
                                isLight
                                  ? 'bg-white border-slate-300 text-slate-900'
                                  : 'bg-black/40 border-white/15 text-white'
                              }`}
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Quick continuous spectrum swatches */}
                            {[
                              '#00f2fe',
                              '#4facfe',
                              '#667eea',
                              '#a18cd1',
                              '#ff758c',
                              '#ff9a44',
                              '#f6d365',
                              '#43e97b',
                              '#38f9d7',
                            ].map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => {
                                  playSound('click');
                                  setCustomThemeHex(hex);
                                  setAccentColor(hex);
                                }}
                                style={{ backgroundColor: hex }}
                                className="w-5 h-5 rounded-full border border-white/40 shadow-xs hover:scale-115 transition cursor-pointer"
                                title={hex}
                              />
                            ))}

                            {(customThemeHex || accentColor !== 'dynamic') && (
                              <button
                                type="button"
                                onClick={() => {
                                  playSound('click');
                                  setCustomThemeHex(null);
                                  setAccentColor('dynamic');
                                }}
                                className="ml-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold transition cursor-pointer"
                              >
                                {isJa ? '壁紙から自動抽出に戻す' : 'Auto Wallpaper'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setPersonalSubView('uistyle');
                      }}
                      className={`w-full flex items-center justify-between py-4 px-4 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/25 to-blue-500/10 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
                          <Icon name="Layout" size={19} />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight group-hover:text-[var(--os-accent)] transition-colors">
                            {isJa ? 'デスクトップシェル・UIスタイル' : 'Desktop Shell & UI Style'}
                          </div>
                          <div className="text-[11px] opacity-50 mt-0.5">
                            {isJa
                              ? 'GlassiumOS 5、Windows 11、macOS、Ubuntu などのシェル操作体系を切り替え'
                              : 'Switch between GlassiumOS 5, Windows 11, macOS, Ubuntu, and more'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] font-medium opacity-45">{shellMode}</span>
                        <Icon
                          name="ChevronRight"
                          size={15}
                          className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 transition"
                        />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setActiveCategory('system');
                        setSystemSubView('display');
                      }}
                      className={`w-full flex items-center justify-between py-4 px-4 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-yellow-500/10 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                          <Icon name="Image" size={19} />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight group-hover:text-[var(--os-accent)] transition-colors">
                            {isJa ? '壁紙・Golden Sparkle・オーロラ背景' : 'Wallpapers, Golden Sparkle & Aurora'}
                          </div>
                          <div className="text-[11px] opacity-50 mt-0.5">
                            {isJa
                              ? 'マウス連動オーロラ、PS5風 Golden Sparkle、3D宇宙背景、カスタム画像'
                              : 'Mouse-interactive Aurora, Golden Sparkle, 3D cosmos, and custom images'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] font-medium opacity-45">
                          {wallpaper === 'golden-sparkle' || auroraColor === 'golden-sparkle'
                            ? 'Golden Sparkle'
                            : WALLPAPERS[wallpaper]?.label || wallpaper}
                        </span>
                        <Icon
                          name="ChevronRight"
                          size={15}
                          className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 transition"
                        />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setPersonalSubView('surface');
                      }}
                      className={`w-full flex items-center justify-between py-4 px-4 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/25 to-purple-500/10 border border-fuchsia-400/30 text-fuchsia-300 flex items-center justify-center shrink-0">
                          <Icon name="Sparkles" size={19} />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight group-hover:text-[var(--os-accent)] transition-colors">
                            {isJa ? 'サーフェスマテリアル質感' : 'Surface Material Engine'}
                          </div>
                          <div className="text-[11px] opacity-50 mt-0.5">
                            {isJa
                              ? 'Liquid Glass、Mica、Frosted Acrylic、High-Contrast Slate の質感切替'
                              : 'Switch between Liquid Glass, Mica, Frosted Acrylic, and High-Contrast Slate'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] font-medium opacity-45">{designEngine}</span>
                        <Icon
                          name="ChevronRight"
                          size={15}
                          className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 transition"
                        />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setPersonalSubView('accent');
                      }}
                      className={`w-full flex items-center justify-between py-4 px-4 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/25 to-orange-500/10 border border-rose-400/30 text-rose-300 flex items-center justify-center shrink-0">
                          <Icon name="Palette" size={19} />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight group-hover:text-[var(--os-accent)] transition-colors">
                            {isJa ? 'アクセントカラー (動的・プリセット)' : 'Accent Color (Dynamic & Presets)'}
                          </div>
                          <div className="text-[11px] opacity-50 mt-0.5">
                            {isJa
                              ? '背景の色やアップロードした画像にあわせてアクセントカラー、ダーク、ライトかで変動する「動的」モード対応'
                              : 'Supports Dynamic mode that adapts to background color, uploaded image, and dark/light mode'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-xs"
                          style={{ backgroundColor: resolvedAccentHex }}
                        />
                        <span className="text-[11px] font-medium opacity-65">
                          {accentColor === 'dynamic' ? '動的 (Dynamic)' : accentColor}
                        </span>
                        <Icon
                          name="ChevronRight"
                          size={15}
                          className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 transition"
                        />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setPersonalSubView('glass');
                      }}
                      className={`w-full flex items-center justify-between py-4 px-4 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                          <Icon name="Sliders" size={19} />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight group-hover:text-[var(--os-accent)] transition-colors">
                            {isJa ? '光学ガラス詳細パラメータ' : 'Optical Glass Parameters'}
                          </div>
                          <div className="text-[11px] opacity-50 mt-0.5">
                            {isJa
                              ? 'すりガラスのぼかし量、ウィンドウ角丸、透過率、屈折度の微調整'
                              : 'Fine-tune blur radius, corner rounding, transparency, and refraction'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] font-mono opacity-45">{blurAmount}px</span>
                        <Icon
                          name="ChevronRight"
                          size={15}
                          className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 transition"
                        />
                      </div>
                    </button>
                  </div>

                  {/* 【BETA】GlassiumOS 6 future: Glasispect UI 2: Material & Icon Styles */}
                  {renderGlassium6BetaStudio()}
                </>
              ) : personalSubView === 'uistyle' ? (
                /* ---------------- UI STYLE WITH DISTINCT DIAGRAMS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('デスクトップシェル・UIスタイル', 'Desktop Shell & UI Style', () => setPersonalSubView('main'))}

                  <div className={`${cardSurfaceClass} divide-y ${dividerClass}`}>
                    {SHELL_MODES.map((sm) => {
                      const selected = shellMode === sm.id;
                      return (
                        <button
                          key={sm.id}
                          type="button"
                          onClick={() => handleSelectShellMode(sm.id)}
                          className={`w-full py-3.5 px-4 text-left transition flex items-center gap-4 ${
                            selected ? 'bg-[var(--os-accent)]/10' : rowHoverClass
                          }`}
                        >
                          <div className="w-36 shrink-0 rounded-lg overflow-hidden border border-white/10">
                            <ShellMockupDiagram type={sm.mockupType} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-[13px] font-bold tracking-tight ${selected ? 'text-[var(--os-accent)]' : ''}`}>
                              {sm.label}
                            </div>
                            <div className="text-[11px] opacity-50 mt-0.5">{sm.desc}</div>
                          </div>
                          {selected && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : personalSubView === 'surface' ? (
                /* ---------------- SURFACE MATERIAL ENGINE ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('サーフェスマテリアル質感', 'Surface Material Engine', () => setPersonalSubView('main'))}

                  {/* 【BETA】GlassiumOS 6 future: Glasispect UI 2: Material */}
                  {renderGlassium6BetaStudio()}

                  <div className={`${cardSurfaceClass} divide-y ${dividerClass}`}>
                    {DESIGN_ENGINES.map((de) => {
                      const selected = designEngine === de.id;
                      return (
                        <button
                          key={de.id}
                          type="button"
                          onClick={() => handleSelectSurfaceEngine(de.id)}
                          className={`w-full py-3.5 px-4 text-left transition flex items-center justify-between gap-4 ${
                            selected ? 'bg-[var(--os-accent)]/10' : rowHoverClass
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-9 rounded-lg border border-white/15 shrink-0" style={{ background: de.cssBg }} />
                            <div>
                              <div className={`text-[13px] font-bold tracking-tight ${selected ? 'text-[var(--os-accent)]' : ''}`}>
                                {de.label}
                              </div>
                              <div className="text-[11px] opacity-50 mt-0.5">{de.desc}</div>
                            </div>
                          </div>
                          {selected && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : personalSubView === 'accent' ? (
                /* ---------------- ACCENT COLOR (FREE 24-BIT PICKER + CONTINUOUS DYNAMIC + PRESETS) ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('アクセントカラー・自由色選択', 'Accent & Glass Tint Color', () => setPersonalSubView('main'))}

                  {/* 1. Free 24-Bit Custom Color Picker Card */}
                  <div className={`${cardSurfaceClass} p-4 space-y-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-2xl border border-white/30 shadow-md flex items-center justify-center shrink-0"
                          style={{ background: 'var(--os-glass-window-bg)' }}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-white/80 shadow-xs"
                            style={{ backgroundColor: resolvedAccentHex }}
                          />
                        </span>
                        <div>
                          <div className="text-sm font-bold flex items-center gap-2">
                            <span>{isJa ? '自由カラーピッカー (24-bit フルカラー)' : 'Free 24-Bit Color Picker'}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[var(--os-accent)]/20 text-[var(--os-accent)] font-mono text-[11px]">
                              {resolvedAccentHex}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-60 mt-0.5">
                            {isJa
                              ? 'プリセットに縛られず好きな色を自由に選択できます。選択した色はOS全体のアプリ背景とLiquid Glassのガラス色に反映されます。'
                              : 'Freely choose any 24-bit color without preset restrictions. Reflects across all OS apps and Liquid Glass tint.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--os-accent)] text-black font-bold text-xs cursor-pointer shadow-sm hover:brightness-110 transition">
                          <input
                            type="color"
                            value={resolvedAccentHex}
                            onChange={(e) => {
                              const hex = e.target.value;
                              setAccentColor(hex);
                              setCustomThemeHex(hex);
                            }}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                          />
                          <span>{isJa ? 'カラーパレットを開く' : 'Open Color Picker'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Interactive Continuous Hue Strip */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] opacity-75">
                        <span>{isJa ? '連続スペクトラムバー (クリックまたはドラッグで自由選択)' : 'Continuous Spectrum'}</span>
                        <span className="font-mono">RGB({resolvedAccentRgb})</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        defaultValue={195}
                        onChange={(e) => {
                          const h = Number(e.target.value);
                          // Convert HSL(h, 88%, 56%) to #rrggbb
                          const s = 0.88;
                          const l = 0.56;
                          const c = (1 - Math.abs(2 * l - 1)) * s;
                          const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
                          const m = l - c / 2;
                          let r1 = 0, g1 = 0, b1 = 0;
                          if (h < 60) { r1 = c; g1 = x; b1 = 0; }
                          else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
                          else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
                          else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
                          else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
                          else { r1 = c; g1 = 0; b1 = x; }
                          const toH = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
                          const hex = `#${toH(r1)}${toH(g1)}${toH(b1)}`;
                          setAccentColor(hex);
                          setCustomThemeHex(hex);
                        }}
                        style={{
                          background:
                            'linear-gradient(90deg, #ff3b30 0%, #ff9500 17%, #ffcc00 33%, #34c759 50%, #00c7be 67%, #007aff 83%, #af52de 92%, #ff2d55 100%)',
                        }}
                        className="w-full h-3 rounded-full appearance-none cursor-pointer border border-white/25"
                      />
                    </div>
                  </div>

                  {/* 2. Dynamic Mode & Quick Presets */}
                  <div className={`${cardSurfaceClass} divide-y ${dividerClass}`}>
                    {ACCENT_COLOR_PRESETS.map((p) => {
                      const selected = accentColor === p.id && (!customThemeHex || p.id !== 'dynamic');
                      const isDynamic = p.id === 'dynamic';
                      const swatchColor = isDynamic ? resolvedAccentHex : p.hex;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setAccentColor(p.id);
                            if (p.id === 'dynamic') {
                              setCustomThemeHex(null);
                            } else {
                              setCustomThemeHex(p.hex);
                            }
                          }}
                          className={`w-full py-4 px-4 flex items-center justify-between transition text-left ${
                            selected ? 'bg-[var(--os-accent)]/10 font-bold' : rowHoverClass
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 pr-3">
                            <span
                              className="w-6 h-6 rounded-full shrink-0 shadow-sm border border-white/25 flex items-center justify-center"
                              style={{
                                background: isDynamic
                                  ? `conic-gradient(from 0deg, #38bdf8, #a855f7, #f43f5e, #f59e0b, #10b981, #38bdf8)`
                                  : swatchColor,
                              }}
                            >
                              {isDynamic && (
                                <span
                                  className="w-3 h-3 rounded-full border border-white/80"
                                  style={{ backgroundColor: resolvedAccentHex }}
                                />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[13px] font-bold tracking-tight ${selected ? 'text-[var(--os-accent)]' : ''}`}>
                                  {isDynamic ? '動的 (壁紙から連続抽出)' : p.labelJa}
                                </span>
                                {isDynamic && (
                                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                                    現在色: {resolvedAccentHex} ({theme === 'dark' ? 'ダーク最適化' : 'ライト最適化'})
                                  </span>
                                )}
                              </div>
                              {p.descJa && (
                                <div className="text-[11px] opacity-60 mt-0.5 leading-relaxed">
                                  {p.descJa}
                                </div>
                              )}
                            </div>
                          </div>
                          {selected && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ---------------- GLASS PARAMETERS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('光学ガラス詳細パラメータ', 'Optical Glass Parameters', () => setPersonalSubView('main'))}

                  <div className="space-y-5 text-xs">
                    <CustomSlider
                      min={4}
                      max={60}
                      value={blurAmount}
                      onChange={setBlurAmount}
                      label={isJa ? 'すりガラスのぼかし量' : 'Backdrop Blur Radius'}
                      valueText={`${blurAmount}px`}
                    />
                    <CustomSlider
                      min={0}
                      max={36}
                      value={cornerRadius}
                      onChange={setCornerRadius}
                      label={isJa ? 'ウィンドウ角丸' : 'Window Corner Radius'}
                      valueText={`${cornerRadius}px`}
                    />
                    <CustomSlider
                      min={10}
                      max={95}
                      value={transparency}
                      onChange={setTransparency}
                      label={isJa ? 'サーフェス不透明度' : 'Surface Opacity'}
                      valueText={`${transparency}%`}
                    />
                    <CustomSlider
                      min={0}
                      max={100}
                      value={glassWobble}
                      onChange={setGlassWobble}
                      label={isJa ? '液体ガラス屈折量' : 'Liquid Glass Refraction'}
                      valueText={`${glassWobble}%`}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ==================== 3. APPS CATEGORY ==================== */}
          {activeCategory === 'apps' && (
            <motion.div
              key="cat-apps"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-4"
            >
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight">
                  {isJa ? 'インストール済みアプリ' : 'Installed Apps'}
                </h1>
                <p className="text-xs opacity-50 mt-1">
                  {isJa
                    ? 'システム標準アプリおよび追加アプリの一覧とクイック起動'
                    : 'View and launch installed system applications'}
                </p>
              </div>

              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder={isJa ? 'アプリ名で検索...' : 'Search apps...'}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/[0.03] border-white/[0.1] text-white'
                }`}
              />

              <div className={`${cardSurfaceClass} divide-y ${dividerClass}`}>
                {installedApps
                  .filter((a) => !appSearch || a.name.toLowerCase().includes(appSearch.toLowerCase()))
                  .map((app) => (
                    <div key={app.id} className="flex items-center justify-between py-3.5 px-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-white/15 text-[var(--os-accent)] flex items-center justify-center shrink-0">
                          <Icon name={app.icon || 'AppWindow'} size={19} />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight">{app.name}</div>
                          <div className="text-[11px] opacity-50 mt-0.5">{app.description}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openApp(app.appId as AppId)}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        {isJa ? '開く' : 'Open'}
                      </button>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* ==================== 4. ACCOUNTS CATEGORY ==================== */}
          {activeCategory === 'accounts' && (
            <motion.div
              key="cat-accounts"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-4"
            >
              {accountsSubView === 'main' ? (
                <>
                  <div className="mb-5">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {isJa ? 'アカウント' : 'Accounts'}
                    </h1>
                    <p className="text-xs opacity-50 mt-1">
                      {isJa
                        ? 'ユーザープロファイル、セキュリティPIN、権限グループを管理します'
                        : 'Manage user profile, security PIN, and permission groups'}
                    </p>
                  </div>

                  <div className={`${cardSurfaceClass} divide-y ${dividerClass}`}>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setAccountsSubView('profile');
                      }}
                      className={`w-full flex items-center justify-between py-4 px-4 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/10 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                          <Icon name="User" size={19} />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight group-hover:text-[var(--os-accent)] transition-colors">
                            {isJa ? 'ユーザープロファイルとアバター' : 'User Profile & Avatar'}
                          </div>
                          <div className="text-[11px] opacity-50 mt-0.5">
                            {isJa ? '表示名、アバターアイコン、権限グループの設定' : 'Display name, avatar icon, and role group'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] font-medium opacity-45">{profileName}</span>
                        <Icon
                          name="ChevronRight"
                          size={15}
                          className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 transition"
                        />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setAccountsSubView('security');
                      }}
                      className={`w-full flex items-center justify-between py-4 px-4 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                          <Icon name="Key" size={19} />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight group-hover:text-[var(--os-accent)] transition-colors">
                            {isJa ? 'サインインとPINセキュリティ' : 'Sign-In & PIN Security'}
                          </div>
                          <div className="text-[11px] opacity-50 mt-0.5">
                            {isJa ? 'パスワード変更とロック解除PINコードの設定' : 'Password and 4-digit unlock PIN configuration'}
                          </div>
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={15}
                        className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 transition"
                      />
                    </button>
                  </div>
                </>
              ) : accountsSubView === 'profile' ? (
                /* ---------------- USER PROFILE & AVATARS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('ユーザープロファイルとアバター', 'User Profile & Avatar', () => setAccountsSubView('main'))}

                  <form onSubmit={handleSaveAccount} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold mb-2">アバターアイコン選択</label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {PRESET_AVATARS.map((av) => {
                          const selected = selectedAvatarIcon === av.icon && !customAvatarUrl;
                          return (
                            <button
                              key={av.id}
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setSelectedAvatarIcon(av.icon);
                                setCustomAvatarUrl(null);
                              }}
                              className={`p-2.5 flex flex-col items-center gap-1 transition ${
                                selected
                                  ? 'border-b-2 border-[var(--os-accent)] bg-[var(--os-accent)]/15 text-[var(--os-accent)] font-bold'
                                  : isLight
                                  ? 'bg-slate-200/60 hover:bg-slate-200'
                                  : 'bg-white/5 hover:bg-white/10'
                              }`}
                              title={av.name}
                            >
                              <Icon name={av.icon} size={20} />
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <span className="text-xs opacity-60">カスタムプロフィール画像をアップロード</span>
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="px-3.5 py-1.5 bg-[var(--os-accent)] text-black text-xs font-bold"
                        >
                          写真を選択
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCustomAvatarUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1">表示名 (User Name)</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className={`w-full p-2.5 text-xs border-b outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">メールアドレス (Email)</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className={`w-full p-2.5 text-xs border-b outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">アカウント権限グループ (Role)</label>
                      <select
                        value={profileRole}
                        onChange={(e) => setProfileRole(e.target.value as 'Administrator' | 'Developer' | 'Guest')}
                        className={`w-full text-xs p-2.5 border-b outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                        }`}
                      >
                        <option value="Administrator">Administrator (管理者権限)</option>
                        <option value="Developer">Developer (開発者アカウント)</option>
                        <option value="Guest">Guest (ゲストアカウント)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        設定を保存
                      </button>
                      {accountSaved && (
                        <span className="text-xs text-emerald-500 font-bold">プロファイル情報を更新しました</span>
                      )}
                    </div>
                  </form>
                </div>
              ) : (
                /* ---------------- SECURITY & PIN ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('サインインとPINセキュリティ', 'Sign-In & PIN Security', () => setAccountsSubView('main'))}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {isJa ? 'ログインパスワード' : 'Login Password'}
                      </label>
                      <input
                        type="password"
                        value={profilePassword}
                        onChange={(e) => setProfilePassword(e.target.value)}
                        placeholder={isJa ? 'パスワードを入力' : 'Enter password'}
                        className={`w-full p-2.5 text-xs rounded-xl border outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {isJa ? '4桁セキュリティPINコード' : '4-Digit Security PIN'}
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={securityPin}
                        onChange={(e) => setSecurityPin(e.target.value)}
                        className={`w-full p-2.5 text-xs font-mono rounded-xl border outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                        }`}
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          playSound('notify');
                          addNotification({ title: 'Security', message: isJa ? 'セキュリティPINコードを適用しました。' : 'Security PIN updated.' });
                        }}
                        className="px-4 py-2 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow"
                      >
                        {isJa ? 'PINを更新' : 'Update PIN'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
export default SettingsApp;
