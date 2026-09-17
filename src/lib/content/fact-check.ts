export interface CheckVerdict { id: string; status: 'verified' | 'issue' | 'unverified'; summary: string; sources: string[]; correction?: QuestionCorrection }
export function parseCheckVerdicts(raw: string, ids: string[]): CheckVerdict[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned) as { results: CheckVerdict[] };
  if (!Array.isArray(parsed.results) || parsed.results.length !== ids.length) throw new Error('Не все вопросы получили результат');
  const seen = new Set<string>();
  for (const result of parsed.results) {
    if (!result || !ids.includes(result.id) || seen.has(result.id)
      || !['verified', 'issue', 'unverified'].includes(result.status)
      || typeof result.summary !== 'string' || result.summary.length > 4000
      || !Array.isArray(result.sources) || result.sources.length > 10
      || result.sources.some(source => { try { return typeof source !== 'string' || source.length > 2000 || new URL(source).protocol !== 'https:'; } catch { return true; } })) throw new Error('Некорректный формат проверки');
    seen.add(result.id);
    if (result.status === 'verified' && result.sources.length === 0) result.status = 'unverified';
    if (result.correction) {
      const c = result.correction;
      if (result.status !== 'issue' || !['verified', 'unverified'].includes(c.status)
        || typeof c.summary !== 'string' || c.summary.length > 4000 || !Array.isArray(c.sources) || c.sources.length > 10
        || c.sources.some(source => { try { return typeof source !== 'string' || source.length > 2000 || new URL(source).protocol !== 'https:'; } catch { return true; } })) throw new Error('Некорректное предложение исправления');
      validateQuestion({ id: result.id, topic: 'random', difficulty: 'medium', timeLimit: 20,
        questionRu: c.questionRu, questionEn: c.questionEn, options: c.options, correctIndex: c.correctIndex });
      if (!c.sources.length) c.status = 'unverified';
      result.correction = { questionRu: c.questionRu, questionEn: c.questionEn,
        options: c.options.map(o => ({ ru: o.ru, en: o.en })), correctIndex: c.correctIndex,
        status: c.status, summary: c.summary, sources: c.sources };
    }
  }
  return parsed.results;
}
import { checkSignature, isCodexVerified, validateQuestion, type ContentQuestion, type QuestionCorrection } from './catalog';

export function applyQuestionCorrection(question: ContentQuestion, signature: string) {
  const previous = question.check;
  const correction = previous?.correction;
  if (!previous || previous.status !== 'issue' || previous.signature !== checkSignature(question)
    || signature !== previous.signature || !correction || correction.status !== 'verified' || !correction.sources.length) {
    throw new Error('Предложение устарело или исправленный вариант не подтверждён источниками. Повторите проверку.');
  }
  const next: ContentQuestion = { ...question, questionRu: correction.questionRu, questionEn: correction.questionEn,
    options: correction.options.map(o => ({ ru: o.ru, en: o.en })), correctIndex: correction.correctIndex, approval: undefined };
  validateQuestion(next);
  if (checkSignature(next) === previous.signature) throw new Error('Предложение не изменяет вопрос');
  next.check = { status: 'verified', signature: checkSignature(next), checkedAt: new Date().toISOString(),
    summary: `Применено предложенное Codex исправление. ${correction.summary}`, sources: [...correction.sources], reportId: previous.reportId, policy: previous.policy };
  Object.assign(question, next);
}

export function pendingQuestionChecks(bank: ContentQuestion[], requested: ContentQuestion[], requiredPolicy?: string) {
  const seen = new Set<string>();
  for (const question of requested) {
    if (!question || seen.has(question.id) || !bank.some(q => q.id === question.id && checkSignature(q) === checkSignature(question))) {
      throw new Error('Вопросы изменились или повторяются');
    }
    seen.add(question.id);
  }
  return bank.filter(q => seen.has(q.id) && !(isCodexVerified(q) && (!requiredPolicy || q.check?.policy === requiredPolicy)));
}
