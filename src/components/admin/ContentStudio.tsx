'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { adminFetch } from '@/lib/admin-fetch';
import { useContentWorkspace } from './ContentWorkspace';
import { QuizCheckReports } from './QuizCheckReports';
import { isVerified as baseIsVerified, isCodexVerified, isCurrentCheck, checkSignature, type ContentQuestion, type ContentQuiz, type GameCatalog } from '@/lib/content/catalog';
import { CONTENT_CHECK_BATCH_SIZE } from '@/lib/content/fact-check';
import { quizPolicyId } from '@/lib/content/quiz-policy';
import { ContentJobsPanel, useContentJobs } from './ContentJobsPanel';
import { QuizHealthPanel } from './QuizHealthPanel';
import { QuestionPreview } from './QuestionPreview';
import { QuestionHistory } from './QuestionHistory';
import { analyzeQuizQuality } from '@/lib/content/quality';
import { questionLifecycle, QUESTION_LIFECYCLE_LABELS } from '@/lib/content/lifecycle';

interface Background { filename: string; url: string; group: string; sha256: string }
const field = 'mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm';
const button = 'rounded-xl border border-white/15 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40';
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

export function ContentStudio() {
  const { draft, busy, act, reload, message: workspaceMessage } = useContentWorkspace();
  const [selected, setSelected] = useState('general');
  const [topic, setTopic] = useState('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<ContentQuestion | null>(null);
  const [quizEditing, setQuizEditing] = useState<ContentQuiz | null>(null);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(5);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qualityIds, setQualityIds] = useState<string[] | null>(null);
  const [preview, setPreview] = useState<ContentQuestion | null>(null);
  const [historyQuestion, setHistoryQuestion] = useState<ContentQuestion | null>(null);
  const [published, setPublished] = useState<GameCatalog | null>(null);
  const questionDialog = useRef<HTMLDialogElement>(null);
  const quizDialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing && questionDialog.current && !questionDialog.current.open) questionDialog.current.showModal(); }, [editing]);
  useEffect(() => { if (quizEditing && quizDialog.current && !quizDialog.current.open) quizDialog.current.showModal(); }, [quizEditing]);
  useEffect(() => { adminFetch('/api/admin/backgrounds').then(r => r.json()).then(data => setBackgrounds(data.files ?? [])); }, []);
  useEffect(() => { fetch('/api/content', { cache: 'no-store' }).then(response => response.json()).then(data => setPublished(data.catalog ?? null)).catch(() => {}); }, []);
  const jobCompleted = useCallback(() => { void reload(); }, [reload]);
  const { jobs, enqueue, command, error: jobsError } = useContentJobs(jobCompleted);
  if (!draft) return <p className="text-sm text-slate-400">Войдите в админку и нажмите «Обновить» для загрузки черновиков.</p>;
  const quiz = draft.catalog.quizzes.find(q => q.id === selected);
  const requiredPolicy = quizPolicyId(quiz);
  const isVerified = (q: ContentQuestion) => baseIsVerified(q) && (!requiredPolicy || q.check?.policy === requiredPolicy);
  const questions = selected === 'general' ? draft.catalog.general.filter(q => topic === 'all' || q.topic === topic) : quiz?.questions ?? [];
  const quizKey = selected === 'general' ? `general:${topic}:all` : `special:${selected}`;
  const activeCheckIds = new Set(jobs.filter(job => job.type === 'quiz-check' && ['queued', 'running'].includes(job.status))
    .flatMap(job => job.input.questionIds ?? []));
  const quality = analyzeQuizQuality(questions);
  const publishedQuestions = selected === 'general' ? published?.general ?? [] : published?.quizzes.find(item => item.id === selected)?.questions ?? [];
  const filtered = questions.filter(q => {
    const matches = `${q.questionRu} ${q.questionEn}`.toLowerCase().includes(search.toLowerCase());
    return (!qualityIds || qualityIds.includes(q.id)) && matches && (filter === 'all' || (filter === 'verified' ? isVerified(q)
      : filter === 'issue' ? q.check?.status === 'issue' : !isVerified(q)));
  });
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 30) - 1));
  const visible = filtered.slice(currentPage * 30, currentPage * 30 + 30);
  const isCurrentCodexVerified = (q: ContentQuestion) => isCodexVerified(q) && (!requiredPolicy || q.check?.policy === requiredPolicy);
  const pendingCheck = filtered.filter(q => !isCurrentCodexVerified(q));
  function newQuestion() {
    setEditing({ id: `q-${crypto.randomUUID()}`, questionRu: '', questionEn: '', options: Array.from({ length: 4 }, () => ({ ru: '', en: '' })),
      correctIndex: 0, topic: selected === 'general' ? 'science' : 'random', difficulty: 'medium', timeLimit: 20 });
  }
  function newQuiz() {
    setQuizEditing({ id: `quiz-${crypto.randomUUID()}`, theme: '', number: 1, titleRu: '', titleEn: '', icon: '', iconUrl: '/icons/games/quiz.png', backgroundUrl: '', questions: [] });
  }
  async function check(items: ContentQuestion[]) {
    items = items.filter(q => !isCurrentCodexVerified(q));
    if (!items.length) { setMessage('Все выбранные вопросы уже подтверждены Codex с источниками. Повторная проверка не нужна.'); return; }
    const requests = Math.ceil(items.length / CONTENT_CHECK_BATCH_SIZE);
    if (!window.confirm(`Добавить в очередь проверку ${items.length} вопросов?\n\nМодель: gpt-5.6-terra\nЗапросов: ${requests}\nОриентир: 2–6 минут на блок, без жёсткого таймаута.\nПроверяется только русский оригинал.`)) return;
    try {
      await enqueue('quiz-check', { quizId: selected, questionIds: items.map(item => item.id), reportKey: quizKey,
        reportLabel: quiz?.titleRu ?? (topic === 'all' ? 'Общий квиз' : `Общий квиз · ${topic}`) });
      setMessage('Проверка добавлена в постоянную очередь. Можно переключить вкладку или обновить страницу.');
    } catch (error) { setMessage((error as Error).message); }
  }
  async function replaceQuestion(question: ContentQuestion) {
    if (!window.confirm('Заменить этот вопрос новым в той же тематике? Это один запрос к Codex и расход лимитов. Новый вопрос нужно будет проверить; замена сохранится в игре только после дискеты.')) return;
    setWorking(true); setMessage('Codex создаёт замену вопроса…');
    try {
      const response = await adminFetch('/api/admin/content-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizId: selected, replaceId: question.id, signature: checkSignature(question), count: 1, revision: draft!.revision }) });
      const data = await response.json();
      if (!response.ok) { setMessage(`${data.error}${data.generated ? `\nСгенерированный вариант:\n${JSON.stringify(data.generated, null, 2)}` : ''}`); return; }
      await reload(); setMessage('Вопрос заменён в черновике. Новый вариант пока не проверен. Проверьте его и сохраните дискетой.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setWorking(false); }
  }
  async function generate() {
    if (!quiz) return;
    if (!window.confirm(`Добавить создание ${count} вопросов в очередь?\n\nМодель: gpt-6-astra\nЗапросов: 1\nСначала создаётся русский оригинал; перевод запускается после проверки.`)) return;
    try {
      await enqueue('quiz-generate', { quizId: selected, count }); setMessage('Генерация добавлена в очередь.');
    } catch (error) { setMessage((error as Error).message); }
  }
  async function translate(items: ContentQuestion[]) {
    const eligible = items.filter(isCurrentCodexVerified);
    if (!eligible.length) { setMessage('Сначала подтвердите русский оригинал выбранных вопросов.'); return; }
    if (!window.confirm(`Перевести ${eligible.length} проверенных вопросов?\n\nМодель: gpt-5.6-terra\nЗапросов: ${Math.ceil(eligible.length / 5)}\nФакты повторно не проверяются.`)) return;
    try { await enqueue('quiz-translate', { quizId: selected, questionIds: eligible.map(item => item.id) }); setMessage('Перевод добавлен в очередь.'); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function bulk(operation: string, value?: string) {
    const ids = [...selectedIds]; if (!ids.length) return;
    if (operation === 'delete' && !window.confirm(`Удалить ${ids.length} выбранных вопросов из черновика?`)) return;
    if (await act('bulk-question', { quizId: selected, ids, operation, value })) { setSelectedIds(new Set()); setQualityIds(null); }
  }
  return <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="space-y-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto lg:self-start" aria-label="Готовые квизы и категории">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Готовые квизы</h2>
      {([['all', 'Все общие вопросы'], ['science', 'Наука'], ['history', 'История'], ['pop-culture', 'Поп-культура']] as const).map(([key, title]) => {
        const bank = draft.catalog.general.filter(q => key === 'all' || q.topic === key);
        return <button key={key} aria-pressed={selected === 'general' && topic === key} className={`w-full rounded-2xl border p-4 text-left ${selected === 'general' && topic === key ? 'border-indigo-300/40 bg-indigo-300/10' : 'border-white/10 bg-white/5'}`} onClick={() => { setSelected('general'); setTopic(key); setPage(0); setSearch(''); }}>
          <span className="flex justify-between gap-2 text-sm font-semibold"><span>{title}</span><span className="text-indigo-200">{bank.length}</span></span>
          <span className="mt-2 block text-[10px] text-slate-400">Лёгкие {bank.filter(q => q.difficulty === 'easy').length} · Средние {bank.filter(q => q.difficulty === 'medium').length} · Сложные {bank.filter(q => q.difficulty === 'hard').length}</span>
        </button>;
      })}
      <h3 className="pt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Тематические</h3>
      {draft.catalog.quizzes.map(q => <button key={q.id} aria-pressed={selected === q.id} className={`w-full rounded-2xl border p-4 text-left ${selected === q.id ? 'border-indigo-300/40 bg-indigo-300/10' : 'border-white/10 bg-white/5'}`} onClick={() => { setSelected(q.id); setPage(0); setSearch(''); }}><span className="flex justify-between gap-2 text-sm font-semibold"><span>{q.titleRu} · №{q.number}</span><span className="text-indigo-200">{q.questions.length}</span></span><span className="mt-2 block text-[10px] text-slate-400">{q.theme} · Проверено {q.questions.filter(isVerified).length}</span></button>)}
    </aside>
    <div className="min-w-0">
    <ContentJobsPanel jobs={jobs} error={jobsError} onCommand={command} />
    <QuizHealthPanel questions={questions} published={publishedQuestions} onFilter={ids => { setQualityIds(ids); setPage(0); }} />
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <select aria-label="Квиз" className={`${field} !mt-0 max-w-md`} value={selected} onChange={event => { setSelected(event.target.value); setMessage(''); setPage(0); setSelectedIds(new Set()); setQualityIds(null); }}>
        <option value="general">Общие вопросы ({draft.catalog.general.length})</option>{draft.catalog.quizzes.map(q => <option key={q.id} value={q.id}>{q.titleRu} · №{q.number} ({q.questions.length})</option>)}
      </select><button disabled={busy || working} className={button} onClick={newQuiz}>Создать тематический квиз</button>
      {quiz && <><button disabled={busy || working} className={button} onClick={() => setQuizEditing(structuredClone(quiz))}>Настройки квиза и фон</button>
        <button disabled={busy || working} className={`${button} text-red-300`} onClick={async () => {
          if (window.confirm(`Удалить «${quiz.titleRu}» и все его вопросы? Удаление применится только после дискеты.`) && await act('delete-quiz', { id: quiz.id })) setSelected('general');
        }}>Удалить квиз</button></>}
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input aria-label="Поиск вопросов" placeholder="Поиск вопросов…" className={`${field} !mt-0 max-w-sm`} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      <select aria-label="Статус проверки" className={`${field} !mt-0 max-w-xs`} value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}><option value="all">Все статусы</option><option value="verified">Проверены</option><option value="unverified">Нужна проверка</option><option value="issue">Есть замечания</option></select>
      <span className="text-xs text-slate-400">Прошли проверку Codex: {questions.filter(isCurrentCheck).length} / {questions.length} · Подтверждено: {questions.filter(isVerified).length}</span>
      {qualityIds && <button className={button} onClick={() => setQualityIds(null)}>Сбросить локальные замечания</button>}
    </div>
    <div className="mb-5 flex flex-wrap items-center gap-2"><button disabled={busy || working} className={button} onClick={newQuestion}>Добавить вопрос</button>
      <button disabled={busy || working || !pendingCheck.length} className={button} onClick={() => void check(pendingCheck)}>Проверить список ({pendingCheck.length})</button>
      <QuizCheckReports quizKey={quizKey} />
      {quiz && <><label className="text-xs text-slate-400">Количество<input aria-label="Количество генерируемых вопросов" className={`${field} !mt-0 ml-2 !w-16`} type="number" min={1} max={10} value={count} onChange={e => setCount(Number(e.target.value))} /></label><button disabled={busy || working} className={button} onClick={() => void generate()}>Создать вопросы через Codex</button></>}
    </div>
    <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/15 p-3" aria-label="Массовые действия">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={visible.length > 0 && visible.every(item => selectedIds.has(item.id))} onChange={event => setSelectedIds(previous => { const next = new Set(previous); for (const item of visible) { if (event.target.checked) next.add(item.id); else next.delete(item.id); } return next; })} />Выбрать страницу</label>
      <span className="text-xs text-slate-500">Выбрано: {selectedIds.size}</span>
      <button className={button} disabled={!selectedIds.size} onClick={() => void check(questions.filter(item => selectedIds.has(item.id)))}>Проверить</button>
      <button className={button} disabled={!selectedIds.size} onClick={() => void translate(questions.filter(item => selectedIds.has(item.id)))}>Перевести</button>
      <button className={button} disabled={!selectedIds.size} onClick={() => void bulk('approve')}>Утвердить</button>
      <select aria-label="Массовая сложность" className={`${field} !mt-0 !w-auto`} defaultValue="" disabled={!selectedIds.size} onChange={event => { if (event.target.value) void bulk('difficulty', event.target.value); event.target.value = ''; }}><option value="">Сложность…</option><option value="easy">Лёгкие</option><option value="medium">Средние</option><option value="hard">Сложные</option></select>
      {selected === 'general' && <select aria-label="Массовая тема" className={`${field} !mt-0 !w-auto`} defaultValue="" disabled={!selectedIds.size} onChange={event => { if (event.target.value) void bulk('topic', event.target.value); event.target.value = ''; }}><option value="">Тема…</option><option value="science">Наука</option><option value="history">История</option><option value="pop-culture">Поп-культура</option></select>}
      <button className={`${button} text-red-200`} disabled={!selectedIds.size} onClick={() => void bulk('delete')}>Удалить</button>
    </section>
    {message && <p role="status" className="mb-4 whitespace-pre-wrap break-words rounded-xl border border-indigo-200/20 p-3 text-xs text-indigo-100">{message}</p>}
    {filtered.length > 30 && <div className="mb-4 flex items-center gap-3"><button className={button} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Назад</button><span className="text-xs text-slate-400">Страница {currentPage + 1} / {Math.ceil(filtered.length / 30)}</span><button className={button} disabled={(currentPage + 1) * 30 >= filtered.length} onClick={() => setPage(currentPage + 1)}>Далее</button></div>}
    <div className="grid gap-3 xl:grid-cols-2">{visible.map(q => { const lifecycle = activeCheckIds.has(q.id) ? 'checking' : questionLifecycle(q, publishedQuestions.find(item => item.id === q.id)); const issues = quality.get(q.id) ?? []; return <article key={q.id} className={`rounded-2xl border bg-white/5 p-4 ${selectedIds.has(q.id) ? 'border-cyan-300/50' : 'border-white/10'}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" aria-label={`Выбрать вопрос: ${q.questionRu}`} checked={selectedIds.has(q.id)} onChange={event => setSelectedIds(previous => { const next = new Set(previous); if (event.target.checked) next.add(q.id); else next.delete(q.id); return next; })} /><span className={`rounded-full border px-3 py-1 text-[11px] ${isVerified(q) ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : q.check?.status === 'issue' ? 'border-red-300/30 bg-red-300/10 text-red-200' : 'border-amber-300/30 bg-amber-300/10 text-amber-200'}`}>{lifecycle === 'verified-ru' ? 'Проверен Codex · RU' : QUESTION_LIFECYCLE_LABELS[lifecycle]}</span></label>
        <span className="text-[10px] text-slate-400">{q.difficulty} · {q.topic}</span></div>
      <h3 className="text-sm font-semibold">{q.questionRu}</h3><p className="mt-1 text-xs text-slate-400">{q.questionEn}</p>
      <ol className="mt-3 space-y-1 text-xs">{q.options.map((o, i) => <li key={i} className={`rounded-lg px-3 py-2 ${i === q.correctIndex ? 'bg-emerald-300/10 text-emerald-200' : 'bg-black/10 text-slate-400'}`}>{String.fromCharCode(65 + i)} · {o.ru}<span className="block opacity-70">{o.en}</span></li>)}</ol>
      {!!issues.length && <div className="mt-3 flex flex-wrap gap-1">{issues.map(issue => <span key={`${issue.code}-${issue.relatedId ?? ''}`} className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] text-amber-100">{issue.label}</span>)}</div>}
      {q.check && <details className="mt-3 text-xs text-slate-400"><summary className="cursor-pointer">Проверка · {new Date(q.check.checkedAt).toLocaleString('ru-RU')}</summary><p className="mt-2">{q.check.summary}</p>{q.check.sources.map(source => <a key={source} href={source} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-blue-200 underline">{source}</a>)}</details>}
      {requiredPolicy && q.check && q.check.policy !== requiredPolicy && <p className="mt-3 text-xs text-amber-200">Профиль проверки изменился: вопрос нужно перепроверить.</p>}
      {q.check?.correction && <section className="mt-4 rounded-xl border border-indigo-300/30 bg-indigo-300/5 p-3" aria-label="Предлагаемое исправление Codex">
        <h4 className="text-sm font-semibold text-indigo-100">Предлагаемое исправление{q.check.scope === 'ru' ? ' · RU' : ''}</h4><p className="mt-2 text-xs text-slate-300">{q.check.correction.summary}</p>
        <p className="mt-3 text-sm font-semibold">{q.check.correction.questionRu}</p>{q.check.scope !== 'ru' && <p className="mt-1 text-xs text-slate-400">{q.check.correction.questionEn}</p>}
        <ol className="mt-3 space-y-1 text-xs">{q.check.correction.options.map((o, i) => <li key={i} className={`rounded-lg px-2 py-2 ${i === q.check!.correction!.correctIndex ? 'bg-emerald-300/10 text-emerald-200' : 'text-slate-400'}`}>{String.fromCharCode(65 + i)} · {o.ru}{q.check!.scope !== 'ru' && <span className="block opacity-70">{o.en}</span>}</li>)}</ol>
        {q.check.correction.sources.map(source => <a key={source} href={source} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-xs text-blue-200 underline">{source}</a>)}
        <div className="mt-3 flex flex-wrap items-center gap-2"><button className={`${button} bg-indigo-200/10 text-indigo-100`} disabled={busy || working || q.check.correction.status !== 'verified'} onClick={() => void act('fix-question', { quizId: selected, id: q.id, signature: q.check!.signature })}>Исправить</button><span className="text-[11px] text-slate-400">{q.check.correction.status === 'verified' ? 'После применения: «Проверен Codex». Запись в игру — через дискету.' : 'Исправление пока не подтверждено источниками. Повторите проверку или отредактируйте вручную.'}</span></div>
      </section>}
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy || working} className={button} onClick={() => setEditing(structuredClone(q))}>Редактировать</button><button className={button} onClick={() => setPreview(q)}>Preview</button><button className={button} onClick={() => setHistoryQuestion(q)}>История</button><button disabled={busy || working || isCurrentCodexVerified(q)} className={button} onClick={() => void check([q])}>{isCurrentCodexVerified(q) ? 'Уже проверен' : requiredPolicy && isCodexVerified(q) ? 'Перепроверить по профилю' : 'Проверить'}</button>
        <button disabled={!isCurrentCodexVerified(q)} className={button} onClick={() => void translate([q])}>Перевести</button>
        <QuizCheckReports quizKey={quizKey} questionId={q.id} />
        {q.check && q.check.status !== 'verified' && isCurrentCheck(q) && <button disabled={busy || working} className={`${button} text-indigo-200`} onClick={() => void replaceQuestion(q)}>Заменить вопрос</button>}
        {q.check && !isVerified(q) && q.check.sources.length > 0 && <button disabled={busy || working} className={`${button} text-emerald-200`} onClick={() => { if (window.confirm(`Утвердить вопрос несмотря на результат Codex?\n${q.check!.summary}\nРешение владельца будет сохранено отдельно от отчёта.`)) void act('approve-question', { quizId: selected, id: q.id }); }}>Утвердить вручную</button>}
        <button disabled={busy || working} className={`${button} text-red-300`} onClick={() => { if (window.confirm('Удалить вопрос из черновика? В игровом файле он останется до сохранения дискетой.')) void act('delete-question', { quizId: selected, id: q.id }); }}>Удалить</button></div>
    </article>; })}</div>
    {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Вопросов пока нет. Добавьте вручную или создайте через Codex.</p>}
    {preview && <QuestionPreview question={preview} onClose={() => setPreview(null)} />}
    {historyQuestion && <QuestionHistory quizId={selected} question={historyQuestion} revision={draft.revision} onRestored={reload} onClose={() => setHistoryQuestion(null)} />}
    {editing && <dialog ref={questionDialog} onClose={() => setEditing(null)} className="m-auto max-h-[90vh] w-[min(700px,calc(100%-2rem))] overflow-auto rounded-2xl border border-white/15 bg-slate-950 p-6 text-white backdrop:bg-black/80">
      <form onSubmit={async e => { e.preventDefault(); if (await act('save-question', { quizId: selected, question: editing })) setEditing(null); }} className="space-y-3">
        <h2 className="text-xl font-semibold">Редактор вопроса</h2><p className="text-xs text-slate-400">Правки остаются в черновике. Любое изменение сбрасывает проверку.</p>
        {(['questionRu', 'questionEn'] as const).map((key, i) => <label key={key} className="block text-xs text-slate-400">Вопрос · {i ? 'English' : 'Русский'}<textarea autoFocus={i === 0} required className={field} rows={2} value={editing[key]} onChange={e => setEditing({ ...editing, [key]: e.target.value })} /></label>)}
        {editing.options.map((o, i) => <div key={i} className="grid gap-2 sm:grid-cols-2">{(['ru', 'en'] as const).map(language => <label key={language} className="text-xs text-slate-400">Ответ {i + 1} · {language}<input required className={field} value={o[language]} onChange={e => setEditing({ ...editing, options: editing.options.map((old, n) => n === i ? { ...old, [language]: e.target.value } : old) })} /></label>)}</div>)}
        <label className="block text-xs text-slate-400">Правильный ответ<select className={field} value={editing.correctIndex} onChange={e => setEditing({ ...editing, correctIndex: Number(e.target.value) })}>{editing.options.map((_, i) => <option key={i} value={i}>Ответ {i + 1}</option>)}</select></label>
        {selected === 'general' && <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-slate-400">Тема<select className={field} value={editing.topic} onChange={e => setEditing({ ...editing, topic: e.target.value as ContentQuestion['topic'] })}><option value="science">Наука</option><option value="history">История</option><option value="pop-culture">Поп-культура</option></select></label><label className="text-xs text-slate-400">Сложность<select className={field} value={editing.difficulty} onChange={e => { const difficulty = e.target.value as ContentQuestion['difficulty']; setEditing({ ...editing, difficulty, timeLimit: difficulty === 'easy' ? 15 : difficulty === 'hard' ? 25 : 20 }); }}><option value="easy">Лёгкий</option><option value="medium">Средний</option><option value="hard">Сложный</option></select></label></div>}
        <div className="flex gap-2"><button disabled={busy} className={button}>Сохранить в черновик</button><button type="button" className={button} onClick={() => setEditing(null)}>Отмена</button></div>
        {workspaceMessage && <p role="status" className="text-xs text-amber-200">{workspaceMessage}</p>}
      </form>
    </dialog>}
    {quizEditing && <dialog ref={quizDialog} onClose={() => setQuizEditing(null)} className="m-auto max-h-[90vh] w-[min(600px,calc(100%-2rem))] overflow-auto rounded-2xl border border-white/15 bg-slate-950 p-6 text-white backdrop:bg-black/80">
      <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await act('save-quiz', { quiz: quizEditing })) { setSelected(quizEditing.id); setQuizEditing(null); } }}>
        <h2 className="text-xl font-semibold">Тематический квиз</h2>
        {(['titleRu', 'titleEn', 'theme'] as const).map((key, i) => <label key={key} className="block text-xs text-slate-400">{['Название · Русский', 'Название · English', 'Папка / группа темы (например marvel)'][i]}<input autoFocus={i === 0} required pattern={key === 'theme' ? '[a-z0-9-]+' : undefined} className={field} value={quizEditing[key]} onChange={e => setQuizEditing({ ...quizEditing, [key]: key === 'theme' ? slug(e.target.value) : e.target.value })} /></label>)}
        <label className="block text-xs text-slate-400">Номер квиза<input required type="number" min={1} className={field} value={quizEditing.number} onChange={e => setQuizEditing({ ...quizEditing, number: Number(e.target.value) })} /></label>
        <label className="block text-xs text-slate-400">Профиль проверки (только для тематического квиза)<textarea className={field} rows={4} maxLength={4000} placeholder="Например: только фильмы MCU до Endgame; при расхождении комиксы не учитывать." value={quizEditing.verificationPolicy ?? ''} onChange={e => setQuizEditing({ ...quizEditing, verificationPolicy: e.target.value })} /><span className="mt-1 block text-[10px] text-slate-500">Этот текст используется при генерации, проверке и исправлении вопросов данного квиза.</span></label>
        <div className="rounded-xl border border-white/15 p-3"><p className="text-xs text-slate-400">Фон · WebP из public/backgrounds; PNG-исходники лежат в sources</p><input ref={file} type="file" accept="image/webp,.webp" className="mt-2 block w-full text-xs" onChange={async e => {
          const chosen = e.target.files?.[0]; if (!chosen) return;
          if (!/\.webp$/i.test(chosen.name)) { setMessage('Выберите WebP для игры. PNG хранится как исходник.'); return; }
          try {
            if (chosen.size > 8_000_000) throw new Error('Фон слишком большой');
            const digest = await crypto.subtle.digest('SHA-256', await chosen.arrayBuffer());
            const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
            const found = backgrounds.find(bg => bg.sha256 === hash);
            if (!found) throw new Error('Этот фон отсутствует в библиотеке. Выберите файл из public/backgrounds или списка папок ниже.');
            setQuizEditing(current => current?.id === quizEditing.id ? { ...current, backgroundUrl: found.url } : current);
            setMessage('');
          } catch (error) { setMessage((error as Error).message); }
        }} />
          <label className="mt-3 block text-xs text-slate-400">Или выберите из папок библиотеки<select required className={field} value={quizEditing.backgroundUrl} onChange={e => setQuizEditing({ ...quizEditing, backgroundUrl: e.target.value })}><option value="">Выберите фон…</option>{[...new Set(backgrounds.map(bg => bg.group))].map(group => <optgroup key={group} label={group}>{backgrounds.filter(bg => bg.group === group).map(bg => <option key={bg.url} value={bg.url}>{bg.filename.split('/').pop()}</option>)}</optgroup>)}</select></label>
          {quizEditing.backgroundUrl && <Image src={quizEditing.backgroundUrl} alt="Выбранный фон" width={400} height={225} className="mt-3 max-h-40 w-full rounded-xl object-cover" />}
          {message && <p role="status" className="mt-2 text-xs text-amber-200">{message}</p>}
        </div>
        <div className="flex gap-2"><button disabled={busy} className={button}>Сохранить квиз в черновик</button><button type="button" className={button} onClick={() => setQuizEditing(null)}>Отмена</button></div>
        {workspaceMessage && <p role="status" className="text-xs text-amber-200">{workspaceMessage}</p>}
      </form>
    </dialog>}
    </div>
  </div>;
}

export function CharacterStudio() {
  const { draft, busy, act, reload } = useContentWorkspace();
  const [ru, setRu] = useState(''); const [en, setEn] = useState(''); const [id, setId] = useState('');
  const [query, setQuery] = useState('');
  const [count, setCount] = useState(5);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  async function generateCharacters() {
    if (!draft || !window.confirm(`Создать ${count} персонажей через Codex? Это расходует лимиты аккаунта.`)) return;
    setWorking(true); setMessage('Создаю персонажей…');
    try {
      const response = await adminFetch('/api/admin/content-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group: 'characters', count, revision: draft.revision }) });
      const data = await response.json();
      if (!response.ok) { setMessage(`${data.error}${data.generated ? `\nСгенерированный набор для сохранения вручную:\n${JSON.stringify(data.generated, null, 2)}` : ''}`); return; }
      await reload(); setMessage('Персонажи добавлены в черновик без галочки проверки. Проверьте их вручную и сохраните дискетой.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setWorking(false); }
  }
  if (!draft) return <p>Войдите и обновите черновики.</p>;
  return <section className="h-full overflow-y-auto"><h3 className="text-lg font-semibold">Персонажи «Кто я?»</h3><p className="my-2 text-xs text-slate-400">Изменения попадут в новые игры только после дискеты.</p>
    <div className="mb-4 flex flex-wrap items-end gap-2"><label className="text-xs text-slate-400">Количество<input aria-label="Количество персонажей" type="number" min={1} max={10} className={`${field} !w-20`} value={count} onChange={e => setCount(Number(e.target.value))} /></label><button className={button} disabled={busy || working || !Number.isInteger(count) || count < 1 || count > 10} onClick={() => void generateCharacters()}>Создать через Codex</button><span className="text-xs text-slate-400">Проверено вручную {draft.catalog.characters.filter(c => c.checked).length} / {draft.catalog.characters.length}</span></div>
    {message && <p role="status" className="mb-3 whitespace-pre-wrap break-words text-xs text-indigo-200">{message}</p>}
    <form className="mb-5 flex flex-wrap items-end gap-2" onSubmit={async e => { e.preventDefault(); if (await act('save-character', { character: { id: id || `character-${crypto.randomUUID()}`, ru: ru.trim(), en: en.trim() } })) { setRu(''); setEn(''); setId(''); } }}>
      <label className="text-xs text-slate-400">Русский<input required className={field} value={ru} onChange={e => setRu(e.target.value)} /></label><label className="text-xs text-slate-400">English<input required className={field} value={en} onChange={e => setEn(e.target.value)} /></label><button disabled={busy} className={button}>{id ? 'Сохранить правку' : 'Добавить персонажа'}</button>{id && <button type="button" className={button} onClick={() => { setId(''); setRu(''); setEn(''); }}>Отмена</button>}
    </form><input aria-label="Поиск персонажей" className={`${field} mb-3`} placeholder="Поиск персонажей…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="space-y-2">{draft.catalog.characters.filter(c => `${c.ru} ${c.en}`.toLowerCase().includes(query.toLowerCase())).map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3"><p className="min-w-0 break-words text-sm">{c.ru}<span className="ml-2 text-xs text-slate-400">{c.en}</span></p><div className="flex flex-wrap items-center gap-2"><ManualCheck name={c.ru} checked={!!c.checked} disabled={busy || working} onChange={checked => void act('check-character', { id: c.id, checked })} /><button disabled={busy || working} className={button} onClick={() => { setId(c.id); setRu(c.ru); setEn(c.en); }}>Изменить</button><button disabled={busy || working} className={`${button} text-red-300`} onClick={() => { if (window.confirm(`Удалить ${c.ru} из черновика?`)) void act('delete-character', { id: c.id }); }}>Удалить</button></div></div>)}</div>
  </section>;
}

function ManualCheck({ name, checked, disabled, onChange }: { name: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs ${checked ? 'bg-emerald-300/10 text-emerald-200' : 'text-slate-400'}`}><input type="checkbox" aria-label={`Проверен вручную: ${name}`} checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-emerald-400" />Проверен</label>;
}

export function WordStudio({ group }: { group: 'alias' | 'crocodile' | 'spy' }) {
  const { draft, busy, act, reload, message } = useContentWorkspace();
  const [query, setQuery] = useState('');
  const [onlyUnchecked, setOnlyUnchecked] = useState(false);
  const refreshAttempted = useRef(false);
  useEffect(() => {
    if (draft && !draft.catalog.words?.[group] && !refreshAttempted.current) {
      refreshAttempted.current = true;
      void reload();
    }
  }, [draft, group, reload]);
  if (!draft) return <p>Войдите и обновите черновики.</p>;
  const words = draft.catalog.words?.[group] ?? [];
  return <section className="h-full overflow-y-auto"><h3 className="text-lg font-semibold">{group === 'alias' ? 'Слова «Угадай слово»' : group === 'crocodile' ? 'Слова «Крокодила»' : 'Слова и места «Шпиона»'}</h3>
    <p className="my-2 text-xs text-slate-400">Галочки ставите вы вручную. Они сохраняются через дискету и не исключают слова из игры.</p>
    <div className="mb-3 flex flex-wrap items-center gap-3"><span className="text-xs text-slate-400">Проверено {words.filter(w => w.checked).length} / {words.length}</span><button className={button} disabled={busy} onClick={() => void reload()}>Обновить список</button><label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={onlyUnchecked} onChange={e => setOnlyUnchecked(e.target.checked)} />Только непроверенные</label></div>
    {!draft.catalog.words?.[group] && <p role="status" className="mb-3 text-xs text-amber-200">Загружаю список из обновлённого каталога. Если он не появился, нажмите «Обновить список».</p>}
    {message && <p role="status" className="mb-3 text-xs text-indigo-200">{message}</p>}
    <input aria-label="Поиск слов" className={`${field} mb-3`} placeholder="Поиск слов…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="space-y-2">{words.filter(w => (!onlyUnchecked || !w.checked) && `${w.ru} ${w.en ?? ''}`.toLowerCase().includes(query.toLowerCase())).map(w => <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3"><p className="min-w-0 break-words text-sm">{w.ru}{w.en && <span className="ml-2 text-xs text-slate-400">{w.en}</span>}{group === 'spy' && <span className="ml-2 text-[10px] text-slate-500">{w.id.startsWith('spy-location-') ? 'Обсуждение' : 'Рисование'}</span>}</p><ManualCheck name={w.ru} checked={!!w.checked} disabled={busy} onChange={checked => void act('check-word', { group, id: w.id, checked })} /></div>)}</div>
  </section>;
}
