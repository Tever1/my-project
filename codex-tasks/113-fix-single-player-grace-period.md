# TASK-113: Fix single-player disconnect — remove immediate delete for last player

## Root Cause

`src/server/socket-handlers.mts` line ~386:

```typescript
if (explicit || room.players.size === 1) {
  room.players.delete(playerId);
  ...
}
```

The `room.players.size === 1` condition causes the last player in a room to be
deleted IMMEDIATELY on unexpected disconnect (socket dies when browser is
backgrounded/locked). This bypasses the 5-minute grace period entirely.

Result: a player testing alone (or last one in the room) disappears from the
room the moment their socket dies — no grace period, no grayscale avatar.

## Fix

Remove `|| room.players.size === 1` from the condition. Only `explicit = true`
(deliberate room:leave) should trigger immediate deletion. Unexpected disconnects
always go to the grace period path, even if the player is alone.

The room itself will be cleaned up after 300s if the player never reconnects
(the existing setTimeout already handles this).

## File

**Only modify:** `src/server/socket-handlers.mts`

## Change

Find (around line 386):
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
```

Replace with:
```typescript
      if (explicit) {
        room.players.delete(playerId);
        playerRooms.delete(socket.id);
        if (room.players.size === 0) {
          rooms.delete(roomCode);
          return;
        }
        broadcastRoomState(io, room);
        return;
      }
```

That's the only change — remove `|| room.players.size === 1`.

## Acceptance Criteria

- `src/server/socket-handlers.mts`: condition is `if (explicit)` only, no
  `room.players.size === 1`.
- `npx tsc --noEmit` passes.
- No other files modified.

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc.
- Change the explicit leave path logic.
- Change the 300000ms timeout value.
- Touch Lobby.tsx or any client file.

## Report

Write `codex-reports/113-fix-single-player-grace-period.md` with:
- Before/after diff
- Result of `npx tsc --noEmit`
