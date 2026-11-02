import React, { useState, useRef } from 'react';
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
  NebulaPreset,
} from '../types';
import { WALLPAPERS } from '../wallpapers';
import { Icon } from '../Icon';
import { requestAIChat } from '../aiClient';

const WALLPAPER_KEYS = Object.keys(WALLPAPERS) as Wallpaper[];

type NavCategory = 'system' | 'personalization' | 'apps' | 'accounts';

type SystemSubView = 'main' | 'display' | 'sound' | 'power' | 'multitasking' | 'language' | 'aicomponents';
type PersonalizationSubView = 'main' | 'uistyle' | 'surface' | 'accent' | 'wallpaper' | 'glass';
type AccountsSubView = 'main' | 'profile' | 'security';

interface NavItem {
  id: NavCategory;
  label: string;
  icon: string;
}

const SIDEBAR_NAV: NavItem[] = [
  { id: 'system', label: 'System (システム)', icon: 'Monitor' },
  { id: 'personalization', label: 'Personalization (個人設定)', icon: 'Palette' },
  { id: 'apps', label: 'Apps (アプリ)', icon: 'LayoutGrid' },
  { id: 'accounts', label: 'Accounts (アカウント)', icon: 'User' },
];

interface SystemCard {
  id: SystemSubView;
  title: string;
  desc: string;
  icon: string;
}

const SYSTEM_CARDS: SystemCard[] = [
  { id: 'display', title: 'Display & Wallpapers', desc: 'Wallpapers, 2D Live Wallpapers, icon sizing, grid snap', icon: 'Monitor' },
  { id: 'sound', title: 'Sound', desc: 'Master volume and system audio effects', icon: 'Volume2' },
  { id: 'power', title: 'Power & Sleep', desc: 'Screen sleep, lock screen style, sleep clock', icon: 'BatteryCharging' },
  { id: 'multitasking', title: 'Multitasking & Taskbar', desc: '50:50 window snap, taskbar alignment, auto-hide', icon: 'Layers' },
  { id: 'language', title: 'Language & Region (言語と地域)', desc: 'OS system language selection (English [Default] / 日本語)', icon: 'Globe' },
  { id: 'aicomponents', title: 'AI Assistant Settings', desc: 'GlassiumOS 5 AI integration, response style, and connection check', icon: 'Sparkles' },
];

const AURORA_PALETTES: {
  id: AuroraColor;
  label: string;
  desc: string;
  cssGradient: string;
  accentWave: string;
}[] = [
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
    label: 'GlassiumOS 5 (標準)',
    desc: '直線と余白によるミニマルUI・タスクバーAIオムニバー統合',
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
    setTheme,
    accentColor,
    setAccentColor,
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
  } = useOS();

  const isLight = theme === 'light';
  const [activeCategory, setActiveCategory] = useState<NavCategory>('system');
  const [systemSubView, setSystemSubView] = useState<SystemSubView>('main');
  const [personalSubView, setPersonalSubView] = useState<PersonalizationSubView>('main');
  const [accountsSubView, setAccountsSubView] = useState<AccountsSubView>('main');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // AI Assistant state
  const [aiResponseStyle, setAiResponseStyle] = useState<'balanced' | 'concise' | 'detailed'>('balanced');
  const [aiAutoExecute, setAiAutoExecute] = useState(true);
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiTestMessage, setAiTestMessage] = useState('');

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

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addCustomWallpaper(file.name.replace(/\.[^.]+$/, ''), reader.result);
        playSound('notify');
        addNotification({ title: 'Display', message: 'カスタム壁紙を追加して適用しました' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAvatarUrl(reader.result);
        playSound('notify');
      }
    };
    reader.readAsDataURL(file);
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

  const renderBreadcrumbHeader = (title: string, onBack: () => void) => (
    <div className={`flex items-center gap-2 mb-5 pb-2.5 border-b ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
      <button
        type="button"
        onClick={() => {
          playSound('click');
          onBack();
        }}
        className={`p-1.5 transition ${isLight ? 'hover:bg-slate-200 text-slate-800' : 'hover:bg-white/10 text-white/90'}`}
        title="戻る"
      >
        <Icon name="ArrowLeft" size={16} />
      </button>
      <h2 className="text-sm font-bold text-[var(--os-accent)]">{title}</h2>
    </div>
  );

  const rowHoverClass = isLight ? 'hover:bg-slate-200/60' : 'hover:bg-white/[0.04]';
  const dividerClass = isLight ? 'divide-slate-300/70 border-slate-300/70' : 'divide-white/[0.08] border-white/[0.08]';

  return (
    <div
      className={`flex h-full w-full select-none overflow-hidden font-sans ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Left Sidebar Navigation */}
      <div
        className={`w-56 shrink-0 border-r p-3 flex flex-col justify-between ${
          isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/[0.08]'
        }`}
      >
        <div className="space-y-4">
          {/* User Compact Profile */}
          <div className={`flex items-center gap-3 pb-3 border-b ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
            <div className="w-9 h-9 rounded-full bg-[var(--os-accent)]/20 text-[var(--os-accent)] flex items-center justify-center font-bold overflow-hidden shrink-0">
              {customAvatarUrl ? (
                <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Icon name={selectedAvatarIcon || 'User'} size={20} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{profileName}</div>
              <div className="text-[10px] opacity-60 truncate">{profileRole}</div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/[0.05]'}`}>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-all ${
                    active
                      ? 'border-l-2 border-[var(--os-accent)] text-[var(--os-accent)] font-bold bg-[var(--os-accent)]/10'
                      : isLight
                      ? 'text-slate-800 hover:bg-slate-200/70'
                      : 'text-slate-200 hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon name={nav.icon} size={18} />
                  <span>{nav.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Version Tag */}
        <div
          className={`px-3 py-2 text-[11px] opacity-70 border-t flex items-center justify-between font-mono ${
            isLight ? 'border-slate-300' : 'border-white/[0.08]'
          }`}
        >
          <span>GlassiumOS 5</span>
          <span>Build 5.0</span>
        </div>
      </div>

      {/* Main Content View Container */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
                  <div className="mb-4">
                    <h1 className="text-xl font-bold">System (システム設定)</h1>
                    <p className="text-xs opacity-60">ディスプレイ、壁紙、音量、電源・スリープ、タスクバーの設定</p>
                  </div>

                  <div className={`divide-y border-y ${dividerClass}`}>
                    {SYSTEM_CARDS.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setSystemSubView(card.id);
                        }}
                        className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${rowHoverClass}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)] shrink-0">
                            <Icon name={card.icon} size={20} />
                          </div>
                          <div>
                            <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">
                              {card.title}
                            </div>
                            <div className="text-[11px] opacity-60 truncate">{card.desc}</div>
                          </div>
                        </div>
                        <Icon
                          name="ChevronRight"
                          size={16}
                          className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : systemSubView === 'display' ? (
                /* ---------------- DISPLAY & WALLPAPERS SUB-PAGE ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Display & Wallpapers (壁紙 ＆ ディスプレイ)', () => setSystemSubView('main'))}

                  {/* 1. Built-In Wallpapers with Guaranteed Inline CSS Previews */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold">標準壁紙 (System Wallpapers)</h3>
                        <p className="text-[11px] opacity-60">クリックすると即座にデスクトップ背景へ反映されます</p>
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

                  {/* 3. Current 2D Live Wallpapers (10 Presets) */}
                  <div className={`pt-5 border-t space-y-4 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">現行 2D ライブ壁紙コレクション (Current 10 Live Wallpapers)</h3>
                        <p className="text-[11px] opacity-60">
                          オーロラリボン、桜吹雪、サイバーグリッド、星座パルスなどのリアルタイムアニメーション背景
                        </p>
                      </div>
                      <ToggleSwitch checked={auroraParticles} onChange={setAuroraParticles} />
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
                  {renderBreadcrumbHeader('Sound (音量 ＆ 効果音)', () => setSystemSubView('main'))}

                  <div className="space-y-4">
                    <CustomSlider
                      min={0}
                      max={100}
                      value={volume}
                      onChange={setVolume}
                      label="マスター音量 (Master Volume)"
                      valueText={`${volume}%`}
                    />

                    <div className={`pt-4 border-t flex items-center justify-between ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <div>
                        <div className="text-xs font-bold">システム効果音</div>
                        <div className="text-[11px] opacity-60">クリック音、ウィンドウ起動音、通知音を再生します</div>
                      </div>
                      <ToggleSwitch checked={soundEnabled} onChange={setSoundEnabled} />
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'power' ? (
                /* ---------------- POWER & SLEEP ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Power & Sleep (スリープ ＆ ロック)', () => setSystemSubView('main'))}

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">画面スリープ (Sleep Screen)</h3>
                        <p className="text-[11px] opacity-60">ロック画面・スリープモードを即座に起動します</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => lockSystem()}
                        className="px-3.5 py-1.5 bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        スリープ起動
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1">ロック画面スタイル</label>
                        <select
                          value={lockScreenStyle}
                          onChange={(e) => setLockScreenStyle(e.target.value as LockScreenStyle)}
                          className={`w-full text-xs p-2.5 border-b outline-none ${
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
                        <label className="block text-xs font-semibold mb-1">スリープ時計スタイル</label>
                        <select
                          value={sleepClockStyle}
                          onChange={(e) => setSleepClockStyle(e.target.value as SleepClockStyle)}
                          className={`w-full text-xs p-2.5 border-b outline-none ${
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

                    <div className={`pt-4 border-t ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <label className="block text-xs font-semibold mb-2">スリープ背景テーマ</label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(['aurora', 'void', 'matrix', 'galaxy', 'retro', 'wallpaper'] as SleepBackground[]).map((bg) => (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => setSleepBackground(bg)}
                            className={`p-2.5 text-center capitalize transition ${
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
                      <label className="block text-xs font-semibold mb-2">時計の配置場所</label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(['top', 'center', 'bottom'] as ClockPosition[]).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setClockPosition(pos)}
                            className={`p-2.5 text-center uppercase font-mono transition ${
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
                  {renderBreadcrumbHeader('Multitasking & Taskbar (マルチタスク ＆ タスクバー)', () => setSystemSubView('main'))}

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">ウィンドウ左右整列 (50:50 Snap)</h3>
                        <p className="text-[11px] opacity-60">開いているウィンドウを左右50:50に自動配置します</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click');
                          snapAllWindows5050();
                        }}
                        className="px-3.5 py-1.5 bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        ウィンドウ整列
                      </button>
                    </div>

                    <div className={`pt-4 border-t flex items-center justify-between ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <div>
                        <h3 className="text-xs font-bold">タスクバーアイコン配置</h3>
                        <p className="text-[11px] opacity-60">中央揃えまたは左揃えを切り替えます</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTaskbarAlign('center')}
                          className={`px-3 py-1.5 text-xs font-semibold transition ${
                            taskbarAlign === 'center'
                              ? 'bg-[var(--os-accent)] text-black font-bold'
                              : isLight
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          中央揃え
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskbarAlign('left')}
                          className={`px-3 py-1.5 text-xs font-semibold transition ${
                            taskbarAlign === 'left'
                              ? 'bg-[var(--os-accent)] text-black font-bold'
                              : isLight
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          左揃え
                        </button>
                      </div>
                    </div>

                    <div className={`pt-4 border-t flex items-center justify-between ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                      <div>
                        <h3 className="text-xs font-bold">タスクバーを自動的に隠す</h3>
                        <p className="text-[11px] opacity-60">カーソルを画面下部に移動した際のみ表示します</p>
                      </div>
                      <ToggleSwitch checked={autoHideTaskbar} onChange={setAutoHideTaskbar} />
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'language' ? (
                /* ---------------- LANGUAGE & REGION ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Language & Region (言語と地域)', () => setSystemSubView('main'))}

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xs font-bold mb-1">System Display Language (システム表示言語)</h3>
                      <p className="text-[11px] opacity-60 mb-3">
                        OS全体の表示言語を English または 日本語 から選択します。
                      </p>

                      <div className={`divide-y border-y ${dividerClass}`}>
                        <button
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setLanguage('en');
                            addNotification({ title: 'Language Changed', message: 'System language set to English (US).' });
                          }}
                          className={`w-full py-3.5 px-2 text-left flex items-center justify-between transition ${rowHoverClass}`}
                        >
                          <div>
                            <div className={`text-xs font-bold ${language === 'en' ? 'text-[var(--os-accent)]' : ''}`}>
                              English (US) [Default]
                            </div>
                            <div className="text-[11px] opacity-60">Primary OS System Language</div>
                          </div>
                          {language === 'en' && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setLanguage('ja');
                            addNotification({ title: '言語変更', message: 'システム言語を日本語に設定しました。' });
                          }}
                          className={`w-full py-3.5 px-2 text-left flex items-center justify-between transition ${rowHoverClass}`}
                        >
                          <div>
                            <div className={`text-xs font-bold ${language === 'ja' ? 'text-[var(--os-accent)]' : ''}`}>
                              日本語 (Japanese)
                            </div>
                            <div className="text-[11px] opacity-60">日本語表示モード</div>
                          </div>
                          {language === 'ja' && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ---------------- AI ASSISTANT SETTINGS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('AI Assistant Settings (GlassiumOS 5 AI 統合設定)', () => setSystemSubView('main'))}

                  <div className={`divide-y border-y ${dividerClass}`}>
                    <div className="py-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold">OS操作の自動実行 (Auto-Execute OS Commands)</div>
                        <div className="text-[11px] opacity-60">
                          AIへの指示（「ダークモードにして」「電卓を開いて」など）を即座にOSへ反映します
                        </div>
                      </div>
                      <ToggleSwitch checked={aiAutoExecute} onChange={setAiAutoExecute} />
                    </div>

                    <div className="py-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold">AI 応答スタイル (Response Style)</div>
                        <div className="text-[11px] opacity-60">AIアシスタントおよびEditor文書作成支援の回答スタイル</div>
                      </div>
                      <div className="flex gap-2">
                        {(
                          [
                            { id: 'concise', label: '簡潔' },
                            { id: 'balanced', label: '標準' },
                            { id: 'detailed', label: '詳細' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setAiResponseStyle(st.id)}
                            className={`px-3 py-1.5 text-xs font-semibold transition ${
                              aiResponseStyle === st.id
                                ? 'bg-[var(--os-accent)] text-black font-bold'
                                : isLight
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-white/10 text-white'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="py-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold">AI エンジン稼働ステータス確認</div>
                        <div className="text-[11px] opacity-60">
                          サーバーサイド AI エンドポイント（/api/ai/chat）およびローカル推論エンジンの応答を確認します
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTestAIConnection}
                          className="px-3.5 py-1.5 bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                        >
                          動作テスト
                        </button>
                        <button
                          type="button"
                          onClick={() => openApp('ai')}
                          className={`px-3.5 py-1.5 text-xs font-semibold ${
                            isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/10 text-white'
                          }`}
                        >
                          AI アシスタントを開く
                        </button>
                      </div>
                    </div>
                  </div>

                  {aiTestMessage && (
                    <div
                      className={`p-3 text-xs border-l-2 ${
                        aiTestStatus === 'success'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                          : aiTestStatus === 'error'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-500'
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
                  <div className="mb-4">
                    <h1 className="text-xl font-bold">Personalization (個人設定)</h1>
                    <p className="text-xs opacity-60">
                      OS UIスタイル、壁紙、サーフェスマテリアルエンジン、アクセントカラーの調整
                    </p>
                  </div>

                  <div className={`divide-y border-y ${dividerClass}`}>
                    <div className="py-3.5 px-3 flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Moon" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold">カラーモード (Theme Mode)</div>
                          <div className="text-[11px] opacity-60">ダークモードとライトモードを切り替えます</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`px-3.5 py-1.5 text-xs font-semibold transition ${
                            theme === 'dark'
                              ? 'bg-[var(--os-accent)] text-black font-bold'
                              : isLight
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          Dark
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`px-3.5 py-1.5 text-xs font-semibold transition ${
                            theme === 'light'
                              ? 'bg-[var(--os-accent)] text-black font-bold'
                              : isLight
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          Light
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setPersonalSubView('uistyle');
                      }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Layout" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">
                            UI Style Presets (OSシェル・ウィンドウレイアウト切替)
                          </div>
                          <div className="text-[11px] opacity-60">
                            GlassiumOS 5、Windows 11、Windows 10、Windows 8.1、Ubuntu、macOS の即時切替
                          </div>
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={16}
                        className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setActiveCategory('system');
                        setSystemSubView('display');
                      }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Image" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">
                            Wallpapers & 2D Live Aurora (壁紙 ＆ ライブ壁紙)
                          </div>
                          <div className="text-[11px] opacity-60">
                            10種類の2Dライブ壁紙、標準壁紙、カスタム画像アップロード
                          </div>
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={16}
                        className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setPersonalSubView('surface');
                      }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Sparkles" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">
                            Surface Material Engine (質感エンジン)
                          </div>
                          <div className="text-[11px] opacity-60">
                            Liquid Glass, Mica, Frosted Acrylic, Slate, Cyberpunk HUD の切り替え
                          </div>
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={16}
                        className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setPersonalSubView('accent');
                      }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Palette" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">
                            Accent Color (アクセントカラー)
                          </div>
                          <div className="text-[11px] opacity-60">
                            シアン、ブルー、バイオレット、エメラルド、ローズ、アンバー
                          </div>
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={16}
                        className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setPersonalSubView('glass');
                      }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Sliders" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">
                            Advanced Optical Parameters
                          </div>
                          <div className="text-[11px] opacity-60">ぼかし量、角丸、透過率、ガラス屈折スライダー</div>
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={16}
                        className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                      />
                    </button>
                  </div>
                </>
              ) : personalSubView === 'uistyle' ? (
                /* ---------------- UI STYLE WITH DISTINCT DIAGRAMS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('UI Style Presets (GlassiumOS 5 / 各OSスタイル)', () => setPersonalSubView('main'))}

                  <div className={`divide-y border-y ${dividerClass}`}>
                    {SHELL_MODES.map((sm) => {
                      const selected = shellMode === sm.id;
                      return (
                        <button
                          key={sm.id}
                          type="button"
                          onClick={() => handleSelectShellMode(sm.id)}
                          className={`w-full py-3.5 px-2 text-left transition flex items-center gap-4 ${
                            selected ? 'bg-[var(--os-accent)]/10' : rowHoverClass
                          }`}
                        >
                          <div className="w-36 shrink-0">
                            <ShellMockupDiagram type={sm.mockupType} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold ${selected ? 'text-[var(--os-accent)]' : ''}`}>
                              {sm.label}
                            </div>
                            <div className="text-[11px] opacity-60 mt-0.5">{sm.desc}</div>
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
                  {renderBreadcrumbHeader('Surface Material Engine (質感エンジン連動)', () => setPersonalSubView('main'))}

                  <div className={`divide-y border-y ${dividerClass}`}>
                    {DESIGN_ENGINES.map((de) => {
                      const selected = designEngine === de.id;
                      return (
                        <button
                          key={de.id}
                          type="button"
                          onClick={() => handleSelectSurfaceEngine(de.id)}
                          className={`w-full py-3.5 px-2 text-left transition flex items-center justify-between gap-4 ${
                            selected ? 'bg-[var(--os-accent)]/10' : rowHoverClass
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-9 shrink-0" style={{ background: de.cssBg }} />
                            <div>
                              <div className={`text-xs font-bold ${selected ? 'text-[var(--os-accent)]' : ''}`}>
                                {de.label}
                              </div>
                              <div className="text-[11px] opacity-60">{de.desc}</div>
                            </div>
                          </div>
                          {selected && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : personalSubView === 'accent' ? (
                /* ---------------- ACCENT COLOR ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Accent Color (アクセントカラー切り替え)', () => setPersonalSubView('main'))}

                  <div className={`divide-y border-y ${dividerClass}`}>
                    {ACCENT_COLOR_PRESETS.map((p) => {
                      const selected = accentColor === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setAccentColor(p.id);
                          }}
                          className={`w-full py-3.5 px-2 flex items-center justify-between transition ${
                            selected ? 'bg-[var(--os-accent)]/10 font-bold' : rowHoverClass
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: p.hex }} />
                            <span className={`text-xs font-bold ${selected ? 'text-[var(--os-accent)]' : ''}`}>
                              {p.labelJa}
                            </span>
                          </div>
                          {selected && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ---------------- GLASS PARAMETERS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Advanced Optical Parameters', () => setPersonalSubView('main'))}

                  <div className="space-y-5 text-xs">
                    <CustomSlider
                      min={4}
                      max={60}
                      value={blurAmount}
                      onChange={setBlurAmount}
                      label="すりガラスのぼかし量 (Blur Amount)"
                      valueText={`${blurAmount}px`}
                    />
                    <CustomSlider
                      min={0}
                      max={36}
                      value={cornerRadius}
                      onChange={setCornerRadius}
                      label="ウィンドウ角丸 (Corner Radius)"
                      valueText={`${cornerRadius}px`}
                    />
                    <CustomSlider
                      min={10}
                      max={95}
                      value={transparency}
                      onChange={setTransparency}
                      label="透過率 (Transparency)"
                      valueText={`${transparency}%`}
                    />
                    <CustomSlider
                      min={0}
                      max={100}
                      value={glassWobble}
                      onChange={setGlassWobble}
                      label="液体ガラス屈折量 (Glass Refraction)"
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
              <div className="mb-4">
                <h1 className="text-xl font-bold">Installed Apps (アプリ管理)</h1>
                <p className="text-xs opacity-60">インストール済みシステムアプリおよびストアアプリの一覧と起動</p>
              </div>

              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="アプリを検索..."
                className={`w-full p-2.5 text-xs border-b outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                }`}
              />

              <div className={`divide-y border-y ${dividerClass}`}>
                {installedApps
                  .filter((a) => !appSearch || a.name.toLowerCase().includes(appSearch.toLowerCase()))
                  .map((app) => (
                    <div key={app.id} className="flex items-center justify-between py-3.5 px-3">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name={app.icon || 'AppWindow'} size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold">{app.name}</div>
                          <div className="text-[11px] opacity-60">{app.description}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openApp(app.appId as AppId)}
                        className="px-3.5 py-1.5 bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        開く
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
                  <div className="mb-4">
                    <h1 className="text-xl font-bold">Accounts (アカウント設定)</h1>
                    <p className="text-xs opacity-60">ユーザープロファイル、セキュリティPIN、権限グループの設定</p>
                  </div>

                  <div className={`divide-y border-y ${dividerClass}`}>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setAccountsSubView('profile');
                      }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="User" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">
                            ユーザープロファイル ＆ アバター写真
                          </div>
                          <div className="text-[11px] opacity-60">表示名、ユーザーアバターアイコン、権限グループ</div>
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={16}
                        className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setAccountsSubView('security');
                      }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${rowHoverClass}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Key" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">
                            サインインオプション ＆ PINセキュリティ
                          </div>
                          <div className="text-[11px] opacity-60">パスワード変更、セキュリティPINコード</div>
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={16}
                        className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                      />
                    </button>
                  </div>
                </>
              ) : accountsSubView === 'profile' ? (
                /* ---------------- USER PROFILE & AVATARS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('ユーザープロファイル ＆ アバター設定', () => setAccountsSubView('main'))}

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
                  {renderBreadcrumbHeader('サインインオプション ＆ PINセキュリティ', () => setAccountsSubView('main'))}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">ログインパスワード (Password)</label>
                      <input
                        type="password"
                        value={profilePassword}
                        onChange={(e) => setProfilePassword(e.target.value)}
                        placeholder="パスワードを入力"
                        className={`w-full p-2.5 text-xs border-b outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">4桁セキュリティPINコード</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={securityPin}
                        onChange={(e) => setSecurityPin(e.target.value)}
                        className={`w-full p-2.5 text-xs font-mono border-b outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/40 border-white/15 text-white'
                        }`}
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          playSound('notify');
                          addNotification({ title: 'Security', message: 'セキュリティPINコードを適用しました。' });
                        }}
                        className="px-4 py-2 bg-[var(--os-accent)] text-black text-xs font-bold shadow"
                      >
                        PINを更新
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
