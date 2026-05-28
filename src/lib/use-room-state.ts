'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/lib/use-socket';

/**
 * Subscribes to `room:state` and requests the current state on mount.
 * Uses a ref so the subscription is stable and `onState` never stales.
 *
 * @param roomId   Room code to request state for.
 * @param onState  Called with raw event payload each time room state updates.
 */
export function useRoomState(roomId: string, onState: (data: unknown) => void) {
  const { on, emit } = useSocket();

  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  });

  useEffect(() => {
    const unsub = on('room:state', (data: unknown) => {
      onStateRef.current(data);
    });
    emit('room:get-state', { code: roomId });
    return unsub;
  }, [on, emit, roomId]);
}
