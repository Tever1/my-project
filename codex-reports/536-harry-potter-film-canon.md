# TASK-536 — Harry Potter film canon

2026-09-14. Explicit owner decision: Harry Potter questions use films only;
when films contradict books, the film answer is correct.

Implemented shared policy for canonical harry-potter quiz theme: eight main
films, no book/game/expanded-universe authority. The prompt applies to factcheck,
proposed correction, new question generation and replacement. Sources must
support the film version. Other quiz themes are unaffected.

New checks are stamped harry-potter-films-v1. UI and server include older positive
checks in rechecking rather than skipping them. Old corrections/manual approval
are blocked server-side until a current-policy check; applied current corrections
retain the policy. Existing question text and saved reports are not silently
rewritten, and no actual model check was run.

Changed: quiz-policy helper/tests, catalog/fact-check helper, admin content/check/
generate routes, ContentStudio and canonical/docs files. Previous work preserved.

Final relevant tests: 15/15 policy/correction/follow-up tests passed. TypeScript,
scoped ESLint and diff-check passed. No browser/model QA, restart, build, commit
or push. Film factual/source accuracy remains unproven until a real check.
Fresh review is required before publishing the admin changes.
