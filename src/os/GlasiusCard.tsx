import React, { useState, useEffect } from 'react';
import { useOS } from './OSContext';
import { Icon } from './Icon';

export function GlasiusCard({ onClose }: { onClose?: () => void }) {
  const { openApp, calendarTasks } = useOS();
  const [time, setTime] = useState(new Date());
  const [cpuUsage, setCpuUsage] = useState(24);
  const [ramUsage, setRamUsage] = useState(38);
  const [quickPrompt, setQuickPrompt] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setCpuUsage(Math.floor(18 + Math.random() * 15));
      setRamUsage(Math.floor(35 + Math.random() * 8));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const handleLaunchAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPrompt.trim()) {
      openApp('ai');
    }
  };

  return (
    <div className="relative w-80 sm:w-88 rounded-3xl bg-slate-950/80 backdrop-blur-2xl border border-white/20 shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] p-4 text-white flex flex-col gap-3 font-sans select-none overflow-hidden group">
      {/* Ambient Glass Highlight Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md">
            <span className="material-symbols-rounded text-sm text-slate-950 font-bold">widgets</span>
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              GlasiusCard Widget
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-white/50 font-mono">GlasispectUI OS Desk</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg bg-white/10 hover:bg-rose-500 text-white/70 hover:text-white flex items-center justify-center transition"
            title="ウィジェットを閉じる"
          >
            <span className="material-symbols-rounded text-sm">close</span>
          </button>
        )}
      </div>

      {/* Clock & Calendar Quick Glance */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div
          onClick={() => openApp('clock')}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-white/60">
            <Icon name="Clock" size={14} className="text-cyan-400" />
            <span className="text-[9px] font-mono text-cyan-300">LIVE</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-white">{timeStr}</div>
            <div className="text-[10px] text-white/60 truncate">{dateStr}</div>
          </div>
        </div>

        <div
          onClick={() => openApp('calendar')}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-white/60">
            <Icon name="Calendar" size={14} className="text-indigo-400" />
            <span className="text-[9px] font-mono text-indigo-300">{calendarTasks.length} TASKS</span>
          </div>
          <div className="mt-2">
            <div className="text-xs font-bold text-white truncate">カレンダー＆天気</div>
            <div className="text-[10px] text-cyan-300 font-medium truncate flex items-center gap-1 mt-0.5">
              <span className="material-symbols-rounded text-xs">umbrella</span>
              <span>48時間降水マップ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Row: CPU & RAM Gauges */}
      <div className="grid grid-cols-2 gap-2 relative z-10 text-[11px]">
        <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/70">
            <Icon name="Cpu" size={13} className="text-cyan-400" />
            <span>CPU</span>
          </div>
          <span className="font-mono font-bold text-cyan-300">{cpuUsage}%</span>
        </div>

        <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/70">
            <Icon name="Activity" size={13} className="text-indigo-400" />
            <span>RAM</span>
          </div>
          <span className="font-mono font-bold text-indigo-300">{ramUsage}%</span>
        </div>
      </div>

      {/* Quick AI & Entertainment Shortcuts */}
      <form onSubmit={handleLaunchAI} className="relative z-10 flex items-center gap-1.5">
        <input
          type="text"
          value={quickPrompt}
          onChange={(e) => setQuickPrompt(e.target.value)}
          placeholder="AIアシスタントに質問..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/60 focus:bg-white/10 transition"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
        >
          質問
        </button>
      </form>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10 relative z-10 text-[10px]">
        <button
          type="button"
          onClick={() => openApp('entertainment')}
          className="text-white/60 hover:text-rose-400 flex items-center gap-1 transition"
        >
          <span className="material-symbols-rounded text-xs">tv</span>
          <span>Entertainment</span>
        </button>
        <button
          type="button"
          onClick={() => openApp('weather')}
          className="text-white/60 hover:text-cyan-300 flex items-center gap-1 transition"
        >
          <span className="material-symbols-rounded text-xs">cloud_sun</span>
          <span>Cosmic Weather</span>
        </button>
      </div>
    </div>
  );
}
