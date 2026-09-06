# TASK-507: H2O captain selection synchronization

## Result

Fixed the server permission mismatch for roleSelect → captainSelect when the
room game host and the selected H2O moderator are different players.
The phone renders Next using the room-host flag, but the server previously
accepted this patch only from the selected moderator. The sender's optimistic
local update advanced its screen while the server and other clients stayed in
roleSelect.

## Scope

- `src/server/socket-handlers.mts`: permit the room game host to send only the
  captain-selection transition with empty captains and false confirmation flags.
  No additional score, role, or later-phase moderator permissions are granted.
- `src/server/h2o-buttons.integration.test.mts`: regression with four players
  and TV, separate room host/moderator, live delivery to all five clients and
  authoritative snapshot recovery. Reject ordinary-player transitions,
  attached score manipulation and subsequent moderator-only commands.

Existing dirty changes in these files and other games were preserved. No
production UI or redesign changes. Canonical documents belong to the general
progress task and were not edited here. Next report number after this file: 508.

## Verification

- New regression failed before the fix (no captainSelect broadcast) and passed
  after it. The first sandbox attempt could not bind a local port; the actual
  regression ran with approved local network permissions on an ephemeral port.
- `node --import tsx --test src/server/h2o-buttons.integration.test.mts src/server/game-security.test.mts src/server/reconnect.integration.test.mts`: 32/32 tests pass, including 58 existing H2O protocol checkpoints.
- `npx tsc --noEmit`: pass.
- Scoped ESLint on the two changed source/test files: pass.
- `git diff --check`: pass.

## Limits and remaining work

- The active LMXFTA room was not inspected or changed; diagnosis is based on
  the actual phone/server mismatch and an isolated automatic reproduction.
- Dev-server has not been restarted. Activation requires restarting the
  backend and creating a new room; this destroys the existing in-memory room
  and needs Anastasia's go-ahead.
- Browser/manual phone + TV QA, production build, fresh independent review,
  commit and push were not performed. Independent review is required before
  publication of the server change.
