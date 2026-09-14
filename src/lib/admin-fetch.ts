'use client';

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, { ...init, credentials: 'same-origin' });
  } catch {
    return Response.json({ error: 'Соединение прервано. Проверьте сервер.' }, { status: 503 });
  }
}
