export interface ReviewQuestion {
  id: string;
  questionRu: string;
  questionEn: string;
  options: { ru: string; en: string }[];
  correctIndex: number;
  difficulty?: string;
}
export type ReviewStatus = 'unverified' | 'confirmed' | 'error' | 'fixed';
export interface QuestionReview {
  question: ReviewQuestion;
  status: ReviewStatus;
  note: string;
  source: string;
  updatedAt: string;
  revision: string;
}
export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  unverified: 'Не проверен', confirmed: 'Подтверждён владельцем', error: 'Ошибка', fixed: 'Исправлен · нужна проверка',
};
export function questionSignature(question: ReviewQuestion) {
  return JSON.stringify([question.id, question.questionRu, question.questionEn, question.options, question.correctIndex]);
}
export function reviewStatusAfterEdit(previous: ReviewQuestion, current: ReviewQuestion, requested: ReviewStatus): ReviewStatus {
  return questionSignature(previous) === questionSignature(current) ? requested : 'fixed';
}
