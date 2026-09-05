# TASK-504 — H2O stale answer protection

## Result

Within the same Big Game finalist turn, the server rejects patches that move
the question cursor backwards or shorten/change the prefix of accepted answers.
The complete stale patch is ignored, including any old pause flag. Intentional
Big Game reset and changing finalists still work, as does normal pause/resume.

The prior title → teamNames finding in TASK-503 was incorrect: inspection of
the actual JSX places the button in captainSelect. No production phase rules
were changed; the test now verifies rejection of an unsupported title transition.

## Changes and checks

- `src/server/game-security.mts`: same-turn monotonic answer progress.
- `src/server/h2o-buttons.integration.test.mts`: corrected title expectation.
- `src/server/mafia-h2o-clock.test.mts`: regressions for old cursor, overwritten
  accepted prefix, pause/resume, reset and next finalist.
- H2O protocol run: 58/58 checkpoints passed, including both delayed-answer cases.
- Four focused reducer tests passed. TypeScript, scoped ESLint and diff-check passed.
- Independent review: no remaining actionable P0–P2; reset, next-player,
  expiration and privacy behavior checked.
- No browser/physical QA, dev-server restart, build, commit or push.
- Backend activation requires restart/new room. Existing user rooms preserved.

TASK-503's report and the canonical bug queue were corrected. Mafia's separate
button-flow check is still pending; this change is limited to H2O.
