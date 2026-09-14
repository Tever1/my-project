import { codexCompletion, withCodexAdmin } from '@/lib/admin-codex';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withCodexAdmin(async (req: NextRequest) => {
  const { theme, difficulty, count, game } = await req.json() as {
    theme: string;
    difficulty: string;
    count: number;
    game: 'alias' | 'crocodile';
  };

  if (typeof theme !== 'string' || !theme.trim() || theme.length > 500
    || !Number.isInteger(count) || count < 1 || count > 100
    || !['easy', 'medium', 'hard'].includes(difficulty) || !['alias', 'crocodile'].includes(game)) {
    return NextResponse.json({ error: 'Укажите тему, сложность и от 1 до 100 слов.' }, { status: 400 });
  }

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
    const words: string[] = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(words) || words.length !== count || words.some(word => typeof word !== 'string' || !word.trim() || word.length > 150)) throw new Error('Invalid words');
    return NextResponse.json({ words });
  } catch {
    return NextResponse.json({ error: 'Failed to parse response', raw }, { status: 500 });
  }
});
