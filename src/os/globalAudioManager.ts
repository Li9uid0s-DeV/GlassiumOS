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

    const cleanArtist = (track.artist || '')
      .replace(/\s*(?:作曲|作詞|編曲|feat\.|ft\.|with|prod\.).*$/i, '')
      .split(/[,、/]/)[0]
      .trim() || track.artist;

    // Build streaming proxy URL
    const resolvedUrl =
      track.audioUrl &&
      !track.audioUrl.includes('saavncdn.com') &&
      !track.audioUrl.includes('itunes.apple.com')
        ? track.audioUrl
        : `/api/music/play?id=${encodeURIComponent(
            track.monoTrackId || track.id
          )}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(cleanArtist)}`;

    // Synchronously set src and trigger play() within the user gesture tick
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
      statusMessage: `再生中: ${track.title} — ${cleanArtist}`,
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
          statusMessage: `再生中: ${track.title} — ${cleanArtist}`,
        });
      }
      return;
    } catch (err: unknown) {
      this.playPromise = null;
      // Ignore AbortError caused by rapid track switching
      if ((err as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
        return;
      }
      console.warn('Primary stream play retry:', (err as Error)?.message);
    }

    // Automatic Fallback 1: Retry via /api/music/play with cache-busting fallback flag
    if (this.pendingTrack === track) {
      try {
        const retryUrl = `/api/music/play?title=${encodeURIComponent(
          track.title
        )}&artist=${encodeURIComponent(cleanArtist)}&fallback=1&t=${Date.now()}`;
        this.audio.src = retryUrl;
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
      } catch (err2: unknown) {
        this.playPromise = null;
        if ((err2 as Error)?.name === 'AbortError' || this.pendingTrack !== track) {
          return;
        }
      }
    }

    // Automatic Fallback 2: Direct client-side iTunes JP/US AAC stream resolution
    if (this.pendingTrack === track) {
      try {
        const q = `${track.title} ${cleanArtist}`.trim();
        const itRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=JP&entity=song&limit=3`
        );
        if (itRes.ok) {
          const itData = (await itRes.json()) as { results?: Array<{ previewUrl?: string }> };
          const directPreview = itData?.results?.find((r) => r.previewUrl)?.previewUrl;
          if (directPreview && this.pendingTrack === track) {
            this.audio.src = directPreview;
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
        }
      } catch {
        // ignore
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
