# TASK-498 — Allow Socket.io test servers to exit after room disconnects

Date: 2026-09-04

## Problem

The complete TypeScript test run executed its assertions successfully but stayed alive after Socket.io integration tests. Room inactivity and lobby reconnect timers remained referenced for five minutes after the test server disconnected its clients.

## Implementation

- `src/server/socket-handlers.mts`: call `unref()` for the five-minute room inactivity timer and the five-minute player reconnect timer.
- Timer callbacks, durations, cancellation, reconnect behavior, and room cleanup rules are unchanged. The active HTTP server still keeps the production process alive; the timers no longer keep an otherwise finished process alive by themselves.

## Verification

- `src/server/reconnect.integration.test.mts`: 12/12 passed and the process exited normally in about four seconds.
- Full discovered TypeScript suite: 93/93 passed and exited normally.
- `npx tsc --noEmit`: passed before the timer change and scheduled for the final pre-commit gate.
- `npm run lint`: passed with four existing warnings in the Mafia page and no errors before the timer change; scheduled for the final pre-commit gate.
- `git diff --check`: passed before the timer change and scheduled for the final pre-commit gate.

## Remaining publication gates

- Production build was not run because project rules require a separate explicit command and the dev server is active.
- Browser/multiplayer QA was not run as part of this ship pass.
- Fresh external Codex review was blocked by the approval policy because it would send the full uncommitted diff to an external service without explicit authorization. Local delegated reviewers were unavailable because the account usage limit was reached.

## Context

- The user explicitly authorized committing all 73 existing dirty-worktree entries, including unrelated game changes, protected documents, and the deleted Mafia image.
- The earlier `/context-save` checkpoint is `/Users/anastasiaivanova/.gstack/projects/Tever1-my-project/checkpoints/20260903-202604-spy-undo-and-voting-deadline.md` and was forwarded to `Party Games Hub — Общий прогресс`.
