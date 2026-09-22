import type { ContentQuestion } from './catalog';

export type QualityIssueCode = 'duplicate' | 'similar' | 'duplicate-options' | 'long-question' | 'long-option' | 'answer-outlier' | 'missing-translation';
export interface QualityIssue { code: QualityIssueCode; label: string; relatedId?: string }

function normalize(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function bigrams(value: string) {
  const source = normalize(value).replace(/\s+/g, ' ');
  const result = new Map<string, number>();
  for (let index = 0; index < source.length - 1; index++) result.set(source.slice(index, index + 2), (result.get(source.slice(index, index + 2)) ?? 0) + 1);
  return result;
}
export function textSimilarity(left: string, right: string) {
  const a = bigrams(left); const b = bigrams(right);
  const total = [...a.values()].reduce((sum, value) => sum + value, 0) + [...b.values()].reduce((sum, value) => sum + value, 0);
  if (!total) return normalize(left) === normalize(right) ? 1 : 0;
  let shared = 0;
  for (const [gram, count] of a) shared += Math.min(count, b.get(gram) ?? 0);
  return (2 * shared) / total;
}
export function analyzeQuestionQuality(question: ContentQuestion, bank: ContentQuestion[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const normalized = normalize(question.questionRu);
  for (const candidate of bank) {
    if (candidate.id === question.id) continue;
    const similarity = textSimilarity(question.questionRu, candidate.questionRu);
    if (normalize(candidate.questionRu) === normalized) { issues.push({ code: 'duplicate', label: 'Точный дубль вопроса', relatedId: candidate.id }); break; }
    if (normalized.length >= 24 && similarity >= 0.82) { issues.push({ code: 'similar', label: `Похож на другой вопрос (${Math.round(similarity * 100)}%)`, relatedId: candidate.id }); break; }
  }
  const options = question.options.map(option => normalize(option.ru));
  if (new Set(options).size !== options.length) issues.push({ code: 'duplicate-options', label: 'Есть одинаковые варианты ответа' });
  if (question.questionRu.length > 180) issues.push({ code: 'long-question', label: 'Вопрос длиннее 180 символов' });
  if (question.options.some(option => option.ru.length > 90)) issues.push({ code: 'long-option', label: 'Ответ длиннее 90 символов' });
  const lengths = question.options.map(option => option.ru.length).filter(Boolean);
  const correctLength = lengths[question.correctIndex] ?? 0;
  const others = lengths.filter((_, index) => index !== question.correctIndex);
  const average = others.reduce((sum, value) => sum + value, 0) / Math.max(1, others.length);
  if (average >= 4 && (correctLength > average * 2.2 || correctLength * 2.2 < average)) issues.push({ code: 'answer-outlier', label: 'Правильный ответ заметно отличается по длине' });
  if (!question.questionEn.trim() || question.options.some(option => !option.en.trim())) issues.push({ code: 'missing-translation', label: 'Нет полного английского перевода' });
  return issues;
}
export function analyzeQuizQuality(questions: ContentQuestion[]) {
  return new Map(questions.map(question => [question.id, analyzeQuestionQuality(question, questions)]));
}
