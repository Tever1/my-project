'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

export function CodexAdminAccess() {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    adminFetch('/api/admin/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status' }),
    }).then(response => { if (active) { setSaved(response.ok); setBusy(false); } });
    return () => { active = false; };
  }, []);
  async function session(action: 'login' | 'logout') {
    setBusy(true); setError('');
    const response = await adminFetch('/api/admin/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(action === 'login' ? { 'x-codex-admin-key': key.trim() } : {}) },
      body: JSON.stringify({ action }),
    });
    if (response.ok || (action === 'logout' && response.status === 401)) {
      setSaved(action === 'login'); setKey('');
      try { sessionStorage.removeItem('party-codex-admin-key'); } catch { /* Legacy storage may be unavailable. */ }
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Не удалось изменить вход. Повторите попытку.');
      if (response.status === 401) setSaved(false);
    }
    setBusy(false);
  }
  return <section className="mb-6 rounded-xl border border-purple-400/30 bg-white/5 p-4">
    <h2 className="font-bold">Генерация через локальный Codex</h2>
    <p className="my-2 text-sm text-white/60">Слова, локации, вопросы и промпты — через ChatGPT-вход. Один запрос за раз, до 3 минут. Используются лимиты Codex. Проверка достоверности использует интернет-поиск и запрашивает ссылки на источники; неподтверждённые факты отмечаются отдельно.</p>
    <p className="mb-3 text-sm text-white/60">Ключ доступа: data/codex-admin-key.txt на Mac. Создаётся при первом запросе генерации. Не передавайте его игрокам.</p>
    <form className="flex flex-wrap gap-2" onSubmit={event => {
      event.preventDefault(); void session('login');
    }}>
      {!saved && <input disabled={busy} aria-label="Ключ доступа к Codex" type="password" autoComplete="off" required value={key} onChange={event => setKey(event.target.value)} placeholder="Ключ администратора" className="min-w-0 rounded border border-white/20 bg-black/30 px-3 py-2" />}
      {!saved && <button disabled={busy} className="rounded bg-purple-700 px-4 py-2">{busy ? 'Проверяем вход…' : 'Запомнить на 30 дней'}</button>}
      {saved && <button disabled={busy} type="button" className="rounded border border-white/20 px-4 py-2" onClick={() => void session('logout')}>Выйти</button>}
    </form>
    {saved && <p className="mt-2 text-sm text-green-300">Вход сохранён в этом браузере. Повторный ввод ключа не нужен до истечения 30 дней или выхода.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    <p className="mt-3 text-sm text-white/60">Фоны создаёт встроенный генератор изображений Codex (до 8 минут). Если он недоступен или лимиты исчерпаны, запрос завершится ошибкой — без перехода к стороннему сервису.</p>
  </section>;
}
