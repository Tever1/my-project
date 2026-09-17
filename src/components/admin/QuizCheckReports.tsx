'use client';
import { useState, useRef, useEffect } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { QuizCheckReport } from '@/lib/quiz-check-reports';

export function QuizCheckReports({ quizKey, questionId }: { quizKey: string; questionId?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<QuizCheckReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  async function load() {
    setOpen(true); setBusy(true); setError('');
    try {
      const response = await adminFetch('/api/admin/quiz-check-reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Не удалось загрузить отчёты');
      setReports(questionId ? data.reports.filter((entry: QuizCheckReport) => entry.questionIds?.includes(questionId)) : data.reports);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <button onClick={() => void load()} className="text-xs rounded-lg border border-blue-400/40 px-3 py-1.5 text-blue-200">Отчёты</button>
    {open && <dialog ref={dialog} onClose={() => setOpen(false)} aria-label="Отчёты о достоверности" className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl rounded-2xl bg-slate-950 p-0 text-white backdrop:bg-black/80">
      <section className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/20 bg-slate-950 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-bold">Отчёты о достоверности</h2>
          <button autoFocus onClick={() => setOpen(false)} className="rounded border border-white/30 px-3 py-1">Закрыть</button>
        </div>
        <p className="mb-4 text-sm text-white/60">История выбранного квиза. Отчёт относится к вопросам на момент проверки; после правок он может устареть.</p>
        {busy ? <p>Загрузка…</p> : error ? <p role="alert">{error}</p> : reports.length === 0 ? <p>Сохранённых отчётов пока нет.</p> : reports.map(entry => <details key={entry.id} className="mb-3 rounded border border-white/20 p-3">
          <summary className="cursor-pointer">{new Date(entry.createdAt).toLocaleString('ru-RU')} · {entry.label}</summary>
          <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm">{entry.report}</pre>
          <div className="mt-3 flex flex-col gap-2">{[...new Set(entry.report.match(/https:\/\/[^\s<>\]\)]+/g) ?? [])].map(url => <a key={url} href={url.replace(/[.,;]+$/, '')} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-blue-300 underline">{url}</a>)}</div>
          <details className="mt-4 text-sm text-white/60"><summary className="cursor-pointer">Какие вопросы проверены</summary><pre className="mt-2 whitespace-pre-wrap break-words font-sans">{entry.questions}</pre></details>
        </details>)}
      </section>
    </dialog>}
  </>;
}
