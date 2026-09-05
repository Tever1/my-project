# TASK-494 — Preserve Spy voting selection during snapshots

Date: 2026-09-03

## Result

Fixed the phone voting selection being cleared by the next full `spy:sync` snapshot, including the next timer update. Unconfirmed selection and the local submitted-vote lock now survive same-round snapshots. Both reset on entry into voting or when a snapshot arrives for a different round.

## Cause and scope

The phone treated every snapshot containing `phase: voting` as a new voting phase and unconditionally called `setLocalVote(null)` and `setHasVoted(false)`. Server snapshots include the current phase even when only the timer or another player's vote changes.

Only the reset condition in `src/app/game/[roomId]/spy/page.tsx` changed. No server, protocol, TV, design, scoring, or voting privacy changes. Existing unrelated dirty changes were preserved.

## Regression coverage

`src/lib/spy-vote-sync.test.ts` extracts and executes the actual production Socket.io callback with state-setter stubs. It does not copy the reset logic or launch a browser/live room. This verifies the callback behavior, not React rendering or real-device UI.

Before the fix: 3 failures and 3 passes. A full same-round timer snapshot changed the selected suspect to null; another player's vote also cleared it; the submitted lock was reset.

After the fix: 6/6 pass, covering repeated timer snapshots, other-player votes, submitted lock preservation, entry to voting, a new-round reconnect snapshot, and partial timer patches.

## Verification

- `node --import tsx --test src/lib/spy-vote-sync.test.ts` — 6/6 pass.
- `npx tsc --noEmit` — pass.
- Scoped ESLint on the phone page and regression test — pass.
- `git diff --check` — pass.
- No temporary debug instrumentation added.

Browser/multiplayer QA, production build, commit, and push were not run. The current room was not operated or restarted.

## Coordination

The canonical documents still list TASK-485 as next, while reports through TASK-493 exist. TASK-494 uses the next actual free number per `docs/CODEX_WORKFLOW.md`. Canonical numbering remains for the general coordination chat to synchronize; this game-specific fix does not edit protected shared documents.
