import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import {
  getMusicState,
  subscribeMusicState,
  toggleMusicPlay,
  nextMusicTrack,
  prevMusicTrack,
  setMusicVolume,
  seekMusicTrack,
  MusicPlayerState,
} from './musicBridge';

export type LiquidMusicShape = 'capsule' | 'vinyl-disc' | 'floating-card';

export interface LiquidGlassMusicWidgetProps {
  className?: string;
  defaultShape?: LiquidMusicShape;
}

export const LiquidGlassMusicWidget: React.FC<LiquidGlassMusicWidgetProps> = ({
  className = '',
  defaultShape = 'capsule',
}) => {
  const [musicState, setMusicState] = useState<MusicPlayerState | null>(() => getMusicState());
  const [shape, setShape] = useState<LiquidMusicShape>(() => {
    const saved = localStorage.getItem('glassium_music_liquid_shape') as LiquidMusicShape | null;
    return saved === 'capsule' || saved === 'vinyl-disc' || saved === 'floating-card'
      ? saved
      : defaultShape;
  });
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [weatherInPill, setWeatherInPill] = useState<'Sun' | 'CloudRain'>('Sun');

  useEffect(() => {
    return subscribeMusicState((st) => setMusicState(st));
  }, []);

  const handleSelectShape = (newShape: LiquidMusicShape) => {
    setShape(newShape);
    localStorage.setItem('glassium_music_liquid_shape', newShape);
    setShowShapeMenu(false);
  };

  if (!musicState || !musicState.currentTrack) {
    return null;
  }

  const { currentTrack, isPlaying, progress, currentTime, duration, volume } = musicState;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative select-none text-white ${className}`}>
      {/* Shape Selector Popover */}
      <AnimatePresence>
        {showShapeMenu && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-3xl border border-white/20 shadow-2xl flex items-center gap-2"
          >
            {[
              { id: 'capsule' as const, label: 'カプセル型', icon: 'Disc' },
              { id: 'vinyl-disc' as const, label: 'レコード型', icon: 'RotateCw' },
              { id: 'floating-card' as const, label: 'フロート型', icon: 'Layers' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectShape(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  shape === s.id
                    ? 'bg-cyan-400 text-slate-950 shadow-md font-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Icon name={s.icon} size={13} />
                <span>{s.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHAPE 1: LIQUID GLASS CAPSULE (流体ガラス カプセル型) */}
      {shape === 'capsule' && (
        <motion.div
          layout
          tabIndex={0}
          className="group liquid-music-pill-container relative flex items-center gap-3.5 px-4 py-3 rounded-full bg-white/[0.12] backdrop-blur-3xl border border-white/25 shadow-[0_20px_60px_rgba(0,0,0,0.65)] min-w-[360px] max-w-[540px] overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
        >
          {/* SVG liquid glass displacement overlay */}
          <div className="liquid-music-pill-body absolute inset-0 pointer-events-none z-0" />

          {/* Album artwork */}
          <div className="relative z-10 w-12 h-12 rounded-full overflow-hidden shadow-lg border border-white/30 shrink-0">
            {currentTrack.cover ? (
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''}`}
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-cyan-300">
                <Icon name="Music" size={20} />
              </div>
            )}
            <div className="absolute inset-0 rounded-full border-2 border-white/25 pointer-events-none" />
          </div>

          {/* Track Info & Scrubber */}
          <div className="relative z-10 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate font-black text-xs text-white drop-shadow">
                {currentTrack.title}
              </div>
              <div className="flex items-center gap-1">
                {/* Weather icon inside the pill with focused animation */}
                <button
                  type="button"
                  onClick={() => setWeatherInPill((w) => (w === 'Sun' ? 'CloudRain' : 'Sun'))}
                  className="liquid-weather-pill-btn flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] text-white/90 transition cursor-pointer relative"
                  title="クリックして天気アイコンを切替 (フォーカス時にアニメーション発動)"
                >
                  {weatherInPill === 'Sun' ? (
                    <div className="liquid-weather-icon-sun flex items-center justify-center text-amber-400">
                      <Icon name="Sun" size={13} />
                    </div>
                  ) : (
                    <div className="relative flex flex-col items-center">
                      <div className="liquid-weather-icon-rain text-cyan-300">
                        <Icon name="CloudRain" size={13} />
                      </div>
                      <div className="liquid-weather-raindrop w-0.5 h-1.5 bg-cyan-300 rounded-full absolute -bottom-1" />
                    </div>
                  )}
                  <span className="font-mono text-[10px] text-white/80">
                    {weatherInPill === 'Sun' ? '21°' : '18°'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowShapeMenu(!showShapeMenu)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                  title="UIの形状を変更"
                >
                  <Icon name="Sliders" size={12} />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-white/70 truncate">{currentTrack.artist}</div>

            {/* Micro Progress Bar */}
            <div
              className="mt-1.5 h-1.5 rounded-full bg-black/40 overflow-hidden cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                seekMusicTrack(ratio * duration);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-sky-300 rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
          </div>

          {/* Controls with optical liquid glass touch */}
          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => prevMusicTrack()}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition active:scale-95 cursor-pointer shadow"
              title="前の曲"
            >
              <Icon name="SkipBack" size={14} />
            </button>

            <button
              type="button"
              onClick={() => toggleMusicPlay()}
              className="w-10 h-10 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center font-bold shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
              title={isPlaying ? '一時停止' : '再生'}
            >
              <Icon name={isPlaying ? 'Pause' : 'Play'} size={17} />
            </button>

            <button
              type="button"
              onClick={() => nextMusicTrack()}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition active:scale-95 cursor-pointer shadow"
              title="次の曲"
            >
              <Icon name="SkipForward" size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* SHAPE 2: LIQUID GLASS VINYL DISC (流体ガラス レコード型) */}
      {shape === 'vinyl-disc' && (
        <motion.div
          layout
          className="relative flex items-center gap-4 p-4 rounded-3xl bg-black/45 backdrop-blur-3xl border border-white/20 shadow-2xl min-w-[340px]"
        >
          {/* Concentric grooved refractive disc */}
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            {/* Spinning liquid glass disc mask */}
            <div
              className={`absolute inset-0 rounded-full overflow-hidden ${
                isPlaying ? 'animate-[spin_9s_linear_infinite]' : ''
              }`}
            >
              <div className="liquid-music-disc-body absolute inset-0" />
              {/* Radial specular groove rings */}
              <div className="absolute inset-2 rounded-full border border-white/20 pointer-events-none" />
              <div className="absolute inset-5 rounded-full border border-white/15 pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-white/25 pointer-events-none" />
            </div>

            {/* Center Album Art Label */}
            <div className="relative z-10 w-10 h-10 rounded-full overflow-hidden shadow-inner border border-white/40">
              {currentTrack.cover ? (
                <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-cyan-300">
                  <Icon name="Music" size={14} />
                </div>
              )}
              {/* Spindle hole */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-950 border border-white/40" />
            </div>
          </div>

          {/* Details & Controls */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
                  VINYL DISK MODE
                </div>
                <div className="font-black text-sm text-white truncate max-w-[170px]">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-white/70 truncate max-w-[170px]">
                  {currentTrack.artist}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowShapeMenu(!showShapeMenu)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition cursor-pointer"
                title="形状を変更"
              >
                <Icon name="Sliders" size={12} />
              </button>
            </div>

            {/* Playback buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => prevMusicTrack()}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                title="前の曲"
              >
                <Icon name="SkipBack" size={14} />
              </button>
              <button
                type="button"
                onClick={() => toggleMusicPlay()}
                className="px-4 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow hover:scale-105 transition cursor-pointer"
              >
                <Icon name={isPlaying ? 'Pause' : 'Play'} size={14} />
                <span>{isPlaying ? '一時停止' : '再生'}</span>
              </button>
              <button
                type="button"
                onClick={() => nextMusicTrack()}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                title="次の曲"
              >
                <Icon name="SkipForward" size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* SHAPE 3: FLOATING GLASS CARD (流体グラスカード型) */}
      {shape === 'floating-card' && (
        <motion.div
          layout
          className="relative p-3.5 rounded-3xl bg-white/[0.09] backdrop-blur-3xl border border-white/20 shadow-2xl min-w-[340px] max-w-[440px] space-y-2.5"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shrink-0">
              {currentTrack.cover ? (
                <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-cyan-300">
                  <Icon name="Music" size={18} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs text-white truncate">{currentTrack.title}</div>
              <div className="text-[11px] text-white/70 truncate">{currentTrack.artist}</div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowShapeMenu(!showShapeMenu)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition cursor-pointer"
                title="形状を変更"
              >
                <Icon name="Sliders" size={12} />
              </button>
            </div>
          </div>

          {/* Time & Progress */}
          <div className="space-y-1">
            <div
              className="h-1.5 rounded-full bg-black/40 overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                seekMusicTrack(ratio * duration);
              }}
            >
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/60 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMusicVolume(Math.max(0, volume - 0.1))}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80"
                title="音量小"
              >
                <Icon name="Volume1" size={13} />
              </button>
              <span className="text-[10px] font-mono text-cyan-200">{Math.round(volume * 100)}%</span>
              <button
                type="button"
                onClick={() => setMusicVolume(Math.min(1, volume + 0.1))}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80"
                title="音量大"
              >
                <Icon name="Volume2" size={13} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => prevMusicTrack()}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <Icon name="SkipBack" size={14} />
              </button>
              <button
                type="button"
                onClick={() => toggleMusicPlay()}
                className="w-9 h-9 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center justify-center shadow cursor-pointer"
              >
                <Icon name={isPlaying ? 'Pause' : 'Play'} size={15} />
              </button>
              <button
                type="button"
                onClick={() => nextMusicTrack()}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <Icon name="SkipForward" size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
