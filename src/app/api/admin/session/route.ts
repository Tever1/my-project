import { NextResponse } from 'next/server';
import { ADMIN_SESSION_AGE, ADMIN_SESSION_COOKIE, createAdminSession, getAdminCodexKey, withCodexAdmin } from '@/lib/admin-codex';

export const POST = withCodexAdmin(async req => {
  const { action } = await req.json();
  const response = NextResponse.json({ authenticated: action !== 'logout' });
  response.headers.set('Cache-Control', 'no-store');
  if (action === 'status') return response;
  if (action !== 'login' && action !== 'logout') return NextResponse.json({ error: 'Неизвестное действие.' }, { status: 400 });
  // Only a fresh key login can extend a session's lifetime.
  if (action === 'login' && req.headers.get('x-codex-admin-key') !== await getAdminCodexKey()) {
    return NextResponse.json({ error: 'Введите ключ для запоминания входа.' }, { status: 401 });
  }
  response.cookies.set(ADMIN_SESSION_COOKIE, action === 'login' ? createAdminSession(await getAdminCodexKey()) : '', {
    httpOnly: true, sameSite: 'strict', secure: new URL(req.url).protocol === 'https:',
    path: '/api/admin', maxAge: action === 'login' ? ADMIN_SESSION_AGE : 0,
  });
  return response;
});
