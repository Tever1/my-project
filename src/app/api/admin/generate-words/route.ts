import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { theme, difficulty, count, game } = await req.json() as {
    theme: string;
    difficulty: string;
    count: number;
    game: 'alias' | 'crocodile';
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });

  const gameLabel = game === 'alias' ? 'Alias (объяснять словами, нельзя использовать однокоренные)' : 'Крокодил (объяснять жестами без слов)';
  const diffLabel = difficulty === 'easy' ? 'простые (все знают)' : difficulty === 'medium' ? 'средние' : 'сложные (редкие или специфичные)';

  const prompt = `Сгенерируй ровно ${count} слов для игры «${gameLabel}».
Тема: «${theme}».
Сложность: ${diffLabel}.

Требования:
- Только существительные или глаголы в начальной форме
- Слова должны быть интересными для объяснения в игре
- Не повторяться по смыслу
- На русском языке

Верни ТОЛЬКО JSON массив строк без пояснений:
["слово1", "слово2", ...]`;

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
      temperature: 0.8,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `OpenRouter ${res.status}: ${text}` }, { status: 500 });
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '[]';

  try {
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    const words: string[] = JSON.parse(text.slice(start, end + 1));
    return NextResponse.json({ words });
  } catch {
    return NextResponse.json({ error: 'Failed to parse response', raw }, { status: 500 });
  }
}
