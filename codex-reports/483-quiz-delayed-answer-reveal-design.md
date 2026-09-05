# TASK-483 — Quiz delayed answer reveal and editable answers

## Goal

Integrate the approved `Пульс эфира` Quiz flow into production:

- selecting an answer records the choice without revealing correctness;
- a player may replace that choice until the question result is revealed;
- the latest choice is the only canonical answer for that player;
- scoring is shown only after every player has answered or the timer expires;
- an incorrect choice never displays `+1`;
- TV keeps the room-player panel visible and colors players green or red only
  when the result is revealed;
- phone and TV rankings adapt to the current player count.

## Changed files

- `src/components/games/quiz-pulse/QuizPulse.tsx`
  - made answer options editable until `showCorrect`;
  - replaced the premature red score panel with the neutral blue
    `Ответ принят · Можно изменить` state;
  - aligned accepted, correct and incorrect result panels;
  - added the approved TV room-player status panel for waiting, countdown,
    answering and reveal states;
  - synchronized the smaller adaptive topic badge, countdown scale, full-width
    question copy and separate answer panel;
  - synchronized adaptive phone rankings and the approved two-column TV layout
    for five or more players.
  - reduced the height of the 2–4-player TV ranking rows by 25% after live
    production review, while preserving their width and typography.
- `src/app/game/[roomId]/quiz/page.tsx`
  - allowed a player to submit a replacement answer while the question remains
    open;
  - retained optimistic replacement in the local answer map.
- `src/app/tv/[roomId]/[gameType]/page.tsx`
  - passed room-order player answer/result status to the production TV renderer;
  - kept the separately sorted score list for leaderboard states.
- `src/server/socket-handlers.mts`
  - allowed an authenticated player to replace their own Quiz answer before
    reveal;
  - validates that the submitted answer index belongs to the active question;
  - preserves existing answer privacy for other players and TV.
- `src/server/game-security.test.mts`
  - added coverage proving that a second answer replaces the first and does not
    create an extra answered-player entry.
- `src/server/reconnect.integration.test.mts`
  - added a live Socket.io scenario proving the host receives the latest answer,
    TV receives only the hidden `-1` value, and the player snapshot retains one
    canonical changed answer.
- `src/app/quiz-design-preview/QuizPulseScreenGallery.tsx`
  - remains the approved preview reference, including the editable accepted
    answer example and player-count comparison screens.

## Behavior and privacy

- The server snapshot stores answers by player id, so replacing a value does not
  increase the answered-player count.
- Other non-host clients and TV still receive `-1` instead of the private answer
  value before reveal; only answer status is visible.
- The host scores the latest canonical answer when all players have answered or
  the question timer reaches zero.
- Once `showCorrect` is true, both the UI and server reject further changes.

## Checks

- `npx tsc --noEmit` — passed.
- scoped ESLint for the production Quiz renderer, phone route, TV route, server
  handler and focused tests — passed.
- `node --import tsx --test src/server/game-security.test.mts` — 16 tests passed.
- `node --import tsx --test src/server/reconnect.integration.test.mts` — passed,
  including the production Quiz reconnect scenario.
- scoped `git diff --check` — passed.

## Not run

- Production browser/multiplayer QA was not run in this integration pass.
- Production build was not run.
- Commit and push were not performed.

## Review gate

The change touches the shared TV renderer and Socket.io authorization. A fresh
independent review is required before publication, per the project workflow.
