import React, { useState, useEffect, useMemo } from 'react';
import { WeatherConditionKey } from '../weatherConsensus';

interface VintageAndroidWeatherSkyProps {
  condition: WeatherConditionKey;
  className?: string;
  enableWiper?: boolean;
}

/**
 * Vintage Android Weather Live Animated Sky Component
 * Inspired by classic Android weather widgets (HTC Sense, Android 2.3-4.4 Weather Live Background)
 * Features:
 * - Sunny: Rotating solar corona rays, drifting lens flares, golden atmosphere
 * - Rainy: Streaming raindrops on glass, dripping water streaks, bottom puddle ripples, windshield wiper sweep
 * - Thunderstorm: Menacing storm clouds, random electric lightning flashes illuminating the screen
 * - Cloudy: Layered drifting clouds with depth parallax
 * - Snow: Swaying floating snowflakes drifting with wind
 */
export const VintageAndroidWeatherSky: React.FC<VintageAndroidWeatherSkyProps> = ({
  condition,
  className = '',
  enableWiper = true,
}) => {
  const [wiperActive, setWiperActive] = useState(false);
  const [lightningFlash, setLightningFlash] = useState(false);

  // Generate deterministic raindrops
  const raindrops = useMemo(() => {
    return Array.from({ length: 42 }).map((_, i) => ({
      id: i,
      left: `${(i * 2.4 + (i % 5) * 1.5) % 100}%`,
      delay: `${((i * 0.17) % 2).toFixed(2)}s`,
      duration: `${(0.65 + (i % 4) * 0.15).toFixed(2)}s`,
      height: `${24 + (i % 5) * 14}px`,
      opacity: 0.35 + (i % 3) * 0.25,
    }));
  }, []);

  // Generate deterministic snowflakes
  const snowflakes = useMemo(() => {
    return Array.from({ length: 38 }).map((_, i) => ({
      id: i,
      left: `${(i * 2.7) % 100}%`,
      delay: `${((i * 0.23) % 4).toFixed(2)}s`,
      duration: `${(3.5 + (i % 5) * 0.8).toFixed(2)}s`,
      size: `${6 + (i % 4) * 4}px`,
      sway: `${15 + (i % 3) * 12}px`,
    }));
  }, []);

  // Periodic vintage lightning flash for Thunderstorm
  useEffect(() => {
    if (condition !== 'Thunderstorm') return;
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        setLightningFlash(true);
        setTimeout(() => setLightningFlash(false), 240);
        // Double-strike thunder effect
        setTimeout(() => {
          if (Math.random() > 0.5) {
            setLightningFlash(true);
            setTimeout(() => setLightningFlash(false), 160);
          }
        }, 340);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [condition]);

  const triggerWiper = () => {
    if (wiperActive) return;
    setWiperActive(true);
    setTimeout(() => setWiperActive(false), 1400);
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}>
      {/* -------------------------------------------------------------
          1. SUNNY: VINTAGE ANDROID SOLAR CORONA & LENS FLARES
          ------------------------------------------------------------- */}
      {condition === 'Sunny' && (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/35 via-amber-400/20 to-blue-950/40">
          {/* Rotating Solar Corona */}
          <div className="absolute -top-12 -right-12 w-96 h-96 pointer-events-none">
            {/* Ambient sun glow */}
            <div className="absolute inset-0 bg-amber-400/25 rounded-full blur-3xl animate-pulse" />
            {/* Spinning sun rays */}
            <div
              className="absolute inset-0 rounded-full opacity-60"
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(251,191,36,0.3) 0deg, transparent 20deg, rgba(251,191,36,0.35) 40deg, transparent 60deg, rgba(251,191,36,0.3) 80deg, transparent 100deg, rgba(251,191,36,0.4) 120deg, transparent 140deg, rgba(251,191,36,0.3) 160deg, transparent 180deg, rgba(251,191,36,0.35) 200deg, transparent 220deg, rgba(251,191,36,0.3) 240deg, transparent 260deg, rgba(251,191,36,0.4) 280deg, transparent 300deg, rgba(251,191,36,0.3) 320deg, transparent 340deg, rgba(251,191,36,0.3) 360deg)',
                animation: 'vintageSunRayRotate 35s linear infinite',
              }}
            />
            {/* Inner Sun Orb */}
            <div className="absolute top-16 right-16 w-32 h-32 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-100 to-white shadow-[0_0_80px_rgba(251,191,36,0.9)]" />
          </div>

          {/* Drifting Hexagonal Lens Flares */}
          <div className="absolute top-1/4 right-1/3 w-14 h-14 rounded-full border border-amber-300/40 bg-amber-400/10 backdrop-blur-xs animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute top-1/3 right-1/2 w-8 h-8 rounded-full border border-cyan-300/30 bg-cyan-400/10" />
          <div className="absolute top-1/2 right-2/3 w-20 h-20 rounded-full border border-purple-300/25 bg-fuchsia-400/5 blur-xs" />
          <div className="absolute -bottom-10 left-0 right-0 h-40 bg-gradient-to-t from-amber-400/15 to-transparent pointer-events-none" />
        </div>
      )}

      {/* -------------------------------------------------------------
          2. RAINY: REALISTIC WINDSHIELD STREAMING RAIN & WIPER
          ------------------------------------------------------------- */}
      {condition === 'Rainy' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-blue-950/70 to-slate-950/85">
          {/* Glass Condensation Mist Texture */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08)_0%,transparent_75%)]" />

          {/* Fast Falling Windshield Rain Streaks */}
          <div className="absolute inset-0 overflow-hidden">
            {raindrops.map((r) => (
              <div
                key={r.id}
                className="absolute w-[1.5px] rounded-full bg-gradient-to-b from-transparent via-cyan-200 to-white"
                style={{
                  left: r.left,
                  top: '-50px',
                  height: r.height,
                  opacity: r.opacity,
                  animation: `vintageRainStreak ${r.duration} linear infinite`,
                  animationDelay: r.delay,
                }}
              />
            ))}
          </div>

          {/* Dripping Condensation Streaks on Window Pane */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute top-0 left-[18%] w-0.5 h-36 bg-gradient-to-b from-white/30 to-transparent blur-[0.5px]" />
            <div className="absolute top-12 left-[44%] w-0.5 h-52 bg-gradient-to-b from-white/25 to-transparent blur-[0.5px]" />
            <div className="absolute top-6 left-[72%] w-0.5 h-44 bg-gradient-to-b from-white/30 to-transparent blur-[0.5px]" />
          </div>

          {/* Water Splash Puddle on Window Sill */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-cyan-400/20 to-transparent flex items-end justify-around px-4">
            {[1, 2, 3, 4, 5].map((p) => (
              <span
                key={p}
                className="w-12 h-1 rounded-full bg-cyan-300/40 blur-[1px] animate-[pulse_1.5s_ease-in-out_infinite]"
                style={{ animationDelay: `${p * 0.3}s` }}
              />
            ))}
          </div>

          {/* Classic HTC-Style Windshield Wiper (ワイパー) */}
          {enableWiper && (
            <div className="absolute inset-0 pointer-events-auto">
              <div
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 origin-bottom w-3 h-[130%] bg-zinc-800 border-x border-zinc-600 shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform duration-700 ease-in-out ${
                  wiperActive
                    ? 'rotate-[75deg] scale-x-110'
                    : '-rotate-[75deg] opacity-0'
                }`}
                style={{
                  boxShadow: '0 0 15px rgba(255,255,255,0.2)',
                }}
              >
                {/* Wiper rubber blade */}
                <div className="absolute top-0 bottom-0 -right-1 w-1.5 bg-black/90 rounded-r" />
              </div>

              {/* Wiper Trigger Button */}
              <button
                type="button"
                onClick={triggerWiper}
                className="absolute top-3 right-3 pointer-events-auto px-2.5 py-1 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-[10px] text-white/80 hover:text-white flex items-center gap-1 shadow transition active:scale-95 cursor-pointer backdrop-blur-md"
                title="フロントガラス・ワイパーを動かす"
              >
                <span>🧹</span>
                <span>ワイパー</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          3. THUNDERSTORM: LIGHTNING FLASHES & DARK STORM CLOUDS
          ------------------------------------------------------------- */}
      {condition === 'Thunderstorm' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-zinc-900 to-indigo-950">
          {/* Rolling dark storm clouds */}
          <div className="absolute -top-20 -left-20 w-[140%] h-72 bg-gradient-to-b from-black/85 via-slate-900/70 to-transparent blur-2xl animate-[vintageCloudDrift_18s_ease-in-out_infinite]" />
          <div className="absolute -top-10 -right-20 w-[120%] h-64 bg-gradient-to-b from-indigo-950/80 via-slate-900/60 to-transparent blur-3xl animate-[vintageCloudDrift_25s_ease-in-out_infinite_reverse]" />

          {/* Electric Lightning Flash Overlay */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-75 ${
              lightningFlash
                ? 'opacity-95 bg-gradient-to-b from-cyan-100 via-white/80 to-indigo-200/50'
                : 'opacity-0'
            }`}
          />

          {/* Heavy Rain Streaks */}
          <div className="absolute inset-0 overflow-hidden opacity-75">
            {raindrops.slice(0, 36).map((r) => (
              <div
                key={r.id}
                className="absolute w-[2px] rounded-full bg-gradient-to-b from-transparent via-cyan-100 to-white"
                style={{
                  left: r.left,
                  top: '-50px',
                  height: `${parseInt(r.height) * 1.3}px`,
                  opacity: r.opacity,
                  animation: `vintageRainStreak 0.5s linear infinite`,
                  animationDelay: r.delay,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. CLOUDY / OVERCAST: LAYERED PARALLAX DRIFTING CLOUDS
          ------------------------------------------------------------- */}
      {condition === 'Cloudy' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800/40 via-slate-900/60 to-slate-950/80">
          {/* Cloud Layer 1 (Slow Deep Layer) */}
          <div
            className="absolute top-2 left-[-10%] w-[120%] h-56 rounded-full bg-slate-400/10 blur-3xl"
            style={{ animation: 'vintageCloudDrift 30s ease-in-out infinite' }}
          />
          {/* Cloud Layer 2 (Mid Depth) */}
          <div
            className="absolute top-12 left-[-5%] w-[110%] h-48 rounded-full bg-sky-200/10 blur-2xl"
            style={{ animation: 'vintageCloudDrift 20s ease-in-out infinite reverse' }}
          />
          {/* Cloud Layer 3 (Foreground Drifting Puffs) */}
          <div
            className="absolute top-24 left-[10%] w-[80%] h-40 rounded-full bg-slate-300/15 blur-xl"
            style={{ animation: 'vintageCloudDrift 14s ease-in-out infinite' }}
          />
        </div>
      )}

      {/* -------------------------------------------------------------
          5. SNOW: SWAYING FLURRIES & FROST ACCENTS
          ------------------------------------------------------------- */}
      {condition === 'Snow' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-cyan-950/40 to-slate-950/70">
          {/* Frost vignette on glass edges */}
          <div className="absolute inset-0 border-[12px] border-white/5 rounded-2xl pointer-events-none blur-xs" />

          {/* Gently Falling Snowflakes */}
          <div className="absolute inset-0 overflow-hidden">
            {snowflakes.map((s) => (
              <div
                key={s.id}
                className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                style={{
                  left: s.left,
                  top: '-20px',
                  width: s.size,
                  height: s.size,
                  animation: `vintageRainStreak ${s.duration} ease-in-out infinite`,
                  animationDelay: s.delay,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
