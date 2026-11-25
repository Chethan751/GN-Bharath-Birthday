import { Howl, Howler } from 'howler';

const DEFAULT_AUDIO_SRC = '/audio/happy-birthday.wav';

class AudioService {
  private bgHowl: Howl | null = null;
  private sfxCtx: AudioContext | null = null;
  private isPlayingState = false;
  private volumeState = 0.65;
  private isMutedState = false;
  private isDucked = false;
  private customSrc: string | null = null;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (Howler.ctx) return Howler.ctx;
    if (!this.sfxCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        this.sfxCtx = new Ctx();
      }
    }
    return this.sfxCtx;
  }

  private getSfxGain(): number {
    if (this.isMutedState || this.volumeState <= 0) return 0;
    return Math.min(0.45, this.volumeState * 0.55);
  }

  setCustomSource(url: string | null) {
    if (!url || url === this.customSrc) return;
    this.customSrc = url;
    if (this.bgHowl) {
      const wasPlaying = this.isPlayingState;
      this.bgHowl.unload();
      this.bgHowl = null;
      if (wasPlaying) {
        this.playBackgroundMusic();
      }
    }
  }

  private ensureHowl(): Howl {
    if (!this.bgHowl) {
      const sources = this.customSrc ? [this.customSrc, DEFAULT_AUDIO_SRC] : [DEFAULT_AUDIO_SRC];
      this.bgHowl = new Howl({
        src: sources,
        loop: true,
        volume: this.isMutedState ? 0 : this.getEffectiveVolume(),
        html5: false,
        onplay: () => {
          this.isPlayingState = true;
          this.notify();
        },
        onpause: () => {
          this.isPlayingState = false;
          this.notify();
        },
        onstop: () => {
          this.isPlayingState = false;
          this.notify();
        },
        onloaderror: (_id, err) => {
          console.warn('Howler audio load warning:', err);
        },
      });
    }
    return this.bgHowl;
  }

  private getEffectiveVolume(): number {
    return this.isDucked ? Math.min(0.14, this.volumeState * 0.22) : this.volumeState;
  }

  /**
   * CRITICAL BROWSER AUTOPLAY FIX:
   * Invoked synchronously inside the "Unlock" button click handler.
   */
  unlockAndPlay(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
      }
    } catch {
      // ignore AudioContext resume errors
    }
    this.playBackgroundMusic();
    this.playFireworkBoom(1.1);
    window.setTimeout(() => this.playCrackerPop(), 160);
  }

  playBackgroundMusic(): void {
    const howl = this.ensureHowl();
    if (!howl.playing()) {
      howl.volume(0);
      howl.play();
      howl.fade(0, this.isMutedState ? 0 : this.getEffectiveVolume(), 900);
    }
    this.isPlayingState = true;
    this.notify();
  }

  pauseBackgroundMusic(): void {
    if (!this.bgHowl) return;
    this.bgHowl.pause();
    this.isPlayingState = false;
    this.notify();
  }

  togglePlayPause(): void {
    if (this.isPlayingState) {
      this.pauseBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
  }

  setVolume(val: number): void {
    this.volumeState = Math.max(0, Math.min(1, val));
    if (this.volumeState > 0 && this.isMutedState) {
      this.isMutedState = false;
    }
    if (this.bgHowl && !this.isMutedState) {
      this.bgHowl.volume(this.getEffectiveVolume());
    }
    this.notify();
  }

  toggleMute(): void {
    this.isMutedState = !this.isMutedState;
    if (this.bgHowl) {
      this.bgHowl.fade(
        this.bgHowl.volume(),
        this.isMutedState ? 0 : this.getEffectiveVolume(),
        250
      );
    }
    this.notify();
  }

  /** Smoothly lowers background music while a memory video modal is open */
  duckForVideoModal(active: boolean): void {
    this.isDucked = active;
    if (this.bgHowl && !this.isMutedState) {
      this.bgHowl.fade(this.bgHowl.volume(), this.getEffectiveVolume(), 450);
    }
    this.notify();
  }

  /** Swells volume briefly when candles are blown out or finale starts */
  swellCelebration(): void {
    if (!this.bgHowl || this.isMutedState || this.isDucked) return;
    const target = Math.min(1, Math.max(this.volumeState, 0.85));
    this.bgHowl.fade(this.bgHowl.volume(), target, 600);
    window.setTimeout(() => {
      if (this.bgHowl && !this.isMutedState && !this.isDucked) {
        this.bgHowl.fade(this.bgHowl.volume(), this.volumeState, 1800);
      }
    }, 3500);
  }

  /**
   * Synthesizes a realistic firework boom + sparkling crackle tail via Web Audio API.
   * Respects top-right mute & volume settings without external audio files.
   */
  playFireworkBoom(intensity = 1): void {
    const masterLevel = this.getSfxGain() * intensity;
    if (masterLevel <= 0.005) return;

    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;

    // 1. Sub-bass sky boom thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.32);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(masterLevel * 0.6, now + 0.015);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // 2. Filtered explosion air burst
    const bufferLen = Math.floor(ctx.sampleRate * 0.52);
    const noiseBuf = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2100, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.48);

    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(masterLevel * 0.5, now);
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noiseSrc.connect(filter);
    filter.connect(burstGain);
    burstGain.connect(ctx.destination);
    noiseSrc.start(now);

    // 3. Staggered sparkling crackle pops
    for (let k = 0; k < 4; k++) {
      this.scheduleMicroCrackle(ctx, now + 0.08 + k * 0.07 + Math.random() * 0.04, masterLevel * 0.35);
    }
  }

  /**
   * Synthesizes crisp firecracker snap & multi-pop sparkle bursts.
   */
  playCrackerPop(): void {
    const masterLevel = this.getSfxGain();
    if (masterLevel <= 0.005) return;

    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const popCount = 4;
    for (let i = 0; i < popCount; i++) {
      const offset = i * 0.055 + Math.random() * 0.035;
      this.scheduleMicroCrackle(ctx, now + offset, masterLevel * (0.55 - i * 0.08));
    }
  }

  private scheduleMicroCrackle(ctx: AudioContext, startTime: number, level: number): void {
    const len = Math.floor(ctx.sampleRate * 0.048);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400 + Math.random() * 1900, startTime);
    bp.Q.setValueAtTime(1.4, startTime);

    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.01, level), startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.046);

    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(startTime);
  }

  getState() {
    return {
      isPlaying: this.isPlayingState,
      volume: this.volumeState,
      isMuted: this.isMutedState,
      isDucked: this.isDucked,
    };
  }
}

export const audioService = new AudioService();
