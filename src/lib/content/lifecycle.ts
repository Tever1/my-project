import { checkSignature, isCodexVerified, isCurrentCheck, type ContentQuestion } from './catalog';

export type QuestionLifecycle = 'draft' | 'checking' | 'needs-fix' | 'verified-ru' | 'translated' | 'approved' | 'ready' | 'published';
export function isCurrentTranslation(question: ContentQuestion) {
  if (question.translation) return question.translation.signature === checkSignature(question);
  return !!question.questionEn.trim() && question.questionEn !== 'Ожидает перевода'
    && question.options.every(option => option.en.trim() && option.en !== 'Ожидает перевода');
}
export function questionLifecycle(question: ContentQuestion, published?: ContentQuestion): QuestionLifecycle {
  if (published && checkSignature(published) === checkSignature(question)) return 'published';
  if (question.approval?.signature === checkSignature(question)) return 'approved';
  if (isCodexVerified(question) && isCurrentTranslation(question)) return 'ready';
  if (isCurrentTranslation(question)) return 'translated';
  if (isCodexVerified(question)) return 'verified-ru';
  if (isCurrentCheck(question) && question.check?.status !== 'verified') return 'needs-fix';
  return 'draft';
}

export const QUESTION_LIFECYCLE_LABELS: Record<QuestionLifecycle, string> = {
  draft: 'Черновик', checking: 'Проверяется', 'needs-fix': 'Нужно решение', 'verified-ru': 'Проверен Codex · RU',
  translated: 'Переведён', approved: 'Утверждён', ready: 'Готов', published: 'Опубликован',
};
