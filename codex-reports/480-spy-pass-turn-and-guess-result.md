# TASK-480 — Spy pass turn and final guess result

Date: 2026-08-29

## Status

Implemented and statically verified. Browser/multiplayer QA and the required independent review of the server/Socket.io changes have not been run.

## User outcome

- The active Spy player can pass the turn even when they are not the game host.
- During the Spy's final guess, shared and non-Spy screens say only `Шпион угадывает слово` / `The spy is guessing the word` and do not name the Spy.
- A submitted final guess is checked against the canonical secret word on the server. A wrong guess immediately ends the round with the Spy exposed; the result screen shows the Spy and the secret word. A correct guess immediately gives the Spy the round win.

## Root cause

The phone button used `spy:sync` to submit a complete updated snapshot. The server security boundary accepts state synchronization only from the game controller, so a non-host active player's pass-turn request was rejected.

## Implementation

- Added the explicit `spy:pass-turn` action, authorized only for the current asker/drawer while the round is playing.
- Moved question-chain and drawing-turn advancement into the server reducer.
- Made `spy:guess-start` and `spy:guess-try` server-authoritative and broadcast personalized snapshots.
- Made every non-matching submitted guess an immediate wrong result; normalization ignores surrounding/repeated whitespace, letter case, and the Russian `е`/`ё` distinction.
- Kept the Spy identity and word hidden during `spyGuess`, then exposed both in `roundResult`.
- Replaced shared final-guess copy that named the Spy with generic copy on phone and TV.

## Changed files

- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/server/game-security.mts`
- `src/server/socket-handlers.mts`
- `src/server/game-security.test.mts`
- `src/server/reconnect.integration.test.mts`

## Verification

- `npx tsc --noEmit` — passed.
- Scoped ESLint for the changed runtime and test files — passed.
- `git diff --check` — passed.
- `node --import tsx --test src/server/game-security.test.mts` — 15/15 tests passed.
- `node --import tsx --test src/server/reconnect.integration.test.mts` — 9/9 tests passed, including a non-host active player passing the Spy turn and a wrong Spy guess producing a revealed round result.

## Not run

- Browser or physical multiplayer QA.
- Production build.
- Commit or push.

## Review requirement

This task changes `src/server/**` and the Socket.io action flow. Per `AGENTS.md`, it requires a separate fresh review pass before publication.
