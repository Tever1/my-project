# TASK-505 — Mafia internal button/state check

## Scope

Diagnosis only, as requested. Isolated Socket.io server, TV, moderator and eight
role-bearing player sockets. Production actions are sent with the actual payload
shapes; same-socket request-state barriers precede canonical state assertions.
Recipient snapshots are also checked against actual phone target/blocked-state
expressions. No React rendering, browser QA or physical devices were used.

## Results: 76 checkpoints, 72 pass, four failures / three defects

1. **P1 — Don cannot select the Detective in the phone UI.**
   `renderNightClub` builds Don targets with `Object.keys(gs.roles)`. The server
   correctly hides non-public roles from the Don, so the tested list contains
   only the other Mafia member. The Detective is absent even though a direct
   authorized Don-check request for that player succeeds. Fix the target roster,
   not privacy: do not reveal all roles to supply selectable player IDs.

2. **P2 — Blocked ability UI does not know the player is blocked.**
   Reproduced with Lover visiting Doctor. Doctor's snapshot has `loverVisit:null`,
   while the UI tests `gs.loverVisit === effectivePlayerId`. It therefore offers
   the normal action; the server rejects it, and the local handler optimistically
   marks the choice completed. A private own-ability-blocked flag would allow
   correct UI without disclosing who the Lover visited to everyone.
   Other blocked-role UI branches use the same condition; only Doctor was tested.

3. **P2 — Confirmed Doctor/Detective selections can still be replaced.**
   Both confirmations promise an immutable choice, but a second different target
   in the same night stage replaces the canonical selection. Reproduced twice:
   Doctor c1 → c2 and Detective maf → c2. Day votes correctly reject a second vote.
   The second requests were injected directly; no claim of physical double-tap
   reproduction is made.

## Passed exercised paths

Moderator selection, role assignment/acknowledgements, private TV roles, all six
night stages, faction targets, Lover visit, Maniac skip, Doctor save, Detective
and Don results, morning, daytime voting/alibi, subsequent nights, blocked action
rejection on the server, two ties into execute/pardon, pardon, duplicate day-vote
rejection, single elimination with no role disclosure on TV, manual end-game.

This is not exhaustive rule/terminal-winner coverage. The scripted test records
failures and continues, restoring intended test inputs where necessary.

## Artifacts

- `src/server/mafia-buttons.integration.test.mts` remains red for four assertions.
- TypeScript, scoped ESLint and diff-check pass.
- Production files unchanged in this task. No dev-server restart, browser QA,
  build, commit or push. User rooms untouched.
