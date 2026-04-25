import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { count } = await req.json() as { count: number };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });

  const prompt = `Придумай ${count} новых локаций для игры «Шпион».

Для каждой локации придумай:
- Название места (интересное, узнаваемое)
- 6-8 ролей игроков, которые логично находятся в этом месте

Верни ТОЛЬКО валидный JSON массив без пояснений:
[
  {
    "nameRu": "Название на русском",
    "nameEn": "Name in English",
    "roles": ["Роль 1", "Роль 2", "Роль 3", "Роль 4", "Роль 5", "Роль 6"]
  }
]

Идеи для тематик: необычные места, исторические, фантастические, бытовые.
Верни ТОЛЬКО JSON массив.`;

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
      temperature: 0.85,
      max_tokens: 2000,
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
    const locations = JSON.parse(text.slice(start, end + 1));
    return NextResponse.json({ locations });
  } catch {
    return NextResponse.json({ error: 'Failed to parse response', raw }, { status: 500 });
  }
}
