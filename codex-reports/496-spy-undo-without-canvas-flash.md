# TASK-496 — Spy undo without canvas flashing

Date: 2026-09-03

## Status

Implemented and locally verified. Activation on the running dev server awaits permission to restart: `server.mts` imports Socket.io handlers once, and restarting destroys its in-memory rooms. The user was asked whether current room VB2JW2 may be closed. No restart or live-room operation was performed in this task.

## Cause and fix

The previous undo sent `spy:clear`, followed by one `spy:stroke` event for each remaining segment. Every receiving screen could render an empty canvas and progressively reconstruct the drawing. This was reproduced by observing the production callbacks: undo of the second gesture delivered `[]`, then a partial first gesture, then the complete first gesture.

Undo now sends one `spy:undo` request with the expected final gesture ID and observed stroke count. The server removes that complete contiguous gesture from its canonical drawing and broadcasts one personalized `spy:sync` snapshot. No intermediate clear or segment replay is sent. The drawing phone still redraws its local result synchronously; other phones and TV receive the complete resulting drawing in one update.

Only the current drawer in the active drawing phase can undo. Wrong gesture IDs, invalid counts, wrong actors/modes/phases, and empty drawings are rejected. Duplicate requests do not remove an earlier gesture. Tagged gestures allow their final segments to be ahead of the phone's acknowledged count; legacy untagged segments require the exact count and retain per-segment undo.

## Changed files

- `src/app/game/[roomId]/spy/page.tsx`: undo callback sends the dedicated command; no clear-echo suppression is armed for undo.
- `src/server/game-security.mts`: shared undo eligibility check and canonical reducer.
- `src/server/socket-handlers.mts`: actor authorization and single personalized snapshot delivery.
- `src/lib/spy-drawing-undo.test.ts`: regression harness updated for atomic undo and asserts exactly one complete delivered drawing.
- `src/server/spy-undo.test.mts`: authorization, invalid/stale requests, duplicate handling, private TV snapshot, delayed segment echoes, legacy data, final gesture, and clear.

TV source and the separate clear action are unchanged. Existing unrelated work and prior Spy fixes were preserved.

## Verification

- Regression first failed: expected one complete drawing; actual sequence was empty, partial, complete.
- Final automated suite: 40/40 passed (10 drawing, 6 voting, 7 undo server, 17 existing security tests).
- `npx tsc --noEmit`: passed.
- Scoped ESLint on the five changed files: passed.
- `git diff --check`: passed.

These tests execute actual component handlers, server reducer, and authorization predicate with local hook/canvas stubs. They do not replace browser frame measurement or live Socket.io multiplayer QA. No browser QA, production build, commit, or push was run.

## Follow-up

- Obtain permission before restarting the dev server; current in-memory rooms will be lost.
- After restart and phone refresh, visually verify undo on phone and TV if browser QA is authorized.
- A fresh separate review is required before publication because the task changes server code and the Socket.io action protocol.
- Numbering follows the actual report maximum: TASK-496 after TASK-495. Shared canonical documents still advertise TASK-485 and remain for the general coordination chat to synchronize.
