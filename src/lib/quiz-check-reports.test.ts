import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { saveQuizCheckReport, listQuizCheckReports } from './quiz-check-reports';

test('reports survive reloading, remain separated by quiz and preserve question snapshots', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'quiz-reports-test-'));
  try {
    assert.deepEqual(await listQuizCheckReports('A', root), []);
    const input = { quizKey: 'A', label: 'Квиз A', report: 'Верно: https://example.com', questions: 'Вопрос 1: исходная формулировка' };
    const first = await saveQuizCheckReport(input, root);
    const second = await saveQuizCheckReport({ ...input, report: 'Повторная проверка' }, root);
    await saveQuizCheckReport({ ...input, quizKey: 'B' }, root);
    const loaded = await listQuizCheckReports('A', root);
    assert.equal(loaded.length, 2);
    assert.notEqual(first.id, second.id);
    assert.deepEqual(loaded.find(r => r.id === first.id), first);
    assert.equal((await listQuizCheckReports('B', root)).length, 1);
    assert.deepEqual(await listQuizCheckReports('../../other', root), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
