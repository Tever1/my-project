import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_CHECK_BATCH_SIZE, applyQuestionCorrection, parseCheckVerdicts, pendingQuestionChecks } from './fact-check';
import { checkSignature, isCodexVerified, isCurrentCheck, russianCheckSignature, scopedCheckSignature, type ContentQuestion } from './catalog';

const original: ContentQuestion = { id: 'q', questionRu: 'Вопрос', questionEn: 'Question', options: ['A', 'B', 'C', 'D'].map(ru => ({ ru, en: `EN ${ru}` })), correctIndex: 0, topic: 'history', difficulty: 'medium', timeLimit: 20 };

function russianCorrection(overrides: Record<string, unknown> = {}) {
  return { questionRu: 'Точный вопрос', options: ['A2', 'B2', 'C2', 'D2'].map(ru => ({ ru })), correctIndex: 1,
    status: 'verified', summary: 'Уточнена формулировка и правильный ответ', sources: ['https://example.org/source'], ...overrides };
}
function parseRu(correction: unknown, question: ContentQuestion = original) {
  return parseCheckVerdicts(JSON.stringify({ results: [{ id: question.id, status: 'issue', summary: 'Неточность', sources: [], correction }] }), [question.id], { scope: 'ru', originals: [question] })[0].correction!;
}
function checkedRussian(question: ContentQuestion = original, correction: unknown = russianCorrection()) {
  const next = structuredClone(question);
  next.check = { status: 'issue', scope: 'ru', signature: russianCheckSignature(next), checkedAt: '2026-09-20', summary: 'Неточность', sources: ['https://example.org/original'], correction: parseRu(correction, next) };
  return next;
}

test('Russian parsing hydrates English from the original and ignores model English', () => {
  const correction = parseRu({ ...russianCorrection(), questionEn: 'HACKED', options: russianCorrection().options.map((option, index) => ({ ...option, en: `HACK ${index}` })) });
  assert.equal(correction.questionRu, 'Точный вопрос');
  assert.equal(correction.questionEn, original.questionEn);
  assert.deepEqual(correction.options.map(option => option.ru), ['A2', 'B2', 'C2', 'D2']);
  assert.deepEqual(correction.options.map(option => option.en), original.options.map(option => option.en));
  assert.equal(correction.correctIndex, 1);
  assert.equal(correction.status, 'verified');
});

test('Russian parsing rejects malformed corrections and unsafe sources', () => {
  assert.throws(() => parseRu({ ...russianCorrection(), options: [{ ru: 'A' }, { ru: 'B' }, { ru: 'C' }] }));
  assert.throws(() => parseRu({ ...russianCorrection(), options: [{ ru: '' }, { ru: 'B' }, { ru: 'C' }, { ru: 'D' }] }));
  assert.throws(() => parseRu({ ...russianCorrection(), correctIndex: 4 }));
  assert.throws(() => parseRu({ ...russianCorrection(), sources: ['javascript:alert(1)'] }));
  assert.throws(() => parseRu({ ...russianCorrection(), questionRu: '' }));
  const noOriginal = JSON.stringify({ results: [{ id: 'q', status: 'issue', summary: 'n', sources: [], correction: russianCorrection() }] });
  assert.throws(() => parseCheckVerdicts(noOriginal, ['q'], { scope: 'ru' }));
});

test('Russian proposal without sources is downgraded and cannot be applied', () => {
  const correction = parseRu({ ...russianCorrection(), sources: [] });
  assert.equal(correction.status, 'unverified');
  const q = checkedRussian(original, { ...russianCorrection(), sources: [] });
  assert.throws(() => applyQuestionCorrection(q, q.check!.signature));
  assert.equal(q.questionRu, 'Вопрос');
});

test('applying a Russian correction changes Russian text and preserves current English exactly', () => {
  const q = checkedRussian();
  q.questionEn = 'English edited after the check';
  q.options[0].en = 'Option English edited after the check';
  const signature = q.check!.signature;
  applyQuestionCorrection(q, signature);
  assert.equal(q.questionRu, 'Точный вопрос');
  assert.equal(q.questionEn, 'English edited after the check');
  assert.equal(q.options[0].en, 'Option English edited after the check');
  assert.deepEqual(q.options.map(option => option.ru), ['A2', 'B2', 'C2', 'D2']);
  assert.equal(q.correctIndex, 1);
  assert.equal(q.check?.scope, 'ru');
  assert.equal(isCodexVerified(q), true);
  assert.equal(pendingQuestionChecks([q], [q]).length, 0);
});

test('Russian signature ignores English edits but is invalidated by Russian edits', () => {
  const q = checkedRussian();
  applyQuestionCorrection(q, q.check!.signature);
  assert.equal(isCurrentCheck(q), true);
  assert.equal(isCodexVerified(q), true);
  const structuredEnglish = structuredClone(q);
  structuredEnglish.questionEn = 'Changed';
  structuredEnglish.options[1].en = 'Changed';
  assert.equal(isCurrentCheck(structuredEnglish), true);
  assert.equal(isCodexVerified(structuredEnglish), true);
  assert.equal(pendingQuestionChecks([structuredEnglish], [structuredEnglish]).length, 0);
  for (const mutate of [
    (item: ContentQuestion) => { item.questionRu += '!'; },
    (item: ContentQuestion) => { item.options[2].ru += '!'; },
    (item: ContentQuestion) => { item.correctIndex = 3; },
  ]) {
    const changed = structuredClone(q); mutate(changed);
    assert.equal(isCurrentCheck(changed), false);
    assert.equal(isCodexVerified(changed), false);
    assert.equal(pendingQuestionChecks([changed], [changed]).length, 1);
  }
});

test('legacy bilingual checks keep full signature behavior and bilingual correction apply', () => {
  const legacy: ContentQuestion = { ...structuredClone(original), check: { status: 'verified', signature: checkSignature(original), checkedAt: '2026-09-20', summary: 'Верно', sources: ['https://example.org'] } };
  assert.equal(isCurrentCheck(legacy), true);
  assert.equal(isCodexVerified(legacy), true);
  const englishEdit = structuredClone(legacy); englishEdit.questionEn = 'Changed';
  assert.equal(isCodexVerified(englishEdit), false);
  const bilingual = parseCheckVerdicts(JSON.stringify({ results: [{ id: 'q', status: 'issue', summary: 'n', sources: [], correction: {
    questionRu: 'R2', questionEn: 'E2', options: ['A2', 'B2', 'C2', 'D2'].map(ru => ({ ru, en: `${ru}-EN` })), correctIndex: 2,
    status: 'verified', summary: 's', sources: ['https://example.org/source'] } }] }), ['q'])[0].correction!;
  const checked: ContentQuestion = { ...structuredClone(original), check: { status: 'issue', signature: checkSignature(original), checkedAt: '2026-09-20', summary: 'n', sources: ['https://example.org/original'], correction: bilingual } };
  applyQuestionCorrection(checked, checkSignature(checked));
  assert.equal(checked.questionEn, 'E2');
  assert.deepEqual(checked.options, bilingual.options);
  assert.equal(checked.check?.scope, undefined);
});

test('stale, duplicated and no-op Russian proposals fail closed', () => {
  const stale = checkedRussian();
  stale.questionRu += '!';
  assert.throws(() => applyQuestionCorrection(stale, stale.check!.signature));
  const q = checkedRussian();
  assert.throws(() => applyQuestionCorrection(q, 'stale-signature'));
  applyQuestionCorrection(q, q.check!.signature);
  assert.throws(() => applyQuestionCorrection(q, q.check!.signature));
  const noop = checkedRussian(original, { ...russianCorrection(), questionRu: original.questionRu, options: original.options, correctIndex: original.correctIndex });
  assert.throws(() => applyQuestionCorrection(noop, noop.check!.signature));
});

test('one content-check request is two questions by default', () => {
  assert.equal(CONTENT_CHECK_BATCH_SIZE, 2);
  assert.equal(scopedCheckSignature('ru', original), russianCheckSignature(original));
  assert.equal(scopedCheckSignature(undefined, original), checkSignature(original));
});
