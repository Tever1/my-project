'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { ContentDraft } from '@/lib/content/catalog';

interface Workspace {
  draft: ContentDraft | null; busy: boolean; message: string;
  reload: () => Promise<void>; act: (action: string, data?: Record<string, unknown>) => Promise<boolean>;
}
const Context = createContext<Workspace | null>(null);
export function useContentWorkspace() { const value = useContext(Context); if (!value) throw new Error('Content workspace missing'); return value; }
export function ContentWorkspace({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const reload = useCallback(async () => {
    const response = await adminFetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list' }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? 'Не удалось загрузить черновики'); return; }
    setDraft(data); setMessage('');
  }, []);
  useEffect(() => {
    void reload();
    const refresh = () => { void reload(); };
    window.addEventListener('codex-admin-authenticated', refresh);
    return () => window.removeEventListener('codex-admin-authenticated', refresh);
  }, [reload]);
  async function act(action: string, data: Record<string, unknown> = {}) {
    if (!draft || busy) return false;
    setBusy(true); setMessage('');
    try {
      const response = await adminFetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, action, revision: draft.revision }) });
      const next = await response.json(); if (!response.ok) throw new Error(next.error);
      setDraft(next); setMessage(action === 'sync' ? 'Все изменения сохранены в игровые файлы.' : 'Изменение в черновике. Нажмите дискету для сохранения в игры.');
      if (action === 'sync') window.dispatchEvent(new Event('game-content-saved'));
      return true;
    } catch (error) { setMessage((error as Error).message); return false; }
    finally { setBusy(false); }
  }
  return <Context.Provider value={{ draft, busy, message, reload, act }}>{children}</Context.Provider>;
}
export function ContentSaveButton() {
  const { draft, busy, act, reload, message } = useContentWorkspace();
  return <section className="mb-6 rounded-2xl border border-indigo-200/20 bg-indigo-200/5 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{!draft ? 'Войдите и загрузите черновики' : draft.changes.length ? `Несохранённые изменения: ${draft.changes.length}` : 'Игровые файлы синхронизированы'}</p>
      <p className="mt-1 text-xs text-slate-400">Правки, удаления и новые элементы сначала остаются в черновике.</p></div>
      <div className="flex gap-2"><button onClick={() => void reload()} disabled={busy} className="rounded-xl border border-white/15 px-3 py-2 text-xs">Обновить</button>
        <button aria-label="Сохранить все изменения в игровые файлы" title="Сохранить все изменения" disabled={!draft?.changes.length || busy}
          onClick={() => { if (window.confirm('Сохранить все накопленные правки и удаления в игровые файлы? Будет создана резервная копия.')) void act('sync'); }}
          className="flex items-center gap-2 rounded-xl bg-indigo-200 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 3h13l4 4v14H3V3h1Z" /><path d="M7 3v6h9V3M7 21v-8h10v8M13 3v4" /></svg>
          {busy ? 'Сохраняю…' : 'Сохранить всё'}</button></div></div>
    {message && <p role="status" className="mt-3 text-xs text-indigo-100">{message}</p>}
    {!!draft?.changes.length && <details className="mt-3 text-xs text-slate-400"><summary className="cursor-pointer">Накопленные изменения</summary><ul className="mt-2 space-y-1">{draft.changes.map((change, i) => <li key={i}>{change}</li>)}</ul></details>}
  </section>;
}
