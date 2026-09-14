import { NextResponse } from 'next/server';
import { codexCompletion, withCodexAdmin } from '@/lib/admin-codex';

export const maxDuration = 500;
export const POST = withCodexAdmin(async req => {
  const { theme, customPrompt } = await req.json();
  const scene = typeof customPrompt === 'string' && customPrompt.trim() ? customPrompt : theme;
  if (typeof scene !== 'string' || !scene.trim() || scene.length > 5000) return NextResponse.json({ error: 'Укажите тему или промпт до 5000 символов.' }, { status: 400 });
  const response = await codexCompletion(`${scene}. Cinematic landscape 16:9 quiz background, atmospheric lighting, no text, no watermark, no foreground characters, empty central space for quiz UI.`, true);
  return response.ok ? response : NextResponse.json({ error: await response.text() }, { status: response.status });
});
