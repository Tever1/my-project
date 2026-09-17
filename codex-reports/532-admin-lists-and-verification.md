# TASK-532 — Admin lists and verification follow-up

Date: 2026-09-14. Branch: `claude/party-games-hub-etqfF`.

## Result

- Restored left quiz navigation: general categories, difficulty counts and themed quiz counts, using live draft data.
- UI and protected content-check endpoint skip canonical positive Codex verdicts with sources and a matching content signature. An all-confirmed batch returns without invoking Codex. Owner approval alone is not a model verdict. Edited content can be checked again.
- Unassigned background gallery shows PNG only; assigned backgrounds and actual files are preserved.
- Who Am I supports explicit Codex character generation (1–10), staged in the draft, with unchecked initial state and manual owner checkboxes. A character name/translation edit resets its checkbox.
- Alias, Crocodile and both Spy banks use a vertical searchable list with manual checkboxes and unchecked-only filter. Spy labels distinguish drawing and discussion. Checkboxes persist through disk sync and are not exposed in public runtime content.

## Scope

`src/components/admin/ContentStudio.tsx`, `src/app/admin/page.tsx`, admin content/check/generate routes, `src/lib/content/{catalog,store,server,fact-check}.ts`, `admin-followup.test.ts`, canonical task/handoff/context documents and `docs/ADMIN_CODEX.md`.

Existing TASK-530/531 edits were retained. No production game page, server socket protocol, timer, scoring or permission code was changed in TASK-532. The words metadata does not replace indexed Alias/Crocodile/Spy runtime banks; existing separate legacy word generators are unchanged. Old drafts missing the optional words section receive baseline lists without losing their revisions or owner edits.

## Verification

- `node --import tsx --test src/lib/content/store.test.ts src/lib/content/admin-followup.test.ts`: 18/18 passed (11 existing + 7 new).
- `npx tsc --noEmit`: passed.
- Scoped ESLint for admin page, studio, content library and changed content routes: passed.
- `git diff --check`: passed.

Tests cover source-backed skip decisions, mixed batches, stale/duplicate/deleted requests, private metadata, persistent checks, disk-only publication, old-draft compatibility and the preceding catalog-store regression cases. Temporary fixtures were used; the real published catalog was not synchronized by tests.

## Not performed / next

No real model generation or live factcheck, browser/native file-picker/device/multiplayer QA, build, server restart, commit or push was performed. Exact-viewport preflight required by ui-styling remains pending explicit browser QA authorization. A fresh separate review of TASK-531/532 is required before publication. The user should verify left navigation, generation, checkbox toggles, disk sync and reload in the admin UI; source/static tests are not proof of this browser flow.
