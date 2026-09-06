# TASK-503 — 100 к 1 button protocol checks

## Scope and method

Requested internal server test, starting with H2O only. No browser/physical QA.
An isolated Socket.io server, one TV socket and four phone-role sockets execute
payloads corresponding to production buttons. Same-socket state requests act as
processing barriers; the host's canonical snapshot is checked after each action.
This does not execute React click handlers or verify visual transitions.

## Result

Correction in TASK-504: finding 1 below was a test error. The actual button is
in captainSelect, not title; title → teamNames is not an implemented UI action.
The test now expects that unsupported transition to be rejected. Finding 2 was
confirmed and fixed in TASK-504. The updated run passes all 58 checkpoints.
The original results below are retained as history, not current defects.

58 checkpoints executed: 55 matched expected state; three failed, representing
two distinct defects. The test deliberately remains red until fixes are made.

1. **P2 — Edit team names from title is rejected.** The production title screen
   sends `{phase:'teamNames'}`, but `validateStateSyncPhase` permits only buzzer
   or topicSelect from title. Host remains on title in the server state while
   optimistic local UI changes. Reproduced via the host socket.
2. **P2 — Delayed Big Game answer rewinds progress.** After answer two is stored,
   sending the previous answer-one payload sets `bgCurQ` back to one and replaces
   the answer array. Reproduced for both finalists (bgPhase 1 and 3). The server
   needs monotonic answer progress within the same finalist attempt; intentional
   reset/new-player transitions must remain possible. TASK-502's canonical phone
   merge no longer masks this pre-existing server acceptance issue.

## Passed paths

Topic, roles, both captain confirmations, both team names, start, buzzer countdown
and first press, rejection of second press, host transition into play, answer
reveal/close and repeated identical snapshot, unauthorized score change rejected,
strike/transfer and bank payloads, next-round transitions including fourth-round
rules, timer start/pause/reset, results, finalist selection, both Big Game players,
typing pause/resume, five answers each, manual checking/credit, final and replay.

These confirm server acceptance/state for the exercised payloads, not complete
coverage of all scoring calculations or every UI button. The scripted progression
continues after recording failures to inspect later stages; it does not imply an
uninterrupted defect-free user flow.

## Artifacts and verification

- Added `src/server/h2o-buttons.integration.test.mts`.
- Final run: 58 checkpoints / 3 failures; one overall integration test fails.
- TypeScript passed for the initial test; scoped ESLint and diff-check passed
  after adding the two delayed-answer cases.
- No production changes, dev-server restart, browser QA, build, commit or push.
- Mafia remains the next separate internal-check pass, per the user's limit budget.
