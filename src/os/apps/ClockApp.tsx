import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';
import { PomodoroView } from './ExtraAppsSuite';

type Tab = 'clock' | 'alarm' | 'pomodoro' | 'stopwatch' | 'timer';

interface AlarmItem {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  days: string[];
  sound: 'chime' | 'pulse' | 'cosmic' | 'radar';
}

const INITIAL_ALARMS: AlarmItem[] = [
  { id: 'alarm-1', time: '07:00', label: 'Morning Wakeup', enabled: true, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], sound: 'chime' },
  { id: 'alarm-2', time: '09:00', label: 'Standup Meeting', enabled: true, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], sound: 'radar' },
  { id: 'alarm-3', time: '23:30', label: 'Sleep Reminder', enabled: false, days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'], sound: 'cosmic' },
];

const WORLD_CITIES = [
  { city: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo' },
  { city: 'New York', country: 'United States', timeZone: 'America/New_York' },
  { city: 'London', country: 'United Kingdom', timeZone: 'Europe/London' },
  { city: 'Paris', country: 'France', timeZone: 'Europe/Paris' },
  { city: 'San Francisco', country: 'United States', timeZone: 'America/Los_Angeles' },
  { city: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney' },
];

export function ClockApp({ initialTab }: { initialTab?: string }) {
  const { playSound, addNotification, triggerDynamicIsland } = useOS();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (initialTab === 'pomodoro') return 'pomodoro';
    if (initialTab === 'timer') return 'timer';
    return 'clock';
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (initialTab === 'pomodoro') setActiveTab('pomodoro');
    else if (initialTab === 'timer') setActiveTab('timer');
    else if (initialTab === 'worldclock') setActiveTab('clock');
  }, [initialTab]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const playAlarmSound = (soundType: 'chime' | 'pulse' | 'cosmic' | 'radar') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t = ctx.currentTime;
      if (soundType === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t);
        osc.frequency.setValueAtTime(659.25, t + 0.15);
        osc.frequency.setValueAtTime(783.99, t + 0.3);
        osc.frequency.setValueAtTime(1046.5, t + 0.45);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 1.2);
        osc.start(t);
        osc.stop(t + 1.2);
      } else if (soundType === 'radar') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.25);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(880, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.6);
        osc.start(t);
        osc.stop(t + 0.6);
      }
    } catch {
      // ignore
    }
  };

  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    try {
      const saved = localStorage.getItem('liquid-alarms');
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return INITIAL_ALARMS;
  });

  const [newAlarmTime, setNewAlarmTime] = useState('08:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('New Alarm');
  const [newAlarmSound, setNewAlarmSound] = useState<'chime' | 'pulse' | 'cosmic' | 'radar'>('chime');
  const [isAddingAlarm, setIsAddingAlarm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('liquid-alarms', JSON.stringify(alarms));
    } catch {
      /* ignore */
    }
  }, [alarms]);

  const checkedMinuteRef = useRef<string>('');
  useEffect(() => {
    const currentHM = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    if (checkedMinuteRef.current !== currentHM) {
      checkedMinuteRef.current = currentHM;
      alarms.forEach((a) => {
        if (a.enabled && a.time === currentHM) {
          playAlarmSound(a.sound);
          addNotification({
            title: `Alarm: ${a.label}`,
            message: `${a.time}になりました。`,
            icon: 'AlarmClock',
          });
          triggerDynamicIsland(a.label, `Alarm ${a.time}`, 'AlarmClock');
        }
      });
    }
  }, [now, alarms, addNotification, triggerDynamicIsland]);

  const toggleAlarm = (id: string) => {
    playSound('click');
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const deleteAlarm = (id: string) => {
    playSound('click');
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const addAlarm = () => {
    if (!newAlarmTime) return;
    playSound('open');
    const newAlarm: AlarmItem = {
      id: `alarm-${Date.now()}`,
      time: newAlarmTime,
      label: newAlarmLabel || 'Alarm',
      enabled: true,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      sound: newAlarmSound,
    };
    setAlarms((prev) => [...prev, newAlarm]);
    setIsAddingAlarm(false);
    triggerDynamicIsland(newAlarm.label, `Alarm set for ${newAlarm.time}`, 'AlarmClock');
  };

  const [swRunning, setSwRunning] = useState(false);
  const [swTime, setSwTime] = useState(0);
  const swTimeRef = useRef(0);
  swTimeRef.current = swTime;
  const [laps, setLaps] = useState<{ id: number; time: number; delta: number }[]>([]);
  const swTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (swRunning) {
      const start = Date.now() - swTimeRef.current;
      swTimerRef.current = window.setInterval(() => {
        setSwTime(Date.now() - start);
      }, 10);
    } else {
      if (swTimerRef.current) clearInterval(swTimerRef.current);
    }
    return () => {
      if (swTimerRef.current) clearInterval(swTimerRef.current);
    };
  }, [swRunning]);

  const formatStopwatch = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  const recordLap = () => {
    playSound('click');
    const lastLapTime = laps.length > 0 ? laps[0].time : 0;
    const delta = swTime - lastLapTime;
    setLaps([{ id: laps.length + 1, time: swTime, delta }, ...laps]);
  };

  const resetStopwatch = () => {
    playSound('click');
    setSwRunning(false);
    setSwTime(0);
    setLaps([]);
  };

  const [timerDuration, setTimerDuration] = useState(() => {
    const saved = Number(localStorage.getItem('glassium_clock_timer_duration'));
    return Number.isFinite(saved) && saved > 0 ? saved : 30 * 60;
  });
  const [timerRemaining, setTimerRemaining] = useState(() => {
    const saved = Number(localStorage.getItem('glassium_clock_timer_remaining'));
    return Number.isFinite(saved) && saved >= 0 ? saved : 30 * 60;
  });
  const [timerRunning, setTimerRunning] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [customSeconds, setCustomSeconds] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    try {
      localStorage.setItem('glassium_clock_timer_duration', String(timerDuration));
      localStorage.setItem('glassium_clock_timer_remaining', String(Math.ceil(timerRemaining)));
    } catch {
      // ignore
    }
  }, [timerDuration, timerRemaining]);

  // Smooth sub-second countdown loop (80ms ticks) so the outer circular progress bar glides smoothly
  useEffect(() => {
    if (timerRunning) {
      lastTickTimeRef.current = performance.now();
      timerIntervalRef.current = window.setInterval(() => {
        const nowPerf = performance.now();
        const dtSec = Math.max(0.01, Math.min(0.5, (nowPerf - lastTickTimeRef.current) / 1000));
        lastTickTimeRef.current = nowPerf;

        setTimerRemaining((prev) => {
          if (prev <= dtSec) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setTimerRunning(false);
            playAlarmSound('chime');
            addNotification({
              title: 'Timer Finished',
              message: 'カウントダウンが終了しました。',
              icon: 'Timer',
            });
            triggerDynamicIsland('Timer Completed', '00:00:00', 'Timer');
            return 0;
          }
          return prev - dtSec;
        });
      }, 80);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, addNotification, triggerDynamicIsland]);

  const setTimerPreset = (secs: number) => {
    const safeSecs = Math.max(1, Math.min(999 * 60, secs));
    playSound('click');
    setTimerRunning(false);
    setTimerDuration(safeSecs);
    setTimerRemaining(safeSecs);
    setCustomHours(Math.floor(safeSecs / 3600));
    setCustomMinutes(Math.floor((safeSecs % 3600) / 60));
    setCustomSeconds(safeSecs % 60);
  };

  const applyCustomTimerInput = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSecs =
      Math.max(0, Number(customHours) || 0) * 3600 +
      Math.max(0, Number(customMinutes) || 0) * 60 +
      Math.max(0, Number(customSeconds) || 0);
    if (totalSecs > 0) {
      setTimerPreset(totalSecs);
    }
  };

  const adjustTimerSeconds = (deltaSecs: number) => {
    playSound('click');
    setTimerRemaining((prev) => {
      const next = Math.max(0, prev + deltaSecs);
      if (next > timerDuration) {
        setTimerDuration(Math.ceil(next));
      }
      return next;
    });
  };

  const formatTimer = (secs: number) => {
    const whole = Math.max(0, Math.ceil(secs));
    const h = Math.floor(whole / 3600);
    const m = Math.floor((whole % 3600) / 60);
    const s = whole % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Remaining ratio (100% -> 0% as countdown progresses) and Elapsed ratio (0% -> 100%)
  const remainingPercent = useMemo(() => {
    if (timerDuration <= 0) return 0;
    return Math.min(100, Math.max(0, (timerRemaining / timerDuration) * 100));
  }, [timerDuration, timerRemaining]);

  const progressPercent = useMemo(() => {
    return 100 - remainingPercent;
  }, [remainingPercent]);

  // Low-time warning state: <= 60 seconds left OR <= 20% of duration left
  const isLowTime = useMemo(() => {
    if (timerRemaining <= 0) return false;
    return timerRemaining <= 60 || timerRemaining / Math.max(1, timerDuration) <= 0.2;
  }, [timerRemaining, timerDuration]);

  // Listen for OS-level Top Timer Pill / Dock commands
  useEffect(() => {
    const onTimerCommand = (e: Event) => {
      const detail = (e as CustomEvent<{ action?: string; seconds?: number }>).detail;
      if (!detail?.action) return;
      if (detail.action === 'toggle') {
        setTimerRunning((r) => !r);
      } else if (detail.action === 'reset') {
        setTimerRunning(false);
        setTimerRemaining(timerDuration);
      } else if (detail.action === 'add-seconds' && typeof detail.seconds === 'number') {
        adjustTimerSeconds(detail.seconds);
      }
    };
    window.addEventListener('glassium-timer-command', onTimerCommand);
    return () => window.removeEventListener('glassium-timer-command', onTimerCommand);
  }, [timerDuration]);

  // Broadcast live timer state to the OS Top Timer Pill / Dock
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('glassium-timer-state', {
        detail: {
          running: timerRunning,
          remaining: timerRemaining,
          duration: timerDuration,
          formatted: formatTimer(timerRemaining),
          remainingPercent,
          progressPercent,
          isLowTime,
        },
      })
    );
  }, [timerRunning, timerRemaining, timerDuration, remainingPercent, progressPercent, isLowTime]);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'clock', label: '世界時計', icon: 'Globe' },
    { id: 'timer', label: '長時間タイマー (25分超対応)', icon: 'Clock' },
    { id: 'alarm', label: 'アラーム', icon: 'Bell' },
    { id: 'stopwatch', label: 'ストップウォッチ', icon: 'Activity' },
    { id: 'pomodoro', label: 'ポモドーロ集中', icon: 'Sparkles' },
  ];

  // Analog clock angles
  const secAngle = now.getSeconds() * 6;
  const minAngle = now.getMinutes() * 6 + now.getSeconds() * 0.1;
  const hourAngle = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 text-white select-none overflow-hidden">
      {/* Redesigned Liquid Glass Navigation Header */}
      <div className="px-5 py-3 bg-black/40 backdrop-blur-2xl border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 flex items-center justify-center shadow-lg">
            <Icon name="Clock" size={17} />
          </div>
          <div>
            <div className="text-xs font-black tracking-wide">GLASSIUM CHRONO STUDIO</div>
            <div className="text-[10px] text-cyan-300/80 font-mono">
              World Clock · Extended Timer (Up to 999m) · Alarms · Stopwatch
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/[0.05] p-1 rounded-2xl border border-white/10 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                playSound('click');
                setActiveTab(t.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'bg-cyan-400 text-slate-950 shadow-md'
                  : 'text-white/65 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon name={t.icon} size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Top Floating Timer Pill / Dock inside ClockApp */}
      <div className="px-5 pt-3 pb-1 flex justify-center shrink-0 z-10">
        <div
          onClick={() => setActiveTab('timer')}
          className={`group cursor-pointer px-4 py-2 rounded-full backdrop-blur-2xl border transition-all duration-300 flex items-center gap-3.5 shadow-xl ${
            timerRunning && isLowTime
              ? 'bg-rose-950/75 border-rose-400/60 clock-timer-low-card'
              : timerRunning
              ? 'bg-slate-900/85 border-cyan-400/50 shadow-[0_0_24px_rgba(34,211,238,0.2)]'
              : 'bg-slate-900/70 border-white/15 hover:border-white/30'
          }`}
        >
          {/* Mini Circular Progress Ring inside the Top Pill */}
          <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="3.2"
                fill="transparent"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke={isLowTime ? '#fb7185' : '#22d3ee'}
                strokeWidth="3.2"
                fill="transparent"
                strokeDasharray="87.96"
                strokeDashoffset={87.96 - (87.96 * remainingPercent) / 100}
                strokeLinecap="round"
                className={`clock-timer-progress-circle ${
                  timerRunning ? (isLowTime ? 'is-low-time' : 'is-running') : ''
                }`}
              />
            </svg>
            <span
              className={`w-2 h-2 rounded-full ${
                timerRunning
                  ? isLowTime
                    ? 'bg-rose-400 animate-ping'
                    : 'bg-cyan-300 animate-pulse'
                  : 'bg-white/40'
              }`}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isLowTime && timerRunning
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                  : timerRunning
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {timerRunning ? (isLowTime ? '残りわずか' : 'タイマー稼働中') : 'タイマー待機'}
            </span>
            <span
              className={`text-base sm:text-lg font-black font-mono tabular-nums tracking-tight ${
                isLowTime && timerRunning ? 'text-rose-300' : 'text-white'
              }`}
            >
              {formatTimer(timerRemaining)}
            </span>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 border-l border-white/15 pl-3"
          >
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setTimerRunning(!timerRunning);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-black transition cursor-pointer ${
                timerRunning
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : isLowTime
                  ? 'bg-rose-500 text-white hover:bg-rose-400'
                  : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
              }`}
            >
              {timerRunning ? '一時停止' : '開始'}
            </button>
            <button
              type="button"
              onClick={() => adjustTimerSeconds(60)}
              className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-white/90 transition cursor-pointer"
              title="1分追加"
            >
              +1分
            </button>
            <button
              type="button"
              onClick={() => setTimerPreset(timerDuration)}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/75 hover:text-white transition cursor-pointer"
              title="リセット"
            >
              <Icon name="RotateCcw" size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'pomodoro' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <PomodoroView />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'clock' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Hero Analog + Digital Liquid Glass Card */}
              <div className="p-6 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/15 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {/* Precision Analog Clock Face */}
                  <div className="relative w-32 h-32 rounded-full bg-slate-950/90 border-2 border-cyan-400/40 shadow-[inset_0_0_24px_rgba(6,182,212,0.25)] flex items-center justify-center shrink-0">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div
                        key={i}
                        className="absolute inset-1.5 flex justify-center"
                        style={{ transform: `rotate(${i * 30}deg)` }}
                      >
                        <span
                          className={`block rounded-full ${
                            i % 3 === 0 ? 'w-1 h-2.5 bg-cyan-300' : 'w-0.5 h-1.5 bg-white/35'
                          }`}
                        />
                      </div>
                    ))}
                    <div
                      className="absolute w-1 h-8 bg-white rounded-full origin-bottom"
                      style={{
                        bottom: '50%',
                        transform: `rotate(${hourAngle}deg)`,
                      }}
                    />
                    <div
                      className="absolute w-0.5 h-11 bg-cyan-300 rounded-full origin-bottom"
                      style={{
                        bottom: '50%',
                        transform: `rotate(${minAngle}deg)`,
                      }}
                    />
                    <div
                      className="absolute w-0.5 h-12 bg-rose-400 rounded-full origin-bottom"
                      style={{
                        bottom: '50%',
                        transform: `rotate(${secAngle}deg)`,
                      }}
                    />
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-950 z-10" />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-[10px] font-mono text-cyan-300 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      <span>LOCAL STANDARD TIME</span>
                    </div>
                    <div className="text-4xl sm:text-6xl font-black tracking-tight text-white mt-2 tabular-nums font-mono">
                      {now.toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    <div className="text-xs text-white/65 mt-1 font-medium">
                      {now.toLocaleDateString('ja-JP', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('timer')}
                    className="px-4 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Icon name="Clock" size={14} />
                    <span>長時間タイマーを開く</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('alarm')}
                    className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Icon name="Bell" size={14} />
                    <span>アラーム設定 ({alarms.filter((a) => a.enabled).length}件ON)</span>
                  </button>
                </div>
              </div>

              {/* World Cities Grid */}
              <div>
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Icon name="Globe" size={14} />
                  <span>世界の主要都市 (World Clock Grid)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {WORLD_CITIES.map((c) => {
                    const cityTime = now.toLocaleTimeString('ja-JP', {
                      timeZone: c.timeZone,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const cityDate = now.toLocaleDateString('ja-JP', {
                      timeZone: c.timeZone,
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    });
                    return (
                      <div
                        key={c.city}
                        className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white text-sm">{c.city}</div>
                          <div className="text-[11px] text-white/50">{c.country}</div>
                          <div className="text-[10px] text-cyan-300/80 font-mono mt-1">{cityDate}</div>
                        </div>
                        <div className="text-2xl font-black font-mono text-white tabular-nums">
                          {cityTime}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alarm' && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                <div>
                  <div className="text-sm font-black">アラーム管理</div>
                  <div className="text-xs text-white/55">指定した時刻にサウンドとデスクトップ通知でお知らせします</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingAlarm(!isAddingAlarm)}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="Plus" size={14} />
                  <span>新規アラーム追加</span>
                </button>
              </div>

              {isAddingAlarm && (
                <div className="p-5 rounded-3xl bg-white/[0.06] border border-cyan-400/40 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] text-white/60 block mb-1 font-bold">時刻 (24h)</label>
                      <input
                        type="time"
                        value={newAlarmTime}
                        onChange={(e) => setNewAlarmTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-sm outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/60 block mb-1 font-bold">ラベル</label>
                      <input
                        type="text"
                        value={newAlarmLabel}
                        onChange={(e) => setNewAlarmLabel(e.target.value)}
                        placeholder="アラーム名"
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-sm outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/60 block mb-1 font-bold">サウンド</label>
                      <div className="flex gap-2 items-center">
                        <select
                          value={newAlarmSound}
                          onChange={(e) => setNewAlarmSound(e.target.value as 'chime' | 'pulse' | 'cosmic' | 'radar')}
                          className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none"
                        >
                          <option value="chime">Chime</option>
                          <option value="radar">Radar</option>
                          <option value="pulse">Pulse</option>
                          <option value="cosmic">Cosmic</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => playAlarmSound(newAlarmSound)}
                          className="p-2 rounded-xl bg-white/10 text-cyan-300 hover:bg-white/20"
                          title="試聴"
                        >
                          <Icon name="Volume2" size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingAlarm(false)}
                      className="px-4 py-1.5 rounded-xl bg-white/10 text-xs text-white/75 hover:text-white"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={addAlarm}
                      className="px-5 py-1.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black"
                    >
                      保存する
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className={`p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between transition ${
                      alarm.enabled ? 'border-l-4 border-l-cyan-400' : 'opacity-45'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleAlarm(alarm.id)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                          alarm.enabled ? 'bg-cyan-400' : 'bg-white/20'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                            alarm.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <div>
                        <div className="text-3xl font-black text-white font-mono tabular-nums">
                          {alarm.time}
                        </div>
                        <div className="text-xs text-white/60 mt-0.5">
                          {alarm.label} · サウンド: {alarm.sound}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => playAlarmSound(alarm.sound)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition"
                        title="テスト再生"
                      >
                        <Icon name="Volume2" size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAlarm(alarm.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-400 transition"
                        title="削除"
                      >
                        <Icon name="Trash2" size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stopwatch' && (
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center space-y-6 py-4">
              <div className="p-8 rounded-3xl bg-white/[0.04] border border-white/15 shadow-2xl w-full text-center">
                <div className="text-[11px] font-mono text-cyan-300 uppercase tracking-widest mb-2">
                  HIGH PRECISION CHRONOGRAPH
                </div>
                <div className="text-6xl font-black font-mono tracking-tight text-white tabular-nums">
                  {formatStopwatch(swTime)}
                </div>

                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    type="button"
                    onClick={resetStopwatch}
                    className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
                  >
                    リセット
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setSwRunning(!swRunning);
                    }}
                    className={`px-8 py-2.5 rounded-2xl text-xs font-black shadow-lg transition ${
                      swRunning ? 'bg-rose-500 text-white' : 'bg-cyan-400 text-slate-950'
                    }`}
                  >
                    {swRunning ? '一時停止' : 'スタート'}
                  </button>

                  <button
                    type="button"
                    onClick={recordLap}
                    disabled={!swRunning}
                    className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white disabled:opacity-30"
                  >
                    ラップ記録
                  </button>
                </div>
              </div>

              {laps.length > 0 && (
                <div className="w-full rounded-2xl bg-white/[0.04] border border-white/10 p-4 max-h-60 overflow-y-auto divide-y divide-white/10">
                  {laps.map((lap) => (
                    <div key={lap.id} className="flex items-center justify-between py-2.5 text-xs font-mono">
                      <span className="text-white/60 font-bold">Lap #{lap.id}</span>
                      <span className="text-cyan-300">+{formatStopwatch(lap.delta)}</span>
                      <span className="text-white font-bold">{formatStopwatch(lap.time)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timer' && (
            <div className="max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-2">
              {/* Left: Circular Progress Ring + Quick Add Buttons */}
              <div
                className={`lg:col-span-6 p-6 rounded-3xl bg-white/[0.04] border transition-all duration-500 shadow-2xl flex flex-col items-center justify-center space-y-5 ${
                  isLowTime && timerRunning
                    ? 'clock-timer-low-card bg-rose-950/20'
                    : 'border-white/15'
                }`}
              >
                <div className="relative w-64 h-64 flex items-center justify-center">
                  {/* Soft ambient radial backlight when running or low time */}
                  <div
                    className={`pointer-events-none absolute inset-4 rounded-full blur-2xl transition-all duration-700 ${
                      timerRunning
                        ? isLowTime
                          ? 'bg-rose-500/25 scale-105'
                          : 'bg-cyan-400/15 scale-100'
                        : 'bg-transparent scale-90'
                    }`}
                  />

                  <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 240 240">
                    <defs>
                      <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                      <linearGradient id="timerLowRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb7185" />
                        <stop offset="50%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>

                    {/* Subtle Outer Track Ring */}
                    <circle
                      cx="120"
                      cy="120"
                      r="104"
                      stroke={isLowTime ? 'rgba(244, 63, 94, 0.16)' : 'rgba(255, 255, 255, 0.08)'}
                      strokeWidth="9"
                      fill="transparent"
                    />

                    {/* Smoothly Animating Outer Circular Progress Bar */}
                    <circle
                      cx="120"
                      cy="120"
                      r="104"
                      stroke={isLowTime ? 'url(#timerLowRedGrad)' : 'url(#timerGrad)'}
                      strokeWidth="9"
                      fill="transparent"
                      strokeDasharray="653.45"
                      strokeDashoffset={653.45 - (653.45 * remainingPercent) / 100}
                      strokeLinecap="round"
                      className={`clock-timer-progress-circle ${
                        timerRunning
                          ? isLowTime
                            ? 'is-low-time'
                            : 'is-running'
                          : isLowTime
                          ? 'is-low-time'
                          : ''
                      }`}
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center text-center">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${
                        isLowTime
                          ? 'text-rose-400 animate-pulse'
                          : 'text-cyan-300'
                      }`}
                    >
                      {timerRunning
                        ? isLowTime
                          ? 'LOW TIME WARNING'
                          : 'COUNTDOWN ACTIVE'
                        : 'EXTENDED TIMER'}
                    </span>
                    <div
                      className={`text-4xl sm:text-5xl font-black font-mono tracking-tight tabular-nums mt-1 transition-colors duration-300 ${
                        isLowTime
                          ? 'text-rose-200 drop-shadow-[0_0_16px_rgba(244,63,94,0.65)]'
                          : 'text-white'
                      }`}
                    >
                      {formatTimer(timerRemaining)}
                    </div>
                    <span className="text-[11px] text-white/50 font-mono mt-1">
                      合計設定: {Math.round(timerDuration / 60)}分 ({formatTimer(timerDuration)})
                    </span>
                  </div>
                </div>

                {/* Quick +/- Time Adjustment Buttons (Works even above 25 minutes!) */}
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {[
                    { label: '+1分', delta: 60 },
                    { label: '+5分', delta: 300 },
                    { label: '+10分', delta: 600 },
                    { label: '+30分', delta: 1800 },
                    { label: '+60分', delta: 3600 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => adjustTimerSeconds(btn.delta)}
                      className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-cyan-400/25 border border-white/10 text-[11px] font-mono font-bold text-cyan-200 transition cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Start / Pause / Reset Controls */}
                <div className="flex items-center gap-3 w-full justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setTimerPreset(timerDuration)}
                    className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
                  >
                    リセット
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setTimerRunning(!timerRunning);
                    }}
                    className={`px-8 py-2.5 rounded-2xl font-black text-xs shadow-lg transition cursor-pointer ${
                      timerRunning
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                    }`}
                  >
                    {timerRunning ? '一時停止' : 'タイマー開始'}
                  </button>
                </div>
              </div>

              {/* Right: Extended Presets (Up to 180 minutes) & Custom Hours/Minutes/Seconds Setter */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-300">
                      ⚡ ワンタッチ時間プリセット (25分以上・最大3時間まで対応)
                    </span>
                    <span className="text-[10px] font-mono text-white/50">1分 〜 180分</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { label: '3分', s: 3 * 60 },
                      { label: '5分', s: 5 * 60 },
                      { label: '10分', s: 10 * 60 },
                      { label: '15分', s: 15 * 60 },
                      { label: '25分', s: 25 * 60 },
                      { label: '30分', s: 30 * 60 },
                      { label: '45分', s: 45 * 60 },
                      { label: '60分 (1h)', s: 60 * 60 },
                      { label: '90分 (1.5h)', s: 90 * 60 },
                      { label: '120分 (2h)', s: 120 * 60 },
                      { label: '150分 (2.5h)', s: 150 * 60 },
                      { label: '180分 (3h)', s: 180 * 60 },
                    ].map((p) => (
                      <button
                        key={p.s}
                        type="button"
                        onClick={() => setTimerPreset(p.s)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          timerDuration === p.s
                            ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Hours / Minutes / Seconds Form (Up to 999 minutes) */}
                <form
                  onSubmit={applyCustomTimerInput}
                  className="p-5 rounded-3xl bg-white/[0.04] border border-white/15 space-y-3"
                >
                  <div className="text-xs font-black text-white flex items-center justify-between">
                    <span>🎛️ 自由時間指定 (25分超・最大999分まで自由設定)</span>
                    <span className="text-[10px] font-mono text-cyan-300">CUSTOM H:M:S</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-white/60 mb-1">時間 (Hours)</label>
                      <input
                        type="number"
                        min={0}
                        max={16}
                        value={customHours}
                        onChange={(e) => setCustomHours(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-sm outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/60 mb-1">分 (0〜999分)</label>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-sm outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/60 mb-1">秒 (0〜59秒)</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={customSeconds}
                        onChange={(e) => setCustomSeconds(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-sm outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                  >
                    この時間をタイマーにセットする
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
