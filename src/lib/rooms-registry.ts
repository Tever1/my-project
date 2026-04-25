/**
 * Singleton registry that bridges socket-handlers.mts (server process)
 * and Next.js API routes. Socket handlers register a provider at startup;
 * API routes call getRoomsSnapshot() to read current state.
 *
 * Uses globalThis instead of a module-level variable so that the provider
 * is shared across all module-loading systems (tsx + Next.js compiler)
 * that coexist in the same Node.js process.
 */

export interface RoomSnapshot {
  code: string;
  status: 'lobby' | 'in-game' | 'finished';
  currentGame: string | null;
  playerCount: number;
  players: { nickname: string; isHost: boolean; isConnected: boolean }[];
  createdAt: number;
}

const PROVIDER_KEY = '__partyGamesRoomsProvider__';

/** Called once by socket-handlers when the server starts. */
export function registerRoomsProvider(fn: () => RoomSnapshot[]) {
  (globalThis as Record<string, unknown>)[PROVIDER_KEY] = fn;
}

/** Called by admin API routes to get current room state. */
export function getRoomsSnapshot(): RoomSnapshot[] {
  const fn = (globalThis as Record<string, unknown>)[PROVIDER_KEY] as
    | (() => RoomSnapshot[])
    | undefined;
  return fn ? fn() : [];
}
