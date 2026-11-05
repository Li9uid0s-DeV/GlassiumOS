// -------------------------------------------------------------------------
// GlassiumOS 5 Global Audio Manager, Dolby Atmos 3D Spatial Engine & MediaSession
// Ensures a SINGLE HTMLAudioElement + Web Audio 3D DSP graph across the OS.
// -------------------------------------------------------------------------

import {
  MonochromeTrack,
  MusicSettingsConfig,
  getMusicSettings,
  saveMusicSettings,
} from './proxyService';

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
}

type AudioListener = (state: GlobalAudioState) => void;

class GlobalAudioManager {
  private static instance: GlobalAudioManager | null = null;
  private audio: HTMLAudioElement;
  private listeners: Set<AudioListener> = new Set();
  private state: GlobalAudioState;
  private playPromise: Promise<void> | null = null;
  private pendingTrack: MonochromeTrack | null = null;

  // Web Audio API Dolby Atmos 3D Spatial Audio Graph
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
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
  private graphConnected = false;

  private constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    const initialSettings = getMusicSettings();

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
      this.applyDolbyAtmosParameters(detail.dolbyAtmosEnabled, detail.dolbyAtmosPreset);
    });
  }

  private createImpulseResponse(
    ctx: AudioContext,
    preset: 'theater' | 'studio' | 'binaural'
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const durationSec = preset === 'theater' ? 1.85 : preset === 'binaural' ? 1.35 : 0.85;
    const decay = preset === 'theater' ? 2.6 : preset === 'binaural' ? 3.2 : 4.2;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Early reflections + diffuse 3D tail
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.pow(1 - i / length, decay);
      // Early spatial reflections in first 45ms
      const earlyBoost = t < 0.045 ? 1.35 * Math.sin(t * 420) : 1.0;
      left[i] = (Math.random() * 2 - 1) * env * earlyBoost;
      right[i] = (Math.random() * 2 - 1) * env * earlyBoost;
    }
    return impulse;
  }

  private ensureDolbyAtmosGraph() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.graphConnected) {
        this.applyDolbyAtmosParameters(this.state.dolbyAtmosEnabled, this.state.dolbyAtmosPreset);
        return;
      }

      const ctx = this.audioCtx;
      this.sourceNode = ctx.createMediaElementSource(this.audio);

      // 1. Direct Bypass Path (used when Dolby Atmos is OFF)
      this.dryGainNode = ctx.createGain();

      // 2. Dolby Atmos 3D Spatial DSP Path
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

      // 3D Haas Stereo Widener
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const delayL = ctx.createDelay(0.05);
      const delayR = ctx.createDelay(0.05);
      delayL.delayTime.value = 0.013; // 13ms Haas spatial offset
      delayR.delayTime.value = 0.017; // 17ms Haas spatial offset

      this.widenerGainNode = ctx.createGain();
      const crossL = ctx.createGain();
      const crossR = ctx.createGain();
      crossL.gain.value = 0.36;
      crossR.gain.value = 0.36;

      // 3D Surround Convolver Reverb
      this.reverbConvolver = ctx.createConvolver();
      this.reverbConvolver.buffer = this.createImpulseResponse(ctx, this.state.dolbyAtmosPreset);
      this.reverbWetGain = ctx.createGain();

      // Master Dolby Dynamics Compressor
      this.compressorNode = ctx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -19;
      this.compressorNode.knee.value = 24;
      this.compressorNode.ratio.value = 3.2;
      this.compressorNode.attack.value = 0.004;
      this.compressorNode.release.value = 0.22;

      this.atmosMasterGainNode = ctx.createGain();
      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.78;

      // Connect Bypass Path
      this.sourceNode.connect(this.dryGainNode);
      this.dryGainNode.connect(this.analyserNode);

      // Connect Dolby Atmos EQ Chain
      this.sourceNode.connect(this.subBassFilter);
      this.subBassFilter.connect(this.presenceFilter);
      this.presenceFilter.connect(this.airShelfFilter);

      // Direct EQ -> Compressor
      this.airShelfFilter.connect(this.compressorNode);

      // Haas 3D Stereo Widener -> Compressor
      this.airShelfFilter.connect(splitter);
      splitter.connect(delayL, 0);
      splitter.connect(delayR, 1);
      delayL.connect(crossL);
      delayR.connect(crossR);
      // Cross-feed delayed L into R and delayed R into L for wide 3D stage
      crossL.connect(merger, 0, 1);
      crossR.connect(merger, 0, 0);
      merger.connect(this.widenerGainNode);
      this.widenerGainNode.connect(this.compressorNode);

      // 3D Surround Convolver Reverb -> Compressor
      this.airShelfFilter.connect(this.reverbConvolver);
      this.reverbConvolver.connect(this.reverbWetGain);
      this.reverbWetGain.connect(this.compressorNode);

      // Compressor -> Atmos Master Gain -> Analyser -> Destination
      this.compressorNode.connect(this.atmosMasterGainNode);
      this.atmosMasterGainNode.connect(this.analyserNode);
      this.analyserNode.connect(ctx.destination);

      this.graphConnected = true;
      this.applyDolbyAtmosParameters(this.state.dolbyAtmosEnabled, this.state.dolbyAtmosPreset);
    } catch (e) {
      console.warn('Dolby Atmos WebAudio init fallback to native output:', e);
    }
  }

  private applyDolbyAtmosParameters(
    enabled: boolean,
    preset: 'theater' | 'studio' | 'binaural'
  ) {
    if (!this.graphConnected || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    if (!enabled) {
      this.dryGainNode?.gain.setTargetAtTime(1.0, now, 0.04);
      this.atmosMasterGainNode?.gain.setTargetAtTime(0.0, now, 0.04);
      return;
    }

    this.dryGainNode?.gain.setTargetAtTime(0.0, now, 0.04);
    this.atmosMasterGainNode?.gain.setTargetAtTime(1.12, now, 0.04);

    if (preset === 'theater') {
      // Wide cinema soundstage with deep sub-bass and lush 3D hall acoustics
      this.subBassFilter?.gain.setTargetAtTime(4.8, now, 0.05);
      this.presenceFilter?.gain.setTargetAtTime(3.2, now, 0.05);
      this.airShelfFilter?.gain.setTargetAtTime(4.2, now, 0.05);
      this.widenerGainNode?.gain.setTargetAtTime(0.52, now, 0.05);
      this.reverbWetGain?.gain.setTargetAtTime(0.26, now, 0.05);
    } else if (preset === 'binaural') {
      // Headphone 360° binaural localization with intimate vocal clarity
      this.subBassFilter?.gain.setTargetAtTime(3.6, now, 0.05);
      this.presenceFilter?.gain.setTargetAtTime(4.0, now, 0.05);
      this.airShelfFilter?.gain.setTargetAtTime(4.8, now, 0.05);
      this.widenerGainNode?.gain.setTargetAtTime(0.65, now, 0.05);
      this.reverbWetGain?.gain.setTargetAtTime(0.2, now, 0.05);
    } else {
      // Studio Reference: Mastering-grade spatial clarity with tight acoustic room
      this.subBassFilter?.gain.setTargetAtTime(2.6, now, 0.05);
      this.presenceFilter?.gain.setTargetAtTime(2.4, now, 0.05);
      this.airShelfFilter?.gain.setTargetAtTime(3.2, now, 0.05);
      this.widenerGainNode?.gain.setTargetAtTime(0.35, now, 0.05);
      this.reverbWetGain?.gain.setTargetAtTime(0.12, now, 0.05);
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
    this.ensureDolbyAtmosGraph();
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
    this.ensureDolbyAtmosGraph();

    const settings = getMusicSettings();
    const brVal =
      settings.streamingQuality === 'lossless'
        ? 999
        : Number(settings.streamingQuality) || 320;

    const cleanArtist =
      (track.artist || '')
        .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
        .split(/[,、/]/)[0]
        .trim() || track.artist;

    const cleanId = String(track.monoTrackId || track.id || '')
      .replace(/^mono-live-gd-/, '')
      .replace(/^mono-gd-/, '')
      .replace(/^mono-live-tf-/, '')
      .replace(/^mono-live-/, '')
      .replace(/^mono-itunes-/, '')
      .trim();
    const numericId = /^\d+$/.test(cleanId) ? cleanId : '';

    // Always route through our multi-source full-length proxy (/api/music/play) with quality & source settings
    const resolvedUrl = `/api/music/play?id=${encodeURIComponent(
      numericId
    )}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
      cleanArtist
    )}&br=${brVal}&source=${encodeURIComponent(settings.sourceSite)}`;

    try {
      this.audio.pause();
    } catch {
      // ignore
    }
    this.audio.src = resolvedUrl;
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
        settings.streamingQuality === 'lossless' ? 'Lossless FLAC' : `${settings.streamingQuality}kbps`
      }${this.state.dolbyAtmosEnabled ? ' · Dolby Atmos' : ''}): ${track.title} — ${cleanArtist}`,
    });

    this.syncMediaSessionMetadata(track);

    try {
      this.playPromise = this.audio.play();
      await this.playPromise;
      this.playPromise = null;
      if (this.pendingTrack === track) {
        this.updateState({
          isPlaying: true,
          isBuffering: false,
          error: null,
          statusMessage: `フル尺再生中: ${track.title} — ${cleanArtist}`,
        });
      }
      return;
    } catch (err: unknown) {
      this.playPromise = null;
      if ((err as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
        return;
      }
      console.warn('Primary full stream retry:', (err as Error)?.message);
    }

    // Automatic Fallback 1: Retry via JioSaavn 320kbps Full-Length Engine
    if (this.pendingTrack === track) {
      try {
        const saavnRetryUrl = `/api/music/play?title=${encodeURIComponent(
          track.title
        )}&artist=${encodeURIComponent(cleanArtist)}&br=${brVal}&source=saavn&t=${Date.now()}`;
        this.audio.src = saavnRetryUrl;
        this.playPromise = this.audio.play();
        await this.playPromise;
        this.playPromise = null;
        this.updateState({
          isPlaying: true,
          isBuffering: false,
          error: null,
          statusMessage: `フル尺再生中 (Saavn 320kbps): ${track.title} — ${cleanArtist}`,
        });
        return;
      } catch (err2: unknown) {
        this.playPromise = null;
        if ((err2 as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
          return;
        }
      }
    }

    // Automatic Fallback 2: Retry via Kuwo Full-Length Engine
    if (this.pendingTrack === track) {
      try {
        const kuwoRetryUrl = `/api/music/play?title=${encodeURIComponent(
          track.title
        )}&artist=${encodeURIComponent(cleanArtist)}&br=${brVal}&source=kuwo&t=${Date.now()}`;
        this.audio.src = kuwoRetryUrl;
        this.playPromise = this.audio.play();
        await this.playPromise;
        this.playPromise = null;
        this.updateState({
          isPlaying: true,
          isBuffering: false,
          error: null,
          statusMessage: `フル尺再生中 (Kuwo Hi-Fi): ${track.title} — ${cleanArtist}`,
        });
        return;
      } catch {
        this.playPromise = null;
      }
    }

    if (this.pendingTrack === track) {
      this.updateState({
        isPlaying: false,
        isBuffering: false,
        error: null,
        statusMessage: `${track.title} — 再生ボタンを押して開始`,
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
    this.ensureDolbyAtmosGraph();
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

