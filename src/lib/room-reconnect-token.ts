'use client';

const TOKEN_PREFIX = 'party-hub-room-reconnect-token';

function storageKey(roomCode: string, playerId: string): string {
  return `${TOKEN_PREFIX}:${roomCode.toUpperCase()}:${playerId}`;
}

export function getRoomReconnectToken(roomCode: string, playerId: string): string {
  if (typeof window === 'undefined' || !roomCode || !playerId) return '';
  return window.localStorage.getItem(storageKey(roomCode, playerId)) ?? '';
}

export function saveRoomReconnectToken(roomCode: string, playerId: string, token: unknown): void {
  if (typeof window === 'undefined' || !roomCode || !playerId || typeof token !== 'string' || !token) return;
  window.localStorage.setItem(storageKey(roomCode, playerId), token);
}
