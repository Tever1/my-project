'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/lib/auth-context';
import { useRoomState } from '@/lib/use-room-state';
import { useSocket } from '@/lib/use-socket';

const GUEST_ID_KEY = 'party-hub-join-guest-id';

function getGuestPlayerId() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(GUEST_ID_KEY) ?? '';
}

export interface GameIdentity {
  user: User | null;
  effectivePlayerId: string;
  isGameHost: boolean;
  gameHostPlayerId: string | null;
}

export function useGameIdentity(roomId: string): GameIdentity {
  const { user } = useAuth();
  const { isConnected, emit } = useSocket();
  const router = useRouter();

  const [guestPlayerId, setGuestPlayerId] = useState('');
  const [guestNickname, setGuestNickname] = useState('');
  const [gameHostPlayerId, setGameHostPlayerId] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setGuestPlayerId(getGuestPlayerId()));
  }, []);

  useRoomState(roomId, (data) => {
    const room = data as {
      players: { id: string; nickname: string; isHost: boolean }[];
      gameHostPlayerId?: string | null;
    };

    setGameHostPlayerId(room.gameHostPlayerId ?? null);

    if (user || !guestPlayerId || guestNickname) return;
    const player = room.players.find((p) => p.id === guestPlayerId);
    if (player) queueMicrotask(() => setGuestNickname(player.nickname));
  });

  // Auto-reconnect: re-join room channel on socket reconnect (e.g. page refresh mid-game)
  useEffect(() => {
    if (!user || !isConnected || !roomId) return;
    emit(
      'room:join',
      { code: roomId, playerId: user.id, nickname: user.nickname, isReconnect: true },
      (res: unknown) => {
        const response = res as { success: boolean; error?: string };
        if (!response.success) {
          // Kicked (grace expired) or room gone - send to home
          router.push('/');
        }
      }
    );
  }, [isConnected, emit, user, roomId, router]);

  useEffect(() => {
    if (user || !isConnected || !roomId || !guestPlayerId || !guestNickname) return;
    emit(
      'room:join',
      { code: roomId, playerId: guestPlayerId, nickname: guestNickname, isReconnect: true },
      (res: unknown) => {
        const response = res as { success: boolean; error?: string };
        if (!response.success) {
          router.push('/');
        }
      }
    );
  }, [isConnected, emit, user, roomId, guestPlayerId, guestNickname, router]);

  const effectivePlayerId = user?.id ?? guestPlayerId;
  const isGameHost = Boolean(
    effectivePlayerId &&
    gameHostPlayerId &&
    effectivePlayerId === gameHostPlayerId
  );

  return { user, effectivePlayerId, isGameHost, gameHostPlayerId };
}
