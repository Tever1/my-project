# TASK-479 — Crocodile mobile runtime fixes

## Goal

Fix four Crocodile runtime issues reported from the lobby and a physical phone:

- a themed Quiz background remaining after selecting Crocodile;
- the turn timer moving backwards when a word card is swiped;
- the initial minute rendering as `00:60` instead of `01:00`;
- the page scrolling together with the active swipe card.

## Changed files

- `src/components/lobby/Lobby.tsx`
  - shows the special Quiz background only while Quiz is the active selection.
- `src/app/game/[roomId]/crocodile/page.tsx`
  - uses the shared `MM:SS` formatter;
  - merges full state syncs without allowing an older same-turn value to reset the phone timer;
  - keeps `gameStateRef` synchronized with every local host tick so a swipe cannot restore the previous time;
  - disables native touch scrolling on the active draggable card;
  - locks the Crocodile game surface to the viewport during the explainer's active turn.
- `src/app/tv/[roomId]/[gameType]/page.tsx`
  - replaces the `00:${seconds}` Crocodile timer with the shared formatter;
  - enlarges and centers the active-player information and timer on large TV screens;
  - enlarges the one-column progress table while retaining all 10 player rows without overlap.
- `src/server/game-security.mts`
  - authorizes `croc:tick` as a controller state-sync action so every second reaches other phones and TV;
  - prevents a full Crocodile state sync from increasing `timeLeft` during the same active turn;
  - still allows a new turn to reset to 60 seconds.
- `src/server/game-security.test.mts`
  - adds regression coverage for same-turn timer rewind and new-turn reset.
- `src/lib/format-game-time.ts`
  - adds a shared zero-padded `MM:SS` formatter.
- `src/lib/format-game-time.test.ts`
  - verifies `60 -> 01:00`, `59 -> 00:59`, and negative input clamping.
- `src/lib/crocodile-state-sync.ts`
  - protects the phone's active-turn countdown while still accepting the next word, score changes, and a fresh minute for a new player turn.
- `src/lib/crocodile-state-sync.test.ts`
  - reproduces the exact `42 seconds -> swipe state with 60 seconds` reset and verifies that a different player may start at 60.
- `src/server/crocodile-timer.integration.test.mts`
  - starts a real local Socket.io room with a host, another phone, and TV;
  - verifies `59 -> stale swipe state with 60 -> 59 -> next tick 58` on both recipients.
## Checks

- `npx tsx --test src/server/crocodile-timer.integration.test.mts src/server/game-security.test.mts src/lib/crocodile-state-sync.test.ts src/lib/format-game-time.test.ts` — passed, 20 tests.
- `npx tsc --noEmit` — passed.
- scoped ESLint for all changed TypeScript and TSX files — passed.
- `git diff --check` — passed.

## Browser / runtime QA

- A real isolated Socket.io room verified timer delivery to a second phone client and TV independently of swipes.
- TV layout was checked in the browser with 10 players at 1280×720 and 1920×1080; no overlap or clipping was found.
- The touch-scroll behavior and timer continuity have not yet been rechecked on a physical phone.
- External Chrome phone windows could not be controlled because the Codex browser extension was unavailable in that browser profile.
- Production build was not run.

## Follow-up diagnosis

Two independent faults produced the reported behavior. The host's interval
updated React state but left `gameStateRef` at the old value, so a swipe could
restore the previous time. Separately, the server authorization list omitted
`croc:tick`, so other phones and TV received time changes only with the next
full swipe state. The focused Socket.io test was observed timing out before the
server fix and passing afterwards.

## Follow-up / risk

The change touches the shared lobby, TV renderer, and server snapshot reducer.
A separate review pass plus an explicit physical-phone and TV regression are
required before publication.
