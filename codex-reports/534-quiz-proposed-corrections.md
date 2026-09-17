# TASK-534 — Quiz proposed corrections

2026-09-14. Branch: claude/party-games-hub-etqfF.

## Result

The content factcheck prompt requests a minimal complete bilingual correction for issue verdicts and asks Codex to verify the corrected version using opened primary sources in the same request. The structured parser validates wording, four bilingual options, answer index, correction status and HTTPS source URLs; missing sources downgrade a correction to unverified. Only allowed correction fields are retained.

The card shows the proposed wording, answers, highlighted correct answer, explanation and sources. «Исправить» is enabled only for source-backed confirmed corrections. It sends the question ID and original signature, not client-provided replacement content. The protected route uses the stored proposal and draft revision checks, rejects stale/changed/missing proposals, updates bilingual text/options/correct answer, preserves identity/topic/difficulty/time and stamps the new version verified with the proposal sources. Duplicate application is rejected. The corrected version is skipped by subsequent checks. Both correction and status remain drafts until disk synchronization; original report plus proposal remains in report history.

Changed: content catalog/fact-check helper, admin content/check routes, ContentStudio, correction tests and canonical documentation. Previous dirty work preserved; no gameplay/server socket changes.

## Verification

- 23/23 tests: correction + preceding store/follow-up tests.
- TypeScript, scoped ESLint and diff-check passed.
- New tests cover exact proposal application, preserved metadata, missing sources, invalid translations/options/URLs, stale/duplicate application, no-op proposals and discarded model-injected metadata.

## Pending and boundaries

No real Codex call or browser/multiplayer/device QA, build, restart, commit or push. A fresh review is required before publication with previous admin changes. Existing reports do not acquire proposals retroactively. If sources cannot confirm an accurate correction, it is shown as unverified and cannot be auto-confirmed by the fix button. Model source truthfulness requires actual factcheck/browser review and is not proven by parser tests.
