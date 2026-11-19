import { SFX_META, type SfxId } from './sfxTypes';

type DuckCallback = (ducked: boolean) => void;

// Load all audio files placed in src/assets/sfx/*.{mp3,ogg,wav} at build time (zero 404 requests)
const CUSTOM_SFX_MODULES = import.meta.glob('../assets/sfx/*.{mp3,ogg,wav}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const AVAILABLE_SFX_FILES: Record<string, string> = {};
for (const [path, url] of Object.entries(CUSTOM_SFX_MODULES)) {
  const match = path.match(/\/([^/]+)\.(mp3|ogg|wav)$/i);
  if (match) {
    AVAILABLE_SFX_FILES[match[1].toLowerCase()] = url;
  }
}

const SFX_ALIASES: Partial<Record<SfxId, string[]>> = {
  room_join: ['room_join', 'join_room'],
  reveal_hunter: ['reveal_hunter', 'hunter_reveal'],
  reveal_shadow: ['reveal_shadow', 'shadow_reveal'],
  reveal_neutral: ['reveal_neutral', 'neutral_reveal'],
  card_draw_white: ['card_draw_white', 'card_draw'],
  card_draw_black: ['card_draw_black', 'card_draw'],
  card_draw_hermit: ['card_draw_hermit', 'card_draw'],
};

function resolveSfxUrl(id: SfxId): string | undefined {
  const candidates = SFX_ALIASES[id] ?? [id];
  for (const name of candidates) {
    const url = AVAILABLE_SFX_FILES[name];
    if (url) return url;
  }
  return undefined;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private loadingBuffers = new Map<string, Promise<AudioBuffer | null>>();
  private lastPlayedAt = new Map<SfxId, number>();
  private scheduledTimers = new Set<number>();
  private duckCallbacks = new Set<DuckCallback>();
  private duckRestoreTimer: number | null = null;
  private muted = false;
  private unlockBound = false;
  private preloaded = false;

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
        ctx.resume().then(() => {
          this.preloadAllBuffers(ctx);
        }).catch(() => {});
      } else if (ctx && ctx.state === 'running') {
        this.preloadAllBuffers(ctx);
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
    return ctx;
  }

  private preloadAllBuffers(ctx: AudioContext) {
    if (this.preloaded) return;
    this.preloaded = true;
    for (const url of new Set(Object.values(AVAILABLE_SFX_FILES))) {
      void this.loadBuffer(ctx, url);
    }
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

    const url = resolveSfxUrl(id);
    if (!url) return;

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
        ctx.resume()
          .then(() => {
            this.preloadAllBuffers(ctx);
            if (!this.muted) this.dispatchBuffer(ctx, id, url);
          })
          .catch(() => {});
        return;
      }

      this.preloadAllBuffers(ctx);
      this.dispatchBuffer(ctx, id, url);
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

  private dispatchBuffer(ctx: AudioContext, id: SfxId, url: string) {
    const meta = SFX_META[id];
    if (meta.duckBgm) {
      this.triggerDucking();
    }

    const cached = this.bufferCache.get(url);
    if (cached) {
      this.playBuffer(ctx, cached, meta.volume, meta.jitterPitch);
      return;
    }

    void this.loadBuffer(ctx, url).then((buf) => {
      if (buf && !this.muted) {
        this.playBuffer(ctx, buf, meta.volume, meta.jitterPitch);
      }
    });
  }

  private loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(url);
    if (cached) return Promise.resolve(cached);

    const existing = this.loadingBuffers.get(url);
    if (existing) return existing;

    const promise = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((arr) => (arr ? ctx.decodeAudioData(arr) : null))
      .then((buf) => {
        if (buf) this.bufferCache.set(url, buf);
        this.loadingBuffers.delete(url);
        return buf;
      })
      .catch(() => {
        this.loadingBuffers.delete(url);
        return null;
      });

    this.loadingBuffers.set(url, promise);
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
}

export const soundManager = new SoundManager();
