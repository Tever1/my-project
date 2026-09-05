import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook that plays subtle ambient background music during questions.
 * Uses Web Audio API to generate a soft, evolving pad sound.
 * No external audio files required.
 */
export function useBackgroundMusic() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{
    oscillators: OscillatorNode[];
    gainNode: GainNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  } | null>(null);
  const playingRef = useRef(false);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const start = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;

    try {
      const ctx = getCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.5);
      masterGain.connect(ctx.destination);

      // LFO for subtle volume modulation
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.15;
      lfo.type = 'sine';
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(masterGain.gain);
      lfo.start();

      // Soft pad: multiple detuned sine/triangle waves
      const frequencies = [174.61, 220, 261.63, 329.63]; // F3, A3, C4, E4 — Fmaj7 chord
      const oscillators: OscillatorNode[] = [];

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 8;

        oscGain.gain.value = 0.25;
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        oscillators.push(osc);
      });

      nodesRef.current = { oscillators, gainNode: masterGain, lfo, lfoGain };
    } catch {
      playingRef.current = false;
    }
  }, [getCtx]);

  const stop = useCallback(() => {
    if (!playingRef.current || !nodesRef.current) {
      playingRef.current = false;
      return;
    }

    const { oscillators, gainNode, lfo } = nodesRef.current;
    const ctx = audioCtxRef.current;

    if (ctx) {
      // Fade out over 0.5s
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

      setTimeout(() => {
        oscillators.forEach((osc) => { try { osc.stop(); } catch {} });
        try { lfo.stop(); } catch {}
        try { gainNode.disconnect(); } catch {}
      }, 600);
    }

    nodesRef.current = null;
    playingRef.current = false;
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

  return { start, stop };
}
