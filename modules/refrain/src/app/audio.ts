import { PENTATONIC, type Instrument, type ScoreNote } from '../rituals';

/**
 * REFRAIN's sound (docs/design/refrain.md §6): synthesized with Web Audio, no samples to download.
 * Never starts on its own; every call comes from a press of "Play". Without Web Audio the playhead
 * still runs, silently, so the same information is always on screen.
 */
type Ctx = AudioContext;
let shared: Ctx | null = null;

export const audioAvailable = () => typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);

function context(): Ctx | null {
  if (!audioAvailable()) return null;
  if (!shared) {
    const C = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
    shared = new C();
  }
  return shared;
}

function voice(ctx: Ctx, out: AudioNode, instrument: Instrument, freq: number, at: number, rich: boolean) {
  const env = ctx.createGain();
  env.connect(out);
  const partial = (type: OscillatorType, mult: number, level: number, decay: number, attack = 0.006) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    o.connect(g).connect(env);
    o.start(at);
    o.stop(at + decay + 0.05);
  };
  if (instrument === 'piano') {
    partial('triangle', 1, 0.32, 1.4);
    partial('sine', 2, 0.08, 0.7);
    if (rich) partial('sine', 3, 0.04, 0.4);
  } else if (instrument === 'marimba') {
    partial('sine', 1, 0.42, 0.55);
    partial('sine', 4, 0.1, 0.12);
    if (rich) partial('sine', 9.2, 0.03, 0.06);
  } else if (instrument === 'strings') {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = rich ? 2400 : 1600;
    lp.connect(env);
    for (const detune of rich ? [-6, 0, 6] : [0]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = detune;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.09, at + 0.09);
      g.gain.setValueAtTime(0.09, at + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
      o.connect(g).connect(lp);
      o.start(at);
      o.stop(at + 1.2);
    }
  } else {
    partial('sine', 1, 0.3, 2.2, 0.003);
    partial('sine', 2.76, 0.12, 1.2, 0.003);
    if (rich) partial('sine', 5.4, 0.05, 0.6, 0.003);
  }
}

export interface PlayOptions {
  bars: number;
  tempo: number;
  rich: boolean;
  volume: number;
  onBeat(bar: number, beat: number): void;
  onEnd(): void;
}

/** Play notes in time; returns a stop function. `silent` is true when there is no Web Audio. */
export function play(notes: readonly ScoreNote[], o: PlayOptions): { stop(): void; silent: boolean } {
  const ctx = context();
  const beat = 60 / o.tempo;
  const timers: number[] = [];
  let master: GainNode | null = null;
  if (ctx) {
    void ctx.resume();
    master = ctx.createGain();
    master.gain.value = o.volume;
    let out: AudioNode = master;
    if (o.rich) {
      // A small room: one feedback delay, felt more than heard.
      const delay = ctx.createDelay();
      const fb = ctx.createGain();
      const wet = ctx.createGain();
      delay.delayTime.value = 0.17;
      fb.gain.value = 0.28;
      wet.gain.value = 0.22;
      master.connect(delay).connect(fb).connect(delay);
      delay.connect(wet).connect(ctx.destination);
    }
    out.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.08;
    for (const n of notes) voice(ctx, master, n.instrument, PENTATONIC[n.pitch % PENTATONIC.length]!, t0 + (n.bar * 7 + n.beat) * beat, o.rich);
    out = master;
  }
  const total = o.bars * 7;
  for (let i = 0; i < total; i++) timers.push(window.setTimeout(() => o.onBeat(Math.floor(i / 7), i % 7), 80 + i * beat * 1000));
  timers.push(window.setTimeout(o.onEnd, 80 + total * beat * 1000));
  return {
    silent: !ctx,
    stop() {
      for (const t of timers) window.clearTimeout(t);
      if (master && ctx) {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
        const m = master;
        window.setTimeout(() => m.disconnect(), 200);
      }
      o.onEnd();
    },
  };
}

/** A single note, for choosing a ritual's sound. */
export function preview(instrument: Instrument, pitch: number): void {
  const ctx = context();
  if (!ctx) return;
  void ctx.resume();
  const g = ctx.createGain();
  g.gain.value = 0.8;
  g.connect(ctx.destination);
  voice(ctx, g, instrument, PENTATONIC[pitch % PENTATONIC.length]!, ctx.currentTime + 0.02, false);
}
