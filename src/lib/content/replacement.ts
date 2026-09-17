import { validateQuestion, type ContentQuestion } from './catalog';

export function parseReplacement(raw: string, previous: ContentQuestion, id: string, bank: ContentQuestion[]): ContentQuestion {
  const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  const next: ContentQuestion = { id, topic: previous.topic, difficulty: previous.difficulty, timeLimit: previous.timeLimit,
    questionRu: parsed?.questionRu, questionEn: parsed?.questionEn, options: parsed?.options, correctIndex: parsed?.correctIndex };
  validateQuestion(next);
  next.options = next.options.map(o => ({ ru: o.ru, en: o.en }));
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  if (bank.some(q => normalize(q.questionRu) === normalize(next.questionRu) || normalize(q.questionEn) === normalize(next.questionEn))) throw new Error('Codex повторил существующий вопрос. Исходный вопрос сохранён.');
  return next;
}
