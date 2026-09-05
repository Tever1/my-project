# TASK-118: Remove debug console.log lines from socket-handlers

## Context

In TASK-112 we added three debug `console.log` lines to help diagnose mobile
reconnect issues. The reconnect bugs are fixed and the logs are no longer
needed — they just clutter production output.

## Fix

Remove three lines from `src/server/socket-handlers.mts`:

1. `console.log(`[Socket] player:away nickname=${player.nickname}`);` (in `player:away` handler)
2. `console.log(`[Socket] player:back nickname=${player.nickname}`);` (in `player:back` handler)
3. `console.log(`[Socket] disconnect nickname=${player.nickname} explicit=${explicit}`);` (in `handleDisconnect`)

Find each via `rg "console.log.\[Socket\] (player:|disconnect)" src/server/socket-handlers.mts`
and delete just those three lines. Leave the existing `[Socket] Connected:` and
`[Socket] Disconnected:` logs (they're not part of TASK-112).

## File

**Only modify:** `src/server/socket-handlers.mts`

## Acceptance Criteria

- `rg "console.log.*\[Socket\] player:" src/server/socket-handlers.mts` returns nothing.
- `rg "console.log.*\[Socket\] disconnect nickname" src/server/socket-handlers.mts` returns nothing.
- `rg "console.log.*\[Socket\] (Connected|Disconnected):" src/server/socket-handlers.mts` still returns matches (preserved).
- `npx tsc --noEmit` passes.
- No other files modified.

## Do NOT

- Modify CLAUDE.md, AGENTS.md, or any other doc.
- Remove the `[Socket] Connected:` / `[Socket] Disconnected:` logs.
- Touch any other logic.

## Report

Write `codex-reports/118-remove-debug-logs.md` with:
- The three removed lines verbatim
- Result of `npx tsc --noEmit`
