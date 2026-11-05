// -------------------------------------------------------------------------
// GlassiumOS 5 Global Audio Manager & MediaSession API Controller
// Ensures a SINGLE HTMLAudioElement instance exists across the entire OS.
// -------------------------------------------------------------------------

import { MonochromeTrack } from './proxyService';

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
}

type AudioListener = (state: GlobalAudioState) => void;

class GlobalAudioManager {
  private static instance: GlobalAudioManager | null = null;
  private audio: HTMLAudioElement;
  private listeners: Set<AudioListener> = new Set();
  private state: GlobalAudioState;
  private playPromise: Promise<void> | null = null;
  private pendingTrack: MonochromeTrack | null = null;

  private constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.state = {
      isPlaying: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      playbackRate: 1.0,
      track: null,
      statusMessage: 'Ready',
      error: null,
    };

    this.setupAudioListeners();
    this.setupMediaSession();
  }

  public static getInstance(): GlobalAudioManager {
    if (!GlobalAudioManager.instance) {
      GlobalAudioManager.instance = new GlobalAudioManager();
    }
    return GlobalAudioManager.instance;
  }

  private setupAudioListeners() {
    const a = this.audio;

    a.addEventListener('loadstart', () => {
      this.updateState({ isBuffering: true, error: null });
    });

    a.addEventListener('canplay', () => {
      this.updateState({ isBuffering: false });
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
          duration: Number.isFinite(a.duration) && a.duration > 0 ? a.duration : (this.state.track?.duration || 0),
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
      // Suppress minor abort errors during rapid track switching
      if (a.error && a.error.code !== MediaError.MEDIA_ERR_ABORTED) {
        this.updateState({
          isPlaying: false,
          isBuffering: false,
          error: `Audio playback error (code ${a.error.code})`,
          statusMessage: 'Playback failed. Trying alternative stream...',
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
      const dur = Number.isFinite(this.audio.duration) && this.audio.duration > 0
        ? this.audio.duration
        : (this.state.track?.duration || 0);
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

    // Broadcast OS state event for Desktop Now Playing pill
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('glassium-music-state', {
          detail: {
            isPlaying: this.state.isPlaying,
            title: this.state.track?.title,
            artist: this.state.track?.artist,
            album: this.state.track?.album,
            artworkUrl: this.state.track?.artworkUrl || '',
            coverGradient: this.state.track?.coverGradient,
            currentTime: this.state.currentTime,
            duration: this.state.duration || this.state.track?.duration || 0,
            lyricLine: '',
          },
        })
      );
    }
  }

  public async playTrack(track: MonochromeTrack, startAtSec = 0): Promise<void> {
    this.pendingTrack = track;

    // Safely interrupt ongoing playback promise
    if (this.playPromise) {
      try {
        await this.playPromise;
      } catch {
        // ignore interrupted play
      }
    }

    // Check if target track changed
    if (this.pendingTrack !== track) return;

    // Build streaming proxy URL
    const resolvedUrl =
      track.audioUrl && !track.audioUrl.includes('saavncdn.com') && !track.audioUrl.includes('itunes.apple.com')
        ? track.audioUrl
        : `/api/music/play?id=${encodeURIComponent(track.monoTrackId || track.id)}&title=${encodeURIComponent(
            track.title
          )}&artist=${encodeURIComponent(track.artist)}`;

    this.audio.pause();
    this.audio.src = resolvedUrl;
    this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
    this.audio.playbackRate = this.state.playbackRate;

    this.updateState({
      track,
      currentTime: startAtSec,
      duration: track.duration,
      isBuffering: true,
      error: null,
      statusMessage: `Playing: ${track.title} — ${track.artist}`,
    });

    this.syncMediaSessionMetadata(track);

    try {
      this.audio.currentTime = startAtSec;
      this.playPromise = this.audio.play();
      await this.playPromise;
      this.playPromise = null;
      this.updateState({ isPlaying: true, isBuffering: false });
    } catch (err: unknown) {
      this.playPromise = null;
      const errorMsg = (err as Error)?.message || 'Playback blocked or failed';
      console.warn('GlobalAudio play failed:', errorMsg);

      // Attempt retry with proxy=1 flag if initial call failed
      if (resolvedUrl.includes('/api/music/play') && !resolvedUrl.includes('proxy=1')) {
        try {
          this.audio.src = `${resolvedUrl}&proxy=1`;
          this.audio.currentTime = startAtSec;
          this.playPromise = this.audio.play();
          await this.playPromise;
          this.playPromise = null;
          this.updateState({ isPlaying: true, isBuffering: false });
          return;
        } catch {
          // fallback failed
        }
      }

      this.updateState({
        isPlaying: false,
        isBuffering: false,
        error: errorMsg,
        statusMessage: `Playback issue: Click play to start`,
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
    if (this.playPromise) {
      this.playPromise
        .then(() => {
          this.audio.pause();
          this.updateState({ isPlaying: false });
        })
        .catch(() => {
          this.audio.pause();
          this.updateState({ isPlaying: false });
        });
    } else {
      this.audio.pause();
      this.updateState({ isPlaying: false });
    }
  }

  public async resume(): Promise<void> {
    if (!this.state.track) return;
    try {
      this.playPromise = this.audio.play();
      await this.playPromise;
      this.playPromise = null;
      this.updateState({ isPlaying: true });
    } catch (err) {
      this.playPromise = null;
      console.warn('Resume failed:', err);
      this.updateState({ isPlaying: false });
    }
  }

  public seek(seconds: number): void {
    const dur = Number.isFinite(this.audio.duration) && this.audio.duration > 0
      ? this.audio.duration
      : (this.state.track?.duration || 0);
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
