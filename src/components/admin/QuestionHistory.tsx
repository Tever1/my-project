'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { ContentQuestion } from '@/lib/content/catalog';

interface HistoryItem { id: string; at: string; label: string; question: ContentQuestion }
export function QuestionHistory({ quizId, question, revision, onRestored, onClose }: { quizId: string; question: ContentQuestion; revision: string; onRestored: () => Promise<void>; onClose: () => void }) {
  const [items, setItems] = useState<HistoryItem[]>([]); const [message, setMessage] = useState('Загружаю историю…');
  useEffect(() => { adminFetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'question-history', quizId, id: question.id }) })
    .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setItems(data.history ?? []); setMessage(''); })
    .catch(error => setMessage((error as Error).message)); }, [quizId, question.id]);
  async function restore(historyId: string) {
    if (!window.confirm('Восстановить эту версию вопроса в черновике? Текущая версия останется в истории.')) return;
    const response = await adminFetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore-question', historyId, quizId, id: question.id, revision }) });
    const data = await response.json(); if (!response.ok) { setMessage(data.error); return; } await onRestored(); onClose();
  }
  return <dialog open className="fixed inset-0 z-50 m-auto max-h-[90vh] w-[min(760px,calc(100%-2rem))] overflow-auto rounded-3xl border border-white/15 bg-slate-950 p-6 text-white backdrop:bg-black/80">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">История вопроса</h2><p className="mt-1 text-xs text-slate-400">{question.questionRu}</p></div><button onClick={onClose} className="rounded-xl border border-white/15 px-3 py-2 text-xs">Закрыть</button></div>
    {message && <p className="mt-4 text-xs text-amber-200">{message}</p>}<div className="mt-5 space-y-3">{items.map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 text-[11px] text-slate-500">{new Date(item.at).toLocaleString('ru-RU')}</p></div><button onClick={() => void restore(item.id)} className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:bg-white/10">Восстановить</button></div><p className="mt-3 text-sm">{item.question.questionRu}</p><p className="mt-2 text-xs text-slate-400">{item.question.options.map(option => option.ru).join(' · ')}</p></article>)}{!message && !items.length && <p className="text-sm text-slate-400">Предыдущих сохранённых версий пока нет.</p>}</div>
  </dialog>;
}
