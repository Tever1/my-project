import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverInterruptedJobs, type AdminJob } from './admin-jobs';

const running: AdminJob = { id: '1', type: 'quiz-check', status: 'running', label: 'Проверка', input: { quizId: 'general', questionIds: ['q'] },
  createdAt: '2026-09-20', updatedAt: '2026-09-20', progress: { done: 0, total: 1, message: 'Запущено' }, attempts: 1 };
test('interrupted persistent jobs are requeued only when no runner is active', () => {
  const interrupted = structuredClone(running); assert.equal(recoverInterruptedJobs([interrupted], false), true); assert.equal(interrupted.status, 'queued');
  const active = structuredClone(running); assert.equal(recoverInterruptedJobs([active], true), false); assert.equal(active.status, 'running');
});
