import { isCodexVerified, scopedCheckSignature, validateQuestion, type CheckScope, type ContentCheck, type ContentQuestion, type QuestionCorrection } from './catalog';

// One content-check request is deliberately small so a Russian verdict arrives quickly.
export const CONTENT_CHECK_BATCH_SIZE = 2;

export interface CheckVerdict { id: string; status: 'verified' | 'issue' | 'unverified'; summary: string; sources: string[]; correction?: QuestionCorrection }

interface RawCorrection {
  status?: unknown; summary?: unknown; sources?: unknown;
  questionRu?: unknown; questionEn?: unknown; options?: unknown; correctIndex?: unknown;
}

export interface CheckParseOptions {
  scope?: CheckScope;
  // Russian checks hydrate the English half from the original question so the stored shape stays valid without trusting model English.
  originals?: ContentQuestion[];
}

function validSources(sources: unknown): sources is string[] {
  return Array.isArray(sources) && sources.length <= 10
    && sources.every(source => { try { return typeof source === 'string' && source.length <= 2000 && new URL(source).protocol === 'https:'; } catch { return false; } });
}

function correctionEnvelope(result: CheckVerdict): RawCorrection {
  const correction = result.correction as unknown as RawCorrection;
  if (result.status !== 'issue' || !['verified', 'unverified'].includes(correction.status as string)
    || typeof correction.summary !== 'string' || correction.summary.length > 4000 || !validSources(correction.sources)) {
    throw new Error('Некорректное предложение исправления');
  }
  return correction;
}

function parseBilingualCorrection(result: CheckVerdict): QuestionCorrection {
  const c = correctionEnvelope(result);
  if (typeof c.questionRu !== 'string' || typeof c.questionEn !== 'string' || !Array.isArray(c.options)) throw new Error('Некорректное предложение исправления');
  const options = c.options.map(option => ({ ru: (option as { ru?: unknown })?.ru, en: (option as { en?: unknown })?.en })) as { ru: string; en: string }[];
  validateQuestion({ id: result.id, topic: 'random', difficulty: 'medium', timeLimit: 20,
    questionRu: c.questionRu, questionEn: c.questionEn, options, correctIndex: c.correctIndex as number });
  const correction: QuestionCorrection = { questionRu: c.questionRu, questionEn: c.questionEn,
    options, correctIndex: c.correctIndex as number,
    status: c.status as 'verified' | 'unverified', summary: c.summary as string, sources: c.sources as string[] };
  if (!correction.sources.length) correction.status = 'unverified';
  return correction;
}

function parseRussianCorrection(result: CheckVerdict, original?: ContentQuestion): QuestionCorrection {
  const c = correctionEnvelope(result);
  if (!original || typeof c.questionRu !== 'string' || !Array.isArray(c.options)) throw new Error('Некорректное предложение исправления');
  // Any English the model returns is intentionally ignored; the current question supplies it.
  const options = c.options.map((option, index) => ({ ru: (option as { ru?: unknown })?.ru, en: original.options[index]?.en })) as { ru: string; en: string }[];
  validateQuestion({ id: result.id, topic: 'random', difficulty: 'medium', timeLimit: 20,
    questionRu: c.questionRu, questionEn: original.questionEn, options, correctIndex: c.correctIndex as number });
  const correction: QuestionCorrection = { questionRu: c.questionRu, questionEn: original.questionEn,
    options, correctIndex: c.correctIndex as number,
    status: c.status as 'verified' | 'unverified', summary: c.summary as string, sources: c.sources as string[] };
  if (!correction.sources.length) correction.status = 'unverified';
  return correction;
}

export function parseCheckVerdicts(raw: string, ids: string[], options: CheckParseOptions = {}): CheckVerdict[] {
  const scope = options.scope ?? 'bilingual';
  const originals = new Map((options.originals ?? []).map(question => [question.id, question]));
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned) as { results: CheckVerdict[] };
  if (!Array.isArray(parsed.results) || parsed.results.length !== ids.length) throw new Error('Не все вопросы получили результат');
  const seen = new Set<string>();
  for (const result of parsed.results) {
    if (!result || !ids.includes(result.id) || seen.has(result.id)
      || !['verified', 'issue', 'unverified'].includes(result.status)
      || typeof result.summary !== 'string' || result.summary.length > 4000
      || !validSources(result.sources)) throw new Error('Некорректный формат проверки');
    seen.add(result.id);
    if (result.status === 'verified' && result.sources.length === 0) result.status = 'unverified';
    if (result.correction) {
      result.correction = scope === 'ru' ? parseRussianCorrection(result, originals.get(result.id)) : parseBilingualCorrection(result);
    }
  }
  return parsed.results;
}

export function applyQuestionCorrection(question: ContentQuestion, signature: string) {
  const previous = question.check;
  const correction = previous?.correction;
  const currentSignature = previous ? scopedCheckSignature(previous.scope, question) : '';
  if (!previous || previous.status !== 'issue' || previous.signature !== currentSignature
    || signature !== previous.signature || !correction || correction.status !== 'verified' || !correction.sources.length) {
    throw new Error('Предложение устарело или исправленный вариант не подтверждён источниками. Повторите проверку.');
  }
  const next: ContentQuestion = previous.scope === 'ru'
    // Russian-only corrections may change the Russian text, Russian options and correctIndex; English is preserved exactly.
    ? { ...question, questionRu: correction.questionRu,
        options: question.options.map((option, index) => ({ ru: correction.options[index]!.ru, en: option.en })),
        correctIndex: correction.correctIndex, approval: undefined }
    : { ...question, questionRu: correction.questionRu, questionEn: correction.questionEn,
        options: correction.options.map(option => ({ ru: option.ru, en: option.en })), correctIndex: correction.correctIndex, approval: undefined };
  validateQuestion(next);
  const nextSignature = scopedCheckSignature(previous.scope, next);
  if (nextSignature === previous.signature) throw new Error('Предложение не изменяет вопрос');
  const check: ContentCheck = { status: 'verified', signature: nextSignature, checkedAt: new Date().toISOString(),
    summary: `Применено предложенное Codex исправление. ${correction.summary}`, sources: [...correction.sources], reportId: previous.reportId, policy: previous.policy };
  if (previous.scope) check.scope = previous.scope;
  next.check = check;
  Object.assign(question, next);
}

export function pendingQuestionChecks(bank: ContentQuestion[], requested: ContentQuestion[], requiredPolicy?: string) {
  const seen = new Set<string>();
  for (const question of requested) {
    if (!question || seen.has(question.id)) throw new Error('Вопросы изменились или повторяются');
    const current = bank.find(q => q.id === question.id);
    const scope = current?.check?.scope;
    if (!current || scopedCheckSignature(scope, current) !== scopedCheckSignature(scope, question)) throw new Error('Вопросы изменились или повторяются');
    seen.add(question.id);
  }
  return bank.filter(q => seen.has(q.id) && !(isCodexVerified(q) && (!requiredPolicy || q.check?.policy === requiredPolicy)));
}
