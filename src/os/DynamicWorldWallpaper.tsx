import React, { useEffect, useRef, useState } from 'react';
import { fetchMultiSourceWeatherConsensus } from './weatherConsensus';
import { getRustCore, isRustWasmActive } from './rustWasmCore';

export type DynamicTimeOfDay = 'auto' | 'dawn' | 'day' | 'dusk' | 'night';
export type DynamicWeatherMode = 'auto' | 'Sunny' | 'Cloudy' | 'Rainy' | 'Thunderstorm' | 'Snow' | 'Aurora';
export type DynamicSeasonMode = 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';
export type DynamicEventMode = 'auto' | 'none' | 'halloween' | 'christmas' | 'newyear' | 'tanabata';
export type WindCompassDir = 'W→E' | 'NW→SE' | 'SW→NE' | 'E→W' | 'NE→SW' | 'SE→NW' | 'N→S' | 'S→N';

export interface DynamicEnvironmentConfig {
  timeOfDay: DynamicTimeOfDay;
  weather: DynamicWeatherMode;
  season: DynamicSeasonMode;
  event: DynamicEventMode;
  windSpeedMs: number; // 0 to 35 m/s
  windDirection: WindCompassDir;
  autoSyncLiveWeather: boolean;
}

const STORAGE_KEY = 'glasis_dynamic_world_wallpaper_v1';

const DEFAULT_CONFIG: DynamicEnvironmentConfig = {
  timeOfDay: 'auto',
  weather: 'auto',
  season: 'auto',
  event: 'auto',
  windSpeedMs: 6.5,
  windDirection: 'W→E',
  autoSyncLiveWeather: true,
};

export function loadDynamicEnvironmentConfig(): DynamicEnvironmentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  const m = now.getMonth() + 1; // 1..12
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

function getWindVector(dir: WindCompassDir, speedMs: number): { vx: number; vy: number; deg: number; labelJa: string } {
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
      if (detail) setConfig(detail);
    };
    window.addEventListener('glasis-dynamic-env-changed', onExternalUpdate);
    return () => window.removeEventListener('glasis-dynamic-env-changed', onExternalUpdate);
  }, []);

  // Clock tick for real-time time-of-day & seasonal event detection
  useEffect(() => {
    const id = window.setInterval(() => setNowDate(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // Fetch live weather consensus for wind speed & weather condition
  useEffect(() => {
    let active = true;
    const syncWeather = async () => {
      try {
        const res = await fetchMultiSourceWeatherConsensus('Tokyo');
        if (!active || !res) return;
        const cond = res.consensusCondition;
        if (
          cond === 'Sunny' ||
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
  }, [config.autoSyncLiveWeather]);

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

  const windVec = getWindVector(config.windDirection, config.windSpeedMs);

  // Store latest resolved state in ref for 60fps canvas animation loop
  const stateRef = useRef({
    effectiveTime,
    effectiveSeason,
    effectiveEvent,
    effectiveWeather,
    windSpeedMs: config.windSpeedMs,
    windDirection: config.windDirection,
    windVec,
  });

  useEffect(() => {
    stateRef.current = {
      effectiveTime,
      effectiveSeason,
      effectiveEvent,
      effectiveWeather,
      windSpeedMs: config.windSpeedMs,
      windDirection: config.windDirection,
      windVec,
    };
  }, [
    effectiveTime,
    effectiveSeason,
    effectiveEvent,
    effectiveWeather,
    config.windSpeedMs,
    config.windDirection,
    windVec,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rustCore = getRustCore();
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initialize 180 multi-depth particles
    const PARTICLE_COUNT = 180;
    const particles: EnvParticle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.35 + (i % 10) * 0.08,
      size: 2.5 + (i % 7) * 1.4,
      phase: i * 0.73,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2.4,
      colorIndex: i % 4,
    }));

    // Initialize 9 volumetric cloud layers
    const clouds = Array.from({ length: 9 }, (_, i) => ({
      x: (i / 9) * width * 1.3 - width * 0.15,
      y: height * (0.09 + (i % 4) * 0.065),
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
        windSpeedMs: wSpeed,
        windVec: wVec,
      } = stateRef.current;

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
      } else if (wMode === 'Rainy' || wMode === 'Thunderstorm') {
        const dark = tMode === 'night' ? 0.5 : 1;
        skyGrad.addColorStop(0, dark < 1 ? '#040814' : '#0f172a');
        skyGrad.addColorStop(0.5, dark < 1 ? '#0f172a' : '#1e293b');
        skyGrad.addColorStop(1, dark < 1 ? '#1e293b' : '#334155');
      } else if (tMode === 'dawn') {
        skyGrad.addColorStop(0, '#1e1b4b');
        skyGrad.addColorStop(0.4, '#6d28d9');
        skyGrad.addColorStop(0.74, '#f43f5e');
        skyGrad.addColorStop(1, '#fde047');
      } else if (tMode === 'day') {
        if (sMode === 'winter' || wMode === 'Snow') {
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
        // Night
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.5, '#090d1e');
        skyGrad.addColorStop(1, '#111c38');
      }

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. STARFIELD & MILKY WAY (Night / Dawn / Dusk / Halloween / Christmas / Tanabata)
      const showStars =
        tMode === 'night' ||
        tMode === 'dusk' ||
        tMode === 'dawn' ||
        eMode === 'halloween' ||
        eMode === 'christmas' ||
        eMode === 'tanabata' ||
        wMode === 'Aurora';

      if (showStars && wMode !== 'Rainy') {
        const starAlphaBase = tMode === 'night' || eMode === 'christmas' || eMode === 'tanabata' ? 0.9 : 0.45;
        for (const st of stars) {
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(elapsed * st.twinkleSpeed + st.phase));
          ctx.fillStyle = `rgba(255, 255, 255, ${(starAlphaBase * twinkle).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(st.xNorm * width, st.yNorm * height, st.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tanabata Milky Way Ribbon
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

      // 3. AURORA BOREALIS CURTAINS (Aurora weather OR Christmas OR Winter Night)
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

      // 4. CELESTIAL BODY (Sun / Sunset Orb / Moon / Halloween Harvest Moon / First Sunrise)
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

      if (eMode === 'halloween') {
        // Giant Glowing Blood-Orange Harvest Moon + Flying Bats
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

        // Bats flapping across the moon
        for (let b = 0; b < 7; b++) {
          const bx = ((elapsed * (45 + wSpeed * 2.5) + b * 210) % (width + 160)) - 80;
          const by =
            celestialY -
            50 +
            Math.sin(elapsed * 2.3 + b * 1.7) * 45 +
            (b % 3) * 28;
          const wing = Math.sin(elapsed * 14 + b * 2.1) * 9;
          ctx.strokeStyle = '#090414';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(bx - 12, by + wing);
          ctx.quadraticCurveTo(bx - 5, by - 6, bx, by);
          ctx.quadraticCurveTo(bx + 5, by - 6, bx + 12, by + wing);
          ctx.stroke();
        }
      } else if (eMode === 'newyear' || tMode === 'dawn' || tMode === 'day' || tMode === 'dusk') {
        // Sun & Solar Corona
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
        // Crescent / Full Moon at Night
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

      // 5. CHRISTMAS SANTA SLEIGH ACROSS THE SKY
      if (eMode === 'christmas') {
        santaX += (55 + wSpeed * 2.2) * dt;
        if (santaX > width + 240) santaX = -240;
        const santaY = height * 0.22 + Math.sin(elapsed * 1.8) * 18;

        ctx.save();
        // Golden stardust trail behind sleigh
        const trailGrad = ctx.createLinearGradient(santaX - 140, santaY, santaX, santaY);
        trailGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
        trailGrad.addColorStop(1, 'rgba(253, 224, 71, 0.55)');
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(santaX - 140, santaY + 8);
        ctx.quadraticCurveTo(santaX - 65, santaY - 6, santaX, santaY);
        ctx.stroke();

        // Sleigh & reindeer silhouette with golden rim
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.roundRect(santaX - 28, santaY - 8, 30, 14, 4);
        ctx.fill();
        // Reindeer ahead
        for (let r = 1; r <= 3; r++) {
          const rx = santaX + r * 22;
          const ry = santaY - 2 + Math.sin(elapsed * 8 + r) * 3;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.ellipse(rx, ry, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          if (r === 3) {
            // Rudolph red nose
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(rx + 8, ry - 1, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // 6. VOLUMETRIC CLOUDS DRIVEN BY WIND DIRECTION & WIND SPEED
      const cloudDensity =
        wMode === 'Cloudy' || wMode === 'Rainy' || wMode === 'Thunderstorm'
          ? 9
          : wMode === 'Snow'
          ? 7
          : 5;
      const cloudColor =
        wMode === 'Thunderstorm'
          ? 'rgba(30, 41, 59, 0.86)'
          : wMode === 'Rainy'
          ? 'rgba(51, 65, 85, 0.78)'
          : eMode === 'halloween'
          ? 'rgba(46, 16, 101, 0.65)'
          : tMode === 'dusk' || tMode === 'dawn'
          ? 'rgba(251, 113, 133, 0.42)'
          : tMode === 'night'
          ? 'rgba(30, 41, 59, 0.55)'
          : 'rgba(255, 255, 255, 0.55)';

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
        if (Math.random() < 0.014) {
          lightningFlash = 0.85;
          lightningBoltX = width * (0.2 + Math.random() * 0.6);
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

      // 8. VISIBLE WIND STREAMLINE RIBBONS (風の強さ・風向きの可視化気流エフェクト)
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
          const prog = ((elapsed * (0.35 + wSpeed * 0.04) + s * 0.21) % 1);
          const dirSign = wVec.vx >= 0 ? 1 : -1;
          const sx =
            dirSign >= 0
              ? prog * (width + 300) - 150
              : (1 - prog) * (width + 300) - 150;
          const sy = height * (0.14 + ((s * 0.13) % 0.58));
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

      // 9. DISTANT MOUNTAIN / FUJI / CASTLE SILHOUETTES & FOREGROUND SEASONAL / EVENT HILLS
      const horizonY = height * 0.76;

      // Mt. Fuji silhouette during New Year or clear views
      if (eMode === 'newyear' || sMode === 'spring' || sMode === 'autumn') {
        ctx.save();
        ctx.beginPath();
        const fujiCenterX = eMode === 'newyear' ? width * 0.5 : width * 0.74;
        const fujiTopY = height * 0.49;
        ctx.moveTo(fujiCenterX - 280, horizonY + 20);
        ctx.quadraticCurveTo(fujiCenterX - 95, horizonY - 20, fujiCenterX - 34, fujiTopY);
        ctx.lineTo(fujiCenterX + 34, fujiTopY);
        ctx.quadraticCurveTo(fujiCenterX + 95, horizonY - 20, fujiCenterX + 280, horizonY + 20);
        ctx.closePath();
        ctx.fillStyle =
          eMode === 'newyear'
            ? '#311042'
            : tMode === 'day'
            ? '#1e3a8a'
            : '#0f172a';
        ctx.fill();

        // Snow cap on Mt. Fuji
        ctx.beginPath();
        ctx.moveTo(fujiCenterX - 34, fujiTopY);
        ctx.lineTo(fujiCenterX + 34, fujiTopY);
        ctx.lineTo(fujiCenterX + 68, fujiTopY + 52);
        ctx.lineTo(fujiCenterX + 22, fujiTopY + 38);
        ctx.lineTo(fujiCenterX, fujiTopY + 54);
        ctx.lineTo(fujiCenterX - 24, fujiTopY + 38);
        ctx.lineTo(fujiCenterX - 68, fujiTopY + 52);
        ctx.closePath();
        ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
        ctx.fill();
        ctx.restore();
      }

      // Midground rolling hills
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 32) {
        const y =
          horizonY +
          Math.sin(x * 0.0035 + 1.2) * 34 +
          Math.cos(x * 0.008 - 0.5) * 16;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      if (eMode === 'halloween') {
        ctx.fillStyle = '#140726';
      } else if (eMode === 'christmas' || sMode === 'winter' || wMode === 'Snow') {
        ctx.fillStyle = tMode === 'day' ? '#cbd5e1' : '#1e293b';
      } else if (sMode === 'spring') {
        ctx.fillStyle = tMode === 'day' ? '#15803d' : '#062c1e';
      } else if (sMode === 'autumn') {
        ctx.fillStyle = tMode === 'day' ? '#9a3412' : '#2e1309';
      } else {
        ctx.fillStyle = tMode === 'day' ? '#0f766e' : '#061826';
      }
      ctx.fill();

      // Foreground hill + Wind-Swaying Trees / Event Props
      const fgHillY = height * 0.84;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 28) {
        const y = fgHillY + Math.sin(x * 0.0045 + 2.8) * 22;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle =
        eMode === 'halloween'
          ? '#090312'
          : eMode === 'christmas' || sMode === 'winter' || wMode === 'Snow'
          ? tMode === 'day'
            ? '#e2e8f0'
            : '#0f172a'
          : '#060d18';
      ctx.fill();

      // Wind bend offset for trees/foliage/bamboo along the foreground hill
      const windBendPx =
        wVec.vx * 1.45 +
        Math.sin(elapsed * (2.2 + wSpeed * 0.18)) * (2.5 + wSpeed * 0.35);

      // Draw seasonal/event foreground silhouettes & lights
      const treePositions = [0.08, 0.16, 0.27, 0.42, 0.58, 0.73, 0.85, 0.93];
      for (let idx = 0; idx < treePositions.length; idx++) {
        const tx = width * treePositions[idx];
        const ty = fgHillY + Math.sin(tx * 0.0045 + 2.8) * 22 + 4;
        const treeH = 54 + (idx % 3) * 18;

        if (eMode === 'halloween') {
          // Glowing Jack-o'-Lantern Pumpkins & Spooky Crooked Trees
          const pumpkinX = tx + 24;
          const pumpkinY = ty + 2;
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.ellipse(pumpkinX, pumpkinY, 13, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          // Glowing eyes & smile
          const flicker = 0.75 + 0.25 * Math.sin(elapsed * 9 + idx * 2.1);
          ctx.fillStyle = `rgba(254, 240, 138, ${flicker.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(pumpkinX - 4, pumpkinY - 2, 2.2, 0, Math.PI * 2);
          ctx.arc(pumpkinX + 4, pumpkinY - 2, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (eMode === 'christmas') {
          // Illuminated Christmas Pine Tree swaying in wind
          ctx.fillStyle = '#064e3b';
          for (let tier = 0; tier < 3; tier++) {
            const tierTopY = ty - treeH + tier * 15;
            const tierBotY = tierTopY + 26;
            const tierW = 14 + tier * 8;
            const sway = windBendPx * (1 - tier * 0.28);
            ctx.beginPath();
            ctx.moveTo(tx + sway, tierTopY);
            ctx.lineTo(tx - tierW + sway * 0.4, tierBotY);
            ctx.lineTo(tx + tierW + sway * 0.4, tierBotY);
            ctx.closePath();
            ctx.fill();
          }
          // Twinkling fairy ornament lights
          const ornamentColors = ['#fbbf24', '#ef4444', '#38bdf8', '#a855f7'];
          for (let o = 0; o < 5; o++) {
            const oy = ty - treeH * 0.8 + o * 9;
            const ox = tx + windBendPx * 0.5 + ((o % 2 === 0 ? -1 : 1) * (4 + o * 2));
            ctx.fillStyle = ornamentColors[(o + idx) % ornamentColors.length];
            ctx.beginPath();
            ctx.arc(ox, oy, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (eMode === 'tanabata') {
          // Swaying Tanabata Bamboo & Colorful Tanzaku Wish Strips
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tx, ty + 8);
          ctx.quadraticCurveTo(
            tx + windBendPx * 0.5,
            ty - treeH * 0.5,
            tx + windBendPx,
            ty - treeH
          );
          ctx.stroke();

          // Fluttering Tanzaku wish strips
          const tanzakuColors = ['#f43f5e', '#38bdf8', '#fde047', '#c084fc'];
          for (let tz = 0; tz < 3; tz++) {
            const bx = tx + windBendPx * (0.5 + tz * 0.2) + (tz - 1) * 9;
            const by = ty - treeH * (0.55 + tz * 0.15);
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(Math.max(-0.9, Math.min(0.9, windBendPx * 0.025)));
            ctx.fillStyle = tanzakuColors[(idx + tz) % tanzakuColors.length];
            ctx.fillRect(-3, 0, 6, 15);
            ctx.restore();
          }
        } else {
          // Seasonal Trees (Sakura in Spring, Lush in Summer, Maple in Autumn, Pine in Winter)
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
              ? 'rgba(244, 114, 182, 0.82)'
              : sMode === 'autumn'
              ? idx % 2 === 0
                ? 'rgba(234, 88, 12, 0.85)'
                : 'rgba(220, 38, 38, 0.82)'
              : sMode === 'winter'
              ? 'rgba(226, 232, 240, 0.78)'
              : 'rgba(16, 185, 129, 0.75)';
          ctx.beginPath();
          ctx.arc(crownX, crownY, 18, 0, Math.PI * 2);
          ctx.arc(crownX - 11, crownY + 6, 13, 0, Math.PI * 2);
          ctx.arc(crownX + 11, crownY + 6, 13, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 10. WEATHER / SEASONAL / EVENT PARTICLES DRIVEN BY RUST/WASM & WIND VECTOR
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        const fallSpeed =
          wMode === 'Rainy' || wMode === 'Thunderstorm'
            ? 520 * p.z
            : wMode === 'Snow' || eMode === 'christmas'
            ? 85 * p.z
            : 48 * p.z;

        // Horizontal velocity directly driven by wind vector + subtle turbulence
        const driftX =
          wVec.vx * 14 * p.z + Math.sin(elapsed * 2.2 + p.phase) * (14 + wSpeed * 1.2);
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

        if (wMode === 'Rainy' || wMode === 'Thunderstorm') {
          // Tilted Raindrops aligned with wind vector
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.62)';
          ctx.lineWidth = 1.3 * p.z;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - wVec.vx * 0.9, p.y - 18 * p.z);
          ctx.stroke();
        } else if (wMode === 'Snow' || eMode === 'christmas' || sMode === 'winter') {
          // Snowflakes
          ctx.fillStyle = `rgba(255, 255, 255, ${(0.45 + p.z * 0.45).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else if (eMode === 'halloween') {
          // Glowing Amber & Violet Halloween Embers
          ctx.fillStyle =
            p.colorIndex % 2 === 0
              ? 'rgba(251, 146, 60, 0.78)'
              : 'rgba(192, 132, 252, 0.72)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else if (sMode === 'spring') {
          // Swirling Sakura Petals
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = 'rgba(251, 207, 232, 0.85)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.9, p.size * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (sMode === 'autumn') {
          // Blowing Crimson & Golden Autumn Maple Leaves
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
          // Summer Fireflies / Golden Sunbeams / New Year Gold Leaf
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
  const eventLabelJa =
    effectiveEvent === 'halloween'
      ? '🎃 ハロウィン'
      : effectiveEvent === 'christmas'
      ? '🎄 クリスマス'
      : effectiveEvent === 'newyear'
      ? '🎍 お正月・初日の出'
      : effectiveEvent === 'tanabata'
      ? '🎋 七夕・天の川'
      : '通常';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Subtle Floating Desktop Environment Controller Pill (Top-Right) */}
      {showControllerHud && (
        <div className="fixed top-9 right-4 z-20 pointer-events-auto select-none max-w-sm">
          {!hudExpanded ? (
            <button
              type="button"
              onClick={() => setHudExpanded(true)}
              className="px-3 py-1.5 rounded-xl bg-black/55 hover:bg-black/75 backdrop-blur-xl border border-white/15 text-[11px] text-white/90 flex items-center gap-2 shadow-xl transition cursor-pointer"
              title="クリックしてデスクトップ環境背景（時間・風速・風向き・天候・季節・ハロウィン/クリスマス等のイベント）を調整"
            >
              <span className="material-symbols-rounded text-cyan-300 text-sm">public</span>
              <span className="font-semibold">
                動的背景: {timeLabelJa.split(' ')[0]} · {effectiveWeather} · 風 {config.windSpeedMs}m/s ({config.windDirection}) · {seasonLabelJa.split(' ')[0]}
                {effectiveEvent !== 'none' ? ` · ${eventLabelJa}` : ''}
              </span>
              <span className="text-[10px] text-cyan-300 font-mono">編集</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-white/20 text-white shadow-2xl space-y-3 w-80 sm:w-96">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-cyan-300 text-base">
                    landscape
                  </span>
                  <span className="text-xs font-bold">
                    動的デスクトップ環境スタジオ
                  </span>
                  {wasmReady && (
                    <span className="text-[9px] font-mono text-orange-300">
                      · 🦀 Rust
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setHudExpanded(false)}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white/80 cursor-pointer"
                >
                  最小化
                </button>
              </div>

              <div className="text-[10px] text-white/65">
                現在: {liveTempC}°C · {timeLabelJa} · {windVec.labelJa} ({config.windSpeedMs} m/s)
              </div>

              {/* 1. Event Mode (Halloween / Christmas / New Year / Tanabata) */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-white/75">
                  イベント背景 (自動判定 / ハロウィン / クリスマス等):
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'auto', label: '自動判定' },
                      { id: 'none', label: '通常' },
                      { id: 'halloween', label: '🎃 ハロウィン' },
                      { id: 'christmas', label: '🎄 クリスマス' },
                      { id: 'newyear', label: '🎍 初日の出' },
                      { id: 'tanabata', label: '🎋 七夕' },
                    ] as const
                  ).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => updateConfig({ event: ev.id })}
                      className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition cursor-pointer truncate ${
                        config.event === ev.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                          : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/80'
                      }`}
                    >
                      {ev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Time of Day */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-white/75">時間帯 (Time of Day):</div>
                <div className="grid grid-cols-5 gap-1">
                  {(
                    [
                      { id: 'auto', label: '自動' },
                      { id: 'dawn', label: '朝焼け' },
                      { id: 'day', label: '昼' },
                      { id: 'dusk', label: '夕暮れ' },
                      { id: 'night', label: '夜' },
                    ] as const
                  ).map((tm) => (
                    <button
                      key={tm.id}
                      type="button"
                      onClick={() => updateConfig({ timeOfDay: tm.id })}
                      className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        config.timeOfDay === tm.id
                          ? 'bg-sky-400 text-slate-950 border-sky-200'
                          : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/80'
                      }`}
                    >
                      {tm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Season */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-white/75">季節 (Season):</div>
                <div className="grid grid-cols-5 gap-1">
                  {(
                    [
                      { id: 'auto', label: '自動' },
                      { id: 'spring', label: '🌸 春' },
                      { id: 'summer', label: '🌿 夏' },
                      { id: 'autumn', label: '🍁 秋' },
                      { id: 'winter', label: '❄️ 冬' },
                    ] as const
                  ).map((ss) => (
                    <button
                      key={ss.id}
                      type="button"
                      onClick={() => updateConfig({ season: ss.id })}
                      className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        config.season === ss.id
                          ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                          : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/80'
                      }`}
                    >
                      {ss.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Weather */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-white/75">天候 (Weather):</div>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'auto', label: '自動連動' },
                      { id: 'Sunny', label: '☀️ 快晴' },
                      { id: 'Cloudy', label: '☁️ 曇り' },
                      { id: 'Rainy', label: '🌧️ 雨' },
                      { id: 'Thunderstorm', label: '⚡ 雷雨' },
                      { id: 'Snow', label: '❄️ 雪' },
                      { id: 'Aurora', label: '🌌 オーロラ' },
                    ] as const
                  ).map((wt) => (
                    <button
                      key={wt.id}
                      type="button"
                      onClick={() => updateConfig({ weather: wt.id })}
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

              {/* 5. Wind Speed & Wind Direction */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-white/80">
                    風の強さ (Wind Speed): {config.windSpeedMs.toFixed(1)} m/s
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig({ autoSyncLiveWeather: !config.autoSyncLiveWeather })
                    }
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer ${
                      config.autoSyncLiveWeather
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {config.autoSyncLiveWeather ? '実気象連動ON' : '手動風速'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={config.windSpeedMs}
                  onChange={(e) =>
                    updateConfig({
                      windSpeedMs: Number(e.target.value),
                      autoSyncLiveWeather: false,
                    })
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                />

                <div className="text-[10px] font-bold text-white/75 pt-0.5">
                  風向き (Wind Direction):
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      'W→E',
                      'E→W',
                      'NW→SE',
                      'NE→SW',
                      'SW→NE',
                      'SE→NW',
                      'N→S',
                      'S→N',
                    ] as WindCompassDir[]
                  ).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => updateConfig({ windDirection: dir })}
                      className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                        config.windDirection === dir
                          ? 'bg-cyan-400 text-slate-950 border-cyan-200'
                          : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/75'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
