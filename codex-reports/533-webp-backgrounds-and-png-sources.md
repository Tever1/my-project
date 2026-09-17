# TASK-533 — WebP runtime backgrounds and PNG sources

2026-09-14. Branch: claude/party-games-hub-etqfF.

## Result and scope

The backgrounds GET API and admin gallery now list WebP only, including unassigned images. Source directories are excluded. The quiz file chooser accepts WebP; save-quiz and disk synchronization reject non-WebP selections without silently changing old drafts.

The protected save-image endpoint uses a new background-files helper to save a byte-identical PNG under public/backgrounds/sources/<theme>/ and a quality-80 WebP under public/backgrounds/<theme>/. Conversion retains dimensions. One model-generated image is used, not two model calls. Both outputs use exclusive writes; a collision/error on WebP removes only this request's newly created PNG and preserves existing files. Decode/format/dimensions/static-frame validation is applied before writes. A log-write failure returns successful saved paths with a warning instead of implying the images failed to save.

Eight existing PNG files were moved without overwrite to sources (four root originals and four thematic copies). No asset was deleted; WebP aliases and runtime URLs remain unchanged. Prior references were searched in src, content and data and no actual PNG quiz-background reference was found. Existing source duplicates are deliberately retained rather than silently deduplicated.

Changed: src/lib/background-files.ts and tests, admin save-image/backgrounds/content routes, admin page and ContentStudio, canonical context/tasks/handoff and docs/ADMIN_CODEX.md. PNG relocation is an explicit asset-only change. Production game logic and Socket.io code were not changed.

## Verification

- Background pair + existing store/follow-up tests: 22/22 passed.
- TypeScript and scoped ESLint: passed.
- git diff --check: passed.
- Direct read-only invocation of gallery GET: four thematic WebP entries, no PNG or sources.
- Source inventory: eight PNGs remain under sources; existing WebPs retained.

Pair tests cover format/dimensions, byte-identical source, duplicate protection, partial-save cleanup and invalid input. Temporary fixtures only; no real generation was run.

## Pending

No browser/native picker/multiplayer/device QA, model call, restart, build, commit or push. A fresh review is required before publication with the preceding admin changes. Browser flow generation → save → WebP selection → disk sync remains pending authorization. Existing legacy optimizer scripts are not part of this admin workflow and were not rewritten. Source moves are reversible by moving the PNG files back to their previous paths.
