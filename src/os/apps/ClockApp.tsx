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
    return 'clock';
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (initialTab === 'pomodoro') setActiveTab('pomodoro');
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

  const [timerDuration, setTimerDuration] = useState(5 * 60);
  const [timerRemaining, setTimerRemaining] = useState(5 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setTimerRunning(false);
            playAlarmSound('chime');
            addNotification({
              title: 'Timer Finished',
              message: 'カウントダウンが終了しました。',
              icon: 'Timer',
            });
            triggerDynamicIsland('Timer Completed', '00:00', 'Timer');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, addNotification, triggerDynamicIsland]);

  const setTimerPreset = (secs: number) => {
    playSound('click');
    setTimerRunning(false);
    setTimerDuration(secs);
    setTimerRemaining(secs);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = useMemo(() => {
    if (timerDuration === 0) return 0;
    return ((timerDuration - timerRemaining) / timerDuration) * 100;
  }, [timerDuration, timerRemaining]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'clock', label: '世界時計' },
    { id: 'alarm', label: 'アラーム' },
    { id: 'pomodoro', label: 'ポモドーロ' },
    { id: 'stopwatch', label: 'ストップウォッチ' },
    { id: 'timer', label: 'タイマー' },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Hairline Navigation */}
      <div className="px-6 border-b border-white/10 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex items-center gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { playSound('click'); setActiveTab(t.id); }}
              className={`py-3.5 text-xs border-b-2 transition whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-cyan-400 text-cyan-300 font-semibold'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
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
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="pb-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="text-[11px] font-mono text-white/45 uppercase tracking-wider">
                    現在時刻
                  </div>
                  <div className="text-5xl sm:text-6xl font-light tracking-tight text-white mt-1 tabular-nums font-mono">
                    {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    {now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-white/45 mb-3">
                  世界の都市
                </div>
                <div className="divide-y divide-white/10 border-t border-b border-white/10">
                  {WORLD_CITIES.map((c) => {
                    const cityTime = new Date().toLocaleTimeString([], {
                      timeZone: c.timeZone,
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <div
                        key={c.city}
                        className="py-3.5 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-white text-sm">{c.city}</div>
                          <div className="text-xs text-white/40">{c.country}</div>
                        </div>
                        <div className="text-2xl font-light font-mono text-white/90 tabular-nums">
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
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs text-white/60">登録済みアラーム</span>
                <button
                  onClick={() => setIsAddingAlarm(!isAddingAlarm)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                >
                  <Icon name="Plus" size={14} />
                  <span>アラーム追加</span>
                </button>
              </div>

              {isAddingAlarm && (
                <div className="py-4 border-b border-white/15 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1">時刻 (24h)</label>
                      <input
                        type="time"
                        value={newAlarmTime}
                        onChange={(e) => setNewAlarmTime(e.target.value)}
                        className="w-full bg-transparent border-b border-white/20 py-1.5 text-white font-mono text-sm outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1">ラベル</label>
                      <input
                        type="text"
                        value={newAlarmLabel}
                        onChange={(e) => setNewAlarmLabel(e.target.value)}
                        placeholder="アラーム名"
                        className="w-full bg-transparent border-b border-white/20 py-1.5 text-white text-sm outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1">サウンド</label>
                      <div className="flex gap-2 items-center">
                        <select
                          value={newAlarmSound}
                          onChange={(e) => setNewAlarmSound(e.target.value as 'chime' | 'pulse' | 'cosmic' | 'radar')}
                          className="flex-1 bg-slate-900 border-b border-white/20 py-1.5 text-white text-xs outline-none"
                        >
                          <option value="chime">Chime</option>
                          <option value="radar">Radar</option>
                          <option value="pulse">Pulse</option>
                          <option value="cosmic">Cosmic</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => playAlarmSound(newAlarmSound)}
                          className="p-1.5 text-cyan-400 hover:text-cyan-300"
                          title="試聴"
                        >
                          <Icon name="Volume2" size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-2">
                    <button
                      onClick={() => setIsAddingAlarm(false)}
                      className="text-xs text-white/50 hover:text-white"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={addAlarm}
                      className="px-4 py-1.5 bg-cyan-500 text-slate-950 text-xs font-semibold"
                    >
                      保存
                    </button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-white/10 border-b border-white/10">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className={`py-4 flex items-center justify-between ${
                      alarm.enabled ? '' : 'opacity-45'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleAlarm(alarm.id)}
                        className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                          alarm.enabled ? 'bg-cyan-500' : 'bg-white/20'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            alarm.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <div>
                        <div className="text-3xl font-light text-white font-mono tabular-nums">
                          {alarm.time}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">
                          {alarm.label} ({alarm.sound})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => playAlarmSound(alarm.sound)}
                        className="p-1.5 text-white/40 hover:text-white transition"
                        title="テスト再生"
                      >
                        <Icon name="Volume2" size={15} />
                      </button>
                      <button
                        onClick={() => deleteAlarm(alarm.id)}
                        className="p-1.5 text-white/40 hover:text-rose-400 transition"
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
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center space-y-8 py-6">
              <div className="text-center">
                <div className="text-6xl font-light font-mono tracking-tight text-white tabular-nums">
                  {formatStopwatch(swTime)}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <button
                  onClick={resetStopwatch}
                  className="px-5 py-2 border-b border-white/20 text-xs text-white/70 hover:text-white"
                >
                  リセット
                </button>

                <button
                  onClick={() => { playSound('click'); setSwRunning(!swRunning); }}
                  className={`px-8 py-2.5 text-xs font-semibold transition ${
                    swRunning ? 'bg-rose-500 text-white' : 'bg-cyan-500 text-slate-950'
                  }`}
                >
                  {swRunning ? '停止' : '開始'}
                </button>

                <button
                  onClick={recordLap}
                  disabled={!swRunning}
                  className="px-5 py-2 border-b border-white/20 text-xs text-white/70 hover:text-white disabled:opacity-30"
                >
                  ラップ
                </button>
              </div>

              {laps.length > 0 && (
                <div className="w-full max-h-56 overflow-y-auto divide-y divide-white/10 border-t border-b border-white/10">
                  {laps.map((lap) => (
                    <div key={lap.id} className="flex items-center justify-between py-2.5 text-xs font-mono">
                      <span className="text-white/50">Lap {lap.id}</span>
                      <span className="text-cyan-300">+{formatStopwatch(lap.delta)}</span>
                      <span className="text-white">{formatStopwatch(lap.time)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timer' && (
            <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-6 py-4">
              <div className="relative w-56 h-56 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="112" cy="112" r="100" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="transparent" />
                  <circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke="#06b6d4"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="628"
                    strokeDashoffset={628 - (628 * progressPercent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>

                <div className="absolute flex flex-col items-center">
                  <div className="text-5xl font-light font-mono tracking-tight text-white tabular-nums">
                    {formatTimer(timerRemaining)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 border-b border-white/10 pb-3">
                {[
                  { label: '1分', s: 60 },
                  { label: '3分', s: 180 },
                  { label: '5分', s: 300 },
                  { label: '10分', s: 600 },
                  { label: '25分', s: 1500 },
                ].map((p) => (
                  <button
                    key={p.s}
                    onClick={() => setTimerPreset(p.s)}
                    className={`pb-1 text-xs border-b-2 transition ${
                      timerDuration === p.s ? 'border-cyan-400 text-cyan-300 font-semibold' : 'border-transparent text-white/50 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-6">
                <button
                  onClick={() => setTimerPreset(timerDuration)}
                  className="text-xs text-white/60 hover:text-white"
                >
                  リセット
                </button>

                <button
                  onClick={() => { playSound('click'); setTimerRunning(!timerRunning); }}
                  className="px-8 py-2.5 bg-cyan-500 text-slate-950 font-semibold text-xs transition"
                >
                  {timerRunning ? '一時停止' : '開始'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
