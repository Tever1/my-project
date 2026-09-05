# TASK-482 — Russian room locale

Date: 2026-08-30

## Status

Implemented and automatically verified. Browser and physical multiplayer QA
have not been run.

## User outcome

Every newly created game room now uses Russian on both phones and TV,
regardless of the language saved in the creator's browser profile.

## Reproduction and root cause

The TASK-481 implementation used the creator browser's `ru` / `en` locale as
the room locale. A deterministic Socket.io regression test reproduced the
reported mismatch by creating a room from a browser that sent `en` and
asserting that the owner, a phone, and TV must all receive `ru`. The test failed
before the fix because the server returned `en`.

All seven phone routes and the shared TV route already apply the server locale
from `room:state`; no second client-side locale race was found.

## Implementation

- New rooms always store `locale: 'ru'` on the server.
- Room creation no longer sends or accepts the creator browser's locale.
- Existing `room:state` synchronization remains responsible for applying the
  Russian locale to lobby, direct join, every phone game route, and TV.
- The regression test deliberately sends a legacy `locale: 'en'` value and
  verifies that the owner, phone, and TV all receive `ru`.

## Changed files

- `src/server/socket-handlers.mts`
- `src/server/reconnect.integration.test.mts`
- `src/components/lobby/Lobby.tsx`
- `PROJECT_CONTEXT.md`
- `TASKS.md`
- `codex-reports/CODEX-HANDOFF.md`

## Verification

- The focused locale test failed before the fix and passed after it.
- Full security and Socket.io regression suite passed, including all seven
  production games, the Russian room-locale case, and the Spy flow.
- `npx tsc --noEmit` — passed.
- Scoped ESLint — passed after removing the obsolete locale binding.
- `git diff --check` — passed.

## Not run

- Browser or physical multiplayer QA.
- Production build.
- Commit or push.

## Runtime note

Rooms exist only in server memory. The dev-server must be restarted and a new
room created before manually checking this behavior.
