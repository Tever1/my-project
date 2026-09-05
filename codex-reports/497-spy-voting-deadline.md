# TASK-497 — End Spy voting at the deadline

Date: 2026-09-03

## Requested rule change

The user explicitly replaced the earlier rule that required every player to vote: voting now ends when its timer expires, using only submitted votes. Unsubmitted selections and missing votes do not count. Voting may still end early when all players submit.

## Implementation

- `src/server/game-security.mts`: canonical vote tally resolves on timeout, host zero-timer sync, or all submitted votes. Result includes `totalVotes` for the number actually cast. Votes after resolution do not mutate the tally.
- `src/server/socket-handlers.mts`: server-owned timeout resolves and broadcasts the result even without phone timer ticks. It is scheduled from snapshots/room updates, cancelled on phase exit, and cleared during room deletion. Spy time is materialized before checking actor actions, rejecting votes arriving at or beyond the deadline. Votes now receive personalized snapshots directly instead of relying on the host's tally. The host receives its canonical sync result too.
- `src/app/game/[roomId]/spy/page.tsx`: removed host-side vote tally, blocked submitting at zero, updated result denominator/copy to reflect only submitted votes.
- `src/app/tv/[roomId]/[gameType]/page.tsx`: result denominator uses submitted votes, not all room players. Other game renderers/layouts are unchanged.

No-vote outcome remains no accused player and a Spy win. Ties preserve the prior first-encountered tally leader behavior; no separate tie-rule redesign was requested. Individual vote choices remain hidden from other phones and TV. A selected player is not a submitted vote until confirmed.

## Verification

- New rule tests initially failed in 7/8 cases, confirming the previous wait-for-everyone behavior.
- Final combined suite: 54/54 passed (8 voting rules, 3 deadline scheduling, 3 actual socket callback boundary tests, 7 undo server, 17 existing server security, 6 vote-selection, 10 drawing).
- Deadline tests execute the production scheduling function using a fake clock, including a full minute without any incoming phone events.
- Socket callback tests execute the actual authorization/callback code with mocked transport: before-deadline votes are accepted, deadline votes are excluded, and the host receives the result from its zero-timer patch.
- TypeScript, scoped ESLint, and `git diff --check`: passed.

Test files: `src/server/spy-voting.test.mts`, `src/server/spy-voting-deadline.test.mts`, `src/server/spy-vote-actions.test.mts`.

## Activation and remaining work

- The current dev server was not restarted. Applying these backend changes, together with TASK-496, requires permission to restart, which destroys current in-memory rooms including VB2JW2.
- No browser/live multiplayer QA, build, commit, or push was performed. Fake-clock/callback tests do not prove physical phone/TV presentation.
- Fresh independent review is required before publication because server actions, voting privacy, and the common TV renderer are in scope.
- Existing unrelated dirty work and the previous Spy fixes are preserved.
- Canonical documents still describe the old voting deadline rule and advertise TASK-485, while actual reports reach TASK-497. This report records the user's superseding decision; the general coordination chat should synchronize protected canonical documents and numbering.
