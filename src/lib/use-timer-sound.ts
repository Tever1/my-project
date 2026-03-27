import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook that produces a ticking sound that accelerates as time runs out.
 * Uses the Web Audio API — no external files needed.
 */
export function useTimerSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const getCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  const playTick = useCallback((urgent: boolean) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Higher pitch when urgent
      osc.frequency.value = urgent ? 880 : 660;
      osc.type = 'sine';

      gain.gain.setValueAtTime(urgent ? 0.15 : 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio not available
    }
  }, []);

  /**
   * Call this every render/effect with the current timeLeft and total time.
   * It will schedule ticks that get faster as time decreases.
   */
  const tick = useCallback((timeLeft: number, totalTime: number) => {
    if (timeLeft <= 0 || timeLeft > totalTime) {
      return;
    }

    // Only tick in the last 10 seconds
    if (timeLeft > 10) return;

    const urgent = timeLeft <= 5;
    playTick(urgent);
  }, [playTick]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [stop]);

  return { tick, stop };
}
