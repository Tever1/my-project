# TASK-484 — Player name length limit

Date: 2026-09-02

## Status

Implemented and automatically verified. Browser and physical multiplayer QA
have not been run.

## User outcome

Every player name entering a room is limited to 10 visible characters before it
can be shown by any of the seven games on phones or TV.

## Implementation

- Added one shared `MAX_PLAYER_NAME_LENGTH` constant and grapheme-aware
  player-name helpers.
- Client and server both require the project's modern-browser baseline and use
  `Intl.Segmenter`, avoiding a fallback with different Unicode semantics.
- Guest join, registration, and profile editing inputs stop at 10 visible
  characters. Native `maxLength` is intentionally not used because it counts
  UTF-16 units instead of user-visible symbols.
- Previously saved profile names are normalized when local auth state loads.
- Lobby room creation and join payloads use the normalized profile name.
- The server normalizes names during both `room:create` and a new `room:join`.
- Empty or non-string names are rejected by the server.
- Duplicate-name checks run after trimming and shortening, so two longer names
  with the same first 10 characters cannot enter as visually identical players.
- Reconnect keeps the existing server-owned player name instead of renaming the
  player from a reconnect payload.

## Changed files

- `src/lib/player-name.ts`
- `src/lib/player-name.test.ts`
- `src/lib/auth-context.tsx`
- `src/app/profile/page.tsx`
- `src/components/lobby/Lobby.tsx`
- `src/app/join/[code]/page.tsx`
- `src/server/socket-handlers.mts`
- `src/server/reconnect.integration.test.mts`
- `PROJECT_CONTEXT.md`
- `TASKS.md`
- `codex-reports/CODEX-HANDOFF.md`

## Verification

- The focused Socket.io test failed before the fix because the server retained
  the full name, then passed after the fix.
- Player-name unit test passed for trimming, Cyrillic shortening, direct input
  limiting, ordinary and compound emoji, combining marks, and invalid values.
- Full affected unit and Socket.io regression set passed, including all seven
  production games, reconnect, room locale, Quiz answer privacy, Spy flow, and
  Crocodile timer synchronization.
- `npx tsc --noEmit` — passed.
- Scoped ESLint — passed.
- `git diff --check` — passed.

## Not run

- Browser or physical multiplayer QA.
- Production build.
- Commit or push.

## Runtime note

The Socket.io handler is loaded when the custom dev-server starts. Restart the
server and create a new room before manually verifying the 10-character rule;
the restart removes existing in-memory rooms.
