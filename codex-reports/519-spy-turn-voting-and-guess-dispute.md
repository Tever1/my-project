# TASK-519 — Spy: turn chain, voting countdown and guess disputes

Date: 2026-09-12. Status: implemented locally; activation, fresh review and browser/device QA pending.

## Requested outcome

1. Passing a question turn keeps a valid named target and can continue repeatedly.
2. TV shows the voting countdown.
3. The last submitted vote resolves voting immediately.
4. A nonmatching final guess can be disputed and accepted/rejected by a judge, like Who Am I.
5. Phone playing controls share one equal-width row: hold-to-reveal left, pass turn right.

## Diagnosis and implementation

The phone initializes Spy through partial sync patches without a snapshot roster. Server turn selection and all-vote completion incorrectly assumed `snapshot.players` existed. Socket actions now obtain the canonical roster from the room, ignoring client-supplied roster data. The reducer falls back to playerOrder for older roster-less snapshots. Question-mode pass selection and all-vote completion use the same participant helper.

TV voting now renders the server-owned voteTimerLeft. Existing independent server clocks/deadline behavior is preserved: expiry counts only submitted votes; zero votes gives the spy victory. All submitted votes finish early and cancel the voting clock.

An exact normalized guess resolves immediately. A nonmatch remains in spyGuess with confirmation controls: dispute or admit the wrong answer. A dispute assigns a random connected, non-away, non-spy player on the server. Only that judge can accept/reject. Both verdicts and decline resolve through canonical snapshots, not host browser relays. Repeated guesses while confirmation/judgment is pending are rejected. Obsolete client-host guess reducers were removed.

Pending guess text is visible only to the spy and judge; TV and other participants, including an unassigned game host, do not receive it. TV displays neutral waiting text without rendering either word. Judge state is recoverable through request-state.

Phone controls use equal grid columns with aligned heights/margins. The pass button is disabled for nonactive players. Revealed words adapt to narrower width. Same-phase timer snapshots no longer clear typed guesses or interrupt hold-to-reveal.

## Changed files in this task

- src/app/game/[roomId]/spy/page.tsx
- src/app/tv/[roomId]/[gameType]/page.tsx — Spy blocks only
- src/server/game-security.mts — Spy reducer/privacy only
- src/server/socket-handlers.mts — Spy authorization, roster and judge actions only
- src/server/game-security.test.mts — updated Spy nonmatch expectation
- src/server/reconnect.integration.test.mts — Spy scenario
- src/server/spy-vote-actions.test.mts — last-vote canonical-roster regression
- src/server/spy-flow-regression.test.mts — new regressions

Existing unrelated dirty work, including TASK-512 clock changes in these shared files, was preserved. Canonical management documents were not edited.

## Evidence

- Four new regression tests failed before implementation and passed after it: roster-less repeated turns, roster-less all-vote completion, typo dispute, TV countdown source composition.
- Full library/server suite: 142/142 passed after implementation. An initial sandbox run could not bind localhost (EPERM); the rerun with local networking permission passed.
- After strengthening judge/last-vote coverage: 21/21 targeted tests passed, including seven-game reconnect matrix, server-selected judge despite forged judgeId, rejection of a spy's forged verdict, judge request-state restoring both words, rejected verdict revealing the result, and last vote resolving from room roster without snapshot players.
- TypeScript, scoped ESLint and git diff --check passed. After the final control-row adjustment, static checks were repeated.

These are automated server/source checks, not visual or physical phone/TV validation.

## Pending / limitations

- Backend is not activated in the existing dev process; no restart was performed. Restart needs permission and destroys in-memory rooms. Create a new room after restart.
- No browser/multiplayer UI QA, physical phone test, production build, commit or push was performed in this task.
- Fresh separate review is required before publication (server/protocol/privacy/shared TV scope). No agents were spawned.
- If no eligible judge is online at dispute time, confirmation stays available for retry or admitting the wrong answer. An already assigned judge must reconnect to submit a verdict; automatic judge replacement was not added.
- Canonical Spy documentation still contains older voting-expiry wording. The general progress chat should reconcile it with existing deadline behavior and this task's explicit user requirements; this game chat does not own those documents.

## Next steps

1. Fresh review of this scoped change alongside existing shared-file changes.
2. Authorized server restart and new room.
3. Four phones + TV: repeated passing, both modes, long words in half-row, voting countdown/last vote/partial votes/zero votes, exact guess, typo accept/reject/decline, judge reconnect and privacy, ru/en.
