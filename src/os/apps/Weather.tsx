import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';
import { VintageAndroidWeatherSky } from './VintageAndroidWeatherSky';
import { WeatherConditionKey } from '../weatherConsensus';

export interface SavedWeatherLocation {
  id: string;
  name: string;
  region?: string;
  lat: number;
  lon: number;
}

interface HourlyForecastItem {
  time: string;
  temp: number;
  precipProb: number;
  precipMm: number;
  windSpeed: number;
  icon: string;
  condition: string;
}

interface DailyForecastItem {
  date: string;
  day: string;
  icon: string;
  condition: string;
  high: number;
  low: number;
  precipProb: number;
  precipSum: number;
}

interface RadarFrame {
  time: number;
  path: string;
}

interface WeatherApiResponse {
  location: { name: string; lat: number; lon: number };
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  windDirection: number;
  pressure: number;
  precipitation: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  condition: string;
  icon: string;
  high: number;
  low: number;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  radar?: {
    host: string;
    frames: RadarFrame[];
  };
  serverTimestamp: number;
  nextUpdateAt: number;
  updateIntervalMinutes: number;
}

const DEFAULT_LOCATIONS: SavedWeatherLocation[] = [
  { id: '35.676,139.650', name: '東京', region: '東京都, 日本', lat: 35.6762, lon: 139.6503 },
  { id: '34.694,135.502', name: '大阪', region: '大阪府, 日本', lat: 34.6937, lon: 135.5023 },
  { id: '43.062,141.354', name: '札幌', region: '北海道, 日本', lat: 43.0618, lon: 141.3545 },
  { id: '33.590,130.402', name: '福岡', region: '福岡県, 日本', lat: 33.5902, lon: 130.4017 },
  { id: '26.212,127.681', name: '那覇', region: '沖縄県, 日本', lat: 26.2124, lon: 127.6809 },
];

const LS_SAVED_LOCATIONS_KEY = 'glassium_weather_saved_locations_v4';
const FIVE_MINUTES_MS = 5 * 60 * 1000;

function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

export function WeatherApp() {
  const { theme, resolvedAccentHex } = useOS();
  const isLight = theme === 'light';

  const [savedLocations, setSavedLocations] = useState<SavedWeatherLocation[]>(() => {
    try {
      const raw = localStorage.getItem(LS_SAVED_LOCATIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_LOCATIONS;
  });

  const [activeLoc, setActiveLoc] = useState<SavedWeatherLocation>(() => savedLocations[0] || DEFAULT_LOCATIONS[0]);
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [activeTab, setActiveTab] = useState<'forecast' | 'radar'>('forecast');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SavedWeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);

  // Weather data state
  const [weather, setWeather] = useState<WeatherApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState<number>(300);

  // Radar map state
  const [mapZoom, setMapZoom] = useState<number>(6);
  const [radarFrameIdx, setRadarFrameIdx] = useState<number>(0);
  const [radarPlaying, setRadarPlaying] = useState<boolean>(false);
  const [radarOpacity, setRadarOpacity] = useState<number>(0.75);
  const [showWindOverlay, setShowWindOverlay] = useState<boolean>(true);

  // 3D Weather Sky background state
  const [show3dSky, setShow3dSky] = useState<boolean>(true);
  const [wiperActive, setWiperActive] = useState<boolean>(true);

  const conditionKey: WeatherConditionKey = useMemo(() => {
    const cond = (weather?.condition || '').toLowerCase();
    if (cond.includes('雷') || cond.includes('thunder') || cond.includes('storm')) return 'Thunderstorm';
    if (cond.includes('雪') || cond.includes('snow') || cond.includes('氷') || cond.includes('sleet')) return 'Snow';
    if (cond.includes('雨') || cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) return 'Rainy';
    if (cond.includes('曇') || cond.includes('cloud') || cond.includes('overcast')) return 'Cloudy';
    if (cond.includes('aurora') || cond.includes('オーロラ')) return 'Aurora';
    return 'Sunny';
  }, [weather?.condition]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SAVED_LOCATIONS_KEY, JSON.stringify(savedLocations));
    } catch {
      // ignore
    }
  }, [savedLocations]);

  const wmoCodeToCondition = (code: number): { condition: string; icon: string } => {
    if (code === 0) return { condition: '快晴', icon: '☀️' };
    if (code === 1) return { condition: '晴れ', icon: '🌤️' };
    if (code === 2) return { condition: '一部曇り', icon: '⛅' };
    if (code === 3) return { condition: '曇り', icon: '☁️' };
    if (code === 45 || code === 48) return { condition: '霧', icon: '🌫️' };
    if (code >= 51 && code <= 57) return { condition: '霧雨', icon: '🌦️' };
    if (code >= 61 && code <= 67) return { condition: '雨', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { condition: '雪', icon: '❄️' };
    if (code >= 80 && code <= 82) return { condition: 'にわか雨', icon: '🌦️' };
    if (code >= 85 && code <= 86) return { condition: '吹雪', icon: '🌨️' };
    if (code >= 95) return { condition: '雷雨', icon: '⛈️' };
    return { condition: '晴れ時々曇り', icon: '⛅' };
  };

  const fetchWeatherDirectFallback = useCallback(
    async (loc: SavedWeatherLocation): Promise<WeatherApiResponse> => {
      const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(loc.lat)}&longitude=${encodeURIComponent(loc.lon)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7`;
      const [meteoRes, radarRes] = await Promise.all([
        fetch(meteoUrl),
        fetch('https://api.rainviewer.com/public/weather-maps.json').catch(() => null),
      ]);
      if (!meteoRes.ok) {
        throw new Error(`Open-Meteo HTTP ${meteoRes.status}`);
      }
      const meteo = await meteoRes.json();
      let radarHost = 'https://tilecache.rainviewer.com';
      let radarFrames: RadarFrame[] = [];
      if (radarRes && radarRes.ok) {
        try {
          const rJson = await radarRes.json();
          if (rJson?.host) radarHost = rJson.host;
          const past = Array.isArray(rJson?.radar?.past) ? rJson.radar.past : [];
          const nowcast = Array.isArray(rJson?.radar?.nowcast) ? rJson.radar.nowcast : [];
          radarFrames = [
            ...past.slice(-6).map((f: { time: number; path: string }) => ({ time: f.time, path: f.path })),
            ...nowcast.slice(0, 3).map((f: { time: number; path: string }) => ({ time: f.time, path: f.path })),
          ];
        } catch {
          // ignore radar parse errors
        }
      }

      const curCode = Number(meteo?.current?.weather_code ?? 1);
      const curInfo = wmoCodeToCondition(curCode);
      const nowIso = new Date().toISOString().slice(0, 13);
      const hourlyTimes: string[] = Array.isArray(meteo?.hourly?.time) ? meteo.hourly.time : [];
      let startIdx = hourlyTimes.findIndex((t) => String(t).startsWith(nowIso));
      if (startIdx < 0) startIdx = 0;

      const hourly: HourlyForecastItem[] = hourlyTimes.slice(startIdx, startIdx + 24).map((t, idx) => {
        const i = startIdx + idx;
        const code = Number(meteo?.hourly?.weather_code?.[i] ?? 1);
        const info = wmoCodeToCondition(code);
        return {
          time: String(t).slice(11, 16) || `${idx}:00`,
          temp: Math.round(Number(meteo?.hourly?.temperature_2m?.[i] ?? 20) * 10) / 10,
          precipProb: Math.round(Number(meteo?.hourly?.precipitation_probability?.[i] ?? 0)),
          precipMm: Math.round(Number(meteo?.hourly?.precipitation?.[i] ?? 0) * 10) / 10,
          windSpeed: Math.round(Number(meteo?.hourly?.wind_speed_10m?.[i] ?? 6) * 10) / 10,
          icon: info.icon,
          condition: info.condition,
        };
      });

      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dailyTimes: string[] = Array.isArray(meteo?.daily?.time) ? meteo.daily.time : [];
      const daily: DailyForecastItem[] = dailyTimes.slice(0, 7).map((dateStr, i) => {
        const d = new Date(dateStr);
        const dayLabel = i === 0 ? '今日' : i === 1 ? '明日' : `${dayNames[d.getDay()] || '月'}曜`;
        const code = Number(meteo?.daily?.weather_code?.[i] ?? 1);
        const info = wmoCodeToCondition(code);
        return {
          date: String(dateStr),
          day: dayLabel,
          icon: info.icon,
          condition: info.condition,
          high: Math.round(Number(meteo?.daily?.temperature_2m_max?.[i] ?? 22)),
          low: Math.round(Number(meteo?.daily?.temperature_2m_min?.[i] ?? 14)),
          precipProb: Math.round(Number(meteo?.daily?.precipitation_probability_max?.[i] ?? 10)),
          precipSum: Math.round(Number(meteo?.daily?.precipitation_sum?.[i] ?? 0) * 10) / 10,
        };
      });

      const nowMs = Date.now();
      return {
        location: { lat: loc.lat, lon: loc.lon, name: loc.name },
        temp: Math.round(Number(meteo?.current?.temperature_2m ?? 20) * 10) / 10,
        feelsLike: Math.round(Number(meteo?.current?.apparent_temperature ?? 20) * 10) / 10,
        humidity: Math.round(Number(meteo?.current?.relative_humidity_2m ?? 55)),
        wind: Math.round(Number(meteo?.current?.wind_speed_10m ?? 8) * 10) / 10,
        windDirection: Math.round(Number(meteo?.current?.wind_direction_10m ?? 180)),
        pressure: Math.round(Number(meteo?.current?.surface_pressure ?? 1013)),
        precipitation: Math.round(Number(meteo?.current?.precipitation ?? 0) * 10) / 10,
        uvIndex: Math.round(Number(meteo?.daily?.uv_index_max?.[0] ?? 4)),
        sunrise: String(meteo?.daily?.sunrise?.[0] || '').slice(11, 16) || '05:45',
        sunset: String(meteo?.daily?.sunset?.[0] || '').slice(11, 16) || '18:15',
        condition: curInfo.condition,
        icon: curInfo.icon,
        high: daily[0]?.high ?? 22,
        low: daily[0]?.low ?? 14,
        hourly,
        daily,
        radar: {
          host: radarHost,
          frames: radarFrames,
        },
        serverTimestamp: nowMs,
        nextUpdateAt: nowMs + FIVE_MINUTES_MS,
        updateIntervalMinutes: 5,
      };
    },
    []
  );

  const fetchWeatherForLocation = useCallback(
    async (loc: SavedWeatherLocation, force = false) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        let data: WeatherApiResponse | null = null;
        try {
          const url = `/api/weather?lat=${encodeURIComponent(loc.lat)}&lon=${encodeURIComponent(loc.lon)}&name=${encodeURIComponent(loc.name)}${force ? '&force=1' : ''}`;
          const res = await fetch(url);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('json')) {
              const parsed = (await res.json()) as WeatherApiResponse;
              if (parsed && (typeof parsed.temp === 'number' || Array.isArray(parsed.daily))) {
                data = parsed;
              }
            }
          }
        } catch {
          // Fall through to direct Open-Meteo + RainViewer fetch
        }

        if (!data) {
          data = await fetchWeatherDirectFallback(loc);
        }

        setWeather(data);
        if (data.radar?.frames && data.radar.frames.length > 0) {
          setRadarFrameIdx(data.radar.frames.length - 1);
        }
        const remSec = Math.max(
          10,
          Math.round(((data.nextUpdateAt || Date.now() + FIVE_MINUTES_MS) - Date.now()) / 1000)
        );
        setCountdownSec(remSec);
      } catch {
        setErrorMsg('天気情報の取得に失敗しました。ネットワーク接続を確認してください。');
      } finally {
        setLoading(false);
      }
    },
    [fetchWeatherDirectFallback]
  );

  // Initial fetch & 5-minute automatic server sync
  useEffect(() => {
    fetchWeatherForLocation(activeLoc, false);
    const interval = setInterval(() => {
      fetchWeatherForLocation(activeLoc, true);
    }, FIVE_MINUTES_MS);
    return () => clearInterval(interval);
  }, [activeLoc, fetchWeatherForLocation]);

  // 1-second countdown display for the 5-minute auto-update cycle
  useEffect(() => {
    const t = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          fetchWeatherForLocation(activeLoc, true);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [activeLoc, fetchWeatherForLocation]);

  // Radar animation loop
  useEffect(() => {
    const frames = weather?.radar?.frames || [];
    if (!radarPlaying || frames.length <= 1) return;
    const id = setInterval(() => {
      setRadarFrameIdx((prev) => (prev + 1) % frames.length);
    }, 850);
    return () => clearInterval(id);
  }, [radarPlaying, weather?.radar?.frames]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      let found: SavedWeatherLocation[] | null = null;
      try {
        const res = await fetch(`/api/weather/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('json')) {
            const data = (await res.json()) as { results?: SavedWeatherLocation[] };
            if (Array.isArray(data.results)) {
              found = data.results;
            }
          }
        }
      } catch {
        // Fall back to direct Open-Meteo Geocoding API
      }

      if (!found) {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=ja&format=json`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          found = (geoData.results || []).map(
            (r: { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
              id: String(r.id || `${r.latitude},${r.longitude}`),
              name: r.name,
              admin1: r.admin1 || '',
              country: r.country || '',
              lat: r.latitude,
              lon: r.longitude,
            })
          );
        }
      }

      setSearchResults(found || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const isLocationSaved = useMemo(
    () => savedLocations.some((s) => s.id === activeLoc.id || (Math.abs(s.lat - activeLoc.lat) < 0.02 && Math.abs(s.lon - activeLoc.lon) < 0.02)),
    [savedLocations, activeLoc]
  );

  const toggleSaveActiveLocation = () => {
    if (isLocationSaved) {
      if (savedLocations.length <= 1) return; // keep at least 1 saved location
      const next = savedLocations.filter(
        (s) => s.id !== activeLoc.id && !(Math.abs(s.lat - activeLoc.lat) < 0.02 && Math.abs(s.lon - activeLoc.lon) < 0.02)
      );
      setSavedLocations(next);
    } else {
      setSavedLocations((prev) => [...prev, activeLoc]);
    }
  };

  const removeSavedLocation = (locId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedLocations.length <= 1) return;
    const next = savedLocations.filter((s) => s.id !== locId);
    setSavedLocations(next);
    if (activeLoc.id === locId && next.length > 0) {
      setActiveLoc(next[0]);
    }
  };

  const fmtTemp = (c: number) => (unit === 'C' ? Math.round(c) : Math.round((c * 9) / 5 + 32));

  // Compute 3x3 slippy map tiles around activeLoc (lat, lon)
  const tileGrid = useMemo(() => {
    const exactX = lon2tile(activeLoc.lon, mapZoom);
    const exactY = lat2tile(activeLoc.lat, mapZoom);
    const centerTileX = Math.floor(exactX);
    const centerTileY = Math.floor(exactY);
    const offsetX = (exactX - centerTileX) * 256;
    const offsetY = (exactY - centerTileY) * 256;
    const maxTile = Math.pow(2, mapZoom);

    const tiles: Array<{ dx: number; dy: number; x: number; y: number; z: number }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = ((centerTileX + dx) % maxTile + maxTile) % maxTile;
        const ty = Math.max(0, Math.min(maxTile - 1, centerTileY + dy));
        tiles.push({ dx, dy, x: tx, y: ty, z: mapZoom });
      }
    }
    return { tiles, offsetX, offsetY };
  }, [activeLoc.lat, activeLoc.lon, mapZoom]);

  const radarFrames = weather?.radar?.frames || [];
  const activeRadarFrame = radarFrames[radarFrameIdx] || radarFrames[radarFrames.length - 1];
  const radarHost = weather?.radar?.host || 'https://tilecache.rainviewer.com';

  const lastSyncStr = weather?.serverTimestamp
    ? new Date(weather.serverTimestamp).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  const nextMin = Math.floor(countdownSec / 60);
  const nextSec = String(countdownSec % 60).padStart(2, '0');

  return (
    <div
      className={`h-full flex flex-col overflow-hidden select-none ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950/90 text-white'
      }`}
    >
      {/* Top Bar: Location Search, Saved Locations, View Tabs, 5-Min Sync Status */}
      <div
        className={`px-4 py-3 border-b flex flex-col gap-2.5 shrink-0 ${
          isLight ? 'bg-white/80 border-slate-200' : 'bg-slate-900/70 border-white/10'
        } backdrop-blur-xl`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Location Search Form */}
          <form onSubmit={handleSearch} className="relative flex items-center gap-1.5 flex-1 min-w-[220px] max-w-md">
            <div
              className={`flex items-center gap-2 flex-1 px-3 py-1.5 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/40 border-white/15'
              }`}
            >
              <Icon name="Search" size={14} className="opacity-60 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setSearchResults([]);
                }}
                placeholder="都市名・地域を検索 (例: 横浜, 京都, 仙台, London)..."
                className="w-full bg-transparent text-xs outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="opacity-50 hover:opacity-100 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searching}
              style={{ backgroundColor: resolvedAccentHex }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-950 hover:brightness-110 transition cursor-pointer shrink-0"
            >
              {searching ? '検索中' : '検索'}
            </button>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div
                className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-2xl overflow-hidden max-h-60 overflow-y-auto ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/15'
                }`}
              >
                {searchResults.map((loc) => {
                  const alreadySaved = savedLocations.some((s) => s.id === loc.id);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setActiveLoc(loc);
                        setSearchResults([]);
                        setSearchQuery('');
                      }}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs cursor-pointer border-b last:border-b-0 ${
                        isLight
                          ? 'hover:bg-slate-100 border-slate-100'
                          : 'hover:bg-white/10 border-white/5'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{loc.name}</div>
                        {loc.region && <div className="text-[10px] opacity-60">{loc.region}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!alreadySaved) {
                            setSavedLocations((prev) => [...prev, loc]);
                          }
                          setActiveLoc(loc);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        style={
                          alreadySaved
                            ? undefined
                            : { backgroundColor: resolvedAccentHex, color: '#0f172a' }
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          alreadySaved ? 'bg-emerald-500/20 text-emerald-400' : ''
                        }`}
                      >
                        {alreadySaved ? '登録済み' : '＋ 地点登録'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </form>

          {/* View Switcher & Server Update Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`flex p-0.5 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab('forecast')}
                style={
                  activeTab === 'forecast'
                    ? { backgroundColor: resolvedAccentHex, color: '#0f172a' }
                    : undefined
                }
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'forecast' ? '' : 'opacity-70 hover:opacity-100'
                }`}
              >
                天気予報
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('radar')}
                style={
                  activeTab === 'radar'
                    ? { backgroundColor: resolvedAccentHex, color: '#0f172a' }
                    : undefined
                }
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'radar' ? '' : 'opacity-70 hover:opacity-100'
                }`}
              >
                雨雲レーダー・マップ
              </button>
            </div>

            {/* 3D Dynamic Sky Background Toggle */}
            <button
              type="button"
              onClick={() => setShow3dSky((v) => !v)}
              style={show3dSky ? { borderColor: resolvedAccentHex, color: resolvedAccentHex } : undefined}
              className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                show3dSky
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400/40 shadow-sm'
                  : isLight
                  ? 'bg-slate-100 border-slate-200 opacity-60 hover:opacity-100'
                  : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
              }`}
              title="Three.js 3D動的天空・気象背景の表示/非表示を切り替え"
            >
              <span>3D天球: {show3dSky ? 'ON' : 'OFF'}</span>
            </button>

            {show3dSky && (
              <button
                type="button"
                onClick={() => setWiperActive((v) => !v)}
                className={`px-2 py-1 rounded-xl border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition ${
                  wiperActive
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/30'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 opacity-50'
                    : 'bg-white/5 border-white/10 opacity-50'
                }`}
                title="ワイパー効果のON/OFF"
              >
                <span>ワイパー {wiperActive ? '✓' : '—'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
              className={`px-2.5 py-1 rounded-xl border text-xs font-bold cursor-pointer ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
              }`}
            >
              °{unit}
            </button>

            <button
              type="button"
              onClick={() => fetchWeatherForLocation(activeLoc, true)}
              disabled={loading}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-medium flex items-center gap-1.5 cursor-pointer ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              title="5分ごとにサーバーから自動更新されます（クリックで手動更新）"
            >
              <Icon name="RefreshCw" size={12} className={loading ? 'animate-spin' : ''} />
              <span>
                {lastSyncStr} 更新 (次回 {nextMin}:{nextSec})
              </span>
            </button>
          </div>
        </div>

        {/* Registered Locations Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[11px] opacity-60 shrink-0 mr-1">登録地点:</span>
          {savedLocations.map((loc) => {
            const isActive =
              loc.id === activeLoc.id ||
              (Math.abs(loc.lat - activeLoc.lat) < 0.02 && Math.abs(loc.lon - activeLoc.lon) < 0.02);
            return (
              <div
                key={loc.id}
                onClick={() => setActiveLoc(loc)}
                style={
                  isActive
                    ? { backgroundColor: resolvedAccentHex, color: '#0f172a' }
                    : undefined
                }
                className={`group flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'shadow-sm'
                    : isLight
                    ? 'bg-slate-200/70 hover:bg-slate-300/70 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 text-white/80'
                }`}
              >
                <span>{loc.name}</span>
                {savedLocations.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => removeSavedLocation(loc.id, e)}
                    className={`opacity-50 hover:opacity-100 text-[10px] leading-none px-0.5 rounded cursor-pointer ${
                      isActive ? 'text-slate-900' : ''
                    }`}
                    title={`${loc.name} を登録解除`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {!isLocationSaved && (
            <button
              type="button"
              onClick={toggleSaveActiveLocation}
              style={{ borderColor: resolvedAccentHex, color: resolvedAccentHex }}
              className="px-2.5 py-1 rounded-xl border text-xs font-bold shrink-0 cursor-pointer hover:bg-white/5"
            >
              ＋ 「{activeLoc.name}」を地点登録
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 overflow-hidden">
        {/* 3D Dynamic Sky Background Layer */}
        {show3dSky && (
          <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden opacity-90">
            <VintageAndroidWeatherSky
              condition={conditionKey}
              enableWiper={wiperActive}
              className="w-full h-full"
            />
          </div>
        )}

        <div className="relative z-10 h-full overflow-y-auto p-4 space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {activeTab === 'forecast' ? (
          <>
            {/* Current Weather Summary Card */}
            <div
              className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl select-none">{weather?.icon || '⛅'}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{activeLoc.name}</h2>
                    {activeLoc.region && (
                      <span className="text-xs opacity-60">{activeLoc.region}</span>
                    )}
                    <button
                      type="button"
                      onClick={toggleSaveActiveLocation}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        isLocationSaved
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'border-white/20 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {isLocationSaved ? '★ 登録地点' : '☆ 地点登録'}
                    </button>
                  </div>
                  <div className="text-sm opacity-80 mt-0.5">
                    {weather?.condition || '取得中...'} ・ 最高 {fmtTemp(weather?.high ?? 22)}°{unit} / 最低{' '}
                    {fmtTemp(weather?.low ?? 14)}°{unit}
                  </div>
                  <div className="text-[11px] opacity-55 mt-1 font-mono">
                    緯度 {activeLoc.lat.toFixed(2)}° / 経度 {activeLoc.lon.toFixed(2)}° ・ 5分自動更新サーバー接続中
                  </div>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tight">
                  {fmtTemp(weather?.temp ?? 20)}°{unit}
                </span>
                <span className="text-xs opacity-65">
                  体感 {fmtTemp(weather?.feelsLike ?? 19)}°{unit}
                </span>
              </div>
            </div>

            {/* Key Weather Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { label: '湿度', value: `${weather?.humidity ?? 55}%`, sub: '相対湿度' },
                { label: '風速', value: `${weather?.wind ?? 8} km/h`, sub: `風向 ${weather?.windDirection ?? 180}°` },
                { label: '気圧', value: `${weather?.pressure ?? 1013} hPa`, sub: '海面更正気圧' },
                { label: '降水量', value: `${weather?.precipitation ?? 0} mm`, sub: '直近1時間' },
                { label: 'UV指数', value: `${weather?.uvIndex ?? 4}`, sub: (weather?.uvIndex ?? 4) >= 6 ? '強い' : '中程度' },
                { label: '日の出 / 日の入り', value: `${weather?.sunrise ?? '05:45'}`, sub: `日没 ${weather?.sunset ?? '18:15'}` },
              ].map((m) => (
                <div
                  key={m.label}
                  className={`p-3 rounded-xl border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div className="text-[11px] opacity-60">{m.label}</div>
                  <div className="text-base font-bold mt-1">{m.value}</div>
                  <div className="text-[10px] opacity-50 mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Hourly Forecast (24 Hours) */}
            <div
              className={`p-4 rounded-2xl border ${
                isLight ? 'bg-white border-slate-200' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold">時間ごとの天気予報 (24時間)</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('radar')}
                  style={{ color: resolvedAccentHex }}
                  className="text-xs font-bold hover:underline cursor-pointer"
                >
                  雨雲レーダーを見る →
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {(Array.isArray(weather?.hourly) && weather.hourly.length > 0
                  ? weather.hourly
                  : Array.from({ length: 12 }, (_, i) => ({
                      time: `${(new Date().getHours() + i) % 24}:00`,
                      temp: 20 - Math.sin(i / 3) * 3,
                      precipProb: 10,
                      precipMm: 0,
                      windSpeed: 6,
                      icon: '⛅',
                      condition: '晴れ',
                    }))
                ).map((h, i) => (
                  <div
                    key={`${h.time}-${i}`}
                    className={`min-w-[74px] p-2.5 rounded-xl border flex flex-col items-center gap-1 shrink-0 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/25 border-white/10'
                    }`}
                  >
                    <span className="text-[11px] opacity-65 font-mono">{i === 0 ? '現在' : h.time}</span>
                    <span className="text-xl my-0.5">{h.icon}</span>
                    <span className="text-xs font-bold">
                      {fmtTemp(h.temp)}°{unit}
                    </span>
                    <span className="text-[10px] text-sky-400 font-mono">💧{h.precipProb}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-Day Forecast */}
            <div
              className={`p-4 rounded-2xl border ${
                isLight ? 'bg-white border-slate-200' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <h3 className="text-xs font-bold mb-3">週間天気予報 (7日間)</h3>
              <div className="divide-y divide-white/10">
                {(Array.isArray(weather?.daily) ? weather.daily : []).map((d) => (
                  <div key={d.date} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="w-24 font-bold">
                      {d.day}{' '}
                      <span className="text-[10px] opacity-50 font-mono">{d.date.slice(5)}</span>
                    </div>
                    <div className="flex items-center gap-2 w-32">
                      <span className="text-lg">{d.icon}</span>
                      <span className="opacity-85 truncate">{d.condition}</span>
                    </div>
                    <div className="w-20 text-sky-400 font-mono text-[11px]">
                      降水 {d.precipProb}%
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="opacity-60">{fmtTemp(d.low)}°</span>
                      <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(25, (d.high - d.low) * 6))}%`,
                            backgroundColor: resolvedAccentHex,
                          }}
                        />
                      </div>
                      <span className="font-bold">{fmtTemp(d.high)}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Rain Cloud Radar & Weather Map View */
          <div className="space-y-3">
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-white border-slate-200' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">
                    {activeLoc.name} 周辺の雨雲レーダー・気象マップ
                  </h3>
                  <p className="text-[11px] opacity-60">
                    OpenStreetMap 地図タイル ＋ RainViewer 降水レーダーオーバーレイ（5分周期自動更新）
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showWindOverlay}
                      onChange={(e) => setShowWindOverlay(e.target.checked)}
                    />
                    <span>風向・気象情報表示</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMapZoom((z) => Math.max(4, z - 1))}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                    >
                      － 縮小
                    </button>
                    <span className="text-xs font-mono px-1.5">Zoom {mapZoom}</span>
                    <button
                      type="button"
                      onClick={() => setMapZoom((z) => Math.min(10, z + 1))}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                    >
                      ＋ 拡大
                    </button>
                  </div>
                </div>
              </div>

              {/* Map Viewport (3x3 256px Tiles = 768x768 centered on location) */}
              <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-white/15 bg-slate-900">
                <div
                  className="absolute"
                  style={{
                    width: 768,
                    height: 768,
                    left: `calc(50% - ${256 + tileGrid.offsetX}px)`,
                    top: `calc(50% - ${256 + tileGrid.offsetY}px)`,
                  }}
                >
                  {tileGrid.tiles.map((t) => (
                    <React.Fragment key={`${t.z}-${t.x}-${t.y}`}>
                      {/* Base Map Tile */}
                      <img
                        src={`https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`}
                        alt=""
                        className="absolute w-[256px] h-[256px] select-none pointer-events-none"
                        style={{
                          left: (t.dx + 1) * 256,
                          top: (t.dy + 1) * 256,
                          filter: isLight ? 'none' : 'invert(90%) hue-rotate(180deg) brightness(88%) contrast(92%)',
                        }}
                      />
                      {/* RainViewer Precipitation Radar Tile Overlay */}
                      {activeRadarFrame?.path && (
                        <img
                          src={`${radarHost}${activeRadarFrame.path}/256/${t.z}/${t.x}/${t.y}/2/1_1.png`}
                          alt=""
                          className="absolute w-[256px] h-[256px] select-none pointer-events-none transition-opacity duration-300"
                          style={{
                            left: (t.dx + 1) * 256,
                            top: (t.dy + 1) * 256,
                            opacity: radarOpacity,
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Center Location Marker */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                  <div
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-950 shadow-lg mb-1 whitespace-nowrap"
                  >
                    {activeLoc.name} {fmtTemp(weather?.temp ?? 20)}°{unit} ({weather?.condition || '晴れ'})
                  </div>
                  <div
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
                  />
                </div>

                {/* Weather Telemetry HUD on Map */}
                {showWindOverlay && (
                  <div className="absolute top-3 left-3 z-20 p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 text-white text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>🌧️ 降水量: {weather?.precipitation ?? 0} mm/h</span>
                    </div>
                    <div className="opacity-80">
                      💨 風速: {weather?.wind ?? 8} km/h (風向 {weather?.windDirection ?? 180}°)
                    </div>
                    <div className="opacity-80">
                      💧 湿度: {weather?.humidity ?? 55}% / 気圧: {weather?.pressure ?? 1013} hPa
                    </div>
                  </div>
                )}

                {/* Rain Intensity Legend */}
                <div className="absolute bottom-3 right-3 z-20 px-3 py-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 text-white text-[10px] flex items-center gap-2">
                  <span>雨雲強度:</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-400/40">弱</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/60">中</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/70">強</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-600/80">激しい雨</span>
                </div>
              </div>

              {/* Radar Timeline Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRadarPlaying(!radarPlaying)}
                    style={{ backgroundColor: resolvedAccentHex }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-950 cursor-pointer"
                  >
                    {radarPlaying ? '⏸ 一時停止' : '▶ 雨雲の動きを再生'}
                  </button>
                  <span className="text-xs font-mono opacity-80">
                    {activeRadarFrame?.time
                      ? new Date(activeRadarFrame.time * 1000).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '現在時刻'}
                  </span>
                </div>

                {radarFrames.length > 1 && (
                  <input
                    type="range"
                    min={0}
                    max={radarFrames.length - 1}
                    value={radarFrameIdx}
                    onChange={(e) => {
                      setRadarPlaying(false);
                      setRadarFrameIdx(Number(e.target.value));
                    }}
                    className="flex-1 min-w-[140px] cursor-pointer"
                  />
                )}

                <div className="flex items-center gap-2 text-xs">
                  <span className="opacity-65">レーダー透過度</span>
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={radarOpacity}
                    onChange={(e) => setRadarOpacity(Number(e.target.value))}
                    className="w-24 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
