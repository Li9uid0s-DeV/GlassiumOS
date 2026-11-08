export interface MusicPlayerState {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  coverGradient?: string;
  currentTime?: number;
  duration?: number;
  volume?: number;
  lyricLine?: string;
  palette?: { c1: string; c2: string; c3: string; c4: string };
  currentTrack?: {
    title: string;
    artist: string;
    cover?: string;
  } | null;
}

let latestMusicState: MusicPlayerState | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('glassium-music-state', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) {
      latestMusicState = {
        ...detail,
        currentTrack: detail.title
          ? {
              title: detail.title,
              artist: detail.artist || 'Unknown Artist',
              cover: detail.artworkUrl,
            }
          : null,
      };
    }
  });
}

export function getMusicState(): MusicPlayerState | null {
  return latestMusicState;
}

export function subscribeMusicState(
  callback: (state: MusicPlayerState | null) => void
): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) {
      latestMusicState = {
        ...detail,
        currentTrack: detail.title
          ? {
              title: detail.title,
              artist: detail.artist || 'Unknown Artist',
              cover: detail.artworkUrl,
            }
          : null,
      };
      callback(latestMusicState);
    }
  };
  window.addEventListener('glassium-music-state', handler);
  return () => window.removeEventListener('glassium-music-state', handler);
}

export function toggleMusicPlay(): void {
  window.dispatchEvent(
    new CustomEvent('glassium-music-command', {
      detail: { action: 'toggle-play' },
    })
  );
}

export function nextMusicTrack(): void {
  window.dispatchEvent(
    new CustomEvent('glassium-music-command', {
      detail: { action: 'next' },
    })
  );
}

export function prevMusicTrack(): void {
  window.dispatchEvent(
    new CustomEvent('glassium-music-command', {
      detail: { action: 'prev' },
    })
  );
}

export function setMusicVolume(volume0to1: number): void {
  const clamped = Math.max(0, Math.min(1, volume0to1));
  if (latestMusicState) {
    latestMusicState = { ...latestMusicState, volume: clamped };
  }
  window.dispatchEvent(
    new CustomEvent('glassium-music-command', {
      detail: { action: 'set-volume', volume: clamped },
    })
  );
}

export function seekMusicTrack(timeSecs: number): void {
  window.dispatchEvent(
    new CustomEvent('glassium-music-command', {
      detail: { action: 'seek', time: timeSecs },
    })
  );
}

