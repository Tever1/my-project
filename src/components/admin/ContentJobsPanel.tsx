'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { AdminJob, AdminJobType } from '@/lib/content/admin-jobs';

export function useContentJobs(onCompleted: () => void) {
  const [jobs, setJobs] = useState<AdminJob[]>([]); const [error, setError] = useState('');
  const known = useRef(new Map<string, AdminJob['status']>());
  const load = useCallback(async () => {
    try {
      const response = await adminFetch('/api/admin/content-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list' }) });
      const data = await response.json(); if (!response.ok) { setError(data.error ?? 'Не удалось загрузить очередь'); return; }
      const next = data.jobs as AdminJob[];
      if (next.some(job => job.status === 'completed' && known.current.get(job.id) && known.current.get(job.id) !== 'completed')) onCompleted();
      known.current = new Map(next.map(job => [job.id, job.status])); setJobs(next); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Сервер очереди временно недоступен'); }
  }, [onCompleted]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => {
    if (!jobs.some(job => ['queued', 'running'].includes(job.status))) return;
    const timer = window.setInterval(() => void load(), 2000); return () => window.clearInterval(timer);
  }, [jobs, load]);
  const enqueue = useCallback(async (type: AdminJobType, input: Record<string, unknown>) => {
    const response = await adminFetch('/api/admin/content-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', type, ...input }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    await load(); return data.job as AdminJob;
  }, [load]);
  const command = useCallback(async (action: 'retry' | 'cancel', id: string) => {
    try {
      const response = await adminFetch('/api/admin/content-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Команда очереди не выполнена'); }
  }, [load]);
  return { jobs, enqueue, command, load, error };
}

const labels: Record<AdminJob['status'], string> = { queued: 'В очереди', running: 'Выполняется', completed: 'Готово', failed: 'Ошибка', cancelled: 'Отменено' };
export function ContentJobsPanel({ jobs, error, onCommand }: { jobs: AdminJob[]; error: string; onCommand: (action: 'retry' | 'cancel', id: string) => Promise<void> }) {
  const active = jobs.filter(job => job.status === 'queued' || job.status === 'running');
  const failed = jobs.filter(job => job.status === 'failed');
  const cancelled = jobs.filter(job => job.status === 'cancelled');
  if (!active.length && !failed.length && !cancelled.length && !error) return null;
  return <>
    {!!active.length && <section className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4" aria-label="Очередь заданий Codex">
      <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Очередь контента</h3><p className="mt-1 text-xs text-slate-400">Работа продолжается после переключения вкладки или обновления страницы.</p></div><span className="text-xs text-cyan-200">{active.length} активных</span></div>
      <div className="grid gap-2 lg:grid-cols-2">{active.slice(0, 8).map(job => <article key={job.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
        <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold">{job.label}</p><p className="mt-1 text-[11px] text-slate-400">{labels[job.status]} · попытка {job.attempts}</p></div><span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[10px] text-cyan-100">{job.progress.done}/{job.progress.total}</span></div>
        <progress className="mt-3 h-2 w-full accent-cyan-300" max={Math.max(1, job.progress.total)} value={job.progress.done} />
        <p className="mt-2 text-[11px] text-slate-400">{job.progress.message}</p>
        <button className="mt-2 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-red-200 hover:bg-white/10" onClick={() => void onCommand('cancel', job.id)}>Отменить после блока</button>
      </article>)}</div>
    </section>}
    {!!failed.length && <section className="mb-5 rounded-2xl border border-red-300/20 bg-red-300/5 p-4" aria-label="Задания с ошибкой">
      <h3 className="text-sm font-semibold text-red-100">Задания с ошибкой</h3>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">{failed.map(job => <article key={job.id} className="rounded-xl border border-white/10 p-3">
        <p className="text-xs font-semibold">{job.label} · {job.progress.done}/{job.progress.total}</p>
        <p className="mt-2 text-[11px] text-red-200">{job.error ?? job.progress.message}</p>
        <button className="mt-2 rounded-lg border border-white/15 px-2 py-1 text-[11px] hover:bg-white/10" onClick={() => void onCommand('retry', job.id)}>Повторить</button>
      </article>)}</div>
    </section>}
    {!!cancelled.length && <details className="mb-5 rounded-2xl border border-white/10 p-4 text-xs text-slate-300">
      <summary className="cursor-pointer">Отменённые задания · {cancelled.length}</summary>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">{cancelled.map(job => <div key={job.id} className="rounded-xl border border-white/10 p-3">
        <p>{job.label} · {job.progress.done}/{job.progress.total}</p>
        <button className="mt-2 rounded-lg border border-white/15 px-2 py-1 hover:bg-white/10" onClick={() => void onCommand('retry', job.id)}>Повторить</button>
      </div>)}</div>
    </details>}
    {error && <p className="mb-5 text-xs text-red-200">{error}</p>}
  </>;
}
