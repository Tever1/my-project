import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { QuizQuestion } from '@/types/game';

export const maxDuration = 60; // секунд

const OVERRIDES_PATH = path.join(process.cwd(), 'data', 'quiz-overrides.json');

// ─── Overrides I/O ────────────────────────────────────────────────────────────

interface SpecialOverride {
  deleted: string[];
  replaced: { originalId: string; replacement: QuizQuestion }[];
}

interface QuizOverrides {
  general: { deleted: string[] };
  special: Record<string, SpecialOverride>;
}

async function readOverrides(): Promise<QuizOverrides> {
  try {
    return JSON.parse(await fs.readFile(OVERRIDES_PATH, 'utf-8'));
  } catch {
    return { general: { deleted: [] }, special: {} };
  }
}

async function writeOverrides(data: QuizOverrides) {
  await fs.mkdir(path.dirname(OVERRIDES_PATH), { recursive: true });
  await fs.writeFile(OVERRIDES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── AI replacement ───────────────────────────────────────────────────────────

async function generateReplacement(
  specialId: string,
  currentQ: QuizQuestion,
  existingQuestions: string[],
): Promise<QuizQuestion> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const themeLabel = specialId.startsWith('harry-potter') ? 'Harry Potter'
    : specialId.startsWith('marvel') ? 'Marvel'
    : specialId;

  const themeContext = specialId.startsWith('harry-potter')
    ? `Охватывай все 8 фильмов. Темы: заклинания, зелья, факультеты, персонажи, локации (Хогвартс, Косой переулок, Министерство магии), квиддич, волшебные существа, артефакты (крестражи, мантия-невидимка и др.), ключевые события сюжета.`
    : specialId.startsWith('marvel')
    ? `Охватывай фильмы MCU. Темы: супергерои и их способности, злодеи, камни бесконечности, организации (Щ.И.Т., Гидра, Мстители), ключевые события, оружие и костюмы, планеты и локации.`
    : '';

  const diffLabel = currentQ.difficulty === 'easy' ? 'лёгкий'
    : currentQ.difficulty === 'hard' ? 'сложный'
    : 'средний';

  const existingList = existingQuestions
    .filter((q) => q !== currentQ.questionRu)
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');

  const prompt = `Придумай один новый вопрос для тематического квиза «${themeLabel}».

Сложность: ${diffLabel}.
${themeContext}

Уже существующие вопросы в квизе (не повторяй их темы):
${existingList}

Требования к вопросу:
- 4 варианта ответа, один правильный
- Вопрос и все варианты — на русском и английском
- Факты точные, соответствуют канону фильмов
- Неправильные варианты должны звучать правдоподобно, но быть однозначно неверными
- Избегай слишком очевидных вопросов (например «Как зовут главного героя?»)
- Избегай вопросов с конкретными числами и датами — их сложно проверить
- Добавь краткое пояснение почему правильный ответ верен

Верни ТОЛЬКО JSON без пояснений:
{
  "questionRu": "...",
  "questionEn": "...",
  "options": [
    {"ru": "...", "en": "..."},
    {"ru": "...", "en": "..."},
    {"ru": "...", "en": "..."},
    {"ru": "...", "en": "..."}
  ],
  "correctIndex": 0,
  "explanationRu": "..."
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'party-games-hub',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.65,
        max_tokens: 800,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  let raw: string = data.choices?.[0]?.message?.content ?? '';
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const parsed = JSON.parse(raw.slice(start, end + 1));

  return {
    ...currentQ,
    id: `replaced-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    questionRu: parsed.questionRu,
    questionEn: parsed.questionEn,
    options: parsed.options,
    correctIndex: parsed.correctIndex,
  };
}

// ─── Fact-check single question ──────────────────────────────────────────────

async function factCheckSingle(q: QuizQuestion, apiKey: string): Promise<string> {
  const letters = ['A', 'B', 'C', 'D'];
  const opts = q.options.map((o, j) => `  ${letters[j]}) ${o.ru}`).join('\n');
  const correct = `${letters[q.correctIndex]}) ${q.options[q.correctIndex]?.ru ?? '?'}`;

  const prompt = `Ты эксперт-фактчекер. Проверь один вопрос викторины на достоверность.

Ответь ОДНОЙ строкой в одном из форматов:
✅ Верно
⚠️ Неточность: [краткое объяснение]
❌ Ошибка: [что не так и правильный ответ]

Вопрос: ${q.questionRu}
${opts}
Правильный ответ: ${correct}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'party-games-hub',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    }),
  });

  if (!res.ok) return '⚠️ Не удалось проверить';
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim() || '⚠️ Нет ответа';
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    action: 'delete' | 'replace';
    quizType: 'general' | 'special';
    specialId?: string;
    question: QuizQuestion;
    existingQuestions?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, quizType, specialId, question } = body;
  if (!action || !quizType || !question?.id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const overrides = await readOverrides();

  // ── Delete ──────────────────────────────────────────────────────────────────
  if (action === 'delete') {
    if (quizType === 'general') {
      if (!overrides.general.deleted.includes(question.id)) {
        overrides.general.deleted.push(question.id);
      }
    } else {
      if (!specialId) return NextResponse.json({ error: 'specialId required' }, { status: 400 });
      if (!overrides.special[specialId]) overrides.special[specialId] = { deleted: [], replaced: [] };
      const sp = overrides.special[specialId];
      sp.replaced = sp.replaced.filter((r) => r.originalId !== question.id);
      if (!sp.deleted.includes(question.id)) sp.deleted.push(question.id);
    }
    await writeOverrides(overrides);
    return NextResponse.json({ ok: true });
  }

  // ── Replace (special only) ──────────────────────────────────────────────────
  if (action === 'replace') {
    if (quizType !== 'special' || !specialId) {
      return NextResponse.json({ error: 'Replace is only available for special quizzes' }, { status: 400 });
    }

    let replacement: QuizQuestion;
    try {
      replacement = await generateReplacement(specialId, question, body.existingQuestions ?? []);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 502 });
    }

    if (!overrides.special[specialId]) overrides.special[specialId] = { deleted: [], replaced: [] };
    const sp = overrides.special[specialId];
    sp.replaced = sp.replaced.filter((r) => r.originalId !== question.id);
    if (!sp.deleted.includes(question.id)) sp.deleted.push(question.id);
    sp.replaced.push({ originalId: question.id, replacement });

    await writeOverrides(overrides);
    return NextResponse.json({ ok: true, replacement });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
