# TASK-108 — Lobby: fix game start flow (emit game:select + game:start, listen game:started)

## Goal

The "Начать партию" button does nothing because `handleStartGame` only navigates
back to the lobby. Fix it to use the proper server flow:
1. Emit `game:select` (tell server which game is selected)
2. Emit `game:start` (start the game)
3. Listen for `game:started` → navigate to `/game/${roomCode}/${gameType}`

## Whitelist

- `src/components/lobby/Lobby.tsx`

## Acceptance criteria

- `npm run lint` passes (no new errors)
- `npm run build` passes
- Clicking "Начать партию" navigates host AND all connected players to
  `/game/${roomCode}/${gameType}` (e.g. `/game/ABCD12/mafia`)
- Non-host players also navigate when `game:started` fires
- If no room exists yet, room is created first (existing `createRoom()` logic kept)

---

## Implementation

### 1. Fix `handleStartGame`

Current code (around line 404):

```tsx
const handleStartGame = useCallback(async () => {
  if (!isCurrentUserHost) return;

  const existingCode = roomCode;
  const code = existingCode ?? (await createRoom()).code;

  if (!code) return;

  router.push(`/lobby/${code}?game=${activeGame}`);
}, [activeGame, createRoom, isCurrentUserHost, roomCode, router]);
```

Replace with:

```tsx
const handleStartGame = useCallback(async () => {
  if (!isCurrentUserHost) return;

  const existingCode = roomCode;
  const code = existingCode ?? (await createRoom()).code;

  if (!code) return;

  emit('game:select', { code, gameType: activeGame });
  emit('game:start', { code });
}, [activeGame, createRoom, emit, isCurrentUserHost, roomCode]);
```

Note: remove `router` from deps, add `emit`. Remove the `router.push` line.

### 2. Add `game:started` listener

The server emits `game:started` with payload `{ gameType: string, roomCode: string }`
to ALL players in the room (including the host) when the game starts.

Find where other `on(...)` listeners are registered (look for `useEffect` blocks
that call `on('room:state', ...)` or similar — around line 240–300).

Add a new `useEffect`:

```tsx
useEffect(() => {
  return on('game:started', (payload: { gameType: string; roomCode: string }) => {
    router.push(`/game/${payload.roomCode}/${payload.gameType}`);
  });
}, [on, router]);
```

This ensures every connected player (not just the host) navigates to the game
when it starts.

---

## Notes

- Do NOT change any other logic in the file.
- The `emit` function is already available from `useSocket` — no new imports needed.
- `router` from `useRouter()` is already in scope.
- The `on` function returns an unsubscribe function — use it as the useEffect cleanup.

## Report

Write report to `codex-reports/108-lobby-game-start-flow.md`.
Include: exact lines changed, lint/build status.
Do NOT commit.
