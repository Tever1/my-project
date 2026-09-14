import { codexCompletion, withCodexAdmin } from '@/lib/admin-codex';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withCodexAdmin(async (req: NextRequest) => {
  const { count } = await req.json() as { count: number };
  if (!Number.isInteger(count) || count < 1 || count > 30) return NextResponse.json({ error: 'Допустимо от 1 до 30 локаций.' }, { status: 400 });

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

  const res = await codexCompletion(prompt);

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Codex ${res.status}: ${text}` }, { status: res.status });
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '[]';

  try {
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    const locations = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(locations) || locations.length !== count || locations.some(location =>
      !location || typeof location.nameRu !== 'string' || !location.nameRu.trim()
      || typeof location.nameEn !== 'string' || !location.nameEn.trim()
      || !Array.isArray(location.roles) || location.roles.length < 6 || location.roles.length > 8
      || location.roles.some((role: unknown) => typeof role !== 'string' || !role.trim()))) throw new Error('Invalid locations');
    return NextResponse.json({ locations });
  } catch {
    return NextResponse.json({ error: 'Failed to parse response', raw }, { status: 500 });
  }
});
