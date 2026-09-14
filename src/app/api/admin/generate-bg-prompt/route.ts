import { codexCompletion, withCodexAdmin } from '@/lib/admin-codex';
import { NextRequest, NextResponse } from 'next/server';

const BASE_STYLE = [
  'cinematic wide landscape orientation',
  'atmospheric lighting',
  'rich colors',
  'high detail',
  'digital painting',
  'no text',
  'no watermark',
  'no characters in foreground',
  'empty negative space in the center for overlaid quiz content',
].join(', ');

export const POST = withCodexAdmin(async (req: NextRequest) => {
  const { theme } = await req.json() as { theme: string };
  if (!theme?.trim()) return NextResponse.json({ error: 'Theme is required' }, { status: 400 });

  const prompt = `You are an expert at writing image generation prompts for quiz game backgrounds.

Write a detailed image generation prompt for the theme: "${theme}"

The prompt must:
- Describe a SCENE (landscape, environment, atmosphere) — NOT characters or logos
- Be vivid, cinematic, and atmospheric
- Work well as a background (not too busy)
- End with this style suffix: "${BASE_STYLE}"

Return ONLY the prompt text, nothing else. No quotes, no explanation. Just the prompt.`;

  const res = await codexCompletion(prompt);

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Codex ${res.status}: ${text}` }, { status: res.status });
  }

  const data = await res.json();
  const generatedPrompt = data.choices?.[0]?.message?.content?.trim() ?? '';
  return NextResponse.json({ prompt: generatedPrompt });
});
