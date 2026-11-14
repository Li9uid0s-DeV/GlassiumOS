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
  isFallback?: boolean;
  lastUpdated?: string;
  error?: string;
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;
const RELATIVE_DAY_LABELS = ['明日', '明後日', '3日後'] as const;

function toSafeInt(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : fallback;
}

function parseLocalDate(rawDate: unknown, dayOffsetFallback: number): Date {
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate.trim())) {
    const [y, m, d] = rawDate
      .trim()
      .slice(0, 10)
      .split('-')
      .map((part) => parseInt(part, 10));
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      const parsed = new Date(y, m - 1, d);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + dayOffsetFallback);
  return fallbackDate;
}

function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatForecastDayLabel(rawDate: unknown, dayOffset: number): { dayLabel: string; dateStr: string } {
  const baseLabel = RELATIVE_DAY_LABELS[dayOffset - 1] || `${dayOffset}日後`;
  const dateObj = parseLocalDate(rawDate, dayOffset);
  const weekday = WEEKDAYS_JA[dateObj.getDay()] ?? '月';
  return {
    dayLabel: `${baseLabel} (${weekday})`,
    dateStr: formatLocalIsoDate(dateObj),
  };
}

function getWeatherConditionMeta(rawCode: unknown): { condition: string; icon: string } {
  const code = toSafeInt(rawCode, -1);
  if (code === 0) return { condition: '快晴', icon: 'Sun' };
  if (code === 1) return { condition: '晴れ', icon: 'Sun' };
  if (code === 2) return { condition: '晴れ / 一部曇り', icon: 'CloudSun' };
  if (code === 3) return { condition: '曇り', icon: 'Cloud' };
  if (code === 45 || code === 48) return { condition: '霧', icon: 'CloudFog' };
  if (code >= 51 && code <= 57) return { condition: '霧雨', icon: 'CloudDrizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { condition: '雨', icon: 'CloudRain' };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { condition: '雪', icon: 'Snowflake' };
  }
  if (code >= 95 && code <= 99) return { condition: '雷雨', icon: 'CloudLightning' };
  return { condition: '晴れ / 曇り', icon: 'CloudSun' };
}

function getConditionMetaFromText(rawCondition: unknown, fallbackCode?: unknown): { condition: string; icon: string } {
  if (typeof rawCondition !== 'string' || !rawCondition.trim()) {
    return getWeatherConditionMeta(fallbackCode);
  }
  const text = rawCondition.trim();
  if (text.includes('雷')) return { condition: text, icon: 'CloudLightning' };
  if (text.includes('雪') || text.includes('吹雪')) return { condition: text, icon: 'Snowflake' };
  if (text.includes('霧雨')) return { condition: text, icon: 'CloudDrizzle' };
  if (text.includes('雨')) return { condition: text, icon: 'CloudRain' };
  if (text.includes('霧')) return { condition: text, icon: 'CloudFog' };
  if (text.includes('快晴')) return { condition: text, icon: 'Sun' };
  if (text.includes('晴') && text.includes('曇')) return { condition: text, icon: 'CloudSun' };
  if (text.includes('曇')) return { condition: text, icon: 'Cloud' };
  if (text.includes('晴')) return { condition: text, icon: 'Sun' };
  return getWeatherConditionMeta(fallbackCode);
}

function buildDefaultForecastDays(baseTemp = 21): ForecastDay[] {
  const presets = [
    { condition: '快晴', iconName: 'Sun', highOffset: 2, lowOffset: -6 },
    { condition: '晴れ時々曇り', iconName: 'CloudSun', highOffset: 1, lowOffset: -7 },
    { condition: '一時雨', iconName: 'CloudRain', highOffset: -1, lowOffset: -8 },
  ];
  return presets.map((preset, idx) => {
    const dayOffset = idx + 1;
    const { dayLabel, dateStr } = formatForecastDayLabel(undefined, dayOffset);
    const high = baseTemp + preset.highOffset;
    const low = Math.min(high - 2, baseTemp + preset.lowOffset);
    return {
      dayLabel,
      dateStr,
      condition: preset.condition,
      iconName: preset.iconName,
      high,
      low,
    };
  });
}

function buildDefaultCalendarWeather(city = '東京 (Tokyo)', errorMsg?: string): CalendarWeatherState {
  const defaultTemp = 21;
  return {
    city: city || '東京 (Tokyo)',
    currentTemp: defaultTemp,
    condition: '晴れ / 一部曇り',
    iconName: 'CloudSun',
    high: 24,
    low: 15,
    humidity: 50,
    forecast: buildDefaultForecastDays(defaultTemp),
    loading: false,
    isFallback: Boolean(errorMsg),
    lastUpdated: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    error: errorMsg,
  };
}

interface RawServerDailyEntry {
  date?: unknown;
  condition?: unknown;
  weather_code?: unknown;
  high?: unknown;
  low?: unknown;
}

interface RawOpenMeteoCurrent {
  temperature_2m?: unknown;
  relative_humidity_2m?: unknown;
  weather_code?: unknown;
  weathercode?: unknown;
  temperature?: unknown;
}

interface RawOpenMeteoDaily {
  time?: unknown[];
  weather_code?: unknown[];
  weathercode?: unknown[];
  temperature_2m_max?: unknown[];
  temperature_2m_min?: unknown[];
}

interface RawWeatherApiPayload {
  temp?: unknown;
  humidity?: unknown;
  condition?: unknown;
  weather_code?: unknown;
  high?: unknown;
  low?: unknown;
  location?: { name?: string };
  daily?: RawServerDailyEntry[] | RawOpenMeteoDaily;
  current?: RawOpenMeteoCurrent;
  current_weather?: RawOpenMeteoCurrent;
}

function mapWeatherApiPayload(raw: unknown, fallbackCity: string): CalendarWeatherState | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const payload = raw as RawWeatherApiPayload;

  // Case 1: Server-side /api/weather format ({ temp, humidity, condition, high, low, daily: [...] })
  if (typeof payload.temp === 'number' || Array.isArray(payload.daily)) {
    const curT = toSafeInt(payload.temp, 21);
    const curHum = Math.max(0, Math.min(100, toSafeInt(payload.humidity, 50)));
    const curMeta = getConditionMetaFromText(payload.condition, payload.weather_code);
    const dailyArr: RawServerDailyEntry[] = Array.isArray(payload.daily) ? payload.daily : [];

    const rawHigh = toSafeInt(payload.high ?? dailyArr[0]?.high, curT + 3);
    const rawLow = toSafeInt(payload.low ?? dailyArr[0]?.low, curT - 6);
    const todayHigh = Math.max(rawHigh, rawLow);
    const todayLow = Math.min(rawHigh, rawLow);

    const defaults = buildDefaultForecastDays(curT);
    const forecastList: ForecastDay[] = [1, 2, 3].map((dayOffset, idx) => {
      const item = dailyArr[dayOffset];
      if (!item || typeof item !== 'object') {
        return defaults[idx];
      }
      const { dayLabel, dateStr } = formatForecastDayLabel(item.date, dayOffset);
      const meta = getConditionMetaFromText(item.condition, item.weather_code);
      const itemHigh = toSafeInt(item.high, defaults[idx].high);
      const itemLow = toSafeInt(item.low, defaults[idx].low);
      return {
        dayLabel,
        dateStr,
        condition: meta.condition,
        iconName: meta.icon,
        high: Math.max(itemHigh, itemLow),
        low: Math.min(itemHigh, itemLow),
      };
    });

    return {
      city: fallbackCity || payload.location?.name || '東京 (Tokyo)',
      currentTemp: curT,
      condition: curMeta.condition,
      iconName: curMeta.icon,
      high: todayHigh,
      low: todayLow,
      humidity: curHum,
      forecast: forecastList,
      loading: false,
      isFallback: false,
      lastUpdated: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  // Case 2: Open-Meteo /v1/forecast format ({ current / current_weather, daily: { time, weather_code, temperature_2m_max, temperature_2m_min } })
  const currentObj = payload.current && typeof payload.current === 'object' ? payload.current : null;
  const legacyCurrentObj =
    payload.current_weather && typeof payload.current_weather === 'object' ? payload.current_weather : null;
  const dailyObj =
    payload.daily && typeof payload.daily === 'object' && !Array.isArray(payload.daily) ? payload.daily : null;

  if (!currentObj && !legacyCurrentObj && !dailyObj) {
    return null;
  }

  const rawCode = currentObj?.weather_code ?? currentObj?.weathercode ?? legacyCurrentObj?.weathercode ?? 0;
  const curMeta = getWeatherConditionMeta(rawCode);
  const curT = toSafeInt(currentObj?.temperature_2m ?? legacyCurrentObj?.temperature, 21);
  const curHum = Math.max(0, Math.min(100, toSafeInt(currentObj?.relative_humidity_2m, 50)));

  const dailyCodes: unknown[] = Array.isArray(dailyObj?.weather_code)
    ? dailyObj.weather_code
    : Array.isArray(dailyObj?.weathercode)
    ? dailyObj.weathercode
    : [];
  const dailyMax: unknown[] = Array.isArray(dailyObj?.temperature_2m_max) ? dailyObj.temperature_2m_max : [];
  const dailyMin: unknown[] = Array.isArray(dailyObj?.temperature_2m_min) ? dailyObj.temperature_2m_min : [];
  const dailyDates: unknown[] = Array.isArray(dailyObj?.time) ? dailyObj.time : [];

  const rawTodayHigh = toSafeInt(dailyMax[0], curT + 3);
  const rawTodayLow = toSafeInt(dailyMin[0], curT - 6);
  const todayHigh = Math.max(rawTodayHigh, rawTodayLow);
  const todayLow = Math.min(rawTodayHigh, rawTodayLow);

  const defaults = buildDefaultForecastDays(curT);
  const forecastList: ForecastDay[] = [1, 2, 3].map((dayOffset, idx) => {
    const hasDailyEntry =
      dayOffset < dailyCodes.length || dayOffset < dailyMax.length || dayOffset < dailyMin.length;
    if (!hasDailyEntry) {
      return defaults[idx];
    }
    const meta = getWeatherConditionMeta(dailyCodes[dayOffset] ?? rawCode);
    const { dayLabel, dateStr } = formatForecastDayLabel(dailyDates[dayOffset], dayOffset);
    const hi = toSafeInt(dailyMax[dayOffset], defaults[idx].high);
    const lo = toSafeInt(dailyMin[dayOffset], defaults[idx].low);
    return {
      dayLabel,
      dateStr,
      condition: meta.condition,
      iconName: meta.icon,
      high: Math.max(hi, lo),
      low: Math.min(hi, lo),
    };
  });

  return {
    city: fallbackCity || '東京 (Tokyo)',
    currentTemp: curT,
    condition: curMeta.condition,
    iconName: curMeta.icon,
    high: todayHigh,
    low: todayLow,
    humidity: curHum,
    forecast: forecastList,
    loading: false,
    isFallback: false,
    lastUpdated: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
  };
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
  const [weather, setWeather] = useState<CalendarWeatherState>(() =>
    buildDefaultCalendarWeather('東京 (Tokyo)')
  );

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 35.6762, lon: 139.6503 });
  const [showExtendedMap, setShowExtendedMap] = useState(false);

  const fetchCalendarWeather = useCallback(async (lat = 35.6762, lon = 139.6503, locName = '東京 (Tokyo)') => {
    const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : 35.6762;
    const safeLon = Number.isFinite(Number(lon)) ? Number(lon) : 139.6503;
    const safeCity = locName?.trim() || '東京 (Tokyo)';

    setCoords({ lat: safeLat, lon: safeLon });
    setWeather((prev) => ({
      ...(prev.forecast?.length === 3 ? prev : buildDefaultCalendarWeather(safeCity)),
      city: safeCity,
      loading: true,
      error: undefined,
    }));

    const errors: string[] = [];

    // 1. Try server-side /api/weather proxy/cache first
    try {
      const apiRes = await fetch(
        `/api/weather?lat=${encodeURIComponent(safeLat)}&lon=${encodeURIComponent(safeLon)}&name=${encodeURIComponent(safeCity)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (apiRes.ok) {
        const contentType = apiRes.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const apiData = await apiRes.json();
          const mapped = mapWeatherApiPayload(apiData, safeCity);
          if (mapped) {
            setWeather(mapped);
            return;
          }
          errors.push('/api/weather returned unmappable JSON structure');
        } else {
          errors.push(`/api/weather returned non-JSON content-type (${contentType || 'unknown'})`);
        }
      } else {
        errors.push(`/api/weather HTTP ${apiRes.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`/api/weather fetch error: ${msg}`);
    }

    // 2. Fallback to direct Open-Meteo forecast API
    try {
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(safeLat)}&longitude=${encodeURIComponent(safeLon)}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`;
      const res = await fetch(openMeteoUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data?.error) {
          errors.push(`Open-Meteo API error: ${data.reason || 'unknown reason'}`);
        } else {
          const mapped = mapWeatherApiPayload(data, safeCity);
          if (mapped) {
            setWeather(mapped);
            return;
          }
          errors.push('Open-Meteo payload missing current/daily weather fields');
        }
      } else {
        errors.push(`Open-Meteo HTTP ${res.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Open-Meteo fetch error: ${msg}`);
    }

    // 3. Log diagnostic details and guarantee a valid, non-broken default weather state
    const combinedError = errors.join(' | ') || 'Unknown weather API error';
    console.warn(`[CalendarApp] 天気APIの取得・マッピングに失敗したためデフォルト表示にフォールバックします (${safeCity}): ${combinedError}`);

    setWeather((prev) => {
      if (
        prev &&
        !prev.isFallback &&
        Number.isFinite(prev.currentTemp) &&
        Array.isArray(prev.forecast) &&
        prev.forecast.length === 3
      ) {
        return {
          ...prev,
          city: safeCity,
          loading: false,
          isFallback: true,
          error: '通信エラーのためキャッシュまたは標準予測を表示中',
        };
      }
      return buildDefaultCalendarWeather(safeCity, 'オフライン・標準予測表示中');
    });
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10 relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon name="MapPin" size={15} className="text-cyan-400 shrink-0" fluent={false} />
                  <span className="text-xs font-semibold text-white tracking-wide">
                    {weather.city || '東京 (Tokyo)'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                    {weather.condition || '晴れ / 曇り'}
                  </span>
                  {weather.isFallback && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1"
                      title={weather.error || '天気APIへの接続に失敗したため標準予測データを表示しています'}
                    >
                      <Icon name="AlertCircle" size={11} fluent={false} />
                      <span>{weather.error || '標準予測表示中'}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExtendedMap(true)}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/25 to-blue-500/25 hover:from-cyan-500/40 hover:to-blue-500/40 text-cyan-200 border border-cyan-400/40 text-[11px] font-medium flex items-center gap-1.5 transition shadow-sm"
                    title="48時間降水予測インタラクティブマップを開く"
                  >
                    <Icon name="Map" size={13} fluent={false} />
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
                    className="flex items-center gap-1 text-[11px] text-white/60 hover:text-cyan-300 transition"
                  >
                    <Icon
                      name="RefreshCw"
                      size={13}
                      fluent={false}
                      className={weather.loading ? 'animate-spin text-cyan-400' : ''}
                    />
                    <span className="hidden sm:inline">更新</span>
                  </button>
                </div>
              </div>

              {/* Main Weather Row: Current Temp + 3-Day Forecast Cards */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10">
                {/* Current Temperature block (cols 1-5) */}
                <div className="md:col-span-5 flex items-center gap-3.5 pr-2 md:border-r border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 shadow-inner">
                    <Icon name={weather.iconName || 'CloudSun'} size={28} fluent={false} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold tracking-tight text-white font-mono">
                        {toSafeInt(weather.currentTemp, 21)}°
                      </span>
                      <span className="text-xs font-medium text-white/60">C</span>
                    </div>
                    <div className="text-[11px] text-white/60 flex items-center gap-2 mt-0.5">
                      <span className="text-rose-300 font-medium">最高 {toSafeInt(weather.high, 24)}°</span>
                      <span>·</span>
                      <span className="text-sky-300 font-medium">最低 {toSafeInt(weather.low, 15)}°</span>
                      <span>·</span>
                      <span>湿度 {toSafeInt(weather.humidity, 50)}%</span>
                    </div>
                  </div>
                </div>

                {/* 3-Day Forecast Cards (cols 6-12) */}
                <div className="md:col-span-7 grid grid-cols-3 gap-2">
                  {(Array.isArray(weather.forecast) && weather.forecast.length === 3
                    ? weather.forecast
                    : buildDefaultForecastDays(toSafeInt(weather.currentTemp, 21))
                  ).map((day, idx) => (
                    <div
                      key={`${day.dateStr}-${idx}`}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-between text-center transition"
                    >
                      <span className="text-[10px] text-white/70 font-medium truncate w-full">
                        {day.dayLabel || RELATIVE_DAY_LABELS[idx] || `${idx + 1}日後`}
                      </span>
                      <div className="my-1 text-cyan-300">
                        <Icon name={day.iconName || 'CloudSun'} size={18} fluent={false} />
                      </div>
                      <div className="text-[11px] font-mono font-semibold text-white">
                        {toSafeInt(day.high, 22)}°{' '}
                        <span className="text-white/40 font-normal">/ {toSafeInt(day.low, 14)}°</span>
                      </div>
                      <span className="text-[9px] text-white/50 truncate w-full mt-0.5">
                        {day.condition || '晴れ'}
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
                <Icon name="Umbrella" size={18} className="text-cyan-400 shrink-0" fluent={false} />
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
                <Icon name="X" size={16} fluent={false} />
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
    .hud { position: absolute; bottom: 16px; left: 16px; right: 16px; z-index: 1000; background: rgba(15,23,42,0.9); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px; }
    .bar-container { display: flex; align-items: flex-end; gap: 2px; height: 50px; margin-top: 8px; overflow-x: auto; }
    .bar { flex: 1; min-width: 8px; background: rgba(6,182,212,0.6); border-radius: 2px 2px 0 0; transition: height 0.2s; cursor: pointer; }
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
    const lat = ${Number.isFinite(coords.lat) ? coords.lat : 35.6762};
    const lon = ${Number.isFinite(coords.lon) ? coords.lon : 139.6503};
    const cityName = ${JSON.stringify(weather.city || '東京 (Tokyo)')};
    try {
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
      }).addTo(map).bindPopup('<b>' + cityName + '</b><br>降水観測ステーション').openPopup();
    } catch (mapErr) {
      console.warn('[CalendarApp Map] Leaflet initialization error:', mapErr);
    }

    function renderBars(times, precip) {
      const chartEl = document.getElementById('chart');
      if (!chartEl) return;
      chartEl.innerHTML = '';
      precip.forEach((rawVal, idx) => {
        const val = Number.isFinite(Number(rawVal)) ? Math.round(Number(rawVal) * 10) / 10 : 0;
        const label = String(times[idx] || ('+' + idx + 'h')).replace('T', ' ');
        const bar = document.createElement('div');
        bar.className = 'bar' + (idx === 0 ? ' active' : '');
        const h = Math.min(48, Math.max(4, val * 12));
        bar.style.height = h + 'px';
        bar.title = label + ': ' + val + ' mm/h';
        bar.onclick = () => {
          document.querySelectorAll('.bar').forEach(b => b.classList.remove('active'));
          bar.classList.add('active');
          document.getElementById('time-label').innerText = label;
          document.getElementById('precip-val').innerText = val + ' mm/h';
        };
        chartEl.appendChild(bar);
      });
      if (precip.length > 0) {
        const firstVal = Number.isFinite(Number(precip[0])) ? Math.round(Number(precip[0]) * 10) / 10 : 0;
        document.getElementById('precip-val').innerText = firstVal + ' mm/h';
        if (times[0]) document.getElementById('time-label').innerText = String(times[0]).replace('T', ' ');
      }
    }

    function renderFallbackBars() {
      const now = new Date();
      const times = [];
      const precip = [];
      for (let i = 0; i < 48; i++) {
        const d = new Date(now.getTime() + i * 3600 * 1000);
        times.push(d.toISOString().slice(0, 16) + ' (標準予測)');
        precip.push(i % 9 === 0 ? 0.4 : 0.0);
      }
      renderBars(times, precip);
    }

    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&hourly=precipitation,rain,showers,weather_code,temperature_2m&timezone=auto&forecast_days=2')
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => {
        const hourly = (data && data.hourly) || {};
        const times = Array.isArray(hourly.time) ? hourly.time : [];
        const precip = Array.isArray(hourly.precipitation) ? hourly.precipitation : [];
        if (precip.length > 0) {
          renderBars(times, precip);
        } else {
          console.warn('[CalendarApp Map] Empty hourly precipitation array, using fallback timeline');
          renderFallbackBars();
        }
      }).catch(e => {
        console.warn('[CalendarApp Map] Hourly precipitation fetch failed, using fallback timeline:', e);
        renderFallbackBars();
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
