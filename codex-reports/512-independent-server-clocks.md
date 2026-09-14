# TASK-512 — Independent server clocks

## Scope and result

User authorized migration of all gameplay clocks away from the host phone.
Preserved pre-existing Crocodile/Mafia/TV/FitText changes and TASK-511.

- Quiz countdown and answer timer now use the server scheduler. Expiry and
  all-answered reveal/scoring are canonical and broadcast to all recipients.
- Spy main, discussion and voting countdowns run on the server. Existing
  voting deadline/result rules are retained. Legacy timer patches cannot stop
  an active same-phase clock or expire it early.
- Alias classic and letter clocks run on the server; same-turn snapshots cannot
  alter time. Letter expiry enters turnResult without scoring twice. Classic
  deliberately stays at zero for the existing final-word choice.
- Mafia terminal results are scheduled by the server after 1500ms; H2O buzzer
  winner advances to playing after 3000ms. Reset/phase changes cancel pending
  transitions, and repeated snapshots do not postpone them.
- Existing server Crocodile, Mafia day and H2O timers remain active. Who Am I
  has no gameplay countdown. Local animation/feedback delays remain local.
- Removed client gameplay intervals and both H2O transition-delay implementations.
  Alias effect/ref cleanup was needed for React lint after removing its interval.

## Verification

New Socket.io tests exercise Quiz, Spy and both Alias modes: silent then
disconnected host, unsolicited timer delivery to TV and peer, and expiry.
Unit checks cover multi-stage expiry, no duplicate scoring, private views via
existing security suite, and delayed transitions/cancellation. Delay tests
execute the real scheduling function with a deterministic timer harness.
Existing seven-game reconnect and Mafia/H2O/Crocodile clock tests are included.
Before fix, Quiz/Spy received no server tick. Alias fixture was corrected to
send complete snapshots through its real setup phases before testing expiry.

Final full run: **127/127 tests passed**, including nested cases. TypeScript and lint
pass (four existing unused legacy Mafia renderer warnings); diff-check passes.
Previously failing Spy action harness now supplies the scheduler dependency;
legacy zero-tick tests now assert that only server time can expire voting.

## Files

Production: `src/server/socket-handlers.mts`, `src/server/game-security.mts`,
phone pages Quiz, Spy, Alias, Mafia, hundred-to-one.
Tests: independent-clocks unit/integration, delayed-transitions, Spy voting and
action harness, Mafia/H2O clock fixture (now nonterminal, with a Mafia role).
Canonical status: PROJECT_CONTEXT, TASKS, CODEX-HANDOFF; this report.

## Limits

No restart, browser/device QA, build, commit or push. Separate fresh review is
still required before publication. Phone sleep is represented by no client
events/disconnection, not a physical-device reproduction. Backend activation
needs an authorized restart, which destroys in-memory rooms. This does not make
the server resilient to its own shutdown or replace manual gameplay decisions.
