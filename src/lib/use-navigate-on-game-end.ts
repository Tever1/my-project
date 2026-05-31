'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';

type NavigateTarget = 'phone' | 'tv' | 'lobby';

const TARGET_PATHS: Record<NavigateTarget, (roomId: string) => string> = {
  phone: (roomId) => `/join/${roomId}`,
  tv: (roomId) => `/lobby/${roomId}`,
  lobby: (roomId) => `/lobby/${roomId}`,
};

/**
 * Subscribes to the game-end socket event and routes the client away from
 * the game page. Phone clients return to join, TV clients return to lobby.
 */
export function useNavigateOnGameEnd(
  roomId: string,
  target: NavigateTarget = 'phone',
) {
  const router = useRouter();
  const { on } = useSocket();

  useEffect(() => {
    const unsub = on('game:ended', () => {
      router.push(TARGET_PATHS[target](roomId));
    });
    return unsub;
  }, [on, router, roomId, target]);
}
