import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { soundService } from './soundService';
import { requestAIChat } from './aiClient';
import {
  LiquidGlassClock,
  ClockFontId,
  CLOCK_FONT_OPTIONS,
} from './LiquidGlassClock';
import { LiquidGlassMusicWidget } from './LiquidGlassMusicWidget';
import { AvatarRenderer } from './avatarIcons';
import {
  getMusicState,
  subscribeMusicState,
  setMusicVolume,
  MusicPlayerState,
} from './musicBridge';

export { CLOCK_FONT_OPTIONS };
export type { ClockFontId };

export interface LockScreenCustomInfo {
  city: string;
  condition: string;
  tempC: number;
  highC: number;
  lowC: number;
  rainChance: number;
  customHeadline: string;
  customSubNote: string;
  depthScene: 'alpine' | 'aurora' | 'cyber-arch' | 'golden-dusk';
  depthEffectEnabled: boolean;
}

const DEFAULT_CUSTOM_INFO: LockScreenCustomInfo = {
  city: 'Tokyo · Shibuya',
  condition: '晴れ時々オーロラ微風',
  tempC: 21,
  highC: 24,
  lowC: 15,
  rainChance: 10,
  customHeadline: '今日の目標: クリエイティブ集中 & 音楽制作',
  customSubNote: '16:00 クラウドサーバー同期 / 19:00 フレンドとマルチプレイ',
  depthScene: 'alpine',
  depthEffectEnabled: true,
};

interface LockNotification {
  id: string;
  app: string;
  title: string;
  body: string;
  time: string;
  accent: string;
}

export interface LockScreenProps {
  locked?: boolean;
  onUnlock: () => void;
  expectedPassword?: string;
  userName?: string;
  userAvatar?: string;
  clockStyle?: string;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  locked = true,
  onUnlock,
  expectedPassword,
  userName = 'Glassium User',
  userAvatar,
}) => {
  const [passwordMode, setPasswordMode] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [passError, setPassError] = useState(false);

  // Slide-up gesture & Bing Daily Nature Wallpaper state
  const [slideOffsetY, setSlideOffsetY] = useState(0);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [bingImages, setBingImages] = useState<
    Array<{ url: string; title: string; copyright: string; startdate?: string }>
  >([
    {
      url: '/api/bing-image?idx=0',
      title: 'Bing 日替わり自然壁紙',
      copyright: '© Microsoft Bing Daily Wallpaper',
    },
  ]);
  const [bingIndex, setBingIndex] = useState(0);
  const [useBingWallpaper, setUseBingWallpaper] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/bing-wallpaper')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.images) && data.images.length > 0) {
          setBingImages(data.images);
        } else if (data.url) {
          setBingImages([
            {
              url: data.url,
              title: data.title || 'Bing 日替わり自然壁紙',
              copyright: data.copyright || '© Microsoft Bing',
            },
          ]);
        }
      })
      .catch(() => {
        // Keep default proxied Bing nature image
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Top-Left Customizable Weather & Personal Info
  const [customInfo, setCustomInfo] = useState<LockScreenCustomInfo>(() => {
    try {
      const raw = localStorage.getItem('glassium_lock_custom_info');
      if (raw) return { ...DEFAULT_CUSTOM_INFO, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_CUSTOM_INFO;
  });

  // Sync Lock Screen weather with server-backed 5-minute /api/weather endpoint
  useEffect(() => {
    let active = true;
    const syncLockWeather = () => {
      fetch('/api/weather?lat=35.6762&lon=139.6503&name=%E6%9D%B1%E4%BA%AC')
        .then((r) => (r.ok ? r.json() : null))
        .then((w) => {
          if (!active || !w || typeof w.temp !== 'number') return;
          setCustomInfo((prev) => ({
            ...prev,
            tempC: Math.round(w.temp),
            condition: w.condition || prev.condition,
            highC: typeof w.high === 'number' ? w.high : prev.highC,
            lowC: typeof w.low === 'number' ? w.low : prev.lowC,
            rainChance: w.daily?.[0]?.precipProb ?? prev.rainChance,
          }));
        })
        .catch(() => {});
    };
    syncLockWeather();
    const interval = setInterval(syncLockWeather, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);
  const [isEditingTopLeft, setIsEditingTopLeft] = useState(false);

  // Bottom-Left Volume & Audio Quick Control
  const [musicState, setMusicState] = useState<MusicPlayerState | null>(() => getMusicState());
  const [systemVolume, setSystemVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem('glassium_system_volume'));
    return Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : 75;
  });
  const [isMuted, setIsMuted] = useState(false);

  // Right-Side Notifications + Pure Chat-Only AI
  const [rightTab, setRightTab] = useState<'both' | 'notifications' | 'ai'>('both');
  const [notifications, setNotifications] = useState<LockNotification[]>([
    {
      id: 'n-1',
      app: 'Glassium System',
      title: '上にスライドしてロック解除',
      body: expectedPassword
        ? '画面を上にスライドすると背景がボケてパスワード入力欄が表示されます'
        : 'パスワード未設定のため、上にスライドするとそのままデスクトップへ移動します',
      time: '今',
      accent: 'from-cyan-400 to-sky-500',
    },
    {
      id: 'n-2',
      app: 'Bing Daily Nature',
      title: 'Bing 日替わり自然壁紙が有効',
      body: '世界中の美しい自然風景が毎日自動でロック画面の背景に切り替わります',
      time: '今',
      accent: 'from-emerald-400 to-teal-500',
    },
  ]);

  const [aiMessages, setAiMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; text: string }>
  >([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'こんにちは！ロック画面のAIチャットです。質問や雑談・アイデア出しなど何でも話しかけてください。',
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Subscribe to global music player state
  useEffect(() => {
    return subscribeMusicState((st) => {
      setMusicState(st);
      if (st && typeof st.volume === 'number') {
        setSystemVolume(Math.round(st.volume * 100));
      }
    });
  }, []);

  const handleSaveCustomInfo = (next: LockScreenCustomInfo) => {
    setCustomInfo(next);
    localStorage.setItem('glassium_lock_custom_info', JSON.stringify(next));
  };

  const handleVolumeChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setSystemVolume(clamped);
    setIsMuted(clamped === 0);
    localStorage.setItem('glassium_system_volume', String(clamped));
    setMusicVolume(clamped / 100);
  };

  const toggleMute = () => {
    if (isMuted) {
      const restored = systemVolume === 0 ? 65 : systemVolume;
      setIsMuted(false);
      setSystemVolume(restored);
      setMusicVolume(restored / 100);
    } else {
      setIsMuted(true);
      setMusicVolume(0);
    }
    soundService.playClick();
  };

  const handleSendChatOnlyAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = aiInput.trim();
    if (!trimmed || isAiLoading) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, text: trimmed };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const historyPayload = [...aiMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.text,
      }));
      const res = await requestAIChat(historyPayload);
      setAiMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: res.reply || '応答を受信しました。' },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: '通信エラーが発生しました。もう一度お試しください。',
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Triggered when the user slides up or clicks unlock
  const triggerSlideUpAction = () => {
    if (!expectedPassword) {
      // No password configured -> go straight to desktop!
      setPassError(false);
      soundService.playOpen();
      onUnlock();
    } else {
      // Password configured -> blur background and reveal password input field!
      setPasswordMode(true);
      soundService.playClick();
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expectedPassword && pinInput !== expectedPassword) {
      setPassError(true);
      soundService.playNotify();
      return;
    }
    setPassError(false);
    soundService.playOpen();
    onUnlock();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, form, a, textarea')) return;
    setDragStartY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY === null) return;
    const deltaY = dragStartY - e.clientY; // positive when dragging UP
    if (deltaY > 0) {
      setSlideOffsetY(Math.min(deltaY, 220));
    } else {
      setSlideOffsetY(0);
    }
  };

  const handlePointerUp = () => {
    if (dragStartY === null) return;
    if (slideOffsetY > 55) {
      triggerSlideUpAction();
    }
    setDragStartY(null);
    setSlideOffsetY(0);
  };

  // Scene background gradients & foreground depth SVG paths
  const sceneTheme = {
    alpine: {
      bg: 'radial-gradient(circle at 22% 72%, rgba(56, 189, 248, 0.42) 0%, rgba(30, 58, 138, 0.55) 42%, rgba(2, 6, 23, 0.96) 100%)',
      glow: 'rgba(56, 189, 248, 0.45)',
      ridgeColor1: 'rgba(15, 23, 42, 0.88)',
      ridgeColor2: 'rgba(30, 41, 59, 0.72)',
      ridgeStroke: 'rgba(125, 211, 252, 0.45)',
    },
    aurora: {
      bg: 'radial-gradient(circle at 20% 75%, rgba(52, 211, 153, 0.42) 0%, rgba(15, 118, 110, 0.48) 42%, rgba(2, 6, 23, 0.96) 100%)',
      glow: 'rgba(52, 211, 153, 0.45)',
      ridgeColor1: 'rgba(6, 32, 28, 0.88)',
      ridgeColor2: 'rgba(17, 54, 48, 0.72)',
      ridgeStroke: 'rgba(110, 231, 183, 0.45)',
    },
    'cyber-arch': {
      bg: 'radial-gradient(circle at 24% 74%, rgba(217, 70, 239, 0.40) 0%, rgba(88, 28, 135, 0.50) 42%, rgba(4, 6, 22, 0.96) 100%)',
      glow: 'rgba(232, 121, 249, 0.45)',
      ridgeColor1: 'rgba(24, 10, 42, 0.88)',
      ridgeColor2: 'rgba(46, 16, 78, 0.72)',
      ridgeStroke: 'rgba(240, 171, 252, 0.45)',
    },
    'golden-dusk': {
      bg: 'radial-gradient(circle at 22% 76%, rgba(251, 191, 36, 0.42) 0%, rgba(154, 52, 18, 0.48) 44%, rgba(9, 9, 18, 0.96) 100%)',
      glow: 'rgba(251, 191, 36, 0.45)',
      ridgeColor1: 'rgba(28, 16, 8, 0.88)',
      ridgeColor2: 'rgba(54, 28, 12, 0.72)',
      ridgeStroke: 'rgba(253, 224, 71, 0.45)',
    },
  }[customInfo.depthScene];

  const isMediaPlaying = Boolean(musicState?.isPlaying && musicState?.currentTrack);
  const activeBing = bingImages[bingIndex % bingImages.length] || bingImages[0];
  const blurAmountPx = passwordMode ? 24 : Math.min(20, Math.round(slideOffsetY / 8));

  // If OS is not locked, do not render lock screen
  if (!locked) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="glassium-lock-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.02, filter: 'blur(16px)' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="fixed inset-0 z-[100] select-none overflow-hidden text-white"
        style={{ background: sceneTheme.bg }}
      >
        {/* =====================================================================
            LAYER 0: BING DAILY NATURE WALLPAPER + DYNAMIC SLIDE-UP BLUR
        ===================================================================== */}
        <div
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden transition-all duration-300"
          style={{
            filter: blurAmountPx > 0 ? `blur(${blurAmountPx}px) brightness(0.68)` : 'none',
            transform: passwordMode || slideOffsetY > 10 ? 'scale(1.06)' : 'scale(1)',
          }}
        >
          {useBingWallpaper && activeBing?.url && (
            <img
              src={activeBing.url}
              alt={activeBing.title}
              className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-slate-950/45" />

          <div
            className="absolute -bottom-16 -left-12 w-[520px] h-[420px] rounded-full blur-[70px] opacity-60"
            style={{ background: sceneTheme.glow }}
          />
          <div className="absolute bottom-24 left-44 w-72 h-72 rounded-full bg-gradient-to-tr from-cyan-400/30 via-fuchsia-400/25 to-amber-300/30 blur-[55px]" />

          {/* Distant Background Mountain Layer */}
          <svg
            viewBox="0 0 1440 500"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 w-full h-[360px] opacity-40"
          >
            <path
              d="M0,500 L0,250 L180,120 L370,235 L590,95 L820,260 L1080,140 L1290,240 L1440,170 L1440,500 Z"
              fill="rgba(15, 23, 42, 0.55)"
            />
          </svg>
        </div>

        {/* =====================================================================
            CENTERED PASSWORD OVERLAY WHEN SLID UP (IF PASSWORD IS SET)
        ===================================================================== */}
        <AnimatePresence>
          {passwordMode && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/35 backdrop-blur-md"
            >
              <form
                onSubmit={handlePasswordSubmit}
                className="w-full max-w-sm p-6 rounded-3xl bg-white/[0.12] backdrop-blur-3xl border border-white/25 shadow-[0_24px_80px_rgba(0,0,0,0.65)] flex flex-col items-center gap-4 text-center"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-300/60 shadow-xl">
                  <AvatarRenderer avatar={userAvatar} size={64} />
                </div>
                <div>
                  <div className="text-base font-black text-white">{userName}</div>
                  <div className="text-[11px] text-cyan-200 mt-0.5">
                    パスワードを入力してロック解除
                  </div>
                </div>

                <div
                  className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black/55 border ${
                    passError ? 'border-rose-400 ring-2 ring-rose-500/40' : 'border-white/25 focus-within:border-cyan-300'
                  }`}
                >
                  <Icon name="Lock" size={14} className="text-cyan-300 shrink-0" />
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPassError(false);
                    }}
                    placeholder="パスワードを入力..."
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/45"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition cursor-pointer"
                  >
                    解除
                  </button>
                </div>

                {passError && (
                  <div className="text-xs text-rose-300 font-bold">
                    パスワードが正しくありません。もう一度お試しください。
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode(false);
                    setPassError(false);
                  }}
                  className="text-xs text-white/65 hover:text-white mt-1 cursor-pointer"
                >
                  キャンセルしてロック画面に戻る
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================================
            BOTTOM-CENTER SLIDE-UP HANDLE & BING WALLPAPER CAPTION
        ===================================================================== */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={triggerSlideUpAction}
            className="group px-5 py-2 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-2xl border border-white/20 shadow-xl flex flex-col items-center gap-1 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-200 group-hover:-translate-y-0.5 transition-transform">
              <Icon name="ChevronUp" size={14} />
              <span>
                {expectedPassword
                  ? '上にスライドしてパスワード入力'
                  : '上にスライドしてデスクトップへ進む'}
              </span>
            </div>
            <div className="w-12 h-1 rounded-full bg-white/40 group-hover:bg-cyan-300 transition-colors" />
          </button>

          {useBingWallpaper && activeBing && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-[10px] text-white/75 max-w-[90vw]">
              <Icon name="Globe" size={11} className="text-cyan-300 shrink-0" />
              <span className="truncate max-w-[260px] sm:max-w-[380px]">
                Bing 日替わり自然壁紙: {activeBing.title}
              </span>
              {bingImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setBingIndex((prev) => (prev + 1) % bingImages.length)}
                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-cyan-200 font-bold shrink-0 cursor-pointer"
                  title="別の日のBing自然壁紙に切替"
                >
                  切替
                </button>
              )}
            </div>
          )}
        </div>

        {/* =====================================================================
            TOP-LEFT (左上): GENUINE SYSTEM STATUS & WEATHER FORECAST + CUSTOM INFO
        ===================================================================== */}
        <div
          className="absolute top-6 left-6 z-30 flex flex-col gap-3 max-w-md w-[calc(100vw-3rem)] sm:w-[390px] transition-transform duration-200"
          style={{ transform: slideOffsetY > 0 ? `translateY(-${Math.round(slideOffsetY * 0.45)}px)` : undefined }}
        >
          {/* Authentic Glassium Unlock Bar */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-black/45 backdrop-blur-2xl border border-white/15 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/25 shadow-md">
                <AvatarRenderer avatar={userAvatar} size={32} />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                  <span className="ios27-liquid-circle-dot scale-75" />
                  <span>GlassiumOS 5 u4 · BING DAILY LOCK</span>
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[150px]">
                  {userName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setUseBingWallpaper(!useBingWallpaper)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-[11px] font-bold cursor-pointer"
                title="Bing自然壁紙 / テーマ背景切替"
              >
                {useBingWallpaper ? '🏞️ Bing自然' : '🌌 オーロラ'}
              </button>
              <button
                type="button"
                onClick={triggerSlideUpAction}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="Unlock" size={13} />
                <span>ロック解除</span>
              </button>
            </div>
          </div>

          {/* Customizable Weather Forecast & Personal Info Card */}
          <div className="p-4 rounded-3xl bg-white/[0.08] backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.45)] space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400/30 to-amber-300/30 border border-white/25 flex items-center justify-center text-amber-200 shadow-inner">
                  <Icon name="Sun" size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-200">{customInfo.city}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/80">
                      降水 {customInfo.rainChance}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black tracking-tight">{customInfo.tempC}°C</span>
                    <span className="text-xs text-white/80 font-medium">{customInfo.condition}</span>
                  </div>
                  <div className="text-[10px] text-white/60">
                    最高 {customInfo.highC}°C / 最低 {customInfo.lowC}°C
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingTopLeft(!isEditingTopLeft)}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-bold text-white/85 flex items-center gap-1 cursor-pointer"
              >
                <Icon name="Settings" size={12} />
                <span>{isEditingTopLeft ? '完了' : '情報設定'}</span>
              </button>
            </div>

            {/* User's Custom Configured Info / Memo / Schedule */}
            <div className="pt-2.5 border-t border-white/15 space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="ios27-liquid-circle-dot inline-block scale-75" />
                <span>{customInfo.customHeadline}</span>
              </div>
              <div className="text-[11px] text-white/70 pl-3.5">{customInfo.customSubNote}</div>
            </div>

            {/* Inline Editor for Top-Left Weather & User Info */}
            <AnimatePresence>
              {isEditingTopLeft && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-3 border-t border-white/15 space-y-2.5 text-xs overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-white/60 mb-0.5">地域・都市</label>
                      <input
                        type="text"
                        value={customInfo.city}
                        onChange={(e) =>
                          handleSaveCustomInfo({ ...customInfo, city: e.target.value })
                        }
                        className="w-full px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/60 mb-0.5">天気ステータス</label>
                      <input
                        type="text"
                        value={customInfo.condition}
                        onChange={(e) =>
                          handleSaveCustomInfo({ ...customInfo, condition: e.target.value })
                        }
                        className="w-full px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-white/60 mb-0.5">現在気温(°C)</label>
                      <input
                        type="number"
                        value={customInfo.tempC}
                        onChange={(e) =>
                          handleSaveCustomInfo({
                            ...customInfo,
                            tempC: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/60 mb-0.5">降水確率(%)</label>
                      <input
                        type="number"
                        value={customInfo.rainChance}
                        onChange={(e) =>
                          handleSaveCustomInfo({
                            ...customInfo,
                            rainChance: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/60 mb-0.5">深度背景テーマ</label>
                      <select
                        value={customInfo.depthScene}
                        onChange={(e) =>
                          handleSaveCustomInfo({
                            ...customInfo,
                            depthScene: e.target.value as LockScreenCustomInfo['depthScene'],
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg bg-black/60 border border-white/15 text-white text-xs outline-none"
                      >
                        <option value="alpine">Alpine Ridge</option>
                        <option value="aurora">Aurora Crest</option>
                        <option value="cyber-arch">Cyber Arch</option>
                        <option value="golden-dusk">Golden Dusk</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 mb-0.5">
                      マイヘッドライン（目標・予定など）
                    </label>
                    <input
                      type="text"
                      value={customInfo.customHeadline}
                      onChange={(e) =>
                        handleSaveCustomInfo({ ...customInfo, customHeadline: e.target.value })
                      }
                      className="w-full px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 text-white text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 mb-0.5">サブメモ</label>
                    <input
                      type="text"
                      value={customInfo.customSubNote}
                      onChange={(e) =>
                        handleSaveCustomInfo({ ...customInfo, customSubNote: e.target.value })
                      }
                      className="w-full px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 text-white text-xs outline-none"
                    />
                  </div>

                  <label className="flex items-center justify-between pt-1 cursor-pointer">
                    <span className="text-[11px] text-cyan-200 font-bold">
                      🏔️ 深度効果（文字の一部が前景シルエットの後ろに隠れる）
                    </span>
                    <input
                      type="checkbox"
                      checked={customInfo.depthEffectEnabled}
                      onChange={(e) =>
                        handleSaveCustomInfo({
                          ...customInfo,
                          depthEffectEnabled: e.target.checked,
                        })
                      }
                      className="accent-cyan-400"
                    />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* =====================================================================
            BOTTOM-LEFT (左下):
            1) MODULAR LIQUID GLASS CLOCK (Loaded from src/os/LiquidGlassClock.tsx)
            2) VOLUME SLIDER & QUICK AUDIO CONTROLS
        ===================================================================== */}
        <div className="absolute bottom-6 left-6 z-10 flex flex-col items-start max-w-[92vw]">
          {/* Dedicated LiquidGlassClock Component */}
          <LiquidGlassClock
            depthEffectEnabled={customInfo.depthEffectEnabled}
            ridgeColor1={sceneTheme.ridgeColor1}
            ridgeColor2={sceneTheme.ridgeColor2}
            ridgeStroke={sceneTheme.ridgeStroke}
            showFontSelector={true}
          />

          {/* BOTTOM-LEFT VOLUME & QUICK AUDIO CONTROL BAR */}
          <div className="relative z-30 mt-2 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/45 backdrop-blur-2xl border border-white/20 shadow-xl w-full sm:w-[360px]">
            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-cyan-200 transition shrink-0 cursor-pointer"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              <Icon
                name={isMuted || systemVolume === 0 ? 'VolumeX' : systemVolume < 50 ? 'Volume1' : 'Volume2'}
                size={16}
              />
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white/85">システム音量</span>
                <span className="font-mono font-bold text-cyan-300">
                  {isMuted ? 'MUTE (0%)' : `${systemVolume}%`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : systemVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleVolumeChange(Math.max(0, systemVolume - 10))}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer"
                title="音量を10%下げる"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleVolumeChange(Math.min(100, systemVolume + 10))}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer"
                title="音量を10%上げる"
              >
                +10
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            BOTTOM-CENTER (一番下の中央):
            MEDIA PLAYER — SHOWN ONLY WHEN MEDIA IS ACTIVELY PLAYING!
        ===================================================================== */}
        <AnimatePresence>
          {isMediaPlaying && (
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.95 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
            >
              <LiquidGlassMusicWidget />
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================================
            RIGHT SIDE (右側):
            NOTIFICATIONS + PURE CHAT-ONLY AI (WITH ZERO OS OPERATIONS)
        ===================================================================== */}
        <div className="absolute top-6 right-6 bottom-6 z-30 hidden lg:flex flex-col gap-3 w-[380px]">
          {/* Mode Switcher Header */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-black/45 backdrop-blur-2xl border border-white/15">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'both', label: '通知 & AIチャット' },
                  { id: 'notifications', label: `通知 (${notifications.length})` },
                  { id: 'ai', label: '💬 純粋AIチャット' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRightTab(t.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    rightTab === t.id
                      ? 'bg-white text-slate-950 shadow'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {notifications.length > 0 && rightTab !== 'ai' && (
              <button
                type="button"
                onClick={() => setNotifications([])}
                className="text-[10px] text-white/60 hover:text-white cursor-pointer"
              >
                クリア
              </button>
            )}
          </div>

          {/* Notifications Stack */}
          {(rightTab === 'both' || rightTab === 'notifications') && (
            <div
              className={`flex flex-col gap-2 overflow-y-auto pr-1 ${
                rightTab === 'both' ? 'max-h-[42%]' : 'flex-1'
              }`}
            >
              {notifications.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-2xl border border-white/15 text-xs text-white/60 text-center">
                  新しい通知はありません
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/15 shadow-lg space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-white/65">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-200">
                        <span className="ios27-liquid-circle-dot scale-75" />
                        <span>{item.app}</span>
                      </div>
                      <span>{item.time}</span>
                    </div>
                    <div className="text-xs font-bold text-white">{item.title}</div>
                    <div className="text-[11px] text-white/75 leading-relaxed">{item.body}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pure Chat-Only AI Panel (Zero OS Control Actions) */}
          {(rightTab === 'both' || rightTab === 'ai') && (
            <div className="flex-1 min-h-0 flex flex-col rounded-3xl bg-white/[0.08] backdrop-blur-3xl border border-white/20 shadow-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-black/35 border-b border-white/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="ios27-liquid-circle-dot" />
                  <div>
                    <div className="text-xs font-black text-white">Glassium Pure Chat AI</div>
                    <div className="text-[10px] text-cyan-200/80">
                      会話専用モード（OS操作・設定変更なし）
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-white/80">
                  CHAT ONLY
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
                {aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-black/50 border border-white/15 text-white/90'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="text-[11px] text-cyan-200 font-mono animate-pulse">
                    AIが返信を作成中...
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSendChatOnlyAi}
                className="p-2.5 bg-black/45 border-t border-white/15 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="AIとチャット（質問・雑談・相談）..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white outline-none focus:border-cyan-300"
                />
                <button
                  type="submit"
                  disabled={isAiLoading}
                  className="px-3 py-1.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer"
                >
                  送信
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
