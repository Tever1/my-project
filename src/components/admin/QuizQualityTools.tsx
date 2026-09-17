'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { REVIEW_LABELS, reviewStatusAfterEdit, type QuestionReview, type ReviewQuestion, type ReviewStatus } from '@/lib/quiz-review';

export function QuizQualityTools({ quizKey, questions, onFilter }: {
  quizKey: string; questions: ReviewQuestion[]; onFilter: (ids: string[] | null) => void;
}) {
  const [reviews, setReviews] = useState<Record<string, QuestionReview>>({});
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ReviewQuestion | null>(null);
  const [status, setStatus] = useState<ReviewStatus>('unverified');
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    adminFetch('/api/admin/quiz-review', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', quizKey }) }).then(async response => {
      const data = await response.json();
      if (active) { if (!response.ok) setMessage(data.error); else setReviews(data.reviews); }
    }).catch(() => { if (active) setMessage('Не удалось загрузить статусы'); });
    return () => { active = false; };
  }, [quizKey, reload]);
  const filtered = questions.filter(q => {
    const review = reviews[q.id];
    const current = review?.question ?? q;
    const matches = `${current.questionRu} ${current.questionEn}`.toLowerCase().includes(query.toLowerCase());
    return matches && (filter === 'all' || (filter === 'missing-en'
      ? !current.questionEn.trim() || current.options.some(option => !option.en.trim())
      : (review?.status ?? 'unverified') === filter));
  });
  function applyFilter(nextFilter: string, nextQuery: string) {
    setFilter(nextFilter); setQuery(nextQuery);
    const ids = questions.filter(q => {
      const review = reviews[q.id]; const current = review?.question ?? q;
      return `${current.questionRu} ${current.questionEn}`.toLowerCase().includes(nextQuery.toLowerCase())
        && (nextFilter === 'all' || (nextFilter === 'missing-en'
          ? !current.questionEn.trim() || current.options.some(option => !option.en.trim())
          : (review?.status ?? 'unverified') === nextFilter));
    }).map(q => q.id);
    onFilter(nextFilter === 'all' && !nextQuery ? null : ids);
  }
  function open(id: string) {
    const original = questions.find(q => q.id === id);
    if (!original) { setEditing(null); return; }
    const review = reviews[id]; setEditing(structuredClone(review?.question ?? original));
    setStatus(review?.status ?? 'unverified'); setNote(review?.note ?? ''); setSource(review?.source ?? ''); setMessage('');
  }
  async function save() {
    if (!editing) return;
    setBusy(true); setMessage('');
    try {
      const original = reviews[editing.id]?.question ?? questions.find(q => q.id === editing.id)!;
      const response = await adminFetch('/api/admin/quiz-review', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', quizKey, question: editing, status: reviewStatusAfterEdit(original, editing, status),
          note, source, revision: reviews[editing.id]?.revision ?? '' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setReviews(previous => ({ ...previous, [editing.id]: data.review })); setStatus(data.review.status);
      setMessage('Черновик и статус сохранены. Игровой банк не изменён.');
      setFilter('all'); setQuery(''); onFilter(null);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  const field = 'w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm';
  return <section className="mb-4 max-h-[55vh] shrink-0 overflow-y-auto rounded-2xl border border-indigo-300/20 bg-indigo-300/5 p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Качество контента</h4>
      <span className="text-xs text-slate-400">{questions.filter(q => reviews[q.id]?.status === 'confirmed').length} / {questions.length} подтверждены владельцем</span>
      <button onClick={() => setReload(value => value + 1)} className="text-xs text-indigo-200">Обновить статусы</button></div>
    <div className="grid gap-2 sm:grid-cols-2">
      <input aria-label="Поиск по вопросам" className={field} placeholder="Найти вопрос…" value={query} onChange={e => applyFilter(filter, e.target.value)} />
      <select aria-label="Фильтр качества" className={field} value={filter} onChange={e => applyFilter(e.target.value, query)}>
        <option value="all">Все вопросы</option>{Object.entries(REVIEW_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        <option value="missing-en">Нет английского перевода</option>
      </select>
    </div>
    <label className="mt-3 block text-xs text-slate-400">Редактирование и ручное решение
      <select className={`${field} mt-2`} value={editing?.id ?? ''} onChange={e => open(e.target.value)}>
        <option value="">Выберите вопрос ({filtered.length})</option>{filtered.map(q => <option key={q.id} value={q.id}>{REVIEW_LABELS[reviews[q.id]?.status ?? 'unverified']} · {q.questionRu.slice(0, 80)}</option>)}
      </select>
    </label>
    {editing && <div className="mt-4 space-y-3">
      <p className="text-xs leading-relaxed text-amber-200/80">Это черновик: не меняет вопросы активной или новой игры. После изменения текста подтверждение сбрасывается. Публикация будет отдельным действием.</p>
      {(['questionRu', 'questionEn'] as const).map((key, i) => <label key={key} className="block text-xs text-slate-400">Вопрос · {i ? 'English' : 'Русский'}
        <textarea className={`${field} mt-1`} rows={2} value={editing[key]} onChange={e => setEditing({ ...editing, [key]: e.target.value })} /></label>)}
      {editing.options.map((option, index) => <div key={index} className="grid gap-2 sm:grid-cols-2">
        {(['ru', 'en'] as const).map(language => <label key={language} className="text-xs text-slate-400">Ответ {index + 1} · {language}
          <input className={`${field} mt-1`} value={option[language]} onChange={e => setEditing({ ...editing, options: editing.options.map((old, n) => n === index ? { ...old, [language]: e.target.value } : old) })} /></label>)}
      </div>)}
      <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-slate-400">Правильный ответ<select className={`${field} mt-1`} value={editing.correctIndex} onChange={e => setEditing({ ...editing, correctIndex: Number(e.target.value) })}>{editing.options.map((_, i) => <option key={i} value={i}>Ответ {i + 1}</option>)}</select></label>
        <label className="text-xs text-slate-400">Решение владельца<select className={`${field} mt-1`} value={status} onChange={e => setStatus(e.target.value as ReviewStatus)}>{Object.entries(REVIEW_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label className="block text-xs text-slate-400">Источник (https)<input className={`${field} mt-1`} value={source} onChange={e => setSource(e.target.value)} /></label>
      <label className="block text-xs text-slate-400">Комментарий к проверке<textarea className={`${field} mt-1`} value={note} onChange={e => setNote(e.target.value)} /></label>
      {reviews[editing.id] && <p className="text-xs text-slate-400">Сохранено: {new Date(reviews[editing.id].updatedAt).toLocaleString('ru-RU')}</p>}
      <button disabled={busy} onClick={() => void save()} className="rounded-xl bg-indigo-200 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Сохраняю…' : 'Сохранить черновик и решение'}</button>
      <button onClick={() => setEditing(null)} className="ml-3 text-xs text-slate-400">Закрыть редактор</button>
    </div>}
    {message && <p role="status" className="mt-3 text-xs text-slate-300">{message}</p>}
  </section>;
}
