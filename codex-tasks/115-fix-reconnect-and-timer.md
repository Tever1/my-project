# TASK-115: Fix reconnect restore + stale timer cancellation

Two bugs to fix in this task.

---

## Bug 1: Player stays gray after browser restore

### Root cause

`src/lib/use-socket.ts` line 22:
```typescript
const onConnect = () => setIsConnected(true);
```

When socket reconnects after mobile background, only `setIsConnected(true)` is
called. The `player:back` event is NOT emitted. The `visibilitychange` handler
already fired while the socket was dead — the emit silently failed
(`!socket.connected` guard on line 40). Result: player stays gray even after
the user returns to the browser.

### Fix

Change the `onConnect` handler to also emit `player:back` if the page is
currently visible:

```typescript
const onConnect = () => {
  setIsConnected(true);
  if (typeof document !== 'undefined' && !document.hidden) {
    socket.emit('player:back');
  }
};
```

---

## Bug 2: Player kicked after ~4 minutes instead of 5

### Root cause

`src/server/socket-handlers.mts` `handleDisconnect` function: every unexpected
disconnect calls `setTimeout(..., 300000)` and stores nothing. On mobile,
socket.io reconnects and disconnects multiple times while the app is in
background. Each disconnect adds a NEW 300s timer. The FIRST timer fires 300s
after the first disconnect; by that time the player may be in another
disconnected cycle → `!player.isConnected` is true → player deleted earlier
than expected.

### Fix

Add `reconnectTimer` field to the `Player` interface and cancel the previous
timer before starting a new one. Also cancel the timer in `room:join` when
the player successfully reconnects.

#### Step 1 — Add field to Player interface (around line 4):

```typescript
interface Player {
  id: string;
  socketId: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAway: boolean;
  team?: string;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}
```

#### Step 2 — Cancel old timer before starting new one in `handleDisconnect`

Find the setTimeout block (around line 395-408):
```typescript
      // Broadcast immediately so other clients see the grayscale avatar.
      broadcastRoomState(io, room);

      // Unexpected disconnect with other players present keeps the reconnect grace period.
      setTimeout(() => {
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

Replace with:
```typescript
      // Broadcast immediately so other clients see the grayscale avatar.
      broadcastRoomState(io, room);

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

#### Step 3 — Cancel timer in `room:join` on successful reconnect

Find the `room:join` handler's `existingPlayer` branch (around line 153-156):
```typescript
      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        existingPlayer.isConnected = true;
        existingPlayer.isAway = false;
      } else {
```

Replace with:
```typescript
      if (existingPlayer) {
        if (existingPlayer.reconnectTimer) {
          clearTimeout(existingPlayer.reconnectTimer);
          existingPlayer.reconnectTimer = undefined;
        }
        existingPlayer.socketId = socket.id;
        existingPlayer.isConnected = true;
        existingPlayer.isAway = false;
      } else {
```

---

## Files to modify

1. `src/lib/use-socket.ts`
2. `src/server/socket-handlers.mts`

## Acceptance Criteria

- `src/lib/use-socket.ts`: `onConnect` emits `player:back` when
  `document.hidden === false`.
- `src/server/socket-handlers.mts`:
  - `Player` interface has `reconnectTimer?: ReturnType<typeof setTimeout>`.
  - `handleDisconnect` cancels previous timer with `clearTimeout` before
    setting a new one.
  - `room:join` handler cancels the timer when `existingPlayer` reconnects.
- `npx tsc --noEmit` passes.
- No other files modified.

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc.
- Change the 300000ms timeout value.
- Touch Lobby.tsx or any other client file.

## Report

Write `codex-reports/115-fix-reconnect-and-timer.md` with:
- Before/after diffs for both files
- Result of `npx tsc --noEmit`
