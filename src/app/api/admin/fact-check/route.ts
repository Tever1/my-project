import { NextRequest, NextResponse } from 'next/server';

interface QuestionForCheck {
  id: string;
  questionRu: string;
  options: { ru: string }[];
  correctIndex: number;
}

export async function POST(req: NextRequest) {
  const { questions } = await req.json() as { questions: QuestionForCheck[] };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
  if (!questions?.length) return NextResponse.json({ error: 'No questions provided' }, { status: 400 });

  const optLetters = ['A', 'B', 'C', 'D'];

  const formatted = questions.map((q, i) => {
    const opts = q.options.map((o, j) => `  ${optLetters[j]}) ${o.ru}`).join('\n');
    const correct = `${optLetters[q.correctIndex]}) ${q.options[q.correctIndex]?.ru ?? '?'}`;
    return `Вопрос ${i + 1}: ${q.questionRu}\n${opts}\nПравильный ответ: ${correct}`;
  }).join('\n\n');

  const prompt = `Ты эксперт-фактчекер. Проверь следующие вопросы викторины на достоверность.

Для каждого вопроса укажи одно из:
✅ Верно — если вопрос, варианты и правильный ответ точны
⚠️ Неточность — если есть мелкая неточность, объясни
❌ Ошибка — если правильный ответ неверен, укажи правильный

Будь краток: одна строка на вопрос. Если всё верно — просто список ✅.

${formatted}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'party-games-hub',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `OpenRouter ${res.status}: ${text}` }, { status: 500 });
  }

  const data = await res.json();
  const report = data.choices?.[0]?.message?.content ?? 'Нет ответа';
  return NextResponse.json({ report });
}
