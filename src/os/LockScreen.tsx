import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { useOS, AuroraColor } from './OSContext';
import { SleepClockStyle, SleepBackground, ClockPosition } from './types';

interface LockScreenProps {
  locked: boolean;
  onUnlock: () => void;
  expectedPassword?: string;
  userName?: string;
}

const SLEEP_AURORA_COLORS: Record<AuroraColor, [string, string, string]> = {
  'cyan-violet': ['rgba(34, 211, 238, 0.38)', 'rgba(99, 102, 241, 0.32)', 'rgba(168, 85, 247, 0.28)'],
  'emerald-sky': ['rgba(52, 211, 153, 0.38)', 'rgba(20, 184, 166, 0.32)', 'rgba(56, 189, 248, 0.28)'],
  'rose-gold': ['rgba(251, 113, 133, 0.38)', 'rgba(245, 158, 11, 0.3)', 'rgba(217, 70, 239, 0.25)'],
  'ocean-blue': ['rgba(56, 189, 248, 0.38)', 'rgba(37, 99, 235, 0.34)', 'rgba(6, 182, 212, 0.28)'],
  'sunset-magenta': ['rgba(244, 114, 182, 0.38)', 'rgba(147, 51, 234, 0.34)', 'rgba(99, 102, 241, 0.28)'],
  'solar-gold': ['rgba(251, 191, 36, 0.38)', 'rgba(249, 115, 22, 0.34)', 'rgba(234, 88, 12, 0.28)'],
  'arctic-ice': ['rgba(125, 211, 252, 0.38)', 'rgba(56, 189, 248, 0.34)', 'rgba(186, 230, 253, 0.28)'],
  'sakura-silk': ['rgba(244, 114, 182, 0.38)', 'rgba(251, 113, 133, 0.34)', 'rgba(192, 132, 252, 0.28)'],
  'cyber-grid': ['rgba(6, 182, 212, 0.38)', 'rgba(217, 70, 239, 0.34)', 'rgba(59, 130, 246, 0.28)'],
  'starlight-pulse': ['rgba(129, 140, 248, 0.38)', 'rgba(56, 189, 248, 0.34)', 'rgba(192, 132, 252, 0.28)'],
  'classic-aurora-orbs': ['rgba(56, 189, 248, 0.42)', 'rgba(168, 85, 247, 0.36)', 'rgba(236, 72, 153, 0.30)'],
  'classic-synthwave-sun': ['rgba(244, 63, 94, 0.40)', 'rgba(217, 70, 239, 0.36)', 'rgba(6, 182, 212, 0.32)'],
  'classic-deep-ocean': ['rgba(6, 182, 212, 0.40)', 'rgba(14, 165, 233, 0.35)', 'rgba(20, 184, 166, 0.30)'],
  'classic-matrix-rain': ['rgba(16, 185, 129, 0.42)', 'rgba(52, 211, 153, 0.34)', 'rgba(6, 182, 212, 0.25)'],
  'classic-galaxy-vortex': ['rgba(139, 92, 246, 0.42)', 'rgba(56, 189, 248, 0.36)', 'rgba(236, 72, 153, 0.30)'],
  'classic-crystal-net': ['rgba(56, 189, 248, 0.40)', 'rgba(99, 102, 241, 0.35)', 'rgba(45, 212, 191, 0.30)'],
  'classic-fireflies-forest': ['rgba(52, 211, 153, 0.38)', 'rgba(250, 204, 21, 0.34)', 'rgba(16, 185, 129, 0.30)'],
  'classic-plasma-nebula': ['rgba(217, 70, 239, 0.40)', 'rgba(56, 189, 248, 0.38)', 'rgba(99, 102, 241, 0.34)'],
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

const POSITION_OPTIONS: { id: ClockPosition; label: string; icon: string }[] = [
  { id: 'top', label: 'Top', icon: 'ArrowUp' },
  { id: 'center', label: 'Center', icon: 'Minimize2' },
  { id: 'bottom', label: 'Bottom', icon: 'ArrowDown' },
];

export function LockScreen({ locked, onUnlock, expectedPassword, userName }: LockScreenProps) {
  const {
    auroraColor,
    playSound,
    sleepClockStyle,
    setSleepClockStyle,
    sleepBackground,
    setSleepBackground,
    clockPosition,
    setClockPosition,
    temperature,
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

  // Dynamic 60fps Canvas Backgrounds (Aurora, Matrix, Galaxy, Retro, Void)
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

    // Aurora orbs with fluid physics
    const orbs = Array.from({ length: 5 }, (_, i) => ({
      x: (w * (i + 1)) / 6,
      y: h * (0.35 + (i % 3) * 0.18),
      r: Math.min(w, h) * (0.32 + (i % 3) * 0.08),
      vx: (i % 2 === 0 ? 1 : -1) * (0.28 + i * 0.05),
      vy: (i % 2 === 0 ? -1 : 1) * (0.2 + i * 0.04),
    }));

    // Matrix digital rain
    const matrixColumns = Math.floor(w / 20);
    const matrixDrops = Array.from({ length: matrixColumns }, () => Math.random() * -100);

    // Galaxy & Void stars
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2 + 0.6,
      alpha: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.006 + 0.002,
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
          orb.x += orb.vx + Math.sin(t + idx) * 0.35;
          orb.y += orb.vy + Math.cos(t * 0.8 + idx) * 0.28;
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
        const spiralCount = 200;
        for (let i = 0; i < spiralCount; i++) {
          const angle = i * 0.12 + t * 0.2;
          const dist = i * 2.3;
          const sx = Math.cos(angle) * dist;
          const sy = Math.sin(angle) * dist * 0.5;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(168, 85, 247, 0.7)';
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1, (dist / w) * 4.2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (sleepBackground === 'retro') {
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#090014');
        bg.addColorStop(0.5, '#2e0854');
        bg.addColorStop(0.55, '#f43f5e');
        bg.addColorStop(1, '#0a001a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

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

  const cycleClockPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('click');
    const positions: ClockPosition[] = ['center', 'top', 'bottom'];
    const nextIdx = (positions.indexOf(clockPosition) + 1) % positions.length;
    setClockPosition(positions[nextIdx]);
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

  // Layout alignment classes based on clockPosition
  const positionContainerClass =
    clockPosition === 'top'
      ? 'justify-start pt-12 sm:pt-16 pb-auto'
      : clockPosition === 'bottom'
      ? 'justify-end pb-14 sm:pb-20 pt-auto'
      : 'justify-center my-auto';

  return (
    <AnimatePresence>
      {locked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(18px)' }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => {
            if (!expectedPassword && !showPasswordInput && !showCustomizer) handleQuickUnlock();
          }}
          className={`fixed inset-0 z-[99999] flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans cursor-pointer ${
            sleepBackground === 'wallpaper' ? 'bg-black/60 backdrop-blur-2xl' : ''
          }`}
        >
          {sleepBackground !== 'wallpaper' && (
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
          )}

          {/* ========================================================
              MINIMAL CONTROLS (Zero Border Line Subtraction)
              Only: Date, Temperature, and Layout Switch Button
             ======================================================== */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-20 flex items-center justify-between max-w-4xl w-full mx-auto pointer-events-auto"
          >
            {/* Pure Date & Temperature (NO extra labels or weather pills) */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] text-xs text-white/90 font-medium">
                {dateStr}
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] flex items-center gap-1.5 text-xs text-white/90 font-medium">
                <Icon name="Sun" size={13} className="text-amber-300" />
                <span>{temperature}°C</span>
              </div>
            </div>

            {/* Layout & Position Button (Quick cycle & customize) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cycleClockPosition}
                className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] text-xs text-white/80 hover:text-white transition flex items-center gap-1.5"
                title="時計の位置を変更 (Top / Center / Bottom)"
              >
                <Icon
                  name={
                    clockPosition === 'top'
                      ? 'ArrowUp'
                      : clockPosition === 'bottom'
                      ? 'ArrowDown'
                      : 'Minimize2'
                  }
                  size={12}
                  className="text-cyan-300"
                />
                <span className="capitalize">{clockPosition}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCustomizer(!showCustomizer)}
                className={`p-2 rounded-full backdrop-blur-2xl transition ${
                  showCustomizer
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25'
                    : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.16] shadow-[0_8px_24px_rgba(0,0,0,0.3)]'
                }`}
                title="時計スタイル・背景"
              >
                <Icon name="SlidersHorizontal" size={14} />
              </button>
            </div>
          </div>

          {/* ========================================================
              QUICK CUSTOMIZATION TRAY (Zero Border Line Glass)
             ======================================================== */}
          <AnimatePresence>
            {showCustomizer && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-30 max-w-xl w-full mx-auto p-4 rounded-3xl bg-slate-900/90 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col gap-3 my-2"
              >
                {/* Clock Position choices */}
                <div>
                  <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Icon name="MoveVertical" size={12} className="text-cyan-400" />
                    <span>時計の位置 (Clock Position)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {POSITION_OPTIONS.map((p) => {
                      const active = clockPosition === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setClockPosition(p.id);
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                            active
                              ? 'bg-cyan-500 text-black font-semibold shadow-md'
                              : 'bg-white/[0.06] text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <Icon name={p.icon} size={13} />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Clock style choices */}
                <div>
                  <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Icon name="Clock" size={12} className="text-cyan-400" />
                    <span>時計スタイル (Clock Style)</span>
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
              CLOCK DISPLAY (Adaptive per clockPosition)
             ======================================================== */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 flex flex-col items-center transition-all duration-300 pointer-events-auto ${positionContainerClass}`}
          >
            {/* 1. ANALOG CLOCK */}
            {sleepClockStyle === 'analog' ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleQuickUnlock}
                className="relative w-56 h-56 rounded-full bg-slate-900/60 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer group"
                style={{ filter: 'url(#glass-distortion)' }}
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

                {/* Hour Hand */}
                <div
                  className="absolute w-1.5 h-16 rounded-full bg-white origin-bottom shadow-lg"
                  style={{
                    transform: `translateY(-50%) rotate(${((hours % 12) + minutes / 60) * 30}deg)`,
                  }}
                />
                {/* Minute Hand */}
                <div
                  className="absolute w-1 h-22 rounded-full bg-cyan-300 origin-bottom shadow-lg"
                  style={{
                    transform: `translateY(-50%) rotate(${(minutes + seconds / 60) * 6}deg)`,
                  }}
                />
                {/* Second Hand */}
                <div
                  className="absolute w-0.5 h-24 rounded-full bg-rose-400 origin-bottom shadow-md"
                  style={{
                    transform: `translateY(-40%) rotate(${seconds * 6}deg)`,
                  }}
                />
                <div className="absolute w-3.5 h-3.5 rounded-full bg-white shadow" />
              </motion.div>
            ) : sleepClockStyle === 'minimal' ? (
              /* 2. MINIMAL CLOCK */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleQuickUnlock}
                className="cursor-pointer text-center"
              >
                <div className="text-7xl sm:text-9xl font-light tracking-tight text-white leading-none tabular-nums drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                  {timeStr}
                </div>
              </motion.div>
            ) : sleepClockStyle === 'vertical' ? (
              /* 3. VERTICAL CLOCK */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleQuickUnlock}
                className="cursor-pointer text-center flex flex-col items-center leading-none"
              >
                <div className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tabular-nums">
                  {hoursStr}
                </div>
                <div className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-500 tabular-nums">
                  {minsStr}
                </div>
              </motion.div>
            ) : sleepClockStyle === 'cyber' ? (
              /* 4. CYBER CLOCK */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleQuickUnlock}
                className="px-8 sm:px-12 py-6 rounded-3xl bg-slate-950/70 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] font-mono text-center cursor-pointer"
                style={{ filter: 'url(#glass-distortion)' }}
              >
                <div className="text-5xl sm:text-7xl font-bold tracking-widest text-cyan-400 tabular-nums">
                  {timeStr}:{secStr}
                </div>
              </motion.div>
            ) : (
              /* 5. 3D DEPTH LIQUID GLASS CLOCK (Default) */
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                onClick={handleQuickUnlock}
                className="px-10 sm:px-16 py-8 sm:py-10 rounded-[44px] bg-slate-900/40 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.4)] cursor-pointer text-center"
              >
                <div
                  className="text-7xl sm:text-[116px] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-cyan-200/80 leading-none tabular-nums drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
                  style={{ filter: 'url(#glass-distortion)' }}
                >
                  {timeStr}
                </div>
              </motion.div>
            )}

            {/* Password input when required */}
            {showPasswordInput && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex flex-col items-center gap-2.5"
              >
                {userName && <div className="text-xs text-white/80 font-medium">{userName}</div>}
                <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
                  <div
                    className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 bg-slate-900/80 backdrop-blur-xl shadow-[0_10px_25px_rgba(0,0,0,0.4)] transition ${
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

          {/* Empty bottom spacer to maintain balance */}
          <div className="h-6 pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
