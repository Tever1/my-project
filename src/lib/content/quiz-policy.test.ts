import test from 'node:test';
import assert from 'node:assert/strict';
import { quizContentPolicy, quizPolicyId, HARRY_POTTER_FILMS_POLICY, MARVEL_MCU_POLICY } from './quiz-policy';
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
  const marvel = quizContentPolicy({ theme: 'marvel', titleRu: 'Гарри Поттер', titleEn: 'Harry Potter' });
  assert.match(marvel, /только фильмы и сериалы киновселенной Marvel \(MCU\)/);
  assert.match(marvel, /Комиксы Marvel.*не являются источником/);
  assert.doesNotMatch(marvel, /восемь основных фильмов Harry Potter/);
  assert.equal(quizPolicyId({ theme: 'marvel' }), MARVEL_MCU_POLICY);
  assert.match(quizContentPolicy({ theme: 'harry-potter', titleRu: 'Другое', titleEn: 'Other' }), /только восемь/);
});
test('a thematic quiz can define its own verification profile', () => {
  const policy = quizContentPolicy({ theme: 'marvel', titleRu: 'Marvel', titleEn: 'Marvel', verificationPolicy: 'Только фильмы MCU до Endgame.' });
  assert.match(policy, /Только фильмы MCU до Endgame/);
  assert.match(policy, /Комиксы Marvel.*не являются источником/);
  assert.doesNotMatch(policy, /восемь основных фильмов Harry Potter/);
  assert.match(quizPolicyId({ theme: 'marvel', verificationPolicy: 'Только фильмы MCU до Endgame.' }) ?? '', /^marvel-mcu-v1\+custom:/);
});
test('a custom Harry Potter profile augments but cannot replace the film-only canon', () => {
  const quiz = { theme: 'harry-potter', titleRu: 'Гарри Поттер', titleEn: 'Harry Potter', verificationPolicy: 'Не использовать вопросы про даты премьер.' };
  const policy = quizContentPolicy(quiz);
  assert.match(policy, /восемь основных фильмов/);
  assert.match(policy, /Не использовать вопросы про даты премьер/);
  assert.match(quizPolicyId(quiz) ?? '', /^harry-potter-films-v1\+custom:/);
});
test('old positive verdict is rechecked under films policy; current films verdict is skipped', () => {
  const q: ContentQuestion = { id: 'q', topic: 'random', difficulty: 'medium', timeLimit: 20, questionRu: 'Вопрос', questionEn: 'Question', options: ['A', 'B', 'C', 'D'].map(ru => ({ ru, en: ru })), correctIndex: 0 };
  q.check = { status: 'verified', signature: checkSignature(q), checkedAt: '2026-09-14', summary: 'Верно', sources: ['https://example.org'] };
  assert.equal(pendingQuestionChecks([q], [q], HARRY_POTTER_FILMS_POLICY).length, 1);
  assert.equal(pendingQuestionChecks([q], [q]).length, 0);
  q.check.policy = HARRY_POTTER_FILMS_POLICY;
  assert.equal(pendingQuestionChecks([q], [q], HARRY_POTTER_FILMS_POLICY).length, 0);
});
test('old Marvel verdicts are rechecked under the MCU policy', () => {
  const q: ContentQuestion = { id: 'mv1-8', topic: 'pop-culture', difficulty: 'medium', timeLimit: 20,
    questionRu: 'Кто создал Альтрона?', questionEn: 'Who created Ultron?',
    options: ['Тони Старк и Брюс Бэннер', 'Только Тони Старк', 'Ник Фьюри', 'ГИДРА'].map(ru => ({ ru, en: ru })), correctIndex: 0 };
  q.check = { status: 'verified', signature: checkSignature(q), checkedAt: '2026-09-22', summary: 'Верно', sources: ['https://example.org'] };
  assert.equal(pendingQuestionChecks([q], [q], MARVEL_MCU_POLICY).length, 1);
  q.check.policy = MARVEL_MCU_POLICY;
  assert.equal(pendingQuestionChecks([q], [q], MARVEL_MCU_POLICY).length, 0);
});
