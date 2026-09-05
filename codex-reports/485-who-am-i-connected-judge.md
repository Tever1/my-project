# TASK-485 — Who Am I connected judge assignment

Date: 2026-09-02

## Status

Implemented and automatically verified. Browser and physical multiplayer QA
have not been run.

## User outcome

- A wrong character guess can no longer be sent to an unavailable player for
  review.
- The server selects a connected, active player and sends that phone the judge
  screen with the pending answer.
- If every other player is temporarily unavailable, the pending review is
  safely closed as an incorrect guess instead of blocking the game.

## Root cause

The guessing phone selected a judge from the full room roster. During an active
game that roster intentionally retains disconnected players for reconnect, and
the server accepted such a player as the judge. The canonical state then waited
for a verdict from a socket that no longer existed, so no active phone could
complete the review.

## Implementation

- Moved judge selection from the guessing phone to the server-authoritative
  Who Am I action flow.
- Limited judge candidates to connected, non-away players other than the
  guesser.
- Removed the client-side random judge selection and its invalid direct-verdict
  fallback.
- Added a Socket.io regression test covering a disconnected requested judge,
  delivery of the private pending answer to the replacement judge, and the
  no-judge fallback.

## Changed files

- `src/app/game/[roomId]/who-am-i/page.tsx`
- `src/server/socket-handlers.mts`
- `src/server/who-am-i-judge.integration.test.mts`

## Verification

- The focused Socket.io test failed before the fix because the canonical state
  assigned `stale-judge`, then passed after the server selected
  `connected-judge`.
- `npx tsx --test src/server/who-am-i-judge.integration.test.mts` — passed.
- Existing game-security and reconnect Socket.io regression suites — passed.
- `npx tsc --noEmit` — passed.
- Scoped ESLint — passed.
- Scoped `git diff --check` — passed.

## Not run

- Browser or physical multiplayer QA.
- Production build.
- Commit or push.

## Review requirement

This task changes `src/server/**` and the Socket.io action flow. Per `AGENTS.md`,
it requires a separate fresh review pass before publication.
