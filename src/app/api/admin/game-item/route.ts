import { NextRequest, NextResponse } from 'next/server';
import { readOverrides, writeOverrides } from '@/lib/game-overrides';

function getItemId(item: unknown): string {
  if (typeof item === 'string') return item;
  const obj = item as Record<string, string>;
  return obj.ru ?? obj.q ?? JSON.stringify(item);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, game, item } = body as { action: 'delete' | 'replace'; game: string; item: unknown };

  if (!action || !game || item === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const itemId = getItemId(item);
  const overrides = await readOverrides();

  if (!overrides[game]) {
    overrides[game] = { deleted: [], replaced: [] };
  }

  const gameOverride = overrides[game];

  if (action === 'delete') {
    // Remove from replaced if it was there
    gameOverride.replaced = gameOverride.replaced.filter((r) => r.originalId !== itemId);
    // Add to deleted if not already there
    if (!gameOverride.deleted.includes(itemId)) {
      gameOverride.deleted.push(itemId);
    }
    await writeOverrides(overrides);
    return NextResponse.json({ ok: true });
  }

  if (action === 'replace') {
    if (game === 'hundred-to-one') {
      return NextResponse.json({ error: 'Not supported' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
    }

    let prompt: string;
    if (game === 'alias' || game === 'crocodile') {
      prompt = `Generate one word suitable for the party game "${game}". Return ONLY valid JSON in this exact format: {"ru":"слово","en":"word"}. The word should be a common noun, easy to describe or act out. No markdown, no explanation.`;
    } else if (game === 'spy') {
      prompt = `Generate one location name suitable for the party game "Spy" (Шпион). Return ONLY valid JSON in this exact format: {"ru":"Место","en":"Location"}. It should be a place that players can easily imagine (e.g. hospital, beach, casino). No markdown, no explanation.`;
    } else if (game === 'who-am-i') {
      prompt = `Generate one famous character (person, fictional character, or well-known figure) suitable for the party game "Who Am I?" (Кто я?). Return ONLY valid JSON in this exact format: {"ru":"Имя","en":"Name"}. No markdown, no explanation.`;
    } else {
      return NextResponse.json({ error: 'Replace not supported for this game' }, { status: 400 });
    }

    let parsed: Record<string, string>;
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro-preview',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `OpenRouter error: ${err}` }, { status: 502 });
      }

      const data = await res.json();
      let content: string = data.choices?.[0]?.message?.content ?? '';

      // Strip markdown fences if present
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

      parsed = JSON.parse(content);
    } catch (err) {
      return NextResponse.json({ error: `Failed to generate replacement: ${(err as Error).message}` }, { status: 502 });
    }

    let replacement: unknown;
    if (game === 'spy') {
      // For spy, use the .ru value as the replacement string
      replacement = parsed.ru;
    } else {
      replacement = parsed;
    }

    // Mark original as deleted
    gameOverride.replaced = gameOverride.replaced.filter((r) => r.originalId !== itemId);
    if (!gameOverride.deleted.includes(itemId)) {
      gameOverride.deleted.push(itemId);
    }

    // Add replacement
    gameOverride.replaced.push({ originalId: itemId, replacement });

    await writeOverrides(overrides);
    return NextResponse.json({ ok: true, replacement });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
