'use client';

import { useCallback } from 'react';
import { useSocket } from '@/lib/use-socket';

/**
 * Returns a callback that wraps `game:action` emit with the room envelope.
 * Use when the action name varies per call.
 */
export function useGameAction(roomId: string) {
  const { emit } = useSocket();
  return useCallback(
    (action: string, payload: unknown = {}) => {
      emit('game:action', { code: roomId, action, payload });
    },
    [emit, roomId],
  );
}

/**
 * Returns a callback that broadcasts a fixed-action game event.
 * Use when the action channel is constant for the whole game (e.g. 'mafia',
 * 'spy:sync'). Callers only pass the payload.
 */
export function useGameBroadcast(roomId: string, action: string) {
  const sendAction = useGameAction(roomId);
  return useCallback(
    (payload: unknown = {}) => sendAction(action, payload),
    [sendAction, action],
  );
}
