/**
 * Stylish UI Sound Generator (Web Audio API)
 * Generates subtle, elegant, low-latency acoustic & glassy UI feedback
 * without harsh square waves or abrasive clicks.
 */

class SoundService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Tactile micro-haptic click: high-frequency gentle tap (whisper level)
   */
  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2800, t);
      osc.frequency.exponentialRampToValueAtTime(1400, t + 0.012);

      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.012);
    } catch {
      // Audio block catch
    }
  }

  /**
   * Elegant glass chime: dual-harmonic resonant sine on window launch
   */
  playOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t);
      osc1.frequency.exponentialRampToValueAtTime(1320, t + 0.08);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, t);
      osc2.frequency.exponentialRampToValueAtTime(2200, t + 0.09);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.16);
      osc2.stop(t + 0.16);
    } catch {
      // Audio block catch
    }
  }

  /**
   * Tactile deep acoustic lock: smooth dampened sub-bass transient
   */
  playLock() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // Audio block catch
    }
  }

  /**
   * Glass shimmer notification: two-tone soft ambient chord
   */
  playNotify() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const chord = [587.33, 880, 1174.66]; // D5, A5, D6
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      gain.connect(ctx.destination);

      chord.forEach((freq, idx) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.025);
        osc.connect(gain);
        osc.start(t + idx * 0.025);
        osc.stop(t + 0.28);
      });
    } catch {
      // Audio block catch
    }
  }
}

export const soundService = new SoundService();
