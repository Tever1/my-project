# TASK-114: Fix connectedPlayers filter — show disconnected players as grayscale

## Root Cause

`src/components/lobby/Lobby.tsx` lines 1935-1937:

```typescript
const connectedPlayers = (roomState?.players ?? []).filter(
  (p) => p.isConnected !== false && p.nickname
);
```

This filter REMOVES players with `isConnected=false` from the display entirely.
When the socket disconnects (mobile background/lock), the server broadcasts
`isConnected=false` → the client filters out the player → player disappears
from the room UI. This is the root cause of the "player disappears after 20-30s"
bug.

The correct behavior: disconnected players should stay visible with a grayscale
avatar (already handled by `away={!player.isConnected || player.isAway}` in the
PlayerAvatar component). They should only be removed from the list when the
server actually deletes them (after the 5-minute grace period).

Additionally: on reconnect, `isConnected` goes back to `true` → player becomes
colorful again automatically. This also fixes the "player doesn't come back
after returning" bug.

## Fix

Remove `p.isConnected !== false &&` from the filter. Keep the `p.nickname` check.

## File

**Only modify:** `src/components/lobby/Lobby.tsx`

## Change

Find (around line 1935):
```typescript
  const connectedPlayers = (roomState?.players ?? []).filter(
    (p) => p.isConnected !== false && p.nickname
  );
```

Replace with:
```typescript
  const connectedPlayers = (roomState?.players ?? []).filter(
    (p) => p.nickname
  );
```

That's the only change needed.

## Acceptance Criteria

- `src/components/lobby/Lobby.tsx`: `connectedPlayers` filter uses only
  `p.nickname` check, no `isConnected` condition.
- `npx tsc --noEmit` passes.
- No other files modified.

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc.
- Touch any server files.
- Change the `away` prop on PlayerAvatar (it already handles grayscale correctly).
- Add any new filtering logic.

## Report

Write `codex-reports/114-fix-connected-players-filter.md` with:
- Before/after diff
- Result of `npx tsc --noEmit`
