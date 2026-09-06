# TASK-502 — Server clocks for Mafia and 100 к 1

## Result

The server advances and broadcasts Mafia's day countdown and H2O's buzzer,
round-four and Big Game countdowns independently of browser intervals. Phone
controllers no longer emit periodic ticks. Mafia TV displays the day countdown.
Room restart is still required to load the changed backend in the dev process.

## Correctness

- H2O round-four reset is an explicit host-only `r4Reset` command; everyone,
  including its sender, receives the canonical result (60, stopped).
- Old numeric timer patches cannot resurrect an expired round-four or same-player
  Big Game clock. A new Big Game player can start their own 30/40-second clock.
- Big Game expiration fills remaining answer slots with dashes and sets the
  question cursor to five; the existing manual next-screen action remains.
- Pause/resume uses canonical state on phones and TV. Obsolete client merge
  guards no longer discard an authoritative pause.
- Mafia ignores legacy client `day-timer` actions. Server ticks use a public
  timer-only event; private role/action state is not broadcast with ticks.
- H2O uses existing per-recipient sanitized snapshots. Timers advance only in
  their active phase. The scheduler stops on pause/expiry and checks room identity.
- The user requested timer maintenance for H2O; its redesign remains paused.

## Files

- `src/server/socket-handlers.mts`
- `src/server/game-security.mts`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/server/mafia-h2o-clock.test.mts`
- `src/server/mafia-h2o-clock.integration.test.mts`
- `PROJECT_CONTEXT.md`, `TASKS.md`, `codex-reports/CODEX-HANDOFF.md`

Existing TASK-500/501 Alias changes in shared files were preserved.

## Verification

- 20/20 reducer/security tests passed: explicit reset, stale tick after zero,
  Big Game expiry, next-player initialization, pauses and elapsed Mafia time.
- 3/3 focused Socket.io tests passed (parent plus two games): host/peer/TV receive
  server ticks with no client ticks, countdown continues with host disconnected,
  reconnect retrieves remaining time, H2O reset is visible in TV snapshot.
- Combined reconnect and initial clock integration run: 16/16 passed, including
  reconnect coverage for all seven games. The focused clock suite was then
  extended and rerun for actual host disconnection and return.
- TypeScript passed; scoped ESLint has no errors and only the four existing
  unused Mafia legacy-renderer warnings; `git diff --check` passed.
- Independent review identified legacy Mafia tick authority and obsolete H2O
  pause filtering. Both fixed; follow-up review found no remaining P0–P2.

## Not performed / handoff

- No dev-server restart; existing rooms were preserved. After an authorized
  restart, create a fresh room to activate the backend changes.
- Browser/physical phone/TV QA and production build were not run. Socket tests
  verify protocol behavior, not physical sleep or visual layout.
- No commit or push. Prior report numbering was stale; next report is TASK-503.
- Detailed canonical reconciliation of older TASK-485–501 is separate work.
