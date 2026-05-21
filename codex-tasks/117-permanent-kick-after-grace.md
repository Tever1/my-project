# TASK-117: Permanent kick after grace period — no auto-rejoin

## Goal

After the 5-minute grace period expires and the server removes a player from
a room, that player must NOT be silently re-added when their socket
reconnects (e.g., when the user unlocks their phone after being away 6+ min).
Instead, the auto-reconnect must fail, the client clears local room state,
and the user lands on the main menu (`/`).

Manual re-join via the code input or QR is still allowed — the user can
deliberately choose to re-enter the room.

## Root cause

Currently `room:join` handler creates a new player if `existingPlayer` is not
found (and the room still exists). After the grace timer fires and deletes
the player, an auto-reconnect's `room:join` looks like a fresh first-time
join — server happily adds them back.

The server has no memory of "this player was kicked from this room."

## Fix

### Server side (`src/server/socket-handlers.mts`)

1. **Add `kickedPlayerIds: Set<string>` to `Room` interface.** This set holds
   playerIds that were removed by the grace timer (not by explicit `room:leave`).

2. **Initialize the set** when a room is created in the `room:create` handler.

3. **In the grace-period timeout callback** (inside `handleDisconnect`), add
   the playerId to `kickedPlayerIds` BEFORE deleting the player from the room.
   Place this only inside the timeout callback (the explicit leave path is
   NOT a kick).

4. **In `room:join` handler**, accept an optional `isReconnect: boolean` in
   the payload. Logic:
   - If `data.isReconnect === true` AND `room.kickedPlayerIds.has(data.playerId)`
     → return `{ success: false, error: 'Player was removed due to inactivity' }`.
   - If `data.isReconnect === false` (or undefined) AND
     `room.kickedPlayerIds.has(data.playerId)` → `room.kickedPlayerIds.delete(data.playerId)`
     (user explicitly chose to rejoin; clear the kicked flag and proceed with
     normal join logic — which will create a new player since existingPlayer
     was deleted).

5. **No explicit cleanup needed** for `kickedPlayerIds` — when the room is
   deleted entirely (`rooms.delete(roomCode)`), the Room object is GC'd with
   its set.

### Client side (`src/components/lobby/Lobby.tsx`)

1. **Auto-reconnect useEffect (around line 261)**: add `isReconnect: true` to
   the `room:join` payload. This effect runs automatically on socket reconnect
   or initial mount with a `roomCode || initialCode` — semantically it is
   restoring previous state, never a deliberate join.

2. **`handleJoinRoom` (manual join via code input)**: add `isReconnect: false`
   to the `room:join` payload. User explicitly typed a code and pressed Enter.

The existing failure handling in the useEffect already clears
`roomCode`/`roomState` and navigates to `/` if `isRoomRoute` — exactly the
behavior we want.

## Files to modify

1. `src/server/socket-handlers.mts`
2. `src/components/lobby/Lobby.tsx`

## Detailed changes

### 1. `src/server/socket-handlers.mts` — Room interface

Find:
```typescript
interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  status: 'lobby' | 'in-game' | 'finished';
  currentGame: string | null;
  gameState: Record<string, unknown> | null;
  tvSocketId: string | null;
  createdAt: number;
}
```

Add `kickedPlayerIds` field:
```typescript
interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  status: 'lobby' | 'in-game' | 'finished';
  currentGame: string | null;
  gameState: Record<string, unknown> | null;
  tvSocketId: string | null;
  createdAt: number;
  kickedPlayerIds: Set<string>;
}
```

### 2. `src/server/socket-handlers.mts` — `room:create` handler

Find (around line 100-113):
```typescript
      const room: Room = {
        id: uuidv4(),
        code,
        hostId: data.playerId,
        players: new Map(),
        maxPlayers: 20,
        status: 'lobby',
        currentGame: null,
        gameState: null,
        tvSocketId: null,
        createdAt: Date.now(),
      };
```

Add `kickedPlayerIds`:
```typescript
      const room: Room = {
        id: uuidv4(),
        code,
        hostId: data.playerId,
        players: new Map(),
        maxPlayers: 20,
        status: 'lobby',
        currentGame: null,
        gameState: null,
        tvSocketId: null,
        createdAt: Date.now(),
        kickedPlayerIds: new Set<string>(),
      };
```

### 3. `src/server/socket-handlers.mts` — `room:join` handler

Find (around line 134-173):
```typescript
    socket.on('room:join', (data: { code: string; playerId: string; nickname: string }, callback) => {
      const room = getRoomByCode(data.code.toUpperCase());
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      const existingPlayer = room.players.get(data.playerId);

      // Allow existing players to reconnect even mid-game; block only new players
      if (room.status === 'in-game' && !existingPlayer) {
        callback({ success: false, error: 'Game already in progress' });
        return;
      }
      if (room.players.size >= room.maxPlayers && !existingPlayer) {
        callback({ success: false, error: 'Room is full' });
        return;
      }

      if (existingPlayer) {
        ...
```

Add kicked-list check right after the `room` not found check:

```typescript
    socket.on('room:join', (data: { code: string; playerId: string; nickname: string; isReconnect?: boolean }, callback) => {
      const room = getRoomByCode(data.code.toUpperCase());
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      // Kicked-list check: auto-reconnect for a previously kicked player must fail.
      // Manual join (isReconnect=false) clears the kicked flag and proceeds normally.
      if (room.kickedPlayerIds.has(data.playerId)) {
        if (data.isReconnect) {
          callback({ success: false, error: 'Player was removed due to inactivity' });
          return;
        }
        room.kickedPlayerIds.delete(data.playerId);
      }

      const existingPlayer = room.players.get(data.playerId);
      // ... rest unchanged
```

### 4. `src/server/socket-handlers.mts` — grace timer

Find (around line 402-420):
```typescript
      // Cancel any existing grace-period timer before starting a new one.
      // Mobile may disconnect/reconnect multiple times; only the latest timer counts.
      if (player.reconnectTimer) clearTimeout(player.reconnectTimer);

      // Unexpected disconnect with other players present keeps the reconnect grace period.
      player.reconnectTimer = setTimeout(() => {
        if (!player.isConnected) {
          room.players.delete(playerId);
          if (room.players.size === 0) {
            rooms.delete(roomCode);
          } else {
            broadcastRoomState(io, room);
          }
        }
      }, 300000); // 5 min grace — mobile browsers kill WS when backgrounded
```

Add `kickedPlayerIds.add(playerId)` BEFORE the delete:
```typescript
      // Cancel any existing grace-period timer before starting a new one.
      // Mobile may disconnect/reconnect multiple times; only the latest timer counts.
      if (player.reconnectTimer) clearTimeout(player.reconnectTimer);

      // Unexpected disconnect with other players present keeps the reconnect grace period.
      player.reconnectTimer = setTimeout(() => {
        if (!player.isConnected) {
          // Mark as kicked so auto-reconnect (isReconnect=true) is refused.
          // Manual re-join via code input/QR clears this flag.
          room.kickedPlayerIds.add(playerId);
          room.players.delete(playerId);
          if (room.players.size === 0) {
            rooms.delete(roomCode);
          } else {
            broadcastRoomState(io, room);
          }
        }
      }, 300000); // 5 min grace — mobile browsers kill WS when backgrounded
```

### 5. `src/components/lobby/Lobby.tsx` — auto-reconnect useEffect

Find (around line 261-272):
```tsx
  useEffect(() => {
    const code = initialCode || roomCode;
    if (!code || !user || !user.nickname || !isConnected) return;
    emit('room:join', { code, playerId: user.id, nickname: user.nickname }, (res: unknown) => {
      const response = res as { success: boolean };
      if (!response.success) {
        setRoomCode(null);
        setRoomState(null);
        if (isRoomRoute) router.push('/');
      }
    });
  }, [emit, initialCode, roomCode, isConnected, isRoomRoute, router, user]);
```

Add `isReconnect: true`:
```tsx
  useEffect(() => {
    const code = initialCode || roomCode;
    if (!code || !user || !user.nickname || !isConnected) return;
    emit('room:join', { code, playerId: user.id, nickname: user.nickname, isReconnect: true }, (res: unknown) => {
      const response = res as { success: boolean };
      if (!response.success) {
        setRoomCode(null);
        setRoomState(null);
        if (isRoomRoute) router.push('/');
      }
    });
  }, [emit, initialCode, roomCode, isConnected, isRoomRoute, router, user]);
```

### 6. `src/components/lobby/Lobby.tsx` — handleJoinRoom

Find (around line 393-403) the emit call inside `handleJoinRoom`:
```tsx
    const sent = emit('room:join', { code, ...player }, (response: unknown) => {
```

Replace with:
```tsx
    const sent = emit('room:join', { code, ...player, isReconnect: false }, (response: unknown) => {
```

## Acceptance Criteria

- `src/server/socket-handlers.mts`:
  - `Room` interface has `kickedPlayerIds: Set<string>`.
  - `room:create` initializes `kickedPlayerIds: new Set<string>()`.
  - `room:join` handler accepts `isReconnect?: boolean`, checks kicked-list,
    rejects auto-reconnect and clears flag on manual join.
  - Grace-period timeout callback adds playerId to `kickedPlayerIds` before
    `room.players.delete(playerId)`.
- `src/components/lobby/Lobby.tsx`:
  - Auto-reconnect useEffect passes `isReconnect: true`.
  - `handleJoinRoom` passes `isReconnect: false`.
- `npx tsc --noEmit` passes.
- No other files modified.

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc.
- Add `isReconnect` to `room:create`.
- Clear `kickedPlayerIds` on explicit `room:leave` (manual leave is not a kick).
- Add TTL / cleanup for `kickedPlayerIds` — it lives with the room object.
- Touch any other files.

## Report

Write `codex-reports/117-permanent-kick-after-grace.md` with:
- Exact before/after diffs for all six changes
- Result of `npx tsc --noEmit`
