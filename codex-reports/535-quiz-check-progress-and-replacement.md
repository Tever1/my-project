# TASK-535 — Quiz check progress and replacement

2026-09-14. Branch: claude/party-games-hub-etqfF.

## Result

ContentStudio now renders a native accessible progress element and «Проверено X из Y» during sequential factcheck batches. Counts advance from saved server applied/skipped results, not elapsed time; stopped requests retain reached progress. Already-confirmed skipped entries are displayed separately. Overall completed-check count and positive-confirmation count are distinct: an issue verdict counts as having undergone checking, not as approved.

Checked issue/unverified cards expose «Заменить вопрос». After explicit confirmation, the protected content-generate route creates one different bilingual question in the same general topic or themed quiz, preserving difficulty and time. It validates the current draft revision, checked signature and eligibility before invoking Codex. A strict parser validates four options/answer/translation and rejects exact normalized text duplicates in either language throughout the bank. Only authorized generated fields are retained; the new question has a new server ID, no prior check/approval/proposal, and replaces the old slot in the draft. A conflict/error preserves the old question; conflict responses include generated text for recovery. Publication remains through disk sync; new verification is required.

The prompt excludes existing questions of the same topic/difficulty to keep the request proportional; output duplicate validation still covers the entire bank. Semantic theme adherence and factual correctness are model behavior, not proven by a structural parser.

Changed: ContentStudio, content-generate route, replacement helper/tests, TASKS/handoff and ADMIN_CODEX documentation. Previous dirty changes preserved. No game flow, Socket.io or runtime timer code changed.

## Verification and pending

- 26/26 tests: 3 replacement tests plus 23 prior correction/store/follow-up tests.
- TypeScript, scoped ESLint and diff-check passed.
- The later prompt-only exclusion narrowing does not change parsed data/control flow.

No actual model call, browser/device/multiplayer QA, build, restart, commit or push. ui-styling influenced native accessible progress/feedback; its exact-viewport preflight is pending explicit browser QA authorization. Fresh review with preceding admin changes remains required before publication.
