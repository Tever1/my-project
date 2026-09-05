'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';

type GameStartPayload = { roomCode: string; gameType: string };

/**
 * Subscribes to the game-start event and navigates to the resolved path.
 * Uses refs so the subscription is stable regardless of how often the
 * caller re-renders or the callbacks change.
 *
 * @param resolvePath  Maps the event payload to the target URL.
 * @param onNavigate   Optional side-effect called just before navigation
 *                     (e.g. closing a waiting-for-players overlay).
 */
export function useNavigateOnGameStart(
  resolvePath: (payload: GameStartPayload) => string,
  onNavigate?: () => void,
) {
  const router = useRouter();
  const { on } = useSocket();

  // Keep latest callbacks in refs so the effect closure never goes stale.
  const resolveRef = useRef(resolvePath);
  const onNavigateRef = useRef(onNavigate);
  useEffect(() => {
    resolveRef.current = resolvePath;
    onNavigateRef.current = onNavigate;
  });

  useEffect(() => {
    return on('game:started', (payload: unknown) => {
      const data = payload as GameStartPayload;
      onNavigateRef.current?.();
      router.push(resolveRef.current(data));
    });
  }, [on, router]);
}
