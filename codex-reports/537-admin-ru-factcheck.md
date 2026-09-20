# TASK-537 — Russian-only admin Quiz fact-check scope

2026-09-20. Admin Quiz fact-check now works on Russian text only, uses a smaller
model, and has no fixed wall-clock kill. Legacy bilingual checks stay readable
and keep their old behavior.

## Behavior

- Fact-check model: `gpt-5.6-terra` by default, overridable only for this path
  through `ADMIN_CODEX_FACTCHECK_MODEL`. All other admin text/image calls still
  resolve `ADMIN_CODEX_MODEL` / `gpt-6-astra` and keep the 3/8-minute deadlines.
- Payload: `questionEn` and `option.en` are never sent to the model. The prompt
  states explicitly that English is outside the verification scope.
- Corrections: a Russian correction may change `questionRu`, the four Russian
  options and `correctIndex`. Applying it preserves the current `questionEn` and
  every current `option.en` exactly; model-provided English is ignored.
- Metadata: new checks are stamped `scope=ru` with a Russian-only signature
  (`questionRu` + Russian option texts + `correctIndex`). A Russian check is
  invalidated by Russian edits and survives English-only edits. Legacy checks
  without `scope` keep the full bilingual `checkSignature`.
- UI: Russian verified questions show «Проверен Codex · RU»; the proposed
  correction panel hides English for `scope=ru`. Counts, the replacement action
  and owner approval use scope-aware current-check logic.
- Batch: one content-check request is 2 questions. Confirmation request count,
  progress copy and `docs/ADMIN_CODEX.md` were updated. Successful blocks are
  still persisted immediately.
- Deadline: `codexCompletion` accepts an optional
  `{ model?, noDeadline? }`; only `content-check` passes `noDeadline: true`.
  Timer cleanup is guarded (`if (timer)`), and a nonzero CLI exit still returns
  an error. No retries or parallel requests were added.

## Changed files

- `src/lib/admin-codex.ts` — `CodexCompletionOptions`, `resolveCodexModel`,
  `factCheckCodexOptions`, `codexDeadlineMs`; optional `noDeadline` spawn path.
- `src/lib/content/catalog.ts` — `CheckScope`, `ContentCheck.scope`,
  `russianCheckSignature`, `scopedCheckSignature`, `isCurrentCheck`; scope-aware
  `isCodexVerified`. Legacy `checkSignature` unchanged.
- `src/lib/content/fact-check.ts` — `CONTENT_CHECK_BATCH_SIZE = 2`; RU-mode
  parser that hydrates English from the original question and validates answers,
  `correctIndex` and sources; scope-aware `applyQuestionCorrection` and
  `pendingQuestionChecks`.
- `src/app/api/admin/content-check/route.ts` — Russian-only payload and prompt,
  `scope=ru` checks with Russian signature, batch cap 2, fact-check model with no
  deadline, Russian-only report proposal text.
- `src/app/api/admin/content-generate/route.ts` — replacement validity is
  scope-aware; `input.signature` and the final write guard remain full
  `checkSignature` (stale-write protection unchanged).
- `src/app/api/admin/content/route.ts` — Russian checks survive English-only
  edits; approval validity is scope-aware while `approval.signature` stays full.
- `src/components/admin/ContentStudio.tsx` — 2-question batching, updated
  confirmation/progress copy, `isCurrentCheck` counts and replace condition,
  «Проверен Codex · RU» badge, English hidden in RU correction preview.
- `src/lib/admin-codex.test.ts`, `src/lib/content/russian-check.test.ts`,
  `src/lib/content/content-check-config.test.ts` — focused tests.
- `docs/ADMIN_CODEX.md`, `PROJECT_CONTEXT.md`, `TASKS.md`,
  `codex-reports/CODEX-HANDOFF.md`, this report.

`AGENTS.md`, `CLAUDE.md`, `.codex/**`, game code and the legacy
`/api/admin/fact-check` endpoint were not modified.

## Checks and results

- Focused content/admin tests: 47/47 passed.
- Full `npm test`: 212/212 passed (includes the new Russian parser, signature,
  English-preservation, legacy-compatibility, model/deadline and source-level
  wiring tests).
- `npm run typecheck` (`tsc --noEmit`): passed.
- Scoped ESLint on all changed TS/TSX: passed, 0 errors, 0 warnings.
- `git diff --check`: passed; new test files checked for trailing whitespace/tabs.

No live Codex fact-check model run, browser QA, build, server restart, commit or
push was performed.

## Codex review

Codex independently reviewed the actual TASK-537 diff and reran `npm run typecheck`,
scoped ESLint over the changed files, and 41 focused tests — all passed. This
completes the TASK-537 review.

The aggregate fresh review of TASK-531–537 is still pending before publishing the
admin changes (see below).

## Remaining risks and blockers

- No real model check or browser run: the Russian verdict shape, prompt quality
  and admin flow are unproven against the live CLI until an approved run.
- `parseRussianCorrection` hydrates English from the original question so the
  stored correction keeps a valid `QuestionCorrection` shape. The stored English
  is not authoritative: apply always re-reads the current question's English.
- The legacy `/api/admin/fact-check` endpoint is not referenced by the admin UI
  and was intentionally left on `gpt-6-astra` with its 3-minute deadline; if it
  is ever revived it should adopt `factCheckCodexOptions()`.
- The aggregate fresh review of TASK-531–537, browser QA, build and publication
  remain required before publishing the admin changes. TASK-537's own review is
  complete (see Codex review above).
