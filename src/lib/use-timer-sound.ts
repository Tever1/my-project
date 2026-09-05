import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook that produces a ticking sound that accelerates as time runs out.
 * Uses the Web Audio API — no external files needed.
 *
 * - Last 10s: ticks once per second
 * - Last 5s: ticks twice per second
 * - Last 3s: ticks four times per second
 */
export function useTimerSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumedRef = useRef(false);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
      resumedRef.current = false;
    }
    return audioCtxRef.current;
  }, []);

  // Must be called from a user gesture (click/touch) to unlock AudioContext
  const warmup = useCallback(() => {
    if (resumedRef.current) return;
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Play a silent buffer to unlock on iOS/Safari
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      resumedRef.current = true;
    } catch {
      // ignore
    }
  }, [getCtx]);

  const playTick = useCallback((frequency: number, volume: number) => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = frequency;
      osc.type = 'sine';

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio not available
    }
  }, [getCtx]);

  const stop = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  /**
   * Call this each time timeLeft changes.
   * Automatically manages sub-second ticks for acceleration.
   */
  const tick = useCallback((timeLeft: number, _totalTime: number) => {
    // Keep the second arg for existing callers; acceleration currently depends on timeLeft only.
    void _totalTime;
    stop();

    if (timeLeft <= 0 || timeLeft > 10) return;

    if (timeLeft <= 3) {
      // 4 ticks per second, high pitch, louder
      playTick(980, 0.18);
      let subTick = 0;
      tickIntervalRef.current = setInterval(() => {
        subTick++;
        if (subTick < 3) playTick(980, 0.18);
      }, 250);
    } else if (timeLeft <= 5) {
      // 2 ticks per second, medium-high pitch
      playTick(880, 0.14);
      tickIntervalRef.current = setInterval(() => {
        playTick(880, 0.14);
      }, 500);
    } else {
      // 1 tick per second, normal pitch
      playTick(660, 0.08);
    }
  }, [playTick, stop]);

  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [stop]);

  return { tick, stop, warmup };
}
