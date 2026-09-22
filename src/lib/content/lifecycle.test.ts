import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSignature, russianCheckSignature, type ContentQuestion } from './catalog';
import { isCurrentTranslation, questionLifecycle } from './lifecycle';

const base: ContentQuestion = { id: 'q', questionRu: 'Вопрос', questionEn: 'Question', options: ['A', 'B', 'C', 'D'].map(value => ({ ru: value, en: value })), correctIndex: 0, topic: 'random', difficulty: 'medium', timeLimit: 20 };
test('question lifecycle advances through Russian verification, translation and publication', () => {
  const question = structuredClone(base);
  assert.equal(questionLifecycle(question), 'translated');
  question.check = { status: 'verified', scope: 'ru', signature: russianCheckSignature(question), checkedAt: '2026-09-20', sources: ['https://example.org'], summary: 'ok' };
  assert.equal(questionLifecycle(question), 'ready');
  question.translation = { signature: checkSignature(question), translatedAt: '2026-09-20', model: 'test' };
  assert.equal(isCurrentTranslation(question), true);
  assert.equal(questionLifecycle(question, structuredClone(question)), 'published');
  question.questionEn = 'Changed';
  assert.equal(isCurrentTranslation(question), false);
});
