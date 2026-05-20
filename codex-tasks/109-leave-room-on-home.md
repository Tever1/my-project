# TASK-109 — Lobby: emit room:leave when on `/` (not in a room route)

## Goal

Fix stale room membership: when a player navigates from `/lobby/[code]` back
to `/` (the home/lobby root), they should be removed from the room on the server.

Currently the socket stays alive (mobile background keepalive), so the server's
`disconnect` event never fires and the player keeps showing as `isConnected: true`
to other clients in the room — even though on their own device they're not in
the room anymore.

## What we are NOT changing

- The 30-second disconnect grace period stays. Backgrounding the app / locking
  the screen / receiving a call should NOT kick the player. Those don't change
  the route — Lobby stays mounted with `initialRoomCode={code}`.
- Reconnect logic on `/lobby/[code]` stays.

## Whitelist

- `src/components/lobby/Lobby.tsx`

## Acceptance criteria

- `npm run lint` passes (no new errors)
- `npm run build` passes
- When `Lobby` mounts WITHOUT `initialRoomCode` (i.e. user is on `/`), it emits
  `room:leave` exactly once after socket connects.
- The emit is idempotent: harmless if the user wasn't in any room (server
  handler already no-ops when `playerRooms.get(socket.id)` is undefined).
- When user IS on `/lobby/[code]` (isRoomRoute = true), NO `room:leave` is emitted.
- The existing auto-rejoin useEffect for `initialCode` remains untouched.

---

## Implementation

Find the `useEffect` hooks near the top of `Lobby()` body (around line 230–270).

Add a new `useEffect` that emits `room:leave` once on mount when the user
is on the home route AND socket is connected:

```tsx
useEffect(() => {
  if (isRoomRoute || !isConnected) return;
  emit('room:leave', {});
}, [isRoomRoute, isConnected, emit]);
```

Place this AFTER the existing `useEffect` that auto-joins via `initialCode`
(around line 258–269) so the ordering reads naturally:
1. Auto-join if on /lobby/[code]
2. Auto-leave if on /

Note: this effect runs:
- Once when Lobby first mounts on `/` and socket is connected
- Again if `isConnected` flips from false → true while on `/` (re-emit after reconnect)
- Never on `/lobby/[code]` (isRoomRoute guard)

Do NOT add a cleanup function. The leave is a fire-and-forget event.

---

## Notes

- `emit`, `isConnected`, `isRoomRoute` are all already in scope.
- The server's `room:leave` handler (`src/server/socket-handlers.mts:300`) calls
  `handleDisconnect(io, socket, true)` which is a no-op if the socket isn't
  registered to any room. Safe to call always.
- Do NOT touch any other logic.

## Report

Write report to `codex-reports/109-leave-room-on-home.md`.
Include: line numbers added, lint/build status.
Do NOT commit.
