import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReplacement } from './replacement';
import type { ContentQuestion } from './catalog';

const original: ContentQuestion = { id: 'old', topic: 'science', difficulty: 'hard', timeLimit: 25, questionRu: 'Старый вопрос', questionEn: 'Old question', options: ['A', 'B', 'C', 'D'].map(ru => ({ ru, en: ru })), correctIndex: 0, check: { status: 'issue', signature: 'old', summary: 'Ошибка', sources: [], checkedAt: '2026-09-14' } };
const generated = { questionRu: 'Новый вопрос', questionEn: 'New question', options: ['A2', 'B2', 'C2', 'D2'].map(ru => ({ ru, en: ru })), correctIndex: 2 };
test('replacement preserves theme, difficulty and timer but has new identity and no old verdict', () => {
  const next = parseReplacement(JSON.stringify({ ...generated, topic: 'history', difficulty: 'easy', id: 'injected', check: { status: 'verified' }, approval: {} }), original, 'new', [original]);
  assert.equal(next.id, 'new'); assert.equal(next.topic, 'science'); assert.equal(next.difficulty, 'hard'); assert.equal(next.timeLimit, 25);
  assert.equal(next.check, undefined); assert.equal(next.approval, undefined); assert.equal(next.correctIndex, 2);
  assert.equal(original.id, 'old'); assert.equal(original.questionRu, 'Старый вопрос');
});
test('replacement cannot repeat old wording or another bank entry in either language', () => {
  assert.throws(() => parseReplacement(JSON.stringify({ ...generated, questionRu: '  СТАРЫЙ  вопрос ' }), original, 'new', [original]));
  const other = { ...original, questionEn: generated.questionEn };
  assert.throws(() => parseReplacement(JSON.stringify(generated), original, 'new', [original, other]));
});
test('malformed replacement fails without mutating the original', () => {
  for (const input of [{ ...generated, questionEn: '' }, { ...generated, options: [] }, { ...generated, correctIndex: 4 }]) assert.throws(() => parseReplacement(JSON.stringify(input), original, 'new', [original]));
  assert.throws(() => parseReplacement('not JSON', original, 'new', [original]));
  assert.equal(original.questionEn, 'Old question');
});
