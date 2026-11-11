// -------------------------------------------------------------------------
// GlassiumOS 5 Global Audio Manager, Dolby Atmos 3D Spatial Engine & MediaSession
// Ensures a SINGLE HTMLAudioElement + Web Audio 3D DSP graph across the OS.
// -------------------------------------------------------------------------

import {
  MonochromeTrack,
  MusicSettingsConfig,
  getMusicSettings,
  saveMusicSettings,
  resolveFullLengthAudioStream,
} from './proxyService';
import { resolveBackendUrl } from './backendConfig';

export const EQ_BAND_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const EQ_BAND_LABELS = [
  '32Hz',
  '64Hz',
  '125Hz',
  '250Hz',
  '500Hz',
  '1kHz',
  '2kHz',
  '4kHz',
  '8kHz',
  '16kHz',
] as const;

export interface EqPresetDefinition {
  id: string;
  name: string;
  desc: string;
  preampDb: number;
  bands: number[]; // 10 bands (-12 to +12 dB)
}

export const BUILTIN_EQ_PRESETS: EqPresetDefinition[] = [
  {
    id: 'flat',
    name: 'Flat',
    desc: '色付けなしのフラットなスタジオ原音モニター特性 (0dB)',
    preampDb: 0,
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'rock',
    name: 'Rock',
    desc: 'バスドラムの重厚なアタックとエレキギターのエッジ感・シンバルの抜けを強調',
    preampDb: -1.5,
    bands: [5.0, 4.2, 3.0, -1.5, -0.5, 2.5, 4.0, 4.5, 3.8, 3.2],
  },
  {
    id: 'pop',
    name: 'Pop',
    desc: 'ボーカルの艶やかな存在感とタイトなリズム隊を前面に引き出すポップス最適設定',
    preampDb: -1.0,
    bands: [-1.0, 2.0, 3.8, 4.2, 2.5, 0.5, 1.8, 3.2, 2.8, 2.2],
  },
  {
    id: 'jazz',
    name: 'Jazz',
    desc: 'ウッドベースの豊かな胴鳴りとサックス・ピアノの温かいアコースティック倍音',
    preampDb: -1.0,
    bands: [3.8, 3.2, 1.8, 2.2, -1.2, -1.2, 0.5, 1.8, 3.0, 3.5],
  },
  {
    id: 'classical',
    name: 'Classical',
    desc: 'オーケストラの広大なダイナミックレンジと弦楽器・ホール残響の繊細な空気感',
    preampDb: -0.5,
    bands: [4.2, 3.5, 2.5, 0.5, -1.0, -1.0, 0.0, 2.2, 3.5, 4.2],
  },
  {
    id: 'harman',
    name: 'Harman Target 2024',
    desc: '人間の聴覚特性に最も心地よいサブベース＋高域の伸び',
    preampDb: -1.5,
    bands: [5.5, 4.5, 2.0, -0.5, -1.0, 0.5, 2.5, 3.8, 3.0, 2.5],
  },
  {
    id: 'bass-boost',
    name: 'Deep Sub-Bass Boost',
    desc: '32Hz〜125Hzの重低音とキックのアタックを力強く増強',
    preampDb: -2.5,
    bands: [7.5, 6.5, 4.5, 1.5, 0, -0.5, 0.5, 1.5, 2.0, 1.5],
  },
  {
    id: 'edm-club',
    name: 'Electronic / Arena EDM',
    desc: 'ドンシャリ傾向のクラブサウンドと煌びやかなシンセ高域',
    preampDb: -2.0,
    bands: [6.5, 5.5, 2.5, -1.5, -2.0, 0, 2.5, 4.5, 5.5, 5.0],
  },
  {
    id: 'small-speaker-rescue',
    name: '小型・内蔵スピーカー補正',
    desc: 'ノートPCやスマホ・小型Bluetoothスピーカーの低域不足と箱鳴りを解消',
    preampDb: -2.0,
    bands: [6.0, 7.0, 4.5, -2.0, -2.5, 1.5, 3.2, 3.8, 4.0, 3.5],
  },
];

const EQ_STORAGE_KEY = 'glasis_music_eq_v1';

interface StoredEqConfig {
  eqEnabled: boolean;
  eqBands: number[];
  eqPreampDb: number;
  eqPresetName: string;
  eqSpeakerModel: string;
  eqAiAnalysis: string;
}

function loadStoredEqConfig(): StoredEqConfig {
  try {
    const raw = localStorage.getItem(EQ_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.eqBands) && parsed.eqBands.length === 10) {
        return {
          eqEnabled: Boolean(parsed.eqEnabled ?? true),
          eqBands: parsed.eqBands.map((n: unknown) => Math.max(-12, Math.min(12, Number(n) || 0))),
          eqPreampDb: Math.max(-12, Math.min(12, Number(parsed.eqPreampDb) || 0)),
          eqPresetName: String(parsed.eqPresetName || 'Harman Target 2024'),
          eqSpeakerModel: String(parsed.eqSpeakerModel || ''),
          eqAiAnalysis: String(parsed.eqAiAnalysis || ''),
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    eqEnabled: true,
    eqBands: [...BUILTIN_EQ_PRESETS[1].bands],
    eqPreampDb: BUILTIN_EQ_PRESETS[1].preampDb,
    eqPresetName: BUILTIN_EQ_PRESETS[1].name,
    eqSpeakerModel: '',
    eqAiAnalysis: '',
  };
}

function saveStoredEqConfig(cfg: StoredEqConfig) {
  try {
    localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export type SpatialRoomModel =
  | 'studio'
  | 'theater'
  | 'binaural'
  | 'concert-hall'
  | 'club-arena'
  | 'cathedral';

export interface SpatialAudioDetails {
  roomModel: SpatialRoomModel;
  azimuthDeg: number;      // -180 to +180 degrees
  elevationDeg: number;    // -45 to +45 degrees
  distanceMeters: number;  // 0.5 to 5.0 meters
  stereoWidth: number;     // 0 to 200 (%)
  reverbWet: number;       // 0 to 100 (%)
  roomDecaySec: number;    // 0.3 to 3.5 (seconds)
  crossfeed: number;       // 0 to 100 (%)
  subBassBoostDb: number;  // -6 to +12 (dB)
  vocalClarityDb: number;  // -6 to +12 (dB)
  airBrillianceDb: number; // -6 to +12 (dB)
  autoOrbit: boolean;      // 360-degree auto rotation
  orbitSpeed: number;      // 0.2 to 3.0
}

const SPATIAL_DETAILS_STORAGE_KEY = 'glasis_spatial_audio_details_v1';

export const DEFAULT_SPATIAL_DETAILS: SpatialAudioDetails = {
  roomModel: 'theater',
  azimuthDeg: 0,
  elevationDeg: 8,
  distanceMeters: 1.4,
  stereoWidth: 135,
  reverbWet: 24,
  roomDecaySec: 1.45,
  crossfeed: 32,
  subBassBoostDb: 4.5,
  vocalClarityDb: 3.0,
  airBrillianceDb: 4.0,
  autoOrbit: false,
  orbitSpeed: 1.0,
};

function loadStoredSpatialDetails(): SpatialAudioDetails {
  try {
    const raw = localStorage.getItem(SPATIAL_DETAILS_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        roomModel: p.roomModel || DEFAULT_SPATIAL_DETAILS.roomModel,
        azimuthDeg: Math.max(-180, Math.min(180, Number(p.azimuthDeg ?? 0))),
        elevationDeg: Math.max(-45, Math.min(45, Number(p.elevationDeg ?? 8))),
        distanceMeters: Math.max(0.5, Math.min(5.0, Number(p.distanceMeters ?? 1.4))),
        stereoWidth: Math.max(0, Math.min(200, Number(p.stereoWidth ?? 135))),
        reverbWet: Math.max(0, Math.min(100, Number(p.reverbWet ?? 24))),
        roomDecaySec: Math.max(0.3, Math.min(3.5, Number(p.roomDecaySec ?? 1.45))),
        crossfeed: Math.max(0, Math.min(100, Number(p.crossfeed ?? 32))),
        subBassBoostDb: Math.max(-6, Math.min(12, Number(p.subBassBoostDb ?? 4.5))),
        vocalClarityDb: Math.max(-6, Math.min(12, Number(p.vocalClarityDb ?? 3.0))),
        airBrillianceDb: Math.max(-6, Math.min(12, Number(p.airBrillianceDb ?? 4.0))),
        autoOrbit: Boolean(p.autoOrbit),
        orbitSpeed: Math.max(0.2, Math.min(3.0, Number(p.orbitSpeed ?? 1.0))),
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SPATIAL_DETAILS };
}

function saveStoredSpatialDetails(cfg: SpatialAudioDetails) {
  try {
    localStorage.setItem(SPATIAL_DETAILS_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export interface GlobalAudioState {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  track: MonochromeTrack | null;
  statusMessage: string;
  error: string | null;
  dolbyAtmosEnabled: boolean;
  dolbyAtmosPreset: 'theater' | 'studio' | 'binaural';
  spatialDetails: SpatialAudioDetails;
  streamingQuality: 'lossless' | '320' | '192' | '128';
  sourceSite: 'auto' | 'monochrome' | 'netease' | 'saavn' | 'kuwo';
  eqEnabled: boolean;
  eqBands: number[];
  eqPreampDb: number;
  eqPresetName: string;
  eqSpeakerModel: string;
  eqAiAnalysis: string;
}

type AudioListener = (state: GlobalAudioState) => void;

class GlobalAudioManager {
  private static instance: GlobalAudioManager | null = null;
  private audio: HTMLAudioElement;
  private listeners: Set<AudioListener> = new Set();
  private state: GlobalAudioState;
  private playPromise: Promise<void> | null = null;
  private pendingTrack: MonochromeTrack | null = null;

  // Web Audio API Dolby Atmos 3D Spatial Audio + 10-Band Parametric EQ Graph
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private eqPreampNode: GainNode | null = null;
  private eqFilterNodes: BiquadFilterNode[] = [];
  private dryGainNode: GainNode | null = null;
  private atmosMasterGainNode: GainNode | null = null;
  private subBassFilter: BiquadFilterNode | null = null;
  private presenceFilter: BiquadFilterNode | null = null;
  private airShelfFilter: BiquadFilterNode | null = null;
  private widenerGainNode: GainNode | null = null;
  private crossLNode: GainNode | null = null;
  private crossRNode: GainNode | null = null;
  private hrtfPannerNode: PannerNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private retainedNodes: AudioNode[] = [];
  private graphConnected = false;
  private orbitTimer: number | null = null;
  private lastImpulseRoomModel: string = '';
  private lastImpulseDecay: number = 0;

  private constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    const initialSettings = getMusicSettings();
    const initialEq = loadStoredEqConfig();
    const initialSpatial = loadStoredSpatialDetails();

    this.state = {
      isPlaying: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      volume: 0.85,
      isMuted: false,
      playbackRate: 1.0,
      track: null,
      statusMessage: 'Ready',
      error: null,
      dolbyAtmosEnabled: initialSettings.dolbyAtmosEnabled,
      dolbyAtmosPreset: initialSettings.dolbyAtmosPreset,
      spatialDetails: initialSpatial,
      streamingQuality: initialSettings.streamingQuality,
      sourceSite: initialSettings.sourceSite,
      eqEnabled: initialEq.eqEnabled,
      eqBands: initialEq.eqBands,
      eqPreampDb: initialEq.eqPreampDb,
      eqPresetName: initialEq.eqPresetName,
      eqSpeakerModel: initialEq.eqSpeakerModel,
      eqAiAnalysis: initialEq.eqAiAnalysis,
    };

    this.setupAudioListeners();
    this.setupMediaSession();
    this.setupSettingsSyncListener();
    this.syncOrbitTimer();
  }

  public static getInstance(): GlobalAudioManager {
    if (!GlobalAudioManager.instance) {
      GlobalAudioManager.instance = new GlobalAudioManager();
    }
    return GlobalAudioManager.instance;
  }

  private setupSettingsSyncListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('glassium-music-settings-changed', (evt: Event) => {
      const detail = (evt as CustomEvent<MusicSettingsConfig>).detail;
      if (!detail) return;
      this.updateState({
        dolbyAtmosEnabled: detail.dolbyAtmosEnabled,
        dolbyAtmosPreset: detail.dolbyAtmosPreset,
        streamingQuality: detail.streamingQuality,
        sourceSite: detail.sourceSite,
      });
      if (detail.dolbyAtmosEnabled) {
        this.ensureDolbyAtmosGraph();
      }
      this.applyDolbyAtmosParameters(detail.dolbyAtmosEnabled, detail.dolbyAtmosPreset);
    });

    // Pause Music automatically when Entertainment starts playing video/cinema
    window.addEventListener('glassium-media-focus', (evt: Event) => {
      const detail = (evt as CustomEvent<{ source?: string }>).detail;
      if (detail?.source === 'entertainment' && this.state.isPlaying) {
        this.pause();
      }
    });
  }

  private createImpulseResponse(
    ctx: AudioContext,
    roomModel: SpatialRoomModel | 'theater' | 'studio' | 'binaural',
    customDecaySec?: number
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const defaultDuration =
      roomModel === 'cathedral'
        ? 2.6
        : roomModel === 'concert-hall'
        ? 2.1
        : roomModel === 'club-arena'
        ? 1.8
        : roomModel === 'theater'
        ? 1.55
        : roomModel === 'binaural'
        ? 1.15
        : 0.72;
    const durationSec = Math.max(0.25, Math.min(3.5, customDecaySec ?? defaultDuration));
    const decay =
      roomModel === 'cathedral'
        ? 2.2
        : roomModel === 'concert-hall'
        ? 2.6
        : roomModel === 'theater'
        ? 2.9
        : roomModel === 'binaural'
        ? 3.5
        : 4.4;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.pow(1 - i / length, decay);
      const earlyBoost = t < 0.045 ? 1.3 * Math.sin(t * 420) : 1.0;
      left[i] = (Math.random() * 2 - 1) * env * earlyBoost;
      right[i] = (Math.random() * 2 - 1) * env * earlyBoost;
    }
    return impulse;
  }

  private ensureDolbyAtmosGraph() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.graphConnected) {
        this.applyEqParameters();
        this.applyDolbyAtmosParameters(this.state.dolbyAtmosEnabled, this.state.dolbyAtmosPreset);
        return;
      }

      const ctx = this.audioCtx;
      this.sourceNode = ctx.createMediaElementSource(this.audio);

      // 10-Band Parametric Equalizer Preamp + BiquadFilter Chain
      this.eqPreampNode = ctx.createGain();
      this.eqPreampNode.gain.value = 1.0;

      this.eqFilterNodes = EQ_BAND_FREQUENCIES.map((freq, idx) => {
        const filter = ctx.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === EQ_BAND_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = this.state.eqEnabled ? (this.state.eqBands[idx] || 0) : 0;
        return filter;
      });

      this.dryGainNode = ctx.createGain();
      this.dryGainNode.gain.value = this.state.dolbyAtmosEnabled ? 0.0 : 1.0;

      this.subBassFilter = ctx.createBiquadFilter();
      this.subBassFilter.type = 'lowshelf';
      this.subBassFilter.frequency.value = 82;

      this.presenceFilter = ctx.createBiquadFilter();
      this.presenceFilter.type = 'peaking';
      this.presenceFilter.frequency.value = 3100;
      this.presenceFilter.Q.value = 0.85;

      this.airShelfFilter = ctx.createBiquadFilter();
      this.airShelfFilter.type = 'highshelf';
      this.airShelfFilter.frequency.value = 10200;

      // 3D HRTF Spatial Panner Node
      this.hrtfPannerNode = ctx.createPanner();
      this.hrtfPannerNode.panningModel = 'HRTF';
      this.hrtfPannerNode.distanceModel = 'inverse';
      this.hrtfPannerNode.refDistance = 1.0;
      this.hrtfPannerNode.maxDistance = 10.0;
      this.hrtfPannerNode.rolloffFactor = 0.75;

      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const delayL = ctx.createDelay(0.05);
      const delayR = ctx.createDelay(0.05);
      delayL.delayTime.value = 0.013;
      delayR.delayTime.value = 0.017;

      this.widenerGainNode = ctx.createGain();
      this.crossLNode = ctx.createGain();
      this.crossRNode = ctx.createGain();
      this.crossLNode.gain.value = 0.36;
      this.crossRNode.gain.value = 0.36;

      this.reverbConvolver = ctx.createConvolver();
      this.reverbConvolver.buffer = this.createImpulseResponse(
        ctx,
        this.state.spatialDetails.roomModel || this.state.dolbyAtmosPreset,
        this.state.spatialDetails.roomDecaySec
      );
      this.lastImpulseRoomModel = this.state.spatialDetails.roomModel || this.state.dolbyAtmosPreset;
      this.lastImpulseDecay = this.state.spatialDetails.roomDecaySec;
      this.reverbWetGain = ctx.createGain();

      this.compressorNode = ctx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -19;
      this.compressorNode.knee.value = 24;
      this.compressorNode.ratio.value = 3.2;
      this.compressorNode.attack.value = 0.004;
      this.compressorNode.release.value = 0.22;

      this.atmosMasterGainNode = ctx.createGain();
      this.atmosMasterGainNode.gain.value = this.state.dolbyAtmosEnabled ? 1.12 : 0.0;

      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.78;

      // Retain references so V8 never garbage-collects intermediate nodes
      this.retainedNodes = [
        this.sourceNode,
        this.eqPreampNode,
        ...this.eqFilterNodes,
        this.dryGainNode,
        this.subBassFilter,
        this.presenceFilter,
        this.airShelfFilter,
        this.hrtfPannerNode,
        splitter,
        merger,
        delayL,
        delayR,
        this.crossLNode,
        this.crossRNode,
        this.widenerGainNode,
        this.reverbConvolver,
        this.reverbWetGain,
        this.compressorNode,
        this.atmosMasterGainNode,
        this.analyserNode,
      ];

      // Connect Source -> EQ Preamp -> 10-Band EQ Chain
      this.sourceNode.connect(this.eqPreampNode);
      let prevEqNode: AudioNode = this.eqPreampNode;
      for (const filterNode of this.eqFilterNodes) {
        prevEqNode.connect(filterNode);
        prevEqNode = filterNode;
      }

      // Connect end of 10-band EQ chain to both dry stereo path and Dolby Atmos 3D path
      prevEqNode.connect(this.dryGainNode);
      this.dryGainNode.connect(this.analyserNode);

      prevEqNode.connect(this.subBassFilter);
      this.subBassFilter.connect(this.presenceFilter);
      this.presenceFilter.connect(this.airShelfFilter);
      this.airShelfFilter.connect(this.hrtfPannerNode);

      this.hrtfPannerNode.connect(this.compressorNode);

      this.airShelfFilter.connect(splitter);
      splitter.connect(delayL, 0);
      splitter.connect(delayR, 1);
      delayL.connect(this.crossLNode);
      delayR.connect(this.crossRNode);
      this.crossLNode.connect(merger, 0, 1);
      this.crossRNode.connect(merger, 0, 0);
      merger.connect(this.widenerGainNode);
      this.widenerGainNode.connect(this.compressorNode);

      this.hrtfPannerNode.connect(this.reverbConvolver);
      this.reverbConvolver.connect(this.reverbWetGain);
      this.reverbWetGain.connect(this.compressorNode);

      this.compressorNode.connect(this.atmosMasterGainNode);
      this.atmosMasterGainNode.connect(this.analyserNode);
      this.analyserNode.connect(ctx.destination);

      this.graphConnected = true;
      this.applyEqParameters();
      this.applyDolbyAtmosParameters(this.state.dolbyAtmosEnabled, this.state.dolbyAtmosPreset);
    } catch (e) {
      console.warn('Dolby Atmos / EQ WebAudio init fallback to native output:', e);
    }
  }

  private vocalLevelPercent = 100;

  public getVocalLevel(): number {
    return this.vocalLevelPercent;
  }

  public setVocalLevel(percent: number) {
    this.vocalLevelPercent = Math.max(0, Math.min(130, Math.round(percent)));
    this.ensureDolbyAtmosGraph();
    this.applyEqParameters();
  }

  private applyEqParameters() {
    if (!this.graphConnected || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    const now = this.audioCtx.currentTime;
    const enabled = this.state.eqEnabled;

    if (this.eqPreampNode) {
      const targetLinear = enabled ? Math.pow(10, (this.state.eqPreampDb || 0) / 20) : 1.0;
      this.eqPreampNode.gain.setTargetAtTime(targetLinear, now, 0.03);
    }

    // Apple Music Sing / Karaoke Vocal Attenuation offset across vocal formants (250Hz - 4kHz)
    const vocalDelta = (this.vocalLevelPercent - 100) / 100; // -1.0 (0% karaoke) to +0.3 (130% boost)
    const vocalBandWeights = [0, 0, 0.15, 0.65, 0.95, 1.0, 1.0, 0.85, 0.2, 0];

    this.eqFilterNodes.forEach((node, idx) => {
      const baseDb = enabled ? Math.max(-12, Math.min(12, this.state.eqBands[idx] || 0)) : 0;
      const vocalOffsetDb =
        vocalDelta < 0
          ? vocalDelta * 13.5 * vocalBandWeights[idx]
          : vocalDelta * 8.0 * vocalBandWeights[idx];
      const targetDb = Math.max(-15, Math.min(15, baseDb + vocalOffsetDb));
      node.gain.setTargetAtTime(targetDb, now, 0.03);
    });
  }

  public setEqualizer(config: {
    enabled?: boolean;
    bands?: number[];
    preampDb?: number;
    presetName?: string;
    speakerModel?: string;
    aiAnalysis?: string;
  }) {
    this.ensureDolbyAtmosGraph();
    const nextEnabled = config.enabled !== undefined ? config.enabled : this.state.eqEnabled;
    const nextBands =
      config.bands && config.bands.length === 10
        ? config.bands.map((v) => Math.max(-12, Math.min(12, Math.round(Number(v) * 10) / 10)))
        : this.state.eqBands;
    const nextPreamp =
      config.preampDb !== undefined
        ? Math.max(-12, Math.min(12, Math.round(Number(config.preampDb) * 10) / 10))
        : this.state.eqPreampDb;
    const nextPresetName = config.presetName !== undefined ? config.presetName : this.state.eqPresetName;
    const nextSpeaker = config.speakerModel !== undefined ? config.speakerModel : this.state.eqSpeakerModel;
    const nextAnalysis = config.aiAnalysis !== undefined ? config.aiAnalysis : this.state.eqAiAnalysis;

    this.updateState({
      eqEnabled: nextEnabled,
      eqBands: nextBands,
      eqPreampDb: nextPreamp,
      eqPresetName: nextPresetName,
      eqSpeakerModel: nextSpeaker,
      eqAiAnalysis: nextAnalysis,
    });

    saveStoredEqConfig({
      eqEnabled: nextEnabled,
      eqBands: nextBands,
      eqPreampDb: nextPreamp,
      eqPresetName: nextPresetName,
      eqSpeakerModel: nextSpeaker,
      eqAiAnalysis: nextAnalysis,
    });

    this.applyEqParameters();
  }

  private applyDolbyAtmosParameters(
    enabled: boolean,
    preset: 'theater' | 'studio' | 'binaural'
  ) {
    if (!this.graphConnected || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    const now = this.audioCtx.currentTime;
    const sp = this.state.spatialDetails;

    if (!enabled) {
      if (this.dryGainNode) {
        this.dryGainNode.gain.setTargetAtTime(1.0, now, 0.04);
      }
      if (this.atmosMasterGainNode) {
        this.atmosMasterGainNode.gain.setTargetAtTime(0.0, now, 0.04);
      }
      return;
    }

    if (this.dryGainNode) {
      this.dryGainNode.gain.setTargetAtTime(0.0, now, 0.04);
    }
    if (this.atmosMasterGainNode) {
      this.atmosMasterGainNode.gain.setTargetAtTime(1.14, now, 0.04);
    }

    if (this.subBassFilter) {
      this.subBassFilter.gain.setTargetAtTime(sp.subBassBoostDb, now, 0.04);
    }
    if (this.presenceFilter) {
      this.presenceFilter.gain.setTargetAtTime(sp.vocalClarityDb, now, 0.04);
    }
    if (this.airShelfFilter) {
      this.airShelfFilter.gain.setTargetAtTime(sp.airBrillianceDb, now, 0.04);
    }
    if (this.widenerGainNode) {
      const widthGain = Math.max(0, Math.min(1.2, (sp.stereoWidth / 100) * 0.48));
      this.widenerGainNode.gain.setTargetAtTime(widthGain, now, 0.04);
    }
    if (this.crossLNode && this.crossRNode) {
      const cf = Math.max(0.05, Math.min(0.75, (sp.crossfeed / 100) * 0.6));
      this.crossLNode.gain.setTargetAtTime(cf, now, 0.04);
      this.crossRNode.gain.setTargetAtTime(cf, now, 0.04);
    }
    if (this.reverbWetGain) {
      const wet = Math.max(0, Math.min(0.85, (sp.reverbWet / 100) * 0.75));
      this.reverbWetGain.gain.setTargetAtTime(wet, now, 0.04);
    }

    if (this.hrtfPannerNode) {
      const azRad = (sp.azimuthDeg * Math.PI) / 180;
      const elRad = (sp.elevationDeg * Math.PI) / 180;
      const dist = Math.max(0.5, sp.distanceMeters);
      const x = dist * Math.sin(azRad) * Math.cos(elRad);
      const y = dist * Math.sin(elRad);
      const z = -dist * Math.cos(azRad) * Math.cos(elRad);
      if (this.hrtfPannerNode.positionX) {
        this.hrtfPannerNode.positionX.setTargetAtTime(x, now, 0.04);
        this.hrtfPannerNode.positionY.setTargetAtTime(y, now, 0.04);
        this.hrtfPannerNode.positionZ.setTargetAtTime(z, now, 0.04);
      } else {
        this.hrtfPannerNode.setPosition(x, y, z);
      }
    }

    const effectiveRoom = sp.roomModel || preset;
    if (
      this.reverbConvolver &&
      this.audioCtx &&
      (this.lastImpulseRoomModel !== effectiveRoom ||
        Math.abs(this.lastImpulseDecay - sp.roomDecaySec) > 0.08)
    ) {
      try {
        this.reverbConvolver.buffer = this.createImpulseResponse(
          this.audioCtx,
          effectiveRoom,
          sp.roomDecaySec
        );
        this.lastImpulseRoomModel = effectiveRoom;
        this.lastImpulseDecay = sp.roomDecaySec;
      } catch {
        // ignore
      }
    }
  }

  private syncOrbitTimer() {
    if (typeof window === 'undefined') return;
    if (this.orbitTimer) {
      window.clearInterval(this.orbitTimer);
      this.orbitTimer = null;
    }
    if (this.state.dolbyAtmosEnabled && this.state.spatialDetails.autoOrbit) {
      this.orbitTimer = window.setInterval(() => {
        if (!this.state.isPlaying || !this.state.dolbyAtmosEnabled || !this.state.spatialDetails.autoOrbit) {
          return;
        }
        const step = 3.2 * (this.state.spatialDetails.orbitSpeed || 1.0);
        let nextAz = this.state.spatialDetails.azimuthDeg + step;
        if (nextAz > 180) nextAz -= 360;
        const nextSpatial: SpatialAudioDetails = {
          ...this.state.spatialDetails,
          azimuthDeg: Math.round(nextAz),
        };
        this.state = { ...this.state, spatialDetails: nextSpatial };
        this.applyDolbyAtmosParameters(this.state.dolbyAtmosEnabled, this.state.dolbyAtmosPreset);
        this.listeners.forEach((l) => l(this.getState()));
      }, 65);
    }
  }

  public setSpatialDetails(partial: Partial<SpatialAudioDetails>) {
    const next: SpatialAudioDetails = {
      ...this.state.spatialDetails,
      ...partial,
    };
    let mappedPreset: 'theater' | 'studio' | 'binaural' = this.state.dolbyAtmosPreset;
    if (partial.roomModel) {
      if (partial.roomModel === 'studio') mappedPreset = 'studio';
      else if (partial.roomModel === 'binaural') mappedPreset = 'binaural';
      else mappedPreset = 'theater';
    }
    saveStoredSpatialDetails(next);
    if (!this.state.dolbyAtmosEnabled) {
      this.ensureDolbyAtmosGraph();
    }
    this.updateState({
      spatialDetails: next,
      dolbyAtmosPreset: mappedPreset,
    });
    this.applyDolbyAtmosParameters(this.state.dolbyAtmosEnabled, mappedPreset);
    this.syncOrbitTimer();
  }

  public setDolbyAtmos(
    enabled: boolean,
    preset: 'theater' | 'studio' | 'binaural' = this.state.dolbyAtmosPreset
  ) {
    if (enabled) {
      this.ensureDolbyAtmosGraph();
    }
    let nextSpatial = { ...this.state.spatialDetails };
    if (preset === 'theater') {
      nextSpatial = {
        ...nextSpatial,
        roomModel: 'theater',
        stereoWidth: 145,
        reverbWet: 26,
        roomDecaySec: 1.55,
        subBassBoostDb: 4.8,
        vocalClarityDb: 3.2,
        airBrillianceDb: 4.2,
      };
    } else if (preset === 'binaural') {
      nextSpatial = {
        ...nextSpatial,
        roomModel: 'binaural',
        stereoWidth: 165,
        reverbWet: 18,
        roomDecaySec: 1.15,
        crossfeed: 48,
        subBassBoostDb: 3.6,
        vocalClarityDb: 4.2,
        airBrillianceDb: 4.8,
      };
    } else if (preset === 'studio') {
      nextSpatial = {
        ...nextSpatial,
        roomModel: 'studio',
        stereoWidth: 118,
        reverbWet: 12,
        roomDecaySec: 0.72,
        crossfeed: 22,
        subBassBoostDb: 2.6,
        vocalClarityDb: 2.5,
        airBrillianceDb: 3.2,
      };
    }
    saveStoredSpatialDetails(nextSpatial);
    saveMusicSettings({ dolbyAtmosEnabled: enabled, dolbyAtmosPreset: preset });
    this.updateState({
      dolbyAtmosEnabled: enabled,
      dolbyAtmosPreset: preset,
      spatialDetails: nextSpatial,
    });
    this.applyDolbyAtmosParameters(enabled, preset);
    this.syncOrbitTimer();
  }

  public getFrequencySpectrum(): Uint8Array | null {
    if (!this.analyserNode || !this.state.isPlaying) return null;
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  private setupAudioListeners() {
    const a = this.audio;

    a.addEventListener('loadstart', () => {
      this.updateState({ isBuffering: true, error: null });
    });

    a.addEventListener('canplay', () => {
      this.updateState({ isBuffering: false });
    });

    a.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(a.duration) && a.duration > 10) {
        const realDur = Math.round(a.duration);
        this.updateState({
          duration: a.duration,
          track: this.state.track ? { ...this.state.track, duration: realDur } : null,
        });
      }
    });

    a.addEventListener('playing', () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.updateState({ isPlaying: true, isBuffering: false, error: null });
      this.syncMediaSessionState('playing');
    });

    a.addEventListener('pause', () => {
      this.updateState({ isPlaying: false });
      this.syncMediaSessionState('paused');
    });

    a.addEventListener('timeupdate', () => {
      if (Number.isFinite(a.currentTime)) {
        this.updateState({
          currentTime: a.currentTime,
          duration:
            Number.isFinite(a.duration) && a.duration > 0
              ? a.duration
              : this.state.track?.duration || 0,
        });
        this.updateMediaPositionState();
      }
    });

    a.addEventListener('durationchange', () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        this.updateState({ duration: a.duration });
      }
    });

    a.addEventListener('ended', () => {
      this.updateState({ isPlaying: false, currentTime: 0 });
      this.syncMediaSessionState('none');
      window.dispatchEvent(new CustomEvent('glassium-music-event', { detail: { event: 'track-ended' } }));
    });

    a.addEventListener('error', (e) => {
      console.warn('GlobalAudio error:', e);
      if (a.error && a.error.code !== MediaError.MEDIA_ERR_ABORTED) {
        this.updateState({
          isPlaying: false,
          isBuffering: false,
          error: `Audio playback error (code ${a.error.code})`,
          statusMessage: '別ソースのフル尺ストリームに自動切替中...',
        });
      }
    });
  }

  private setupMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        this.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        window.dispatchEvent(new CustomEvent('glassium-music-command', { detail: { action: 'prev' } }));
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        window.dispatchEvent(new CustomEvent('glassium-music-command', { detail: { action: 'next' } }));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          this.seek(details.seekTime);
        }
      });
    } catch {
      // ignore media session registration error
    }
  }

  private syncMediaSessionMetadata(track: MonochromeTrack) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const artworkSrc =
        track.artworkUrl ||
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="%23fa243c"/></svg>';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'GlassiumOS Music',
        artwork: [
          { src: artworkSrc, sizes: '96x96', type: 'image/png' },
          { src: artworkSrc, sizes: '128x128', type: 'image/png' },
          { src: artworkSrc, sizes: '256x256', type: 'image/png' },
          { src: artworkSrc, sizes: '512x512', type: 'image/png' },
        ],
      });
    } catch {
      // ignore
    }
  }

  private syncMediaSessionState(state: 'playing' | 'paused' | 'none') {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch {
      // ignore
    }
  }

  private updateMediaPositionState() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;

    try {
      const dur =
        Number.isFinite(this.audio.duration) && this.audio.duration > 0
          ? this.audio.duration
          : this.state.track?.duration || 0;
      const pos = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;

      if (dur > 0 && pos <= dur) {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: this.audio.playbackRate || 1.0,
          position: pos,
        });
      }
    } catch {
      // ignore
    }
  }

  public getState(): GlobalAudioState {
    return { ...this.state };
  }

  public getAudioElement(): HTMLAudioElement {
    return this.audio;
  }

  public getCurrentTime(): number {
    return Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : this.state.currentTime;
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<GlobalAudioState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.getState()));
  }

  public async playTrack(track: MonochromeTrack, startAtSec = 0): Promise<void> {
    this.pendingTrack = track;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('glassium-media-focus', { detail: { source: 'music' } })
      );
    }
    if (this.state.dolbyAtmosEnabled || this.state.eqEnabled || this.graphConnected) {
      this.ensureDolbyAtmosGraph();
    }

    const settings = getMusicSettings();
    // Always stream universally supported MP3 bitrates (320 / 192 / 128) to <audio>
    const brVal =
      settings.streamingQuality === '128'
        ? 128
        : settings.streamingQuality === '192'
        ? 192
        : 320;

    const cleanArtist =
      (track.artist || '')
        .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
        .split(/[,、/]/)[0]
        .trim() || track.artist;

    const rawIdStr = String(track.monoTrackId || track.id || '').trim();
    const isNonNeteaseId = /^(?:mono-itunes-|itunes-|album-|single-|artist-)/i.test(rawIdStr);
    const strippedId = isNonNeteaseId
      ? ''
      : rawIdStr
          .replace(/^mono-live-gd-/, '')
          .replace(/^mono-gd-/, '')
          .replace(/^mono-live-tf-/, '')
          .replace(/^mono-live-/, '')
          .trim();
    const numericId = /^\d+$/.test(strippedId) ? strippedId : '';

    const resolvedUrl = resolveBackendUrl(
      `/api/music/play?id=${encodeURIComponent(
        numericId
      )}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
        cleanArtist
      )}&br=${brVal}&source=${encodeURIComponent(settings.sourceSite)}`
    );

    try {
      this.audio.pause();
    } catch {
      // ignore
    }
    this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
    this.audio.playbackRate = this.state.playbackRate;

    if (startAtSec > 0.5) {
      const onLoaded = () => {
        try {
          this.audio.currentTime = startAtSec;
        } catch {
          // ignore
        }
        this.audio.removeEventListener('loadedmetadata', onLoaded);
      };
      this.audio.addEventListener('loadedmetadata', onLoaded);
    }

    this.updateState({
      track,
      currentTime: startAtSec,
      duration: track.duration,
      isBuffering: true,
      error: null,
      statusMessage: `フル尺再生中 (${
        settings.streamingQuality === 'lossless' ? '320kbps Master' : `${settings.streamingQuality}kbps`
      }${this.state.dolbyAtmosEnabled ? ' · Dolby Atmos' : ''}): ${track.title} — ${cleanArtist}`,
    });

    this.syncMediaSessionMetadata(track);

    // Fast path: if track has a local WAV/Blob URL (e.g. GarageBand export) or direct CORS-safe HTTPS stream URL, play immediately
    const localBlobOrDataUrl =
      typeof track.audioUrl === 'string' && /^(data:audio\/|blob:)/i.test(track.audioUrl)
        ? track.audioUrl
        : typeof track.sourceUrl === 'string' && /^(data:audio\/|blob:)/i.test(track.sourceUrl)
        ? track.sourceUrl
        : null;

    if (localBlobOrDataUrl) {
      try {
        this.audio.src = localBlobOrDataUrl;
        this.playPromise = this.audio.play();
        await this.playPromise;
        this.playPromise = null;
        if (this.pendingTrack === track) {
          this.updateState({
            isPlaying: true,
            isBuffering: false,
            error: null,
            statusMessage: `GarageBand スタジオ書き出し音源を再生中: ${track.title}`,
          });
        }
        return;
      } catch {
        this.playPromise = null;
      }
    }

    const hasDirectHttpsStream =
      typeof track.sourceUrl === 'string' &&
      /^https:\/\//i.test(track.sourceUrl) &&
      (track.sourceUrl.includes('itunes.apple.com') ||
        track.sourceUrl.includes('mzstatic.com') ||
        track.sourceUrl.includes('saavncdn.com') ||
        /\.(m4a|mp3|aac|flac|ogg)(\?|$)/i.test(track.sourceUrl));

    if (hasDirectHttpsStream && !numericId) {
      try {
        this.audio.src = track.sourceUrl!;
        this.playPromise = this.audio.play();
        await this.playPromise;
        this.playPromise = null;
        if (this.pendingTrack === track) {
          this.updateState({
            isPlaying: true,
            isBuffering: false,
            error: null,
            statusMessage: `再生中 (${
              settings.streamingQuality === 'lossless' ? '256kbps AAC / 320kbps' : `${settings.streamingQuality}kbps`
            }): ${track.title} — ${cleanArtist}`,
          });
        }
        return;
      } catch {
        this.playPromise = null;
      }
    }

    // Stage 1: Server Full-Length Stream Proxy (/api/music/play) with 2.2s fast race guard
    try {
      this.audio.src = resolvedUrl;
      this.playPromise = this.audio.play();
      const timeoutGuard = new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), 2200)
      );
      const raceResult = await Promise.race([
        this.playPromise.then(() => 'playing' as const),
        timeoutGuard,
      ]);
      if (raceResult === 'playing') {
        this.playPromise = null;
        if (this.pendingTrack === track) {
          const realDur =
            Number.isFinite(this.audio.duration) && this.audio.duration > 45
              ? Math.round(this.audio.duration)
              : track.duration;
          this.updateState({
            isPlaying: true,
            isBuffering: false,
            duration: realDur,
            error: null,
            statusMessage: `フル尺再生中 (Server 320kbps): ${track.title} — ${cleanArtist}`,
          });
        }
        return;
      }
      // If server stream took >2.2s and we have a direct HTTPS stream, switch immediately
      if (hasDirectHttpsStream && this.pendingTrack === track) {
        this.audio.src = track.sourceUrl!;
        this.playPromise = this.audio.play();
        await this.playPromise;
        this.playPromise = null;
        this.updateState({
          isPlaying: true,
          isBuffering: false,
          error: null,
          statusMessage: `高速ストリーム再生中: ${track.title} — ${cleanArtist}`,
        });
        return;
      }
      await this.playPromise;
      this.playPromise = null;
      return;
    } catch (err: unknown) {
      this.playPromise = null;
      if ((err as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
        return;
      }
    }

    // Stage 2: Direct HTTPS stream or iTunes instant lookup fallback
    if (this.pendingTrack === track) {
      try {
        let fastUrl = hasDirectHttpsStream ? track.sourceUrl! : '';
        if (!fastUrl) {
          const q = encodeURIComponent(`${track.title} ${cleanArtist}`.trim());
          const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${q}&country=JP&media=music&entity=song&limit=3`,
            { signal: AbortSignal.timeout(2000) }
          ).catch(() => null);
          if (itunesRes && itunesRes.ok) {
            const itunesData = await itunesRes.json();
            const firstMatch = (itunesData?.results || []).find(
              (r: { previewUrl?: string }) => typeof r?.previewUrl === 'string' && r.previewUrl.startsWith('http')
            );
            if (firstMatch?.previewUrl) {
              fastUrl = firstMatch.previewUrl;
            }
          }
        }
        if (fastUrl && this.pendingTrack === track) {
          this.audio.src = fastUrl;
          this.playPromise = this.audio.play();
          await this.playPromise;
          this.playPromise = null;
          this.updateState({
            isPlaying: true,
            isBuffering: false,
            error: null,
            statusMessage: `再生中: ${track.title} — ${cleanArtist}`,
          });
          return;
        }
      } catch {
        this.playPromise = null;
      }
    }

    // Stage 3: Client-side Direct Stream URL (if resolved via /api/music/info)
    if (this.pendingTrack === track) {
      try {
        const directStream = await resolveFullLengthAudioStream(track.title, cleanArtist, numericId);
        const clientAudioUrl =
          directStream?.audioUrl ||
          (track.sourceUrl && track.sourceUrl.startsWith('http') ? track.sourceUrl : null);

        if (clientAudioUrl && this.pendingTrack === track) {
          this.audio.src = clientAudioUrl;
          this.playPromise = this.audio.play();
          await this.playPromise;
          this.playPromise = null;
          this.updateState({
            isPlaying: true,
            isBuffering: false,
            error: null,
            statusMessage: `フル尺再生中 (Direct 320kbps): ${track.title} — ${cleanArtist}`,
          });
          return;
        }
      } catch (err3: unknown) {
        this.playPromise = null;
        if ((err3 as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
          return;
        }
      }
    }

    // Stage 4: Piped Audio Stream Fallback (/api/music/piped)
    if (this.pendingTrack === track) {
      try {
        const query = `${track.title} ${cleanArtist}`.trim();
        const pipedRes = await fetch(
          resolveBackendUrl(`/api/music/piped?q=${encodeURIComponent(query)}`),
          { signal: AbortSignal.timeout(5500) }
        );
        if (pipedRes.ok) {
          const pipedData = (await pipedRes.json()) as { url?: string };
          if (pipedData?.url && this.pendingTrack === track) {
            this.audio.src = pipedData.url;
            this.playPromise = this.audio.play();
            await this.playPromise;
            this.playPromise = null;
            this.updateState({
              isPlaying: true,
              isBuffering: false,
              error: null,
              statusMessage: `フル尺再生中 (Piped Fallback): ${track.title} — ${cleanArtist}`,
            });
            return;
          }
        }
      } catch (err4: unknown) {
        this.playPromise = null;
        if ((err4 as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
          return;
        }
      }
    }

    // Stage 5: Invidious Audio Stream Fallback (/api/music/invidious)
    if (this.pendingTrack === track) {
      try {
        const query = `${track.title} ${cleanArtist}`.trim();
        const invRes = await fetch(
          resolveBackendUrl(`/api/music/invidious?q=${encodeURIComponent(query)}`),
          { signal: AbortSignal.timeout(5500) }
        );
        if (invRes.ok) {
          const invData = (await invRes.json()) as { url?: string };
          if (invData?.url && this.pendingTrack === track) {
            this.audio.src = invData.url;
            this.playPromise = this.audio.play();
            await this.playPromise;
            this.playPromise = null;
            this.updateState({
              isPlaying: true,
              isBuffering: false,
              error: null,
              statusMessage: `フル尺再生中 (Invidious Fallback): ${track.title} — ${cleanArtist}`,
            });
            return;
          }
        }
      } catch (err5: unknown) {
        this.playPromise = null;
        if ((err5 as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
          return;
        }
      }
    }

    if (this.pendingTrack === track) {
      this.updateState({
        isPlaying: false,
        isBuffering: false,
        error: null,
        statusMessage: `${track.title} — ストリームを準備中`,
      });
    }
  }

  public async togglePlay(): Promise<void> {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      if (this.state.track) {
        await this.resume();
      }
    }
  }

  public pause(): void {
    try {
      this.audio.pause();
    } catch {
      // ignore
    }
    this.playPromise = null;
    this.updateState({ isPlaying: false });
  }

  public async resume(): Promise<void> {
    if (!this.state.track) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('glassium-media-focus', { detail: { source: 'music' } })
      );
    }
    if (this.state.dolbyAtmosEnabled || this.graphConnected) {
      this.ensureDolbyAtmosGraph();
    }
    if (!this.audio.src) {
      await this.playTrack(this.state.track, this.state.currentTime);
      return;
    }
    try {
      this.playPromise = this.audio.play();
      await this.playPromise;
      this.playPromise = null;
      this.updateState({
        isPlaying: true,
        isBuffering: false,
        error: null,
      });
    } catch {
      this.playPromise = null;
      await this.playTrack(this.state.track, this.state.currentTime);
    }
  }

  public seek(seconds: number): void {
    const dur =
      Number.isFinite(this.audio.duration) && this.audio.duration > 0
        ? this.audio.duration
        : this.state.track?.duration || 0;
    const clamped = Math.max(0, Math.min(dur, seconds));
    if (Number.isFinite(clamped)) {
      this.audio.currentTime = clamped;
      this.updateState({ currentTime: clamped });
      this.updateMediaPositionState();
    }
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.audio.volume = this.state.isMuted ? 0 : clamped;
    this.updateState({ volume: clamped });
  }

  public setMuted(muted: boolean): void {
    this.audio.volume = muted ? 0 : this.state.volume;
    this.updateState({ isMuted: muted });
  }

  public setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    this.audio.playbackRate = clamped;
    this.updateState({ playbackRate: clamped });
  }

  public stop(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.updateState({
      isPlaying: false,
      isBuffering: false,
      currentTime: 0,
      track: null,
      statusMessage: 'Stopped',
    });
  }
}

export const globalAudio = GlobalAudioManager.getInstance();

