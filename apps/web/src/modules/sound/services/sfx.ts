/**
 * Efeitos sonoros do duelo (Web Audio API). Os arquivos ficam em /public/sfx
 * (licença CC0, ver CREDITS.md) e só são baixados quando um duelo abre.
 */
export type SfxName =
  | 'summon'
  | 'set'
  | 'task'
  | 'reveal'
  | 'glitch'
  | 'attack'
  | 'block'
  | 'hit'
  | 'destroy'
  | 'heal'
  | 'turn'
  | 'tick'
  | 'win'
  | 'lose'
  | 'dice-shake'
  | 'dice-throw';

/** Volume de cada som (os jingles vêm gravados mais baixos; a espada, mais alta). */
const VOLUME: Record<SfxName, number> = {
  summon: 0.7,
  set: 0.7,
  task: 0.55,
  reveal: 0.8,
  glitch: 0.45,
  attack: 0.42,
  block: 0.75,
  hit: 0.8,
  destroy: 0.7,
  heal: 0.55,
  turn: 0.5,
  tick: 0.45,
  win: 1.6,
  lose: 1.6,
  'dice-shake': 0.8,
  'dice-throw': 0.9,
};

/** Som sintetizado de reserva (navegador que não decodifica .ogg): frequência inicial e final. */
const FALLBACK: Record<SfxName, [number, number]> = {
  summon: [520, 780],
  set: [300, 220],
  task: [440, 880],
  reveal: [660, 990],
  glitch: [1200, 300],
  attack: [900, 500],
  block: [260, 260],
  hit: [180, 90],
  destroy: [400, 80],
  heal: [600, 900],
  turn: [880, 880],
  tick: [1500, 1500],
  win: [523, 1046],
  lose: [392, 196],
  'dice-shake': [700, 500],
  'dice-throw': [300, 150],
};

class SfxPlayer {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SfxName, AudioBuffer | null>();
  private loading: Promise<void> | null = null;
  enabled = true;

  private context() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new AudioContext();
      // Navegadores só liberam áudio depois de um gesto do usuário.
      const unlock = () => void this.ctx?.resume();
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
    return this.ctx;
  }

  /** Baixa e decodifica todos os sons (uma vez só). */
  preload() {
    const ctx = this.context();
    if (!ctx || this.loading) return this.loading;
    this.loading = Promise.all(
      (Object.keys(VOLUME) as SfxName[]).map(async (name) => {
        try {
          const data = await fetch(`/sfx/${name}.ogg`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))));
          this.buffers.set(name, await ctx.decodeAudioData(data));
        } catch {
          this.buffers.set(name, null);
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  play(name: SfxName) {
    if (!this.enabled) return;
    const ctx = this.context();
    if (!ctx || ctx.state !== 'running') return;
    const gain = ctx.createGain();
    gain.gain.value = VOLUME[name];
    gain.connect(ctx.destination);
    const buffer = this.buffers.get(name);
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gain);
      src.start();
      return;
    }
    if (buffer === null) this.beep(ctx, gain, name);
  }

  private beep(ctx: AudioContext, gain: GainNode, name: SfxName) {
    const [from, to] = FALLBACK[name];
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.18);
    gain.gain.setValueAtTime(VOLUME[name] * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.24);
  }
}

export const sfx = new SfxPlayer();
