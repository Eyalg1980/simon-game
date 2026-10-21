import type { ColorId } from '../game/colors.ts';

// All sounds are synthesized locally with the Web Audio API (no audio files, works offline).

/** A distinct pitch for each color */
export const TONE_FREQUENCIES: Record<ColorId, number> = {
  green: 415,
  red: 310,
  yellow: 252,
  blue: 209,
};

const UNLOCK_TIMEOUT_MS = 1500;
// Short envelope to avoid clicks
const ATTACK_S = 0.015;
const RELEASE_S = 0.03;
const TONE_GAIN = 0.3;

type Voice = { osc: OscillatorNode; gain: GainNode };
type Note = { freq: number; start: number; duration: number };

const WIN_MOTIF: Note[] = [
  { freq: 523.25, start: 0, duration: 0.14 },
  { freq: 659.25, start: 0.15, duration: 0.14 },
  { freq: 783.99, start: 0.3, duration: 0.14 },
  { freq: 1046.5, start: 0.45, duration: 0.35 },
];

const LOSS_MOTIF: Note[] = [
  { freq: 220, start: 0, duration: 0.22 },
  { freq: 185, start: 0.24, duration: 0.22 },
  { freq: 147, start: 0.48, duration: 0.4 },
];

let ctx: AudioContext | null = null;
const voices = new Set<Voice>();

function getAudioContextClass(): typeof AudioContext | undefined {
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext;
}

function isRunning(c: AudioContext | null): c is AudioContext {
  return c !== null && c.state === 'running';
}

// A silent one-sample buffer helps iOS unlock audio inside the gesture.
function playSilence(c: AudioContext) {
  const buffer = c.createBuffer(1, 1, c.sampleRate);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(c.destination);
  source.start();
}

/**
 * Creates or resumes the AudioContext. Must be called synchronously inside a user gesture
 * ("התחל משחק"). Resolves true only if audio is actually running (ADR-11).
 */
export async function unlockAudio(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) return false;
    if (!ctx || ctx.state === 'closed') ctx = new AudioContextClass();
    const resumed = ctx.state === 'running' ? Promise.resolve() : ctx.resume();
    playSilence(ctx);
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, UNLOCK_TIMEOUT_MS);
    });
    await Promise.race([resumed, timeout]);
    return isRunning(ctx);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function createVoice(c: AudioContext, freq: number, type: OscillatorType, startAt: number): Voice {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  osc.connect(gain).connect(c.destination);
  osc.start(startAt);
  const voice = { osc, gain };
  voices.add(voice);
  osc.onended = () => {
    voices.delete(voice);
    gain.disconnect();
  };
  return voice;
}

function releaseVoice(voice: Voice) {
  if (!ctx) return;
  const now = ctx.currentTime;
  const param = voice.gain.gain;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(0, now + RELEASE_S);
  try {
    voice.osc.stop(now + RELEASE_S + 0.01);
  } catch {
    // Already stopped
  }
  voices.delete(voice);
}

/** Starts a color tone and returns a function that stops it. */
export function startTone(color: ColorId): () => void {
  if (!isRunning(ctx)) return () => {};
  const now = ctx.currentTime;
  const voice = createVoice(ctx, TONE_FREQUENCIES[color], 'triangle', now);
  voice.gain.gain.linearRampToValueAtTime(TONE_GAIN, now + ATTACK_S);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    releaseVoice(voice);
  };
}

function playMotif(notes: Note[], type: OscillatorType, peak: number) {
  if (!isRunning(ctx)) return;
  const now = ctx.currentTime;
  for (const note of notes) {
    const startAt = now + note.start;
    const endAt = startAt + note.duration;
    const voice = createVoice(ctx, note.freq, type, startAt);
    const param = voice.gain.gain;
    param.linearRampToValueAtTime(peak, startAt + ATTACK_S);
    param.setValueAtTime(peak, endAt);
    param.linearRampToValueAtTime(0, endAt + RELEASE_S);
    voice.osc.stop(endAt + RELEASE_S + 0.01);
  }
}

export function playWin() {
  playMotif(WIN_MOTIF, 'triangle', TONE_GAIN);
}

export function playLoss() {
  playMotif(LOSS_MOTIF, 'square', 0.12);
}

/** Immediately silences every playing or scheduled sound. */
export function stopAll() {
  for (const voice of [...voices]) releaseVoice(voice);
}
