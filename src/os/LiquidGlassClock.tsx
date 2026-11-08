import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { soundService } from './soundService';

export type ClockFontId =
  | 'clock-displacement-liquid'
  | 'clock-font-glassium-round'
  | 'clock-font-ios27-liquid'
  | 'clock-font-hyperos-tall'
  | 'clock-font-win-hello'
  | 'clock-font-zen-maru'
  | 'clock-font-cyber-mono';

export const CLOCK_FONT_OPTIONS: Array<{
  id: ClockFontId;
  label: string;
  sub: string;
}> = [
  { id: 'clock-displacement-liquid', label: '流体ガラス変位', sub: '光学屈折・変位マップ' },
  { id: 'clock-font-ios27-liquid', label: 'iOS 27 Liquid', sub: '均等丸・液体ガラス' },
  { id: 'clock-font-glassium-round', label: 'Glassium Round', sub: '専用曲線・丸ゴシック' },
  { id: 'clock-font-hyperos-tall', label: 'HyperOS 4', sub: '深度対応・スマート等幅' },
  { id: 'clock-font-win-hello', label: 'Windows Hello', sub: '上品・高視認性' },
  { id: 'clock-font-zen-maru', label: 'Zen Maru 優美丸', sub: '優しい丸曲線' },
  { id: 'clock-font-cyber-mono', label: 'Tabular Mono', sub: '完全等幅デジタル' },
];

export interface LiquidGlassClockProps {
  depthEffectEnabled?: boolean;
  ridgeColor1?: string;
  ridgeColor2?: string;
  ridgeStroke?: string;
  showFontSelector?: boolean;
  className?: string;
}

export const LiquidGlassClock: React.FC<LiquidGlassClockProps> = ({
  depthEffectEnabled = true,
  ridgeColor1 = 'rgba(15, 23, 42, 0.88)',
  ridgeColor2 = 'rgba(30, 41, 59, 0.72)',
  ridgeStroke = 'rgba(125, 211, 252, 0.45)',
  showFontSelector = true,
  className = '',
}) => {
  const [time, setTime] = useState(new Date());

  const [clockFont, setClockFont] = useState<ClockFontId>(() => {
    const saved = localStorage.getItem('glassium_clock_font') as ClockFontId | null;
    return saved && CLOCK_FONT_OPTIONS.some((o) => o.id === saved)
      ? saved
      : 'clock-displacement-liquid';
  });
  const [showFontPicker, setShowFontPicker] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectClockFont = (fontId: ClockFontId) => {
    setClockFont(fontId);
    localStorage.setItem('glassium_clock_font', fontId);
    window.dispatchEvent(new CustomEvent('glassium-clock-font-change', { detail: fontId }));
    soundService.playClick();
  };

  const hoursStr = time.getHours().toString().padStart(2, '0');
  const minutesStr = time.getMinutes().toString().padStart(2, '0');
  const secondsStr = time.getSeconds().toString().padStart(2, '0');
  const dateString = time.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className={`relative flex flex-col items-start select-none ${className}`}>
      {/* Date Header & Font Toggle Badge */}
      <div className="relative z-30 flex flex-wrap items-center gap-2 mb-2">
        <span className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-xs font-bold tracking-wide text-white/95 shadow">
          {dateString}
        </span>
        {showFontSelector && (
          <button
            type="button"
            onClick={() => setShowFontPicker(!showFontPicker)}
            className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-xl border border-cyan-300/40 text-xs font-bold text-cyan-200 transition flex items-center gap-1.5 cursor-pointer"
            title="時計フォントを切り替え"
          >
            <Icon name="Type" size={12} />
            <span>時計スタイル切替</span>
          </button>
        )}
      </div>

      {/* Switchable Clock Font Selector Popover */}
      <AnimatePresence>
        {showFontPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative z-40 mb-3 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/20 shadow-2xl grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md"
          >
            {CLOCK_FONT_OPTIONS.map((opt) => {
              const active = clockFont === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectClockFont(opt.id)}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-cyan-400 text-slate-950 border-cyan-200 font-black'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <div className={`text-xs font-bold ${opt.id !== 'clock-displacement-liquid' ? opt.id : ''}`}>
                    {opt.label}
                  </div>
                  <div
                    className={`text-[10px] ${
                      active ? 'text-slate-900 font-semibold' : 'text-white/55'
                    }`}
                  >
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* THE LIQUID GLASS CLOCK DISPLAY */}
      <div className="relative py-2 pr-4 overflow-visible">
        {clockFont === 'clock-displacement-liquid' ? (
          /* Alexandre Vacassin SVG Liquid Glass Displacement Clock */
          <div className="relative z-10 overflow-visible py-2" style={{ width: 330, height: 110 }}>
            <div
              className="liquid-clock-stage"
              style={{
                transform: 'scale(0.48)',
                transformOrigin: 'top left',
                width: 480,
                height: 220,
              }}
            >
              <div className="liquid-number-slot hour-1 flex items-center justify-center relative">
                <span className="ios27-liquid-digit text-[90px] text-white/95 drop-shadow-[0_0_14px_rgba(56,189,248,0.6)] leading-none select-none">
                  {hoursStr[0]}
                </span>
                <div className={`liquid-glass-svg-canvas glass-${hoursStr[0]}`} />
              </div>
              <div className="liquid-number-slot hour-2 flex items-center justify-center relative">
                <span className="ios27-liquid-digit text-[90px] text-white/95 drop-shadow-[0_0_14px_rgba(56,189,248,0.6)] leading-none select-none">
                  {hoursStr[1]}
                </span>
                <div className={`liquid-glass-svg-canvas glass-${hoursStr[1]}`} />
              </div>
              <div className="liquid-separator-slot separator flex flex-col items-center justify-center gap-3">
                <span className="ios27-liquid-circle-dot scale-125" />
                <span className="ios27-liquid-circle-dot scale-125" />
                <div className="liquid-glass-svg-canvas glass-points" />
              </div>
              <div className="liquid-number-slot minute-1 flex items-center justify-center relative">
                <span className="ios27-liquid-digit text-[90px] text-white/95 drop-shadow-[0_0_14px_rgba(56,189,248,0.6)] leading-none select-none">
                  {minutesStr[0]}
                </span>
                <div className={`liquid-glass-svg-canvas glass-${minutesStr[0]}`} />
              </div>
              <div className="liquid-number-slot minute-2 flex items-center justify-center relative">
                <span className="ios27-liquid-digit text-[90px] text-white/95 drop-shadow-[0_0_14px_rgba(56,189,248,0.6)] leading-none select-none">
                  {minutesStr[1]}
                </span>
                <div className={`liquid-glass-svg-canvas glass-${minutesStr[1]}`} />
              </div>
            </div>
          </div>
        ) : (
          /* Tabular Liquid Numeral Clock */
          <div
            className={`relative z-10 flex items-center gap-1.5 sm:gap-2 text-[68px] sm:text-[96px] md:text-[112px] leading-none select-none ${clockFont}`}
          >
            <span className="ios27-liquid-digit">{hoursStr[0]}</span>
            <span className="ios27-liquid-digit">{hoursStr[1]}</span>

            <div className="flex flex-col items-center justify-center gap-3 px-1">
              <span className="ios27-liquid-circle-dot" />
              <span className="ios27-liquid-circle-dot" />
            </div>

            <span className="ios27-liquid-digit">{minutesStr[0]}</span>
            <span className="ios27-liquid-digit">{minutesStr[1]}</span>

            <div className="hidden sm:flex flex-col items-center justify-end self-end mb-3 ml-1.5">
              <div className="flex items-center gap-1 text-xl font-bold">
                <span className="ios27-liquid-digit !text-xl">{secondsStr[0]}</span>
                <span className="ios27-liquid-digit !text-xl">{secondsStr[1]}</span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/65 mt-1">
                iOS 27 LIQUID
              </span>
            </div>
          </div>
        )}

        {/* LAYER z-20: FOREGROUND DEPTH SUBJECT SILHOUETTE */}
        {depthEffectEnabled && (
          <svg
            viewBox="0 0 600 90"
            preserveAspectRatio="none"
            className="pointer-events-none absolute -bottom-1 left-0 w-full h-[38px] sm:h-[48px] z-20 drop-shadow-[0_-8px_16px_rgba(0,0,0,0.65)]"
          >
            <path
              d="M0,90 L0,46 L68,18 L145,52 L235,10 L330,48 L430,14 L525,44 L600,22 L600,90 Z"
              fill={ridgeColor1}
              stroke={ridgeStroke}
              strokeWidth="1.5"
            />
            <path
              d="M0,90 L0,62 L110,34 L210,64 L310,28 L450,62 L600,38 L600,90 Z"
              fill={ridgeColor2}
            />
          </svg>
        )}
      </div>
    </div>
  );
};
