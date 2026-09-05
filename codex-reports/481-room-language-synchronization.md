# TASK-481 — Room language synchronization

Date: 2026-08-29

## Status

Implemented, automatically verified, and independently reviewed. Browser and
physical multiplayer QA have not been run.

## User outcome

Every participant in a room now uses one language. The locale selected by the
room creator is stored on the server and delivered in every `room:state`, so
the lobby, direct-join screen, all seven phone game routes, the TV lobby, and
the shared TV game renderer switch to the same Russian or English locale.

## Root cause

The i18n provider stored the locale independently in each browser profile.
Phones and TV therefore kept their own `localStorage` value and could render
the same room in different languages.

## Implementation

- Added a server-owned `ru` / `en` locale to the room model.
- The room creator's current locale becomes the room locale at creation time.
- Missing or invalid locale values safely fall back to Russian.
- Added the room locale to both broadcast and direct `room:state` responses.
- The shared room-state hook applies the server locale, covering every phone
  game route and the shared TV game route.
- The lobby, direct-join screen, and TV lobby also apply the room locale.
- Added Socket.io regression coverage for the default and English room locale.

## Changed files

- `src/server/socket-handlers.mts`
- `src/server/reconnect.integration.test.mts`
- `src/lib/use-room-state.ts`
- `src/components/lobby/Lobby.tsx`
- `src/app/join/[code]/page.tsx`
- `src/app/tv/[roomId]/page.tsx`
- `PROJECT_CONTEXT.md`
- `TASKS.md`
- `codex-reports/CODEX-HANDOFF.md`

## Verification

- `npx tsc --noEmit` — passed.
- Scoped ESLint for the changed runtime and test files — passed.
- `git diff --check` — passed before the documentation update.
- Security tests — 15/15 passed.
- Socket.io integration coverage passed for all seven games, room-locale
  propagation, and the Spy flow.
- Fresh Standards review — PASS, no actionable findings.
- Fresh Spec review — PASS, no actionable findings.

## Not run

- Browser or physical multiplayer QA.
- Production build.
- Commit or push.

## Runtime note

Rooms are stored only in server memory. A new room must be created after the
server reload for this room-level locale field to be present.
