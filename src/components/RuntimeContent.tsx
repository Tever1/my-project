'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { refreshGameContent } from '@/lib/content/client';
import { usePathname } from 'next/navigation';

export function RuntimeContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [loadedPath, setLoadedPath] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    refreshGameContent().then(() => { if (active) { setLoadedPath(pathname); setError(''); } })
      .catch(error => { if (active) setError((error as Error).message); });
    const refresh = () => { void refreshGameContent().catch(() => { /* Active games retain their canonical queue. */ }); };
    window.addEventListener('focus', refresh); window.addEventListener('game-content-saved', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); window.removeEventListener('game-content-saved', refresh); };
  }, [retry, pathname]);
  if (loadedPath !== pathname && !pathname.startsWith('/admin')) return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-white"><div>
    <p role={error ? 'alert' : 'status'}>{error || 'Загрузка игровых данных / Loading game content…'}</p>
    {error && <button className="mt-4 rounded-xl border border-white/30 px-4 py-2" onClick={() => setRetry(value => value + 1)}>Повторить / Retry</button>}
  </div></div>;
  return children;
}
