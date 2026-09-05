import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { SCIENCE_QUESTIONS } from '@/lib/quiz/science';
import { HISTORY_QUESTIONS } from '@/lib/quiz/history';
import { POP_CULTURE_QUESTIONS } from '@/lib/quiz/pop-culture';
import { HARRY_POTTER_1_QUESTIONS } from '@/lib/quiz/themed/harry-potter';
import { MARVEL_1_QUESTIONS } from '@/lib/quiz/themed/marvel';
import type { QuizQuestion } from '@/types/game';

const GENERAL_BANKS: Record<string, QuizQuestion[]> = {
  'science':     SCIENCE_QUESTIONS,
  'history':     HISTORY_QUESTIONS,
  'pop-culture': POP_CULTURE_QUESTIONS,
};

const SPECIAL_BANKS: Record<string, QuizQuestion[]> = {
  'harry-potter-1': HARRY_POTTER_1_QUESTIONS,
  'marvel-1':       MARVEL_1_QUESTIONS,
};

const OVERRIDES_PATH = path.join(process.cwd(), 'data', 'quiz-overrides.json');

async function readOverrides() {
  try {
    return JSON.parse(await fs.readFile(OVERRIDES_PATH, 'utf-8'));
  } catch {
    return { general: { deleted: [] }, special: {} };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic      = searchParams.get('topic');
  const difficulty = searchParams.get('difficulty');
  const specialId  = searchParams.get('specialId');

  const overrides = await readOverrides();

  if (specialId) {
    const base = SPECIAL_BANKS[specialId] ?? [];
    const sp = overrides.special?.[specialId] ?? { deleted: [], replaced: [] };
    const deletedSet = new Set<string>(sp.deleted ?? []);
    const filtered = base.filter((q: QuizQuestion) => !deletedSet.has(q.id));
    const replacements: QuizQuestion[] = (sp.replaced ?? []).map(
      (r: { originalId: string; replacement: QuizQuestion }) => r.replacement
    );
    return NextResponse.json({ questions: [...filtered, ...replacements] });
  }

  if (topic) {
    const base = GENERAL_BANKS[topic] ?? [];
    const deletedSet = new Set<string>(overrides.general?.deleted ?? []);
    let questions = base.filter((q: QuizQuestion) => !deletedSet.has(q.id));
    if (difficulty && difficulty !== 'all') {
      questions = questions.filter((q: QuizQuestion) => q.difficulty === difficulty);
    }
    return NextResponse.json({ questions });
  }

  return NextResponse.json({ error: 'Provide topic or specialId' }, { status: 400 });
}
