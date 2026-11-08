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
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private retainedNodes: AudioNode[] = [];
  private graphConnected = false;

  private constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    const initialSettings = getMusicSettings();
    const initialEq = loadStoredEqConfig();

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
    preset: 'theater' | 'studio' | 'binaural'
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const durationSec = preset === 'theater' ? 1.65 : preset === 'binaural' ? 1.2 : 0.75;
    const decay = preset === 'theater' ? 2.8 : preset === 'binaural' ? 3.4 : 4.4;
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

      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const delayL = ctx.createDelay(0.05);
      const delayR = ctx.createDelay(0.05);
      delayL.delayTime.value = 0.013;
      delayR.delayTime.value = 0.017;

      this.widenerGainNode = ctx.createGain();
      const crossL = ctx.createGain();
      const crossR = ctx.createGain();
      crossL.gain.value = 0.36;
      crossR.gain.value = 0.36;

      this.reverbConvolver = ctx.createConvolver();
      this.reverbConvolver.buffer = this.createImpulseResponse(ctx, this.state.dolbyAtmosPreset);
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
        splitter,
        merger,
        delayL,
        delayR,
        crossL,
        crossR,
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

      this.airShelfFilter.connect(this.compressorNode);

      this.airShelfFilter.connect(splitter);
      splitter.connect(delayL, 0);
      splitter.connect(delayR, 1);
      delayL.connect(crossL);
      delayR.connect(crossR);
      crossL.connect(merger, 0, 1);
      crossR.connect(merger, 0, 0);
      merger.connect(this.widenerGainNode);
      this.widenerGainNode.connect(this.compressorNode);

      this.airShelfFilter.connect(this.reverbConvolver);
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

    this.eqFilterNodes.forEach((node, idx) => {
      const targetDb = enabled ? Math.max(-12, Math.min(12, this.state.eqBands[idx] || 0)) : 0;
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

    if (!enabled) {
      if (this.dryGainNode) {
        this.dryGainNode.gain.value = 1.0;
        this.dryGainNode.gain.setTargetAtTime(1.0, now, 0.04);
      }
      if (this.atmosMasterGainNode) {
        this.atmosMasterGainNode.gain.value = 0.0;
        this.atmosMasterGainNode.gain.setTargetAtTime(0.0, now, 0.04);
      }
      return;
    }

    if (this.dryGainNode) {
      this.dryGainNode.gain.value = 0.0;
      this.dryGainNode.gain.setTargetAtTime(0.0, now, 0.04);
    }
    if (this.atmosMasterGainNode) {
      this.atmosMasterGainNode.gain.value = 1.12;
      this.atmosMasterGainNode.gain.setTargetAtTime(1.12, now, 0.04);
    }

    if (preset === 'theater') {
      if (this.subBassFilter) this.subBassFilter.gain.value = 4.8;
      if (this.presenceFilter) this.presenceFilter.gain.value = 3.2;
      if (this.airShelfFilter) this.airShelfFilter.gain.value = 4.2;
      if (this.widenerGainNode) this.widenerGainNode.gain.value = 0.52;
      if (this.reverbWetGain) this.reverbWetGain.gain.value = 0.24;
    } else if (preset === 'binaural') {
      if (this.subBassFilter) this.subBassFilter.gain.value = 3.6;
      if (this.presenceFilter) this.presenceFilter.gain.value = 4.0;
      if (this.airShelfFilter) this.airShelfFilter.gain.value = 4.8;
      if (this.widenerGainNode) this.widenerGainNode.gain.value = 0.65;
      if (this.reverbWetGain) this.reverbWetGain.gain.value = 0.18;
    } else {
      if (this.subBassFilter) this.subBassFilter.gain.value = 2.6;
      if (this.presenceFilter) this.presenceFilter.gain.value = 2.4;
      if (this.airShelfFilter) this.airShelfFilter.gain.value = 3.2;
      if (this.widenerGainNode) this.widenerGainNode.gain.value = 0.35;
      if (this.reverbWetGain) this.reverbWetGain.gain.value = 0.12;
    }

    if (this.reverbConvolver && this.audioCtx) {
      try {
        this.reverbConvolver.buffer = this.createImpulseResponse(this.audioCtx, preset);
      } catch {
        // ignore
      }
    }
  }

  public setDolbyAtmos(
    enabled: boolean,
    preset: 'theater' | 'studio' | 'binaural' = this.state.dolbyAtmosPreset
  ) {
    if (enabled) {
      this.ensureDolbyAtmosGraph();
    }
    saveMusicSettings({ dolbyAtmosEnabled: enabled, dolbyAtmosPreset: preset });
    this.updateState({ dolbyAtmosEnabled: enabled, dolbyAtmosPreset: preset });
    this.applyDolbyAtmosParameters(enabled, preset);
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

    // Stage 1: Server Full-Length Stream Proxy (/api/music/play)
    try {
      this.audio.src = resolvedUrl;
      this.playPromise = this.audio.play();
      await this.playPromise;
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
    } catch (err: unknown) {
      this.playPromise = null;
      if ((err as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
        return;
      }
      console.warn('Stage 1 (/api/music/play) retrying via server /api/music/info:', (err as Error)?.message);
    }

    // Stage 2: Resolve via Server /api/music/info and stream through server proxy
    if (this.pendingTrack === track) {
      try {
        const directStream = await resolveFullLengthAudioStream(track.title, cleanArtist, numericId);
        const targetSrc = directStream?.proxyAudioUrl
          ? resolveBackendUrl(directStream.proxyAudioUrl)
          : directStream?.audioUrl;
        if (targetSrc && this.pendingTrack === track) {
          this.audio.src = targetSrc;
          this.playPromise = this.audio.play();
          await this.playPromise;
          this.playPromise = null;
          this.updateState({
            isPlaying: true,
            isBuffering: false,
            error: null,
            statusMessage: `フル尺再生中 (Server Direct Stream): ${track.title} — ${cleanArtist}`,
          });
          return;
        }
      } catch (err2: unknown) {
        this.playPromise = null;
        if ((err2 as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
          return;
        }
      }
    }

    // Stage 3: Client-side Standalone Direct Stream (for static hosts like jsDelivr / GitHub Pages / Mobile)
    if (this.pendingTrack === track) {
      try {
        let clientAudioUrl: string | null = null;
        if (track.sourceUrl && track.sourceUrl.startsWith('http')) {
          clientAudioUrl = track.sourceUrl;
        } else if (numericId) {
          const gdRes = await fetch(
            `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${encodeURIComponent(numericId)}&br=${brVal}`,
            { signal: AbortSignal.timeout(5500) }
          );
          if (gdRes.ok) {
            const gdData = (await gdRes.json()) as { url?: string };
            if (gdData?.url && gdData.url.startsWith('http')) {
              clientAudioUrl = gdData.url.replace(/^http:\/\//i, 'https://');
            }
          }
        }

        if (!clientAudioUrl) {
          const query = `${track.title} ${cleanArtist}`.trim();
          const sRes = await fetch(
            `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(query)}&count=5`,
            { signal: AbortSignal.timeout(5500) }
          );
          if (sRes.ok) {
            const list = (await sRes.json()) as Array<{ id?: string | number; url_id?: string | number }>;
            if (Array.isArray(list) && list.length > 0) {
              const matchedId = String(list[0].url_id || list[0].id || '');
              if (matchedId) {
                const gdRes2 = await fetch(
                  `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${encodeURIComponent(matchedId)}&br=${brVal}`,
                  { signal: AbortSignal.timeout(5500) }
                );
                if (gdRes2.ok) {
                  const gdData2 = (await gdRes2.json()) as { url?: string };
                  if (gdData2?.url && gdData2.url.startsWith('http')) {
                    clientAudioUrl = gdData2.url.replace(/^http:\/\//i, 'https://');
                  }
                }
              }
            }
          }
        }

        if (clientAudioUrl && this.pendingTrack === track) {
          this.audio.src = clientAudioUrl;
          this.playPromise = this.audio.play();
          await this.playPromise;
          this.playPromise = null;
          this.updateState({
            isPlaying: true,
            isBuffering: false,
            error: null,
            statusMessage: `フル尺再生中 (jsDelivr Direct 320kbps): ${track.title} — ${cleanArtist}`,
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

