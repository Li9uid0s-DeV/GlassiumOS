import { useState, useRef } from 'react';
import { useOS, Wallpaper, AuroraColor } from '../OSContext';
import { ShellMode, DesignEngine } from '../types';
import { WALLPAPERS } from '../wallpapers';
import { Icon } from '../Icon';
import { AppLogo } from '../AppLogo';

type SettingsSection = 'display' | 'sound' | 'theme';

const WALLPAPER_CARDS: { id: Wallpaper; label: string; badge?: string }[] = [
  { id: 'live2d', label: 'Aurora Silk (Live 2D)', badge: 'Default' },
  { id: 'aurora', label: 'Northern Lights' },
  { id: 'ocean', label: 'Deep Ocean' },
  { id: 'cosmic', label: 'Amethyst Nebula' },
  { id: 'sunset', label: 'Crimson Dusk' },
  { id: 'forest', label: 'Emerald Canopy' },
  { id: 'bloom', label: 'Prism Bloom' },
  { id: 'shader', label: 'Liquid Silk Shader' },
  { id: 'space', label: 'Deep Space Horizon' },
];

const AURORA_PALETTES: { id: AuroraColor; label: string; preview: string }[] = [
  { id: 'cyan-violet', label: 'Amethyst & Cyan', preview: 'linear-gradient(135deg, #d946ef, #8b5cf6, #06b6d4)' },
  { id: 'emerald-sky', label: 'Emerald & Sky', preview: 'linear-gradient(135deg, #10b981, #0ea5e9, #6366f1)' },
  { id: 'rose-gold', label: 'Rose & Amber', preview: 'linear-gradient(135deg, #f43f5e, #d946ef, #f59e0b)' },
  { id: 'ocean-blue', label: 'Sapphire & Aqua', preview: 'linear-gradient(135deg, #2563eb, #06b6d4, #2dd4bf)' },
  { id: 'sunset-magenta', label: 'Neon Magenta', preview: 'linear-gradient(135deg, #ec4899, #8b5cf6, #38bdf8)' },
];

export function SettingsApp() {
  const {
    wallpaper,
    setWallpaper,
    customWallpapers,
    addCustomWallpaper,
    selectedCustomId,
    setSelectedCustomId,
    theme,
    setTheme,
    shellMode,
    setShellMode,
    designEngine,
    setDesignEngine,
    blurAmount,
    setBlurAmount,
    cornerRadius,
    setCornerRadius,
    transparency,
    setTransparency,
    glassCurvature,
    setGlassCurvature,
    auroraColor,
    setAuroraColor,
    auroraSpeed,
    setAuroraSpeed,
    auroraIntensity,
    setAuroraIntensity,
    auroraParticles,
    setAuroraParticles,
    volume,
    setVolume,
    brightness,
    setBrightness,
    soundEnabled,
    setSoundEnabled,
    playSound,
    taskbarAlign,
    setTaskbarAlign,
  } = useOS();

  const [section, setSection] = useState<SettingsSection>('display');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addCustomWallpaper(file.name.replace(/\.[^.]+$/, ''), reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const navItems: { id: SettingsSection; label: string; sub: string; icon: string }[] = [
    { id: 'display', label: 'Display & Wallpaper', sub: '壁紙・オーロラ・輝度', icon: 'Monitor' },
    { id: 'sound', label: 'Volume & Sound', sub: '音量・システム効果音', icon: 'Volume2' },
    { id: 'theme', label: 'Theme', sub: '2.5Dガラス・外観モード', icon: 'Palette' },
  ];

  return (
    <div className="flex h-full w-full min-w-0 min-h-0 bg-slate-900/40 backdrop-blur-md text-white select-none overflow-hidden">
      {/* Left Navigation Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/10 bg-slate-950/35 p-4 flex flex-col justify-between">
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <AppLogo size={28} glow />
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-white truncate">GlassiumOS-V4.0</div>
              <div className="text-[11px] text-white/45">System Preferences</div>
            </div>
          </div>

          {/* 3 Realistic Control Categories */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-fuchsia-500/25 via-violet-500/20 to-cyan-500/25 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),0_8px_20px_rgba(0,0,0,0.25)] border border-white/15'
                      : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-md'
                        : 'bg-white/10 text-white/75'
                    }`}
                  >
                    <Icon name={item.icon} size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{item.label}</div>
                    <div className="text-[10px] text-white/45 truncate">{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
          <div className="text-[11px] font-medium text-white/80">GlassiumOS-V4.0</div>
          <div className="text-[10px] text-white/45 mt-0.5">2.5D Fluid Glass Architecture</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ============================================================
            SECTION 1: DISPLAY & WALLPAPER
           ============================================================ */}
        {section === 'display' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Display & Wallpaper</h2>
              <p className="text-xs text-white/50 mt-0.5">
                画面の輝度、壁紙、およびライブオーロラの配色・動きを調整します。
              </p>
            </div>

            {/* Display Brightness Card */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon name="Sun" size={17} className="text-amber-300" />
                  <span className="text-sm font-medium">Display Brightness</span>
                </div>
                <span className="text-xs font-mono text-cyan-300">{brightness}%</span>
              </div>
              <input
                type="range"
                min={25}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="glass-slider w-full"
              />
            </div>

            {/* Wallpaper Selection Grid */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Wallpaper</div>
                  <div className="text-[11px] text-white/45">背景のガラス透過に映える壁紙を選択</div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium flex items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] transition"
                >
                  <Icon name="Upload" size={13} className="text-cyan-300" />
                  <span>画像を追加</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadWallpaper}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {WALLPAPER_CARDS.map((w) => {
                  const selected = wallpaper === w.id && !selectedCustomId;
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        setSelectedCustomId(null);
                        setWallpaper(w.id);
                      }}
                      className={`group relative h-24 rounded-xl overflow-hidden border text-left p-2.5 flex flex-col justify-between transition-all ${
                        selected
                          ? 'border-cyan-400 ring-2 ring-cyan-400/40 scale-[1.01]'
                          : 'border-white/15 hover:border-white/35'
                      }`}
                      style={{ background: (WALLPAPERS[w.id] ?? WALLPAPERS.live2d).style }}
                    >
                      <div className="flex justify-between items-start w-full">
                        {w.badge ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-[9px] font-semibold text-cyan-300 border border-white/15">
                            {w.badge}
                          </span>
                        ) : (
                          <span />
                        )}
                        {selected && (
                          <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow">
                            <Icon name="Check" size={12} />
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] truncate">
                        {w.label}
                      </div>
                    </button>
                  );
                })}

                {customWallpapers.map((cw) => {
                  const selected = selectedCustomId === cw.id;
                  return (
                    <button
                      key={cw.id}
                      onClick={() => setSelectedCustomId(cw.id)}
                      className={`relative h-24 rounded-xl overflow-hidden border text-left p-2.5 flex flex-col justify-end transition-all ${
                        selected
                          ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                          : 'border-white/15 hover:border-white/35'
                      }`}
                      style={{
                        backgroundImage: `url(${cw.dataUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div className="text-xs font-medium text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md truncate">
                        {cw.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Aurora Customization */}
            {wallpaper === 'live2d' && !selectedCustomId && (
              <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Aurora Live Customization</div>
                    <div className="text-[11px] text-white/45">2Dライブオーロラの色彩と流体速度</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70">光粒子エフェクト</span>
                    <button
                      type="button"
                      data-checked={auroraParticles}
                      onClick={() => setAuroraParticles(!auroraParticles)}
                      className="glass-switch"
                    >
                      <span className="glass-switch-thumb" />
                    </button>
                  </div>
                </div>

                {/* Color Palette */}
                <div className="grid grid-cols-5 gap-2">
                  {AURORA_PALETTES.map((p) => {
                    const active = auroraColor === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setAuroraColor(p.id)}
                        className={`p-2 rounded-xl border text-center transition ${
                          active
                            ? 'border-cyan-400 bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="h-6 w-full rounded-lg mb-1.5 shadow-inner" style={{ background: p.preview }} />
                        <div className="text-[10px] text-white/85 truncate">{p.label}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Speed & Intensity Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/75">Aurora Flow Speed</span>
                      <span className="font-mono text-cyan-300">{auroraSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={2.5}
                      step={0.1}
                      value={auroraSpeed}
                      onChange={(e) => setAuroraSpeed(Number(e.target.value))}
                      className="glass-slider w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/75">Lustre Intensity</span>
                      <span className="font-mono text-fuchsia-300">{auroraIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={100}
                      value={auroraIntensity}
                      onChange={(e) => setAuroraIntensity(Number(e.target.value))}
                      className="glass-slider w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            SECTION 2: VOLUME & SOUND
           ============================================================ */}
        {section === 'sound' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Volume & Sound</h2>
              <p className="text-xs text-white/50 mt-0.5">
                マスター音量とシステムUI効果音（Web Audioシンセサイザー）を制御します。
              </p>
            </div>

            {/* Master Volume Slider */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/25 via-violet-500/25 to-cyan-500/25 border border-white/15 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
                    <Icon
                      name={soundEnabled && volume > 0 ? 'Volume2' : 'VolumeX'}
                      size={20}
                      className="text-cyan-300"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Master Volume</div>
                    <div className="text-[11px] text-white/45">システム全体の出力レベル</div>
                  </div>
                </div>
                <span className="text-sm font-mono font-semibold text-cyan-300">
                  {soundEnabled ? `${volume}%` : 'Muted'}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={soundEnabled ? volume : 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  if (v > 0 && !soundEnabled) setSoundEnabled(true);
                }}
                className="glass-slider w-full"
              />

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div>
                  <div className="text-xs font-medium text-white/90">System Sound Effects</div>
                  <div className="text-[11px] text-white/45">ウィンドウ起動・通知・ロック時のフィードバック音</div>
                </div>
                <button
                  type="button"
                  data-checked={soundEnabled}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="glass-switch"
                >
                  <span className="glass-switch-thumb" />
                </button>
              </div>
            </div>

            {/* Sound Preview Card */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-5 space-y-3">
              <div className="text-sm font-medium">Acoustic Feedback Test</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'open' as const, label: 'Window Open', icon: 'Maximize2' },
                  { type: 'notify' as const, label: 'Notification Chime', icon: 'Bell' },
                  { type: 'click' as const, label: 'Glass Tap', icon: 'MousePointer' },
                ].map((s) => (
                  <button
                    key={s.type}
                    onClick={() => playSound(s.type)}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-gradient-to-r hover:from-fuchsia-500/20 hover:to-cyan-500/20 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] text-xs font-medium transition active:scale-95"
                  >
                    <Icon name={s.icon} size={14} className="text-cyan-300" />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            SECTION 3: THEME (2.5D GLASS & APPEARANCE)
           ============================================================ */}
        {section === 'theme' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Theme & 2.5D Glass</h2>
              <p className="text-xs text-white/50 mt-0.5">
                カラーモード、すりガラスの透明度・ぼかし・湾曲屈折、およびタスクバー配置を設定します。
              </p>
            </div>

            {/* Color Mode & Taskbar Alignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-4 space-y-3">
                <div className="text-xs font-semibold text-white/80">Appearance Mode</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['dark', 'light'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTheme(m)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium capitalize flex items-center justify-center gap-2 border transition ${
                        theme === m
                          ? 'bg-gradient-to-r from-fuchsia-500/30 to-cyan-500/30 border-cyan-400/50 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <Icon name={m === 'dark' ? 'Moon' : 'Sun'} size={14} />
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-4 space-y-3">
                <div className="text-xs font-semibold text-white/80">Taskbar Icon Alignment</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['center', 'left'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setTaskbarAlign(align)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium capitalize flex items-center justify-center gap-2 border transition ${
                        taskbarAlign === align
                          ? 'bg-gradient-to-r from-fuchsia-500/30 to-cyan-500/30 border-cyan-400/50 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <Icon name="LayoutGrid" size={14} />
                      <span>{align}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2.5D Glassmorphism Sliders */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-5 space-y-5">
              <div className="text-sm font-medium">2.5D Glass Optical Controls</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/75">Backdrop Blur</span>
                    <span className="font-mono text-cyan-300">{blurAmount}px</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={48}
                    value={blurAmount}
                    onChange={(e) => setBlurAmount(Number(e.target.value))}
                    className="glass-slider w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/75">Glass Transparency</span>
                    <span className="font-mono text-fuchsia-300">{transparency}%</span>
                  </div>
                  <input
                    type="range"
                    min={35}
                    max={92}
                    value={transparency}
                    onChange={(e) => setTransparency(Number(e.target.value))}
                    className="glass-slider w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/75">Lens Curvature (Refraction)</span>
                    <span className="font-mono text-violet-300">{glassCurvature}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={glassCurvature}
                    onChange={(e) => setGlassCurvature(Number(e.target.value))}
                    className="glass-slider w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/75">Window Corner Radius</span>
                    <span className="font-mono text-cyan-300">{cornerRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={32}
                    value={cornerRadius}
                    onChange={(e) => setCornerRadius(Number(e.target.value))}
                    className="glass-slider w-full"
                  />
                </div>
              </div>
            </div>

            {/* Glass Surface Material & Desktop Shell Layout */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 p-5 space-y-4">
              <div className="text-sm font-medium">Surface Finish & Desktop Layout</div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(
                  [
                    { id: 'liquid-glass', label: '2.5D Liquid Glass' },
                    { id: 'aero-crystal', label: 'Crystal Lens' },
                    { id: 'frosted-mica', label: 'Frosted Slate' },
                    { id: 'neon-cyber', label: 'Neon Amethyst' },
                  ] as { id: DesignEngine; label: string }[]
                ).map((eng) => (
                  <button
                    key={eng.id}
                    onClick={() => setDesignEngine(eng.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition ${
                      designEngine === eng.id
                        ? 'bg-gradient-to-br from-fuchsia-500/25 via-violet-500/20 to-cyan-500/25 border-cyan-400/50 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                        : 'bg-white/[0.04] border-white/10 text-white/65 hover:text-white'
                    }`}
                  >
                    {eng.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {(
                  [
                    { id: 'windows', label: 'Glassium Default' },
                    { id: 'mac', label: 'Dock Mode' },
                    { id: 'ubuntu', label: 'Split Bar' },
                    { id: 'windows10', label: 'Compact Bar' },
                  ] as { id: ShellMode; label: string }[]
                ).map((sh) => (
                  <button
                    key={sh.id}
                    onClick={() => setShellMode(sh.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                      shellMode === sh.id
                        ? 'bg-white/15 border-white/40 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                        : 'bg-white/[0.03] border-white/10 text-white/55 hover:text-white'
                    }`}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
