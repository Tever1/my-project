'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSocket } from '@/lib/use-socket';

/**
 * Subscribes to `room:state` and requests the current state on mount.
 * Uses a ref so the subscription is stable and `onState` never stales.
 *
 * @param roomId   Room code to request state for.
 * @param onState  Called with raw event payload each time room state updates.
 */
export function useRoomState(roomId: string, onState: (data: unknown) => void) {
  const { on, emit, isConnected } = useSocket();
  const { setLocale } = useTranslation();

  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  });

  useEffect(() => {
    const unsub = on('room:state', (data: unknown) => {
      const roomLocale = (data as { locale?: unknown } | null)?.locale;
      if (roomLocale === 'ru' || roomLocale === 'en') setLocale(roomLocale);
      onStateRef.current(data);
    });
    if (isConnected) emit('room:get-state', { code: roomId });
    return unsub;
  }, [on, emit, isConnected, roomId, setLocale]);
}
