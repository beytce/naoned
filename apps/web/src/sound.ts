import { store } from "./game/store.js";

export type SoundKind = "coin" | "harvest" | "cart" | "stamp" | "bell";

/** On unless the player turned them off in the Profil. */
export function soundEnabled(): boolean {
  return store.get("sound") !== "0";
}

export function setSoundEnabled(on: boolean): void {
  store.set("sound", on ? "1" : "0");
  if (on) sound("coin");
}

let audio: AudioContext | null = null;

/** The context, made at the first sound (always after a gesture: browsers block it before). */
function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audio ??= new Ctx();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

/** One voice: a tone from `from` to `to` Hz, its volume falling to nothing in `ms`. */
function voice(
  ctx: AudioContext,
  at: number,
  type: OscillatorType,
  from: number,
  to: number,
  ms: number,
  gain: number,
): void {
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + ms / 1000);
  vol.gain.setValueAtTime(gain, at);
  vol.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
  osc.connect(vol).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + ms / 1000 + 0.02);
}

/** A short burst of noise, filtered: the wheels and the stamp. */
function thud(ctx: AudioContext, at: number, ms: number, freq: number, gain: number): void {
  const length = Math.floor((ctx.sampleRate * ms) / 1000);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq;
  const vol = ctx.createGain();
  vol.gain.value = gain;
  src.connect(filter).connect(vol).connect(ctx.destination);
  src.start(at);
}

/** A pentatonic scale (C, D, E, G, A, then the octave): any run of steps sounds well. */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1_046.5, 1_174.66, 1_318.51];

/**
 * One short note of the scale, quieter than the other sounds: a good landing in the store. Steps
 * rising one after the other make an arpeggio; a big harvest sounds bigger.
 */
export function chime(step: number): void {
  if (!soundEnabled()) return;
  try {
    const ctx = context();
    if (!ctx) return;
    const f = PENTATONIC[Math.min(step, PENTATONIC.length - 1)] ?? 523.25;
    voice(ctx, ctx.currentTime + 0.01, "sine", f, f * 1.005, 260, 0.05);
  } catch {
    // Never let a sound break the game.
  }
}

/**
 * The game's sounds, all made here (no file to load): a ducat's ring, a harvest's tick, a cart's
 * wheels, a stamp, the notices' bell. Short and quiet; never let one break the game.
 */
export function sound(kind: SoundKind): void {
  if (!soundEnabled()) return;
  try {
    const ctx = context();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    switch (kind) {
      case "coin":
        voice(ctx, t, "triangle", 1_975, 1_960, 90, 0.08);
        voice(ctx, t + 0.07, "triangle", 2_637, 2_600, 220, 0.07);
        break;
      case "harvest":
        voice(ctx, t, "sine", 520, 780, 120, 0.09);
        voice(ctx, t + 0.09, "sine", 780, 1_040, 140, 0.07);
        break;
      case "cart":
        thud(ctx, t, 90, 600, 0.25);
        thud(ctx, t + 0.12, 90, 500, 0.2);
        voice(ctx, t, "sawtooth", 140, 110, 240, 0.02);
        break;
      case "stamp":
        thud(ctx, t, 70, 900, 0.35);
        voice(ctx, t, "sine", 160, 90, 110, 0.12);
        break;
      case "bell":
        voice(ctx, t, "sine", 1_318, 1_310, 280, 0.06);
        voice(ctx, t, "sine", 2_636, 2_630, 180, 0.025);
        break;
    }
  } catch {
    // Never let a sound break the game.
  }
}
