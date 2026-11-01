import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { useOS, AuroraColor } from './OSContext';
import { SleepClockStyle, SleepBackground } from './types';

interface LockScreenProps {
  locked: boolean;
  onUnlock: () => void;
  expectedPassword?: string;
  userName?: string;
}

const SLEEP_AURORA_COLORS: Record<AuroraColor, [string, string, string]> = {
  'cyan-violet': ['rgba(34, 211, 238, 0.35)', 'rgba(99, 102, 241, 0.3)', 'rgba(168, 85, 247, 0.28)'],
  'emerald-sky': ['rgba(52, 211, 153, 0.35)', 'rgba(20, 184, 166, 0.3)', 'rgba(56, 189, 248, 0.28)'],
  'rose-gold': ['rgba(251, 113, 133, 0.35)', 'rgba(245, 158, 11, 0.28)', 'rgba(217, 70, 239, 0.25)'],
  'ocean-blue': ['rgba(56, 189, 248, 0.35)', 'rgba(37, 99, 235, 0.32)', 'rgba(6, 182, 212, 0.28)'],
  'sunset-magenta': ['rgba(244, 114, 182, 0.35)', 'rgba(147, 51, 234, 0.32)', 'rgba(99, 102, 241, 0.28)'],
};

const CLOCK_OPTIONS: { id: SleepClockStyle; label: string; icon: string }[] = [
  { id: 'depth', label: '3D Depth', icon: 'Maximize2' },
  { id: 'analog', label: 'Analog', icon: 'Clock' },
  { id: 'minimal', label: 'Minimal', icon: 'Minus' },
  { id: 'vertical', label: 'Vertical', icon: 'AlignJustify' },
  { id: 'cyber', label: 'Cyber HUD', icon: 'Terminal' },
];

const BG_OPTIONS: { id: SleepBackground; label: string }[] = [
  { id: 'aurora', label: 'Aurora' },
  { id: 'void', label: 'Void Space' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'galaxy', label: 'Galaxy' },
  { id: 'retro', label: 'Synthwave' },
  { id: 'wallpaper', label: 'Desktop' },
];

export function LockScreen({ locked, onUnlock, expectedPassword, userName }: LockScreenProps) {
  const {
    auroraColor,
    playSound,
    openApp,
    uiStyle,
    shellMode,
    sleepClockStyle,
    setSleepClockStyle,
    sleepBackground,
    setSleepBackground,
  } = useOS();

  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [now, setNow] = useState(new Date());
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  useEffect(() => {
    if (locked) {
      setPassword('');
      setError(false);
      setShowPasswordInput(!!expectedPassword);
      if (expectedPassword) {
        setTimeout(() => inputRef.current?.focus(), 350);
      }
    }
  }, [locked, expectedPassword]);

  // Dynamic Canvas Backgrounds (Aurora, Void, Matrix, Galaxy, Retro)
  useEffect(() => {
    if (!locked || sleepBackground === 'wallpaper') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let raf = 0;
    let t = 0;

    // Aurora orbs
    const orbs = Array.from({ length: 5 }, (_, i) => ({
      x: (w * (i + 1)) / 6,
      y: h * (0.3 + (i % 3) * 0.2),
      r: Math.min(w, h) * (0.28 + (i % 3) * 0.08),
      vx: (i % 2 === 0 ? 1 : -1) * (0.25 + i * 0.05),
      vy: (i % 2 === 0 ? -1 : 1) * (0.18 + i * 0.04),
    }));

    // Matrix columns
    const matrixColumns = Math.floor(w / 20);
    const matrixDrops = Array.from({ length: matrixColumns }, () => Math.random() * -100);

    // Galaxy / Void stars
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2 + 0.6,
      alpha: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.005 + 0.002,
    }));

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const palette = SLEEP_AURORA_COLORS[auroraColor] || SLEEP_AURORA_COLORS['cyan-violet'];

    const render = () => {
      t += 0.01;

      if (sleepBackground === 'aurora') {
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#020617');
        bg.addColorStop(0.5, '#070f2b');
        bg.addColorStop(1, '#02040a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        orbs.forEach((orb, idx) => {
          orb.x += orb.vx + Math.sin(t + idx) * 0.3;
          orb.y += orb.vy + Math.cos(t * 0.8 + idx) * 0.25;
          if (orb.x < -orb.r * 0.5) orb.x = w + orb.r * 0.5;
          if (orb.x > w + orb.r * 0.5) orb.x = -orb.r * 0.5;
          if (orb.y < -orb.r * 0.5) orb.y = h + orb.r * 0.5;
          if (orb.y > h + orb.r * 0.5) orb.y = -orb.r * 0.5;

          const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
          g.addColorStop(0, palette[idx % palette.length]);
          g.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      } else if (sleepBackground === 'matrix') {
        ctx.fillStyle = 'rgba(1, 10, 6, 0.15)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#10b981';
        ctx.font = '14px monospace';
        const glyphs = '0123456789ABCDEFΣΩΨλπ';
        for (let i = 0; i < matrixDrops.length; i++) {
          const char = glyphs[Math.floor(Math.random() * glyphs.length)];
          const x = i * 20;
          const y = matrixDrops[i] * 18;
          ctx.fillText(char, x, y);
          if (y > h && Math.random() > 0.975) {
            matrixDrops[i] = 0;
          }
          matrixDrops[i]++;
        }
      } else if (sleepBackground === 'galaxy') {
        ctx.fillStyle = '#020208';
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        const spiralCount = 180;
        for (let i = 0; i < spiralCount; i++) {
          const angle = i * 0.12 + t * 0.2;
          const dist = i * 2.2;
          const sx = Math.cos(angle) * dist;
          const sy = Math.sin(angle) * dist * 0.5;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.65)' : 'rgba(168, 85, 247, 0.65)';
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1, (dist / w) * 4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (sleepBackground === 'retro') {
        // Synthwave sunset grid
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#090014');
        bg.addColorStop(0.5, '#2e0854');
        bg.addColorStop(0.55, '#f43f5e');
        bg.addColorStop(1, '#0a001a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Perspective grid lines
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
        ctx.lineWidth = 1.5;
        const horizon = h * 0.55;
        for (let gy = horizon; gy < h; gy += 18 + (gy - horizon) * 0.18) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(w, gy);
          ctx.stroke();
        }
        for (let gx = -w; gx < w * 2; gx += 60) {
          ctx.beginPath();
          ctx.moveTo(w / 2, horizon);
          ctx.lineTo(gx, h);
          ctx.stroke();
        }
      } else {
        // 'void' minimal space
        ctx.fillStyle = '#02040a';
        ctx.fillRect(0, 0, w, h);
        stars.forEach((star) => {
          ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [locked, sleepBackground, auroraColor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedPassword || password === expectedPassword) {
      playSound('open');
      onUnlock();
    } else {
      playSound('notify');
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleQuickUnlock = () => {
    if (expectedPassword) {
      setShowPasswordInput(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      playSound('open');
      onUnlock();
    }
  };

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const hoursStr = String(hours).padStart(2, '0');
  const minsStr = String(minutes).padStart(2, '0');
  const secStr = String(seconds).padStart(2, '0');
  const timeStr = `${hoursStr}:${minsStr}`;
  const dateStr = now.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  const isMacLayout = uiStyle === 'macos' || shellMode === 'mac';
  const isOneUILayout = uiStyle === 'one-ui';
  const isMiuiLayout = uiStyle === 'miui';
  const isTheAILayout = uiStyle === 'the-ai';
  const isNyanLayout = uiStyle === 'nyan-cat';
  const isMemeLayout = uiStyle === 'meme';

  return (
    <AnimatePresence>
      {locked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(16px)' }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => {
            if (!expectedPassword && !showPasswordInput && !showCustomizer) handleQuickUnlock();
          }}
          className={`fixed inset-0 z-[99999] flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans ${
            sleepBackground === 'wallpaper' ? 'bg-black/60 backdrop-blur-2xl' : ''
          }`}
        >
          {sleepBackground !== 'wallpaper' && (
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
          )}

          {/* ========================================================
              TOP BAR (Zero Border Line Glass Pill)
             ======================================================== */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex items-center justify-between max-w-4xl w-full mx-auto"
          >
            <div className="px-4 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center gap-2 text-xs text-white/90">
              <Icon name="Moon" size={13} className="text-cyan-300" />
              <span>{isTheAILayout ? 'NEURAL STANDBY' : 'スリープ中'}</span>
            </div>

            {/* Lock / Padlock Status Indicator */}
            {isMacLayout && (
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <Icon name="Lock" size={13} />
                <span>Locked</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="px-4 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] text-xs text-white/90 font-medium">
                {dateStr}
              </div>

              {/* Quick Clock / Background Settings Button */}
              <button
                type="button"
                onClick={() => setShowCustomizer(!showCustomizer)}
                className={`p-2 rounded-full backdrop-blur-xl transition ${
                  showCustomizer
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25'
                    : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.16] shadow-[0_8px_24px_rgba(0,0,0,0.3)]'
                }`}
                title="時計の見た目・背景を変更"
              >
                <Icon name="SlidersHorizontal" size={14} />
              </button>
            </div>
          </div>

          {/* ========================================================
              QUICK CUSTOMIZATION POPUP TRAY (Zero Border Line)
             ======================================================== */}
          <AnimatePresence>
            {showCustomizer && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-30 max-w-xl w-full mx-auto p-4 rounded-3xl bg-slate-900/90 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.16)] flex flex-col gap-3 my-2"
              >
                {/* Clock style choices */}
                <div>
                  <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Icon name="Clock" size={12} className="text-cyan-400" />
                    <span>時計の見た目 (Clock Style)</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CLOCK_OPTIONS.map((c) => {
                      const active = sleepClockStyle === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setSleepClockStyle(c.id);
                          }}
                          className={`py-2 px-1 rounded-xl text-center text-xs font-medium transition flex flex-col items-center gap-1 ${
                            active
                              ? 'bg-cyan-500 text-black font-semibold shadow-md'
                              : 'bg-white/[0.06] text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <Icon name={c.icon} size={14} />
                          <span className="text-[10px] truncate max-w-full">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sleep background choices */}
                <div>
                  <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Icon name="Image" size={12} className="text-cyan-400" />
                    <span>スリープ背景 (Sleep Background)</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {BG_OPTIONS.map((b) => {
                      const active = sleepBackground === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setSleepBackground(b.id);
                          }}
                          className={`py-1.5 px-2 rounded-xl text-[11px] text-center font-medium transition ${
                            active
                              ? 'bg-cyan-500 text-black font-semibold shadow-md'
                              : 'bg-white/[0.06] text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================
              CENTER: ADAPTIVE LIQUID GLASS CLOCK WIDGET
             ======================================================== */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 flex flex-col items-center justify-center my-auto transition-all ${
              isOneUILayout ? 'pt-8 pb-16' : ''
            }`}
          >
            {/* 1. ANALOG LIQUID CLOCK */}
            {sleepClockStyle === 'analog' ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleQuickUnlock}
                className="relative w-56 h-56 rounded-full bg-slate-900/60 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1.5px_0_rgba(255,255,255,0.22)] flex items-center justify-center cursor-pointer group"
              >
                {/* Hour marks */}
                {Array.from({ length: 12 }, (_, i) => {
                  const deg = i * 30;
                  return (
                    <div
                      key={i}
                      className="absolute inset-0 flex justify-center py-2.5 pointer-events-none"
                      style={{ transform: `rotate(${deg}deg)` }}
                    >
                      <div
                        className={`rounded-full ${
                          i % 3 === 0 ? 'w-1.5 h-3.5 bg-white' : 'w-1 h-2 bg-white/40'
                        }`}
                      />
                    </div>
                  );
                })}

                {/* Clock Hands */}
                {/* Hour Hand */}
                <div
                  className="absolute w-1.5 h-16 rounded-full bg-white origin-bottom shadow-lg"
                  style={{
                    transform: `translateY(-50%) rotate(${((hours % 12) + minutes / 60) * 30}deg)`,
                  }}
                />
                {/* Minute Hand */}
                <div
                  className="absolute w-1 h-22 rounded-full bg-cyan-300 origin-bottom shadow-md"
                  style={{
                    transform: `translateY(-50%) rotate(${minutes * 6}deg)`,
                  }}
                />
                {/* Second Hand */}
                <div
                  className="absolute w-0.5 h-24 rounded-full bg-rose-400 origin-bottom shadow-sm"
                  style={{
                    transform: `translateY(-50%) rotate(${seconds * 6}deg)`,
                  }}
                />
                {/* Center Pivot Pin */}
                <div className="w-3.5 h-3.5 rounded-full bg-white z-10 shadow-md ring-2 ring-cyan-400" />
                <div className="absolute bottom-10 text-[10px] font-mono tracking-widest text-white/50">
                  {timeStr}
                </div>
              </motion.div>
            ) : sleepClockStyle === 'vertical' ? (
              /* 2. VERTICAL TWO-ROW STACKED CLOCK */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleQuickUnlock}
                className="px-14 py-8 rounded-[44px] bg-slate-900/60 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1.5px_0_rgba(255,255,255,0.22)] cursor-pointer text-center"
              >
                <div className="text-7xl sm:text-8xl font-black tracking-tight text-white leading-none">
                  {hoursStr}
                </div>
                <div className="text-7xl sm:text-8xl font-black tracking-tight text-cyan-300 leading-none mt-1">
                  {minsStr}
                </div>
              </motion.div>
            ) : sleepClockStyle === 'minimal' ? (
              /* 3. MINIMAL SLEEK CLOCK */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleQuickUnlock}
                className="cursor-pointer text-center px-8 py-4"
              >
                <div className="text-7xl sm:text-9xl font-extralight tracking-tight text-white/95 tabular-nums drop-shadow-[0_12px_36px_rgba(0,0,0,0.6)]">
                  {timeStr}
                </div>
                <div className="text-sm font-light text-white/60 tracking-widest uppercase mt-2">
                  {dateStr}
                </div>
              </motion.div>
            ) : sleepClockStyle === 'cyber' ? (
              /* 4. CYBER TELEMETRY HUD CLOCK */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleQuickUnlock}
                className="px-10 py-7 rounded-2xl bg-black/75 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(16,185,129,0.4)] text-center cursor-pointer font-mono"
              >
                <div className="text-[10px] text-emerald-400 tracking-widest flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/20">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    CORE ACTIVE
                  </span>
                  <span>FPS: 60 · UTC+{Math.round(-new Date().getTimezoneOffset() / 60)}</span>
                </div>
                <div className="text-6xl sm:text-8xl font-bold tracking-tight text-emerald-300 tabular-nums leading-none">
                  {timeStr}<span className="text-3xl sm:text-4xl opacity-50">:{secStr}</span>
                </div>
                <div className="mt-3 text-[11px] text-white/50 flex items-center justify-center gap-3">
                  <span>HEX: 0x{Date.now().toString(16).slice(-6).toUpperCase()}</span>
                  <span>·</span>
                  <span>NODE: ONLINE</span>
                </div>
              </motion.div>
            ) : (
              /* 5. DEFAULT 3D DEPTH LIQUID GLASS CLOCK */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                onClick={handleQuickUnlock}
                className={`px-10 sm:px-16 py-8 sm:py-10 rounded-[44px] backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.5),inset_0_1.5px_0_rgba(255,255,255,0.22)] cursor-pointer text-center ${
                  isMiuiLayout
                    ? 'bg-orange-500/10 shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_30px_rgba(249,115,22,0.15)]'
                    : isTheAILayout
                    ? 'bg-emerald-950/40 shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_30px_rgba(16,185,129,0.15)]'
                    : isNyanLayout
                    ? 'bg-pink-500/15 shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_30px_rgba(236,72,153,0.2)]'
                    : isMemeLayout
                    ? 'bg-amber-500/15 shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_30px_rgba(234,179,8,0.2)]'
                    : 'bg-slate-900/60'
                }`}
              >
                {isMemeLayout && (
                  <div className="text-[11px] font-bold text-amber-300 tracking-widest uppercase mb-1">
                    MUCH SLEEP · VERY TIME
                  </div>
                )}
                <div className="text-7xl sm:text-[116px] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-cyan-200/80 leading-none tabular-nums drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                  {timeStr}
                </div>
                {isTheAILayout && (
                  <div className="text-[10px] text-emerald-400 font-mono tracking-widest mt-2">
                    GLASSIUM NEURAL OS READY
                  </div>
                )}
              </motion.div>
            )}

            {/* Password input when enabled */}
            {showPasswordInput && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-7 flex flex-col items-center gap-2.5"
              >
                {userName && <div className="text-xs text-white/80 font-medium">{userName}</div>}
                <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
                  <div
                    className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 bg-slate-900/80 backdrop-blur-xl shadow-[0_10px_25px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition ${
                      error ? 'ring-2 ring-rose-400' : ''
                    }`}
                  >
                    <Icon name="Lock" size={14} className="text-white/70" />
                    <input
                      ref={inputRef}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="パスワード"
                      className="bg-transparent text-xs text-white placeholder-white/45 outline-none w-40"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg transition"
                  >
                    <Icon name="CornerDownLeft" size={15} />
                  </button>
                </form>
                {error && <span className="text-xs text-rose-300">パスワードが正しくありません</span>}
              </motion.div>
            )}
          </div>

          {/* ========================================================
              BOTTOM BAR: ADAPTIVE WAKE CONTROLS (Zero Border Line)
             ======================================================== */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex items-center justify-between max-w-4xl w-full mx-auto"
          >
            {/* Left Action Button (Adaptive per UI style) */}
            {isOneUILayout ? (
              <button
                type="button"
                onClick={() => {
                  playSound('open');
                  onUnlock();
                  setTimeout(() => openApp('calculator'), 100);
                }}
                className="w-12 h-12 rounded-2xl bg-white/[0.08] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center justify-center text-white/90 hover:scale-105 transition"
                title="Calculator Shortcut"
              >
                <Icon name="Calculator" size={18} />
              </button>
            ) : isTheAILayout ? (
              <div className="text-[10px] font-mono text-emerald-400/70">SYS: STANDBY</div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playSound('open');
                  onUnlock();
                  setTimeout(() => openApp('weather'), 100);
                }}
                className="w-12 h-12 rounded-2xl bg-white/[0.08] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center justify-center text-white/80 hover:scale-105 transition"
                title="Weather"
              >
                <Icon name="CloudSun" size={18} />
              </button>
            )}

            {/* Central Tap / Swipe to Unlock Pill */}
            <button
              onClick={handleQuickUnlock}
              className="px-8 py-3.5 rounded-full bg-white/[0.1] hover:bg-white/[0.18] backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.22)] flex items-center gap-2.5 text-xs font-semibold text-white transition active:scale-95"
            >
              <span>{isTheAILayout ? 'TAP TO INITIALIZE' : 'タップしてスリープ解除'}</span>
              <Icon name="ChevronRight" size={14} className="text-cyan-300" />
            </button>

            {/* Right Action Button (AI Assistant) */}
            <button
              onClick={() => {
                playSound('open');
                onUnlock();
                setTimeout(() => openApp('ai'), 150);
              }}
              className="w-12 h-12 rounded-2xl bg-white/[0.08] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center justify-center text-cyan-300 hover:scale-105 transition"
              title="AI アシスタント"
            >
              <Icon name="Bot" size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
