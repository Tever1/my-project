# TASK-112: Fix mobile reconnect — player leaves room on socket reconnect

## Root Cause

Two bugs cause players to disappear from the room when mobile socket reconnects:

### Bug 1 (client): `room:leave` emitted on every socket reconnect

`src/components/lobby/Lobby.tsx` lines 273-276:
```typescript
useEffect(() => {
  if (isRoomRoute || !isConnected) return;
  emit('room:leave', {});
}, [isRoomRoute, isConnected, emit]);  // ← isConnected in deps is the bug
```

When mobile socket reconnects: `isConnected` goes false→true → useEffect
re-runs → if `isRoomRoute = false` (user on `/`) → emits `room:leave` →
player is deleted immediately (explicit path). Then `room:join` fires →
player comes back. This is the "disappear for 5 seconds" behavior.

**Fix:** remove `isConnected` from deps array. The effect should fire on
navigation changes (isRoomRoute changes), NOT on socket reconnect. Add
`isConnected` check INSIDE the effect body to guard against emitting when
not connected.

### Bug 2 (server): no broadcast after `isConnected = false` in grace period path

`src/server/socket-handlers.mts` line 369: after setting
`player.isConnected = false`, the grace period path (when there are other
players present) does NOT call `broadcastRoomState`. So other clients don't
see the disconnected player's avatar go grayscale — they only learn about
it after 300s when the player is deleted.

**Fix:** add `broadcastRoomState(io, room)` after the `if (explicit || ...)`
block in the grace period path.

## Files to modify

1. `src/components/lobby/Lobby.tsx`
2. `src/server/socket-handlers.mts`
3. `src/server/socket-handlers.mts` (debug logs — same file, отдельный пункт для ясности)

## Changes

### 1. `src/components/lobby/Lobby.tsx`

Find the effect (around line 273):
```typescript
useEffect(() => {
  if (isRoomRoute || !isConnected) return;
  emit('room:leave', {});
}, [isRoomRoute, isConnected, emit]);
```

Replace with:
```typescript
// Only emit room:leave when navigating away from a room route,
// NOT on socket reconnect (isConnected changes must not trigger this).
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (isRoomRoute || !isConnected) return;
  emit('room:leave', {});
}, [isRoomRoute, emit]);
```

Key change: remove `isConnected` from the deps array. The guard `!isConnected`
inside the effect body remains — it prevents emitting when not connected.

### 2. `src/server/socket-handlers.mts`

Find the grace period section in `handleDisconnect` (around line 383-404):
```typescript
      if (explicit || room.players.size === 1) {
        room.players.delete(playerId);
        playerRooms.delete(socket.id);
        if (room.players.size === 0) {
          rooms.delete(roomCode);
          return;
        }
        broadcastRoomState(io, room);
        return;
      }

      // Unexpected disconnect with other players present keeps the reconnect grace period.
      setTimeout(() => {
```

Add `broadcastRoomState(io, room)` AFTER the `if (explicit || ...)` block
and BEFORE the `setTimeout`:

```typescript
      if (explicit || room.players.size === 1) {
        room.players.delete(playerId);
        playerRooms.delete(socket.id);
        if (room.players.size === 0) {
          rooms.delete(roomCode);
          return;
        }
        broadcastRoomState(io, room);
        return;
      }

      // Broadcast immediately so other clients see the grayscale avatar.
      broadcastRoomState(io, room);

      // Unexpected disconnect with other players present keeps the reconnect grace period.
      setTimeout(() => {
```

### 3. `src/server/socket-handlers.mts` — debug logs

Добавить `console.log` в три места, чтобы при тестировании мобильного
реконнекта сразу было видно в логах сервера что именно произошло.

**В `player:away` handler** (около строки 309), после `player.isAway = true`:
```typescript
console.log(`[Socket] player:away nickname=${player.nickname}`);
```

**В `player:back` handler** (около строки 325), после `player.isAway = false`:
```typescript
console.log(`[Socket] player:back nickname=${player.nickname}`);
```

**В `handleDisconnect`** (около строки 369), после `player.isConnected = false`:
```typescript
console.log(`[Socket] disconnect nickname=${player.nickname} explicit=${explicit}`);
```

Эти три лога позволяют в `npm run dev` терминале различить:
- `player:away` — браузер ушёл в фон, сокет ещё жив
- `player:back` — браузер вернулся, сокет жив
- `disconnect explicit=false` — OS убил сокет (мобильный sleep)
- `disconnect explicit=true` — игрок явно вышел (room:leave)

## Acceptance Criteria

- `src/components/lobby/Lobby.tsx`: `isConnected` is NOT in the deps array of
  the room:leave effect. The eslint-disable comment is present. The `!isConnected`
  guard remains inside the effect body.
- `src/server/socket-handlers.mts`: `broadcastRoomState(io, room)` is called
  in the grace period path (before setTimeout, after the explicit block).
- `src/server/socket-handlers.mts`: three `console.log` lines added in
  `player:away`, `player:back`, and `handleDisconnect`.
- `npx tsc --noEmit` passes.
- No other files modified.

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc.
- Change the explicit leave path or the single-player cleanup path.
- Change the 300000ms timeout value.
- Remove the `!isConnected` guard inside the effect body.

## Report

Write `codex-reports/112-mobile-reconnect-fix.md` with:
- Exact before/after diffs for both files
- Result of `npx tsc --noEmit`
