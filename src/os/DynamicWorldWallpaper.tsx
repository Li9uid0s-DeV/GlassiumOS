import React, { useEffect, useRef, useState } from 'react';
import { fetchMultiSourceWeatherConsensus } from './weatherConsensus';
import { getRustCore, isRustWasmActive } from './rustWasmCore';

export type DynamicTimeOfDay = 'auto' | 'dawn' | 'day' | 'dusk' | 'night';
export type DynamicWeatherMode =
  | 'auto'
  | 'Sunny'
  | 'PartlyCloudy'
  | 'Cloudy'
  | 'LightRain'
  | 'Rainy'
  | 'HeavyRain'
  | 'Thunderstorm'
  | 'Fog'
  | 'Snow'
  | 'HeavySnow'
  | 'Sunshower'
  | 'Aurora';
export type DynamicSeasonMode = 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';
export type DynamicEventMode = 'auto' | 'none' | 'halloween' | 'christmas' | 'newyear' | 'tanabata';
export type WindCompassDir = 'W→E' | 'NW→SE' | 'SW→NE' | 'E→W' | 'NE→SW' | 'SE→NW' | 'N→S' | 'S→N';
export type DynamicTerrainType = 'auto' | 'urban' | 'suburban-plains' | 'mountain';

export interface DynamicLocationPreset {
  id: string;
  labelJa: string;
  query: string;
  terrain: Exclude<DynamicTerrainType, 'auto'>;
  descJa: string;
}

export const DYNAMIC_LOCATION_PRESETS: DynamicLocationPreset[] = [
  {
    id: 'saitama',
    labelJa: '🌾 埼玉・関東平野 (郊外・原野)',
    query: 'Saitama',
    terrain: 'suburban-plains',
    descJa: '遠くに山並みが見え、手前に広い原っぱ・田園と家が点在する風景',
  },
  {
    id: 'tokyo',
    labelJa: '🏙️ 東京・都心 (高層ビル・都市部)',
    query: 'Tokyo',
    terrain: 'urban',
    descJa: '高層ビル群とタワー、多くの住宅が立ち並ぶ大都市の風景',
  },
  {
    id: 'yokohama',
    labelJa: '🏙️ 横浜・みなとみらい (都市部)',
    query: 'Yokohama',
    terrain: 'urban',
    descJa: '近代的なビル群と市街地が広がる都市風景',
  },
  {
    id: 'osaka',
    labelJa: '🏙️ 大阪・梅田 (都市部・ビル街)',
    query: 'Osaka',
    terrain: 'urban',
    descJa: '高層ビルと密集した街並みが広がる都市風景',
  },
  {
    id: 'tsukuba',
    labelJa: '🌾 茨城・つくば (遠い山と広い平原)',
    query: 'Tsukuba',
    terrain: 'suburban-plains',
    descJa: '地平線に遠い山を望む広大な原野と郊外の街並み',
  },
  {
    id: 'nagano',
    labelJa: '⛰️ 長野・日本アルプス (山岳地帯)',
    query: 'Nagano',
    terrain: 'mountain',
    descJa: '幾重にも連なる険しい山々と深い森・山里の風景',
  },
  {
    id: 'fuji',
    labelJa: '⛰️ 山梨・富士山麓 (山岳・高原)',
    query: 'Fujiyoshida',
    terrain: 'mountain',
    descJa: '雄大な山岳稜線と針葉樹林が広がる山の風景',
  },
  {
    id: 'shirakawago',
    labelJa: '⛰️ 岐阜・飛騨白川郷 (深い山里)',
    query: 'Takayama',
    terrain: 'mountain',
    descJa: '急峻な山々に囲まれた山里・豪雪地帯の風景',
  },
  {
    id: 'sapporo',
    labelJa: '🏙️ 北海道・札幌 (北の都市)',
    query: 'Sapporo',
    terrain: 'urban',
    descJa: '北国のビル街と住宅が並ぶ都市風景',
  },
  {
    id: 'custom',
    labelJa: '📍 カスタム場所指定',
    query: 'Saitama',
    terrain: 'suburban-plains',
    descJa: '任意の都市名・地域名を入力して天候と地形を連動',
  },
];

export interface DynamicEnvironmentConfig {
  timeOfDay: DynamicTimeOfDay;
  weather: DynamicWeatherMode;
  season: DynamicSeasonMode;
  event: DynamicEventMode;
  windSpeedMs: number; // 0 to 35 m/s
  windDirection: WindCompassDir;
  autoSyncLiveWeather: boolean;
  locationId: string;
  customLocationName: string;
  terrainType: DynamicTerrainType;
  snowAccumulation: number; // 0 to 100 (%)
  autoSnowAccumulate: boolean;
  audioReactiveEnabled?: boolean;
}

const STORAGE_KEY = 'glasis_dynamic_world_wallpaper_v2';

const DEFAULT_CONFIG: DynamicEnvironmentConfig = {
  timeOfDay: 'auto',
  weather: 'auto',
  season: 'auto',
  event: 'auto',
  windSpeedMs: 6.0,
  windDirection: 'W→E',
  autoSyncLiveWeather: true,
  locationId: 'saitama',
  customLocationName: 'Saitama',
  terrainType: 'auto',
  snowAccumulation: 0,
  autoSnowAccumulate: true,
  audioReactiveEnabled: true,
};

export function inferTerrainFromLocationName(name: string): Exclude<DynamicTerrainType, 'auto'> {
  const n = (name || '').toLowerCase();
  if (
    n.includes('tokyo') ||
    n.includes('東京') ||
    n.includes('新宿') ||
    n.includes('渋谷') ||
    n.includes('osaka') ||
    n.includes('大阪') ||
    n.includes('yokohama') ||
    n.includes('横浜') ||
    n.includes('nagoya') ||
    n.includes('名古屋') ||
    n.includes('fukuoka') ||
    n.includes('福岡') ||
    n.includes('sapporo') ||
    n.includes('札幌') ||
    n.includes('sendai') ||
    n.includes('仙台') ||
    n.includes('kobe') ||
    n.includes('神戸')
  ) {
    return 'urban';
  }
  if (
    n.includes('nagano') ||
    n.includes('長野') ||
    n.includes('松本') ||
    n.includes('軽井沢') ||
    n.includes('白馬') ||
    n.includes('fuji') ||
    n.includes('富士') ||
    n.includes('山梨') ||
    n.includes('箱根') ||
    n.includes('日光') ||
    n.includes('飛騨') ||
    n.includes('高山') ||
    n.includes('白川') ||
    n.includes('alps') ||
    n.includes('山') ||
    n.includes('蔵王') ||
    n.includes('阿蘇')
  ) {
    return 'mountain';
  }
  return 'suburban-plains';
}

export function resolveEffectiveTerrain(cfg: DynamicEnvironmentConfig): Exclude<DynamicTerrainType, 'auto'> {
  if (cfg.terrainType !== 'auto') return cfg.terrainType;
  if (cfg.locationId === 'custom') {
    return inferTerrainFromLocationName(cfg.customLocationName);
  }
  const preset = DYNAMIC_LOCATION_PRESETS.find((p) => p.id === cfg.locationId);
  return preset ? preset.terrain : 'suburban-plains';
}

export function resolveEffectiveLocationQuery(cfg: DynamicEnvironmentConfig): {
  query: string;
  displayLabel: string;
} {
  if (cfg.locationId === 'custom') {
    const q = cfg.customLocationName.trim() || 'Saitama';
    return { query: q, displayLabel: q };
  }
  const preset = DYNAMIC_LOCATION_PRESETS.find((p) => p.id === cfg.locationId) || DYNAMIC_LOCATION_PRESETS[0];
  return {
    query: preset.query,
    displayLabel: preset.labelJa.replace(/^[^\s]+\s/, ''),
  };
}

export function loadDynamicEnvironmentConfig(): DynamicEnvironmentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('glasis_dynamic_world_wallpaper_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
}

export function saveDynamicEnvironmentConfig(cfg: DynamicEnvironmentConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('glasis-dynamic-env-changed', { detail: cfg }));
    window.dispatchEvent(new CustomEvent('glassium-dynamic-world-change', { detail: cfg }));
  } catch {
    // ignore
  }
}

export type DynamicWorldWallpaperConfig = DynamicEnvironmentConfig;
export const loadDynamicWorldConfig = loadDynamicEnvironmentConfig;
export const saveDynamicWorldConfig = saveDynamicEnvironmentConfig;

function resolveAutoTimeOfDay(now: Date): Exclude<DynamicTimeOfDay, 'auto'> {
  const hr = now.getHours();
  if (hr >= 5 && hr < 8) return 'dawn';
  if (hr >= 8 && hr < 16) return 'day';
  if (hr >= 16 && hr < 19) return 'dusk';
  return 'night';
}

function resolveAutoSeason(now: Date): Exclude<DynamicSeasonMode, 'auto'> {
  const m = now.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function resolveAutoEvent(now: Date): Exclude<DynamicEventMode, 'auto'> {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (m === 10 && d >= 15) return 'halloween';
  if (m === 12 && d >= 1 && d <= 26) return 'christmas';
  if ((m === 12 && d >= 27) || (m === 1 && d <= 7)) return 'newyear';
  if (m === 7 && d >= 1 && d <= 10) return 'tanabata';
  return 'none';
}

function getWindVector(
  dir: WindCompassDir,
  speedMs: number
): { vx: number; vy: number; deg: number; labelJa: string } {
  const s = Math.max(0, Math.min(35, speedMs));
  switch (dir) {
    case 'W→E':
      return { vx: 1.0 * s, vy: 0.05 * s, deg: 0, labelJa: '西風 (左→右)' };
    case 'NW→SE':
      return { vx: 0.82 * s, vy: 0.35 * s, deg: 24, labelJa: '北西風 (左上→右下)' };
    case 'SW→NE':
      return { vx: 0.82 * s, vy: -0.25 * s, deg: -18, labelJa: '南西風 (左下→右上)' };
    case 'E→W':
      return { vx: -1.0 * s, vy: 0.05 * s, deg: 180, labelJa: '東風 (右→左)' };
    case 'NE→SW':
      return { vx: -0.82 * s, vy: 0.35 * s, deg: 156, labelJa: '北東風 (右上→左下)' };
    case 'SE→NW':
      return { vx: -0.82 * s, vy: -0.25 * s, deg: -162, labelJa: '南東風 (右下→左上)' };
    case 'N→S':
      return { vx: 0.15 * s, vy: 0.65 * s, deg: 78, labelJa: '北風 (上→下)' };
    case 'S→N':
      return { vx: 0.15 * s, vy: -0.45 * s, deg: -78, labelJa: '南風 (下→上)' };
  }
}

export const WEATHER_MODE_LABELS: Record<Exclude<DynamicWeatherMode, 'auto'>, string> = {
  Sunny: '☀️ 快晴',
  PartlyCloudy: '🌤️ 晴れ時々曇り',
  Cloudy: '☁️ 曇天',
  LightRain: '🌦️ 小雨・霧雨',
  Rainy: '🌧️ 雨',
  HeavyRain: '⛈️ 豪雨・暴風雨',
  Thunderstorm: '⚡ 雷雨・稲妻',
  Fog: '🌫️ 霧・濃霧',
  Snow: '❄️ 雪',
  HeavySnow: '🌨️ 大雪・吹雪',
  Sunshower: '🌈 天気雨・虹',
  Aurora: '🌌 オーロラ',
};

interface EnvParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  phase: number;
  rot: number;
  rotSpeed: number;
  colorIndex: number;
}

export function DynamicWorldWallpaper({
  showControllerHud = true,
}: {
  showControllerHud?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<DynamicEnvironmentConfig>(() => loadDynamicEnvironmentConfig());
  const [liveWeatherCondition, setLiveWeatherCondition] =
    useState<Exclude<DynamicWeatherMode, 'auto'>>('Sunny');
  const [liveTempC, setLiveTempC] = useState<number>(19);
  const [hudExpanded, setHudExpanded] = useState<boolean>(false);
  const [customInputDraft, setCustomInputDraft] = useState<string>(config.customLocationName || 'Saitama');
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const wasmReady = isRustWasmActive();

  const updateConfig = (patch: Partial<DynamicEnvironmentConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveDynamicEnvironmentConfig(next);
      return next;
    });
  };

  useEffect(() => {
    const onExternalUpdate = (e: Event) => {
      const detail = (e as CustomEvent<DynamicEnvironmentConfig>).detail;
      if (detail) {
        setConfig((prev) => ({ ...prev, ...detail }));
        if (detail.customLocationName) setCustomInputDraft(detail.customLocationName);
      }
    };
    window.addEventListener('glasis-dynamic-env-changed', onExternalUpdate);
    return () => window.removeEventListener('glasis-dynamic-env-changed', onExternalUpdate);
  }, []);

  // Clock tick for real-time time-of-day & seasonal event detection
  useEffect(() => {
    const id = window.setInterval(() => setNowDate(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const locInfo = resolveEffectiveLocationQuery(config);
  const effectiveTerrain = resolveEffectiveTerrain(config);

  // Fetch live weather consensus for the configured location
  useEffect(() => {
    let active = true;
    const syncWeather = async () => {
      try {
        const res = await fetchMultiSourceWeatherConsensus(locInfo.query);
        if (!active || !res) return;
        const cond = res.consensusCondition;
        if (
          cond === 'Sunny' ||
          cond === 'PartlyCloudy' ||
          cond === 'Cloudy' ||
          cond === 'Rainy' ||
          cond === 'Thunderstorm' ||
          cond === 'Snow' ||
          cond === 'Aurora'
        ) {
          setLiveWeatherCondition(cond);
        }
        setLiveTempC(res.consensusTemp);
        if (config.autoSyncLiveWeather) {
          const windMs = Math.max(1.5, Math.min(28, Math.round((res.windSpeed / 3.6) * 10) / 10));
          setConfig((prev) => {
            if (!prev.autoSyncLiveWeather) return prev;
            return { ...prev, windSpeedMs: windMs };
          });
        }
      } catch {
        // ignore
      }
    };
    syncWeather();
    const timer = window.setInterval(syncWeather, 180000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [locInfo.query, config.autoSyncLiveWeather]);

  const effectiveTime =
    config.timeOfDay === 'auto' ? resolveAutoTimeOfDay(nowDate) : config.timeOfDay;
  const effectiveSeason =
    config.season === 'auto' ? resolveAutoSeason(nowDate) : config.season;
  const effectiveEvent =
    config.event === 'auto' ? resolveAutoEvent(nowDate) : config.event;
  const effectiveWeather: Exclude<DynamicWeatherMode, 'auto'> =
    effectiveEvent === 'christmas' && config.weather === 'auto'
      ? 'Snow'
      : config.weather === 'auto'
      ? liveWeatherCondition
      : config.weather;

  // Automatic gradual snow accumulation when snowing (or gradual melt when warm & sunny)
  useEffect(() => {
    if (!config.autoSnowAccumulate) return;
    const isSnowingNow = effectiveWeather === 'Snow' || effectiveWeather === 'HeavySnow';
    const isWinterCold = effectiveSeason === 'winter' || effectiveEvent === 'christmas';
    const timer = window.setInterval(() => {
      setConfig((prev) => {
        if (!prev.autoSnowAccumulate) return prev;
        let nextSnow = prev.snowAccumulation;
        if (effectiveWeather === 'HeavySnow') {
          nextSnow = Math.min(100, +(prev.snowAccumulation + 2.5).toFixed(1));
        } else if (isSnowingNow) {
          nextSnow = Math.min(100, +(prev.snowAccumulation + 1.2).toFixed(1));
        } else if (!isWinterCold && (effectiveWeather === 'Sunny' || effectiveWeather === 'Sunshower') && prev.snowAccumulation > 0) {
          nextSnow = Math.max(0, +(prev.snowAccumulation - 0.5).toFixed(1));
        }
        if (nextSnow === prev.snowAccumulation) return prev;
        const updated = { ...prev, snowAccumulation: nextSnow };
        saveDynamicEnvironmentConfig(updated);
        return updated;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [config.autoSnowAccumulate, effectiveWeather, effectiveSeason, effectiveEvent]);

  const windVec = getWindVector(config.windDirection, config.windSpeedMs);
  const musicPlayingRef = useRef(false);

  useEffect(() => {
    const onMusic = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        musicPlayingRef.current = Boolean(detail.isPlaying);
      }
    };
    window.addEventListener('glassium-music-state', onMusic);
    return () => window.removeEventListener('glassium-music-state', onMusic);
  }, []);

  // Broadcast Weather & Precipitation Alert Pill State to OS Top Pill Bar
  useEffect(() => {
    const isPrecipitation =
      effectiveWeather === 'LightRain' ||
      effectiveWeather === 'Rainy' ||
      effectiveWeather === 'HeavyRain' ||
      effectiveWeather === 'Thunderstorm' ||
      effectiveWeather === 'Snow' ||
      effectiveWeather === 'HeavySnow' ||
      effectiveWeather === 'Sunshower';
    window.dispatchEvent(
      new CustomEvent('glassium-weather-pill-state', {
        detail: {
          active: isPrecipitation || config.snowAccumulation >= 25,
          location: locInfo.displayLabel,
          weather: effectiveWeather,
          weatherLabel: WEATHER_MODE_LABELS[effectiveWeather] || effectiveWeather,
          tempC: liveTempC,
          snowAccumulation: Math.round(config.snowAccumulation),
          alertText:
            effectiveWeather === 'HeavySnow'
              ? '大雪・吹雪アラート'
              : effectiveWeather === 'Snow'
              ? '降雪・路面凍結注意'
              : effectiveWeather === 'Thunderstorm'
              ? '雷雨・強風アラート'
              : effectiveWeather === 'HeavyRain'
              ? '豪雨アラート'
              : isPrecipitation
              ? '降水アラート (傘推奨)'
              : `積雪 ${Math.round(config.snowAccumulation)}%`,
        },
      })
    );
  }, [effectiveWeather, locInfo.displayLabel, liveTempC, config.snowAccumulation]);

  // Store latest resolved state in ref for 60fps canvas animation loop
  const stateRef = useRef({
    effectiveTime,
    effectiveSeason,
    effectiveEvent,
    effectiveWeather,
    effectiveTerrain,
    snowAccumulation: config.snowAccumulation,
    windSpeedMs: config.windSpeedMs,
    windDirection: config.windDirection,
    windVec,
    audioReactiveEnabled: config.audioReactiveEnabled !== false,
  });

  useEffect(() => {
    stateRef.current = {
      effectiveTime,
      effectiveSeason,
      effectiveEvent,
      effectiveWeather,
      effectiveTerrain,
      snowAccumulation: config.snowAccumulation,
      windSpeedMs: config.windSpeedMs,
      windDirection: config.windDirection,
      windVec,
      audioReactiveEnabled: config.audioReactiveEnabled !== false,
    };
  }, [
    effectiveTime,
    effectiveSeason,
    effectiveEvent,
    effectiveWeather,
    effectiveTerrain,
    config.snowAccumulation,
    config.windSpeedMs,
    config.windDirection,
    windVec,
    config.audioReactiveEnabled,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rustCore = getRustCore();
    let width = (canvas.width = Math.max(320, window.innerWidth || 1280));
    let height = (canvas.height = Math.max(240, window.innerHeight || 720));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = Math.max(320, window.innerWidth || 1280);
      height = canvas.height = Math.max(240, window.innerHeight || 720);
    };
    window.addEventListener('resize', handleResize);

    // Initialize 240 multi-depth particles for rich snow/rain/petals
    const PARTICLE_COUNT = 240;
    const particles: EnvParticle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.35 + (i % 10) * 0.08,
      size: 2.4 + (i % 7) * 1.35,
      phase: i * 0.73,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2.4,
      colorIndex: i % 4,
    }));

    // Initialize 11 volumetric cloud layers
    const clouds = Array.from({ length: 11 }, (_, i) => ({
      x: (i / 11) * width * 1.3 - width * 0.15,
      y: height * (0.08 + (i % 4) * 0.065),
      scale: 0.75 + (i % 3) * 0.35,
      speedFactor: 0.35 + (i % 4) * 0.18,
      seed: i * 13.7,
    }));

    // Initialize 110 background stars
    const stars = Array.from({ length: 110 }, (_, i) => ({
      xNorm: (rustCore.rust_hash_noise_2d(i * 1.3, 4.7) * 997) % 1,
      yNorm: ((rustCore.rust_hash_noise_2d(i * 2.9, 9.1) * 991) % 1) * 0.62,
      size: 0.8 + (i % 3) * 0.75,
      twinkleSpeed: 1.5 + (i % 5) * 0.6,
      phase: i * 1.1,
    }));

    let lightningFlash = 0;
    let lightningBoltX = width * 0.5;
    let santaX = -180;
    let rafId = 0;
    let prevTime = performance.now();

    const drawPitchedHouse = (
      hx: number,
      hy: number,
      w: number,
      h: number,
      roofH: number,
      wallColor: string,
      roofColor: string,
      litWindow: boolean,
      snowRatio: number
    ) => {
      // Wall
      ctx.fillStyle = wallColor;
      ctx.fillRect(hx - w * 0.5, hy - h, w, h);

      // Windows
      ctx.fillStyle = litWindow ? 'rgba(253, 224, 71, 0.88)' : 'rgba(148, 163, 184, 0.35)';
      const winW = Math.max(4, w * 0.18);
      const winH = Math.max(5, h * 0.28);
      ctx.fillRect(hx - w * 0.28, hy - h * 0.68, winW, winH);
      ctx.fillRect(hx + w * 0.1, hy - h * 0.68, winW, winH);

      // Pitched Roof
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(hx - w * 0.6, hy - h);
      ctx.lineTo(hx, hy - h - roofH);
      ctx.lineTo(hx + w * 0.6, hy - h);
      ctx.closePath();
      ctx.fill();

      // Roof Snow Cap proportional to snowRatio
      if (snowRatio > 0.02) {
        const snowThick = 2 + snowRatio * 9;
        ctx.fillStyle = `rgba(248, 250, 252, ${Math.min(0.98, 0.45 + snowRatio * 0.55).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(hx - w * 0.62, hy - h + 1);
        ctx.lineTo(hx, hy - h - roofH - snowThick * 0.65);
        ctx.lineTo(hx + w * 0.62, hy - h + 1);
        ctx.lineTo(hx + w * 0.52, hy - h + snowThick * 0.45);
        ctx.lineTo(hx, hy - h - roofH + snowThick * 0.35);
        ctx.lineTo(hx - w * 0.52, hy - h + snowThick * 0.45);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawScene = (now: number) => {
      rafId = requestAnimationFrame(drawScene);
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;
      const elapsed = now * 0.001;

      const {
        effectiveTime: tMode,
        effectiveSeason: sMode,
        effectiveEvent: eMode,
        effectiveWeather: wMode,
        effectiveTerrain: terrain,
        snowAccumulation,
        windSpeedMs: wSpeed,
        windVec: wVec,
      } = stateRef.current;

      const isRainyMode =
        wMode === 'LightRain' ||
        wMode === 'Rainy' ||
        wMode === 'HeavyRain' ||
        wMode === 'Thunderstorm' ||
        wMode === 'Sunshower';
      const isSnowyMode = wMode === 'Snow' || wMode === 'HeavySnow';
      const snowRatio = Math.max(
        0,
        Math.min(
          1,
          snowAccumulation / 100 +
            (wMode === 'HeavySnow' ? 0.25 : wMode === 'Snow' ? 0.12 : 0) +
            (sMode === 'winter' && snowAccumulation === 0 ? 0.18 : 0)
        )
      );
      const isNightLike = tMode === 'night' || tMode === 'dusk' || eMode === 'halloween' || eMode === 'christmas';

      // 1. SKY GRADIENT BY TIME OF DAY, WEATHER & EVENT
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (eMode === 'halloween') {
        skyGrad.addColorStop(0, '#0c041a');
        skyGrad.addColorStop(0.42, '#2b0f4c');
        skyGrad.addColorStop(0.76, '#7c2d12');
        skyGrad.addColorStop(1, '#ea580c');
      } else if (eMode === 'christmas') {
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.45, '#082f49');
        skyGrad.addColorStop(0.8, '#0f172a');
        skyGrad.addColorStop(1, '#1e293b');
      } else if (eMode === 'newyear') {
        skyGrad.addColorStop(0, '#1e1b4b');
        skyGrad.addColorStop(0.38, '#7c2d12');
        skyGrad.addColorStop(0.72, '#ea580c');
        skyGrad.addColorStop(1, '#fde047');
      } else if (wMode === 'HeavyRain' || wMode === 'Thunderstorm') {
        skyGrad.addColorStop(0, '#040814');
        skyGrad.addColorStop(0.5, '#0f172a');
        skyGrad.addColorStop(1, '#1e293b');
      } else if (wMode === 'Rainy' || wMode === 'Cloudy' || wMode === 'Fog') {
        const dark = tMode === 'night';
        skyGrad.addColorStop(0, dark ? '#060c1a' : '#334155');
        skyGrad.addColorStop(0.55, dark ? '#0f172a' : '#64748b');
        skyGrad.addColorStop(1, dark ? '#1e293b' : '#cbd5e1');
      } else if (tMode === 'dawn') {
        skyGrad.addColorStop(0, '#1e1b4b');
        skyGrad.addColorStop(0.4, '#6d28d9');
        skyGrad.addColorStop(0.74, '#f43f5e');
        skyGrad.addColorStop(1, '#fde047');
      } else if (tMode === 'day') {
        if (sMode === 'winter' || isSnowyMode) {
          skyGrad.addColorStop(0, '#0284c7');
          skyGrad.addColorStop(0.55, '#38bdf8');
          skyGrad.addColorStop(1, '#e0f2fe');
        } else {
          skyGrad.addColorStop(0, '#0369a1');
          skyGrad.addColorStop(0.5, '#0ea5e9');
          skyGrad.addColorStop(1, '#bae6fd');
        }
      } else if (tMode === 'dusk') {
        skyGrad.addColorStop(0, '#0f172a');
        skyGrad.addColorStop(0.38, '#4c1d95');
        skyGrad.addColorStop(0.72, '#e11d48');
        skyGrad.addColorStop(1, '#f59e0b');
      } else {
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.5, '#090d1e');
        skyGrad.addColorStop(1, '#111c38');
      }

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. STARFIELD & MILKY WAY
      const showStars =
        tMode === 'night' ||
        tMode === 'dusk' ||
        tMode === 'dawn' ||
        eMode === 'halloween' ||
        eMode === 'christmas' ||
        eMode === 'tanabata' ||
        wMode === 'Aurora';

      if (showStars && wMode !== 'Rainy' && wMode !== 'HeavyRain' && wMode !== 'Cloudy') {
        const starAlphaBase = tMode === 'night' || eMode === 'christmas' || eMode === 'tanabata' ? 0.9 : 0.45;
        for (const st of stars) {
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(elapsed * st.twinkleSpeed + st.phase));
          ctx.fillStyle = `rgba(255, 255, 255, ${(starAlphaBase * twinkle).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(st.xNorm * width, st.yNorm * height, st.size, 0, Math.PI * 2);
          ctx.fill();
        }

        if (eMode === 'tanabata') {
          ctx.save();
          const mwGrad = ctx.createLinearGradient(0, 0, width, height * 0.65);
          mwGrad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
          mwGrad.addColorStop(0.35, 'rgba(125, 211, 252, 0.22)');
          mwGrad.addColorStop(0.65, 'rgba(192, 132, 252, 0.24)');
          mwGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
          ctx.fillStyle = mwGrad;
          ctx.beginPath();
          ctx.ellipse(width * 0.5, height * 0.26, width * 0.55, height * 0.11, -0.22, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. AURORA BOREALIS OR SUNSHOWER RAINBOW
      if (wMode === 'Aurora' || eMode === 'christmas') {
        ctx.save();
        for (let band = 0; band < 3; band++) {
          ctx.beginPath();
          const baseY = height * (0.16 + band * 0.07);
          ctx.moveTo(0, baseY);
          for (let x = 0; x <= width; x += 28) {
            const wave =
              Math.sin(x * 0.004 + elapsed * (0.7 + wSpeed * 0.04) + band * 1.5) * 32 +
              Math.cos(x * 0.009 - elapsed * 0.5) * 16;
            ctx.lineTo(x, baseY + wave);
          }
          ctx.lineTo(width, baseY + 130);
          ctx.lineTo(0, baseY + 130);
          ctx.closePath();
          const aurGrad = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 130);
          if (band === 0) {
            aurGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
            aurGrad.addColorStop(0.4, 'rgba(52, 211, 153, 0.28)');
            aurGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
          } else if (band === 1) {
            aurGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
            aurGrad.addColorStop(0.45, 'rgba(168, 85, 247, 0.22)');
            aurGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');
          } else {
            aurGrad.addColorStop(0, 'rgba(244, 63, 94, 0)');
            aurGrad.addColorStop(0.45, eMode === 'christmas' ? 'rgba(251, 191, 36, 0.18)' : 'rgba(45, 212, 191, 0.2)');
            aurGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
          }
          ctx.fillStyle = aurGrad;
          ctx.fill();
        }
        ctx.restore();
      }

      if (wMode === 'Sunshower') {
        // Double rainbow arch across the sky
        ctx.save();
        const rbColors = [
          'rgba(239, 68, 68, 0.22)',
          'rgba(249, 115, 22, 0.22)',
          'rgba(250, 204, 21, 0.22)',
          'rgba(34, 197, 94, 0.22)',
          'rgba(56, 189, 248, 0.22)',
          'rgba(168, 85, 247, 0.22)',
        ];
        const cx = width * 0.48;
        const cy = height * 0.78;
        const baseR = Math.min(width, height) * 0.56;
        rbColors.forEach((col, idx) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(cx, cy, baseR - idx * 6, Math.PI * 1.08, Math.PI * 1.92);
          ctx.stroke();
        });
        ctx.restore();
      }

      // 4. CELESTIAL BODY
      const celestialX =
        eMode === 'newyear'
          ? width * 0.5
          : tMode === 'dawn'
          ? width * 0.22
          : tMode === 'day'
          ? width * 0.72
          : tMode === 'dusk'
          ? width * 0.78
          : width * 0.76;
      const celestialY =
        eMode === 'newyear'
          ? height * 0.58
          : tMode === 'dawn'
          ? height * 0.48
          : tMode === 'day'
          ? height * 0.18
          : tMode === 'dusk'
          ? height * 0.46
          : height * 0.18;

      if (wMode !== 'HeavyRain' && wMode !== 'Thunderstorm' && wMode !== 'Cloudy') {
        if (eMode === 'halloween') {
          const moonRadius = Math.min(width, height) * 0.11;
          const glow = ctx.createRadialGradient(
            celestialX,
            celestialY,
            moonRadius * 0.2,
            celestialX,
            celestialY,
            moonRadius * 2.8
          );
          glow.addColorStop(0, 'rgba(251, 146, 60, 0.95)');
          glow.addColorStop(0.45, 'rgba(234, 88, 12, 0.45)');
          glow.addColorStop(1, 'rgba(234, 88, 12, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(celestialX, celestialY, moonRadius * 2.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fed7aa';
          ctx.beginPath();
          ctx.arc(celestialX, celestialY, moonRadius, 0, Math.PI * 2);
          ctx.fill();
        } else if (eMode === 'newyear' || tMode === 'dawn' || tMode === 'day' || tMode === 'dusk') {
          const sunR = eMode === 'newyear' ? 68 : tMode === 'day' ? 44 : 56;
          const sunGlow = ctx.createRadialGradient(
            celestialX,
            celestialY,
            sunR * 0.2,
            celestialX,
            celestialY,
            sunR * 3.4
          );
          if (tMode === 'day') {
            sunGlow.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
            sunGlow.addColorStop(0.35, 'rgba(253, 224, 71, 0.45)');
            sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
          } else {
            sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
            sunGlow.addColorStop(0.4, 'rgba(249, 115, 22, 0.5)');
            sunGlow.addColorStop(1, 'rgba(244, 63, 94, 0)');
          }
          ctx.fillStyle = sunGlow;
          ctx.beginPath();
          ctx.arc(celestialX, celestialY, sunR * 3.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef9c3';
          ctx.beginPath();
          ctx.arc(celestialX, celestialY, sunR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const moonR = 38;
          const moonGlow = ctx.createRadialGradient(
            celestialX,
            celestialY,
            moonR * 0.3,
            celestialX,
            celestialY,
            moonR * 3.0
          );
          moonGlow.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
          moonGlow.addColorStop(0.45, 'rgba(56, 189, 248, 0.25)');
          moonGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = moonGlow;
          ctx.beginPath();
          ctx.arc(celestialX, celestialY, moonR * 3.0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#f0f9ff';
          ctx.beginPath();
          ctx.arc(celestialX, celestialY, moonR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. CHRISTMAS SANTA SLEIGH
      if (eMode === 'christmas') {
        santaX += (55 + wSpeed * 2.2) * dt;
        if (santaX > width + 240) santaX = -240;
        const santaY = height * 0.22 + Math.sin(elapsed * 1.8) * 18;
        ctx.save();
        const trailGrad = ctx.createLinearGradient(santaX - 140, santaY, santaX, santaY);
        trailGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
        trailGrad.addColorStop(1, 'rgba(253, 224, 71, 0.55)');
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(santaX - 140, santaY + 8);
        ctx.quadraticCurveTo(santaX - 65, santaY - 6, santaX, santaY);
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.roundRect(santaX - 28, santaY - 8, 30, 14, 4);
        ctx.fill();
        ctx.restore();
      }

      // 6. VOLUMETRIC CLOUDS
      const cloudDensity =
        wMode === 'Cloudy' || wMode === 'Rainy' || wMode === 'HeavyRain' || wMode === 'Thunderstorm' || wMode === 'HeavySnow'
          ? 11
          : wMode === 'PartlyCloudy' || wMode === 'LightRain' || wMode === 'Snow' || wMode === 'Fog'
          ? 7
          : 4;
      const cloudColor =
        wMode === 'Thunderstorm' || wMode === 'HeavyRain'
          ? 'rgba(30, 41, 59, 0.88)'
          : wMode === 'Rainy' || wMode === 'Cloudy'
          ? 'rgba(71, 85, 105, 0.78)'
          : eMode === 'halloween'
          ? 'rgba(46, 16, 101, 0.65)'
          : tMode === 'dusk' || tMode === 'dawn'
          ? 'rgba(251, 113, 133, 0.42)'
          : tMode === 'night'
          ? 'rgba(30, 41, 59, 0.55)'
          : 'rgba(255, 255, 255, 0.62)';

      for (let i = 0; i < cloudDensity; i++) {
        const cl = clouds[i];
        cl.x += wVec.vx * 3.2 * cl.speedFactor * dt;
        if (cl.x > width + 260) cl.x = -260;
        if (cl.x < -260) cl.x = width + 260;

        ctx.fillStyle = cloudColor;
        ctx.beginPath();
        const rBase = 46 * cl.scale;
        ctx.arc(cl.x, cl.y, rBase, 0, Math.PI * 2);
        ctx.arc(cl.x + rBase * 0.85, cl.y - rBase * 0.22, rBase * 0.82, 0, Math.PI * 2);
        ctx.arc(cl.x - rBase * 0.85, cl.y - rBase * 0.12, rBase * 0.75, 0, Math.PI * 2);
        ctx.arc(cl.x + rBase * 1.55, cl.y + rBase * 0.08, rBase * 0.62, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. THUNDERSTORM LIGHTNING BOLTS
      if (wMode === 'Thunderstorm') {
        if (Math.random() < 0.016) {
          lightningFlash = 0.88;
          lightningBoltX = width * (0.18 + Math.random() * 0.64);
        }
        if (lightningFlash > 0.02) {
          ctx.fillStyle = `rgba(224, 242, 254, ${(lightningFlash * 0.35).toFixed(3)})`;
          ctx.fillRect(0, 0, width, height);

          ctx.strokeStyle = `rgba(224, 242, 254, ${lightningFlash.toFixed(3)})`;
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          let lx = lightningBoltX;
          let ly = height * 0.12;
          ctx.moveTo(lx, ly);
          for (let seg = 0; seg < 7; seg++) {
            lx += (Math.random() - 0.5) * 48;
            ly += height * 0.09;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
          lightningFlash = rustCore.rust_lerp_damped(lightningFlash, 0, 7.5, dt);
        }
      }

      // 8. VISIBLE WIND STREAMLINE RIBBONS
      if (wSpeed >= 2.0) {
        const streamCount = Math.min(14, Math.floor(wSpeed * 0.55) + 3);
        const angleRad = (wVec.deg * Math.PI) / 180;
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        ctx.save();
        ctx.strokeStyle =
          eMode === 'halloween'
            ? 'rgba(251, 146, 60, 0.16)'
            : tMode === 'day'
            ? 'rgba(255, 255, 255, 0.22)'
            : 'rgba(125, 211, 252, 0.16)';
        ctx.lineWidth = 1.4;

        for (let s = 0; s < streamCount; s++) {
          const prog = (elapsed * (0.35 + wSpeed * 0.04) + s * 0.21) % 1;
          const dirSign = wVec.vx >= 0 ? 1 : -1;
          const sx = dirSign >= 0 ? prog * (width + 300) - 150 : (1 - prog) * (width + 300) - 150;
          const sy = height * (0.14 + ((s * 0.13) % 0.52));
          const len = 70 + wSpeed * 4.5;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(
            sx + cosA * len * 0.5,
            sy + sinA * len * 0.5 + Math.sin(elapsed * 3 + s) * 10,
            sx + cosA * len,
            sy + sinA * len
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // =======================================================================
      // 9. LOCATION-ADAPTIVE LANDSCAPE & SNOW ACCUMULATION RENDERER
      //    - 'suburban-plains' (埼玉・関東平野: 遠くに山があっても手前に広い原と散在する家)
      //    - 'urban'           (東京・大阪・横浜: ビルが立ち並び家が多い都市風景)
      //    - 'mountain'        (長野・日本アルプス: 幾重にも連なる高い山々と山里)
      // =======================================================================
      const windBendPx =
        wVec.vx * 1.45 + Math.sin(elapsed * (2.2 + wSpeed * 0.18)) * (2.5 + wSpeed * 0.35);

      if (terrain === 'mountain') {
        // ---------------------------------------------------------------------
        // A. MOUNTAINOUS TERRAIN (山の方: 連なる高山・アルプス・山小屋・深い森)
        // ---------------------------------------------------------------------
        const backPeakBaseY = height * 0.68;
        // Layer 1: Distant Towering Alpine Peaks
        ctx.beginPath();
        ctx.moveTo(0, height);
        const alpinePeaks = [
          { x: 0.0, y: 0.52 },
          { x: 0.12, y: 0.34 },
          { x: 0.24, y: 0.46 },
          { x: 0.38, y: 0.28 },
          { x: 0.52, y: 0.42 },
          { x: 0.67, y: 0.31 },
          { x: 0.82, y: 0.44 },
          { x: 0.93, y: 0.33 },
          { x: 1.0, y: 0.48 },
        ];
        for (const pt of alpinePeaks) {
          ctx.lineTo(width * pt.x, height * pt.y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = tMode === 'day' ? '#1e3a5f' : '#0b1528';
        ctx.fill();

        // Alpine Snow Caps (grows further down the peaks as snowRatio increases)
        const snowLineFactor = 0.28 + snowRatio * 0.55;
        ctx.fillStyle = `rgba(248, 250, 252, ${(0.72 + snowRatio * 0.25).toFixed(2)})`;
        for (let i = 1; i < alpinePeaks.length - 1; i += 2) {
          const prev = alpinePeaks[i - 1];
          const peak = alpinePeaks[i];
          const next = alpinePeaks[i + 1];
          const px = width * peak.x;
          const py = height * peak.y;
          const lx = width * (peak.x - (peak.x - prev.x) * snowLineFactor);
          const ly = height * (peak.y + (prev.y - peak.y) * snowLineFactor);
          const rx = width * (peak.x + (next.x - peak.x) * snowLineFactor);
          const ry = height * (peak.y + (next.y - peak.y) * snowLineFactor);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(rx, ry);
          ctx.lineTo(px + (rx - px) * 0.3, ry - 8);
          ctx.lineTo(px, ry + 6);
          ctx.lineTo(px - (px - lx) * 0.3, ly - 8);
          ctx.lineTo(lx, ly);
          ctx.closePath();
          ctx.fill();
        }

        // Layer 2: Midground Steep Mountain Ridges
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 24) {
          const ridge =
            backPeakBaseY -
            Math.abs(Math.sin(x * 0.0042 + 0.8)) * (height * 0.16) -
            Math.cos(x * 0.009) * (height * 0.04);
          ctx.lineTo(x, ridge);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle =
          snowRatio > 0.55
            ? tMode === 'day'
              ? '#cbd5e1'
              : '#334155'
            : sMode === 'autumn'
            ? tMode === 'day'
              ? '#7c2d12'
              : '#2a1208'
            : tMode === 'day'
            ? '#115e59'
            : '#09222c';
        ctx.fill();

        // Layer 3: Foreground Mountain Valley & Pine Forest Slope
        const fgValleyY = height * 0.83;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 24) {
          const y = fgValleyY + Math.sin(x * 0.0038 + 2.1) * 28;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle =
          snowRatio > 0.2
            ? `rgba(241, 245, 249, ${(0.35 + snowRatio * 0.62).toFixed(2)})`
            : tMode === 'day'
            ? '#064e3b'
            : '#04131d';
        ctx.fill();

        // Mountain Cabins (2 cozy lodges nestled in the valley)
        const cabinXs = [0.28, 0.68];
        for (const cxNorm of cabinXs) {
          const hx = width * cxNorm;
          const hy = fgValleyY + Math.sin(hx * 0.0038 + 2.1) * 28 + 8;
          drawPitchedHouse(
            hx,
            hy,
            40,
            26,
            24,
            '#451a03',
            '#27272a',
            isNightLike || isRainyMode,
            snowRatio
          );
        }

        // Dense Conifer / Pine Trees across the mountain slopes
        const pineCount = 16;
        for (let i = 0; i < pineCount; i++) {
          const tx = width * ((i + 0.4) / pineCount);
          const ty = fgValleyY + Math.sin(tx * 0.0038 + 2.1) * 28 + 10;
          const treeH = 52 + (i % 4) * 16;
          for (let tier = 0; tier < 3; tier++) {
            const topY = ty - treeH + tier * 14;
            const botY = topY + 24;
            const halfW = 12 + tier * 6;
            const sway = windBendPx * (1 - tier * 0.25);
            ctx.fillStyle = tMode === 'day' ? '#065f46' : '#022c22';
            ctx.beginPath();
            ctx.moveTo(tx + sway, topY);
            ctx.lineTo(tx - halfW + sway * 0.4, botY);
            ctx.lineTo(tx + halfW + sway * 0.4, botY);
            ctx.closePath();
            ctx.fill();

            if (snowRatio > 0.08) {
              ctx.fillStyle = `rgba(248, 250, 252, ${Math.min(0.95, snowRatio * 0.95).toFixed(2)})`;
              ctx.beginPath();
              ctx.moveTo(tx + sway, topY);
              ctx.lineTo(tx - halfW * 0.75 + sway * 0.4, topY + 11);
              ctx.lineTo(tx + halfW * 0.75 + sway * 0.4, topY + 11);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      } else if (terrain === 'urban') {
        // ---------------------------------------------------------------------
        // B. URBAN TERRAIN (都市部: 高層ビル群・電波塔・多くの住宅が並ぶ街並み)
        // ---------------------------------------------------------------------
        const horizonY = height * 0.77;

        // Faint distant silhouette on horizon
        ctx.fillStyle = tMode === 'day' ? 'rgba(30, 58, 138, 0.25)' : 'rgba(15, 23, 42, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= width; x += 40) {
          ctx.lineTo(x, horizonY - 12 - Math.sin(x * 0.005) * 10);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Landmark Observation / Radio Tower (Tokyo Tower / Skytree style)
        const towerX = width * 0.74;
        const towerBaseY = horizonY + 8;
        const towerTopY = height * 0.34;
        ctx.strokeStyle = eMode === 'christmas' ? '#10b981' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(towerX - 26, towerBaseY);
        ctx.lineTo(towerX - 4, towerTopY + 45);
        ctx.lineTo(towerX + 4, towerTopY + 45);
        ctx.lineTo(towerX + 26, towerBaseY);
        ctx.stroke();
        // Spire
        ctx.beginPath();
        ctx.moveTo(towerX, towerTopY);
        ctx.lineTo(towerX, towerTopY + 45);
        ctx.stroke();
        // Observation decks
        ctx.fillStyle = isNightLike ? '#fef08a' : '#e2e8f0';
        ctx.fillRect(towerX - 16, towerTopY + 95, 32, 7);
        ctx.fillRect(towerX - 10, towerTopY + 52, 20, 6);
        // Blinking aviation light on tip
        const blink = 0.35 + 0.65 * Math.abs(Math.sin(elapsed * 3.2));
        ctx.fillStyle = `rgba(248, 113, 113, ${blink.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(towerX, towerTopY, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Back & Mid Row Skyscrapers & Office Towers
        const buildingSpecs = [
          { x: 0.04, w: 54, h: 150 },
          { x: 0.1, w: 66, h: 210 },
          { x: 0.17, w: 50, h: 135 },
          { x: 0.23, w: 74, h: 245 },
          { x: 0.31, w: 58, h: 175 },
          { x: 0.38, w: 64, h: 195 },
          { x: 0.46, w: 80, h: 265 },
          { x: 0.55, w: 60, h: 185 },
          { x: 0.62, w: 70, h: 220 },
          { x: 0.69, w: 52, h: 150 },
          { x: 0.8, w: 72, h: 230 },
          { x: 0.88, w: 62, h: 180 },
          { x: 0.95, w: 56, h: 145 },
        ];

        for (let bIdx = 0; bIdx < buildingSpecs.length; bIdx++) {
          const b = buildingSpecs[bIdx];
          const bx = width * b.x - b.w * 0.5;
          const by = horizonY - b.h + 16;

          ctx.fillStyle =
            tMode === 'day'
              ? bIdx % 2 === 0
                ? '#1e293b'
                : '#334155'
              : bIdx % 2 === 0
              ? '#090d16'
              : '#111827';
          ctx.fillRect(bx, by, b.w, b.h + 25);

          // Subtle glass rim
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, b.w, b.h);

          // Illuminated window grid
          const cols = Math.max(3, Math.floor(b.w / 13));
          const rows = Math.max(5, Math.floor(b.h / 18));
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const hash = ((bIdx * 31 + r * 17 + c * 13) % 11);
              if (tMode === 'day' && !isRainyMode) {
                ctx.fillStyle = 'rgba(186, 230, 253, 0.28)';
              } else {
                if (hash < 3) continue; // some windows dark
                ctx.fillStyle =
                  hash % 3 === 0
                    ? 'rgba(253, 224, 71, 0.82)'
                    : hash % 3 === 1
                    ? 'rgba(125, 211, 252, 0.75)'
                    : 'rgba(254, 243, 199, 0.85)';
              }
              ctx.fillRect(bx + 6 + c * 12, by + 8 + r * 16, 6, 9);
            }
          }

          // Rooftop snow cap on flat skyscraper roofs
          if (snowRatio > 0.02) {
            const roofSnowH = 2 + snowRatio * 9;
            ctx.fillStyle = `rgba(248, 250, 252, ${Math.min(0.96, 0.45 + snowRatio * 0.52).toFixed(2)})`;
            ctx.beginPath();
            ctx.roundRect(bx - 1, by - roofSnowH * 0.7, b.w + 2, roofSnowH, 3);
            ctx.fill();
          }
        }

        // Foreground Urban Ground & Dense Residential Houses
        const urbanGroundY = height * 0.82;
        ctx.fillStyle = tMode === 'day' ? '#1e293b' : '#090d16';
        ctx.fillRect(0, urbanGroundY, width, height - urbanGroundY);

        // Dense row of urban houses
        const houseCount = 15;
        for (let hIdx = 0; hIdx < houseCount; hIdx++) {
          const hx = width * ((hIdx + 0.5) / houseCount);
          const hy = urbanGroundY + 26 + (hIdx % 2) * 12;
          const wallPalette = ['#334155', '#475569', '#1e293b', '#3f3f46'];
          const roofPalette = ['#0f172a', '#7f1d1d', '#1e3a8a', '#18181b'];
          drawPitchedHouse(
            hx,
            hy,
            42,
            28,
            15,
            wallPalette[hIdx % wallPalette.length],
            roofPalette[hIdx % roofPalette.length],
            isNightLike || isRainyMode || hIdx % 2 === 0,
            snowRatio
          );
        }

        // Snow blanket along urban streets & ground
        if (snowRatio > 0.03) {
          const streetSnowH = (height - urbanGroundY) * (0.25 + snowRatio * 0.65);
          ctx.fillStyle = `rgba(241, 245, 249, ${Math.min(0.95, 0.35 + snowRatio * 0.6).toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 28) {
            const sy = height - streetSnowH + Math.sin(x * 0.015) * (3 + snowRatio * 6);
            ctx.lineTo(x, sy);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // ---------------------------------------------------------------------
        // C. SUBURBAN PLAINS TERRAIN (埼玉・関東平野スタイル:
        //    遠くに山があっても手前に広大な原っぱ・野原・川・散在する家がある風景)
        // ---------------------------------------------------------------------
        const horizonY = height * 0.67;

        // 1) Far-off Distant Mountain Range on the Horizon (遠くの秩父・日光・富士山連峰)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, horizonY + 6);
        for (let x = 0; x <= width; x += 24) {
          // Low, gentle distant mountain silhouette far on the horizon
          const farMtnHeight =
            16 +
            Math.sin(x * 0.0045 + 0.7) * 14 +
            Math.cos(x * 0.011 - 1.2) * 8 +
            (x > width * 0.62 && x < width * 0.84
              ? Math.sin(((x - width * 0.62) / (width * 0.22)) * Math.PI) * 32
              : 0);
          ctx.lineTo(x, horizonY - Math.max(4, farMtnHeight));
        }
        ctx.lineTo(width, horizonY + 10);
        ctx.closePath();
        ctx.fillStyle =
          tMode === 'day'
            ? 'rgba(59, 130, 246, 0.38)'
            : tMode === 'dusk' || tMode === 'dawn'
            ? 'rgba(88, 28, 135, 0.52)'
            : 'rgba(15, 23, 42, 0.72)';
        ctx.fill();

        // Subtle snow tint on the distant horizon mountains in winter / snow
        if (snowRatio > 0.15 || sMode === 'winter') {
          ctx.strokeStyle = `rgba(241, 245, 249, ${Math.min(0.75, 0.25 + snowRatio * 0.5).toFixed(2)})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        ctx.restore();

        // 2) Wide Open Flat Plains / Meadow / Fields ("広い原・関東平野の原っぱ")
        const plainGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        if (eMode === 'halloween') {
          plainGrad.addColorStop(0, '#1e1035');
          plainGrad.addColorStop(1, '#090312');
        } else if (sMode === 'spring') {
          plainGrad.addColorStop(0, tMode === 'day' ? '#4ade80' : '#064e3b');
          plainGrad.addColorStop(0.55, tMode === 'day' ? '#16a34a' : '#052e16');
          plainGrad.addColorStop(1, tMode === 'day' ? '#14532d' : '#021c10');
        } else if (sMode === 'autumn') {
          plainGrad.addColorStop(0, tMode === 'day' ? '#d97706' : '#451a03');
          plainGrad.addColorStop(0.55, tMode === 'day' ? '#b45309' : '#2e1309');
          plainGrad.addColorStop(1, tMode === 'day' ? '#78350f' : '#1c0a04');
        } else if (sMode === 'winter' || snowRatio > 0.35) {
          plainGrad.addColorStop(0, tMode === 'day' ? '#cbd5e1' : '#1e293b');
          plainGrad.addColorStop(1, tMode === 'day' ? '#94a3b8' : '#0f172a');
        } else {
          // Lush summer/default wide green grassland plain
          plainGrad.addColorStop(0, tMode === 'day' ? '#22c55e' : '#064e3b');
          plainGrad.addColorStop(0.5, tMode === 'day' ? '#15803d' : '#042f2e');
          plainGrad.addColorStop(1, tMode === 'day' ? '#14532d' : '#021814');
        }

        ctx.fillStyle = plainGrad;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= width; x += 36) {
          // Very flat, gently undulating open plain ("原")
          const py = horizonY + Math.sin(x * 0.0025 + 1.4) * 5;
          ctx.lineTo(x, py);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Perspective field lines / meadow stripes across the wide plain
        ctx.save();
        ctx.strokeStyle =
          tMode === 'day' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(148, 163, 184, 0.08)';
        ctx.lineWidth = 1.2;
        for (let row = 1; row <= 5; row++) {
          const ry = horizonY + Math.pow(row / 5, 1.5) * (height - horizonY) * 0.85;
          ctx.beginPath();
          ctx.moveTo(0, ry);
          ctx.quadraticCurveTo(width * 0.5, ry + 6, width, ry - 2);
          ctx.stroke();
        }
        ctx.restore();

        // Winding River / Arakawa-style Stream across the plain reflecting the sky
        ctx.save();
        ctx.fillStyle =
          snowRatio > 0.75
            ? 'rgba(186, 230, 253, 0.65)'
            : tMode === 'day'
            ? 'rgba(56, 189, 248, 0.55)'
            : tMode === 'dusk' || tMode === 'dawn'
            ? 'rgba(244, 63, 94, 0.45)'
            : 'rgba(30, 58, 138, 0.55)';
        ctx.beginPath();
        ctx.moveTo(width * 0.56, horizonY + 2);
        ctx.bezierCurveTo(
          width * 0.48,
          horizonY + (height - horizonY) * 0.35,
          width * 0.64,
          horizonY + (height - horizonY) * 0.65,
          width * 0.42,
          height
        );
        ctx.lineTo(width * 0.54, height);
        ctx.bezierCurveTo(
          width * 0.72,
          horizonY + (height - horizonY) * 0.65,
          width * 0.52,
          horizonY + (height - horizonY) * 0.35,
          width * 0.58,
          horizonY + 2
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Progressive Snow Blanket piling up across the wide open plain ("積雪が増えたり")
        if (snowRatio > 0.01) {
          ctx.save();
          ctx.fillStyle = `rgba(248, 250, 252, ${Math.min(0.96, 0.28 + snowRatio * 0.68).toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(0, horizonY);
          for (let x = 0; x <= width; x += 28) {
            const drift =
              horizonY +
              Math.sin(x * 0.005 + 0.5) * (4 + snowRatio * 10) -
              snowRatio * 14;
            ctx.lineTo(x, drift);
          }
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();

          // Foreground deep snowdrift mounds when snowAccumulation is high
          const driftTopY = height - (12 + snowRatio * 58);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.98, 0.45 + snowRatio * 0.55).toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 24) {
            const dy =
              driftTopY +
              Math.sin(x * 0.008 + 1.9) * (6 + snowRatio * 14) +
              Math.cos(x * 0.018) * (4 + snowRatio * 6);
            ctx.lineTo(x, dy);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Scattered Suburban Houses across the plain (not dense like urban, just a few warm homes)
        const suburbanHouses = [
          { x: 0.14, yOff: 0.28, scale: 0.72, wall: '#e2e8f0', roof: '#334155' },
          { x: 0.21, yOff: 0.34, scale: 0.82, wall: '#fef3c7', roof: '#7c2d12' },
          { x: 0.76, yOff: 0.32, scale: 0.78, wall: '#f1f5f9', roof: '#1e3a8a' },
          { x: 0.84, yOff: 0.42, scale: 0.92, wall: '#e2e8f0', roof: '#3f3f46' },
        ];
        for (const sh of suburbanHouses) {
          const hx = width * sh.x;
          const hy = horizonY + (height - horizonY) * sh.yOff;
          drawPitchedHouse(
            hx,
            hy,
            38 * sh.scale,
            24 * sh.scale,
            14 * sh.scale,
            tMode === 'day' ? sh.wall : '#334155',
            sh.roof,
            isNightLike || isRainyMode,
            snowRatio
          );
        }

        // Swaying Grass Blades / Pampas Grass & Scattered Trees on the Plain
        const grassClusters = 22;
        ctx.save();
        ctx.strokeStyle =
          snowRatio > 0.6
            ? 'rgba(226, 232, 240, 0.75)'
            : sMode === 'autumn'
            ? 'rgba(251, 191, 36, 0.65)'
            : 'rgba(134, 239, 172, 0.55)';
        ctx.lineWidth = 1.6;
        for (let g = 0; g < grassClusters; g++) {
          const gx = width * ((g + 0.3) / grassClusters);
          const gy = horizonY + (height - horizonY) * (0.48 + ((g * 0.17) % 0.45));
          for (let blade = -1; blade <= 1; blade++) {
            ctx.beginPath();
            ctx.moveTo(gx + blade * 4, gy);
            ctx.quadraticCurveTo(
              gx + blade * 6 + windBendPx * 0.45,
              gy - 12,
              gx + blade * 9 + windBendPx * 0.85,
              gy - 20
            );
            ctx.stroke();
          }
        }
        ctx.restore();

        // Scattered Trees on the Suburban Plain
        const plainTreePositions = [0.07, 0.31, 0.66, 0.92];
        for (let idx = 0; idx < plainTreePositions.length; idx++) {
          const tx = width * plainTreePositions[idx];
          const ty = horizonY + (height - horizonY) * (0.52 + (idx % 2) * 0.16);
          const treeH = 52 + (idx % 3) * 14;

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(tx, ty + 6);
          ctx.quadraticCurveTo(
            tx + windBendPx * 0.4,
            ty - treeH * 0.5,
            tx + windBendPx * 0.85,
            ty - treeH * 0.85
          );
          ctx.stroke();

          const crownX = tx + windBendPx * 0.85;
          const crownY = ty - treeH * 0.88;
          ctx.fillStyle =
            sMode === 'spring'
              ? 'rgba(244, 114, 182, 0.86)'
              : sMode === 'autumn'
              ? idx % 2 === 0
                ? 'rgba(234, 88, 12, 0.86)'
                : 'rgba(220, 38, 38, 0.84)'
              : sMode === 'winter' || snowRatio > 0.4
              ? 'rgba(226, 232, 240, 0.85)'
              : 'rgba(16, 185, 129, 0.82)';
          ctx.beginPath();
          ctx.arc(crownX, crownY, 18, 0, Math.PI * 2);
          ctx.arc(crownX - 11, crownY + 6, 13, 0, Math.PI * 2);
          ctx.arc(crownX + 11, crownY + 6, 13, 0, Math.PI * 2);
          ctx.fill();

          if (snowRatio > 0.08) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.95, snowRatio * 0.9).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(crownX, crownY - 5, 14 * (0.5 + snowRatio * 0.5), Math.PI, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 9B. FOG / MIST LAYER (when weather is Fog or HeavyRain)
      if (wMode === 'Fog' || wMode === 'HeavyRain') {
        const fogAlpha = wMode === 'Fog' ? 0.48 : 0.22;
        for (let f = 0; f < 3; f++) {
          const fy = height * (0.52 + f * 0.14);
          const fogGrad = ctx.createLinearGradient(0, fy - 50, 0, fy + 70);
          fogGrad.addColorStop(0, 'rgba(226, 232, 240, 0)');
          fogGrad.addColorStop(0.5, `rgba(226, 232, 240, ${fogAlpha})`);
          fogGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');
          ctx.fillStyle = fogGrad;
          ctx.fillRect(0, fy - 50, width, 120);
        }
      }

      // 9C. EVENING / NIGHT STREETLIGHTS, CAR HEADLIGHTS & AUDIO-REACTIVE PULSE
      const beatPulse =
        stateRef.current.audioReactiveEnabled && musicPlayingRef.current
          ? 0.5 + 0.5 * Math.pow(Math.abs(Math.sin(elapsed * 6.4)), 3)
          : 0;

      if (beatPulse > 0.05) {
        ctx.save();
        const beatGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.32,
          10,
          width * 0.5,
          height * 0.45,
          width * 0.65
        );
        beatGrad.addColorStop(0, `rgba(56, 189, 248, ${(beatPulse * 0.16).toFixed(3)})`);
        beatGrad.addColorStop(0.5, `rgba(168, 85, 247, ${(beatPulse * 0.1).toFixed(3)})`);
        beatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = beatGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if ((isNightLike || tMode === 'dawn') && (terrain === 'urban' || terrain === 'suburban-plains')) {
        const roadY = height * (terrain === 'urban' ? 0.84 : 0.78);
        const lampCount = terrain === 'urban' ? 9 : 5;
        ctx.save();
        for (let l = 0; l < lampCount; l++) {
          const lx = width * ((l + 0.5) / lampCount);
          // Pole
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lx, roadY);
          ctx.lineTo(lx, roadY - 26);
          ctx.stroke();

          // Warm Lamp Bulb
          const lampGlow = 0.75 + beatPulse * 0.25;
          ctx.fillStyle = `rgba(254, 240, 138, ${lampGlow.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(lx, roadY - 26, 3, 0, Math.PI * 2);
          ctx.fill();

          // Light Cone Illuminating Ground / Snow
          const coneGrad = ctx.createRadialGradient(lx, roadY - 24, 2, lx, roadY + 4, 38);
          coneGrad.addColorStop(0, `rgba(253, 224, 71, ${(0.28 + snowRatio * 0.14 + beatPulse * 0.1).toFixed(2)})`);
          coneGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(lx - 32, roadY + 12);
          ctx.lineTo(lx, roadY - 26);
          ctx.lineTo(lx + 32, roadY + 12);
          ctx.closePath();
          ctx.fill();
        }

        // Gliding Car Headlights & Taillights along the Evening/Night Road
        const carCount = terrain === 'urban' ? 4 : 2;
        for (let c = 0; c < carCount; c++) {
          const dir = c % 2 === 0 ? 1 : -1;
          const speed = 55 + c * 18;
          const rawX = (elapsed * speed * dir + c * 310) % (width + 160);
          const cx = rawX < -80 ? rawX + width + 160 : rawX;
          const cy = roadY + (dir > 0 ? 3 : -2);

          // Car body silhouette
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(cx - 8, cy - 5, 16, 5);

          // Headlight beam
          const beamX = dir > 0 ? cx + 8 : cx - 8;
          const beamGrad = ctx.createLinearGradient(beamX, cy - 2, beamX + dir * 48, cy + 4);
          beamGrad.addColorStop(0, 'rgba(254, 249, 195, 0.78)');
          beamGrad.addColorStop(1, 'rgba(254, 249, 195, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(beamX, cy - 3);
          ctx.lineTo(beamX + dir * 48, cy - 8);
          ctx.lineTo(beamX + dir * 48, cy + 5);
          ctx.closePath();
          ctx.fill();

          // Red Taillight
          const tailX = dir > 0 ? cx - 8 : cx + 8;
          ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
          ctx.beginPath();
          ctx.arc(tailX, cy - 2.5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 10. WEATHER / SEASONAL / EVENT PARTICLES
      const activeParticleCount =
        wMode === 'HeavySnow' || wMode === 'HeavyRain' || wMode === 'Thunderstorm'
          ? PARTICLE_COUNT
          : wMode === 'Snow' || wMode === 'Rainy'
          ? 180
          : 120;

      for (let i = 0; i < activeParticleCount; i++) {
        const p = particles[i];
        const fallSpeed =
          wMode === 'HeavyRain' || wMode === 'Thunderstorm'
            ? 680 * p.z
            : wMode === 'Rainy'
            ? 520 * p.z
            : wMode === 'LightRain' || wMode === 'Sunshower'
            ? 390 * p.z
            : wMode === 'HeavySnow'
            ? 145 * p.z
            : wMode === 'Snow' || eMode === 'christmas'
            ? 88 * p.z
            : 48 * p.z;

        const driftX =
          wVec.vx * (wMode === 'HeavySnow' ? 20 : 14) * p.z +
          Math.sin(elapsed * 2.2 + p.phase) * (14 + wSpeed * 1.2);
        p.x += driftX * dt;
        p.y += (fallSpeed + wVec.vy * 4) * dt;
        p.rot += (p.rotSpeed + wVec.vx * 0.08) * dt;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        } else if (p.y < -20) {
          p.y = height + 20;
        }
        if (p.x > width + 30) p.x = -30;
        if (p.x < -30) p.x = width + 30;

        if (isRainyMode) {
          ctx.strokeStyle =
            wMode === 'HeavyRain' || wMode === 'Thunderstorm'
              ? 'rgba(186, 230, 253, 0.78)'
              : 'rgba(186, 230, 253, 0.58)';
          ctx.lineWidth = (wMode === 'HeavyRain' ? 1.7 : 1.25) * p.z;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - wVec.vx * 0.95, p.y - (wMode === 'HeavyRain' ? 24 : 16) * p.z);
          ctx.stroke();
        } else if (isSnowyMode || eMode === 'christmas' || sMode === 'winter') {
          const flakeRadius = p.size * (wMode === 'HeavySnow' ? 0.78 : 0.58);
          ctx.fillStyle = `rgba(255, 255, 255, ${(0.5 + p.z * 0.45).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, flakeRadius, 0, Math.PI * 2);
          ctx.fill();
        } else if (eMode === 'halloween') {
          ctx.fillStyle =
            p.colorIndex % 2 === 0
              ? 'rgba(251, 146, 60, 0.78)'
              : 'rgba(192, 132, 252, 0.72)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else if (sMode === 'spring') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = 'rgba(251, 207, 232, 0.85)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.9, p.size * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (sMode === 'autumn') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle =
            p.colorIndex % 2 === 0
              ? 'rgba(239, 68, 68, 0.85)'
              : 'rgba(245, 158, 11, 0.85)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.05, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          const glowAlpha = 0.25 + 0.65 * Math.abs(Math.sin(elapsed * 2.5 + p.phase));
          ctx.fillStyle =
            eMode === 'newyear'
              ? `rgba(253, 224, 71, ${glowAlpha.toFixed(2)})`
              : `rgba(167, 243, 208, ${(glowAlpha * 0.75).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafId = requestAnimationFrame(drawScene);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const timeLabelJa =
    effectiveTime === 'dawn'
      ? '朝焼け (Dawn)'
      : effectiveTime === 'day'
      ? '昼 (Daylight)'
      : effectiveTime === 'dusk'
      ? '夕暮れ (Sunset)'
      : '夜 (Starlight)';
  const seasonLabelJa =
    effectiveSeason === 'spring'
      ? '春 (桜吹雪)'
      : effectiveSeason === 'summer'
      ? '夏 (新緑・蛍)'
      : effectiveSeason === 'autumn'
      ? '秋 (紅葉)'
      : '冬 (銀世界)';
  const terrainLabelJa =
    effectiveTerrain === 'urban'
      ? '🏙️ 都市部 (ビル・密集住宅)'
      : effectiveTerrain === 'mountain'
      ? '⛰️ 山岳部 (連なる山々)'
      : '🌾 郊外・平原 (遠い山と広い原)';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Subtle Floating Desktop Environment Controller Pill (Top-Right) */}
      {showControllerHud && (
        <div className="fixed top-3 right-4 z-20 pointer-events-auto select-none max-w-md">
          {!hudExpanded ? (
            <button
              type="button"
              onClick={() => setHudExpanded(true)}
              className="px-3 py-1.5 rounded-xl bg-black/55 hover:bg-black/75 backdrop-blur-xl border border-white/15 text-[11px] text-white/90 flex items-center gap-2 shadow-xl transition cursor-pointer"
              title="クリックしてライブ壁紙の場所・地形・天候・積雪量・季節・時間帯を調整"
            >
              <span className="material-symbols-rounded text-cyan-300 text-sm">landscape</span>
              <span className="font-semibold truncate">
                {locInfo.displayLabel} · {WEATHER_MODE_LABELS[effectiveWeather]} · 積雪 {Math.round(config.snowAccumulation)}%
              </span>
              <span className="text-[10px] text-cyan-300 font-mono shrink-0">場所・天候設定</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/20 text-white shadow-2xl space-y-3 w-80 sm:w-96 max-h-[84vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-cyan-300 text-base">
                    landscape
                  </span>
                  <span className="text-xs font-bold">
                    季節・場所・天候ライブ壁紙スタジオ
                  </span>
                  {wasmReady && (
                    <span className="text-[9px] font-mono text-orange-300">· 🦀 Rust</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setHudExpanded(false)}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white/80 cursor-pointer"
                >
                  閉じる
                </button>
              </div>

              <div className="text-[10px] text-white/70 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>📍 {locInfo.displayLabel} ({liveTempC}°C)</span>
                <span>· {terrainLabelJa}</span>
                <span>· {timeLabelJa.split(' ')[0]}</span>
                <span>· {seasonLabelJa.split(' ')[0]}</span>
              </div>

              {/* 1. Location Preset Selector (場所設定) */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-cyan-300">
                  📍 場所設定 (都市部 / 埼玉・郊外平原 / 山岳地帯):
                </div>
                <select
                  value={config.locationId}
                  onChange={(e) => updateConfig({ locationId: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                >
                  {DYNAMIC_LOCATION_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.labelJa}
                    </option>
                  ))}
                </select>
                {config.locationId === 'custom' && (
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={customInputDraft}
                      onChange={(e) => setCustomInputDraft(e.target.value)}
                      placeholder="例: さいたま / 渋谷 / 軽井沢 / 札幌..."
                      className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig({
                          customLocationName: customInputDraft.trim() || 'Saitama',
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 text-[10px] font-bold cursor-pointer"
                    >
                      反映
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Terrain / Scenery Override (地形・街並み) */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-white/75">
                  街並み・地形スタイル (場所連動または手動選択):
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'auto', label: '🔄 場所から自動判定' },
                      { id: 'suburban-plains', label: '🌾 郊外・原野 (遠い山と原)' },
                      { id: 'urban', label: '🏙️ 都市部 (ビル・密集住宅)' },
                      { id: 'mountain', label: '⛰️ 山岳部 (連なる山々)' },
                    ] as const
                  ).map((tr) => (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => updateConfig({ terrainType: tr.id })}
                      className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition cursor-pointer truncate ${
                        config.terrainType === tr.id
                          ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                          : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/80'
                      }`}
                    >
                      {tr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Expanded Weather Selector (天候設定) */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-white/75">
                  天候 (Weather — 全12種 + 現地自動連動):
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'auto', label: '🔄 自動天候' },
                      { id: 'Sunny', label: '☀️ 快晴' },
                      { id: 'PartlyCloudy', label: '🌤️ 晴時々曇' },
                      { id: 'Cloudy', label: '☁️ 曇天' },
                      { id: 'LightRain', label: '🌦️ 小雨' },
                      { id: 'Rainy', label: '🌧️ 雨' },
                      { id: 'HeavyRain', label: '⛈️ 豪雨' },
                      { id: 'Thunderstorm', label: '⚡ 雷雨' },
                      { id: 'Fog', label: '🌫️ 濃霧' },
                      { id: 'Snow', label: '❄️ 雪' },
                      { id: 'HeavySnow', label: '🌨️ 大雪・吹雪' },
                      { id: 'Sunshower', label: '🌈 天気雨・虹' },
                      { id: 'Aurora', label: '🌌 オーロラ' },
                    ] as const
                  ).map((wt) => (
                    <button
                      key={wt.id}
                      type="button"
                      onClick={() =>
                        updateConfig({
                          weather: wt.id,
                          ...(wt.id === 'HeavySnow' && config.snowAccumulation < 40
                            ? { snowAccumulation: 65 }
                            : wt.id === 'Snow' && config.snowAccumulation < 15
                            ? { snowAccumulation: 30 }
                            : {}),
                        })
                      }
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer truncate ${
                        config.weather === wt.id
                          ? 'bg-amber-400 text-slate-950 border-amber-200'
                          : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/80'
                      }`}
                    >
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Snow Accumulation Depth Control (積雪量スライダー & 自動積雪) */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-white/85">
                    ❄️ 積雪量 (屋根・原っぱ・山・ビルの積雪): {Math.round(config.snowAccumulation)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig({ autoSnowAccumulate: !config.autoSnowAccumulate })
                    }
                    className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                      config.autoSnowAccumulate
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    降雪時自動積雪 {config.autoSnowAccumulate ? 'ON' : 'OFF'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={config.snowAccumulation}
                  onChange={(e) =>
                    updateConfig({ snowAccumulation: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { val: 0, label: '0% なし' },
                    { val: 25, label: '25% うっすら' },
                    { val: 60, label: '60% 積雪' },
                    { val: 100, label: '100% 豪雪' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => updateConfig({ snowAccumulation: preset.val })}
                      className="py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9px] font-mono text-white/80 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Time of Day & Season */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                <div>
                  <div className="text-[10px] font-bold text-white/75 mb-1">時間帯:</div>
                  <select
                    value={config.timeOfDay}
                    onChange={(e) =>
                      updateConfig({ timeOfDay: e.target.value as DynamicTimeOfDay })
                    }
                    className="w-full bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white outline-none"
                  >
                    <option value="auto">自動 (現在時刻)</option>
                    <option value="dawn">🌅 朝焼け</option>
                    <option value="day">☀️ 昼</option>
                    <option value="dusk">🌇 夕暮れ</option>
                    <option value="night">🌙 夜</option>
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/75 mb-1">季節:</div>
                  <select
                    value={config.season}
                    onChange={(e) =>
                      updateConfig({ season: e.target.value as DynamicSeasonMode })
                    }
                    className="w-full bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white outline-none"
                  >
                    <option value="auto">自動 (現在の月)</option>
                    <option value="spring">🌸 春 (桜)</option>
                    <option value="summer">🌿 夏 (新緑)</option>
                    <option value="autumn">🍁 秋 (紅葉)</option>
                    <option value="winter">❄️ 冬 (銀世界)</option>
                  </select>
                </div>
              </div>

              {/* 6. Audio-Reactive Beat Sync Toggle */}
              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px]">
                <span className="text-white/80 font-bold">
                  🎵 音楽ビート連動 (再生中に夜空・街明かりが脈動)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      audioReactiveEnabled: config.audioReactiveEnabled === false,
                    })
                  }
                  className={`px-2.5 py-0.5 rounded font-bold cursor-pointer ${
                    config.audioReactiveEnabled !== false
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {config.audioReactiveEnabled !== false ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
