import { useState, useEffect, useCallback } from 'react';
import { useOS } from '../OSContext';
import { Icon } from '../Icon';
import { KanbanView, HabitView, WhiteboardView } from './ExtraAppsSuite';

type CalTab = 'agenda' | 'kanban' | 'habit' | 'whiteboard';

interface ForecastDay {
  dayLabel: string;
  dateStr: string;
  condition: string;
  iconName: string;
  high: number;
  low: number;
}

interface CalendarWeatherState {
  city: string;
  currentTemp: number;
  condition: string;
  iconName: string;
  high: number;
  low: number;
  humidity: number;
  forecast: ForecastDay[];
  loading: boolean;
  error?: string;
}

function getWeatherConditionMeta(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: '快晴', icon: 'Sun' };
  if (code === 1 || code === 2) return { condition: '晴れ / 曇り', icon: 'CloudSun' };
  if (code === 3) return { condition: '曇り', icon: 'Cloud' };
  if (code === 45 || code === 48) return { condition: '霧', icon: 'CloudFog' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { condition: '雨', icon: 'CloudRain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: '雪', icon: 'Snowflake' };
  if ([95, 96, 99].includes(code)) return { condition: '雷雨', icon: 'CloudLightning' };
  return { condition: '晴れ', icon: 'Sun' };
}

export function CalendarApp({ initialTab }: { initialTab?: string }) {
  const { calendarTasks, addTask, toggleTask, deleteTask } = useOS();
  const [activeTab, setActiveTab] = useState<CalTab>(() => {
    if (initialTab === 'kanban' || initialTab === 'habit' || initialTab === 'whiteboard') {
      return initialTab;
    }
    return 'agenda';
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'system' | 'work' | 'personal'>('work');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Weather Widget State for Calendar Dashboard
  const [weather, setWeather] = useState<CalendarWeatherState>({
    city: '東京 (Tokyo)',
    currentTemp: 21,
    condition: '晴れ / 一部曇り',
    iconName: 'Sun',
    high: 24,
    low: 15,
    humidity: 48,
    forecast: [
      { dayLabel: '明日', dateStr: '明日', condition: '快晴', iconName: 'Sun', high: 23, low: 14 },
      { dayLabel: '明後日', dateStr: '明後日', condition: '晴れ時々曇り', iconName: 'CloudSun', high: 22, low: 13 },
      { dayLabel: '3日後', dateStr: '3日後', condition: '小雨', iconName: 'CloudRain', high: 19, low: 12 },
    ],
    loading: false,
  });

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 35.6762, lon: 139.6503 });
  const [showExtendedMap, setShowExtendedMap] = useState(false);

  const fetchCalendarWeather = useCallback(async (lat = 35.6762, lon = 139.6503, locName = '東京 (Tokyo)') => {
    setCoords({ lat, lon });
    setWeather((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        const curCode = data?.current?.weather_code ?? 0;
        const curMeta = getWeatherConditionMeta(curCode);
        const curT = Math.round(data?.current?.temperature_2m ?? 21);
        const curHum = Math.round(data?.current?.relative_humidity_2m ?? 50);

        const dailyCodes: number[] = data?.daily?.weather_code ?? [];
        const dailyMax: number[] = data?.daily?.temperature_2m_max ?? [];
        const dailyMin: number[] = data?.daily?.temperature_2m_min ?? [];
        const dailyDates: string[] = data?.daily?.time ?? [];

        const todayHigh = Math.round(dailyMax[0] ?? curT + 3);
        const todayLow = Math.round(dailyMin[0] ?? curT - 6);

        const dayLabels = ['明日', '明後日', '3日後'];
        const forecastList: ForecastDay[] = [];
        for (let i = 1; i <= 3; i++) {
          const code = dailyCodes[i] ?? 0;
          const meta = getWeatherConditionMeta(code);
          const rawDate = dailyDates[i] || '';
          let dLabel = dayLabels[i - 1];
          if (rawDate) {
            const d = new Date(rawDate);
            const wDays = ['日', '月', '火', '水', '木', '金', '土'];
            dLabel = `${dayLabels[i - 1]} (${wDays[d.getDay()]})`;
          }
          forecastList.push({
            dayLabel: dLabel,
            dateStr: rawDate,
            condition: meta.condition,
            iconName: meta.icon,
            high: Math.round(dailyMax[i] ?? curT + 2),
            low: Math.round(dailyMin[i] ?? curT - 5),
          });
        }

        setWeather({
          city: locName,
          currentTemp: curT,
          condition: curMeta.condition,
          iconName: curMeta.icon,
          high: todayHigh,
          low: todayLow,
          humidity: curHum,
          forecast: forecastList,
          loading: false,
        });
        return;
      }
    } catch {
      // Fallback gracefully on network issues
    }
    setWeather((prev) => ({ ...prev, loading: false }));
  }, []);

  // Request user location on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let detectedCity = '現在地 (Local)';
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz) {
              const parts = tz.split('/');
              detectedCity = parts[parts.length - 1].replace(/_/g, ' ');
            }
          } catch {
            // ignore
          }
          fetchCalendarWeather(latitude, longitude, detectedCity);
        },
        () => {
          fetchCalendarWeather(35.6762, 139.6503, '東京 (Tokyo)');
        },
        { timeout: 4500, enableHighAccuracy: false }
      );
    } else {
      fetchCalendarWeather(35.6762, 139.6503, '東京 (Tokyo)');
    }
  }, [fetchCalendarWeather]);

  useEffect(() => {
    if (initialTab === 'kanban' || initialTab === 'habit' || initialTab === 'whiteboard') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthName = today.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle.trim(),
      date: selectedDate,
      time: '12:00',
      category: newCategory,
      completed: false,
      priority: newPriority,
    });
    setNewTitle('');
  };

  const tasksForSelectedDate = calendarTasks.filter((t) => t.date === selectedDate);

  const TABS: { id: CalTab; label: string }[] = [
    { id: 'agenda', label: 'カレンダー予定' },
    { id: 'kanban', label: 'カンバン管理 (AI分解)' },
    { id: 'habit', label: '習慣トラッカー' },
    { id: 'whiteboard', label: 'アイデアメモ' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Hairline Navigation */}
      <div className="px-6 border-b border-white/10 flex items-center gap-6 shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
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

      {activeTab === 'kanban' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <KanbanView />
        </div>
      ) : activeTab === 'habit' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <HabitView />
        </div>
      ) : activeTab === 'whiteboard' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <WhiteboardView />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Calendar Grid */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/10 p-5 flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Icon name="Calendar" size={16} className="text-cyan-400" />
                  <h2 className="text-sm font-semibold">{monthName}</h2>
                </div>
                <span className="text-[11px] text-cyan-300 font-mono">Today</span>
              </div>

              <div className="grid grid-cols-7 text-center text-[10px] text-white/40 mb-1 font-semibold uppercase">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const isToday = dayNum === today.getDate();
                  const hasTasks = calendarTasks.some((t) => t.date === dateStr);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`h-8 w-8 mx-auto flex flex-col items-center justify-center relative transition ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : isToday
                          ? 'border-b-2 border-cyan-400 text-cyan-300 font-semibold'
                          : 'hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {hasTasks && (
                        <span
                          className={`w-1 h-1 rounded-full absolute bottom-1 ${
                            isSelected ? 'bg-slate-950' : 'bg-cyan-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1 text-xs">
              <div className="flex justify-between items-center text-white/70">
                <span>全タスク数</span>
                <span className="font-mono text-cyan-300">{calendarTasks.length}</span>
              </div>
              <div className="flex justify-between items-center text-white/50 text-[11px]">
                <span>完了済み</span>
                <span className="font-mono text-emerald-400">{calendarTasks.filter((t) => t.completed).length}</span>
              </div>
            </div>
          </div>

          {/* Right Tasks Agenda */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            {/* Location Weather & 3-Day Forecast Dashboard Widget */}
            <div className="relative mb-5 p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-slate-900/50 border border-white/15 backdrop-blur-xl shadow-xl overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

              {/* Widget Header: Location, View Extended Map & Reload */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-cyan-400 text-base">location_on</span>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    {weather.city}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                    {weather.condition}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExtendedMap(true)}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/25 to-blue-500/25 hover:from-cyan-500/40 hover:to-blue-500/40 text-cyan-200 border border-cyan-400/40 text-[11px] font-medium flex items-center gap-1.5 transition shadow-sm"
                    title="48時間降水予測インタラクティブマップを開く"
                  >
                    <span className="material-symbols-rounded text-sm">map</span>
                    <span>View Extended Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => fetchCalendarWeather(pos.coords.latitude, pos.coords.longitude, '現在地 (GPS)'),
                          () => fetchCalendarWeather(35.6762, 139.6503, '東京 (Tokyo)')
                        );
                      } else {
                        fetchCalendarWeather(35.6762, 139.6503, '東京 (Tokyo)');
                      }
                    }}
                    title="天気を再取得"
                    className="flex items-center gap-1 text-[11px] text-white/50 hover:text-cyan-300 transition"
                  >
                    <span className={`material-symbols-rounded text-sm ${weather.loading ? 'animate-spin text-cyan-400' : ''}`}>
                      sync
                    </span>
                    <span className="hidden sm:inline">更新</span>
                  </button>
                </div>
              </div>

              {/* Main Weather Row: Current Temp + 3-Day Forecast Cards */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10">
                {/* Current Temperature block (cols 1-5) */}
                <div className="md:col-span-5 flex items-center gap-3.5 pr-2 md:border-r border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 shadow-inner">
                    <Icon name={weather.iconName} size={28} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold tracking-tight text-white font-mono">
                        {weather.currentTemp}°
                      </span>
                      <span className="text-xs font-medium text-white/60">C</span>
                    </div>
                    <div className="text-[11px] text-white/60 flex items-center gap-2 mt-0.5">
                      <span className="text-rose-300 font-medium">最高 {weather.high}°</span>
                      <span>·</span>
                      <span className="text-sky-300 font-medium">最低 {weather.low}°</span>
                      <span>·</span>
                      <span>湿度 {weather.humidity}%</span>
                    </div>
                  </div>
                </div>

                {/* 3-Day Forecast Cards (cols 6-12) */}
                <div className="md:col-span-7 grid grid-cols-3 gap-2">
                  {weather.forecast.map((day, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-between text-center transition"
                    >
                      <span className="text-[10px] text-white/70 font-medium truncate w-full">
                        {day.dayLabel}
                      </span>
                      <div className="my-1 text-cyan-300">
                        <Icon name={day.iconName} size={18} />
                      </div>
                      <div className="text-[11px] font-mono font-semibold text-white">
                        {day.high}° <span className="text-white/40 font-normal">/ {day.low}°</span>
                      </div>
                      <span className="text-[9px] text-white/50 truncate w-full mt-0.5">
                        {day.condition}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4 pb-2 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">{selectedDate} の予定</h3>
            </div>

            <form onSubmit={handleCreateTask} className="pb-4 mb-4 border-b border-white/10 flex flex-col gap-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="新しい予定を追加..."
                  className="flex-1 bg-transparent border-b border-white/20 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 text-slate-950 text-xs font-semibold transition"
                >
                  追加
                </button>
              </div>

              <div className="flex items-center gap-6 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <span>カテゴリ:</span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as 'system' | 'work' | 'personal')}
                    className="bg-slate-900 border-b border-white/20 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value="system">System</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span>優先度:</span>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="bg-slate-900 border-b border-white/20 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </form>

            <div className="flex-1">
              {tasksForSelectedDate.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-xs">
                  この日の予定はありません
                </div>
              ) : (
                <div className="divide-y divide-white/10 border-b border-white/10">
                  {tasksForSelectedDate.map((task) => (
                    <div
                      key={task.id}
                      className={`py-3 flex items-center justify-between group transition ${
                        task.completed ? 'opacity-45' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`h-4 w-4 border flex items-center justify-center transition ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : 'border-white/30 hover:border-cyan-400'
                          }`}
                        >
                          {task.completed && <Icon name="Check" size={11} />}
                        </button>

                        <div>
                          <div className={`text-xs font-medium ${task.completed ? 'line-through text-white/50' : 'text-white'}`}>
                            {task.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-white/45">
                            <span>{task.category}</span>
                            <span>·</span>
                            <span>{task.priority}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-rose-400 transition"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 48-Hour Regional Precipitation Forecast Extended Map Modal (Open-Meteo API) */}
      {showExtendedMap && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-4xl h-[82vh] bg-slate-950 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-rounded text-cyan-400 text-xl">umbrella</span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Open-Meteo 48時間降水予測マップ
                    <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                      {weather.city} ({coords.lat.toFixed(2)}, {coords.lon.toFixed(2)})
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Open-Meteo API リアルタイム48時間アワーリー降水量・降水確率・レーダー予測
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExtendedMap(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-rose-500 text-white/80 hover:text-white flex items-center justify-center transition"
                title="閉じる"
              >
                <span className="material-symbols-rounded text-lg">close</span>
              </button>
            </div>

            {/* Interactive Open-Meteo Precipitation Map Iframe */}
            <div className="flex-1 w-full bg-slate-900 relative">
              <iframe
                title="Regional 48-Hour Precipitation Forecast Map"
                className="w-full h-full border-0"
                srcDoc={`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Precipitation Forecast Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0f172a; font-family: sans-serif; color: #fff; }
    .hud { position: absolute; bottom: 16px; left: 16px; right: 16px; z-index: 1000; background: rgba(15,23,42,0.9); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; p-3; padding: 12px; }
    .bar-container { display: flex; align-items: flex-end; gap: 2px; height: 50px; margin-top: 8px; overflow-x: auto; }
    .bar { flex: 1; min-width: 8px; background: rgba(6,182,212,0.6); border-radius: 2px 2px 0 0; transition: height 0.2s; }
    .bar.active { background: #38bdf8; box-shadow: 0 0 8px #38bdf8; }
    .info-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="hud">
    <div class="info-row">
      <span id="time-label">48時間降水予測タイムライン</span>
      <span id="precip-val" style="color: #38bdf8;">0.0 mm/h</span>
    </div>
    <div class="bar-container" id="chart"></div>
  </div>
  <script>
    const lat = ${coords.lat};
    const lon = ${coords.lon};
    const map = L.map('map', { zoomControl: false }).setView([lat, lon], 8);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap & Open-Meteo'
    }).addTo(map);

    L.circleMarker([lat, lon], {
      radius: 12,
      color: '#06b6d4',
      fillColor: '#38bdf8',
      fillOpacity: 0.8
    }).addTo(map).bindPopup('<b>${weather.city}</b><br>降水観測ステーション').openPopup();

    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&hourly=precipitation,rain,showers,weather_code,temperature_2m&timezone=auto&forecast_days=2')
      .then(r => r.json())
      .then(data => {
        const hourly = data.hourly || {};
        const times = hourly.time || [];
        const precip = hourly.precipitation || [];
        const chartEl = document.getElementById('chart');

        precip.forEach((val, idx) => {
          const bar = document.createElement('div');
          bar.className = 'bar' + (idx === 0 ? ' active' : '');
          const h = Math.min(48, Math.max(4, val * 12));
          bar.style.height = h + 'px';
          bar.title = (times[idx] || '').replace('T', ' ') + ': ' + val + ' mm/h';
          bar.onclick = () => {
            document.querySelectorAll('.bar').forEach(b => b.classList.remove('active'));
            bar.classList.add('active');
            document.getElementById('time-label').innerText = (times[idx] || '').replace('T', ' ');
            document.getElementById('precip-val').innerText = val + ' mm/h';
          };
          chartEl.appendChild(bar);
        });

        if (precip.length > 0) {
          document.getElementById('precip-val').innerText = precip[0] + ' mm/h';
          if (times[0]) document.getElementById('time-label').innerText = times[0].replace('T', ' ');
        }
      }).catch(e => {
        console.error(e);
      });
  </script>
</body>
</html>
                `}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
