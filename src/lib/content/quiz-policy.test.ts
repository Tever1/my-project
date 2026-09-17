import test from 'node:test';
import assert from 'node:assert/strict';
import { quizContentPolicy, HARRY_POTTER_FILMS_POLICY } from './quiz-policy';
import { pendingQuestionChecks } from './fact-check';
import { checkSignature, type ContentQuestion } from './catalog';

test('Harry Potter policy is movie-only and resolves book conflicts in favor of films', () => {
  const policy = quizContentPolicy({ theme: 'harry-potter', titleRu: 'Гарри Поттер', titleEn: 'Harry Potter' });
  assert.match(policy, /восемь основных фильмов/);
  assert.match(policy, /Если фильм и книга противоречат/);
  assert.match(policy, /правильным считается вариант из фильма/);
  assert.match(policy, /Fantastic Beasts.*не являются источником/);
});
test('policy is keyed by canonical quiz theme, not a user-facing title', () => {
  assert.equal(quizContentPolicy({ theme: 'marvel', titleRu: 'Гарри Поттер', titleEn: 'Harry Potter' }), '');
  assert.match(quizContentPolicy({ theme: 'harry-potter', titleRu: 'Другое', titleEn: 'Other' }), /только восемь/);
});
test('old positive verdict is rechecked under films policy; current films verdict is skipped', () => {
  const q: ContentQuestion = { id: 'q', topic: 'random', difficulty: 'medium', timeLimit: 20, questionRu: 'Вопрос', questionEn: 'Question', options: ['A', 'B', 'C', 'D'].map(ru => ({ ru, en: ru })), correctIndex: 0 };
  q.check = { status: 'verified', signature: checkSignature(q), checkedAt: '2026-09-14', summary: 'Верно', sources: ['https://example.org'] };
  assert.equal(pendingQuestionChecks([q], [q], HARRY_POTTER_FILMS_POLICY).length, 1);
  assert.equal(pendingQuestionChecks([q], [q]).length, 0);
  q.check.policy = HARRY_POTTER_FILMS_POLICY;
  assert.equal(pendingQuestionChecks([q], [q], HARRY_POTTER_FILMS_POLICY).length, 0);
});
