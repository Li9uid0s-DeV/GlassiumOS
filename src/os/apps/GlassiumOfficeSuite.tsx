import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOS } from '../OSContext';
import { Icon } from '../Icon';
import {
  globalAudio,
  GlobalAudioState,
  EQ_BAND_LABELS,
  BUILTIN_EQ_PRESETS,
  SpatialRoomModel,
} from '../globalAudioManager';

// ============================================================================
// 1. GLASSIUM SONIC 3D — OS-WIDE SPATIAL AUDIO & 10-BAND PARAMETRIC EQ SUITE
// ============================================================================

const ROOM_MODELS: {
  id: SpatialRoomModel;
  name: string;
  desc: string;
  badge: string;
}[] = [
  {
    id: 'studio',
    name: 'Studio Reference',
    desc: '初期反射を抑えたニアフィールドモニター空間',
    badge: 'Nearfield',
  },
  {
    id: 'theater',
    name: 'Cinema Theater 7.1.4',
    desc: '深いサブベースと広大なフロント・サラウンド音場',
    badge: 'Dolby 3D',
  },
  {
    id: 'binaural',
    name: 'Headphone Binaural HRTF',
    desc: '頭部伝達関数(HRTF)とクロスフィードによる自然な頭外定位',
    badge: 'HRTF',
  },
  {
    id: 'concert-hall',
    name: 'Symphony Concert Hall',
    desc: '豊かな初期反射と1.8秒〜2.2秒のホール残響',
    badge: 'Acoustic',
  },
  {
    id: 'club-arena',
    name: 'Live Arena / Club',
    desc: '重厚なローエンドとアリーナ特有の立体的な広がり',
    badge: 'Live PA',
  },
  {
    id: 'cathedral',
    name: 'Grand Cathedral',
    desc: '高い天井と長い減衰特性を持つ聖堂空間シミュレーション',
    badge: 'Long Decay',
  },
];

export function GlassiumSonicStudio() {
  const { theme, resolvedAccentHex, saveFile, playSound } = useOS();
  const isLight = theme === 'light';

  const [audioState, setAudioState] = useState<GlobalAudioState>(() => globalAudio.getState());
  const [activeTab, setActiveTab] = useState<'spatial' | 'eq' | 'analyzer'>('spatial');
  const [draggingPad, setDraggingPad] = useState(false);
  const [testToneActive, setTestToneActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const padRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const testCtxRef = useRef<AudioContext | null>(null);
  const testOscRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    return globalAudio.subscribe((st) => {
      setAudioState(st);
    });
  }, []);

  // Real-time 60fps FFT Spectrum & Spatial Radar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let phase = 0;

    const render = () => {
      phase += 0.05;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const spec = globalAudio.getFrequencySpectrum();
      const bars = 40;
      const barW = (w - (bars - 1) * 3) / bars;

      for (let i = 0; i < bars; i++) {
        let norm = 0.08;
        if (spec && spec.length > 0) {
          const bin = Math.min(spec.length - 1, Math.floor((i / bars) * (spec.length * 0.75)));
          norm = Math.max(0.06, spec[bin] / 255);
        } else if (testToneActive) {
          norm = 0.25 + 0.45 * Math.abs(Math.sin(phase * 2 + i * 0.25));
        } else {
          const eqBoost = (audioState.eqBands[Math.floor((i / bars) * 10)] || 0) / 24;
          norm = Math.max(0.05, Math.min(0.92, 0.14 + Math.sin(phase + i * 0.32) * 0.08 + eqBoost));
        }

        const barH = norm * (h - 16);
        const x = i * (barW + 3);
        const y = h - barH;

        const grad = ctx.createLinearGradient(0, y, 0, h);
        grad.addColorStop(0, resolvedAccentHex);
        grad.addColorStop(1, 'rgba(99, 102, 241, 0.2)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 3);
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [audioState.eqBands, resolvedAccentHex, testToneActive]);

  // Cleanup test tone on unmount
  useEffect(() => {
    return () => {
      if (testOscRef.current) {
        try {
          testOscRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (testCtxRef.current) {
        testCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const sp = audioState.spatialDetails;

  const updatePadFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (clientX - cx) / (rect.width / 2);
    const dy = (clientY - cy) / (rect.height / 2);

    const clampedX = Math.max(-1, Math.min(1, dx));
    const clampedY = Math.max(-1, Math.min(1, dy));

    // Angle around listener: top (0, -1) = 0 deg, right (1, 0) = +90 deg, left (-1, 0) = -90 deg, bottom = +-180 deg
    const azimuthDeg = Math.round((Math.atan2(clampedX, -clampedY) * 180) / Math.PI);
    const radial = Math.min(1, Math.hypot(clampedX, clampedY));
    const distanceMeters = Math.round((0.5 + radial * 4.0) * 10) / 10;

    globalAudio.setSpatialDetails({
      azimuthDeg,
      distanceMeters,
      autoOrbit: false,
    });
  };

  const toggleTestTone = () => {
    if (testToneActive) {
      if (testOscRef.current) {
        try {
          testOscRef.current.stop();
        } catch {
          // ignore
        }
        testOscRef.current = null;
      }
      if (testCtxRef.current) {
        testCtxRef.current.close().catch(() => {});
        testCtxRef.current = null;
      }
      setTestToneActive(false);
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      const azRad = (sp.azimuthDeg * Math.PI) / 180;
      const elRad = (sp.elevationDeg * Math.PI) / 180;
      panner.setPosition(
        sp.distanceMeters * Math.sin(azRad) * Math.cos(elRad),
        sp.distanceMeters * Math.sin(elRad),
        -sp.distanceMeters * Math.cos(azRad) * Math.cos(elRad)
      );
      osc.type = 'sine';
      osc.frequency.value = 432;
      gain.gain.value = 0.12;
      osc.connect(panner);
      panner.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      testCtxRef.current = ctx;
      testOscRef.current = osc;
      setTestToneActive(true);
    } catch {
      // ignore
    }
  };

  const handleExportProfile = () => {
    const profileJson = JSON.stringify(
      {
        version: 'GlassiumOS 5 u4 Sonic 3D Profile',
        dolbyAtmosEnabled: audioState.dolbyAtmosEnabled,
        spatialDetails: audioState.spatialDetails,
        eqEnabled: audioState.eqEnabled,
        eqPresetName: audioState.eqPresetName,
        eqPreampDb: audioState.eqPreampDb,
        eqBands: audioState.eqBands,
      },
      null,
      2
    );
    saveFile(['Documents'], 'Sonic3D_Audio_Profile.json', profileJson);
    playSound('notify');
    setStatusMsg('Documents/Sonic3D_Audio_Profile.json に音響プロファイルを保存しました');
    setTimeout(() => setStatusMsg(null), 3200);
  };

  // Convert spherical (azimuthDeg, distanceMeters) to 2D radar pad coordinates (-1..1)
  const padNormDist = Math.min(1, Math.max(0, (sp.distanceMeters - 0.5) / 4.0));
  const azRad = (sp.azimuthDeg * Math.PI) / 180;
  const dotXPercent = 50 + Math.sin(azRad) * padNormDist * 42;
  const dotYPercent = 50 - Math.cos(azRad) * padNormDist * 42;

  return (
    <div
      className={`h-full w-full flex flex-col select-none overflow-hidden ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#090d16] text-white'
      }`}
    >
      {/* Top Bar */}
      <div
        className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'apple-liquid-glass border-white/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md bg-white/[0.06] border border-white/10">
            <Icon name="sonicstudio" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight">Glassium Sonic 3D</span>
              <span
                style={{ backgroundColor: `${resolvedAccentHex}25`, color: resolvedAccentHex }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold"
              >
                HRTF 3D DSP · 10-Band EQ
              </span>
            </div>
            <div className="text-[11px] opacity-60">
              OS全体およびGlassium Musicの立体音響・空間定位・10バンドイコライザーをリアルタイム制御
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl p-1 bg-white/[0.06] border border-white/10">
            {(
              [
                { id: 'spatial', label: '3D 立体音響・空間定位' },
                { id: 'eq', label: '10バンド EQ・プリアンプ' },
                { id: 'analyzer', label: 'スペクトラム・音響診断' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={activeTab === t.id ? { backgroundColor: resolvedAccentHex } : undefined}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === t.id ? 'text-white shadow' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => globalAudio.setDolbyAtmos(!audioState.dolbyAtmosEnabled)}
            style={
              audioState.dolbyAtmosEnabled ? { backgroundColor: resolvedAccentHex } : undefined
            }
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              audioState.dolbyAtmosEnabled
                ? 'text-white shadow-lg'
                : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            3D立体音響: {audioState.dolbyAtmosEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={handleExportProfile}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold transition"
          >
            設定を保存
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          style={{ backgroundColor: `${resolvedAccentHex}22`, borderColor: resolvedAccentHex }}
          className="mx-5 mt-3 px-4 py-2 rounded-xl border text-xs font-bold flex items-center justify-between"
        >
          <span>{statusMsg}</span>
          <button type="button" onClick={() => setStatusMsg(null)} className="opacity-60">
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTab === 'spatial' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Interactive 3D HRTF Soundstage Pad */}
            <div
              className={`lg:col-span-5 rounded-2xl p-5 border flex flex-col items-center justify-between gap-4 ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'apple-liquid-glass border-white/10'
              }`}
            >
              <div className="w-full flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-75">
                    3D HRTF 空間ポジショニング
                  </h3>
                  <p className="text-[11px] opacity-55 mt-0.5">
                    音源ドットをドラッグして方位角({sp.azimuthDeg}°)・距離({sp.distanceMeters}m)を調整
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    globalAudio.setSpatialDetails({
                      azimuthDeg: 0,
                      elevationDeg: 8,
                      distanceMeters: 1.4,
                      autoOrbit: false,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold"
                >
                  正面にリセット
                </button>
              </div>

              {/* 2D Radar Soundstage Pad */}
              <div
                ref={padRef}
                onPointerDown={(e) => {
                  setDraggingPad(true);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updatePadFromPointer(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!draggingPad) return;
                  updatePadFromPointer(e.clientX, e.clientY);
                }}
                onPointerUp={(e) => {
                  setDraggingPad(false);
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                className="relative w-60 h-60 rounded-full border border-white/20 bg-radial from-cyan-500/15 via-indigo-950/40 to-black/70 cursor-crosshair select-none shadow-inner flex items-center justify-center"
              >
                {/* Concentric Distance Rings */}
                <div className="w-44 h-44 rounded-full border border-dashed border-white/15 pointer-events-none" />
                <div className="w-28 h-28 rounded-full border border-dashed border-white/15 pointer-events-none" />
                <div className="w-12 h-12 rounded-full border border-white/20 pointer-events-none" />
                {/* Crosshair Axes */}
                <div className="absolute inset-x-4 h-px bg-white/10 pointer-events-none" />
                <div className="absolute inset-y-4 w-px bg-white/10 pointer-events-none" />
                {/* Direction Labels */}
                <span className="absolute top-2 text-[10px] font-mono opacity-60 pointer-events-none">
                  FRONT (0°)
                </span>
                <span className="absolute bottom-2 text-[10px] font-mono opacity-50 pointer-events-none">
                  REAR (±180°)
                </span>
                <span className="absolute left-2.5 text-[10px] font-mono opacity-50 pointer-events-none">
                  L (-90°)
                </span>
                <span className="absolute right-2.5 text-[10px] font-mono opacity-50 pointer-events-none">
                  R (+90°)
                </span>

                {/* Listener Head in Center */}
                <div className="w-7 h-7 rounded-full bg-white/15 border border-white/40 flex items-center justify-center text-[10px] font-bold pointer-events-none">
                  🎧
                </div>

                {/* Draggable 3D Audio Source Node */}
                <div
                  style={{
                    left: `${dotXPercent}%`,
                    top: `${dotYPercent}%`,
                    backgroundColor: resolvedAccentHex,
                    boxShadow: `0 0 20px ${resolvedAccentHex}`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center pointer-events-none transition-transform duration-75"
                >
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>

              {/* 360° Auto-Orbit & Elevation Controls */}
              <div className="w-full space-y-2.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => globalAudio.setSpatialDetails({ autoOrbit: !sp.autoOrbit })}
                    style={sp.autoOrbit ? { backgroundColor: resolvedAccentHex } : undefined}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      sp.autoOrbit
                        ? 'text-white shadow-md'
                        : 'bg-white/10 hover:bg-white/15 text-white/80'
                    }`}
                  >
                    360° 自動オービット回転: {sp.autoOrbit ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleTestTone}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                      testToneActive
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    {testToneActive ? 'テスト音停止' : '432Hz 空間テスト音'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex justify-between font-mono">
                      <span className="opacity-60">方位角</span>
                      <span>{sp.azimuthDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={sp.azimuthDeg}
                      onChange={(e) =>
                        globalAudio.setSpatialDetails({
                          azimuthDeg: Number(e.target.value),
                          autoOrbit: false,
                        })
                      }
                      style={{ accentColor: resolvedAccentHex }}
                      className="w-full mt-1"
                    />
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex justify-between font-mono">
                      <span className="opacity-60">仰角(高さ)</span>
                      <span>{sp.elevationDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      value={sp.elevationDeg}
                      onChange={(e) =>
                        globalAudio.setSpatialDetails({ elevationDeg: Number(e.target.value) })
                      }
                      style={{ accentColor: resolvedAccentHex }}
                      className="w-full mt-1"
                    />
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex justify-between font-mono">
                      <span className="opacity-60">音源距離</span>
                      <span>{sp.distanceMeters.toFixed(1)}m</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={5.0}
                      step={0.1}
                      value={sp.distanceMeters}
                      onChange={(e) =>
                        globalAudio.setSpatialDetails({ distanceMeters: Number(e.target.value) })
                      }
                      style={{ accentColor: resolvedAccentHex }}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Acoustic Room Models & Detailed DSP Parameters */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Room Acoustic Modeling Cards */}
              <div
                className={`rounded-2xl p-4 border ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'apple-liquid-glass border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                    空間ルームモデリング (インパルス応答 &amp; 初期反射)
                  </span>
                  <span className="text-[11px] font-mono opacity-60">
                    現在: {ROOM_MODELS.find((r) => r.id === sp.roomModel)?.name || sp.roomModel}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ROOM_MODELS.map((rm) => {
                    const active = sp.roomModel === rm.id;
                    return (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => {
                          playSound('click');
                          globalAudio.setSpatialDetails({ roomModel: rm.id });
                        }}
                        style={
                          active
                            ? {
                                borderColor: resolvedAccentHex,
                                backgroundColor: `${resolvedAccentHex}20`,
                              }
                            : undefined
                        }
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                          active
                            ? 'shadow-md'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate">{rm.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 shrink-0">
                            {rm.badge}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-65 leading-snug line-clamp-2">{rm.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Spatial Sliders */}
              <div
                className={`rounded-2xl p-4 border grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'apple-liquid-glass border-white/10'
                }`}
              >
                {[
                  {
                    label: 'ステレオ音場拡張 (Stereo Width)',
                    value: `${sp.stereoWidth}%`,
                    min: 0,
                    max: 200,
                    step: 1,
                    num: sp.stereoWidth,
                    onChange: (v: number) => globalAudio.setSpatialDetails({ stereoWidth: v }),
                  },
                  {
                    label: '空間リバーブ残響量 (Reverb Wet)',
                    value: `${sp.reverbWet}%`,
                    min: 0,
                    max: 100,
                    step: 1,
                    num: sp.reverbWet,
                    onChange: (v: number) => globalAudio.setSpatialDetails({ reverbWet: v }),
                  },
                  {
                    label: '残響減衰時間 (Room Decay Time)',
                    value: `${sp.roomDecaySec.toFixed(2)}s`,
                    min: 0.3,
                    max: 3.5,
                    step: 0.05,
                    num: sp.roomDecaySec,
                    onChange: (v: number) => globalAudio.setSpatialDetails({ roomDecaySec: v }),
                  },
                  {
                    label: 'バイノーラル・クロスフィード (Crossfeed)',
                    value: `${sp.crossfeed}%`,
                    min: 0,
                    max: 100,
                    step: 1,
                    num: sp.crossfeed,
                    onChange: (v: number) => globalAudio.setSpatialDetails({ crossfeed: v }),
                  },
                  {
                    label: 'LFE 重低音エンハンサー (82Hz Sub-Bass)',
                    value: `${sp.subBassBoostDb > 0 ? '+' : ''}${sp.subBassBoostDb.toFixed(1)} dB`,
                    min: -6,
                    max: 12,
                    step: 0.5,
                    num: sp.subBassBoostDb,
                    onChange: (v: number) => globalAudio.setSpatialDetails({ subBassBoostDb: v }),
                  },
                  {
                    label: 'ボーカル輪郭フォーカス (3.1kHz Presence)',
                    value: `${sp.vocalClarityDb > 0 ? '+' : ''}${sp.vocalClarityDb.toFixed(1)} dB`,
                    min: -6,
                    max: 12,
                    step: 0.5,
                    num: sp.vocalClarityDb,
                    onChange: (v: number) => globalAudio.setSpatialDetails({ vocalClarityDb: v }),
                  },
                  {
                    label: '超高域エアー倍音 (10.2kHz Air Shelf)',
                    value: `${sp.airBrillianceDb > 0 ? '+' : ''}${sp.airBrillianceDb.toFixed(1)} dB`,
                    min: -6,
                    max: 12,
                    step: 0.5,
                    num: sp.airBrillianceDb,
                    onChange: (v: number) => globalAudio.setSpatialDetails({ airBrillianceDb: v }),
                  },
                  {
                    label: 'オービット回転速度 (Orbit Speed)',
                    value: `${sp.orbitSpeed.toFixed(1)}x`,
                    min: 0.2,
                    max: 3.0,
                    step: 0.1,
                    num: sp.orbitSpeed,
                    onChange: (v: number) => globalAudio.setSpatialDetails({ orbitSpeed: v }),
                  },
                ].map((ctrl) => (
                  <div
                    key={ctrl.label}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold opacity-85">{ctrl.label}</span>
                      <span
                        style={{ color: resolvedAccentHex }}
                        className="font-mono font-bold text-[11px]"
                      >
                        {ctrl.value}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step}
                      value={ctrl.num}
                      onChange={(e) => ctrl.onChange(Number(e.target.value))}
                      style={{ accentColor: resolvedAccentHex }}
                      className="w-full cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'eq' && (
          <div
            className={`rounded-2xl p-5 border space-y-5 ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'apple-liquid-glass border-white/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">10バンド・パラメトリックイコライザー</h3>
                <p className="text-xs opacity-60">
                  32Hz〜16kHz の各帯域ゲイン (-12dB〜+12dB) とプリアンプをリアルタイム制御
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => globalAudio.setEqualizer({ enabled: !audioState.eqEnabled })}
                  style={audioState.eqEnabled ? { backgroundColor: resolvedAccentHex } : undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    audioState.eqEnabled ? 'text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  EQ: {audioState.eqEnabled ? 'ON' : 'OFF'}
                </button>
                {BUILTIN_EQ_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      globalAudio.setEqualizer({
                        enabled: true,
                        bands: [...p.bands],
                        preampDb: p.preampDb,
                        presetName: p.name,
                      })
                    }
                    style={
                      audioState.eqPresetName === p.name
                        ? { backgroundColor: resolvedAccentHex }
                        : undefined
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      audioState.eqPresetName === p.name
                        ? 'text-white shadow'
                        : 'bg-white/10 hover:bg-white/15 opacity-80'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Preamp Slider */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-4">
              <span className="text-xs font-bold w-28 shrink-0">プリアンプ (Preamp)</span>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={audioState.eqPreampDb}
                onChange={(e) =>
                  globalAudio.setEqualizer({ preampDb: Number(e.target.value), presetName: 'Custom' })
                }
                style={{ accentColor: resolvedAccentHex }}
                className="flex-1 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold w-16 text-right">
                {audioState.eqPreampDb > 0 ? `+${audioState.eqPreampDb}` : audioState.eqPreampDb} dB
              </span>
            </div>

            {/* 10 Vertical Band Faders */}
            <div className="grid grid-cols-10 gap-2 pt-2">
              {EQ_BAND_LABELS.map((freq, i) => {
                const gain = audioState.eqBands[i] ?? 0;
                return (
                  <div
                    key={freq}
                    className="flex flex-col items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10"
                  >
                    <span className="text-[10px] font-mono opacity-80">
                      {gain > 0 ? `+${gain}` : gain}dB
                    </span>
                    <div className="h-36 flex items-center justify-center">
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={gain}
                        onChange={(e) => {
                          const next = [...audioState.eqBands];
                          next[i] = Number(e.target.value);
                          globalAudio.setEqualizer({
                            enabled: true,
                            bands: next,
                            presetName: 'Custom',
                          });
                        }}
                        style={{
                          writingMode: 'vertical-lr',
                          direction: 'rtl',
                          accentColor: resolvedAccentHex,
                        }}
                        className="h-32 w-5 cursor-pointer"
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold opacity-75">{freq}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Spectrum Visualizer Bar (Always visible on analyzer tab or bottom) */}
        <div
          className={`rounded-2xl p-4 border ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'apple-liquid-glass border-white/10'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">
              リアルタイム FFT スペクトラムアナライザー (Web Audio AnalyserNode)
            </span>
            <span className="text-[11px] font-mono opacity-60">
              {audioState.track
                ? `再生中: ${audioState.track.title} — ${audioState.track.artist}`
                : '待機中 (音楽再生時にリアルタイム波形を表示)'}
            </span>
          </div>
          <canvas ref={canvasRef} width={760} height={110} className="w-full h-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. GLASSIUM SHEET (EXCEL) — FULL SPREADSHEET ENGINE WITH FORMULAS & CHARTS
// ============================================================================

interface CellFormatting {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bg?: string;
  format?: 'auto' | 'currency' | 'percent';
}

interface SheetTab {
  id: string;
  name: string;
  cells: Record<string, string>;
  styles: Record<string, CellFormatting>;
}

const SHEET_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const SHEET_ROWS = Array.from({ length: 24 }, (_, i) => i + 1);

const INITIAL_SHEETS: SheetTab[] = [
  {
    id: 'sheet-sales',
    name: '月次売上・収支分析',
    cells: {
      A1: '部門 / 項目',
      B1: 'Q1 売上',
      C1: 'Q2 売上',
      D1: 'Q3 売上',
      E1: 'Q4 売上',
      F1: '年間合計',
      G1: '四半期平均',
      A2: 'クラウド基盤事業',
      B2: '142000',
      C2: '168000',
      D2: '189000',
      E2: '215000',
      F2: '=SUM(B2:E2)',
      G2: '=AVERAGE(B2:E2)',
      A3: 'オーディオDSP製品',
      B3: '98000',
      C3: '112000',
      D3: '134000',
      E3: '156000',
      F3: '=SUM(B3:E3)',
      G3: '=AVERAGE(B3:E3)',
      A4: 'オフィススイート契約',
      B4: '84000',
      C4: '95000',
      D4: '118000',
      E4: '142000',
      F4: '=SUM(B4:E4)',
      G4: '=AVERAGE(B4:E4)',
      A5: 'エンタープライズ保守',
      B5: '64000',
      C5: '72000',
      D5: '79000',
      E5: '88000',
      F5: '=SUM(B5:E5)',
      G5: '=AVERAGE(B5:E5)',
      A6: '全社合計',
      B6: '=SUM(B2:B5)',
      C6: '=SUM(C2:C5)',
      D6: '=SUM(D2:D5)',
      E6: '=SUM(E2:E5)',
      F6: '=SUM(F2:F5)',
      G6: '=AVERAGE(G2:G5)',
      A8: '最高売上部門額',
      B8: '=MAX(F2:F5)',
      A9: '最小売上部門額',
      B9: '=MIN(F2:F5)',
      A10: '達成判定 (IF式)',
      B10: '=IF(F6>1500000,"目標達成","要改善")',
    },
    styles: {
      A1: { bold: true, bg: 'rgba(16,185,129,0.22)' },
      B1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.22)' },
      C1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.22)' },
      D1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.22)' },
      E1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.22)' },
      F1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.22)' },
      G1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.22)' },
      A6: { bold: true, bg: 'rgba(6,182,212,0.18)' },
      B6: { bold: true, format: 'currency', bg: 'rgba(6,182,212,0.18)' },
      C6: { bold: true, format: 'currency', bg: 'rgba(6,182,212,0.18)' },
      D6: { bold: true, format: 'currency', bg: 'rgba(6,182,212,0.18)' },
      E6: { bold: true, format: 'currency', bg: 'rgba(6,185,212,0.18)' },
      F6: { bold: true, format: 'currency', bg: 'rgba(6,182,212,0.25)' },
      G6: { bold: true, format: 'currency', bg: 'rgba(6,182,212,0.18)' },
    },
  },
  {
    id: 'sheet-budget',
    name: 'プロジェクト工数・予算',
    cells: {
      A1: 'タスク名',
      B1: '担当者',
      C1: '単価(円/h)',
      D1: '工数(h)',
      E1: '小計金額',
      A2: 'UI/UX システム設計',
      B2: '佐藤',
      C2: '6500',
      D2: '42',
      E2: '=C2*D2',
      A3: '3D 音響エンジン実装',
      B3: '鈴木',
      C3: '7800',
      D3: '55',
      E3: '=C3*D3',
      A4: '気象レーダーAPI統合',
      B4: '高橋',
      C4: '7000',
      D4: '36',
      E4: '=C4*D4',
      A5: '品質検証・自動テスト',
      B5: '田中',
      C5: '5800',
      D5: '28',
      E5: '=C5*D5',
      A6: '合計',
      D6: '=SUM(D2:D5)',
      E6: '=SUM(E2:E5)',
    },
    styles: {
      A1: { bold: true, bg: 'rgba(16,185,129,0.2)' },
      B1: { bold: true, bg: 'rgba(16,185,129,0.2)' },
      C1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.2)' },
      D1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.2)' },
      E1: { bold: true, align: 'right', bg: 'rgba(16,185,129,0.2)' },
    },
  },
];

function expandCellRange(startRef: string, endRef: string): string[] {
  const m1 = startRef.match(/^([A-J])(\d+)$/i);
  const m2 = endRef.match(/^([A-J])(\d+)$/i);
  if (!m1 || !m2) return [];
  const c1 = SHEET_COLS.indexOf(m1[1].toUpperCase());
  const r1 = parseInt(m1[2], 10);
  const c2 = SHEET_COLS.indexOf(m2[1].toUpperCase());
  const r2 = parseInt(m2[2], 10);
  const list: string[] = [];
  for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      list.push(`${SHEET_COLS[c]}${r}`);
    }
  }
  return list;
}

function evaluateSheetCell(
  raw: string | undefined,
  cells: Record<string, string>,
  depth = 0
): string | number {
  if (!raw) return '';
  if (depth > 8) return '#RECUR!';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('=')) {
    const num = Number(trimmed);
    return trimmed !== '' && !Number.isNaN(num) ? num : trimmed;
  }

  const expr = trimmed.slice(1).trim();

  // IF(condition, trueVal, falseVal)
  const ifMatch = expr.match(/^IF\s*\(([^,]+),([^,]+),([^)]+)\)$/i);
  if (ifMatch) {
    const condStr = ifMatch[1].trim();
    const tVal = ifMatch[2].trim().replace(/^"|"$/g, '');
    const fVal = ifMatch[3].trim().replace(/^"|"$/g, '');
    const opMatch = condStr.match(/^([A-J]\d+|\d+(?:\.\d+)?)\s*(>=|<=|>|<|=)\s*([A-J]\d+|\d+(?:\.\d+)?)$/i);
    if (opMatch) {
      const lhsRaw = /^[A-J]\d+$/i.test(opMatch[1])
        ? Number(evaluateSheetCell(cells[opMatch[1].toUpperCase()], cells, depth + 1)) || 0
        : Number(opMatch[1]) || 0;
      const rhsRaw = /^[A-J]\d+$/i.test(opMatch[3])
        ? Number(evaluateSheetCell(cells[opMatch[3].toUpperCase()], cells, depth + 1)) || 0
        : Number(opMatch[3]) || 0;
      const op = opMatch[2];
      const pass =
        op === '>'
          ? lhsRaw > rhsRaw
          : op === '<'
          ? lhsRaw < rhsRaw
          : op === '>='
          ? lhsRaw >= rhsRaw
          : op === '<='
          ? lhsRaw <= rhsRaw
          : lhsRaw === rhsRaw;
      return pass ? tVal : fVal;
    }
  }

  // Range functions: SUM, AVERAGE, MIN, MAX, COUNT
  const fnMatch = expr.match(/^(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\s*\(\s*([A-J]\d+)\s*:\s*([A-J]\d+)\s*\)$/i);
  if (fnMatch) {
    const fn = fnMatch[1].toUpperCase();
    const refs = expandCellRange(fnMatch[2], fnMatch[3]);
    const nums = refs
      .map((r) => Number(evaluateSheetCell(cells[r], cells, depth + 1)))
      .filter((n) => !Number.isNaN(n) && Number.isFinite(n));
    if (fn === 'COUNT') return nums.length;
    if (nums.length === 0) return 0;
    const sum = nums.reduce((a, b) => a + b, 0);
    if (fn === 'SUM') return Math.round(sum * 100) / 100;
    if (fn === 'AVERAGE' || fn === 'AVG') return Math.round((sum / nums.length) * 100) / 100;
    if (fn === 'MIN') return Math.min(...nums);
    if (fn === 'MAX') return Math.max(...nums);
  }

  // Arithmetic expression with cell references e.g. =C2*D2 or =B2+C2-D2
  try {
    const substituted = expr.toUpperCase().replace(/[A-J]\d+/g, (ref) => {
      const val = Number(evaluateSheetCell(cells[ref], cells, depth + 1));
      return Number.isNaN(val) ? '0' : String(val);
    });
    if (/^[0-9+\-*/().\s]+$/.test(substituted)) {
      const res = Function(`"use strict"; return (${substituted});`)();
      return typeof res === 'number' && Number.isFinite(res) ? Math.round(res * 100) / 100 : '#ERR';
    }
  } catch {
    return '#ERR';
  }
  return '#ERR';
}

export function GlassiumSheetApp() {
  const { theme, resolvedAccentHex, saveFile, playSound } = useOS();
  const isLight = theme === 'light';

  const [sheets, setSheets] = useState<SheetTab[]>(() => {
    try {
      const saved = localStorage.getItem('glassium_sheet_v5_u4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SHEETS;
  });

  const [activeSheetId, setActiveSheetId] = useState<string>(sheets[0].id);
  const [selectedCell, setSelectedCell] = useState<string>('F2');
  const [showChartPanel, setShowChartPanel] = useState<boolean>(true);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('glassium_sheet_v5_u4', JSON.stringify(sheets));
    } catch {
      // ignore
    }
  }, [sheets]);

  const activeSheet = useMemo(
    () => sheets.find((s) => s.id === activeSheetId) || sheets[0],
    [sheets, activeSheetId]
  );

  const selectedStyle = activeSheet.styles[selectedCell] || {};

  const updateCell = (cellId: string, value: string) => {
    setSheets((prev) =>
      prev.map((s) =>
        s.id === activeSheet.id ? { ...s, cells: { ...s.cells, [cellId]: value } } : s
      )
    );
  };

  const updateCellStyle = (cellId: string, patch: Partial<CellFormatting>) => {
    setSheets((prev) =>
      prev.map((s) =>
        s.id === activeSheet.id
          ? {
              ...s,
              styles: {
                ...s.styles,
                [cellId]: { ...(s.styles[cellId] || {}), ...patch },
              },
            }
          : s
      )
    );
  };

  const insertFormulaAtSelected = (fnTemplate: string) => {
    updateCell(selectedCell, fnTemplate);
  };

  const sortByColumn = (colLetter: string, asc: boolean) => {
    const rowsData: { rowNum: number; cols: Record<string, string> }[] = [];
    for (let r = 2; r <= 15; r++) {
      const rowCols: Record<string, string> = {};
      let hasAny = false;
      for (const c of SHEET_COLS) {
        const v = activeSheet.cells[`${c}${r}`];
        if (v !== undefined && v !== '') hasAny = true;
        if (v !== undefined) rowCols[c] = v;
      }
      if (hasAny) rowsData.push({ rowNum: r, cols: rowCols });
    }
    rowsData.sort((a, b) => {
      const va = evaluateSheetCell(a.cols[colLetter], activeSheet.cells);
      const vb = evaluateSheetCell(b.cols[colLetter], activeSheet.cells);
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }
      return asc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

    const nextCells = { ...activeSheet.cells };
    rowsData.forEach((item, idx) => {
      const targetRow = idx + 2;
      for (const c of SHEET_COLS) {
        nextCells[`${c}${targetRow}`] = item.cols[c] || '';
      }
    });
    setSheets((prev) =>
      prev.map((s) => (s.id === activeSheet.id ? { ...s, cells: nextCells } : s))
    );
  };

  // Extract chart series automatically from rows 2..5
  const chartData = useMemo(() => {
    const items: { label: string; value: number }[] = [];
    for (let r = 2; r <= 5; r++) {
      const label = String(evaluateSheetCell(activeSheet.cells[`A${r}`], activeSheet.cells) || '');
      const valNum = Number(
        evaluateSheetCell(
          activeSheet.cells[`F${r}`] || activeSheet.cells[`E${r}`] || activeSheet.cells[`B${r}`],
          activeSheet.cells
        )
      );
      if (label && !Number.isNaN(valNum) && valNum > 0) {
        items.push({ label, value: valNum });
      }
    }
    return items;
  }, [activeSheet.cells]);

  const handleSaveCsv = () => {
    const lines = SHEET_ROWS.map((r) =>
      SHEET_COLS.map((c) => {
        const val = evaluateSheetCell(activeSheet.cells[`${c}${r}`], activeSheet.cells);
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const fileName = `${activeSheet.name}.csv`;
    saveFile(['Documents'], fileName, lines.join('\n'));
    playSound('notify');
    setStatusBanner(`Documents/${fileName} に保存しました`);
    setTimeout(() => setStatusBanner(null), 3000);
  };

  const formatCellDisplay = (cellId: string): string => {
    const val = evaluateSheetCell(activeSheet.cells[cellId], activeSheet.cells);
    if (val === '' || val === undefined) return '';
    const st = activeSheet.styles[cellId];
    if (typeof val === 'number') {
      if (st?.format === 'currency') return `¥${val.toLocaleString()}`;
      if (st?.format === 'percent') return `${val}%`;
      return val.toLocaleString();
    }
    return String(val);
  };

  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden select-none ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0a1017] text-white'
      }`}
    >
      {/* Excel Ribbon Header */}
      <div
        className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'apple-liquid-glass border-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon name="glassexcel" size={24} />
          <div>
            <div className="text-xs font-extrabold">Glassium Sheet</div>
            <div className="text-[10px] opacity-50 font-mono">
              SUM / AVERAGE / IF / MAX / MIN · リアルタイムグラフ連動
            </div>
          </div>
        </div>

        {/* Formatting & Formula Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => updateCellStyle(selectedCell, { bold: !selectedStyle.bold })}
            className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
              selectedStyle.bold ? 'bg-emerald-500/25 border-emerald-400' : 'border-white/10 bg-white/[0.04]'
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => updateCellStyle(selectedCell, { italic: !selectedStyle.italic })}
            className={`px-2.5 py-1 rounded-lg text-xs italic border ${
              selectedStyle.italic ? 'bg-emerald-500/25 border-emerald-400' : 'border-white/10 bg-white/[0.04]'
            }`}
          >
            I
          </button>
          <button
            type="button"
            onClick={() =>
              updateCellStyle(selectedCell, {
                format: selectedStyle.format === 'currency' ? 'auto' : 'currency',
              })
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
              selectedStyle.format === 'currency'
                ? 'bg-emerald-500/25 border-emerald-400'
                : 'border-white/10 bg-white/[0.04]'
            }`}
          >
            ¥ 通貨
          </button>
          <button
            type="button"
            onClick={() => insertFormulaAtSelected('=SUM(B2:E2)')}
            className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-[11px] font-mono"
          >
            ∑ SUM
          </button>
          <button
            type="button"
            onClick={() => insertFormulaAtSelected('=AVERAGE(B2:E2)')}
            className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-[11px] font-mono"
          >
            μ AVG
          </button>
          <button
            type="button"
            onClick={() => sortByColumn('B', false)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-[11px]"
          >
            降順ソート
          </button>
          <button
            type="button"
            onClick={() => setShowChartPanel((v) => !v)}
            style={showChartPanel ? { backgroundColor: '#10b981' } : undefined}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              showChartPanel ? 'text-white' : 'bg-white/10'
            }`}
          >
            📊 グラフ表示
          </button>
          <button
            type="button"
            onClick={handleSaveCsv}
            style={{ backgroundColor: resolvedAccentHex }}
            className="px-3 py-1 rounded-lg text-white text-xs font-bold shadow"
          >
            CSV保存
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div
        className={`px-4 py-2 border-b flex items-center gap-2 text-xs shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/30 border-white/10'
        }`}
      >
        <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
          {selectedCell}
        </span>
        <span className="font-mono italic opacity-60">fx</span>
        <input
          value={activeSheet.cells[selectedCell] ?? ''}
          onChange={(e) => updateCell(selectedCell, e.target.value)}
          placeholder="値または数式を入力 (例: =SUM(B2:E2), =AVERAGE(B2:E2), =IF(F6>100000,&quot;達成&quot;,&quot;未達&quot;))"
          className="flex-1 px-3 py-1 rounded-lg bg-white/[0.06] border border-white/15 font-mono text-xs outline-none"
        />
        {statusBanner && <span className="text-emerald-400 font-bold">{statusBanner}</span>}
      </div>

      {/* Main Split: Grid + Optional Live Chart Panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className={isLight ? 'bg-slate-200/80' : 'bg-white/[0.06]'}>
                <th className="w-10 border border-white/10 py-1.5 text-center font-mono opacity-50">
                  #
                </th>
                {SHEET_COLS.map((col) => (
                  <th
                    key={col}
                    className="min-w-[108px] border border-white/10 py-1.5 text-center font-mono font-bold"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHEET_ROWS.map((row) => (
                <tr key={row}>
                  <td
                    className={`border border-white/10 text-center font-mono opacity-55 ${
                      isLight ? 'bg-slate-100' : 'bg-white/[0.03]'
                    }`}
                  >
                    {row}
                  </td>
                  {SHEET_COLS.map((col) => {
                    const id = `${col}${row}`;
                    const isSel = selectedCell === id;
                    const raw = activeSheet.cells[id] ?? '';
                    const st = activeSheet.styles[id] || {};
                    const display = formatCellDisplay(id);
                    return (
                      <td
                        key={id}
                        onClick={() => setSelectedCell(id)}
                        style={{
                          backgroundColor: st.bg,
                          outline: isSel ? `2px solid #10b981` : undefined,
                          outlineOffset: '-2px',
                        }}
                        className="border border-white/10 p-0 relative"
                      >
                        <input
                          value={isSel ? raw : String(display)}
                          onFocus={() => setSelectedCell(id)}
                          onChange={(e) => updateCell(id, e.target.value)}
                          style={{
                            fontWeight: st.bold ? 700 : 400,
                            fontStyle: st.italic ? 'italic' : 'normal',
                            textAlign:
                              st.align || (typeof evaluateSheetCell(raw, activeSheet.cells) === 'number' ? 'right' : 'left'),
                          }}
                          className="w-full px-2 py-1.5 bg-transparent outline-none font-mono text-xs"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Live Data Chart Panel */}
        {showChartPanel && (
          <aside
            className={`w-80 border-l p-4 flex flex-col gap-4 overflow-y-auto shrink-0 ${
              isLight ? 'bg-white border-slate-200' : 'apple-liquid-glass border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold">データ可視化チャート</span>
              <div className="flex gap-1">
                {(['bar', 'line', 'pie'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartType(t)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      chartType === t ? 'bg-emerald-500 text-white' : 'bg-white/10 opacity-70'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="space-y-3">
                {chartType === 'bar' && (
                  <div className="space-y-2.5">
                    {chartData.map((d, idx) => {
                      const maxVal = Math.max(...chartData.map((x) => x.value), 1);
                      const pct = Math.round((d.value / maxVal) * 100);
                      const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'];
                      return (
                        <div key={d.label} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="truncate font-semibold">{d.label}</span>
                            <span className="font-mono font-bold">¥{d.value.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                            <div
                              style={{
                                width: `${pct}%`,
                                backgroundColor: colors[idx % colors.length],
                              }}
                              className="h-full rounded-full transition-all duration-300"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {chartType === 'line' && (
                  <svg viewBox="0 0 240 140" className="w-full h-36 rounded-xl bg-black/20 p-2">
                    {(() => {
                      const maxVal = Math.max(...chartData.map((x) => x.value), 1);
                      const pts = chartData
                        .map((d, i) => {
                          const x = 24 + (i / Math.max(1, chartData.length - 1)) * 192;
                          const y = 115 - (d.value / maxVal) * 90;
                          return `${x},${y}`;
                        })
                        .join(' ');
                      return (
                        <>
                          <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            points={pts}
                          />
                          {chartData.map((d, i) => {
                            const x = 24 + (i / Math.max(1, chartData.length - 1)) * 192;
                            const y = 115 - (d.value / maxVal) * 90;
                            return <circle key={d.label} cx={x} cy={y} r="4.5" fill="#34d399" />;
                          })}
                        </>
                      );
                    })()}
                  </svg>
                )}

                {chartType === 'pie' && (
                  <div className="flex flex-col items-center gap-3">
                    <svg viewBox="0 0 120 120" className="w-32 h-32">
                      {(() => {
                        const total = chartData.reduce((acc, x) => acc + x.value, 0) || 1;
                        let accAngle = 0;
                        const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'];
                        return chartData.map((d, idx) => {
                          const sliceAngle = (d.value / total) * Math.PI * 2;
                          const x1 = 60 + 48 * Math.cos(accAngle);
                          const y1 = 60 + 48 * Math.sin(accAngle);
                          const x2 = 60 + 48 * Math.cos(accAngle + sliceAngle);
                          const y2 = 60 + 48 * Math.sin(accAngle + sliceAngle);
                          const largeArc = sliceAngle > Math.PI ? 1 : 0;
                          const pathData = `M 60 60 L ${x1} ${y1} A 48 48 0 ${largeArc} 1 ${x2} ${y2} Z`;
                          accAngle += sliceAngle;
                          return (
                            <path
                              key={d.label}
                              d={pathData}
                              fill={colors[idx % colors.length]}
                              stroke="#0a1017"
                              strokeWidth="1.5"
                            />
                          );
                        });
                      })()}
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs opacity-50">数値データのある行を入力すると自動集計されます</div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Sheet Tabs */}
      <div
        className={`px-4 py-1.5 border-t flex items-center justify-between text-xs shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/40 border-white/10'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSheetId(s.id)}
              style={s.id === activeSheet.id ? { backgroundColor: '#10b981' } : undefined}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                s.id === activeSheet.id ? 'text-white shadow' : 'bg-white/10 opacity-75'
              }`}
            >
              {s.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const id = `sheet-${Date.now()}`;
              setSheets((prev) => [
                ...prev,
                {
                  id,
                  name: `シート ${prev.length + 1}`,
                  cells: { A1: '項目', B1: '数値', A2: 'サンプルA', B2: '1200', A3: 'サンプルB', B3: '1850', A4: '合計', B4: '=SUM(B2:B3)' },
                  styles: {},
                },
              ]);
              setActiveSheetId(id);
            }}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 font-bold"
          >
            + 新規シート
          </button>
        </div>
        <span className="font-mono text-[11px] opacity-60">
          Glassium Sheet 5.0 u4
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 3. GLASSIUM STAGE (POWERPOINT) — PRESENTATION STUDIO WITH CANVAS & LASER
// ============================================================================

interface StageElement {
  id: string;
  type: 'text' | 'shape' | 'chart';
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
  color?: string;
  bg?: string;
  chartValues?: { label: string; value: number }[];
}

interface PresentationSlide {
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
  notes: string;
  themeBg: string;
  transition: 'fade' | 'slide' | 'zoom';
  elements: StageElement[];
}

const SLIDE_THEMES = [
  { id: 'cyber-glass', name: 'Glassium Liquid', bg: 'from-slate-900 via-indigo-950 to-cyan-950' },
  { id: 'emerald-exec', name: 'Emerald Executive', bg: 'from-emerald-950 via-teal-900 to-slate-950' },
  { id: 'sunset-stage', name: 'Crimson Keynote', bg: 'from-rose-950 via-amber-950 to-slate-950' },
  { id: 'royal-violet', name: 'Royal Violet', bg: 'from-purple-950 via-indigo-950 to-black' },
];

export function GlassiumStageApp() {
  const { theme, resolvedAccentHex, saveFile, playSound } = useOS();
  const isLight = theme === 'light';

  const [slides, setSlides] = useState<PresentationSlide[]>([
    {
      id: 's1',
      title: 'GlassiumOS 5 u4 Keynote',
      subtitle: 'GlasispectUI · 3D Spatial Audio · Weather Radar · Office Suite',
      bullets: [
        'Spotify風のLiquid Glass音楽プレーヤーとDeepL自動歌詞翻訳',
        'Open-Meteo + RainViewer 雨雲レーダーによる5分自動更新天気',
        'Microsoft Store風 App Storeと本格オフィス＆3D音響スイート',
      ],
      notes: '冒頭でGlassiumOS 5 u4の3つの主要ピラーを紹介する。',
      themeBg: SLIDE_THEMES[0].bg,
      transition: 'fade',
      elements: [
        {
          id: 'el-badge',
          type: 'shape',
          x: 62,
          y: 12,
          w: 32,
          h: 16,
          text: 'GlassiumOS 5 u4 Official Release',
          bg: 'rgba(6, 182, 212, 0.28)',
        },
      ],
    },
    {
      id: 's2',
      title: 'パフォーマンス & 音響アーキテクチャ',
      subtitle: 'Web Audio HRTF 3D Engine & 高速ストリーム並列解決',
      bullets: [
        '並列ストリーム解決により再生開始までのレイテンシを90%短縮',
        'HRTF 3D PannerNode + 10バンドパラメトリックEQをOS全体で共有',
        '自作 .tsx アプリをリアルタイムにビルドしてOS上で直接実行',
      ],
      notes: 'デモとしてSonic 3DとMusicアプリを切り替えて実演する。',
      themeBg: SLIDE_THEMES[1].bg,
      transition: 'zoom',
      elements: [
        {
          id: 'el-chart-1',
          type: 'chart',
          x: 56,
          y: 48,
          w: 38,
          h: 42,
          text: '再生開始速度比較 (ミリ秒)',
          chartValues: [
            { label: '従来版', value: 4200 },
            { label: '5 u4 高速エンジン', value: 210 },
          ],
        },
      ],
    },
  ]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);

  const current = slides[activeIdx] || slides[0];

  const updateCurrent = (patch: Partial<PresentationSlide>) => {
    setSlides((prev) => prev.map((s, i) => (i === activeIdx ? { ...s, ...patch } : s)));
  };

  const addElement = (type: StageElement['type']) => {
    const newEl: StageElement =
      type === 'chart'
        ? {
            id: `el-${Date.now()}`,
            type: 'chart',
            x: 55,
            y: 45,
            w: 38,
            h: 40,
            text: '四半期成長率',
            chartValues: [
              { label: 'Q1', value: 65 },
              { label: 'Q2', value: 82 },
              { label: 'Q3', value: 96 },
            ],
          }
        : {
            id: `el-${Date.now()}`,
            type,
            x: 55,
            y: 20,
            w: 34,
            h: 18,
            text: type === 'shape' ? '強調コールアウトカード' : '自由配置テキストブロック',
            bg: type === 'shape' ? 'rgba(249, 115, 22, 0.28)' : 'rgba(255,255,255,0.08)',
          };
    updateCurrent({ elements: [...current.elements, newEl] });
  };

  if (presenting) {
    return (
      <div
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setLaserPos({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
        className={`h-full w-full bg-gradient-to-br ${current.themeBg} text-white flex flex-col justify-between p-12 relative overflow-hidden select-none cursor-none`}
      >
        {laserPos && (
          <div
            style={{ left: laserPos.x, top: laserPos.y }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-rose-500 shadow-[0_0_24px_#f43f5e] border-2 border-white z-50"
          />
        )}

        <div className="space-y-4 max-w-3xl z-10">
          <div className="text-xs font-mono uppercase tracking-widest opacity-60">
            SLIDE {activeIdx + 1} / {slides.length} · GLASSIUM STAGE
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">{current.title}</h1>
          <p className="text-lg sm:text-xl text-cyan-300 font-medium">{current.subtitle}</p>
          <ul className="space-y-3 pt-4">
            {current.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-base sm:text-lg text-white/90">
                <span style={{ color: resolvedAccentHex }} className="font-bold">
                  ●
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Positioned Slide Elements */}
        {current.elements.map((el) => (
          <div
            key={el.id}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.w}%`,
              minHeight: `${el.h}%`,
              backgroundColor: el.bg || 'rgba(255,255,255,0.1)',
            }}
            className="absolute rounded-2xl border border-white/25 backdrop-blur-md p-4 shadow-xl"
          >
            <div className="text-xs font-bold mb-2">{el.text}</div>
            {el.type === 'chart' && el.chartValues && (
              <div className="space-y-1.5">
                {el.chartValues.map((cv) => {
                  const maxV = Math.max(...el.chartValues!.map((x) => x.value), 1);
                  return (
                    <div key={cv.label} className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span>{cv.label}</span>
                        <span>{cv.value}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                        <div
                          style={{
                            width: `${(cv.value / maxV) * 100}%`,
                            backgroundColor: resolvedAccentHex,
                          }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between pt-6 border-t border-white/15 text-xs z-20 cursor-auto">
          <span>レーザーポインター有効 (マウス移動で照射)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 font-bold"
            >
              ← 前へ
            </button>
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.min(slides.length - 1, i + 1))}
              className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 font-bold"
            >
              次へ →
            </button>
            <button
              type="button"
              onClick={() => setPresenting(false)}
              className="px-4 py-1.5 rounded-xl bg-rose-500 text-white font-bold"
            >
              終了
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0b0f19] text-white'
      }`}
    >
      {/* Top Toolbar */}
      <div
        className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'apple-liquid-glass border-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon name="glassppt" size={24} />
          <span className="text-xs font-extrabold">Glassium Stage</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const ns: PresentationSlide = {
                id: `s-${Date.now()}`,
                title: `新規スライド ${slides.length + 1}`,
                subtitle: 'サブタイトルを入力',
                bullets: ['ポイント 1', 'ポイント 2'],
                notes: '',
                themeBg: current.themeBg,
                transition: 'fade',
                elements: [],
              };
              setSlides((prev) => [...prev, ns]);
              setActiveIdx(slides.length);
            }}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold"
          >
            + スライド追加
          </button>
          <button
            type="button"
            onClick={() => addElement('shape')}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs"
          >
            + 図形カード
          </button>
          <button
            type="button"
            onClick={() => addElement('chart')}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs"
          >
            + チャート要素
          </button>
          {SLIDE_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => updateCurrent({ themeBg: t.bg })}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px]"
            >
              {t.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              saveFile(['Documents'], 'Glassium_Presentation.json', JSON.stringify(slides, null, 2));
              playSound('notify');
            }}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setPresenting(true)}
            style={{ backgroundColor: resolvedAccentHex }}
            className="px-3.5 py-1 rounded-lg text-white text-xs font-bold shadow"
          >
            ▶ スライドショー再生
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Slide Thumbnails */}
        <div
          className={`w-48 border-r p-3 space-y-2.5 overflow-y-auto shrink-0 ${
            isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/10'
          }`}
        >
          {slides.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setActiveIdx(idx)}
              style={idx === activeIdx ? { borderColor: resolvedAccentHex } : undefined}
              className={`p-2.5 rounded-xl border-2 cursor-pointer transition bg-gradient-to-br ${s.themeBg} text-white`}
            >
              <div className="text-[10px] font-mono opacity-60">#{idx + 1}</div>
              <div className="text-xs font-bold truncate mt-0.5">{s.title}</div>
            </div>
          ))}
        </div>

        {/* Center Slide Stage + Speaker Notes */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
          <div
            className={`w-full aspect-video rounded-2xl bg-gradient-to-br ${current.themeBg} text-white p-7 shadow-2xl border border-white/20 relative overflow-hidden flex flex-col justify-between`}
          >
            <div className="space-y-2.5 max-w-[54%] z-10">
              <input
                value={current.title}
                onChange={(e) => updateCurrent({ title: e.target.value })}
                className="w-full bg-transparent text-2xl sm:text-3xl font-black outline-none border-b border-transparent focus:border-white/30"
              />
              <input
                value={current.subtitle}
                onChange={(e) => updateCurrent({ subtitle: e.target.value })}
                className="w-full bg-transparent text-xs sm:text-sm text-cyan-300 font-semibold outline-none border-b border-transparent focus:border-white/30"
              />
              <div className="space-y-1.5 pt-2">
                {current.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <span style={{ color: resolvedAccentHex }}>●</span>
                    <input
                      value={b}
                      onChange={(e) => {
                        const next = [...current.bullets];
                        next[bIdx] = e.target.value;
                        updateCurrent({ bullets: next });
                      }}
                      className="flex-1 bg-transparent text-xs sm:text-sm text-white/90 outline-none border-b border-transparent focus:border-white/25"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateCurrent({ bullets: [...current.bullets, '新しい箇条書き項目'] })
                  }
                  className="text-[11px] text-cyan-300 hover:underline pt-1"
                >
                  + 箇条書きを追加
                </button>
              </div>
            </div>

            {/* Canvas Overlay Elements */}
            {current.elements.map((el) => (
              <div
                key={el.id}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.w}%`,
                  backgroundColor: el.bg || 'rgba(255,255,255,0.12)',
                }}
                className="absolute rounded-xl border border-white/25 backdrop-blur-md p-3 shadow-lg"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <input
                    value={el.text || ''}
                    onChange={(e) => {
                      const nextEls = current.elements.map((item) =>
                        item.id === el.id ? { ...item, text: e.target.value } : item
                      );
                      updateCurrent({ elements: nextEls });
                    }}
                    className="bg-transparent text-xs font-bold outline-none w-full"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrent({
                        elements: current.elements.filter((item) => item.id !== el.id),
                      })
                    }
                    className="text-[10px] opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
                {el.type === 'chart' && el.chartValues && (
                  <div className="space-y-1">
                    {el.chartValues.map((cv) => {
                      const maxV = Math.max(...el.chartValues!.map((x) => x.value), 1);
                      return (
                        <div key={cv.label} className="space-y-0.5">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span>{cv.label}</span>
                            <span>{cv.value}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                            <div
                              style={{
                                width: `${(cv.value / maxV) * 100}%`,
                                backgroundColor: resolvedAccentHex,
                              }}
                              className="h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Speaker Notes */}
          <div
            className={`rounded-xl p-3 border ${
              isLight ? 'bg-white border-slate-200' : 'bg-white/[0.04] border-white/10'
            }`}
          >
            <div className="text-[11px] font-bold opacity-60 mb-1">発表者ノート (Speaker Notes)</div>
            <textarea
              value={current.notes}
              onChange={(e) => updateCurrent({ notes: e.target.value })}
              rows={2}
              placeholder="プレゼン時のカンペ・発表メモを入力..."
              className="w-full bg-transparent text-xs outline-none resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. GLASSIUM NOTE (ONENOTE) — 3-TIER NOTEBOOK / SECTION / PAGE + SKETCH
// ============================================================================

interface NoteChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface NotePage {
  id: string;
  title: string;
  tags: string[];
  body: string;
  checklist: NoteChecklistItem[];
  updatedAt: string;
}

interface NoteSection {
  id: string;
  name: string;
  color: string;
  pages: NotePage[];
}

export function GlassiumNoteApp() {
  const { theme, resolvedAccentHex, saveFile, playSound } = useOS();
  const isLight = theme === 'light';

  const [sections, setSections] = useState<NoteSection[]>([
    {
      id: 'sec-dev',
      name: 'プロダクト設計',
      color: '#a855f7',
      pages: [
        {
          id: 'p-1',
          title: 'GlassiumOS 5 u4 仕様ノート',
          tags: ['#重要', '#リリース仕様'],
          body: '・音楽アプリ: DeepL自動翻訳パイプライン + カスタムプレイリスト作成\n・立体音響: 3D HRTF方位角・仰角・距離・ルーム残響・クロスフィード調整\n・天気予報: Open-Meteo直接フォールバック + RainViewerレーダー',
          checklist: [
            { id: 'c1', text: 'App Storeからのダウンロード導線を確認', done: true },
            { id: 'c2', text: 'DeepL歌詞自動翻訳の動作確認', done: true },
            { id: 'c3', text: 'カスタムプレイリストへの楽曲追加テスト', done: false },
          ],
          updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    },
    {
      id: 'sec-ideas',
      name: 'アイデア・議事録',
      color: '#06b6d4',
      pages: [
        {
          id: 'p-2',
          title: 'UI デザインブレインストーミング',
          tags: ['#アイデア'],
          body: 'Liquid Glassの屈折率とアクセントカラーの動的連動をさらに滑らかにする。',
          checklist: [{ id: 'c4', text: 'アイコンデザインのブラッシュアップ', done: true }],
          updatedAt: '10:30',
        },
      ],
    },
  ]);

  const [activeSecId, setActiveSecId] = useState('sec-dev');
  const [activePageId, setActivePageId] = useState('p-1');
  const [newTodoText, setNewTodoText] = useState('');
  const [penColor, setPenColor] = useState('#a855f7');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentSec = sections.find((s) => s.id === activeSecId) || sections[0];
  const currentPage = currentSec.pages.find((p) => p.id === activePageId) || currentSec.pages[0];

  const updateCurrentPage = (patch: Partial<NotePage>) => {
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === currentSec.id
          ? {
              ...sec,
              pages: sec.pages.map((p) => (p.id === currentPage.id ? { ...p, ...patch } : p)),
            }
          : sec
      )
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handlePointerUp = () => setIsDrawing(false);

  return (
    <div
      className={`h-full w-full flex overflow-hidden ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0b0d15] text-white'
      }`}
    >
      {/* Column 1: Sections */}
      <aside
        className={`w-48 border-r p-3 flex flex-col justify-between shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'apple-liquid-glass border-white/10'
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 pb-2 border-b border-white/10">
            <Icon name="glassnote" size={22} />
            <span className="text-xs font-extrabold">Glassium Note</span>
          </div>
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActiveSecId(sec.id);
                if (sec.pages[0]) setActivePageId(sec.pages[0].id);
              }}
              style={
                sec.id === currentSec.id
                  ? { backgroundColor: `${sec.color}28`, borderLeft: `3px solid ${sec.color}` }
                  : undefined
              }
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition hover:bg-white/[0.06]"
            >
              {sec.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            saveFile(['Documents'], `${currentPage.title}.md`, `# ${currentPage.title}\n\n${currentPage.body}`);
            playSound('notify');
          }}
          style={{ backgroundColor: resolvedAccentHex }}
          className="w-full py-2 rounded-xl text-white text-xs font-bold shadow"
        >
          ノートを保存
        </button>
      </aside>

      {/* Column 2: Pages in Section */}
      <div
        className={`w-52 border-r p-3 space-y-2 overflow-y-auto shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/25 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold opacity-60">ページ一覧</span>
          <button
            type="button"
            onClick={() => {
              const np: NotePage = {
                id: `p-${Date.now()}`,
                title: '新規ページ',
                tags: ['#メモ'],
                body: '',
                checklist: [],
                updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              setSections((prev) =>
                prev.map((s) => (s.id === currentSec.id ? { ...s, pages: [...s.pages, np] } : s))
              );
              setActivePageId(np.id);
            }}
            className="text-xs text-purple-400 font-bold"
          >
            + 追加
          </button>
        </div>
        {currentSec.pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePageId(p.id)}
            className={`w-full text-left p-2.5 rounded-xl border transition ${
              p.id === currentPage.id
                ? 'border-purple-400/60 bg-purple-500/15'
                : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <div className="text-xs font-bold truncate">{p.title}</div>
            <div className="text-[10px] opacity-50 mt-0.5">{p.updatedAt}</div>
          </button>
        ))}
      </div>

      {/* Column 3: Page Editor + Checklist + Ink Sketch Canvas */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        <input
          value={currentPage.title}
          onChange={(e) => updateCurrentPage({ title: e.target.value })}
          className="w-full bg-transparent text-xl font-black outline-none border-b border-white/10 pb-2"
        />

        <div className="flex flex-wrap gap-1.5">
          {['#重要', '#議事録', '#アイデア', '#ToDo'].map((tag) => {
            const has = currentPage.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  updateCurrentPage({
                    tags: has
                      ? currentPage.tags.filter((t) => t !== tag)
                      : [...currentPage.tags, tag],
                  })
                }
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  has ? 'bg-purple-500 text-white' : 'bg-white/10 opacity-60'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <textarea
          value={currentPage.body}
          onChange={(e) => updateCurrentPage({ body: e.target.value })}
          rows={6}
          placeholder="ここに自由メモ・議事録を入力..."
          className="w-full p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs leading-relaxed outline-none"
        />

        {/* Checklist */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div className="text-xs font-bold">チェックリスト (ToDo)</div>
          {currentPage.checklist.map((item) => (
            <label key={item.id} className="flex items-center gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  updateCurrentPage({
                    checklist: currentPage.checklist.map((c) =>
                      c.id === item.id ? { ...c, done: !c.done } : c
                    ),
                  })
                }
              />
              <span className={item.done ? 'line-through opacity-50' : ''}>{item.text}</span>
            </label>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTodoText.trim()) return;
              updateCurrentPage({
                checklist: [
                  ...currentPage.checklist,
                  { id: `c-${Date.now()}`, text: newTodoText.trim(), done: false },
                ],
              });
              setNewTodoText('');
            }}
            className="flex gap-2 pt-1"
          >
            <input
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="新しいチェック項目を追加..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
            >
              追加
            </button>
          </form>
        </div>

        {/* Freehand Sketch Canvas */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">手書きスケッチ・図解キャンバス</span>
            <div className="flex items-center gap-1.5">
              {['#a855f7', '#06b6d4', '#10b981', '#f43f5e', '#facc15'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPenColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-4 h-4 rounded-full ${penColor === c ? 'ring-2 ring-white' : ''}`}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  const cv = canvasRef.current;
                  const ctx = cv?.getContext('2d');
                  if (cv && ctx) ctx.clearRect(0, 0, cv.width, cv.height);
                }}
                className="px-2 py-0.5 rounded bg-white/10 text-[10px]"
              >
                クリア
              </button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={620}
            height={160}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full h-36 rounded-xl bg-black/30 border border-white/10 cursor-crosshair touch-none"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. GLASSIUM TSX STUDIO — LIVE .TSX COMPILER, PREVIEW & APP STORE PUBLISHER
// ============================================================================

export const DEFAULT_SAMPLE_TSX_CODE = `export default function CustomGlassiumApp() {
  const [count, setCount] = React.useState(0);
  const [notes, setNotes] = React.useState(['GlassiumOS 5 u4 で動作中', 'リアルタイム .tsx コンパイル']);
  const [input, setInput] = React.useState('');

  return (
    <div className="p-6 space-y-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-cyan-400">Glassium TSX Custom App</h1>
        <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono">
          GlassiumOS 5 u4 SDK
        </span>
      </div>
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
        >
          カウントアップ: {count}
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-3 py-2 rounded-xl bg-white/10 text-xs"
        >
          リセット
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="項目を追加..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs outline-none"
          />
          <button
            onClick={() => {
              if (!input.trim()) return;
              setNotes([...notes, input.trim()]);
              setInput('');
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold"
          >
            追加
          </button>
        </div>
        <ul className="space-y-1 text-xs">
          {notes.map((n, i) => (
            <li key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              • {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}`;

export function GlassiumTsxRunnerApp({
  initialCode,
  initialTitle,
}: {
  initialCode?: string;
  initialTitle?: string;
}) {
  const { installApp, resolvedAccentHex, playSound } = useOS();
  const [title, setTitle] = useState(initialTitle || 'My Glassium TSX App');
  const [code, setCode] = useState(initialCode || DEFAULT_SAMPLE_TSX_CODE);
  const [publishedBanner, setPublishedBanner] = useState<string | null>(null);

  const srcDoc = useMemo(() => {
    const cleaned = code
      .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
      .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, 'function $1')
      .replace(/export\s+function\s+([A-Za-z0-9_]+)/, 'function $1');
    const fnMatch = cleaned.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
    const compName = fnMatch ? fnMatch[1] : 'CustomGlassiumApp';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>body { margin: 0; background: #090d16; color: white; font-family: system-ui, sans-serif; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
    try {
      ${cleaned}
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${compName}));
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="padding:16px;color:#fb7185;font-family:monospace;font-size:12px;">Compile Error: ' + (err && err.message ? err.message : err) + '</div>';
    }
  </script>
</body>
</html>`;
  }, [code]);

  return (
    <div className="h-full w-full flex flex-col bg-[#090d16] text-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-3 apple-liquid-glass shrink-0">
        <div className="flex items-center gap-2.5">
          <Icon name="tsxrunner" size={24} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1 text-xs font-bold outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {publishedBanner && (
            <span className="text-xs text-emerald-400 font-bold">{publishedBanner}</span>
          )}
          <button
            type="button"
            onClick={() => {
              installApp({
                id: `tsx-${Date.now()}`,
                name: title.trim() || 'Custom TSX App',
                author: 'Glassium Developer',
                description: 'TSX Studio で作成されたアプリケーション',
                category: 'utilities',
                icon: 'tsxrunner',
                tsxSource: code,
              });
              playSound('notify');
              setPublishedBanner('デスクトップ & App Store に追加しました');
              setTimeout(() => setPublishedBanner(null), 3000);
            }}
            style={{ backgroundColor: resolvedAccentHex }}
            className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow"
          >
            OSにアプリとしてインストール
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full h-full p-4 bg-black/50 text-cyan-200 font-mono text-xs leading-relaxed outline-none resize-none border-r border-white/10"
        />
        <iframe
          title="TSX Preview"
          srcDoc={srcDoc}
          className="w-full h-full border-0 bg-[#090d16]"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
}
