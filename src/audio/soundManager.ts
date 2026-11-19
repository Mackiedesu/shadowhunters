import { SFX_META, type SfxId } from './sfxTypes';

type DuckCallback = (ducked: boolean) => void;

// Any real audio file placed at src/assets/sfx/<id>.mp3|ogg|wav automatically overrides synth fallback
const CUSTOM_SFX_MODULES = import.meta.glob('../assets/sfx/*.{mp3,ogg,wav}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const CUSTOM_SFX_URLS: Partial<Record<SfxId, string>> = {};
for (const [path, url] of Object.entries(CUSTOM_SFX_MODULES)) {
  const match = path.match(/\/([^/]+)\.(mp3|ogg|wav)$/i);
  if (match) {
    CUSTOM_SFX_URLS[match[1] as SfxId] = url;
  }
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private bufferCache = new Map<SfxId, AudioBuffer>();
  private loadingBuffers = new Map<SfxId, Promise<AudioBuffer | null>>();
  private lastPlayedAt = new Map<SfxId, number>();
  private scheduledTimers = new Set<number>();
  private duckCallbacks = new Set<DuckCallback>();
  private duckRestoreTimer: number | null = null;
  private muted = false;
  private unlockBound = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('sh_sfx_muted') === 'true';
      this.bindUnlockListeners();
    }
  }

  private bindUnlockListeners() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      const ctx = this.ensureContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (ctx && ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(6, ctx.currentTime);
    compressor.attack.setValueAtTime(0.004, ctx.currentTime);
    compressor.release.setValueAtTime(0.15, ctx.currentTime);

    const master = ctx.createGain();
    master.gain.setValueAtTime(this.muted ? 0 : 0.9, ctx.currentTime);
    master.connect(compressor);
    compressor.connect(ctx.destination);

    this.ctx = ctx;
    this.masterGain = master;
    this.noiseBuffer = this.createNoiseBuffer(ctx, 1.5);
    return ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sh_sfx_muted', String(muted));
    }
    if (muted) {
      for (const timerId of this.scheduledTimers) {
        window.clearTimeout(timerId);
      }
      this.scheduledTimers.clear();
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.02);
    }
  }

  public registerBgmDucking(cb: DuckCallback): () => void {
    this.duckCallbacks.add(cb);
    return () => {
      this.duckCallbacks.delete(cb);
    };
  }

  private triggerDucking() {
    if (this.duckCallbacks.size === 0 || typeof window === 'undefined') return;
    for (const cb of this.duckCallbacks) cb(true);
    if (this.duckRestoreTimer !== null) {
      window.clearTimeout(this.duckRestoreTimer);
    }
    this.duckRestoreTimer = window.setTimeout(() => {
      this.duckRestoreTimer = null;
      for (const cb of this.duckCallbacks) cb(false);
    }, 1150);
  }

  public play(id: SfxId, delayMs = 0) {
    if (this.muted || typeof window === 'undefined') return;

    const run = () => {
      if (this.muted) return;
      const meta = SFX_META[id];
      const nowMs = performance.now();
      const prevMs = this.lastPlayedAt.get(id) ?? 0;
      if (nowMs - prevMs < meta.cooldownMs) return;
      this.lastPlayedAt.set(id, nowMs);

      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;

      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (!this.muted) this.dispatchSound(ctx, id);
        }).catch(() => {});
        return;
      }

      this.dispatchSound(ctx, id);
    };

    if (delayMs > 0) {
      const timerId = window.setTimeout(() => {
        this.scheduledTimers.delete(timerId);
        run();
      }, delayMs);
      this.scheduledTimers.add(timerId);
    } else {
      run();
    }
  }

  private dispatchSound(ctx: AudioContext, id: SfxId) {
    const meta = SFX_META[id];
    if (meta.duckBgm) {
      this.triggerDucking();
    }

    const customUrl = CUSTOM_SFX_URLS[id];
    if (customUrl) {
      const cached = this.bufferCache.get(id);
      if (cached) {
        this.playBuffer(ctx, cached, meta.volume, meta.jitterPitch);
        return;
      }
      this.loadCustomBuffer(ctx, id, customUrl).then((buf) => {
        if (buf && !this.muted) {
          this.playBuffer(ctx, buf, meta.volume, meta.jitterPitch);
        } else if (!this.muted) {
          this.playSynth(ctx, id, meta.volume, meta.jitterPitch);
        }
      });
      return;
    }

    this.playSynth(ctx, id, meta.volume, meta.jitterPitch);
  }

  private loadCustomBuffer(ctx: AudioContext, id: SfxId, url: string): Promise<AudioBuffer | null> {
    const existing = this.loadingBuffers.get(id);
    if (existing) return existing;

    const promise = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((arr) => (arr ? ctx.decodeAudioData(arr) : null))
      .then((buf) => {
        if (buf) this.bufferCache.set(id, buf);
        this.loadingBuffers.delete(id);
        return buf;
      })
      .catch(() => {
        this.loadingBuffers.delete(id);
        return null;
      });

    this.loadingBuffers.set(id, promise);
    return promise;
  }

  private playBuffer(
    ctx: AudioContext,
    buffer: AudioBuffer,
    volume: number,
    jitterPitch?: boolean
  ) {
    if (!this.masterGain) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    if (jitterPitch) {
      src.playbackRate.value = 0.96 + Math.random() * 0.08;
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start();
  }

  private pitchFactor(jitter?: boolean): number {
    return jitter ? 0.96 + Math.random() * 0.08 : 1;
  }

  private tone(
    ctx: AudioContext,
    startTime: number,
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    attack = 0.008
  ) {
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), startTime);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private noise(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    q: number,
    volume: number
  ) {
    if (!this.masterGain || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(Math.max(40, freqStart), startTime);
    if (freqEnd !== freqStart) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), startTime + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }

  private playSynth(ctx: AudioContext, id: SfxId, vol: number, jitterPitch?: boolean) {
    const t = ctx.currentTime;
    const p = this.pitchFactor(jitterPitch);

    switch (id) {
      // Ancient brass/chime doorbell
      case 'room_join': {
        this.tone(ctx, t, 659.25, 659.25, 0.42, 'sine', vol * 0.55, 0.005);
        this.tone(ctx, t, 1318.5, 1318.5, 0.28, 'triangle', vol * 0.2, 0.004);
        this.tone(ctx, t + 0.14, 523.25, 523.25, 0.65, 'sine', vol * 0.6, 0.006);
        this.tone(ctx, t + 0.14, 1046.5, 1046.5, 0.4, 'triangle', vol * 0.22, 0.005);
        break;
      }

      case 'room_leave': {
        this.tone(ctx, t, 210, 95, 0.16, 'triangle', vol * 0.55, 0.004);
        this.noise(ctx, t, 0.08, 'lowpass', 600, 200, 1.2, vol * 0.25);
        break;
      }

      case 'game_start': {
        // War drum + low gothic horn chord
        this.tone(ctx, t, 110, 44, 0.55, 'sine', vol * 0.85, 0.005);
        this.noise(ctx, t, 0.22, 'lowpass', 480, 120, 1, vol * 0.45);
        this.tone(ctx, t + 0.08, 146.83, 146.83, 1.15, 'sawtooth', vol * 0.22, 0.08);
        this.tone(ctx, t + 0.08, 220, 220, 1.15, 'triangle', vol * 0.28, 0.08);
        this.tone(ctx, t + 0.14, 293.66, 293.66, 1.0, 'sine', vol * 0.3, 0.1);
        break;
      }

      case 'your_turn': {
        // Warm bronze chime (A4 -> E5)
        this.tone(ctx, t, 440, 440, 0.35, 'sine', vol * 0.55, 0.005);
        this.tone(ctx, t + 0.08, 659.25, 659.25, 0.55, 'sine', vol * 0.6, 0.006);
        this.tone(ctx, t + 0.08, 1318.5, 1318.5, 0.3, 'triangle', vol * 0.18, 0.004);
        break;
      }

      case 'turn_timer_tick': {
        this.tone(ctx, t, 1150 * p, 720 * p, 0.032, 'triangle', vol * 0.7, 0.002);
        break;
      }

      case 'victory': {
        const notes = [293.66, 369.99, 440, 587.33];
        notes.forEach((n, idx) => {
          const st = t + idx * 0.11;
          this.tone(ctx, st, n, n, idx === 3 ? 1.3 : 0.45, 'triangle', vol * 0.42, 0.015);
          this.tone(ctx, st, n * 2, n * 2, idx === 3 ? 1.1 : 0.35, 'sine', vol * 0.25, 0.01);
        });
        break;
      }

      case 'defeat': {
        const notes = [293.66, 261.63, 220, 146.83];
        notes.forEach((n, idx) => {
          const st = t + idx * 0.18;
          this.tone(ctx, st, n, n * 0.985, idx === 3 ? 1.35 : 0.45, 'triangle', vol * 0.42, 0.02);
        });
        this.tone(ctx, t + 0.54, 73.42, 72, 1.4, 'sine', vol * 0.5, 0.04);
        break;
      }

      case 'dice_roll': {
        const offsets = [0, 0.048, 0.105, 0.165];
        offsets.forEach((off, i) => {
          const scale = 1 - i * 0.12;
          const base = (560 + Math.random() * 240) * p;
          this.tone(ctx, t + off, base, base * 0.55, 0.038, 'triangle', vol * 0.45 * scale, 0.002);
          this.noise(ctx, t + off, 0.035, 'bandpass', 1400 * p, 800, 2.2, vol * 0.55 * scale);
        });
        break;
      }

      case 'move_area': {
        this.tone(ctx, t, 155 * p, 72 * p, 0.13, 'sine', vol * 0.65, 0.004);
        this.noise(ctx, t, 0.09, 'bandpass', 650 * p, 380, 1.5, vol * 0.3);
        break;
      }

      case 'roll_seven': {
        [783.99, 987.77, 1174.66].forEach((n, i) => {
          this.tone(ctx, t + i * 0.075, n, n, 0.42, 'sine', vol * 0.48, 0.006);
        });
        break;
      }

      case 'teleport': {
        this.noise(ctx, t, 0.36, 'bandpass', 320, 2200, 3.0, vol * 0.55);
        this.tone(ctx, t + 0.04, 420, 1120, 0.3, 'sine', vol * 0.4, 0.03);
        break;
      }

      case 'card_draw_white': {
        this.noise(ctx, t, 0.08, 'bandpass', 2200, 1200, 1.6, vol * 0.45);
        this.tone(ctx, t + 0.04, 523.25, 523.25, 0.35, 'sine', vol * 0.42, 0.008);
        this.tone(ctx, t + 0.09, 659.25, 659.25, 0.4, 'sine', vol * 0.4, 0.008);
        this.tone(ctx, t + 0.14, 783.99, 783.99, 0.48, 'sine', vol * 0.35, 0.008);
        break;
      }

      case 'card_draw_black': {
        this.noise(ctx, t, 0.09, 'bandpass', 1800, 700, 1.5, vol * 0.45);
        this.tone(ctx, t + 0.04, 130.81, 124, 0.48, 'triangle', vol * 0.55, 0.01);
        this.tone(ctx, t + 0.08, 185, 178, 0.45, 'sawtooth', vol * 0.22, 0.015);
        break;
      }

      case 'card_draw_hermit': {
        this.noise(ctx, t, 0.18, 'bandpass', 1750, 1100, 2.0, vol * 0.5);
        this.tone(ctx, t + 0.06, 493.88, 466.16, 0.46, 'sine', vol * 0.4, 0.04);
        break;
      }

      case 'equip_item': {
        this.tone(ctx, t, 1480, 1980, 0.14, 'triangle', vol * 0.38, 0.003);
        this.tone(ctx, t + 0.03, 2450, 2450, 0.24, 'sine', vol * 0.3, 0.004);
        this.noise(ctx, t, 0.07, 'highpass', 2400, 4200, 1.2, vol * 0.28);
        break;
      }

      case 'steal_item': {
        this.noise(ctx, t, 0.13, 'bandpass', 950, 2600, 2.2, vol * 0.45);
        this.tone(ctx, t + 0.08, 1174.66, 1174.66, 0.16, 'sine', vol * 0.4, 0.003);
        this.tone(ctx, t + 0.15, 1567.98, 1567.98, 0.22, 'sine', vol * 0.42, 0.003);
        break;
      }

      case 'dynamite_boom': {
        this.tone(ctx, t, 135, 32, 0.52, 'sine', vol * 0.9, 0.003);
        this.noise(ctx, t, 0.46, 'lowpass', 900, 110, 0.9, vol * 0.75);
        break;
      }

      case 'attack_hit': {
        this.noise(ctx, t, 0.1, 'bandpass', 3200 * p, 900, 1.4, vol * 0.65);
        this.tone(ctx, t + 0.02, 180 * p, 58 * p, 0.16, 'sine', vol * 0.75, 0.003);
        break;
      }

      case 'attack_heavy': {
        this.noise(ctx, t, 0.18, 'bandpass', 3800 * p, 550, 1.2, vol * 0.8);
        this.tone(ctx, t, 230 * p, 40 * p, 0.32, 'sawtooth', vol * 0.45, 0.003);
        this.tone(ctx, t + 0.015, 145 * p, 36 * p, 0.38, 'sine', vol * 0.85, 0.003);
        this.tone(ctx, t + 0.03, 1280 * p, 920 * p, 0.24, 'triangle', vol * 0.25, 0.003);
        break;
      }

      case 'attack_miss': {
        this.noise(ctx, t, 0.15, 'bandpass', 1550 * p, 420 * p, 2.0, vol * 0.55);
        break;
      }

      case 'shield_block': {
        this.tone(ctx, t, 987.77, 987.77, 0.36, 'sine', vol * 0.55, 0.003);
        this.tone(ctx, t + 0.015, 1479.98, 1479.98, 0.32, 'triangle', vol * 0.35, 0.003);
        this.tone(ctx, t + 0.04, 1975.53, 1950, 0.25, 'sine', vol * 0.22, 0.004);
        break;
      }

      case 'heal': {
        [349.23, 440, 523.25, 698.46].forEach((n, i) => {
          this.tone(ctx, t + i * 0.065, n, n, 0.45, 'sine', vol * 0.4, 0.015);
        });
        break;
      }

      case 'counter_attack': {
        this.tone(ctx, t, 125, 78, 0.26, 'sawtooth', vol * 0.45, 0.015);
        this.noise(ctx, t + 0.04, 0.09, 'bandpass', 3000, 950, 1.5, vol * 0.55);
        this.noise(ctx, t + 0.13, 0.1, 'bandpass', 3400, 1100, 1.5, vol * 0.6);
        break;
      }

      case 'reveal_shadow': {
        this.tone(ctx, t, 98, 65.41, 0.8, 'sawtooth', vol * 0.38, 0.03);
        this.tone(ctx, t + 0.02, 73.42, 73.42, 0.85, 'sine', vol * 0.7, 0.02);
        this.tone(ctx, t + 0.05, 155.56, 146.83, 0.75, 'triangle', vol * 0.35, 0.04);
        break;
      }

      case 'reveal_hunter': {
        this.noise(ctx, t, 0.11, 'highpass', 2800, 5200, 1.2, vol * 0.42);
        this.tone(ctx, t + 0.03, 293.66, 293.66, 0.55, 'triangle', vol * 0.45, 0.012);
        this.tone(ctx, t + 0.08, 440, 440, 0.65, 'triangle', vol * 0.48, 0.015);
        break;
      }

      case 'reveal_neutral': {
        [369.99, 523.25, 622.25].forEach((n, i) => {
          this.tone(ctx, t + i * 0.07, n, n, 0.58, 'sine', vol * 0.42, 0.012);
        });
        break;
      }

      case 'special_ability': {
        this.tone(ctx, t, 280, 740, 0.28, 'sine', vol * 0.48, 0.02);
        this.noise(ctx, t, 0.25, 'bandpass', 700, 2600, 2.5, vol * 0.38);
        this.tone(ctx, t + 0.18, 880, 880, 0.32, 'triangle', vol * 0.32, 0.01);
        break;
      }

      case 'player_death': {
        // Cathedral bell toll + heavy drop
        this.tone(ctx, t, 140, 42, 0.42, 'sine', vol * 0.75, 0.004);
        this.tone(ctx, t + 0.05, 196, 194, 1.5, 'sine', vol * 0.65, 0.01);
        this.tone(ctx, t + 0.05, 293.66, 290, 1.15, 'triangle', vol * 0.3, 0.01);
        this.tone(ctx, t + 0.05, 470, 466, 0.75, 'sine', vol * 0.18, 0.008);
        break;
      }

      case 'ui_click': {
        this.tone(ctx, t, 760 * p, 340 * p, 0.028, 'triangle', vol * 0.65, 0.002);
        break;
      }

      case 'ui_card_zoom': {
        this.noise(ctx, t, 0.065, 'bandpass', 2400 * p, 1400 * p, 1.8, vol * 0.65);
        break;
      }
    }
  }
}

export const soundManager = new SoundManager();
