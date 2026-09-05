# TASK-506 — Mafia night action fixes

## Result

Fixed all three findings from TASK-505:
- Don targets use the public alive + eliminated roster, not private role keys.
  Dead targets remain available; the moderator/self are not targets.
- Recipient snapshots derive own `abilityBlocked` during night. Phone action
  panels and handlers use it; Lover target remains hidden from other roles/TV.
- Server rejects subsequent Doctor/Detective confirmations in the same night.
  Phone handlers also guard accepted choices. Next night resets these choices.

## Files

- `src/app/game/[roomId]/mafia/page.tsx`
- `src/server/game-security.mts`
- `src/server/mafia-buttons.integration.test.mts`
- `TASKS.md`, `codex-reports/CODEX-HANDOFF.md`, this report.

## Verification

- Before fix: reproduced all four failing assertions from TASK-505.
- After fix: Mafia flow 80/80 checkpoints; privacy/reset checks for all four
  blocked active roles; security and existing seven-game reconnect matrix pass.
- Combined run: 32/32 tests including nested reconnect cases.
- TypeScript passes; scoped ESLint has only four existing unused Mafia renderer
  warnings; diff-check passes.
- Reviewed snapshot stage delivery and public eliminated-player targets locally.

## Limits / handoff

No browser/device QA, build, restart, commit or push. Scripted target-list checks
do not render React. Existing unrelated dirty work preserved. Separate fresh
review remains required before publication. Backend activation requires an
authorized dev-server restart (existing in-memory rooms will be lost).
