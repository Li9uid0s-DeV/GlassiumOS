import React, { useState, useEffect, useRef } from 'react';
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
} from '../types';
import { WALLPAPERS } from '../wallpapers';
import { Icon } from '../Icon';

const WALLPAPER_KEYS = Object.keys(WALLPAPERS) as Wallpaper[];

type NavCategory = 'system' | 'personalization' | 'apps' | 'accounts';

type SystemSubView = 'main' | 'display' | 'sound' | 'power' | 'multitasking' | 'aicomponents';
type PersonalizationSubView = 'main' | 'uistyle' | 'surface' | 'accent' | 'wallpaper' | 'glass';
type AccountsSubView = 'main' | 'profile' | 'security' | 'info';

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
];

interface SystemCard {
  id: SystemSubView;
  title: string;
  desc: string;
  icon: string;
}

const SYSTEM_CARDS: SystemCard[] = [
  { id: 'display', title: 'Display', desc: '壁紙、2Dオーロラ背景、アイコンサイズ、グリッドスナップ', icon: 'Monitor' },
  { id: 'sound', title: 'Sound', desc: 'マスター音量、システム効果音', icon: 'Volume2' },
  { id: 'power', title: 'Power & battery', desc: '画面ロック、スリープ時計スタイル、画面の配置', icon: 'BatteryCharging' },
  { id: 'multitasking', title: 'Multitasking & Taskbar', desc: '50:50 ウィンドウスナップ、タスクバー配置、自動隠す', icon: 'Layers' },
  { id: 'aicomponents', title: 'AI components', desc: 'Google Gemini API Key 接続・レスポンス検証', icon: 'Sparkles' },
];

const AURORA_PALETTES: { id: AuroraColor; label: string; preview: string }[] = [
  { id: 'cyan-violet', label: 'Amethyst & Cyan', preview: 'from-cyan-500 via-indigo-500 to-purple-600' },
  { id: 'emerald-sky', label: 'Polar Emerald', preview: 'from-emerald-400 via-teal-500 to-sky-600' },
  { id: 'rose-gold', label: 'Crimson Rose', preview: 'from-rose-500 via-pink-500 to-amber-500' },
  { id: 'ocean-blue', label: 'Abyssal Sapphire', preview: 'from-sky-400 via-blue-600 to-indigo-800' },
  { id: 'sunset-magenta', label: 'Neon Dusk', preview: 'from-pink-500 via-purple-600 to-indigo-800' },
];

const SHELL_MODES: { id: ShellMode; label: string; desc: string; preview: string }[] = [
  { id: 'windows', label: 'Windows 11', desc: '中央配置タスクバー ＆ 丸角フロートスタート', preview: 'bg-slate-900 border-sky-400/40' },
  { id: 'windows10', label: 'Windows 10', desc: '左揃えタスクバー ＆ ライブタイルスタート', preview: 'bg-zinc-950 border-blue-500/40' },
  { id: 'windows8', label: 'Windows 8 (Metro)', desc: '全画面ライブタイルアプリアニメーション', preview: 'bg-teal-950 border-teal-400/40' },
  { id: 'mac', label: 'macOS Sonoma', desc: 'トップシステムバー ＆ フロートガラスDock', preview: 'bg-stone-900 border-rose-400/40' },
  { id: 'ubuntu', label: 'Ubuntu Linux', desc: '左側常駐ドック ＆ オレンジアクセント', preview: 'bg-orange-950 border-orange-500/40' },
  { id: 'dex', label: 'Samsung DeX', desc: 'マルチウィンドウワークステーション', preview: 'bg-blue-950 border-blue-400/40' },
  { id: 'chromeos', label: 'ChromeOS', desc: 'マテリアルピルシェルフ ＆ パステルUI', preview: 'bg-purple-950 border-purple-400/40' },
  { id: 'zorin', label: 'Zorin Pro', desc: 'エレガントモダンLinuxデスクトップ', preview: 'bg-slate-950 border-cyan-400/40' },
  { id: 'vista', label: 'Vista Aero', desc: 'エアロガラス ＆ ガジェットバー', preview: 'bg-cyan-950 border-cyan-300/40' },
  { id: 'xp', label: 'Classic XP', desc: 'レトロルナブルー ＆ エメラルドスタート', preview: 'bg-blue-800 border-emerald-400/40' },
];

const DESIGN_ENGINES: { id: DesignEngine; label: string; desc: string; bg: string }[] = [
  { id: 'liquid-glass', label: 'Translucent Glass', desc: '屈折と反射を伴う液体ガラスサーフェス', bg: 'from-cyan-900/60 to-purple-900/60 backdrop-blur-md' },
  { id: 'windows-mica', label: 'Flat Mica', desc: 'Windows 11に馴染む静かな不透明マイカ', bg: 'from-slate-900/90 to-slate-800/90 backdrop-blur-sm' },
  { id: 'frosted-blur', label: 'Frosted Acrylic', desc: '高精細すりガラスディープアクリル', bg: 'from-slate-950/40 to-blue-950/40 backdrop-blur-2xl' },
  { id: 'dark-slate', label: 'Crisp Slate', desc: 'ハイコントラストで明瞭なフラットスレート', bg: 'from-zinc-950 to-black' },
  { id: 'cyberpunk-neon', label: 'Cyberpunk HUD', desc: '高輝度ネオン線とサイバーパンク感', bg: 'from-black via-cyan-950/80 to-emerald-950/80 border border-cyan-500/40' },
  { id: 'miuix-glass', label: 'Hyper Glass 3', desc: '角丸24pxと超平滑グラデーション', bg: 'from-indigo-900/50 via-purple-900/50 to-pink-900/50 backdrop-blur-xl' },
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

/* Custom Reusable Smooth Toggle Switch Component */
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
        checked ? 'bg-[var(--os-accent)] shadow-[0_0_12px_rgba(var(--os-accent-rgb),0.4)]' : 'bg-slate-300 dark:bg-white/20'
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

/* Custom Reusable Glass Range Slider Component */
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
          <span className="font-mono text-sky-400 font-bold">{valueText ?? value}</span>
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

export function SettingsApp() {
  const {
    wallpaper,
    setWallpaper,
    addCustomWallpaper,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
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
  } = useOS();

  const isLight = theme === 'light';
  const [activeCategory, setActiveCategory] = useState<NavCategory>('system');
  const [systemSubView, setSystemSubView] = useState<SystemSubView>('main');
  const [personalSubView, setPersonalSubView] = useState<PersonalizationSubView>('main');
  const [accountsSubView, setAccountsSubView] = useState<AccountsSubView>('main');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Gemini Key state
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || localStorage.getItem('glassium_ai_key') || '');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
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
        addNotification({ title: 'Display', message: 'カスタム壁紙を追加しました' });
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

  const handleSaveApiKey = () => {
    playSound('click');
    localStorage.setItem('gemini_api_key', geminiApiKey.trim());
    localStorage.setItem('glassium_ai_key', geminiApiKey.trim());
    addNotification({ title: 'AI 設定', message: 'Gemini APIキーを保存しました。' });
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
        addNotification({ title: 'AI 接続成功', message: 'Gemini APIキーの検証に成功しました！' });
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
      avatar: customAvatarUrl || selectedAvatarIcon,
      password: profilePassword.trim() || undefined,
      createdAt: user?.createdAt || Date.now(),
    });
    playSound('notify');
    setAccountSaved(true);
    addNotification({ title: 'Accounts', message: 'アカウントプロファイルを更新しました。' });
    setTimeout(() => setAccountSaved(false), 3000);
  };

  const renderBreadcrumbHeader = (
    title: string,
    onBack: () => void
  ) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
      <button
        type="button"
        onClick={() => { playSound('click'); onBack(); }}
        className={`p-1.5 rounded-lg transition ${isLight ? 'hover:bg-slate-200/80 text-slate-700' : 'hover:bg-white/10 text-white/80'}`}
        title="戻る"
      >
        <Icon name="ArrowLeft" size={16} />
      </button>
      <h2 className="text-sm font-bold text-[var(--os-accent)]">{title}</h2>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-slate-100/90 dark:bg-slate-950/90 text-slate-900 dark:text-slate-100 select-none overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <div className="w-52 shrink-0 border-r border-slate-200/60 dark:border-white/[0.06] p-3 flex flex-col justify-between bg-slate-200/30 dark:bg-black/20">
        <div className="space-y-4">
          {/* User Compact Profile */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-200/50 dark:bg-white/[0.04]">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[var(--os-accent)] text-black font-bold shadow-md'
                      : isLight
                      ? 'text-slate-700 hover:bg-slate-200/60'
                      : 'text-slate-300 hover:bg-white/[0.06]'
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
        <div className="px-3 py-2 text-[10px] opacity-50 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between font-mono">
          <span>GlassiumOS</span>
          <span>v4.7</span>
        </div>
      </div>

      {/* Main Content View Container */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <AnimatePresence mode="wait">
          {/* ==================== 1. SYSTEM CATEGORY ==================== */}
          {activeCategory === 'system' && (
            <motion.div
              key="cat-system"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-4"
            >
              {systemSubView === 'main' ? (
                <>
                  <div className="mb-4">
                    <h1 className="text-xl font-bold">System</h1>
                    <p className="text-xs opacity-60">ディスプレイ、サウンド、通知、電源とスリープの設定</p>
                  </div>

                  {/* Windows 11 Clean Hairline Card List */}
                  <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                    {SYSTEM_CARDS.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => { playSound('click'); setSystemSubView(card.id); }}
                        className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${
                          isLight ? 'hover:bg-slate-200/40' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)] shrink-0">
                            <Icon name={card.icon} size={20} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[var(--os-accent)] transition-colors">
                              {card.title}
                            </div>
                            <div className="text-[11px] opacity-60 truncate">{card.desc}</div>
                          </div>
                        </div>
                        <Icon name="ChevronRight" size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                      </button>
                    ))}
                  </div>
                </>
              ) : systemSubView === 'display' ? (
                /* ---------------- DISPLAY SUB-PAGE ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Display (ディスプレイ ＆ 壁紙)', () => setSystemSubView('main'))}

                  {/* Static Wallpapers Preview Cards */}
                  <div>
                    <h3 className="text-xs font-bold mb-3">デスクトップ壁紙 (Wallpaper Previews)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {WALLPAPER_KEYS.map((k) => {
                        const wp = WALLPAPERS[k];
                        const selected = wallpaper === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => { playSound('click'); setWallpaper(k); }}
                            className={`p-2.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between h-24 ${
                              selected ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]/30' : 'border-slate-200/60 dark:border-white/[0.08]'
                            }`}
                          >
                            <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${wp?.gradient || 'from-sky-900 to-indigo-950'}`} />
                            <div className="relative z-10 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 text-white">
                                {k}
                              </span>
                              {selected && <Icon name="CheckCircle2" size={16} className="text-[var(--os-accent)]" />}
                            </div>
                            <div className="relative z-10 text-[10px] opacity-80 line-clamp-1">{wp?.nameJa || k}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Wallpaper Upload */}
                  <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold">カスタム壁紙のアップロード</h3>
                      <p className="text-[11px] opacity-60">お好みの画像ファイルを壁紙として適用します</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow transition hover:brightness-110"
                    >
                      画像を選択
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCustomWallpaperUpload} className="hidden" />
                  </div>

                  {/* Live 2D Aurora Options */}
                  <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">2D オーロラ ＆ ライブインタラクティブ背景</h3>
                        <p className="text-[11px] opacity-60">動的粒子アニメーションと速度のカスタマイズ</p>
                      </div>
                      <ToggleSwitch checked={auroraParticles} onChange={setAuroraParticles} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {AURORA_PALETTES.map((p) => {
                        const selected = wallpaper === 'live2d' && auroraColor === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setWallpaper('live2d');
                              setAuroraColor(p.id);
                            }}
                            className={`p-3 rounded-2xl border text-left transition relative overflow-hidden h-20 flex flex-col justify-between ${
                              selected ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]/30' : 'border-slate-200/60 dark:border-white/[0.08]'
                            }`}
                          >
                            <div className={`absolute inset-0 opacity-50 bg-gradient-to-r ${p.preview}`} />
                            <div className="relative z-10 flex items-center justify-between">
                              <span className="text-xs font-bold text-white shadow-xs">{p.label}</span>
                              {selected && <Icon name="CheckCircle2" size={16} className="text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                      <CustomSlider min={0.2} max={3} step={0.1} value={auroraSpeed} onChange={setAuroraSpeed} label="オーロラ流速" valueText={`${auroraSpeed.toFixed(1)}x`} />
                      <CustomSlider min={20} max={100} value={auroraIntensity} onChange={setAuroraIntensity} label="オーロラ輝度" valueText={`${auroraIntensity}%`} />
                    </div>
                  </div>

                  {/* Desktop Icon Size & Grid Placement */}
                  <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">デスクトップグリッドスナップ</h3>
                        <p className="text-[11px] opacity-60">アイコンをグリッドに自動整列します</p>
                      </div>
                      <ToggleSwitch checked={gridSnapEnabled} onChange={setGridSnapEnabled} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {(['small', 'medium', 'large'] as DesktopIconSize[]).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => { playSound('click'); setDesktopIconSize(sz); }}
                          className={`p-2.5 rounded-xl text-xs text-center transition ${
                            desktopIconSize === sz ? 'bg-[var(--os-accent)] text-black font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
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
                    <CustomSlider min={0} max={100} value={volume} onChange={setVolume} label="マスター音量 (Master Volume)" valueText={`${volume}%`} />

                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold">システム効果音</div>
                        <div className="text-[11px] opacity-60">クリックや通知音を再生します</div>
                      </div>
                      <ToggleSwitch checked={soundEnabled} onChange={setSoundEnabled} />
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'power' ? (
                /* ---------------- POWER & BATTERY ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Power & battery (スリープ ＆ ロック)', () => setSystemSubView('main'))}

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">画面スリープ (Sleep Screen)</h3>
                        <p className="text-[11px] opacity-60">手動でロック画面・スリープモードを即時起動します</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => lockSystem()}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
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
                          className={`w-full text-xs p-2.5 rounded-xl border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
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
                          className={`w-full text-xs p-2.5 rounded-xl border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                        >
                          <option value="depth">3D Depth Clock</option>
                          <option value="analog">Analog Clock</option>
                          <option value="minimal">Minimal Line</option>
                          <option value="vertical">Vertical Clock</option>
                          <option value="cyber">Cyber HUD</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <label className="block text-xs font-semibold mb-2">スリープ背景テーマ</label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(['aurora', 'void', 'matrix', 'galaxy', 'retro', 'wallpaper'] as SleepBackground[]).map((bg) => (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => setSleepBackground(bg)}
                            className={`p-2.5 rounded-xl text-center capitalize transition ${
                              sleepBackground === bg ? 'bg-[var(--os-accent)] text-black font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
                            }`}
                          >
                            {bg}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <label className="block text-xs font-semibold mb-2">時計の配置場所</label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(['top', 'center', 'bottom'] as ClockPosition[]).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setClockPosition(pos)}
                            className={`p-2.5 rounded-xl text-center uppercase font-mono transition ${
                              clockPosition === pos ? 'bg-[var(--os-accent)] text-black font-bold' : isLight ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
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
                        <p className="text-[11px] opacity-60">開いている全ウィンドウを即座に左右50:50で配置します</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { playSound('click'); snapAllWindows5050(); }}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
                      >
                        ウィンドウ整列
                      </button>
                    </div>

                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">タスクバーアイコン配置</h3>
                        <p className="text-[11px] opacity-60">中央揃えまたは左揃えを切り替えます</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTaskbarAlign('center')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${taskbarAlign === 'center' ? 'bg-[var(--os-accent)] text-black font-bold' : 'bg-slate-200 dark:bg-white/10'}`}
                        >
                          中央揃え
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskbarAlign('left')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${taskbarAlign === 'left' ? 'bg-[var(--os-accent)] text-black font-bold' : 'bg-slate-200 dark:bg-white/10'}`}
                        >
                          左揃え
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold">タスクバーを自動的に隠す</h3>
                        <p className="text-[11px] opacity-60">カーソルを画面下部に移動した際のみ表示します</p>
                      </div>
                      <ToggleSwitch checked={autoHideTaskbar} onChange={setAutoHideTaskbar} />
                    </div>
                  </div>
                </div>
              ) : (
                /* ---------------- AI COMPONENTS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('AI Components (Google Gemini API)', () => setSystemSubView('main'))}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-1">Gemini API Key (APIキー)</label>
                      <div className="flex gap-2">
                        <input
                          type={showKeyPassword ? 'text' : 'password'}
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="AI Studio Gemini API Key"
                          className={`flex-1 p-2.5 text-xs rounded-xl border outline-none font-mono ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeyPassword(!showKeyPassword)}
                          className={`px-3 py-2 text-xs rounded-xl border ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-white/10 border-white/10'}`}
                        >
                          {showKeyPassword ? '非表示' : '表示'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button type="button" onClick={handleSaveApiKey} className="px-4 py-2 bg-[var(--os-accent)] text-black text-xs font-bold rounded-xl shadow">
                        APIキーを保存
                      </button>
                      <button type="button" onClick={handleTestApiKey} className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-xs font-bold rounded-xl border border-slate-300 dark:border-white/10">
                        接続テスト
                      </button>
                    </div>

                    {aiTestMessage && (
                      <div className={`p-3 rounded-xl text-xs border ${aiTestStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : aiTestStatus === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-sky-500/10 border-sky-500/30 text-sky-400'}`}>
                        {aiTestMessage}
                      </div>
                    )}
                  </div>
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
              className="max-w-4xl space-y-4"
            >
              {personalSubView === 'main' ? (
                <>
                  <div className="mb-4">
                    <h1 className="text-xl font-bold">Personalization</h1>
                    <p className="text-xs opacity-60">UIスタイル、マテリアルエンジン、アクセントカラー、透過パラメーターの調整</p>
                  </div>

                  {/* Clean Hairline Divided Row List */}
                  <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                    <div className="py-3.5 px-3 flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
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
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${theme === 'dark' ? 'bg-[var(--os-accent)] text-black font-bold' : 'bg-slate-200 dark:bg-white/10'}`}
                        >
                          Dark
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${theme === 'light' ? 'bg-[var(--os-accent)] text-black font-bold' : 'bg-slate-200 dark:bg-white/10'}`}
                        >
                          Light
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { playSound('click'); setPersonalSubView('uistyle'); }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${isLight ? 'hover:bg-slate-200/40' : 'hover:bg-white/[0.04]'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Layout" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">UI Style Presets (各モードイメージ図付き)</div>
                          <div className="text-[11px] opacity-60">Windows 11、macOS、Ubuntu、Windows 8などのプレビュー選択</div>
                        </div>
                      </div>
                      <Icon name="ChevronRight" size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { playSound('click'); setPersonalSubView('surface'); }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${isLight ? 'hover:bg-slate-200/40' : 'hover:bg-white/[0.04]'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Sparkles" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">Surface Material Engine (質感エンジン)</div>
                          <div className="text-[11px] opacity-60">Mica, Acrylic, Glass, Slate, Cyberpunk HUD の即時適用</div>
                        </div>
                      </div>
                      <Icon name="ChevronRight" size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { playSound('click'); setPersonalSubView('accent'); }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${isLight ? 'hover:bg-slate-200/40' : 'hover:bg-white/[0.04]'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Palette" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">Accent Color (アクセントカラー)</div>
                          <div className="text-[11px] opacity-60">シアン、ブルー、バイオレット、エメラルド、ローズ、アンバー</div>
                        </div>
                      </div>
                      <Icon name="ChevronRight" size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { playSound('click'); setPersonalSubView('glass'); }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${isLight ? 'hover:bg-slate-200/40' : 'hover:bg-white/[0.04]'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Sliders" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">Advanced Optical Parameters</div>
                          <div className="text-[11px] opacity-60">ぼかし量、角丸、透過率、ガラス揺らぎスライダー</div>
                        </div>
                      </div>
                      <Icon name="ChevronRight" size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </button>
                  </div>
                </>
              ) : personalSubView === 'uistyle' ? (
                /* ---------------- UI STYLE WITH VISUAL DIAGRAMS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('UI Style Presets (イメージ図付きプレビュー)', () => setPersonalSubView('main'))}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SHELL_MODES.map((sm) => {
                      const selected = shellMode === sm.id;
                      return (
                        <button
                          key={sm.id}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setShellMode(sm.id);
                            if (sm.id === 'mac') setUiStyle('macos');
                            else if (sm.id === 'dex') setUiStyle('one-ui');
                            else if (sm.id === 'chromeos') setUiStyle('material3');
                            else setUiStyle('glassium');
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between h-36 ${
                            selected ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]/30 bg-[var(--os-accent)]/10' : 'border-slate-200/60 dark:border-white/[0.08] hover:border-slate-400'
                          }`}
                        >
                          {/* Visual Diagram Box Header */}
                          <div className={`w-full h-14 rounded-xl border p-2 flex flex-col justify-between overflow-hidden relative ${sm.preview}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-rose-500/80" />
                                <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                                <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                              </div>
                              <span className="text-[9px] font-mono opacity-60 text-white">[{sm.id}]</span>
                            </div>
                            {/* Diagram Taskbar Mockup Line */}
                            <div className="w-full h-2 rounded-md bg-white/20 flex items-center justify-center gap-1 px-2">
                              <div className="w-2 h-1 rounded bg-white/60" />
                              <div className="w-2 h-1 rounded bg-white/60" />
                              <div className="w-2 h-1 rounded bg-white/60" />
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold">{sm.label}</div>
                              <div className="text-[10px] opacity-60 line-clamp-1">{sm.desc}</div>
                            </div>
                            {selected && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)] shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : personalSubView === 'surface' ? (
                /* ---------------- SURFACE MATERIAL ENGINE ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Surface Material Engine (質感エンジン)', () => setPersonalSubView('main'))}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {DESIGN_ENGINES.map((de) => {
                      const selected = designEngine === de.id;
                      return (
                        <button
                          key={de.id}
                          type="button"
                          onClick={() => { playSound('click'); setDesignEngine(de.id); }}
                          className={`p-4 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between h-32 bg-gradient-to-br ${de.bg} ${
                            selected ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]/30' : 'border-slate-200/60 dark:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white shadow-xs">{de.label}</span>
                            {selected && <Icon name="CheckCircle2" size={18} className="text-[var(--os-accent)]" />}
                          </div>
                          <p className="text-[11px] text-white/80 leading-snug">{de.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : personalSubView === 'accent' ? (
                /* ---------------- ACCENT COLOR ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('Accent Color (アクセントカラー)', () => setPersonalSubView('main'))}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ACCENT_COLOR_PRESETS.map((p) => {
                      const selected = accentColor === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { playSound('click'); setAccentColor(p.id); }}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                            selected ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]/30 font-bold' : 'border-slate-200/60 dark:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full shrink-0 shadow-md" style={{ backgroundColor: p.hex }} />
                            <span className="text-xs">{p.labelJa}</span>
                          </div>
                          {selected && <Icon name="CheckCircle2" size={16} className="text-[var(--os-accent)]" />}
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
                    <CustomSlider min={4} max={60} value={blurAmount} onChange={setBlurAmount} label="すりガラスのぼかし量 (Blur Amount)" valueText={`${blurAmount}px`} />
                    <CustomSlider min={0} max={36} value={cornerRadius} onChange={setCornerRadius} label="ウィンドウ角丸 (Corner Radius)" valueText={`${cornerRadius}px`} />
                    <CustomSlider min={10} max={95} value={transparency} onChange={setTransparency} label="透過率 (Transparency)" valueText={`${transparency}%`} />
                    <CustomSlider min={0} max={100} value={glassWobble} onChange={setGlassWobble} label="液体揺らぎ (Glass Wobble)" valueText={`${glassWobble}%`} />
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
                <h1 className="text-xl font-bold">Installed Apps</h1>
                <p className="text-xs opacity-60">インストール済みシステムアプリおよびストアアプリの一覧と起動</p>
              </div>

              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="アプリを検索..."
                className={`w-full p-2.5 text-xs rounded-xl border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
              />

              <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                {installedApps
                  .filter((a) => !appSearch || a.name.toLowerCase().includes(appSearch.toLowerCase()))
                  .map((app) => (
                    <div key={app.id} className="flex items-center justify-between py-3.5 px-3">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
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
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold shadow hover:brightness-110"
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
                    <h1 className="text-xl font-bold">Accounts</h1>
                    <p className="text-xs opacity-60">ユーザープロファイル、セキュリティPIN、権限ロールの設定</p>
                  </div>

                  {/* Clean Hairline Divided Row List */}
                  <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => { playSound('click'); setAccountsSubView('profile'); }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${isLight ? 'hover:bg-slate-200/40' : 'hover:bg-white/[0.04]'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="User" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">ユーザープロファイル ＆ アバター写真</div>
                          <div className="text-[11px] opacity-60">表示名、ユーザーアバターアイコン、権限グループ</div>
                        </div>
                      </div>
                      <Icon name="ChevronRight" size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { playSound('click'); setAccountsSubView('security'); }}
                      className={`w-full flex items-center justify-between py-3.5 px-3 transition text-left group ${isLight ? 'hover:bg-slate-200/40' : 'hover:bg-white/[0.04]'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                          <Icon name="Key" size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold group-hover:text-[var(--os-accent)] transition-colors">サインインオプション ＆ PINセキュリティ</div>
                          <div className="text-[11px] opacity-60">パスワード変更、セキュリティPINコード、暗号化</div>
                        </div>
                      </div>
                      <Icon name="ChevronRight" size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </button>
                  </div>
                </>
              ) : accountsSubView === 'profile' ? (
                /* ---------------- USER PROFILE & AVATARS ---------------- */
                <div className="space-y-6">
                  {renderBreadcrumbHeader('ユーザープロファイル ＆ アバター設定', () => setAccountsSubView('main'))}

                  <form onSubmit={handleSaveAccount} className="space-y-5">
                    {/* Avatar Selector */}
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
                              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                                selected ? 'border-[var(--os-accent)] bg-[var(--os-accent)]/15 text-[var(--os-accent)] font-bold' : 'border-slate-200/60 dark:border-white/[0.08]'
                              }`}
                              title={av.name}
                            >
                              <Icon name={av.icon} size={20} />
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <span className="text-xs opacity-60">カスタム顔写真をアップロード</span>
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--os-accent)] text-black text-xs font-bold"
                        >
                          写真を選択
                        </button>
                        <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleCustomAvatarUpload} className="hidden" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1">表示名 (User Name)</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className={`w-full p-2.5 text-xs rounded-xl border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">メールアドレス (Email)</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className={`w-full p-2.5 text-xs rounded-xl border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">アカウント権限グループ (Role)</label>
                      <select
                        value={profileRole}
                        onChange={(e) => setProfileRole(e.target.value as 'Administrator' | 'Developer' | 'Guest')}
                        className={`w-full text-xs p-2.5 rounded-xl border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                      >
                        <option value="Administrator">Administrator (管理者権限)</option>
                        <option value="Developer">Developer (開発者アカウント)</option>
                        <option value="Guest">Guest (ゲストアカウント)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button type="submit" className="px-4 py-2 bg-[var(--os-accent)] text-black text-xs font-bold rounded-xl shadow hover:brightness-110">
                        設定を保存
                      </button>
                      {accountSaved && <span className="text-xs text-emerald-400 font-bold">プロファイル情報を更新しました！</span>}
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
                        className={`w-full p-2.5 text-xs rounded-xl border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">4桁セキュリティPINコード</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={securityPin}
                        onChange={(e) => setSecurityPin(e.target.value)}
                        className={`w-full p-2.5 text-xs font-mono rounded-xl border outline-none ${isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-white/10'}`}
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          playSound('notify');
                          addNotification({ title: 'Security', message: 'セキュリティPINコードを適用しました。' });
                        }}
                        className="px-4 py-2 bg-[var(--os-accent)] text-black text-xs font-bold rounded-xl shadow"
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
