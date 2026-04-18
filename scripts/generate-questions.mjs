#!/usr/bin/env node
/**
 * AI Question Generator — generates quiz questions via OpenRouter LLM.
 *
 * Usage:
 *   npm run gen-questions -- --theme "harry-potter" --quiz 2 --count 10
 *   npm run gen-questions -- --theme "marvel" --quiz 2
 *   npm run gen-questions -- --theme "star-wars" --quiz 1 --lang ru
 *
 * Options:
 *   --theme   Theme slug, e.g. "harry-potter", "marvel", "star-wars"
 *   --quiz    Quiz number within the theme (default: 1)
 *   --count   Number of questions to generate (default: 10)
 *   --lang    Primary language for questions: "ru" | "en" (default: "ru")
 *   --dry     Print generated TypeScript without saving to disk
 *
 * Output:
 *   src/lib/quiz/themed/<theme>.ts  (appended if file exists, created if not)
 *
 * Requires OPENROUTER_API_KEY in .env.local.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ─── Load .env.local ────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(projectRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found. Copy .env.local.example and fill in OPENROUTER_API_KEY.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) {
      const [, key, rawValue] = match;
      const value = rawValue.replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

// ─── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  };
  const theme = get('--theme');
  if (!theme) {
    console.error('❌ --theme is required. Example: --theme "harry-potter"');
    process.exit(1);
  }
  return {
    theme: theme.toLowerCase().replace(/\s+/g, '-'),
    quizNumber: parseInt(get('--quiz') ?? '1', 10),
    count: parseInt(get('--count') ?? '10', 10),
    lang: (get('--lang') ?? 'ru'),
    dry: args.includes('--dry'),
  };
}

// ─── Theme → human-readable name ────────────────────────────────────────────

const THEME_LABELS = {
  'harry-potter': 'Harry Potter (книги и фильмы Джоан Роулинг)',
  'marvel': 'Marvel Cinematic Universe (MCU)',
  'star-wars': 'Звёздные войны (Star Wars)',
  'lord-of-the-rings': 'Властелин колец (Толкиен + фильмы Джексона)',
  'game-of-thrones': 'Игра престолов (сериал HBO)',
  'disney': 'Disney (мультфильмы и фильмы)',
  'friends': 'Сериал «Друзья» (Friends)',
  'breaking-bad': 'Сериал «Во все тяжкие» (Breaking Bad)',
  'the-office': 'Сериал «Офис» (The Office)',
  'geography': 'География мира',
  'history': 'История мира',
  'science': 'Наука и технологии',
  'music': 'Музыка (поп, рок, мировые хиты)',
  'sports': 'Спорт (футбол, олимпиада и т.д.)',
};

// ─── Build LLM prompt ────────────────────────────────────────────────────────

function buildPrompt(theme, quizNumber, count, lang) {
  const themeLabel = THEME_LABELS[theme] ?? theme;
  const prefix = `${theme.replace(/-/g, '').slice(0, 4)}${quizNumber}`;

  return `Ты генератор вопросов для викторины. Создай ровно ${count} вопросов средней сложности на тему: «${themeLabel}».

ТРЕБОВАНИЯ:
- Средняя сложность: не слишком очевидные, но и не экзотические факты
- 4 варианта ответа (A, B, C, D), ровно один правильный
- Все вопросы и ответы должны быть на ДВУХ языках: русском (ru) и английском (en)
- Вопросы должны быть разнообразными — не повторять одну и ту же тему
- Все факты должны быть точными и проверяемыми по канону
- id каждого вопроса: "${prefix}-1", "${prefix}-2", ..., "${prefix}-${count}"

ВЕРНИ СТРОГО ВАЛИДНЫЙ JSON МАССИВ — без markdown, без пояснений, только JSON:

[
  {
    "id": "${prefix}-1",
    "questionRu": "Вопрос на русском?",
    "questionEn": "Question in English?",
    "options": [
      { "ru": "Вариант 1", "en": "Option 1" },
      { "ru": "Вариант 2", "en": "Option 2" },
      { "ru": "Вариант 3", "en": "Option 3" },
      { "ru": "Вариант 4", "en": "Option 4" }
    ],
    "correctIndex": 0
  }
]

Верни ТОЛЬКО JSON массив, без единого слова до или после него.`;
}

// ─── Call OpenRouter ─────────────────────────────────────────────────────────

async function callLLM(prompt, apiKey) {
  const model = 'google/gemini-2.0-flash-001'; // cheap + fast + good JSON

  console.log(`🤖 Calling ${model}...`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/Tever1/my-project',
      'X-Title': 'Party Games Hub - Question Generator',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage;

  if (usage) {
    console.log(`📊 Tokens: ${usage.prompt_tokens} in + ${usage.completion_tokens} out`);
  }

  return text;
}

// ─── Parse JSON from LLM response ───────────────────────────────────────────

function parseQuestions(raw) {
  // Strip markdown code fences if present
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract JSON array
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array found in response');

  const json = text.slice(start, end + 1);
  const questions = JSON.parse(json);

  if (!Array.isArray(questions)) throw new Error('Parsed value is not an array');

  return questions;
}

// ─── Validate questions ──────────────────────────────────────────────────────

function validateQuestions(questions) {
  const errors = [];
  const ids = new Set();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `Q[${i + 1}]`;

    if (!q.id) errors.push(`${prefix}: missing id`);
    else if (ids.has(q.id)) errors.push(`${prefix}: duplicate id "${q.id}"`);
    else ids.add(q.id);

    if (!q.questionRu) errors.push(`${prefix}: missing questionRu`);
    if (!q.questionEn) errors.push(`${prefix}: missing questionEn`);
    if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${prefix}: must have exactly 4 options`);
    else {
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].ru || !q.options[j].en) errors.push(`${prefix}: option[${j}] missing ru or en`);
      }
    }
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
      errors.push(`${prefix}: correctIndex must be 0-3`);
    }
  }

  return errors;
}

// ─── Convert to TypeScript ───────────────────────────────────────────────────

function toTypeScript(questions, theme, quizNumber, existingCount) {
  const exportName = `${themeToExportName(theme)}_${quizNumber}_QUESTIONS`;
  const lines = [];

  if (existingCount === 0) {
    lines.push(`import { QuizQuestion } from '@/types/game';`);
    lines.push('');
  }

  lines.push(`export const ${exportName}: QuizQuestion[] = [`);

  for (const q of questions) {
    lines.push(`  {`);
    lines.push(`    id: '${q.id}',`);
    lines.push(`    topic: 'pop-culture',`);
    lines.push(`    difficulty: 'medium',`);
    lines.push(`    questionRu: ${JSON.stringify(q.questionRu)},`);
    lines.push(`    questionEn: ${JSON.stringify(q.questionEn)},`);
    lines.push(`    options: [`);
    for (const opt of q.options) {
      lines.push(`      { ru: ${JSON.stringify(opt.ru)}, en: ${JSON.stringify(opt.en)} },`);
    }
    lines.push(`    ],`);
    lines.push(`    correctIndex: ${q.correctIndex},`);
    lines.push(`    timeLimit: 20,`);
    lines.push(`  },`);
  }

  lines.push(`];`);
  lines.push('');

  return { code: lines.join('\n'), exportName };
}

function themeToExportName(theme) {
  return theme.toUpperCase().replace(/-/g, '_');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  const { theme, quizNumber, count, lang, dry } = parseArgs();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set in .env.local');
    process.exit(1);
  }

  const outPath = path.join(projectRoot, 'src/lib/quiz/themed', `${theme}.ts`);
  const existingContent = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
  const existingCount = existingContent.length;

  console.log(`\n🎯 Theme: ${theme}`);
  console.log(`📝 Quiz #${quizNumber} — generating ${count} questions...`);
  console.log(`📁 Output: ${path.relative(projectRoot, outPath)}\n`);

  const prompt = buildPrompt(theme, quizNumber, count, lang);

  let raw;
  try {
    raw = await callLLM(prompt, apiKey);
  } catch (err) {
    console.error('❌ LLM call failed:', err.message);
    process.exit(1);
  }

  let questions;
  try {
    questions = parseQuestions(raw);
    console.log(`✅ Parsed ${questions.length} questions`);
  } catch (err) {
    console.error('❌ Failed to parse JSON:', err.message);
    console.error('Raw response:\n', raw.slice(0, 500));
    process.exit(1);
  }

  const errors = validateQuestions(questions);
  if (errors.length > 0) {
    console.error('⚠️  Validation issues:');
    errors.forEach((e) => console.error('  -', e));
    if (errors.some((e) => e.includes('missing') || e.includes('duplicate'))) {
      console.error('❌ Stopping due to validation errors.');
      process.exit(1);
    }
  }

  const { code, exportName } = toTypeScript(questions, theme, quizNumber, existingCount);

  if (dry) {
    console.log('\n─── DRY RUN ─────────────────────────────────');
    console.log(code);
    console.log('─────────────────────────────────────────────');
    console.log('\n✅ Dry run complete. Use without --dry to save.');
    return;
  }

  // Append to existing file or create new
  if (existingCount > 0) {
    fs.appendFileSync(outPath, '\n' + code);
    console.log(`✅ Appended ${exportName} to ${path.basename(outPath)}`);
  } else {
    fs.writeFileSync(outPath, code);
    console.log(`✅ Created ${outPath}`);
  }

  console.log('\n📌 Next steps:');
  console.log(`   1. Review src/lib/quiz/themed/${theme}.ts`);
  console.log(`   2. Add to SPECIAL_QUIZZES in src/lib/quiz/index.ts:`);
  console.log(`      { id: '${theme}-${quizNumber}', theme: '${theme}', number: ${quizNumber}, ... }`);
  console.log(`   3. Add to SPECIAL_QUIZ_BANKS:`);
  console.log(`      '${theme}-${quizNumber}': ${exportName}`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
