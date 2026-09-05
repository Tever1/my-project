# TASK-495 — Spy drawing gesture undo

Date: 2026-09-03

## Result

The drawing phone now undoes a complete newly drawn gesture, rather than an almost invisible single segment. Repeated undo preserves earlier gestures. Clear continues using its existing action and behavior.

## Root cause

Every stroke echo/full snapshot rebuilt `groupsRef` as one group per segment. The local `endDraw` also appended the gesture, duplicating segments that had already arrived in echoes. Consequently undo removed a tiny segment or replayed duplicated lines.

## Scope

- `src/app/game/[roomId]/spy/page.tsx`: optional `gestureId` on drawn segments, one ID per mouse/touch gesture, preservation through the phone's stroke listener, and rebuilding history by contiguous gesture ID. Removed the duplicate local group append on release.
- Existing `spy:stroke`, `spy:clear`, and clear/replay undo actions remain unchanged. The current server reducer already preserves stroke payload metadata; no server or TV file was edited.
- IDs use time plus randomness only for drawing grouping, not security. They do not require a secure browser context, so drawing remains usable on LAN HTTP phones.
- `src/lib/spy-drawing-undo.test.ts`: deterministic fake-hook/fake-canvas harness executes the actual production DrawCanvas, socket callback, undo callback, and server snapshot reducer. It verifies the outgoing replay and resulting canonical drawing, without starting a live room or browser.

## Verification

- Initial reproduction: all four drawing cases failed on the original component.
- Final drawing regression: 9/9 passed. Covers stroke echoes, full snapshots, consecutive undo, clear followed by drawing, restored snapshots, touching gesture endpoints, legacy untagged segments, touch input, and empty-history button disabling.
- Voting regression from TASK-494: 6/6 passed.
- Existing server security tests: 17/17 passed.
- TypeScript, scoped ESLint, and `git diff --check`: passed.

## Boundaries and compatibility

- Browser/physical phone/TV and live multiplayer QA were not run. The canvas/context and hook scheduling are test doubles; these checks do not establish physical-device rendering.
- Gestures drawn by old clients have no IDs and retain legacy per-segment undo. Their original pen-lift boundaries cannot be recovered reliably. Refresh phones and draw new gestures to test the corrected behavior; existing art is not automatically deleted.
- New clients preserve grouping on restored canonical snapshots. Older phone code can discard gesture metadata during its own legacy clear/replay operation; refresh participating phones for consistent undo.
- No production build, server restart, commit, push, or live-room operation was performed. Existing unrelated dirty work was preserved.
- An additive optional stroke metadata field is used over the existing Socket.io flow; obtain a fresh review before publication per project protocol rules.

## Numbering

TASKS/handoff still advertise TASK-485 while actual reports exist through TASK-494. This report uses the next actual free number, TASK-495. Shared canonical numbering remains for the general coordination chat to synchronize.
