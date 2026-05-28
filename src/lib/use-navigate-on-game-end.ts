'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';

/**
 * Subscribes to the game-end socket event and routes the phone client
 * away from the game page. Single source of truth - change the destination
 * here, not in every game page.
 */
export function useNavigateOnGameEnd(roomId: string) {
  const router = useRouter();
  const { on } = useSocket();

  useEffect(() => {
    const unsub = on('game:ended', () => {
      router.push(`/join/${roomId}`);
    });
    return unsub;
  }, [on, router, roomId]);
}
