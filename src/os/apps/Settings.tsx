import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS, Wallpaper, AuroraColor } from '../OSContext';
import {
  AppId,
  UI_STYLES,
  ShellMode,
  DesignEngine,
  LockScreenStyle,
  SleepClockStyle,
  SleepBackground,
  ClockPosition,
  DesktopIconSize,
  DESKTOP_ICON_SIZE_PRESETS,
  ACCENT_COLOR_PRESETS,
} from '../types';
import { WALLPAPERS } from '../wallpapers';
import { Icon } from '../Icon';

const WALLPAPER_KEYS = Object.keys(WALLPAPERS) as Wallpaper[];

type NavCategory =
  | 'system'
  | 'personalization'
  | 'apps'
  | 'accounts'
  | 'update';

type SystemSubView =
  | 'main'
  | 'display'
  | 'sound'
  | 'power'
  | 'multitasking'
  | 'aicomponents'
  | 'about';

interface NavItem {
  id: NavCategory;
  label: string;
  icon: string;
}

const SIDEBAR_NAV: NavItem[] = [
  { id: 'system', label: 'System', icon: 'Monitor' },
  { id: 'personalization', label: 'Personalization', icon: 'Palette' },
  { id: 'apps', label: 'Apps', icon: 'LayoutGrid' },
  { id: 'accounts', label: 'Accounts', icon: 'User' },
  { id: 'update', label: 'Glassium Update', icon: 'RefreshCw' },
];

interface SystemCard {
  id: SystemSubView;
  title: string;
  desc: string;
  icon: string;
}

const SYSTEM_CARDS: SystemCard[] = [
  { id: 'display', title: 'Display', desc: 'Monitors, brightness, night light, wallpapers, live aurora, desktop icons', icon: 'Monitor' },
  { id: 'sound', title: 'Sound', desc: 'Volume levels, output, input, system sound effects', icon: 'Volume2' },
  { id: 'power', title: 'Power & battery', desc: 'Screen lock, sleep clock style, sleep backgrounds, clock position', icon: 'BatteryCharging' },
  { id: 'multitasking', title: 'Multitasking', desc: 'Snap windows, virtual desktops, taskbar alignment', icon: 'Layers' },
  { id: 'aicomponents', title: 'AI components', desc: 'Google Gemini API Key and AI assistant models', icon: 'Sparkles' },
  { id: 'about', title: 'About', desc: 'Device specifications, GlassiumOS 4.7 build, system specs', icon: 'Info' },
];

const AURORA_PALETTES: { id: AuroraColor; label: string }[] = [
  { id: 'cyan-violet', label: 'Amethyst & Cyan' },
  { id: 'emerald-sky', label: 'Polar Emerald' },
  { id: 'rose-gold', label: 'Crimson Rose' },
  { id: 'ocean-blue', label: 'Abyssal Sapphire' },
  { id: 'sunset-magenta', label: 'Neon Dusk' },
];

interface UpdateReleaseNote {
  version: string;
  build: string;
  date: string;
  badge?: string;
  highlights: string[];
}

const GLASS_UPDATE_HISTORY: UpdateReleaseNote[] = [
  {
    version: 'GlassiumOS 4.7',
    build: 'Build 22631.4700',
    date: '2026年11月1日 (最新リリース)',
    badge: '最新バージョン',
    highlights: [
      '⚡ ウィンドウ起動時・操作時の描画パフォーマンスを大幅最適化 (重いSVGディスプレイスメントの除去)',
      '🎨 設定アプリの過剰なボックス枠線を完全撤廃し、Windows 11スタイルの洗練されたZero-Borderレイアウトを採用',
      '🔄 Windows 8 (Metro) の全画面モードおよび Ubuntu 画面モードのサポートを完全復元',
      '🤖 @google/genai TypeScript SDK による Gemini 3.8 Flash AIモデルの統合と接続テスト機能',
      '🌟 システム全体のアプリ・設定項目に高精細 2.5D Fluentベクターアイコンを全配備',
    ],
  },
  {
    version: 'GlassiumOS 4.6',
    build: 'Build 22631.4600',
    date: '2026年10月25日',
    highlights: [
      '🔮 ガラスモーフィズムシェーダーエンジンの強化とカスタムアクリルテクスチャの追加',
      '📱 50:50 ウィンドウスナップ機能とタスクバー配置（中央/左）カスタマイズ機能の追加',
      '🎵 2D オーロラライブ壁紙およびスリープ画面時計カスタマイズ機能の実装',
    ],
  },
  {
    version: 'GlassiumOS 4.5',
    build: 'Build 22631.4500',
    date: '2026年10月15日',
    highlights: [
      '🚀 Glassium Studio & RetroCade エミュレータの組み込み',
      '🌐 Service Worker プロキシブラウザの改善とレスポンシブシェルエンジンの最適化',
    ],
  },
];

const SHELL_MODES: { id: ShellMode; label: string; desc: string }[] = [
  { id: 'windows', label: 'Windows 11', desc: '標準フラットタスクバー ＆ スタート' },
  { id: 'windows10', label: 'Windows 10', desc: 'クラシックタイル ＆ フラットバー' },
  { id: 'windows8', label: 'Windows 8 (Metro)', desc: '全画面アプリアニメーション' },
  { id: 'mac', label: 'macOS', desc: 'トップメニューバー ＆ 下部Dock' },
  { id: 'ubuntu', label: 'Ubuntu Linux', desc: '左側常駐ドック ＆ オレンジテーマ' },
  { id: 'dex', label: 'Samsung DeX', desc: 'マルチウィンドウワークステーション' },
  { id: 'chromeos', label: 'ChromeOS', desc: 'マテリアルピルシェルフ' },
  { id: 'zorin', label: 'Zorin Pro', desc: 'モダンエレガントLinux' },
  { id: 'vista', label: 'Vista Aero', desc: 'エアロガラス ＆ ガジェット' },
  { id: 'xp', label: 'Classic XP', desc: 'レトロルナテーマ' },
];

const DESIGN_ENGINES: { id: DesignEngine; label: string; desc: string }[] = [
  { id: 'windows-mica', label: 'Flat Mica', desc: '落ち着きのあるフラット透過マイカ' },
  { id: 'frosted-blur', label: 'Frosted Acrylic', desc: '高精細すりガラスアクリル' },
  { id: 'dark-slate', label: 'Crisp Slate', desc: 'コントラスト重視のフラットスレート' },
  { id: 'liquid-glass', label: 'Translucent Glass', desc: '滑らかな光学透過サーフェス' },
];

export function SettingsApp() {
  const {
    wallpaper,
    setWallpaper,
    addCustomWallpaper,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    uiStyle,
    setUiStyle,
    shellMode,
    setShellMode,
    designEngine,
    setDesignEngine,
    lockScreenStyle,
    setLockScreenStyle,
    sleepClockStyle,
    setSleepClockStyle,
    sleepBackground,
    setSleepBackground,
    clockPosition,
    setClockPosition,
    temperature,
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
    desktopIconSize,
    setDesktopIconSize,
    gridSnapEnabled,
    setGridSnapEnabled,
  } = useOS();

  const isLight = theme === 'light';
  const [activeCategory, setActiveCategory] = useState<NavCategory>('system');
  const [systemSubView, setSystemSubView] = useState<SystemSubView>('main');

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Key state
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || localStorage.getItem('glassium_ai_key') || '');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiTestMessage, setAiTestMessage] = useState('');

  // Account local state
  const [profileName, setProfileName] = useState(user?.name || 'Administrator');
  const [profilePassword, setProfilePassword] = useState(user?.password || '');
  const [accountSaved, setAccountSaved] = useState(false);

  // App search
  const [appSearch, setAppSearch] = useState('');

  // Update local state
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState(
    'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [updateStatusMsg, setUpdateStatusMsg] = useState(
    'GlassiumOS 4.7 は最新の状態です。すべての機能とコンポーネントが正常に動作しています。'
  );

  const handleCheckForUpdates = () => {
    playSound('click');
    setCheckingUpdate(true);
    setUpdateStatusMsg('Glassium OS アップデートサーバーを確認中...');
    setTimeout(() => {
      setCheckingUpdate(false);
      setLastCheckedTime(
        'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
      setUpdateStatusMsg('GlassiumOS 4.7 は最新の状態です。新しい更新プログラムはありません。');
      playSound('notify');
      addNotification('Glassium Update', 'OSは最新バージョン (GlassiumOS 4.7) です。');
    }, 1200);
  };

  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem('gemini_api_key', geminiApiKey);
      localStorage.setItem('glassium_ai_key', geminiApiKey);
    }
  }, [geminiApiKey]);

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addCustomWallpaper(file.name.replace(/\.[^.]+$/, ''), reader.result);
        playSound('notify');
        addNotification('Display', 'カスタム壁紙を追加しました');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveApiKey = () => {
    playSound('click');
    localStorage.setItem('gemini_api_key', geminiApiKey.trim());
    localStorage.setItem('glassium_ai_key', geminiApiKey.trim());
    addNotification('AI 設定', 'Gemini APIキーを保存しました。');
  };

  const handleTestApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setAiTestStatus('error');
      setAiTestMessage('APIキーを入力してください。');
      return;
    }
    setAiTestStatus('testing');
    setAiTestMessage('Gemini 3.8 Flash に接続確認中...');
    playSound('click');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello, testing connection.',
          apiKey: geminiApiKey.trim(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.reply) {
        setAiTestStatus('success');
        setAiTestMessage(`接続成功！ (${data.model || 'Gemini 3.8 Flash'})`);
        addNotification('AI 接続成功', 'Gemini APIキーの検証に成功しました！');
      } else {
        throw new Error('無効な応答');
      }
    } catch (err: unknown) {
      setAiTestStatus('error');
      setAiTestMessage(`接続失敗: ${err instanceof Error ? err.message : 'APIキーまたはネットワークを確認してください'}`);
    }
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({
      name: profileName.trim() || 'Administrator',
      avatar: user?.avatar || 'User',
      password: profilePassword.trim() || undefined,
      createdAt: user?.createdAt || Date.now(),
    });
    playSound('notify');
    setAccountSaved(true);
    setTimeout(() => setAccountSaved(false), 3000);
  };

  const renderBreadcrumbHeader = (title: string) => (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200/60 dark:border-white/[0.08]">
      <button
        type="button"
        onClick={() => {
          playSound('click');
          setSystemSubView('main');
        }}
        className={`p-1.5 rounded-md transition ${
          isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-white/80'
        }`}
        title="Back to System"
      >
        <Icon name="ChevronLeft" size={18} />
      </button>
      <span className="text-xs font-medium opacity-60">System</span>
      <span className="text-xs opacity-40">&gt;</span>
      <span className="text-sm font-bold">{title}</span>
    </div>
  );

  return (
    <div
      className={`h-full w-full flex flex-col sm:flex-row overflow-hidden select-none transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#1c1c1e] text-white'
      }`}
    >
      {/* ==============================================================
          LEFT SIDEBAR (Windows 11 Settings Sidebar)
         ============================================================== */}
      <div
        className={`w-full sm:w-64 p-3 flex sm:flex-col justify-between shrink-0 border-r transition-colors duration-200 ${
          isLight ? 'bg-slate-200/50 border-slate-300/60' : 'bg-[#252528]/80 border-white/[0.08]'
        }`}
      >
        <div className="w-full flex-1 overflow-y-auto scrollbar-none">
          {/* User Account Header */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-white/10 flex items-center justify-center shrink-0 text-slate-700 dark:text-white/80">
              <Icon name="User" size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{user?.name || 'Administrator'}</div>
              <div className="text-[11px] opacity-60 truncate">Local Account</div>
            </div>
          </div>

          {/* Search Box */}
          <div className="hidden sm:block px-2 mb-3">
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs border ${
              isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-black/30 border-white/10 text-white'
            }`}>
              <Icon name="Search" size={13} className="opacity-50 shrink-0" />
              <input
                type="text"
                placeholder="Find a setting"
                className="w-full bg-transparent outline-none text-xs placeholder-slate-400 dark:placeholder-white/40"
              />
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex sm:flex-col gap-0.5 overflow-x-auto w-full">
            {SIDEBAR_NAV.map((item) => {
              const active = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setActiveCategory(item.id);
                    if (item.id === 'system') {
                      setSystemSubView('main');
                    }
                  }}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-xs transition-all shrink-0 sm:w-full ${
                    active
                      ? isLight
                        ? 'bg-white font-semibold text-sky-600 shadow-xs'
                        : 'bg-white/[0.08] font-semibold text-sky-400'
                      : isLight
                      ? 'text-slate-700 hover:bg-slate-300/50'
                      : 'text-white/75 hover:bg-white/[0.04]'
                  }`}
                >
                  {active && (
                    <span className="hidden sm:block absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-sky-500" />
                  )}
                  <Icon name={item.icon} size={16} className={active ? 'text-sky-500' : 'opacity-70'} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==============================================================
          RIGHT MAIN PANE (Zero Box Border Line Design)
         ============================================================== */}
      <div className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ==================== 1. SYSTEM PAGE ==================== */}
          {activeCategory === 'system' && (
            <motion.div
              key="cat-system"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl"
            >
              {systemSubView === 'main' ? (
                <div>
                  <h1 className="text-xl font-bold mb-4">System</h1>

                  {/* Clean List Rows (Zero Box Outlines) */}
                  <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06] border-y border-slate-200/60 dark:border-white/[0.06]">
                    {SYSTEM_CARDS.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setSystemSubView(card.id);
                        }}
                        className={`w-full flex items-center justify-between py-3.5 px-3 text-left transition ${
                          isLight ? 'hover:bg-slate-200/40' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                            card.id === 'aicomponents' ? 'bg-sky-500/15 text-sky-400' : isLight ? 'bg-slate-200/70 text-slate-700' : 'bg-white/5 text-white/80'
                          }`}>
                            <Icon name={card.icon} size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold flex items-center gap-2">
                              <span>{card.title}</span>
                              {card.id === 'aicomponents' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-normal">
                                  Gemini Enabled
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] opacity-60 truncate mt-0.5">{card.desc}</div>
                          </div>
                        </div>

                        <Icon name="ChevronRight" size={16} className="opacity-40 shrink-0 ml-3" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : systemSubView === 'aicomponents' ? (
                /* ---------------- AI COMPONENTS SUB-PAGE ---------------- */
                <div>
                  {renderBreadcrumbHeader('AI components')}

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                          <Icon name="Sparkles" size={18} />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold">Google Gemini API Settings</h2>
                          <p className="text-xs opacity-60">AI Assistant, Glassium Studio, and System Assistant models</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1">Gemini API Key</label>
                          <div className="flex gap-2">
                            <div className={`flex-1 flex items-center px-3 py-1.5 rounded-lg border ${
                              isLight ? 'bg-white border-slate-300' : 'bg-black/40 border-white/10'
                            }`}>
                              <input
                                type={showKeyPassword ? 'text' : 'password'}
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full bg-transparent text-xs outline-none font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowKeyPassword(!showKeyPassword)}
                                className="opacity-50 hover:opacity-100 p-1"
                              >
                                <Icon name={showKeyPassword ? 'EyeOff' : 'Eye'} size={14} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveApiKey}
                              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold transition shrink-0"
                            >
                              保存
                            </button>
                          </div>
                          <p className="text-[11px] opacity-50 mt-1">
                            APIキーは `localStorage` に保存され、全AIコンポーネントで最優先適用されます。
                          </p>
                        </div>

                        {/* Connection Test */}
                        <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={handleTestApiKey}
                            disabled={aiTestStatus === 'testing'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-white/10 hover:bg-white/15 text-white'
                            }`}
                          >
                            <Icon name="RefreshCw" size={13} className={aiTestStatus === 'testing' ? 'animate-spin' : ''} />
                            <span>接続テストを実行</span>
                          </button>

                          {aiTestMessage && (
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                              aiTestStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                              aiTestStatus === 'error' ? 'bg-rose-500/20 text-rose-400' : 'text-sky-400'
                            }`}>
                              {aiTestMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Available AI Models */}
                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <h3 className="text-xs font-bold mb-3">搭載されているAIコンポーネント</h3>
                      <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06] text-xs">
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium">Standard Text Model</span>
                          <span className="font-mono text-sky-400">gemini-3.8-flash</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium">Lite Model Fallback</span>
                          <span className="font-mono text-sky-400">gemini-3.1-flash-lite</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium">AI SDK Integration</span>
                          <span className="font-mono opacity-60">@google/genai (v2.25+)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'display' ? (
                /* ---------------- DISPLAY SUB-PAGE ---------------- */
                <div>
                  {renderBreadcrumbHeader('Display')}
                  <div className="space-y-6">
                    {/* Wallpaper Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold">デスクトップ壁紙 (Wallpapers)</h3>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1 rounded-lg bg-sky-500 text-black text-xs font-bold"
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
                      <div className="grid grid-cols-3 gap-2">
                        {WALLPAPER_KEYS.map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => { playSound('click'); setWallpaper(k); }}
                            className={`p-2.5 rounded-lg text-xs text-center transition ${
                              wallpaper === k ? 'bg-sky-500/20 text-sky-400 font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                            }`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live 2D Aurora Options */}
                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold">2D オーロラライブ背景</h3>
                        <button
                          type="button"
                          onClick={() => setAuroraParticles(!auroraParticles)}
                          className={`px-3 py-1 rounded text-xs font-bold ${auroraParticles ? 'bg-sky-500 text-black' : 'bg-slate-300 dark:bg-white/10'}`}
                        >
                          パーティクル: {auroraParticles ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {AURORA_PALETTES.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setWallpaper('live2d');
                              setAuroraColor(p.id);
                            }}
                            className={`p-2 rounded-lg text-xs text-left transition ${
                              auroraColor === p.id ? 'bg-sky-500/20 text-sky-400 font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>オーロラ速度</span>
                            <span className="font-mono">{auroraSpeed.toFixed(1)}x</span>
                          </div>
                          <input type="range" min={0.2} max={3} step={0.1} value={auroraSpeed} onChange={(e) => setAuroraSpeed(Number(e.target.value))} className="w-full accent-sky-500" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>オーロラ光量</span>
                            <span className="font-mono">{auroraIntensity}%</span>
                          </div>
                          <input type="range" min={20} max={100} value={auroraIntensity} onChange={(e) => setAuroraIntensity(Number(e.target.value))} className="w-full accent-sky-500" />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Icon Size & Grid Placement */}
                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold">デスクトップアイコンサイズ ＆ グリッドスナップ</h3>
                        <button
                          type="button"
                          onClick={() => { playSound('click'); setGridSnapEnabled(!gridSnapEnabled); }}
                          className={`px-3 py-1 rounded text-xs font-bold ${gridSnapEnabled ? 'bg-sky-500 text-black' : 'bg-slate-300 dark:bg-white/10'}`}
                        >
                          グリッド: {gridSnapEnabled ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {(['small', 'medium', 'large'] as DesktopIconSize[]).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => { playSound('click'); setDesktopIconSize(sz); }}
                            className={`p-2 rounded-lg text-xs text-center transition ${
                              desktopIconSize === sz ? 'bg-sky-500/20 text-sky-400 font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                            }`}
                          >
                            {DESKTOP_ICON_SIZE_PRESETS[sz].labelJa}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'sound' ? (
                /* ---------------- SOUND SUB-PAGE ---------------- */
                <div>
                  {renderBreadcrumbHeader('Sound')}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">マスター音量 (Master Volume)</span>
                      <span className="text-xs font-mono">{volume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full accent-sky-500"
                    />

                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold">システム効果音</div>
                        <div className="text-[11px] opacity-60">クリックや通知音を再生します</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { playSound('click'); setSoundEnabled(!soundEnabled); }}
                        className={`px-3 py-1 rounded-md text-xs font-bold ${soundEnabled ? 'bg-sky-500 text-black' : 'bg-slate-300 dark:bg-white/10'}`}
                      >
                        {soundEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'power' ? (
                /* ---------------- POWER & BATTERY (SLEEP) ---------------- */
                <div>
                  {renderBreadcrumbHeader('Power & battery')}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">画面スリープ (Lock / Sleep Screen)</h3>
                        <p className="text-[11px] opacity-60">スリープ画面のスタイルと動作を設定します</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => lockSystem()}
                        className="px-3 py-1.5 rounded-lg bg-sky-500 text-black text-xs font-bold"
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
                          className={`w-full text-xs p-2 rounded border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                        >
                          <option value="hyperos3">HyperOS 3 Depth</option>
                          <option value="windows-hello">Windows Hello</option>
                          <option value="miuix">MIUIx Clean</option>
                          <option value="cosmic-liquid">Ambient Glass</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">スリープ時計スタイル</label>
                        <select
                          value={sleepClockStyle}
                          onChange={(e) => setSleepClockStyle(e.target.value as SleepClockStyle)}
                          className={`w-full text-xs p-2 rounded border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                        >
                          <option value="depth">3D Depth Clock</option>
                          <option value="analog">Analog Clock</option>
                          <option value="minimal">Minimal</option>
                          <option value="vertical">Vertical</option>
                          <option value="cyber">Cyber HUD</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <div>
                        <label className="block text-xs font-semibold mb-1">スリープ背景</label>
                        <select
                          value={sleepBackground}
                          onChange={(e) => setSleepBackground(e.target.value as SleepBackground)}
                          className={`w-full text-xs p-2 rounded border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                        >
                          <option value="aurora">Live Aurora</option>
                          <option value="void">Void Space</option>
                          <option value="matrix">Matrix</option>
                          <option value="galaxy">Galaxy</option>
                          <option value="retro">Synthwave</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">天気気温表示</label>
                        <div className={`p-2 rounded text-xs border ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}>
                          現在気温: {temperature}°C
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <label className="block text-xs font-semibold mb-1">時計の配置場所</label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(['top', 'center', 'bottom'] as ClockPosition[]).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setClockPosition(pos)}
                            className={`p-2 rounded text-center transition ${
                              clockPosition === pos ? 'bg-sky-500/20 text-sky-400 font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                            }`}
                          >
                            {pos.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'multitasking' ? (
                /* ---------------- MULTITASKING SUB-PAGE ---------------- */
                <div>
                  {renderBreadcrumbHeader('Multitasking')}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">ウィンドウの左右整列 (50:50 Snap)</h3>
                        <p className="text-[11px] opacity-60">開いているウィンドウを画面の左右に50:50で即座にスナップ配置します</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { playSound('click'); snapAllWindows5050(); }}
                        className="px-3 py-1.5 rounded-lg bg-sky-500 text-black text-xs font-bold"
                      >
                        ウィンドウ整列
                      </button>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">タスクバーアイコン配置</h3>
                        <p className="text-[11px] opacity-60">中央揃えまたは左揃えを切り替えます</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTaskbarAlign('center')}
                          className={`px-3 py-1 rounded text-xs font-semibold ${taskbarAlign === 'center' ? 'bg-sky-500 text-black' : 'bg-slate-200 dark:bg-white/10'}`}
                        >
                          中央揃え
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskbarAlign('left')}
                          className={`px-3 py-1 rounded text-xs font-semibold ${taskbarAlign === 'left' ? 'bg-sky-500 text-black' : 'bg-slate-200 dark:bg-white/10'}`}
                        >
                          左揃え
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ---------------- ABOUT SUB-PAGE ---------------- */
                <div>
                  {renderBreadcrumbHeader('About')}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                        OS
                      </div>
                      <div>
                        <h2 className="text-sm font-bold">GlassiumOS 4.7 (Windows 11 Design)</h2>
                        <p className="text-xs opacity-60">Version 4.7 (OS Build 22631.4700)</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] text-xs space-y-2">
                      <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-white/[0.04]">
                        <span className="opacity-60">Device name</span>
                        <span className="font-semibold">Glassium-PC</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-white/[0.04]">
                        <span className="opacity-60">Processor</span>
                        <span className="font-semibold">Virtual Octa-Core Processor @ 3.40GHz</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-white/[0.04]">
                        <span className="opacity-60">Installed RAM</span>
                        <span className="font-semibold">16.0 GB (15.8 GB usable)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-white/[0.04]">
                        <span className="opacity-60">System type</span>
                        <span className="font-semibold">64-bit operating system, x64-based processor</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="opacity-60">AI Runtime</span>
                        <span className="font-semibold">Google GenAI SDK (@google/genai)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ==================== 2. PERSONALIZATION PAGE ==================== */}
          {activeCategory === 'personalization' && (
            <motion.div
              key="cat-personalization"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-6"
            >
              <h1 className="text-xl font-bold">Personalization</h1>

              {/* Color Mode */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/[0.06]">
                <div>
                  <h2 className="text-xs font-bold">Color Mode (カラーモード)</h2>
                  <p className="text-[11px] opacity-60">ダークモードとライトモードを切り替えます</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark' ? 'bg-sky-500 text-black' : 'bg-slate-200 dark:bg-white/10'}`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${theme === 'light' ? 'bg-sky-500 text-black' : 'bg-slate-200 dark:bg-white/10'}`}
                  >
                    Light
                  </button>
                </div>
              </div>

              {/* UI Style & Shell Mode Switcher */}
              <div>
                <h2 className="text-xs font-bold mb-3">UI Style & Shell Mode (OSスタイル ＆ シェル)</h2>

                {/* Authentic OS Presets */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-sky-400 mb-2">Authentic OS Modes</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SHELL_MODES.map((sm) => {
                      const active = shellMode === sm.id;
                      return (
                        <button
                          key={sm.id}
                          type="button"
                          onClick={() => { playSound('click'); setShellMode(sm.id); }}
                          className={`p-3 rounded-lg text-left transition ${
                            active ? 'bg-sky-500/20 text-sky-400 font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="text-xs">{sm.label}</div>
                          <div className="text-[10px] opacity-60 mt-0.5 font-normal">{sm.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* UI Styles List */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-sky-400 mb-2">UI Design Presets</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {UI_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => { playSound('click'); setUiStyle(st.id); }}
                        className={`p-2.5 rounded-lg text-left text-xs transition ${
                          uiStyle === st.id ? 'bg-sky-500/20 text-sky-400 font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                        }`}
                      >
                        <div>{st.name}</div>
                        <div className="text-[10px] opacity-60 font-normal">{st.badge}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Surface Engine Options */}
                <div>
                  <div className="text-[11px] font-bold text-sky-400 mb-2">Surface Material Engine</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DESIGN_ENGINES.map((de) => (
                      <button
                        key={de.id}
                        type="button"
                        onClick={() => { playSound('click'); setDesignEngine(de.id); }}
                        className={`p-2.5 rounded-lg text-left text-xs transition ${
                          designEngine === de.id ? 'bg-sky-500/20 text-sky-400 font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                        }`}
                      >
                        <div>{de.label}</div>
                        <div className="text-[10px] opacity-60 font-normal">{de.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Accent Color Picker */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
                <h2 className="text-xs font-bold mb-3">Accent Color (アクセントカラー)</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ACCENT_COLOR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { playSound('click'); setAccentColor(p.id); }}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs transition ${
                        accentColor === p.id ? 'bg-sky-500/20 font-bold text-sky-400' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: p.hex }} />
                      <span className="truncate">{p.labelJa}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Glass Optical Settings */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
                <h2 className="text-xs font-bold mb-3">Advanced Optical Glass Parameters</h2>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Blur Amount</span>
                      <span className="font-mono">{blurAmount}px</span>
                    </div>
                    <input type="range" min={4} max={60} value={blurAmount} onChange={(e) => setBlurAmount(Number(e.target.value))} className="w-full accent-sky-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Corner Radius</span>
                      <span className="font-mono">{cornerRadius}px</span>
                    </div>
                    <input type="range" min={0} max={36} value={cornerRadius} onChange={(e) => setCornerRadius(Number(e.target.value))} className="w-full accent-sky-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Transparency</span>
                      <span className="font-mono">{transparency}%</span>
                    </div>
                    <input type="range" min={10} max={95} value={transparency} onChange={(e) => setTransparency(Number(e.target.value))} className="w-full accent-sky-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Glass Wobble</span>
                      <span className="font-mono">{glassWobble}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={glassWobble} onChange={(e) => setGlassWobble(Number(e.target.value))} className="w-full accent-sky-500" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== 3. APPS PAGE ==================== */}
          {activeCategory === 'apps' && (
            <motion.div
              key="cat-apps"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-4"
            >
              <h1 className="text-xl font-bold">Installed Apps</h1>
              <div className="space-y-3">
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Search installed apps..."
                  className={`w-full p-2 text-xs rounded border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                />
                <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06] border-y border-slate-200/60 dark:border-white/[0.06]">
                  {installedApps
                    .filter((a) => !appSearch || a.name.toLowerCase().includes(appSearch.toLowerCase()))
                    .map((app) => (
                      <div key={app.id} className="flex items-center justify-between py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Icon name={app.icon || 'AppWindow'} size={20} className="text-sky-400" />
                          <div>
                            <div className="text-xs font-semibold">{app.name}</div>
                            <div className="text-[10px] opacity-60">{app.description}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openApp(app.appId as AppId)}
                          className="px-3 py-1 rounded bg-sky-500 text-black text-xs font-bold"
                        >
                          開く
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== 4. ACCOUNTS PAGE ==================== */}
          {activeCategory === 'accounts' && (
            <motion.div
              key="cat-accounts"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-4"
            >
              <h1 className="text-xl font-bold">Accounts</h1>
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">ユーザー名 (User Name)</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className={`w-full p-2 text-xs rounded border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">パスワード (Password)</label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Enter password"
                    className={`w-full p-2 text-xs rounded border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button type="submit" className="px-4 py-1.5 bg-sky-500 text-black text-xs font-bold rounded-lg">
                    設定を保存
                  </button>
                  {accountSaved && <span className="text-xs text-emerald-400 font-medium">アカウント情報を保存しました！</span>}
                </div>
              </form>
            </motion.div>
          )}

          {/* ==================== 5. GLASSIUM UPDATE PAGE ==================== */}
          {activeCategory === 'update' && (
            <motion.div
              key="cat-update"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">Glassium Update</h1>
                  <p className="text-xs opacity-60">GlassiumOS 4.7 のアップデートと更新履歴</p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdate}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-xs font-bold rounded-lg transition flex items-center gap-2"
                >
                  <Icon name="RefreshCw" size={14} className={checkingUpdate ? 'animate-spin' : ''} />
                  <span>{checkingUpdate ? '更新を確認中...' : '更新プログラムのチェック'}</span>
                </button>
              </div>

              {/* Status Header */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-200/40 dark:bg-white/[0.04]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${checkingUpdate ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  <Icon name={checkingUpdate ? 'RefreshCw' : 'CheckCircle2'} size={24} className={checkingUpdate ? 'animate-spin' : ''} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-bold">{checkingUpdate ? 'Glassium サーバーに接続中...' : '最新の状態です'}</h2>
                  <p className="text-xs text-sky-400 font-medium">{updateStatusMsg}</p>
                  <p className="text-[11px] opacity-60">最終確認日時: {lastCheckedTime}</p>
                </div>
              </div>

              {/* System Specs Overview */}
              <div className="pt-2 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                <div>
                  <span className="block opacity-60 text-[11px]">OS バージョン</span>
                  <span className="font-bold text-sky-400">GlassiumOS 4.7</span>
                </div>
                <div>
                  <span className="block opacity-60 text-[11px]">OS ビルド番号</span>
                  <span className="font-mono">Build 22631.4700</span>
                </div>
                <div>
                  <span className="block opacity-60 text-[11px]">AI エンジン</span>
                  <span className="font-medium">@google/genai (Gemini 3.8 Flash)</span>
                </div>
              </div>

              {/* Update History & Release Notes */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
                <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Icon name="FileText" size={16} className="text-sky-400" />
                  <span>アップデート履歴 ＆ リリースノート (Release Notes)</span>
                </h2>

                <div className="space-y-6">
                  {GLASS_UPDATE_HISTORY.map((item) => (
                    <div key={item.version} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-sky-400">{item.version}</span>
                          <span className="text-[11px] font-mono opacity-60">({item.build})</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] opacity-60">{item.date}</span>
                      </div>

                      <ul className="space-y-1.5 pl-3 border-l-2 border-sky-500/30 text-xs">
                        {item.highlights.map((hl, i) => (
                          <li key={i} className="leading-relaxed opacity-90 flex items-start gap-2">
                            <span className="text-sky-400 shrink-0 select-none">•</span>
                            <span>{hl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
