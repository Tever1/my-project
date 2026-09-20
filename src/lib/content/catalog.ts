import type { QuizQuestion, SpecialQuizInfo } from '@/types/game';

export type CheckStatus = 'unverified' | 'verified' | 'issue';
// Absent scope keeps the legacy bilingual semantics; 'ru' verifies Russian text only.
export type CheckScope = 'bilingual' | 'ru';
export type QuestionText = Pick<QuizQuestion, 'questionRu' | 'questionEn' | 'options' | 'correctIndex'>;
export interface QuestionCorrection extends QuestionText { status: 'verified' | 'unverified'; summary: string; sources: string[] }
export interface ContentCheck {
  status: CheckStatus;
  scope?: CheckScope;
  signature: string;
  checkedAt: string;
  sources: string[];
  summary: string;
  reportId?: string;
  policy?: string;
  correction?: QuestionCorrection;
}
export interface ContentQuestion extends QuizQuestion { check?: ContentCheck; approval?: { signature: string; approvedAt: string } }
export interface ContentQuiz extends SpecialQuizInfo { iconUrl: string; questions: ContentQuestion[] }
export interface ContentCharacter { id: string; ru: string; en: string; checked?: boolean }
export type WordGroup = 'alias' | 'crocodile' | 'spy';
export interface ContentWord { id: string; ru: string; en?: string; checked?: boolean }
export interface GameCatalog {
  general: ContentQuestion[];
  quizzes: ContentQuiz[];
  characters: ContentCharacter[];
  words?: Record<WordGroup, ContentWord[]>;
}
export interface ContentEnvelope { revision: string; catalog: GameCatalog }
export interface ContentDraft extends ContentEnvelope { baseRevision: string; changes: string[] }
export function checkSignature(q: Pick<QuizQuestion, 'questionRu' | 'questionEn' | 'options' | 'correctIndex'>) {
  return JSON.stringify([q.questionRu, q.questionEn, q.options, q.correctIndex]);
}
// Russian-only signature: questionRu, Russian option texts and correctIndex. English is intentionally out of scope.
export function russianCheckSignature(q: Pick<QuizQuestion, 'questionRu' | 'options' | 'correctIndex'>) {
  return JSON.stringify([q.questionRu, q.options.map(option => option.ru), q.correctIndex]);
}
// Resolve the signature a check of a given scope must match. Legacy checks without a scope stay fully bilingual.
export function scopedCheckSignature(scope: CheckScope | undefined, q: Pick<QuizQuestion, 'questionRu' | 'questionEn' | 'options' | 'correctIndex'>) {
  return scope === 'ru' ? russianCheckSignature(q) : checkSignature(q);
}
export function isCurrentCheck(q: ContentQuestion) {
  return !!q.check && q.check.signature === scopedCheckSignature(q.check.scope, q);
}
export function isCodexVerified(q: ContentQuestion) {
  const check = q.check;
  return !!check && check.status === 'verified' && check.sources.length > 0
    && check.signature === scopedCheckSignature(check.scope, q);
}
export function isVerified(q: ContentQuestion) {
  return isCodexVerified(q)
    || (q.approval?.signature === checkSignature(q));
}
export function validateQuestion(q: ContentQuestion) {
  if (!q || typeof q.id !== 'string' || !q.id || q.id.length > 200
    || typeof q.questionRu !== 'string' || !q.questionRu.trim() || q.questionRu.length > 2000
    || typeof q.questionEn !== 'string' || !q.questionEn.trim() || q.questionEn.length > 2000
    || !Array.isArray(q.options) || q.options.length !== 4
    || q.options.some(o => !o || typeof o.ru !== 'string' || !o.ru.trim() || o.ru.length > 1000
      || typeof o.en !== 'string' || !o.en.trim() || o.en.length > 1000)
    || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3
    || !['easy', 'medium', 'hard'].includes(q.difficulty)
    || !['science', 'history', 'pop-culture', 'random'].includes(q.topic)
    || !Number.isInteger(q.timeLimit) || q.timeLimit < 5 || q.timeLimit > 120) {
    throw new Error('Вопрос должен содержать ru/en, четыре ответа и правильный вариант.');
  }
}
export function validateCatalog(catalog: GameCatalog) {
  const ids = new Set<string>();
  for (const q of [...catalog.general, ...catalog.quizzes.flatMap(quiz => quiz.questions)]) {
    validateQuestion(q);
    if (ids.has(q.id)) throw new Error('Повторяющийся ID вопроса');
    ids.add(q.id);
  }
  const quizIds = new Set<string>();
  const quizNumbers = new Set<string>();
  for (const quiz of catalog.quizzes) {
    if (!/^[a-z0-9-]{1,100}$/.test(quiz.id) || quizIds.has(quiz.id) || quizNumbers.has(`${quiz.theme}:${quiz.number}`)
      || !/^[a-z0-9-]{1,100}$/.test(quiz.theme) || !quiz.titleRu?.trim() || !quiz.titleEn?.trim()
      || quiz.titleRu.length > 200 || quiz.titleEn.length > 200
      || !Number.isInteger(quiz.number) || quiz.number < 1
      || !/^\/backgrounds\/[a-zA-Z0-9_/-]+\.(png|webp|jpg|jpeg)$/.test(quiz.backgroundUrl)
      || !quiz.iconUrl.startsWith('/icons/')) throw new Error('Некорректные данные тематического квиза');
    quizIds.add(quiz.id);
    quizNumbers.add(`${quiz.theme}:${quiz.number}`);
  }
  const names = new Set<string>();
  const characterIds = new Set<string>();
  for (const character of catalog.characters) {
    if (character.checked !== undefined && typeof character.checked !== 'boolean') throw new Error('Некорректная отметка проверки');
    if (typeof character.id !== 'string' || !character.id || character.id.length > 200 || characterIds.has(character.id)
      || typeof character.ru !== 'string' || !character.ru.trim() || typeof character.en !== 'string' || !character.en.trim()
      || character.ru.length > 200 || character.en.length > 200
      || names.has(character.en.trim().toLowerCase())) throw new Error('Персонаж должен иметь уникальное имя и ru/en');
    names.add(character.en.trim().toLowerCase());
    characterIds.add(character.id);
  }
  if (catalog.words) for (const group of ['alias', 'crocodile', 'spy'] as const) {
    const words = catalog.words[group];
    if (!Array.isArray(words)) throw new Error('Некорректный список слов');
    const wordIds = new Set<string>();
    for (const word of words) {
      if (!word || typeof word.id !== 'string' || !word.id || wordIds.has(word.id)
        || typeof word.ru !== 'string' || !word.ru.trim() || word.ru.length > 200
        || (word.en !== undefined && (typeof word.en !== 'string' || word.en.length > 200))
        || (word.checked !== undefined && typeof word.checked !== 'boolean')) throw new Error('Некорректное слово');
      wordIds.add(word.id);
    }
  }
}
export function validatePlayableCatalog(catalog: GameCatalog) {
  validateCatalog(catalog);
  if (catalog.characters.length < 12) throw new Error('Для «Кто я?» нужно оставить хотя бы 12 персонажей.');
  for (const topic of ['science', 'history', 'pop-culture']) for (const difficulty of ['easy', 'medium', 'hard']) {
    if (!catalog.general.some(q => q.topic === topic && q.difficulty === difficulty)) throw new Error(`Нельзя оставить пустой банк: ${topic} / ${difficulty}`);
  }
}
export function withoutChecks(catalog: GameCatalog): GameCatalog {
  const clean = (q: ContentQuestion): ContentQuestion => {
    const { check: ignored, approval: ignoredApproval, ...question } = q;
    void ignored; void ignoredApproval;
    return question;
  };
  const { words: ignoredWords, ...publicCatalog } = catalog;
  void ignoredWords;
  return { ...publicCatalog, characters: catalog.characters.map(({ id, ru, en }) => ({ id, ru, en })), general: catalog.general.map(clean), quizzes: catalog.quizzes.filter(q => q.questions.length > 0)
    .map(quiz => ({ ...quiz, questions: quiz.questions.map(clean) })) };
}
