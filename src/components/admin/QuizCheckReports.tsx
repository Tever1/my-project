'use client';
import { useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { QuizCheckReport } from '@/lib/quiz-check-reports';

export function QuizCheckReports({ quizKey }: { quizKey: string }) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<QuizCheckReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    setOpen(true); setBusy(true); setError('');
    try {
      const response = await adminFetch('/api/admin/quiz-check-reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Не удалось загрузить отчёты');
      setReports(data.reports);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <button onClick={() => void load()} className="text-xs rounded-lg border border-blue-400/40 px-3 py-1.5 text-blue-200">Отчёты</button>
    {open && <div role="dialog" aria-modal="true" aria-label="Отчёты о достоверности" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <section className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/20 bg-slate-950 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-bold">Отчёты о достоверности</h2>
          <button autoFocus onClick={() => setOpen(false)} className="rounded border border-white/30 px-3 py-1">Закрыть</button>
        </div>
        <p className="mb-4 text-sm text-white/60">История выбранного квиза. Отчёт относится к вопросам на момент проверки; после правок он может устареть.</p>
        {busy ? <p>Загрузка…</p> : error ? <p role="alert">{error}</p> : reports.length === 0 ? <p>Сохранённых отчётов пока нет.</p> : reports.map(entry => <details key={entry.id} className="mb-3 rounded border border-white/20 p-3">
          <summary className="cursor-pointer">{new Date(entry.createdAt).toLocaleString('ru-RU')} · {entry.label}</summary>
          <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm">{entry.report}</pre>
          <details className="mt-4 text-sm text-white/60"><summary className="cursor-pointer">Какие вопросы проверены</summary><pre className="mt-2 whitespace-pre-wrap break-words font-sans">{entry.questions}</pre></details>
        </details>)}
      </section>
    </div>}
  </>;
}
