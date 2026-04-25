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

export async function POST(req: NextRequest) {
  const { theme } = await req.json() as { theme: string };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
  if (!theme?.trim()) return NextResponse.json({ error: 'Theme is required' }, { status: 400 });

  const prompt = `You are an expert at writing image generation prompts for quiz game backgrounds.

Write a detailed image generation prompt for the theme: "${theme}"

The prompt must:
- Describe a SCENE (landscape, environment, atmosphere) — NOT characters or logos
- Be vivid, cinematic, and atmospheric
- Work well as a background (not too busy)
- End with this style suffix: "${BASE_STYLE}"

Return ONLY the prompt text, nothing else. No quotes, no explanation. Just the prompt.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'party-games-hub',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `OpenRouter ${res.status}: ${text}` }, { status: 500 });
  }

  const data = await res.json();
  const generatedPrompt = data.choices?.[0]?.message?.content?.trim() ?? '';
  return NextResponse.json({ prompt: generatedPrompt });
}
