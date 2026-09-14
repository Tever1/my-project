# TASK-523 — Spy circular turns and aligned controls

Date: 2026-09-13. Implemented locally; backend activation, separate review and browser QA pending.

## User requirements

The user clarified that both modes mean Spy, not Mafia. Pass turns in circles without repeating participants before everyone has taken a turn; align the half-width hold/pass controls; use Spy colors for the TV voting countdown.

## Changes and cause

- Question mode previously chose random candidates, which could revisit the initial asker before the first full circle ended. Server now advances through the existing shuffled playerOrder: A asks B, B asks C, C asks D, D asks A, then A starts the next circle. Drawing mode retains ordered circular passing. The roster filters absent IDs and provides a fallback for legacy snapshots.
- Phone initialization now picks the next target from the same playerOrder instead of independently choosing a random player.
- The `.spy-live-playing .glass-card` rule added a 12px top margin to the word bar while the pass button had zero margin. The bar now explicitly has zero margin and full row height; existing two equal columns are preserved. No global CSS was changed by this task.
- TV voting countdown uses `var(--spy-live)` instead of hardcoded blue `#64d2ff`.

## Files

- src/server/game-security.mts — Spy turn progression only.
- src/app/game/[roomId]/spy/page.tsx — initial target and bar alignment only.
- src/app/tv/[roomId]/[gameType]/page.tsx — Spy voting timer color only.
- src/server/spy-flow-regression.test.mts — 24 passes across six circles for each mode.
- src/server/reconnect.integration.test.mts — fixture uses a consistent starting order.

Pre-existing dirty changes in all shared files and unrelated games/admin were preserved. Canonical management documents were not modified.

## Verification

- The new question-mode regression failed before the fix; drawing already passed.
- Reducer/security/Spy regression tests: 24/24 passed after the fix.
- Targeted socket/reconnect/Spy voting regression: 31/31 passed, including seven-game reconnect matrix and both ordered modes.
- TypeScript, scoped ESLint and git diff --check passed.
- Screenshot and CSS/source inspection confirm the competing margin rule; actual post-fix visual alignment and countdown color were not checked in a browser.

## Remaining

No server restart, browser/multiplayer UI QA, build, commit or push. Server changes need authorized restart, which destroys in-memory rooms. Fresh separate review is required before publication. After restart, verify a new room with four phones and TV for repeated circles in both modes and the control alignment/color. The existing random initial shuffle is retained; it is not rerolled on every pass.
