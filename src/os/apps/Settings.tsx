import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS, Wallpaper } from '../OSContext';
import {
  AppId,
  UI_STYLES,
  SleepClockStyle,
  SleepBackground,
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

// Only active, fully-implemented settings categories
const SIDEBAR_NAV: NavItem[] = [
  { id: 'system', label: 'System', icon: 'Monitor' },
  { id: 'personalization', label: 'Personalization', icon: 'Palette' },
  { id: 'apps', label: 'Apps', icon: 'LayoutGrid' },
  { id: 'accounts', label: 'Accounts', icon: 'User' },
  { id: 'update', label: 'Windows Update', icon: 'RefreshCw' },
];

interface SystemCard {
  id: SystemSubView;
  title: string;
  desc: string;
  icon: string;
}

// Only active, fully-implemented System setting cards
const SYSTEM_CARDS: SystemCard[] = [
  { id: 'display', title: 'Display', desc: 'Monitors, brightness, night light, display profile, wallpapers & aurora', icon: 'Monitor' },
  { id: 'sound', title: 'Sound', desc: 'Volume levels, output, input, system sound effects', icon: 'Volume2' },
  { id: 'power', title: 'Power & battery', desc: 'Screen lock and sleep, clock style, sleep backgrounds', icon: 'BatteryCharging' },
  { id: 'multitasking', title: 'Multitasking', desc: 'Snap windows, virtual desktops, taskbar layout', icon: 'Layers' },
  { id: 'aicomponents', title: 'AI components', desc: 'Manage Google Gemini API Key and AI assistant models', icon: 'Sparkles' },
  { id: 'about', title: 'About', desc: 'Device specifications, GlassiumOS build, system specs', icon: 'Info' },
];

export function SettingsApp() {
  const {
    wallpaper,
    setWallpaper,
    theme,
    setTheme,
    uiStyle,
    setUiStyle,
    sleepClockStyle,
    setSleepClockStyle,
    sleepBackground,
    setSleepBackground,
    blurAmount,
    setBlurAmount,
    cornerRadius,
    setCornerRadius,
    transparency,
    setTransparency,
    glassWobble,
    setGlassWobble,
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
  } = useOS();

  const isLight = theme === 'light';
  const [activeCategory, setActiveCategory] = useState<NavCategory>('system');
  const [systemSubView, setSystemSubView] = useState<SystemSubView>('main');

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

  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem('gemini_api_key', geminiApiKey);
      localStorage.setItem('glassium_ai_key', geminiApiKey);
    }
  }, [geminiApiKey]);

  const handleSaveApiKey = () => {
    playSound('click');
    localStorage.setItem('gemini_api_key', geminiApiKey.trim());
    localStorage.setItem('glassium_ai_key', geminiApiKey.trim());
    addNotification('AI 設定', 'Gemini APIキーを正常に保存しました。');
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
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
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
          LEFT SIDEBAR (Active Functional Nav Items)
         ============================================================== */}
      <div
        className={`w-full sm:w-64 p-3 flex sm:flex-col justify-between shrink-0 border-r transition-colors duration-200 ${
          isLight ? 'bg-slate-200/50 border-slate-300/60' : 'bg-[#252528]/80 border-white/[0.08]'
        }`}
      >
        <div className="w-full flex-1 overflow-y-auto scrollbar-none">
          {/* User Account Header */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-white/10 flex items-center justify-center shrink-0 text-slate-700 dark:text-white/80 shadow-inner">
              <Icon name="User" size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{user?.name || 'Administrator'}</div>
              <div className="text-[11px] opacity-60 truncate">Local Account</div>
            </div>
          </div>

          {/* Search Box inside Sidebar */}
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
                        ? 'bg-white font-semibold text-sky-600 shadow-sm'
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
          RIGHT MAIN PANE
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

                  {/* Functional System Cards Stack */}
                  <div className="space-y-1.5">
                    {SYSTEM_CARDS.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setSystemSubView(card.id);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-lg text-left transition ${
                          isLight
                            ? 'bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs'
                            : 'bg-[#252528] hover:bg-[#2c2c30] border border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                            card.id === 'aicomponents' ? 'bg-sky-500/15 text-sky-400' : isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-white/80'
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

                  <div className="space-y-5">
                    <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                          <Icon name="Sparkles" size={18} />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold">Google Gemini API Settings</h2>
                          <p className="text-xs opacity-60">AI Assistant, Glassium Studio, and System Assistant AI model parameters</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">Gemini API Key</label>
                          <div className="flex gap-2">
                            <div className={`flex-1 flex items-center px-3 py-1.5 rounded-lg border ${
                              isLight ? 'bg-slate-50 border-slate-300' : 'bg-black/40 border-white/10'
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
                            設定されたAPIキーは `localStorage` に安全に保存され、すべてのAIコンポーネントで優先的に利用されます。
                          </p>
                        </div>

                        {/* Connection Test */}
                        <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
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
                              aiTestStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              aiTestStatus === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-sky-400'
                            }`}>
                              {aiTestMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Available AI Models */}
                    <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'}`}>
                      <h3 className="text-xs font-bold mb-2">搭載されているAIコンポーネント</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded bg-slate-100 dark:bg-white/5">
                          <span className="font-medium">Standard Text Model</span>
                          <span className="font-mono text-sky-400">gemini-3.8-flash</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-100 dark:bg-white/5">
                          <span className="font-medium">Lite Model Fallback</span>
                          <span className="font-mono text-sky-400">gemini-3.1-flash-lite</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-100 dark:bg-white/5">
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
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'}`}>
                      <h3 className="text-xs font-bold mb-3">壁紙とオーロラ背景 (Wallpapers & Live Aurora)</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {WALLPAPER_KEYS.map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => { playSound('click'); setWallpaper(k); }}
                            className={`p-2 rounded-lg text-xs text-center border transition ${
                              wallpaper === k ? 'border-sky-500 bg-sky-500/10 font-bold' : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/5'
                            }`}
                          >
                            {k}
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
                  <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'} space-y-4`}>
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
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-semibold">効果音 (Sound Effects)</span>
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
                  <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'} space-y-4`}>
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

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1">時計スタイル</label>
                        <select
                          value={sleepClockStyle}
                          onChange={(e) => setSleepClockStyle(e.target.value as SleepClockStyle)}
                          className={`w-full text-xs p-2 rounded border outline-none ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'}`}
                        >
                          <option value="depth">3D Depth Clock</option>
                          <option value="analog">Analog Clock</option>
                          <option value="minimal">Minimal</option>
                          <option value="vertical">Vertical</option>
                          <option value="cyber">Cyber HUD</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">スリープ背景</label>
                        <select
                          value={sleepBackground}
                          onChange={(e) => setSleepBackground(e.target.value as SleepBackground)}
                          className={`w-full text-xs p-2 rounded border outline-none ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'}`}
                        >
                          <option value="aurora">Live Aurora</option>
                          <option value="void">Void Space</option>
                          <option value="matrix">Matrix</option>
                          <option value="galaxy">Galaxy</option>
                          <option value="retro">Synthwave</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : systemSubView === 'multitasking' ? (
                /* ---------------- MULTITASKING SUB-PAGE ---------------- */
                <div>
                  {renderBreadcrumbHeader('Multitasking')}
                  <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'} space-y-4`}>
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

                    <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
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
                  <div className={`p-5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'} space-y-3`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                        OS
                      </div>
                      <div>
                        <h2 className="text-sm font-bold">GlassiumOS V4.0 (Windows 11 Glassium Edition)</h2>
                        <p className="text-xs opacity-60">Version 23H2 (OS Build 22631.3007)</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-white/10 text-xs space-y-1.5">
                      <p><strong>Device name:</strong> Glassium-PC</p>
                      <p><strong>Processor:</strong> Virtual Octa-Core Processor @ 3.40GHz</p>
                      <p><strong>Installed RAM:</strong> 16.0 GB (15.8 GB usable)</p>
                      <p><strong>System type:</strong> 64-bit operating system, x64-based processor</p>
                      <p><strong>AI Runtime:</strong> Google GenAI SDK (@google/genai)</p>
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
              className="max-w-4xl space-y-5"
            >
              <h1 className="text-xl font-bold">Personalization</h1>

              {/* Theme Mode & UI Style */}
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'} space-y-4`}>
                <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">Color Mode & UI Style</h2>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Color Mode</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold ${theme === 'dark' ? 'bg-sky-500 text-black' : 'bg-slate-200 dark:bg-white/10'}`}
                    >
                      Dark Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold ${theme === 'light' ? 'bg-sky-500 text-black' : 'bg-slate-200 dark:bg-white/10'}`}
                    >
                      Light Mode
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <h3 className="text-xs font-semibold mb-2">Authentic OS UI Styles</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {UI_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setUiStyle(st.id)}
                        className={`p-2.5 rounded-lg text-left text-xs border transition ${
                          uiStyle === st.id ? 'border-sky-500 bg-sky-500/10 font-bold' : 'border-transparent bg-slate-100 dark:bg-white/5'
                        }`}
                      >
                        <div>{st.name}</div>
                        <div className="text-[10px] opacity-60 font-normal">{st.badge}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glass Optical Settings */}
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'} space-y-4`}>
                <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">Advanced Optical Glass Parameters</h2>
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
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'}`}>
                <div className="mb-3">
                  <input
                    type="text"
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    placeholder="Search installed apps..."
                    className={`w-full p-2 text-xs rounded border outline-none ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'}`}
                  />
                </div>
                <div className="space-y-2">
                  {installedApps
                    .filter((a) => !appSearch || a.name.toLowerCase().includes(appSearch.toLowerCase()))
                    .map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-2.5 rounded bg-slate-100 dark:bg-white/5">
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
              <form onSubmit={handleSaveAccount} className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'} space-y-4`}>
                <div>
                  <label className="block text-xs font-semibold mb-1">ユーザー名 (User Name)</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className={`w-full p-2 text-xs rounded border outline-none ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">パスワード (Password)</label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Enter password"
                    className={`w-full p-2 text-xs rounded border outline-none ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'}`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button type="submit" className="px-4 py-1.5 bg-sky-500 text-black text-xs font-bold rounded-lg">
                    設定を保存
                  </button>
                  {accountSaved && <span className="text-xs text-emerald-400 font-medium">アカウント情報を保存しました！</span>}
                </div>
              </form>
            </motion.div>
          )}

          {/* ==================== 5. WINDOWS UPDATE PAGE ==================== */}
          {activeCategory === 'update' && (
            <motion.div
              key="cat-update"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl space-y-4"
            >
              <h1 className="text-xl font-bold">Windows Update</h1>
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#252528] border-white/10'} space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Icon name="CheckCircle2" size={24} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">You're up to date</h2>
                    <p className="text-xs opacity-60">Last checked: Today, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 text-xs space-y-1">
                  <p><strong>OS Version:</strong> Windows 11 Glassium Edition 23H2</p>
                  <p><strong>OS Build:</strong> 22631.3007</p>
                  <p><strong>AI Engine:</strong> @google/genai (Gemini 3.8 Flash)</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
