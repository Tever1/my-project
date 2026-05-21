# TASK-111: Extend disconnect grace period (mobile reconnect fix)

## Context

On mobile, the OS kills WebSocket connections when the browser goes to background.
This happens in ~20-30 seconds. The current grace period before removing a player
from a room is also 30 seconds — so mobile users reliably disappear from the room
when they background their browser, even briefly.

The agreed UX: players should NOT be removed from the room on unexpected disconnect.
Their avatar should show as grayscale (already works — `away={!player.isConnected}`),
and when they reconnect, they should seamlessly return to their previous slot.

## Task

Change the disconnect grace period from 30 seconds to 5 minutes in
`src/server/socket-handlers.mts`.

## File

**Only modify:** `src/server/socket-handlers.mts`

## Change

Line ~404. Change:

```typescript
}, 30000);
```

To:

```typescript
}, 300000); // 5 min grace — mobile browsers kill WS when backgrounded
```

That's the only change needed.

## Acceptance Criteria

- `src/server/socket-handlers.mts` line with `setTimeout` grace period uses `300000`
- No other files modified
- `npm run build` passes (or `npx tsc --noEmit` if build is too slow)

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc
- Change any other timeout values
- Modify the explicit disconnect path (`explicit = true` case)
- Modify the single-player room cleanup path (`room.players.size === 1`)

## Report

Write `codex-reports/111-extend-disconnect-grace-period.md` with:
- What line was changed (before/after)
- Result of `npx tsc --noEmit`
