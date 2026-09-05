# TASK-116: Fix mobile menu pointer events + reconnect room:join

Three bugs in this task.

---

## Bug #1: Mobile room button doesn't respond to taps after joining a room

### Root cause

`src/components/lobby/Lobby.tsx` mobile menu render block (around line 673-720):

```tsx
{isMobile && roomCode && (
  <>
    <div style={{ ..., zIndex: 40, opacity: roomMenuOpen ? 1 : 0,
                  pointerEvents: roomMenuOpen ? "auto" : "none" }} />
    <div style={{ position: "fixed", bottom: 0, ..., zIndex: 41,
                  maxHeight: "88dvh", overflowY: "auto",
                  transform: roomMenuOpen ? "translateY(0)" : "translateY(100%)",
                  ... }}>
      <RoomMenu ... />
    </div>
  </>
)}
```

The bottom-sheet container (second div, zIndex 41) has NO `pointerEvents` guard.
When the menu is closed, it's translated offscreen via `translateY(100%)`, but
iOS Safari can still consider its hit area present at its layout position
(bottom-anchored, up to 88dvh tall). This intercepts taps on the topbar
including the room button.

### Fix

Add `pointerEvents: roomMenuOpen ? "auto" : "none"` to the bottom-sheet
container's style.

---

## Bug #3: Mobile shows stale room after being kicked

### Root cause

After 5-minute grace period expires, the server deletes the player. When the
mobile user opens the browser, socket.io reconnects but `room:join` is NOT
re-emitted because the reconnect effect at `Lobby.tsx:261-271` only fires
when `initialCode` is set:

```tsx
useEffect(() => {
  if (!initialCode || !user || !user.nickname || !isConnected) return;
  emit('room:join', { code: initialCode, ... }, callback);
}, [emit, initialCode, isConnected, router, user]);
```

If the user joined via the code input on `/`, `initialCode` is null. On
reconnect, `room:join` does NOT fire → mobile keeps showing cached `roomState`
even though server has deleted them.

### Fix

Use `initialCode || roomCode` (state) so reconnect re-joins regardless of how
the user originally entered the room. If the room no longer exists, the
callback handles it (navigates to `/`).

---

## Bug #4: Quick minimize+restore on mobile → player stays gray

### Root cause

Same as Bug #3. On quick restore:
- If socket stayed alive: `visibilitychange` fires `player:back` ✓
- If socket died briefly (mobile OS killed TCP): `player:back` emit fails
  silently (`!socket.connected` guard in `use-socket.ts`).
- Socket.io reconnects → our TASK-115 fix emits `player:back` in `onConnect`,
  BUT the new socket isn't in `playerRooms` map yet (handleDisconnect cleared it).
- Server's `player:back` handler does `playerRooms.get(socket.id)` → undefined →
  returns early. `isAway` stays true, player stays gray.

The only event that re-registers the new socket in `playerRooms` is `room:join`.
But it doesn't fire when `initialCode` is null (same root cause as Bug #3).

### Fix

Same as Bug #3 — use `initialCode || roomCode` in the reconnect effect.
Once `room:join` succeeds, the server sets `isAway = false` and broadcasts.

Additionally: when navigating away from a room (the TASK-109 effect), clear
`roomCode` and `roomState` to prevent stale state from triggering an
unintended `room:join` on a later reconnect.

---

## Files to modify

**Only:** `src/components/lobby/Lobby.tsx`

## Changes

### Change 1 — Mobile bottom-sheet pointer events (around line 688-703)

Find:
```tsx
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 41,
              maxHeight: "88dvh",
              overflowY: "auto",
              padding: "0 12px 24px",
              transform: roomMenuOpen ? "translateY(0)" : "translateY(100%)",
              transition: roomMenuOpen
                ? "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)"
                : "transform 0.22s cubic-bezier(0.4, 0, 1, 1)",
              willChange: "transform",
            }}
          >
```

Replace with (add `pointerEvents` line):
```tsx
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 41,
              maxHeight: "88dvh",
              overflowY: "auto",
              padding: "0 12px 24px",
              transform: roomMenuOpen ? "translateY(0)" : "translateY(100%)",
              transition: roomMenuOpen
                ? "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)"
                : "transform 0.22s cubic-bezier(0.4, 0, 1, 1)",
              willChange: "transform",
              pointerEvents: roomMenuOpen ? "auto" : "none",
            }}
          >
```

### Change 2 — Reconnect uses initialCode || roomCode (around line 261-271)

Find:
```tsx
  useEffect(() => {
    if (!initialCode || !user || !user.nickname || !isConnected) return;
    emit('room:join', { code: initialCode, playerId: user.id, nickname: user.nickname }, (res: unknown) => {
      const response = res as { success: boolean };
      if (!response.success) {
        setRoomCode(null);
        setRoomState(null);
        router.push('/');
      }
    });
  }, [emit, initialCode, isConnected, router, user]);
```

Replace with:
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

Key changes:
- `const code = initialCode || roomCode` — use state code if no URL param
- Added `roomCode` and `isRoomRoute` to deps
- `if (isRoomRoute) router.push('/')` — only navigate away if user is on
  `/lobby/CODE`; users on `/` already see the right page

### Change 3 — Clear roomCode/roomState in TASK-109 effect (around line 273-279)

Find:
```tsx
  // Only emit room:leave when navigating away from a room route,
  // NOT on socket reconnect (isConnected changes must not trigger this).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isRoomRoute || !isConnected) return;
    emit('room:leave', {});
  }, [isRoomRoute, emit]);
```

Replace with:
```tsx
  // Only emit room:leave when navigating away from a room route,
  // NOT on socket reconnect (isConnected changes must not trigger this).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isRoomRoute || !isConnected) return;
    emit('room:leave', {});
    setRoomCode(null);
    setRoomState(null);
  }, [isRoomRoute, emit]);
```

## Acceptance Criteria

- `src/components/lobby/Lobby.tsx`:
  - Bottom-sheet container has `pointerEvents: roomMenuOpen ? "auto" : "none"`.
  - Reconnect effect uses `initialCode || roomCode` and includes `roomCode`,
    `isRoomRoute` in deps.
  - Reconnect failure callback only navigates if `isRoomRoute`.
  - TASK-109 leave effect also clears `roomCode` and `roomState`.
- `npx tsc --noEmit` passes.
- No other files modified.

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc.
- Touch server files.
- Change any other logic in Lobby.tsx.

## Report

Write `codex-reports/116-mobile-menu-pointer-and-reconnect.md` with:
- Before/after diffs for all three changes
- Result of `npx tsc --noEmit`
