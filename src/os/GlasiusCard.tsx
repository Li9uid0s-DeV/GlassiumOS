import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icon';
import { requestAIChat, AIAction } from './aiClient';
import { useOS } from './OSContext';
import { AppId, ShellMode, WallpaperId, AuroraPaletteId } from './types';
import {
  CLOCK_FONT_OPTIONS,
  ClockFontId,
  LockScreenCustomInfo,
} from './LockScreen';
import {
  getMusicState,
  subscribeMusicState,
  setMusicVolume,
} from './musicBridge';

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

export function GlasiusCard({ onClose }: { onClose?: () => void }) {
  const {
    openApp,
    setShellMode,
    setTheme,
    setWallpaper,
    setAuroraColor,
    setVolume: setOSVolume,
    lockSystem,
    snapAllWindows5050,
    closeAllWindows,
  } = useOS();
  const [time, setTime] = useState(new Date());

  // Synced Clock Font
  const [clockFont, setClockFont] = useState<ClockFontId>(() => {
    const saved = localStorage.getItem('glassium_clock_font') as ClockFontId | null;
    return saved && CLOCK_FONT_OPTIONS.some((o) => o.id === saved)
      ? saved
      : 'clock-displacement-liquid';
  });
  const [showFontPicker, setShowFontPicker] = useState(false);

  // Synced Top-Left Weather & User Info
  const [customInfo, setCustomInfo] = useState<LockScreenCustomInfo>(() => {
    try {
      const raw = localStorage.getItem('glassium_lock_custom_info');
      if (raw) return { ...DEFAULT_CUSTOM_INFO, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_CUSTOM_INFO;
  });
  const [editingInfo, setEditingInfo] = useState(false);

  // Bottom-Left Volume Control
  const [volume, setVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem('glassium_system_volume'));
    return Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : 75;
  });
  const [muted, setMuted] = useState(false);

  // Right-Side Notifications + Desktop OS Control AI
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'dn-1',
      title: 'iOS 27 Liquid Glass & 深度効果有効',
      body: '左下の時計が背景を屈折透過し、前景シルエットの後ろに重なります',
      time: '今',
    },
    {
      id: 'dn-2',
      title: 'デスクトップ AI OS コントロール有効',
      body: '「映画を開いて」「ダークモードにして」「macOSにして」などOSを直接操作できます',
      time: '今',
    },
  ]);
  const [chatHistory, setChatHistory] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; text: string; actionLabel?: string }>
  >([
    {
      id: 'init',
      role: 'assistant',
      text: 'こんにちは！デスクトップAIコパイロットです。「映画を開いて」「音楽を開いて」「ダークモードにして」「macOSモードに切替」「音量を60にして」などOS操作を直接実行できます！',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const executeOSAction = useCallback(
    (action?: AIAction) => {
      if (!action || !action.type) return;
      const target = String(action.target ?? action.value ?? '');
      switch (action.type) {
        case 'open_app':
        case 'open':
          if (target) openApp(target as AppId);
          break;
        case 'set_shell':
        case 'shell':
          if (target) setShellMode(target as ShellMode);
          break;
        case 'set_theme':
        case 'theme':
          if (target === 'light' || target === 'dark') setTheme(target);
          break;
        case 'set_wallpaper':
        case 'wallpaper':
          if (target) setWallpaper(target as WallpaperId);
          break;
        case 'set_aurora':
          if (target) {
            setWallpaper('live2d');
            setAuroraColor(target as AuroraPaletteId);
          }
          break;
        case 'set_volume':
        case 'volume': {
          const num = Number(target);
          if (Number.isFinite(num)) {
            const clamped = Math.max(0, Math.min(100, num));
            setVolume(clamped);
            setOSVolume(clamped);
            setMusicVolume(clamped / 100);
          }
          break;
        }
        case 'lock_screen':
        case 'lock':
          lockSystem();
          break;
        case 'snap_windows':
          snapAllWindows5050();
          break;
        case 'close_all':
          closeAllWindows();
          break;
        default:
          break;
      }
    },
    [
      openApp,
      setShellMode,
      setTheme,
      setWallpaper,
      setAuroraColor,
      setOSVolume,
      lockSystem,
      snapAllWindows5050,
      closeAllWindows,
    ]
  );

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const onFontChange = (e: Event) => {
      const custom = e as CustomEvent<ClockFontId>;
      if (custom.detail) setClockFont(custom.detail);
    };
    window.addEventListener('glassium-clock-font-change', onFontChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener('glassium-clock-font-change', onFontChange);
    };
  }, []);

  useEffect(() => {
    const initial = getMusicState();
    if (initial && typeof initial.volume === 'number') {
      setVolume(Math.round(initial.volume * 100));
    }
    return subscribeMusicState((st) => {
      if (st && typeof st.volume === 'number') {
        setVolume(Math.round(st.volume * 100));
      }
    });
  }, []);

  const handleFontChange = (id: ClockFontId) => {
    setClockFont(id);
    localStorage.setItem('glassium_clock_font', id);
    window.dispatchEvent(new CustomEvent('glassium-clock-font-change', { detail: id }));
  };

  const handleSaveCustomInfo = (next: LockScreenCustomInfo) => {
    setCustomInfo(next);
    localStorage.setItem('glassium_lock_custom_info', JSON.stringify(next));
  };

  const handleVolumeSlider = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setVolume(clamped);
    setMuted(clamped === 0);
    setOSVolume(clamped);
    localStorage.setItem('glassium_system_volume', String(clamped));
    setMusicVolume(clamped / 100);
    window.dispatchEvent(
      new CustomEvent('glassium-music-command', {
        detail: { action: 'set-volume', volume: clamped / 100 },
      })
    );
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || isSending) return;
    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, text: trimmed };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsSending(true);
    try {
      const res = await requestAIChat(
        [...chatHistory, userMsg].map((m) => ({ role: m.role, content: m.text }))
      );
      const act = res.action || res.osAction;
      if (act) {
        executeOSAction(act);
      }
      setChatHistory((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.reply || '操作を実行しました。',
          actionLabel: act?.label,
        },
      ]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'サーバー通信エラーが発生しました。',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const hoursStr = time.getHours().toString().padStart(2, '0');
  const minutesStr = time.getMinutes().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <>
      {/* =================================================================
          1. TOP-LEFT (左上): CUSTOMIZABLE WEATHER FORECAST & USER INFO
      ================================================================= */}
      <div className="fixed top-4 left-28 sm:left-32 z-20 pointer-events-auto max-w-xs sm:max-w-sm">
        <div className="p-3.5 rounded-3xl bg-white/[0.08] backdrop-blur-3xl border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.45)] text-white space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400/30 to-amber-300/30 border border-white/25 flex items-center justify-center text-amber-200">
                <Icon name="Sun" size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-200">
                  <span>{customInfo.city}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/80">
                    降水 {customInfo.rainChance}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black">{customInfo.tempC}°C</span>
                  <span className="text-[11px] text-white/80">{customInfo.condition}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditingInfo(!editingInfo)}
                className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white/85"
                title="天気とマイ情報をカスタマイズ"
              >
                {editingInfo ? '完了' : '設定'}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/70 hover:text-white"
                  title="HUDを非表示"
                >
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="pt-1.5 border-t border-white/15 text-[11px]">
            <div className="font-bold text-white flex items-center gap-1.5 truncate">
              <span className="ios27-liquid-circle-dot scale-75" />
              <span className="truncate">{customInfo.customHeadline}</span>
            </div>
            <div className="text-[10px] text-white/65 pl-3.5 truncate">
              {customInfo.customSubNote}
            </div>
          </div>

          {editingInfo && (
            <div className="pt-2 border-t border-white/15 space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={customInfo.city}
                  onChange={(e) => handleSaveCustomInfo({ ...customInfo, city: e.target.value })}
                  placeholder="都市名"
                  className="px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-white outline-none"
                />
                <input
                  type="text"
                  value={customInfo.condition}
                  onChange={(e) =>
                    handleSaveCustomInfo({ ...customInfo, condition: e.target.value })
                  }
                  placeholder="天気"
                  className="px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-white outline-none"
                />
              </div>
              <input
                type="text"
                value={customInfo.customHeadline}
                onChange={(e) =>
                  handleSaveCustomInfo({ ...customInfo, customHeadline: e.target.value })
                }
                placeholder="自分の設定した情報・目標"
                className="w-full px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-white outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* =================================================================
          2. BOTTOM-LEFT (左下):
             iOS 27 LIQUID GLASS CLOCK (Uniform width/height digits + small equal circles + Depth Effect)
             + QUICK VOLUME SLIDER UI
      ================================================================= */}
      <div className="fixed bottom-16 left-5 z-20 pointer-events-auto flex flex-col items-start select-none">
        {/* Date & Font Switcher Pill */}
        <div className="relative z-30 flex items-center gap-1.5 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-[11px] font-bold text-white/95">
            {dateStr}
          </span>
          <button
            type="button"
            onClick={() => setShowFontPicker(!showFontPicker)}
            className="px-2.5 py-0.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-xl border border-cyan-300/40 text-[11px] font-bold text-cyan-200 transition cursor-pointer"
          >
            フォント切替
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/70 hover:text-white transition cursor-pointer"
              title="時計ウィジェットを閉じる"
            >
              <Icon name="X" size={12} />
            </button>
          )}
        </div>

        {showFontPicker && (
          <div className="relative z-40 mb-2 p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/20 shadow-2xl grid grid-cols-2 gap-1.5 w-64">
            {CLOCK_FONT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFontChange(opt.id)}
                className={`px-2 py-1.5 rounded-xl border text-left text-[11px] transition ${
                  clockFont === opt.id
                    ? 'bg-cyan-400 text-slate-950 border-cyan-200 font-black'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                <div className={opt.id}>{opt.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Liquid Glass Clock with Depth Foreground Ridge Overlay */}
        <div className="relative py-1 pr-2">
          <div
            className={`relative z-10 flex items-center gap-1.5 text-[52px] sm:text-[64px] leading-none ${clockFont}`}
          >
            <span className="ios27-liquid-digit">{hoursStr[0]}</span>
            <span className="ios27-liquid-digit">{hoursStr[1]}</span>

            <div className="flex flex-col items-center justify-center gap-2 px-0.5">
              <span className="ios27-liquid-circle-dot" />
              <span className="ios27-liquid-circle-dot" />
            </div>

            <span className="ios27-liquid-digit">{minutesStr[0]}</span>
            <span className="ios27-liquid-digit">{minutesStr[1]}</span>
          </div>

          {/* Foreground Depth Subject Layer (z-20 over z-10 clock) */}
          {customInfo.depthEffectEnabled && (
            <svg
              viewBox="0 0 400 60"
              preserveAspectRatio="none"
              className="pointer-events-none absolute -bottom-1 left-0 w-full h-[24px] sm:h-[28px] z-20 drop-shadow-[0_-6px_12px_rgba(0,0,0,0.6)]"
            >
              <path
                d="M0,60 L0,32 L55,12 L115,36 L185,8 L260,34 L335,12 L400,28 L400,60 Z"
                fill="rgba(15, 23, 42, 0.84)"
                stroke="rgba(125, 211, 252, 0.4)"
                strokeWidth="1.2"
              />
            </svg>
          )}
        </div>

        {/* Bottom-Left Quick Volume Bar */}
        <div className="relative z-30 mt-1.5 flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-black/45 backdrop-blur-2xl border border-white/20 shadow-lg w-64 sm:w-72 text-white">
          <button
            type="button"
            onClick={() => {
              const nextMute = !muted;
              setMuted(nextMute);
              setMusicVolume(nextMute ? 0 : volume / 100);
            }}
            className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-cyan-200 shrink-0"
            title="ミュート切替"
          >
            <Icon
              name={muted || volume === 0 ? 'VolumeX' : volume < 50 ? 'Volume1' : 'Volume2'}
              size={14}
            />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => handleVolumeSlider(Number(e.target.value))}
            className="flex-1 h-1.5 accent-cyan-400 cursor-pointer"
          />
          <span className="text-[11px] font-mono font-bold text-cyan-300 w-9 text-right">
            {muted ? '0%' : `${volume}%`}
          </span>
        </div>
      </div>

      {/* =================================================================
          3. RIGHT SIDE (右側):
             NOTIFICATIONS + DESKTOP AI COPILOT (WITH FULL OS CONTROL)
      ================================================================= */}
      <div className="fixed top-4 right-5 z-20 pointer-events-auto hidden xl:flex flex-col gap-2.5 w-80">
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-black/45 backdrop-blur-2xl border border-white/20 text-white text-xs">
          <div className="flex items-center gap-2 font-bold">
            <span className="ios27-liquid-circle-dot scale-75" />
            <span>通知 & AI OS コパイロット</span>
          </div>
          <button
            type="button"
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="text-[11px] text-cyan-300 hover:underline"
          >
            {rightCollapsed ? '展開' : '最小化'}
          </button>
        </div>

        {!rightCollapsed && (
          <>
            {/* Notifications List */}
            <div className="space-y-1.5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/15 text-white shadow"
                >
                  <div className="flex items-center justify-between text-[10px] text-cyan-200 font-bold">
                    <span>{n.title}</span>
                    <span className="text-white/55">{n.time}</span>
                  </div>
                  <div className="text-[11px] text-white/75 mt-0.5 leading-relaxed">{n.body}</div>
                </div>
              ))}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setNotifications([])}
                  className="text-[10px] text-white/50 hover:text-white pl-1"
                >
                  通知をすべてクリア
                </button>
              )}
            </div>

            {/* Desktop OS Control AI Box */}
            <div className="rounded-3xl bg-white/[0.08] backdrop-blur-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col h-80 text-white">
              <div className="px-3.5 py-2 bg-black/35 border-b border-white/15 flex items-center justify-between text-[11px]">
                <span className="font-black text-cyan-200">🤖 Desktop AI (OS操作対応)</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                  OS CONTROL
                </span>
              </div>

              {/* Quick OS Action Chips */}
              <div className="px-2.5 py-1.5 bg-black/25 border-b border-white/10 flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px]">
                {[
                  { label: '🎬 映画を開く', cmd: '映画を開いて' },
                  { label: '🎵 音楽を開く', cmd: '音楽を開いて' },
                  { label: '🎮 ゲーム起動', cmd: 'ゲームを開いて' },
                  { label: '🌙 ダーク/ライト', cmd: 'ライトモードにして' },
                  { label: '🍎 macOS化', cmd: 'macOSモードにして' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setChatInput(chip.cmd);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-cyan-400 hover:text-slate-950 text-white/85 whitespace-nowrap transition shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {chatHistory.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-2.5 py-1.5 rounded-2xl ${
                        m.role === 'user'
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-black/50 border border-white/15 text-white/90'
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.actionLabel && (
                      <span className="mt-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono">
                        ⚡ 実行済: {m.actionLabel}
                      </span>
                    )}
                  </div>
                ))}
                {isSending && (
                  <div className="text-[10px] text-cyan-200 font-mono animate-pulse">
                    OS操作・返信を生成中...
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSendChat}
                className="p-2 bg-black/45 border-t border-white/15 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="例: 映画を開いて / macOSにして..."
                  className="flex-1 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-3 py-1.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs"
                >
                  実行
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}
