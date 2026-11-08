import React, { useEffect, useRef, useState } from 'react';

export type ClockFontId = 'liquid-glass-5th';

export interface ClockFontOption {
  id: ClockFontId;
  label: string;
  description: string;
}

export const CLOCK_FONT_OPTIONS: ClockFontOption[] = [
  {
    id: 'liquid-glass-5th',
    label: 'Liquid Glass Clock (Original SVG)',
    description: 'liquid-glass-clock-1 (Alexandre Vacassin SVG Displacement & Mask)',
  },
];

export interface LiquidGlassClockProps {
  time?: Date;
  use24Hour?: boolean;
  showSeconds?: boolean;
  depthEffectEnabled?: boolean;
  ridgeColor1?: string;
  ridgeColor2?: string;
  ridgeStroke?: string;
  showFontSelector?: boolean;
  initialFont?: ClockFontId;
  className?: string;
}

/**
 * Genuine Liquid Glass Clock from the 5th asset file:
 * public/assets/aistudio/liquid-glass-clock-1_afb35979.zip (by Alexandre Vacassin)
 *
 * Uses the exact DOM structure:
 *   <div class="clock-container">
 *     <div class="number hour-1"><div class="glass glass-X"></div></div>
 *     <div class="number hour-2"><div class="glass glass-X"></div></div>
 *     <div class="number separator"><div class="glass glass-points"></div></div>
 *     <div class="number minute-1"><div class="glass glass-X"></div></div>
 *     <div class="number minute-2"><div class="glass glass-X"></div></div>
 *   </div>
 * paired with #filter-0..#filter-9, #filter-points and #shape-mask-0..#shape-mask-9, #shape-mask-points in index.html.
 */
export const LiquidGlassClock: React.FC<LiquidGlassClockProps> = ({
  time,
  use24Hour = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<Date>(() => time || new Date());

  useEffect(() => {
    if (time) {
      setNow(time);
    }
  }, [time]);

  // Exact 1000ms interval from main.js in liquid-glass-clock-1_afb35979.zip
  useEffect(() => {
    const updateClock = () => {
      setNow(new Date());
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Exact mouse movement parallax from main.js in liquid-glass-clock-1_afb35979.zip
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      const glassElements = containerRef.current.querySelectorAll<HTMLElement>('.glass');
      glassElements.forEach((glass) => {
        glass.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  let hours = now.getHours();
  if (!use24Hour) {
    hours = hours % 12 || 12;
  }
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(now.getMinutes()).padStart(2, '0');

  const firstHour = hoursStr[0];
  const secondHour = hoursStr[1];
  const firstMinute = minutesStr[0];
  const secondMinute = minutesStr[1];

  const dateLabel = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="mb-1 px-3.5 py-1 rounded-full bg-black/35 backdrop-blur-xl border border-white/15 text-xs font-bold tracking-wider text-white/90 shadow-lg">
        {dateLabel}
      </div>
      <div
        ref={containerRef}
        className="clock-container"
        aria-label={`${hoursStr}:${minutesStr}`}
      >
        <div className="number hour-1">
          <div className={`glass glass-${firstHour}`} />
        </div>
        <div className="number hour-2">
          <div className={`glass glass-${secondHour}`} />
        </div>
        <div className="number separator">
          <div className="glass glass-points" />
        </div>
        <div className="number minute-1">
          <div className={`glass glass-${firstMinute}`} />
        </div>
        <div className="number minute-2">
          <div className={`glass glass-${secondMinute}`} />
        </div>
      </div>
    </div>
  );
};
