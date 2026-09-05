# TASK-119: Fix eslint-disable placement in Lobby room:leave effect

## Root cause

`src/components/lobby/Lobby.tsx` lines 273-282:

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

The `eslint-disable-next-line` on line 276 applies to line 277 (`useEffect(`),
but the actual `react-hooks/exhaustive-deps` violation is reported on line 282
(the deps array). Result: TWO lint warnings:
1. line 276 — `Unused eslint-disable directive`
2. line 282 — `Missing dependency: 'isConnected'`

Excluding `isConnected` from the deps is intentional — see the preceding comment.

## Fix

Move the `eslint-disable-next-line` directive to immediately precede the deps
array (inside the useEffect block). Keep the explanatory comment block where
it is.

## File

**Only modify:** `src/components/lobby/Lobby.tsx`

## Change

Find (lines 273-282):
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

Replace with:
```tsx
  // Only emit room:leave when navigating away from a room route,
  // NOT on socket reconnect (isConnected changes must not trigger this).
  useEffect(() => {
    if (isRoomRoute || !isConnected) return;
    emit('room:leave', {});
    setRoomCode(null);
    setRoomState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoomRoute, emit]);
```

Key change: the `// eslint-disable-next-line react-hooks/exhaustive-deps`
comment is removed from before `useEffect` and placed on the line directly
before the deps array `}, [isRoomRoute, emit]);`.

## Acceptance Criteria

- `src/components/lobby/Lobby.tsx`: the eslint-disable comment for
  `react-hooks/exhaustive-deps` is positioned immediately before the deps
  array of the room:leave effect (NOT before the useEffect keyword).
- `npm run lint` reports 0 problems for `Lobby.tsx`. Specifically:
  - No `Unused eslint-disable directive` warning.
  - No `react-hooks/exhaustive-deps` warning about `isConnected`.
- `npx tsc --noEmit` passes.
- No other files modified.

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc.
- Remove the explanatory comment block (lines 274-275).
- Change the deps array contents.
- Change the effect body.
- Touch any other useEffect or file.

## Report

Write `codex-reports/119-fix-eslint-disable-placement.md` with:
- Before/after diff
- Output of `npm run lint 2>&1 | grep -E "(warning|error|Lobby)"` showing 0
  warnings for Lobby.tsx
- Result of `npx tsc --noEmit`
