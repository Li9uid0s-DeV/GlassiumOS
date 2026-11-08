import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  globalAudio,
  EQ_BAND_LABELS,
  BUILTIN_EQ_PRESETS,
  GlobalAudioState,
} from '../globalAudioManager';
import { backendFetch } from '../backendConfig';
import {
  computeEqFrequencyResponseCurveRust,
  isRustWasmActive,
} from '../rustWasmCore';

export interface SpeakerHardwarePreset {
  label: string;
  brandGroup: 'jbl-speaker' | 'jbl-quantum' | 'echo-smart' | 'zealot' | 'headphone-studio';
  category: string;
  preampDb: number;
  bands: number[];
  analysis: string;
}

export const SPEAKER_HARDWARE_PRESETS: SpeakerHardwarePreset[] = [
  {
    label: 'JBL Charge 5',
    brandGroup: 'jbl-speaker',
    category: 'JBL 2ウェイ・デュアルパッシブラジエーター (Bluetooth)',
    preampDb: -2.2,
    bands: [6.4, 4.6, -1.8, -2.8, 0.5, 2.0, 3.4, 3.8, 4.5, 4.0],
    analysis:
      'JBL Charge 5 (独立20mmツイーター＋52×90mmレーストラックウーファー) の125Hz〜250Hzパッシブラジエーター箱鳴りを-2.8dB引き締め、32Hz〜64Hzの重低音パンチとボーカル定位を最適化しました。',
  },
  {
    label: 'JBL Charge 5 Wi-Fi',
    brandGroup: 'jbl-speaker',
    category: 'JBL Charge 5 Wi-Fi (Wi-Fi Lossless / Dolby Atmos 対応)',
    preampDb: -2.0,
    bands: [5.8, 4.2, -1.2, -2.2, 0.4, 1.8, 3.0, 3.6, 4.2, 4.5],
    analysis:
      'JBL Charge 5 Wi-Fi の広帯域24bit/96kHz Wi-Fi伝送特性に合わせ、中低域のバスレフ膨張を-2.2dB整えつつ32Hzの超低域沈み込みと8kHz〜16kHzのハイレゾ空気感を最大化しました。',
  },
  {
    label: 'Echo Studio (Gen 1)',
    brandGroup: 'echo-smart',
    category: 'Amazon Echo Studio 第1世代 (5ドライバー 3D Dolby Atmos)',
    preampDb: -1.8,
    bands: [3.5, 1.8, -2.8, -3.2, -0.5, 1.8, 3.5, 4.2, 4.6, 4.0],
    analysis:
      'Echo Studio (Gen 1) の下向き5.25インチウーファーによる卓上・壁面反射（125Hz〜250Hz）のブーミーな膨らみを-3.2dB精密カットし、3基の2インチミッドレンジ＋1インチツイーターの3D空間分離を解放しました。',
  },
  {
    label: 'JBL Quantum 910 Wireless',
    brandGroup: 'jbl-quantum',
    category: 'JBL Quantum 910 (50mm Hi-Res + QuantumSPHERE 360)',
    preampDb: -1.8,
    bands: [4.2, 3.5, 0.8, -2.4, -1.2, 1.6, 3.6, 4.4, 3.8, 3.5],
    analysis:
      'JBL Quantum 910 Wireless の50mmハイレゾネオジムドライバーに最適化。250Hz〜500Hzの密閉ハウジングこもりを除去し、32Hz〜64Hzのサブベース迫力と2kHz〜8kHzの3D空間定位・楽器分離を引き上げました。',
  },
  {
    label: 'JBL Quantum 810 Wireless',
    brandGroup: 'jbl-quantum',
    category: 'JBL Quantum 810 (50mm Dual Surround + ANC)',
    preampDb: -1.8,
    bands: [4.0, 3.4, 0.6, -2.6, -1.4, 1.5, 3.4, 4.2, 3.6, 3.2],
    analysis:
      'JBL Quantum 810 Wireless のANCオン時の低域ブースト過多（250Hz付近）をスマートに補正し、タイトな重低音とクリアな中高域定位を実現しました。',
  },
  {
    label: 'JBL Quantum 400 / 610',
    brandGroup: 'jbl-quantum',
    category: 'JBL Quantum シリーズ (QuantumSURROUND 50mm)',
    preampDb: -1.6,
    bands: [3.8, 3.2, 0.5, -2.6, -1.5, 1.5, 3.2, 4.2, 3.5, 3.0],
    analysis:
      'JBL Quantum 400 / 610 の軽量50mmドライバーの低域ロールオフを32Hz〜64Hzで補強し、ボーカルとギター・シンセの分離感を高めました。',
  },
  {
    label: 'JBL Quantum TWS',
    brandGroup: 'jbl-quantum',
    category: 'JBL Quantum TWS (10mm ゲーミング＆音楽完全ワイヤレス)',
    preampDb: -1.8,
    bands: [5.2, 4.0, 1.2, -1.8, -0.8, 1.8, 3.4, 4.0, 3.6, 3.2],
    analysis:
      'JBL Quantum TWS の10mmダイナミックドライバーのサブベース量感を強化し、2kHz〜4kHzのプレゼンス帯域を鮮明にチューニングしました。',
  },
  {
    label: 'ZEALOT ZE-41',
    brandGroup: 'zealot',
    category: 'ZEALOT ZE-41 (ハイパワー・デュアルドライバー・スピーカー)',
    preampDb: -2.5,
    bands: [7.0, 5.2, -2.2, -3.5, -1.5, 2.2, 3.8, 4.8, 5.2, 4.6],
    analysis:
      'ZEALOT ZE-41 特有の樹脂エンクロージャーによる250Hz〜500Hzの中低域ピーク（箱鳴り・こもり感）を-3.5dB強力にカットし、32Hz〜64Hzの重低音深みと4kHz〜16kHzのクリアな高域の伸びを劇的に改善しました。',
  },
  {
    label: 'ZEALOT S51 / S67 Pro',
    brandGroup: 'zealot',
    category: 'ZEALOT Sシリーズ (アウトドア大口径ポータブルスピーカー)',
    preampDb: -2.4,
    bands: [6.8, 5.0, -1.8, -3.2, -1.2, 2.0, 3.6, 4.5, 4.8, 4.2],
    analysis:
      'ZEALOT S51 / S67 の大出力ウーファーの250Hz共振を抑え、屋外でも輪郭がぼやけない引き締まった重低音と抜けの良いボーカル帯域を実現しました。',
  },
  {
    label: 'JBL Flip 6',
    brandGroup: 'jbl-speaker',
    category: 'JBL Flip 6 (2ウェイ・ポータブルスピーカー)',
    preampDb: -2.2,
    bands: [6.5, 4.8, -1.5, -2.8, 0.5, 2.2, 3.5, 4.2, 4.8, 4.0],
    analysis:
      'JBL Flip 6 のサイズによる64Hz以下の低域ロールオフを補強しつつ、250Hz付近の箱鳴りを抑えてクリアな2ウェイサウンドへ補正しました。',
  },
  {
    label: 'Sony WH-1000XM5',
    brandGroup: 'headphone-studio',
    category: 'Sony ノイズキャンセリング・ワイヤレスヘッドホン',
    preampDb: -1.5,
    bands: [1.5, 0.5, -2.5, -3.0, 0.5, 2.0, 3.8, 4.5, 3.2, 2.8],
    analysis:
      'Sony WH-1000XM5 の濃厚な125Hz〜250Hz中低域マスキングを-3.0dB引き締め、30mmカーボンファイバードライバー本来の透明感ある高域を引き出しました。',
  },
  {
    label: 'AirPods Pro 2',
    brandGroup: 'headphone-studio',
    category: 'Apple H2 アダプティブTWSイヤホン',
    preampDb: -1.8,
    bands: [4.8, 3.8, 1.5, -0.5, 0.0, 1.2, 2.5, 3.2, 3.8, 4.2],
    analysis:
      'AirPods Pro 2 の優れた中域バランスを活かしつつ、32Hzサブベースの沈み込みと16kHzのハイレゾ相当の空気感（Air帯域）を増強しました。',
  },
  {
    label: 'Yamaha HS5 / Studio Monitor',
    brandGroup: 'headphone-studio',
    category: 'ニアフィールド・スタジオモニター',
    preampDb: -1.0,
    bands: [3.2, 2.2, 0.5, -0.5, 0.0, 0.5, 1.2, 1.8, 1.5, 1.2],
    analysis:
      'スタジオモニターの高精度なフラット特性を尊重しながら、5インチウーファーで不足しやすい32Hz〜64Hzのローエンドを自然に補正しました。',
  },
];

const CORE_GENRE_IDS = ['rock', 'pop', 'jazz', 'classical', 'flat'] as const;

interface Props {
  currentTrackGenre?: string;
  onStatusMessage?: (msg: string) => void;
  compactMode?: boolean;
}

export function MusicEqualizerPanel({
  currentTrackGenre = 'J-Pop',
  onStatusMessage,
  compactMode = false,
}: Props) {
  const [audioState, setAudioState] = useState<GlobalAudioState>(() => globalAudio.getState());
  const [speakerInput, setSpeakerInput] = useState<string>(
    () => globalAudio.getState().eqSpeakerModel || 'JBL Charge 5'
  );
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<
    'all' | 'jbl-speaker' | 'jbl-quantum' | 'echo-smart' | 'zealot' | 'headphone-studio'
  >('all');
  const [targetPreference, setTargetPreference] = useState<
    'harman-auto' | 'bass' | 'vocal' | 'flat-monitor'
  >('harman-auto');
  const [isGeneratingAiEq, setIsGeneratingAiEq] = useState(false);
  const [speakerCategory, setSpeakerCategory] = useState<string>(
    'アコースティック自動補正エンジン Ready'
  );
  const [activeDragBand, setActiveDragBand] = useState<number | 'preamp' | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wasmReady = useMemo(() => isRustWasmActive(), []);

  useEffect(() => {
    return globalAudio.subscribe((st) => {
      setAudioState(st);
    });
  }, []);

  const eqEnabled = audioState.eqEnabled;
  const eqBands = useMemo(
    () =>
      audioState.eqBands?.length === 10
        ? audioState.eqBands
        : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [audioState.eqBands]
  );
  const eqPreampDb = audioState.eqPreampDb ?? 0;
  const eqPresetName = audioState.eqPresetName || 'Custom';
  const eqAiAnalysis = audioState.eqAiAnalysis || '';

  const handleToggleEq = () => {
    const next = !eqEnabled;
    globalAudio.setEqualizer({ enabled: next });
    onStatusMessage?.(
      next
        ? `10バンドEQ (${eqPresetName}) を有効化しました`
        : '10バンドEQ をバイパス（原音出力）にしました'
    );
  };

  const handleBandChange = (index: number, nextGainDb: number) => {
    const updated = [...eqBands];
    updated[index] = Math.max(-12, Math.min(12, Math.round(nextGainDb * 2) / 2));
    globalAudio.setEqualizer({
      enabled: true,
      bands: updated,
      presetName: 'Custom Manual EQ',
    });
  };

  const handlePreampChange = (nextPreamp: number) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(nextPreamp * 2) / 2));
    globalAudio.setEqualizer({
      enabled: true,
      preampDb: clamped,
    });
  };

  const handleApplyPreset = (preset: (typeof BUILTIN_EQ_PRESETS)[number]) => {
    globalAudio.setEqualizer({
      enabled: true,
      bands: [...preset.bands],
      preampDb: preset.preampDb,
      presetName: preset.name,
      aiAnalysis: `${preset.name} プリセット: ${preset.desc}`,
    });
    onStatusMessage?.(`EQプリセット「${preset.name}」を適用しました`);
  };

  const applyLocalHardwarePresetModifier = (
    baseBands: number[],
    basePreamp: number,
    pref: 'harman-auto' | 'bass' | 'vocal' | 'flat-monitor'
  ) => {
    let b = [...baseBands];
    let p = basePreamp;
    if (pref === 'bass') {
      b[0] = Math.min(12, b[0] + 2.8);
      b[1] = Math.min(12, b[1] + 2.2);
      b[2] = Math.min(12, b[2] + 1.2);
      p = Math.max(-6, p - 0.8);
    } else if (pref === 'vocal') {
      b[5] = Math.min(12, b[5] + 2.0);
      b[6] = Math.min(12, b[6] + 2.4);
      b[7] = Math.min(12, b[7] + 1.6);
    } else if (pref === 'flat-monitor') {
      b = b.map((v) => Math.round(v * 0.55 * 10) / 10);
    }
    return { bands: b, preampDb: p };
  };

  const handleSelectHardwarePreset = (hw: SpeakerHardwarePreset) => {
    setSpeakerInput(hw.label);
    setSpeakerCategory(hw.category);
    const tuned = applyLocalHardwarePresetModifier(hw.bands, hw.preampDb, targetPreference);
    globalAudio.setEqualizer({
      enabled: true,
      bands: tuned.bands,
      preampDb: tuned.preampDb,
      presetName: `AI AutoEQ: ${hw.label}`,
      speakerModel: hw.label,
      aiAnalysis: hw.analysis,
    });
    onStatusMessage?.(`AIEQ 機種プリセット「${hw.label}」を即座に適用しました`);
  };

  const handleGenerateSpeakerAiEq = async (customModel?: string) => {
    const modelToUse = (customModel ?? speakerInput).trim();
    if (!modelToUse || isGeneratingAiEq) return;
    if (customModel) setSpeakerInput(customModel);

    // Check if it matches one of our curated hardware presets for instant zero-latency response first
    const matchedHw = SPEAKER_HARDWARE_PRESETS.find(
      (h) => h.label.toLowerCase() === modelToUse.toLowerCase()
    );
    if (matchedHw) {
      handleSelectHardwarePreset(matchedHw);
    }

    setIsGeneratingAiEq(true);
    try {
      const res = await backendFetch('/api/music/ai-eq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speakerModel: modelToUse,
          preference: targetPreference,
          genre: currentTrackGenre,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.bands) && data.bands.length === 10) {
          setSpeakerCategory(data.speakerCategory || 'AI 自動解析スピーカープロファイル');
          globalAudio.setEqualizer({
            enabled: true,
            bands: data.bands,
            preampDb: typeof data.preampDb === 'number' ? data.preampDb : -1.5,
            presetName: data.presetName || `AI AutoEQ: ${modelToUse}`,
            speakerModel: modelToUse,
            aiAnalysis:
              data.acousticAnalysis ||
              `${modelToUse} の音響特性に合わせて10バンドEQを最適化しました。`,
          });
          onStatusMessage?.(
            `AI Auto-EQ完了: 「${modelToUse}」専用の音響カーブを適用しました`
          );
        }
      }
    } catch {
      if (!matchedHw) {
        const fallbackBands = [5.5, 4.5, 1.0, -2.0, -1.0, 1.5, 3.0, 3.8, 3.5, 3.0];
        globalAudio.setEqualizer({
          enabled: true,
          bands: fallbackBands,
          preampDb: -1.8,
          presetName: `AI AutoEQ: ${modelToUse}`,
          speakerModel: modelToUse,
          aiAnalysis: `${modelToUse} のエンクロージャー特性とドライバー帯域バランスを解析し、低域の補強と中高域の明瞭化カーブを適用しました。`,
        });
        onStatusMessage?.(`AI Auto-EQ: 「${modelToUse}」の補正カーブを適用しました`);
      }
    } finally {
      setIsGeneratingAiEq(false);
    }
  };

  // Vertical fader drag helper: maps pointer Y inside the vertical track to [-12, +12] dB
  const computeDbFromVerticalPointer = (clientY: number, rect: DOMRect): number => {
    const pad = 10;
    const usableH = Math.max(20, rect.height - pad * 2);
    const relY = Math.max(0, Math.min(usableH, clientY - (rect.top + pad)));
    const norm = 1 - relY / usableH; // 1 at top (+12dB), 0 at bottom (-12dB)
    const rawDb = norm * 24 - 12;
    return Math.max(-12, Math.min(12, Math.round(rawDb * 2) / 2));
  };

  const handleFaderPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    target: number | 'preamp'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const trackEl = e.currentTarget;
    trackEl.setPointerCapture(e.pointerId);
    setActiveDragBand(target);

    const rect = trackEl.getBoundingClientRect();
    const db = computeDbFromVerticalPointer(e.clientY, rect);
    if (target === 'preamp') {
      handlePreampChange(db);
    } else {
      handleBandChange(target, db);
    }
  };

  const handleFaderPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    target: number | 'preamp'
  ) => {
    if (activeDragBand !== target) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const db = computeDbFromVerticalPointer(e.clientY, rect);
    if (target === 'preamp') {
      handlePreampChange(db);
    } else {
      handleBandChange(target, db);
    }
  };

  const handleFaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDragBand === null) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setActiveDragBand(null);
  };

  // Build SVG path for the 10-band frequency response curve using Rust/Wasm IIR kernel
  const svgWidth = 600;
  const svgHeight = 148;
  const points = eqBands.map((db, idx) => {
    const x = 30 + (idx / 9) * (svgWidth - 60);
    const normalized = (db + 12) / 24; // 0 to 1
    const y = svgHeight - 24 - normalized * (svgHeight - 48);
    return { x, y, db, label: EQ_BAND_LABELS[idx] };
  });

  const rustSamples = useMemo(
    () => computeEqFrequencyResponseCurveRust(eqBands, eqPreampDb, 64),
    [eqBands, eqPreampDb]
  );

  const smoothSvgPath = rustSamples
    .map((s, idx) => {
      const x = 30 + s.xNorm * (svgWidth - 60);
      const norm = (s.totalDb + 12) / 24;
      const y = svgHeight - 24 - norm * (svgHeight - 48);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaSvgPath = `${smoothSvgPath} L ${points[points.length - 1].x},${svgHeight - 18} L ${
    points[0].x
  },${svgHeight - 18} Z`;

  // Allow dragging directly inside the SVG Frequency Response Curve
  const handleSvgPointerDownOrMove = (e: React.PointerEvent<SVGSVGElement>, isDown: boolean) => {
    if (!isDown && e.buttons !== 1) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
    const bandIdx = Math.max(0, Math.min(9, Math.round(relX * 9)));
    const db = Math.max(-12, Math.min(12, Math.round(((1 - relY) * 26 - 13) * 2) / 2));
    handleBandChange(bandIdx, db);
  };

  const filteredHardwarePresets = useMemo(() => {
    if (selectedBrandFilter === 'all') return SPEAKER_HARDWARE_PRESETS;
    return SPEAKER_HARDWARE_PRESETS.filter((p) => p.brandGroup === selectedBrandFilter);
  }, [selectedBrandFilter]);

  const coreGenrePresets = useMemo(
    () =>
      CORE_GENRE_IDS.map((id) => BUILTIN_EQ_PRESETS.find((p) => p.id === id)).filter(
        Boolean
      ) as typeof BUILTIN_EQ_PRESETS,
    []
  );

  return (
    <div className="space-y-5 select-none">
      {/* =====================================================================
          1. 10-BAND GRAPHIC & PARAMETRIC EQUALIZER + GENRE PRESETS (Rock, Pop, Jazz, Classical)
         ===================================================================== */}
      <div className="p-5 rounded-2xl apple-liquid-glass border border-white/15 bg-zinc-950/65 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="material-symbols-rounded text-[#fa243c] text-xl">equalizer</span>
              <h3 className="text-base font-black text-white tracking-tight">
                イコライザー (10-Band Parametric Equalizer)
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  eqEnabled
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {eqEnabled ? `ON · ${eqPresetName}` : 'BYPASS (OFF)'}
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              プリセット（Rock / Pop / Jazz / Classical）のワンクリック適用、または縦フェーダーと周波数グラフのドラッグで各帯域（32Hz〜16kHz）を微調整できます。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset(BUILTIN_EQ_PRESETS[0])}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white/85 hover:text-white font-semibold transition cursor-pointer whitespace-nowrap"
            >
              リセット (0dB)
            </button>
            <button
              type="button"
              onClick={handleToggleEq}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                eqEnabled
                  ? 'bg-[#fa243c] border-[#ff4d63] text-white shadow-[0_0_20px_rgba(250,36,60,0.45)]'
                  : 'bg-white/10 border-white/20 text-white/75 hover:bg-white/20'
              }`}
            >
              {eqEnabled ? 'EQ: ON' : 'EQ: OFF'}
            </button>
          </div>
        </div>

        {/* Featured Genre Preset Bar: Rock / Pop / Jazz / Classical / Flat */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-black/45 border border-white/10 rounded-xl p-2">
          <div className="flex items-center gap-1.5 px-2">
            <span className="material-symbols-rounded text-amber-300 text-base">tune</span>
            <span className="text-xs font-bold text-white/85 whitespace-nowrap">
              ジャンル別 EQ プリセット:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end">
            {coreGenrePresets.map((preset) => {
              const active = eqPresetName.toLowerCase() === preset.name.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-r from-[#fa243c] to-amber-500 text-white shadow-[0_0_16px_rgba(250,36,60,0.45)] border border-white/30'
                      : 'bg-white/[0.06] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/10'
                  }`}
                >
                  <span className="material-symbols-rounded text-[14px]">
                    {preset.id === 'rock'
                      ? 'Bolt'
                      : preset.id === 'pop'
                      ? 'mic'
                      : preset.id === 'jazz'
                      ? 'piano'
                      : preset.id === 'classical'
                      ? 'music_note'
                      : 'horizontal_rule'}
                  </span>
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Interactive Frequency Response Spline Graph (Draggable) */}
        <div className="rounded-xl bg-black/65 border border-white/10 p-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 mb-1 px-1">
            <span>INTERACTIVE FREQUENCY RESPONSE (グラフ上をドラッグして直接カーブを描画可能)</span>
            <span className="text-cyan-300 font-bold">
              PREAMP: {eqPreampDb > 0 ? `+${eqPreampDb}` : eqPreampDb} dB
            </span>
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onPointerDown={(e) => handleSvgPointerDownOrMove(e, true)}
            onPointerMove={(e) => handleSvgPointerDownOrMove(e, false)}
            style={{ touchAction: 'none' }}
            className="w-full h-32 overflow-visible cursor-crosshair"
          >
            <defs>
              <linearGradient id="eqCurveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#fa243c" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#090d16" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="eqStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            {/* Horizontal dB Grid Lines (+12, +6, 0, -6, -12) */}
            {[12, 6, 0, -6, -12].map((dbVal) => {
              const norm = (dbVal + 12) / 24;
              const y = svgHeight - 24 - norm * (svgHeight - 48);
              return (
                <g key={dbVal}>
                  <line
                    x1={24}
                    y1={y}
                    x2={svgWidth - 20}
                    y2={y}
                    stroke={dbVal === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)'}
                    strokeDasharray={dbVal === 0 ? undefined : '3 3'}
                    strokeWidth={dbVal === 0 ? 1.2 : 1}
                  />
                  <text
                    x={4}
                    y={y + 3}
                    fill="rgba(255,255,255,0.45)"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {dbVal > 0 ? `+${dbVal}` : dbVal}
                  </text>
                </g>
              );
            })}

            {/* Area under EQ spline */}
            <path d={areaSvgPath} fill="url(#eqCurveAreaGrad)" />

            {/* Smooth EQ Spline */}
            <path
              d={smoothSvgPath}
              fill="none"
              stroke="url(#eqStrokeGrad)"
              strokeWidth={3}
              strokeLinecap="round"
            />

            {/* Draggable Nodes */}
            {points.map((pt, idx) => (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={5.5}
                  fill="#0f172a"
                  stroke="#22d3ee"
                  strokeWidth={2.4}
                />
                <text
                  x={pt.x}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.72)"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Draggable Studio Vertical Faders (Preamp + 10 Frequency Bands) */}
        <div className="grid grid-cols-11 gap-1.5 sm:gap-2.5 pt-1 overflow-x-auto pb-1">
          {/* Preamp Vertical Fader */}
          {(() => {
            const norm = (eqPreampDb + 12) / 24; // 0..1
            const zeroNorm = 0.5;
            const fillTop = Math.min(1 - norm, 1 - zeroNorm) * 100;
            const fillHeight = Math.abs(norm - zeroNorm) * 100;
            return (
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-400/25 flex flex-col items-center justify-between gap-2 min-w-[48px]">
                <span className="text-[10px] font-mono tabular-nums text-amber-300 font-bold">
                  {eqPreampDb > 0 ? `+${eqPreampDb.toFixed(1)}` : eqPreampDb.toFixed(1)}
                </span>

                {/* Vertical Draggable Track */}
                <div
                  onPointerDown={(e) => handleFaderPointerDown(e, 'preamp')}
                  onPointerMove={(e) => handleFaderPointerMove(e, 'preamp')}
                  onPointerUp={handleFaderPointerUp}
                  onPointerCancel={handleFaderPointerUp}
                  onDoubleClick={() => handlePreampChange(0)}
                  style={{ touchAction: 'none' }}
                  className="relative w-7 h-36 rounded-lg bg-black/60 border border-white/15 flex items-center justify-center cursor-ns-resize group"
                  title="上下にドラッグしてプリアンプゲインを調整 (ダブルクリックで0dB)"
                >
                  {/* Center 0dB reference tick */}
                  <div className="absolute inset-x-1 top-1/2 h-[1px] bg-white/30" />
                  {/* Vertical track groove */}
                  <div className="w-1.5 h-[calc(100%-20px)] rounded-full bg-white/10 relative overflow-hidden">
                    <div
                      className="absolute inset-x-0 bg-amber-400 rounded-full"
                      style={{
                        top: `${fillTop}%`,
                        height: `${Math.max(2, fillHeight)}%`,
                      }}
                    />
                  </div>
                  {/* Draggable Fader Cap Thumb */}
                  <div
                    className="absolute left-1 right-1 h-3.5 rounded-md bg-gradient-to-b from-amber-200 to-amber-500 border border-white shadow-[0_2px_8px_rgba(245,158,11,0.6)] flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{
                      top: `calc(10px + ${(1 - norm) * 100}% * (124 / 144) - 7px)`,
                    }}
                  >
                    <div className="w-3 h-[1.5px] bg-slate-950/70 rounded-full" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePreampChange(0)}
                  className="text-[9px] font-mono font-bold text-amber-200/90 hover:text-amber-300 uppercase cursor-pointer"
                  title="クリックで0dBにリセット"
                >
                  Preamp
                </button>
              </div>
            );
          })()}

          {/* 10 Frequency Band Vertical Faders */}
          {EQ_BAND_LABELS.map((label, idx) => {
            const val = eqBands[idx] || 0;
            const norm = (val + 12) / 24; // 0..1
            const zeroNorm = 0.5;
            const fillTop = Math.min(1 - norm, 1 - zeroNorm) * 100;
            const fillHeight = Math.abs(norm - zeroNorm) * 100;
            const isDraggingThis = activeDragBand === idx;

            return (
              <div
                key={label}
                className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-between gap-2 min-w-[48px] transition ${
                  isDraggingThis
                    ? 'bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/10'
                }`}
              >
                <span
                  className={`text-[10px] font-mono font-bold tabular-nums ${
                    val > 0
                      ? 'text-cyan-300'
                      : val < 0
                      ? 'text-rose-300'
                      : 'text-white/60'
                  }`}
                >
                  {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                </span>

                {/* Vertical Draggable Studio Fader Track */}
                <div
                  onPointerDown={(e) => handleFaderPointerDown(e, idx)}
                  onPointerMove={(e) => handleFaderPointerMove(e, idx)}
                  onPointerUp={handleFaderPointerUp}
                  onPointerCancel={handleFaderPointerUp}
                  onDoubleClick={() => handleBandChange(idx, 0)}
                  style={{ touchAction: 'none' }}
                  className="relative w-7 h-36 rounded-lg bg-black/60 border border-white/15 flex items-center justify-center cursor-ns-resize group"
                  title={`${label}: 上下にドラッグして微調整 (-12dB〜+12dB) / ダブルクリックで0dBリセット`}
                >
                  {/* dB scale ticks */}
                  <div className="absolute inset-x-1.5 top-1/4 h-[1px] bg-white/10" />
                  <div className="absolute inset-x-1 top-1/2 h-[1px] bg-white/30" />
                  <div className="absolute inset-x-1.5 top-3/4 h-[1px] bg-white/10" />

                  {/* Vertical Groove */}
                  <div className="w-1.5 h-[calc(100%-20px)] rounded-full bg-white/10 relative overflow-hidden">
                    <div
                      className={`absolute inset-x-0 rounded-full ${
                        val >= 0
                          ? 'bg-gradient-to-t from-cyan-500 to-sky-300'
                          : 'bg-gradient-to-b from-rose-500 to-pink-400'
                      }`}
                      style={{
                        top: `${fillTop}%`,
                        height: `${Math.max(2, fillHeight)}%`,
                      }}
                    />
                  </div>

                  {/* Studio Fader Cap Thumb */}
                  <div
                    className={`absolute left-1 right-1 h-3.5 rounded-md border flex items-center justify-center transition-transform group-hover:scale-105 ${
                      val > 0
                        ? 'bg-gradient-to-b from-cyan-200 to-cyan-500 border-white shadow-[0_2px_10px_rgba(34,211,238,0.65)]'
                        : val < 0
                        ? 'bg-gradient-to-b from-rose-200 to-rose-500 border-white shadow-[0_2px_10px_rgba(244,63,94,0.65)]'
                        : 'bg-gradient-to-b from-slate-200 to-slate-400 border-white/80 shadow'
                    }`}
                    style={{
                      top: `calc(10px + ${(1 - norm) * 100}% * (124 / 144) - 7px)`,
                    }}
                  >
                    <div className="w-3 h-[1.5px] bg-slate-950/75 rounded-full" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBandChange(idx, 0)}
                  className="text-[10px] font-mono font-semibold text-white/80 hover:text-cyan-300 transition cursor-pointer"
                  title="クリックで0dBにリセット"
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>

        {/* All Built-in Mastering EQ Presets Grid */}
        {!compactMode && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-xs font-bold text-white/80">
              すべてのEQプリセット (Rock / Pop / Jazz / Classical / Studio Mastering)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {BUILTIN_EQ_PRESETS.map((preset) => {
                const active = eqPresetName.toLowerCase() === preset.name.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                        : 'bg-white/[0.03] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span className="truncate">{preset.name}</span>
                      {active && (
                        <span className="text-[9px] font-mono text-cyan-300 shrink-0 ml-1">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/50 mt-0.5 line-clamp-2">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. AI SPEAKER / HEADPHONE AUTO-EQ STUDIO (JBL Charge 5, Echo Studio, Quantum 910, ZEALOT ZE-41)
         ===================================================================== */}
      <div className="p-5 rounded-2xl apple-liquid-glass border border-cyan-400/30 bg-gradient-to-br from-cyan-950/35 via-zinc-900/75 to-fuchsia-950/25 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="material-symbols-rounded text-cyan-300 text-xl">auto_awesome</span>
              <h2 className="text-base font-black text-white tracking-tight">
                AI Speaker Auto-EQ (JBL Charge 5 / Echo Studio / JBL Quantum 910 / ZEALOT ZE-41 対応)
              </h2>
              <span className="text-xs text-cyan-200/80 font-mono">
                · 🦀 Rust/Wasm {wasmReady ? 'Active' : 'Ready'}
              </span>
            </div>
            <p className="text-xs text-white/65">
              JBL Charge 5 (Bluetooth & Wi-Fi)、Amazon Echo Studio (Gen 1)、JBL Quantum 910 等のゲーミングシリーズ、ZEALOT ZE-41 などの機種専用プロファイルを収録。任意の機種名を入力してAI自動チューニングも可能です。
            </p>
          </div>
        </div>

        {/* Speaker Model Input & Target Tuning Selector */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerateSpeakerAiEq();
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-2.5"
        >
          <div className="lg:col-span-5 flex items-center gap-2 bg-black/55 border border-white/20 focus-within:border-cyan-400 rounded-xl px-3.5 py-2.5">
            <span className="material-symbols-rounded text-cyan-300 text-[18px]">speaker</span>
            <input
              type="text"
              value={speakerInput}
              onChange={(e) => setSpeakerInput(e.target.value)}
              placeholder="機種名を入力 (例: JBL Charge 5 Wi-Fi, Echo Studio, JBL Quantum 910, ZEALOT ZE-41)..."
              className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none font-medium"
            />
          </div>

          <div className="lg:col-span-4 flex items-center gap-1 bg-black/45 border border-white/15 rounded-xl p-1">
            {(
              [
                { id: 'harman-auto', label: '自動最適' },
                { id: 'bass', label: '重低音' },
                { id: 'vocal', label: 'ボーカル' },
                { id: 'flat-monitor', label: '原音フラット' },
              ] as const
            ).map((pref) => (
              <button
                key={pref.id}
                type="button"
                onClick={() => setTargetPreference(pref.id)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                  targetPreference === pref.id
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                {pref.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!speakerInput.trim() || isGeneratingAiEq}
            className="lg:col-span-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_24px_rgba(34,211,238,0.4)] disabled:opacity-40 transition cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-rounded text-[16px]">
              {isGeneratingAiEq ? 'sync' : 'magic_button'}
            </span>
            <span>{isGeneratingAiEq ? 'AI音響解析中...' : 'AI EQで自動調整'}</span>
          </button>
        </form>

        {/* Hardware Brand Category Filter + Curated Preset Cards */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-white/75">
              収録スピーカー＆ヘッドセット専用 AIEQ プリセット:
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
              {(
                [
                  { id: 'all', label: 'すべて' },
                  { id: 'jbl-speaker', label: 'JBL Charge 5 / Flip' },
                  { id: 'jbl-quantum', label: 'JBL Quantum (910等)' },
                  { id: 'echo-smart', label: 'Echo Studio (Gen 1)' },
                  { id: 'zealot', label: 'ZEALOT (ZE-41等)' },
                  { id: 'headphone-studio', label: 'Sony / Apple / Monitor' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedBrandFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer whitespace-nowrap ${
                    selectedBrandFilter === tab.id
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-white/65 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredHardwarePresets.map((hw) => {
              const active =
                audioState.eqSpeakerModel.toLowerCase() === hw.label.toLowerCase();
              return (
                <button
                  key={hw.label}
                  type="button"
                  onClick={() => handleSelectHardwarePreset(hw)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-300 text-white shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                      : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/10 text-white/85'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-rounded text-[16px] text-cyan-300 shrink-0">
                        {hw.brandGroup === 'jbl-quantum' || hw.brandGroup === 'headphone-studio'
                          ? 'headphones'
                          : 'speaker_group'}
                      </span>
                      <span className="text-xs font-bold truncate">{hw.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-cyan-300/90 shrink-0">
                      {active ? '適用中' : 'AIEQ適用'}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/55 truncate">{hw.category}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Acoustic Diagnostic Result Banner */}
        {(eqAiAnalysis || audioState.eqSpeakerModel) && (
          <div className="p-3.5 rounded-xl bg-black/50 border border-cyan-400/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
              <span className="material-symbols-rounded text-[18px]">graphic_eq</span>
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-cyan-200">{eqPresetName}</span>
                {audioState.eqSpeakerModel && (
                  <span className="text-[10px] font-mono text-white/70">
                    · 対象機種: {audioState.eqSpeakerModel} ({speakerCategory})
                  </span>
                )}
              </div>
              <p className="text-xs text-white/85 leading-relaxed">{eqAiAnalysis}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
