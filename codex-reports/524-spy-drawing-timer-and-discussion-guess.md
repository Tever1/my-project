# TASK-524 — Spy phone drawing timer and discussion guess

Date: 2026-09-13. Local implementation; backend restart, separate review and browser QA pending.

## Requested and implemented

- Phone drawing mode: removed the separate top timer/status row. The remaining timer panel now sits to the right of the existing drawing heading, above the canvas, as marked in the supplied screenshot. Question mode and TV composition are unchanged.
- Both Spy modes: the spy now sees Guess the word during discussion. Server authorization accepts guess-start only from the spy in playing or discussion. The canonical transition stops the discussion countdown and enters the existing exact-guess/dispute/judge flow. TV and other phones continue to receive private, filtered snapshots.

## Scope

- src/app/game/[roomId]/spy/page.tsx
- src/server/socket-handlers.mts — Spy guess-start authorization only
- src/server/game-security.mts — stop discussion clock on guess-start
- src/server/spy-flow-regression.test.mts
- src/server/reconnect.integration.test.mts — Spy now enters the guess flow from discussion

All existing dirty work was preserved. No canonical management documents or global CSS were changed.

## Verification and remaining work

- 20/20 targeted regression/reconnect tests passed: includes guess from discussion, stopped countdown, pending answer privacy, server judge and result recovery, and the seven-game reconnect matrix.
- Scoped ESLint and diff-check passed. Initial TypeScript check caught an unknown-phase includes argument; changed to explicit phase comparisons and reran type-check.
- No browser/device visual validation, restart, production build, commit or push in this task. Backend changes need authorized restart, which destroys rooms. Separate fresh review required before publication. Check the header at actual phone sizes and the discussion button on spy/non-spy phones in both modes after restart.
