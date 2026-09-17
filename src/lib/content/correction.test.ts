import test from 'node:test';
import assert from 'node:assert/strict';
import { applyQuestionCorrection, parseCheckVerdicts, pendingQuestionChecks } from './fact-check';
import { checkSignature, isCodexVerified, type ContentQuestion, type QuestionCorrection } from './catalog';

const question: ContentQuestion = { id: 'q', questionRu: 'Неточный вопрос', questionEn: 'Imprecise question', options: ['A', 'B', 'C', 'D'].map(ru => ({ ru, en: ru })), correctIndex: 0, topic: 'history', difficulty: 'hard', timeLimit: 25 };
const correction: QuestionCorrection = { questionRu: 'Точный вопрос', questionEn: 'Precise question', options: ['A2', 'B2', 'C2', 'D2'].map(ru => ({ ru, en: ru })), correctIndex: 1, status: 'verified', summary: 'Уточнена формулировка и правильный ответ', sources: ['https://example.org/source'] };
function checked() { return { ...structuredClone(question), check: { status: 'issue' as const, signature: checkSignature(question), checkedAt: '2026-09-14', summary: 'Неточность', sources: ['https://example.org/original'], reportId: 'report', correction: structuredClone(correction) } }; }
function parse(c: QuestionCorrection) { return parseCheckVerdicts(JSON.stringify({ results: [{ id: 'q', status: 'issue', summary: 'Неточность', sources: [], correction: c }] }), ['q']); }
test('source-backed proposal parses and applies exact bilingual wording and answer', () => {
  const q = checked(); const before = checkSignature(q);
  q.check.correction = parse(correction)[0].correction!;
  applyQuestionCorrection(q, before);
  assert.equal(q.questionRu, correction.questionRu); assert.equal(q.questionEn, correction.questionEn);
  assert.deepEqual(q.options, correction.options); assert.equal(q.correctIndex, 1);
  assert.equal(q.id, 'q'); assert.equal(q.topic, 'history'); assert.equal(q.difficulty, 'hard'); assert.equal(q.timeLimit, 25);
  assert.equal(isCodexVerified(q), true); assert.equal(q.check.reportId, 'report');
  assert.equal(pendingQuestionChecks([q], [q]).length, 0);
});
test('proposal without sources is downgraded and cannot be auto-confirmed', () => {
  const q = checked(); q.check.correction = parse({ ...correction, sources: [] })[0].correction!;
  assert.equal(q.check.correction.status, 'unverified'); assert.throws(() => applyQuestionCorrection(q, checkSignature(q)));
  assert.equal(q.questionRu, question.questionRu);
});
test('invalid answers, translations and unsafe source URLs fail closed', () => {
  assert.throws(() => parse({ ...correction, options: correction.options.slice(0, 3) }));
  assert.throws(() => parse({ ...correction, questionEn: '' }));
  assert.throws(() => parse({ ...correction, correctIndex: 4 }));
  assert.throws(() => parse({ ...correction, sources: ['javascript:alert(1)'] }));
});
test('changed question, stale click and duplicate application are rejected', () => {
  const q = checked(); const old = checkSignature(q); q.questionRu += '!';
  assert.throws(() => applyQuestionCorrection(q, old));
  const current = checked(); assert.throws(() => applyQuestionCorrection(current, 'stale'));
  applyQuestionCorrection(current, old); assert.throws(() => applyQuestionCorrection(current, old));
});
test('no-op proposal is rejected and model-provided metadata cannot change question identity', () => {
  const q = checked(); q.check.correction = { ...q.check.correction, questionRu: q.questionRu, questionEn: q.questionEn, options: q.options, correctIndex: q.correctIndex };
  assert.throws(() => applyQuestionCorrection(q, checkSignature(q)));
  const parsed = parse({ ...correction, id: 'injected', check: { status: 'verified' } } as QuestionCorrection)[0];
  assert.equal('id' in parsed.correction!, false); assert.equal('check' in parsed.correction!, false);
});
