'use client';
import { analyzeQuizQuality } from '@/lib/content/quality';
import { isCodexVerified, type ContentQuestion } from '@/lib/content/catalog';
import { isCurrentTranslation, questionLifecycle, QUESTION_LIFECYCLE_LABELS } from '@/lib/content/lifecycle';

export function QuizHealthPanel({ questions, published, onFilter }: { questions: ContentQuestion[]; published: ContentQuestion[]; onFilter: (ids: string[] | null) => void }) {
  const quality = analyzeQuizQuality(questions); const publishedById = new Map(published.map(question => [question.id, question]));
  const issueIds = questions.filter(question => (quality.get(question.id)?.length ?? 0) > 0).map(question => question.id);
  const counts = new Map<string, number>();
  for (const question of questions) { const state = questionLifecycle(question, publishedById.get(question.id)); counts.set(state, (counts.get(state) ?? 0) + 1); }
  const verified = questions.filter(isCodexVerified).length; const translated = questions.filter(isCurrentTranslation).length;
  const ready = questions.filter(question => ['ready', 'approved', 'published'].includes(questionLifecycle(question, publishedById.get(question.id)))).length;
  return <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4" aria-label="Здоровье квиза">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Здоровье квиза</h3><p className="mt-1 text-xs text-slate-400">Локальные проверки не используют модель и не расходуют лимиты.</p></div><button className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:bg-white/10" onClick={() => onFilter(issueIds.length ? issueIds : null)}>Показать замечания ({issueIds.length})</button></div>
    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"><Metric label="Всего" value={questions.length} /><Metric label="RU проверено" value={verified} /><Metric label="Переведено" value={translated} /><Metric label="Готово" value={ready} /></div>
    <div className="mt-3 flex flex-wrap gap-2">{[...counts].map(([state, count]) => <span key={state} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300">{QUESTION_LIFECYCLE_LABELS[state as keyof typeof QUESTION_LIFECYCLE_LABELS]} · {count}</span>)}</div>
    <div className="mt-3 grid gap-2 sm:grid-cols-3"><p className="text-[11px] text-slate-400">Лёгкие: {questions.filter(q => q.difficulty === 'easy').length}</p><p className="text-[11px] text-slate-400">Средние: {questions.filter(q => q.difficulty === 'medium').length}</p><p className="text-[11px] text-slate-400">Сложные: {questions.filter(q => q.difficulty === 'hard').length}</p></div>
  </section>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-2xl font-semibold text-white">{value}</p><p className="text-[11px] text-slate-400">{label}</p></div>; }
