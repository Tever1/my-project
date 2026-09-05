# TASK-510: H2O live feedback — round flow, privacy and readiness

## Implemented

1. Reverse round no longer shows ×4 on either phone view or TV. Its existing
   inverted scoring is unchanged.
2. The host's Next button stays hidden during `switched` (the second team's
   chance after three mistakes). Server rejects forward navigation patches
   during that state. Existing reset and backward navigation remain permitted.
3. TV now renders the five reverse-round rules during `r4rules`, matching the
   phone rules, including the 60-second discussion and 15/30/60/120/180/240 points.
4. The second finalist's phone does not render Big Game questions, proposed
   answers or check results during the first finalist's turn/check. Existing
   server sanitization of the first finalist's private answers is retained and
   tested. The question bank still exists in the shipped application bundle;
   this change prevents premature screen/DOM display, not extraction of static
   assets by a technical user.
5. Starting finalist 1 or 2 creates server-owned `bgAwaitingReady` with the
   timer paused. Only that finalist can send `{bgReady:true}`. Server then
   clears the waiting flag and starts the timer. Early answers, host/other
   player confirmations and duplicate confirmations are rejected. Host reset
   remains available while waiting. Phone and TV show a readiness screen with
   no questions during this interval. The active finalist gets a ru/en ready
   button. Readiness is included in the canonical snapshot for resync.

## Files

- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx` (H2O only)
- `src/server/socket-handlers.mts` (H2O only)
- `src/server/game-security.mts` (H2O timer guard only)
- `src/server/h2o-buttons.integration.test.mts`
- `src/server/mafia-h2o-clock.integration.test.mts` (fixture now supplies two
  valid team captains rather than bypassing setup; no Mafia behavior changed)
- This report. Existing dirty changes were preserved. Canonical documents
  were not edited by this game task. Next actual report number: 511.

## Verification

- H2O buttons + transition regression + Mafia/H2O clock unit/integration +
  game-security + reconnect: **40/40 tests pass**. H2O protocol: 69 checkpoints.
- Readiness tested for both finalists: waiting across an elapsed second keeps
  full time, own confirmation starts countdown, wrong actor and duplicates are
  rejected. Private first-player answers/matches absent from second-player
  snapshot during first check. Second-team turn cannot be skipped.
- TypeScript, scoped ESLint, git diff --check: pass.
- Initial clock fixture failed because it skipped valid captain setup; fixture
  corrected and the complete suite rerun successfully.
- Browser/visual QA and production build were not run. Rendering and actual
  phone/TV interactions still require the authorized manual verification.

## Activation and remaining work

Follow-up copy refinement: only the active finalist sees the readiness prompt;
the second finalist waiting for the first turn/check sees «Ожидайте своего
хода» / «Wait for your turn». Moderator and other players receive no waiting
message panel. Question hiding remains independent of the message visibility.
Phone-only change; TV readiness message unchanged. TypeScript and scoped lint
rechecked; browser QA not performed.

Backend has not been restarted for TASK-510. Current BT7XDA process still uses
the previous server behavior; new readiness flow requires restart and a new
room. Restart destroys the room's in-memory game state. No commit or push.
Independent review of the server/privacy/TV changes is required before
publication. Manual test should cover reverse rules/points display, second-team
turn resolution, both readiness screens and reload while waiting.
