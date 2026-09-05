/**
 * Sound effects for "100 к 1" using Web Audio API.
 * Ported directly from the original HTML game.
 */

let ac: AudioContext | null = null;

function getAC(): AudioContext {
  if (!ac) ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function snd(f1: number, f2: number, d: number, v: number) {
  const ctx = getAC();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(f1, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + d * 0.4);
  g.gain.setValueAtTime(v, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
  o.start();
  o.stop(ctx.currentTime + d);
}

export function sndReveal() { snd(600, 1200, 0.4, 0.2); }
export function sndClose() { snd(800, 400, 0.3, 0.15); }
export function sndAssign() { snd(900, 1100, 0.2, 0.12); setTimeout(() => snd(1200, 1400, 0.2, 0.12), 80); }
export function sndBuzz() { snd(200, 100, 0.5, 0.3); }
export function sndWin() { [0, 0.12, 0.24].forEach((d, i) => snd(800 + i * 200, 1000 + i * 200, 0.3, 0.15)); }
export function sndTick() { snd(1000, 1000, 0.05, 0.08); }
export function sndDup() { snd(300, 150, 0.3, 0.25); }

export function warmup() {
  try {
    const ctx = getAC();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  } catch { /* ignore */ }
}
