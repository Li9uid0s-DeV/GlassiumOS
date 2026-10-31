import { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useOS,
  Wallpaper,
  AuroraColor,
} from '../OSContext';
import {
  ShellMode,
  DesignEngine,
  LockScreenStyle,
  ACCENT_COLOR_PRESETS,
  AppId,
  DesktopIconSize,
  DESKTOP_ICON_SIZE_PRESETS,
} from '../types';
import { WALLPAPERS } from '../wallpapers';
import { Icon } from '../Icon';
import { AppLogo } from '../AppLogo';

const WALLPAPER_KEYS = Object.keys(WALLPAPERS) as Wallpaper[];

type SettingsTab = 'appearance' | 'system' | 'display' | 'account' | 'apps';

const AURORA_PALETTES: {
  id: AuroraColor;
  label: string;
  preview: string;
}[] = [
  { id: 'cyan-violet', label: 'Amethyst & Cyan', preview: 'linear-gradient(135deg, #a855f7, #6366f1, #06b6d4)' },
  { id: 'emerald-sky', label: 'Polar Emerald', preview: 'linear-gradient(135deg, #10b981, #06b6d4, #3b82f6)' },
  { id: 'rose-gold', label: 'Crimson Rose', preview: 'linear-gradient(135deg, #f43f5e, #d946ef, #f59e0b)' },
  { id: 'ocean-blue', label: 'Abyssal Sapphire', preview: 'linear-gradient(135deg, #2563eb, #0ea5e9, #2dd4bf)' },
  { id: 'sunset-magenta', label: 'Neon Dusk', preview: 'linear-gradient(135deg, #d946ef, #8b5cf6, #ec4899)' },
];

const SHELL_MODES: { id: ShellMode; label: string; desc: string }[] = [
  { id: 'windows', label: 'Windows 11', desc: '標準フラットタスクバー ＆ スタートメニュー' },
  { id: 'windows10', label: 'Windows 10', desc: 'クラシックタイル ＆ フラットバー' },
  { id: 'mac', label: 'macOS Dock', desc: 'トップメニューバー ＆ 下部Dock' },
  { id: 'zorin', label: 'Zorin Pro', desc: 'クリーンなLinuxデスクトップシェル' },
  { id: 'chromeos', label: 'ChromeOS', desc: 'ミニマルなシェルフランチャー' },
  { id: 'dex', label: 'Workstation DeX', desc: 'マルチウィンドウ生産性シェル' },
  { id: 'vista', label: 'Vista Aero', desc: 'エアロガラス ＆ デスクトップガジェット' },
  { id: 'xp', label: 'Classic XP', desc: 'レトロなルナテーマ ＆ 2列スタート' },
];

const DESIGN_ENGINES: { id: DesignEngine; label: string; desc: string }[] = [
  { id: 'windows-mica', label: 'Flat Mica', desc: '落ち着きのあるフラット透過マイカ' },
  { id: 'frosted-blur', label: 'Frosted Acrylic', desc: '高精細すりガラスアクリル' },
  { id: 'dark-slate', label: 'Crisp Slate', desc: 'コントラスト重視のフラットスレート' },
  { id: 'liquid-glass', label: 'Translucent Glass', desc: '滑らかな光学透過サーフェス' },
];

const LOCK_STYLES: { id: LockScreenStyle; label: string; desc: string }[] = [
  { id: 'hyperos3', label: 'Large Depth Clock', desc: 'モダンな大型タイポグラフィ時計' },
  { id: 'windows-hello', label: 'Windows Spotlight', desc: 'センター配置のサインイン画面' },
  { id: 'miuix', label: 'Minimal Clean', desc: 'シンプルなミニマルロック画面' },
  { id: 'cosmic-liquid', label: 'Ambient Glass', desc: '透過ガラスカードスタイル' },
];

interface SystemAppEntry {
  appId: AppId;
  name: string;
  nameJa: string;
  category: string;
  description: string;
  icon: string;
}

const SYSTEM_APPS_CATALOG: SystemAppEntry[] = [
  { appId: 'browser', name: 'Browser', nameJa: 'ブラウザ', category: 'Internet', description: 'プロキシ対応ウェブブラウザ', icon: 'browser' },
  { appId: 'notepad', name: 'Editor', nameJa: 'テキストエディタ', category: 'Productivity', description: 'Markdown・テキスト編集ワークスペース', icon: 'notepad' },
  { appId: 'terminal', name: 'Terminal', nameJa: 'ターミナル', category: 'Developer', description: 'コマンドラインシェル環境', icon: 'terminal' },
  { appId: 'explorer', name: 'Files', nameJa: 'ファイル', category: 'System', description: '仮想ファイルシステム・フォルダ管理', icon: 'explorer' },
  { appId: 'calculator', name: 'Calculator', nameJa: '電卓', category: 'Utilities', description: '関数・四則演算カリキュレーター', icon: 'calculator' },
  { appId: 'settings', name: 'Settings', nameJa: '設定', category: 'System', description: 'OSシステム環境設定とカスタマイズ', icon: 'settings' },
  { appId: 'taskmanager', name: 'Task Manager', nameJa: 'タスクマネージャー', category: 'System', description: '実行中プロセスの終了とリソース監視', icon: 'taskmanager' },
  { appId: 'appstore', name: 'App Store', nameJa: 'アプリストア', category: 'System', description: 'アプリ・テーマ・Webアプリの追加と管理', icon: 'appstore' },
  { appId: 'ai', name: 'AI Assistant', nameJa: 'AIアシスタント', category: 'AI', description: '質疑応答・コード生成・OS操作アシスタント', icon: 'ai' },
  { appId: 'game', name: 'Games', nameJa: 'ゲームセンター', category: 'Games', description: '3D・アーケード・パズルゲームコレクション', icon: 'game' },
  { appId: 'synth', name: 'Music', nameJa: 'ミュージック', category: 'Media', description: '音楽ストリーミング＆オーディオビジュアライザー', icon: 'synth' },
  { appId: 'calendar', name: 'Calendar', nameJa: 'カレンダー', category: 'Productivity', description: 'スケジュール・タスク優先度管理', icon: 'calendar' },
  { appId: 'weather', name: 'Weather', nameJa: '天気予報', category: 'Utilities', description: 'リアルタイム気象レーダーと週間予報', icon: 'weather' },
  { appId: 'clock', name: 'Clock', nameJa: '時計・アラーム', category: 'Utilities', description: '世界時計・アラーム・ストップウォッチ', icon: 'clock' },
];

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
    taskbarAlign,
    setTaskbarAlign,
    blurAmount,
    setBlurAmount,
    cornerRadius,
    setCornerRadius,
    transparency,
    setTransparency,
    glassSpecular,
    setGlassSpecular,
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
    shellMode,
    setShellMode,
    designEngine,
    setDesignEngine,
    quickSettings,
    toggleQuick,
    liteMode,
    setLiteMode,
    touchMode,
    setTouchMode,
    snapAllWindows5050,
    desktops,
    activeDesktopId,
    switchDesktop,
    createDesktop,
    addDeskNote,
    resetDesktopIconPositions,
    desktopIconSize,
    setDesktopIconSize,
    gridSnapEnabled,
    setGridSnapEnabled,
    isWallpaperBright,
    emptyRecycleBin,
    user,
    setUser,
    lockScreenStyle,
    setLockScreenStyle,
    lockSystem,
    notifications,
    clearNotifications,
    installedApps,
    uninstallApp,
    launchInstalledApp,
    openApp,
    windows,
  } = useOS();

  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const fileRef = useRef<HTMLInputElement>(null);

  // Account tab local form state
  const [profileName, setProfileName] = useState(user?.name || 'Administrator');
  const [profilePassword, setProfilePassword] = useState(user?.password || '');
  const [accountSavedMsg, setAccountSavedMsg] = useState('');

  // Apps tab search & filter
  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'system' | 'installed' | 'running'>('all');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addCustomWallpaper(file.name.replace(/\.[^.]+$/, ''), reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = profileName.trim() || 'Administrator';
    setUser({
      name: trimmed,
      avatar: user?.avatar || 'User',
      password: profilePassword.trim() || undefined,
      createdAt: user?.createdAt || Date.now(),
    });
    playSound('notify');
    setAccountSavedMsg('アカウント設定を保存しました');
    setTimeout(() => setAccountSavedMsg(''), 3000);
  };

  const runningAppIds = useMemo(() => new Set(windows.map((w) => w.appId)), [windows]);

  const combinedApps = useMemo(() => {
    const sysList = SYSTEM_APPS_CATALOG.map((sys) => ({
      uid: `sys-${sys.appId}`,
      id: sys.appId,
      appId: sys.appId,
      name: sys.name,
      nameJa: sys.nameJa,
      category: sys.category,
      description: sys.description,
      icon: sys.icon,
      isSystem: true,
      isRunning: runningAppIds.has(sys.appId),
    }));

    const sysIds = new Set(SYSTEM_APPS_CATALOG.map((s) => s.appId));
    const storeList = installedApps
      .filter((inst) => !sysIds.has(inst.appId as AppId))
      .map((inst) => ({
        uid: `inst-${inst.id}`,
        id: inst.id,
        appId: inst.appId,
        name: inst.name,
        nameJa: inst.name,
        category: inst.category === 'games' ? 'Games' : 'Store App',
        description: inst.description,
        icon: inst.icon,
        isSystem: false,
        isRunning: runningAppIds.has(inst.appId),
      }));

    return [...sysList, ...storeList].filter((item) => {
      if (appFilter === 'system' && !item.isSystem) return false;
      if (appFilter === 'installed' && item.isSystem) return false;
      if (appFilter === 'running' && !item.isRunning) return false;
      if (appSearch.trim()) {
        const q = appSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.nameJa.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [installedApps, runningAppIds, appFilter, appSearch]);

  const navItems: { id: SettingsTab; label: string; sub: string; icon: string }[] = [
    { id: 'appearance', label: 'Appearance', sub: 'テーマ・アクセント・外観', icon: 'Palette' },
    { id: 'system', label: 'System', sub: 'サウンド・電源・マルチタスク', icon: 'SlidersHorizontal' },
    { id: 'display', label: 'Display', sub: '壁紙・オーロラ・アイコン配置', icon: 'Monitor' },
    { id: 'account', label: 'Account', sub: 'プロフィール・ロック画面', icon: 'User' },
    { id: 'apps', label: 'Apps', sub: 'アプリ一覧・起動・管理', icon: 'LayoutGrid' },
  ];

  const cardClass = `rounded-xl p-4 border transition-colors duration-200 ${
    isLight
      ? 'bg-white border-slate-200/90 shadow-sm'
      : 'bg-slate-900/55 border-white/10'
  }`;

  const subButtonClass = (active: boolean) =>
    `rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150 ${
      active
        ? 'os-accent-soft border font-semibold'
        : isLight
        ? 'bg-slate-100/80 border-slate-200 text-slate-700 hover:bg-slate-200/70'
        : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08]'
    }`;

  return (
    <div
      className={`h-full w-full flex flex-col sm:flex-row overflow-hidden select-none transition-colors duration-200 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950/60 text-white'
      }`}
    >
      {/* Left Navigation Sidebar */}
      <div
        className={`w-full sm:w-56 border-b sm:border-b-0 sm:border-r p-3 flex sm:flex-col justify-between gap-2 shrink-0 transition-colors duration-200 ${
          isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-900/60 border-white/10'
        }`}
      >
        <div className="w-full">
          {/* Header */}
          <div className="hidden sm:flex items-center gap-2.5 px-2.5 py-2 mb-3">
            <AppLogo size={22} />
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight truncate">Settings</div>
              <div className="text-[10px] opacity-50 truncate">System Control Panel</div>
            </div>
          </div>

          {/* 5 Category Tabs */}
          <div className="flex sm:flex-col gap-1 overflow-x-auto w-full">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setActiveTab(item.id);
                  }}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all shrink-0 sm:w-full ${
                    active
                      ? isLight
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'bg-white/10 text-white font-semibold'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                      : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="settings-nav-indicator"
                      className="hidden sm:block absolute left-0 top-2 bottom-2 w-1 rounded-r os-accent-bg"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon
                    name={item.icon}
                    size={16}
                    className={active ? 'os-accent-text' : 'opacity-65'}
                  />
                  <div className="min-w-0">
                    <div className="text-xs leading-tight">{item.label}</div>
                    <div className="text-[10px] opacity-50 hidden sm:block truncate mt-0.5">
                      {item.sub}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile Summary */}
        <div
          onClick={() => setActiveTab('account')}
          className={`hidden sm:flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
            isLight
              ? 'bg-white border-slate-200 hover:border-slate-300'
              : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
          }`}
        >
          <div className="w-7 h-7 rounded-full os-accent-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(user?.name || 'A')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">{user?.name || 'Administrator'}</div>
            <div className="text-[10px] opacity-50 truncate">Local Administrator</div>
          </div>
        </div>
      </div>

      {/* Main Content Area with Smooth Animated Transitions */}
      <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ==============================================================
              1. APPEARANCE (外観・テーマ・アクセントカラー・シェル)
             ============================================================== */}
          {activeTab === 'appearance' && (
            <motion.div
              key="tab-appearance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 max-w-3xl"
            >
              <div>
                <h2 className="text-base font-bold tracking-tight">Appearance</h2>
                <p className="text-xs opacity-60 mt-0.5">
                  ダーク/ライトモード、アクセントカラー、デスクトップシェル、ウィンドウの透過度を調整します。
                </p>
              </div>

              {/* Theme Mode & Taskbar Alignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={cardClass}>
                  <div className="text-xs font-semibold mb-1">Color Mode (カラーモード)</div>
                  <div className="text-[11px] opacity-55 mb-3">
                    ウィンドウとシステム全体の配色を切り替えます
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setTheme('dark');
                      }}
                      className={subButtonClass(theme === 'dark')}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Icon name="Moon" size={14} />
                        <span>Dark</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setTheme('light');
                      }}
                      className={subButtonClass(theme === 'light')}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Icon name="Sun" size={14} />
                        <span>Light</span>
                      </span>
                    </button>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="text-xs font-semibold mb-1">Taskbar Alignment (タスクバー配置)</div>
                  <div className="text-[11px] opacity-55 mb-3">
                    タスクバーアイコンの配置位置を選択します
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setTaskbarAlign('center');
                      }}
                      className={subButtonClass(taskbarAlign === 'center')}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Icon name="LayoutGrid" size={14} />
                        <span>Center (中央)</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setTaskbarAlign('left');
                      }}
                      className={subButtonClass(taskbarAlign === 'left')}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Icon name="PanelLeft" size={14} />
                        <span>Left (左揃え)</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Accent Color Picker */}
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Accent Color (アクセントカラー)</span>
                  <span className="text-[11px] font-mono os-accent-text uppercase">
                    {ACCENT_COLOR_PRESETS.find((c) => c.id === accentColor)?.labelJa}
                  </span>
                </div>
                <div className="text-[11px] opacity-55 mb-3">
                  ボタン、スライダー、スイッチ、フォーカス枠の強調色に反映されます
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {ACCENT_COLOR_PRESETS.map((preset) => {
                    const selected = accentColor === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setAccentColor(preset.id);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          selected
                            ? 'os-accent-soft border font-semibold'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {selected && <Icon name="Check" size={11} />}
                        </span>
                        <span className="text-xs truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop App Icon Size & Grid Placement Quick Control */}
              <div className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs font-semibold">Desktop App Size & Grid (デスクトップアプリの大きさ・グリッド配置)</div>
                    <div className="text-[11px] opacity-55">
                      デスクトップ上のアプリアイコンのサイズ変更と規定グリッドへのスナップ配置を設定します
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-75">グリッド配置</span>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setGridSnapEnabled(!gridSnapEnabled);
                      }}
                      className={`glass-switch ${gridSnapEnabled ? 'is-on' : ''}`}
                    >
                      <div className="glass-switch-thumb" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {(['small', 'medium', 'large'] as DesktopIconSize[]).map((sz) => {
                    const preset = DESKTOP_ICON_SIZE_PRESETS[sz];
                    const active = desktopIconSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setDesktopIconSize(sz);
                        }}
                        className={subButtonClass(active)}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Icon name="LayoutGrid" size={sz === 'small' ? 12 : sz === 'medium' ? 15 : 18} />
                          <span>
                            {preset.label} ({preset.labelJa})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Window Surface & Blur Controls */}
              <div className={cardClass}>
                <div className="text-xs font-semibold mb-3">Window & Surface Geometry (ウィンドウ透過・角丸)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="opacity-80">Backdrop Blur (背景ぼかし)</span>
                      <span className="font-mono os-accent-text">{blurAmount}px</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={40}
                      value={blurAmount}
                      onChange={(e) => setBlurAmount(Number(e.target.value))}
                      className="glass-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="opacity-80">Surface Transparency (透過度)</span>
                      <span className="font-mono os-accent-text">{transparency}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={88}
                      value={transparency}
                      onChange={(e) => setTransparency(Number(e.target.value))}
                      className="glass-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="opacity-80">Window Corner Radius (角丸半径)</span>
                      <span className="font-mono os-accent-text">{cornerRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      value={cornerRadius}
                      onChange={(e) => setCornerRadius(Number(e.target.value))}
                      className="glass-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="opacity-80">Surface Specular (エッジ輝度)</span>
                      <span className="font-mono os-accent-text">{glassSpecular}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={glassSpecular}
                      onChange={(e) => setGlassSpecular(Number(e.target.value))}
                      className="glass-slider"
                    />
                  </div>
                </div>
              </div>

              {/* Surface Material & Desktop Shell */}
              <div className={cardClass}>
                <div className="text-xs font-semibold mb-2.5">Surface Material (ウィンドウ質感)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {DESIGN_ENGINES.map((eng) => (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setDesignEngine(eng.id);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition ${
                        designEngine === eng.id
                          ? 'os-accent-soft border font-semibold'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="text-xs font-medium">{eng.label}</div>
                      <div className="text-[10px] opacity-55 mt-0.5 line-clamp-1">{eng.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold mb-2.5">Desktop Shell Layout (OSシェルレイアウト)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SHELL_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setShellMode(mode.id);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition ${
                        shellMode === mode.id
                          ? 'os-accent-soft border font-semibold'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="text-xs font-medium">{mode.label}</div>
                      <div className="text-[10px] opacity-55 mt-0.5 line-clamp-1">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==============================================================
              2. SYSTEM (システム・サウンド・マルチタスク・仕様)
             ============================================================== */}
          {activeTab === 'system' && (
            <motion.div
              key="tab-system"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 max-w-3xl"
            >
              <div>
                <h2 className="text-base font-bold tracking-tight">System</h2>
                <p className="text-xs opacity-60 mt-0.5">
                  オーディオ音量、接続・省電力モード、仮想デスクトップ、ストレージを管理します。
                </p>
              </div>

              {/* Volume & Sound Controls */}
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg os-accent-soft border flex items-center justify-center">
                      <Icon name={soundEnabled && volume > 0 ? 'Volume2' : 'VolumeX'} size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Master Volume & Audio (システム音量)</div>
                      <div className="text-[11px] opacity-55">Web Audio シンセサイザーおよび効果音出力</div>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold os-accent-text">
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
                  className="glass-slider mb-4"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-500/15">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium">UI効果音を有効化</span>
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`glass-switch ${soundEnabled ? 'is-on' : ''}`}
                    >
                      <div className="glass-switch-thumb" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['click', 'open', 'notify', 'lock'] as const).map((snd) => (
                      <button
                        key={snd}
                        type="button"
                        onClick={() => playSound(snd)}
                        className={`px-2.5 py-1 rounded-md border text-[11px] capitalize transition ${
                          isLight
                            ? 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                            : 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                        }`}
                      >
                        Test {snd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* System Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    title: 'Wi-Fi ネットワーク',
                    sub: quickSettings.wifi ? 'Connected (Glassium-5G)' : 'Disconnected',
                    icon: 'Wifi',
                    active: quickSettings.wifi,
                    onToggle: () => toggleQuick('wifi'),
                  },
                  {
                    title: 'Bluetooth デバイス',
                    sub: quickSettings.bluetooth ? 'Discoverable' : 'Off',
                    icon: 'Bluetooth',
                    active: quickSettings.bluetooth,
                    onToggle: () => toggleQuick('bluetooth'),
                  },
                  {
                    title: 'Lite Mode (省電力・軽量描画)',
                    sub: 'ライブ壁紙エフェクトを抑えて高速化します',
                    icon: 'Zap',
                    active: liteMode,
                    onToggle: () => setLiteMode(!liteMode),
                  },
                  {
                    title: 'Touch Mode (タッチ操作最適化)',
                    sub: 'タイトルバーやボタン間隔をタッチ向けに拡大',
                    icon: 'Smartphone',
                    active: touchMode,
                    onToggle: () => setTouchMode((v) => !v),
                  },
                ].map((item) => (
                  <div key={item.title} className={`${cardClass} flex items-center justify-between gap-3`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name={item.icon} size={16} className={item.active ? 'os-accent-text' : 'opacity-50'} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{item.title}</div>
                        <div className="text-[10px] opacity-55 truncate">{item.sub}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        item.onToggle();
                      }}
                      className={`glass-switch shrink-0 ${item.active ? 'is-on' : ''}`}
                    >
                      <div className="glass-switch-thumb" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Multitasking & Virtual Desktops */}
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold">Multitasking & Virtual Desktops (仮想デスクトップ)</div>
                    <div className="text-[11px] opacity-55">
                      現在 {desktops.length} 個のデスクトップと {windows.length} 個のウィンドウが稼働中
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={snapAllWindows5050}
                      className={subButtonClass(false)}
                    >
                      左右50/50整列
                    </button>
                    <button
                      type="button"
                      onClick={createDesktop}
                      className="px-3 py-1.5 rounded-lg os-accent-bg text-xs font-medium transition hover:opacity-90"
                    >
                      + 新規デスクトップ
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pt-1">
                  {desktops.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => switchDesktop(d.id)}
                      className={subButtonClass(d.id === activeDesktopId)}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Storage & System Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={cardClass}>
                  <div className="text-xs font-semibold mb-2">Storage & Recycle Bin (ストレージ管理)</div>
                  <div className="text-[11px] opacity-60 mb-3">
                    ローカル仮想ファイルシステム (LocalStorage 永続化)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openApp('explorer')}
                      className={subButtonClass(false)}
                    >
                      ファイルを開く
                    </button>
                    <button
                      type="button"
                      onClick={emptyRecycleBin}
                      className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-medium transition"
                    >
                      ゴミ箱を空にする
                    </button>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="text-xs font-semibold mb-2">System Specifications</div>
                  <div className="space-y-1 text-[11px] opacity-75 font-mono">
                    <div className="flex justify-between">
                      <span>OS Build:</span>
                      <span>GlassiumOS-V4.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Shell:</span>
                      <span className="uppercase">{shellMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Running Tasks:</span>
                      <span>{windows.length} Processes</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==============================================================
              3. DISPLAY (壁紙・オーロラ設定・アイコン整列 ※輝度は削除済み)
             ============================================================== */}
          {activeTab === 'display' && (
            <motion.div
              key="tab-display"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 max-w-3xl"
            >
              <div>
                <h2 className="text-base font-bold tracking-tight">Display & Wallpaper</h2>
                <p className="text-xs opacity-60 mt-0.5">
                  デスクトップ壁紙、ライブオーロラの色彩と速度、デスクトップアイコンの整列を設定します。
                </p>
              </div>

              {/* Wallpaper Selector */}
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold">Desktop Wallpaper (壁紙ギャラリー)</span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg os-accent-soft border text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Icon name="Upload" size={13} />
                    <span>画像をアップロード</span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {WALLPAPER_KEYS.map((key: Wallpaper) => {
                    const info = WALLPAPERS[key];
                    const selected = wallpaper === key && !selectedCustomId;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setSelectedCustomId(null);
                          setWallpaper(key);
                        }}
                        className={`group relative h-20 rounded-lg overflow-hidden border text-left p-2.5 flex flex-col justify-end transition-all ${
                          selected
                            ? 'os-accent-border ring-2 ring-cyan-400/30'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                        style={{ background: info.preview }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <div className="relative z-10 flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-white">{info.label}</span>
                          {selected && <Icon name="Check" size={13} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}

                  {customWallpapers.map((cw) => {
                    const selected = selectedCustomId === cw.id;
                    return (
                      <button
                        key={cw.id}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setSelectedCustomId(cw.id);
                        }}
                        className={`group relative h-20 rounded-lg overflow-hidden border text-left p-2.5 flex flex-col justify-end transition-all ${
                          selected ? 'os-accent-border ring-2 ring-cyan-400/30' : 'border-white/10'
                        }`}
                        style={{
                          backgroundImage: `url(${cw.dataUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                        <div className="relative z-10 flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-white truncate">{cw.name}</span>
                          {selected && <Icon name="Check" size={13} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aurora Live Wallpaper Settings */}
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold">Aurora Live Wallpaper (オーロラ設定)</div>
                    <div className="text-[11px] opacity-55">
                      ライブ壁紙のカラーパレット、流速、輝き、パーティクルを調整します
                    </div>
                  </div>
                  {wallpaper !== 'live2d' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomId(null);
                        setWallpaper('live2d');
                      }}
                      className="px-2.5 py-1 rounded-md os-accent-bg text-[11px] font-medium"
                    >
                      オーロラを有効化
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                  {AURORA_PALETTES.map((pal) => {
                    const active = auroraColor === pal.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setAuroraColor(pal.id);
                          if (wallpaper !== 'live2d') {
                            setSelectedCustomId(null);
                            setWallpaper('live2d');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition ${
                          active
                            ? 'os-accent-soft border font-semibold'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="h-5 w-full rounded mb-1.5" style={{ background: pal.preview }} />
                        <div className="text-[11px] truncate">{pal.label}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="opacity-80">Aurora Flow Speed (速度)</span>
                      <span className="font-mono os-accent-text">{auroraSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.1}
                      value={auroraSpeed}
                      onChange={(e) => setAuroraSpeed(Number(e.target.value))}
                      className="glass-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="opacity-80">Aurora Intensity (輝度・濃さ)</span>
                      <span className="font-mono os-accent-text">{auroraIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={auroraIntensity}
                      onChange={(e) => setAuroraIntensity(Number(e.target.value))}
                      className="glass-slider"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-500/15">
                  <div>
                    <div className="text-xs font-medium">Floating Light Particles (光の粒子エフェクト)</div>
                    <div className="text-[11px] opacity-55">オーロラ背景に浮遊する光の粒子を描画します</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuroraParticles(!auroraParticles)}
                    className={`glass-switch ${auroraParticles ? 'is-on' : ''}`}
                  >
                    <div className="glass-switch-thumb" />
                  </button>
                </div>
              </div>

              {/* Desktop App Size & Grid Placement Card */}
              <div className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs font-semibold">
                      Desktop App Icon Size & Grid Slots (アプリの大きさ・規定グリッド配置)
                    </div>
                    <div className="text-[11px] opacity-55">
                      アイコンサイズ（小・中・大）と規定のグリッド枠へのスナップ整列を管理します
                      {isWallpaperBright && ' · 明るい背景を検出し文字を自動で黒色表示中'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">グリッドに配置</span>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setGridSnapEnabled(!gridSnapEnabled);
                      }}
                      className={`glass-switch ${gridSnapEnabled ? 'is-on' : ''}`}
                    >
                      <div className="glass-switch-thumb" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  {(['small', 'medium', 'large'] as DesktopIconSize[]).map((sz) => {
                    const preset = DESKTOP_ICON_SIZE_PRESETS[sz];
                    const active = desktopIconSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setDesktopIconSize(sz);
                        }}
                        className={subButtonClass(active)}
                      >
                        <div className="flex flex-col items-center gap-1 py-0.5">
                          <span className="font-semibold">
                            {preset.label} ({preset.labelJa})
                          </span>
                          <span className="text-[10px] opacity-60 font-mono">
                            Icon {preset.iconPx}px · Grid {preset.cellW}×{preset.cellH}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-500/15">
                  <button
                    type="button"
                    onClick={() => resetDesktopIconPositions(false)}
                    className={subButtonClass(false)}
                  >
                    アイコンを規定グリッド順に整列
                  </button>
                  <button
                    type="button"
                    onClick={() => resetDesktopIconPositions(true)}
                    className={subButtonClass(false)}
                  >
                    現在の位置を最寄りグリッドに揃える
                  </button>
                  <button
                    type="button"
                    onClick={addDeskNote}
                    className={subButtonClass(false)}
                  >
                    + デスクトップ付箋を追加
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==============================================================
              4. ACCOUNT (ユーザーアカウント・パスワード・ロック画面)
             ============================================================== */}
          {activeTab === 'account' && (
            <motion.div
              key="tab-account"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 max-w-3xl"
            >
              <div>
                <h2 className="text-base font-bold tracking-tight">Account & Security</h2>
                <p className="text-xs opacity-60 mt-0.5">
                  ユーザープロフィール、ロック画面のパスワード保護、時計スタイルを設定します。
                </p>
              </div>

              {/* User Profile Card */}
              <form onSubmit={handleSaveAccount} className={cardClass}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full os-accent-bg flex items-center justify-center text-white text-xl font-bold shrink-0">
                    {(profileName.trim() || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{user?.name || 'Administrator'}</div>
                    <div className="text-xs opacity-55">GlassiumOS Local Administrator Account</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-80">
                      Display Name (表示名)
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Administrator"
                      className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                          : 'bg-slate-950/60 border-white/15 text-white focus:border-white/35'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-80">
                      Lock Screen PIN / Password (空欄でパスワードなし)
                    </label>
                    <input
                      type="password"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="PIN またはパスワードを入力"
                      className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                          : 'bg-slate-950/60 border-white/15 text-white focus:border-white/35'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs os-accent-text font-medium">{accountSavedMsg}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={lockSystem}
                      className={subButtonClass(false)}
                    >
                      今すぐロック (Alt+L)
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg os-accent-bg text-xs font-semibold hover:opacity-90 transition"
                    >
                      プロフィールを保存
                    </button>
                  </div>
                </div>
              </form>

              {/* Lock Screen Style */}
              <div className={cardClass}>
                <div className="text-xs font-semibold mb-2.5">Lock Screen Clock & Layout (ロック画面スタイル)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LOCK_STYLES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setLockScreenStyle(st.id);
                      }}
                      className={`p-3 rounded-lg border text-left transition ${
                        lockScreenStyle === st.id
                          ? 'os-accent-soft border font-semibold'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="text-xs font-medium">{st.label}</div>
                      <div className="text-[11px] opacity-55 mt-0.5">{st.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications History */}
              <div className={`${cardClass} flex items-center justify-between`}>
                <div>
                  <div className="text-xs font-semibold">Notifications (システム通知履歴)</div>
                  <div className="text-[11px] opacity-55">
                    現在 {notifications.length} 件の通知が保存されています
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearNotifications}
                  className={subButtonClass(false)}
                >
                  通知をすべて消去
                </button>
              </div>
            </motion.div>
          )}

          {/* ==============================================================
              5. APPS (アプリ一覧・起動・アンインストール管理)
             ============================================================== */}
          {activeTab === 'apps' && (
            <motion.div
              key="tab-apps"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 max-w-3xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold tracking-tight">Apps & Features</h2>
                  <p className="text-xs opacity-60 mt-0.5">
                    システムアプリおよびインストール済みアプリの一覧表示・起動・アンインストールを行います。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openApp('appstore')}
                  className="px-3.5 py-2 rounded-lg os-accent-bg text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
                >
                  <Icon name="Store" size={14} />
                  <span>App Store を開く</span>
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className={`${cardClass} flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5`}>
                <div
                  className={`flex items-center gap-2 flex-1 rounded-lg border px-3 py-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-white/10'
                  }`}
                >
                  <Icon name="Search" size={14} className="opacity-50" />
                  <input
                    type="text"
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    placeholder="アプリ名や機能で検索..."
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(
                    [
                      { id: 'all', label: 'すべて' },
                      { id: 'system', label: 'システム' },
                      { id: 'installed', label: '追加アプリ' },
                      { id: 'running', label: '実行中' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAppFilter(f.id)}
                      className={subButtonClass(appFilter === f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applications List */}
              <div className="space-y-2">
                {combinedApps.map((item) => (
                  <motion.div
                    key={item.uid}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${cardClass} flex items-center justify-between gap-3 py-3`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        <Icon name={item.icon} size={30} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate">{item.name}</span>
                          <span className="text-[11px] opacity-50 truncate">({item.nameJa})</span>
                          {item.isRunning && (
                            <span className="text-[10px] font-mono os-accent-text">● Running</span>
                          )}
                        </div>
                        <div className="text-[11px] opacity-60 truncate mt-0.5">
                          {item.category} · {item.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.isSystem) openApp(item.appId as AppId);
                          else launchInstalledApp(item.id);
                        }}
                        className={subButtonClass(false)}
                      >
                        起動
                      </button>
                      {!item.isSystem && (
                        <button
                          type="button"
                          onClick={() => uninstallApp(item.id)}
                          className="px-2.5 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-medium transition"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}

                {combinedApps.length === 0 && (
                  <div className={`${cardClass} py-10 text-center text-xs opacity-50`}>
                    条件に一致するアプリケーションが見つかりませんでした
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
