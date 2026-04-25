import { NextResponse } from 'next/server';
import { SCIENCE_QUESTIONS } from '@/lib/quiz/science';
import { HISTORY_QUESTIONS } from '@/lib/quiz/history';
import { POP_CULTURE_QUESTIONS } from '@/lib/quiz/pop-culture';
import { HARRY_POTTER_1_QUESTIONS } from '@/lib/quiz/themed/harry-potter';
import { MARVEL_1_QUESTIONS } from '@/lib/quiz/themed/marvel';
import { SPECIAL_QUIZZES, SPECIAL_QUIZ_THEMES } from '@/lib/quiz/index';
import type { QuizQuestion } from '@/types/game';

const GENERAL_BANKS = [
  { topic: 'science',      titleRu: 'Наука',         questions: SCIENCE_QUESTIONS },
  { topic: 'history',      titleRu: 'История',        questions: HISTORY_QUESTIONS },
  { topic: 'pop-culture',  titleRu: 'Поп-культура',   questions: POP_CULTURE_QUESTIONS },
];

const SPECIAL_BANKS: Record<string, QuizQuestion[]> = {
  'harry-potter-1': HARRY_POTTER_1_QUESTIONS,
  'marvel-1':       MARVEL_1_QUESTIONS,
};

export async function GET() {
  const general = GENERAL_BANKS.map(({ topic, titleRu, questions }) => ({
    topic,
    titleRu,
    total: questions.length,
    easy:   questions.filter((q) => q.difficulty === 'easy').length,
    medium: questions.filter((q) => q.difficulty === 'medium').length,
    hard:   questions.filter((q) => q.difficulty === 'hard').length,
  }));

  const special = SPECIAL_QUIZZES.map((quiz) => {
    const bank = SPECIAL_BANKS[quiz.id] ?? [];
    // backgroundUrl from quiz itself, or fall back to theme-level background
    const themeInfo = SPECIAL_QUIZ_THEMES.find((t) => t.id === quiz.theme);
    const backgroundUrl = quiz.backgroundUrl ?? themeInfo?.backgroundUrl ?? null;
    // Extract just the filename from the URL (e.g. "/backgrounds/harry-potter.png" → "harry-potter")
    const backgroundFile = backgroundUrl
      ? backgroundUrl.split('/').pop()?.replace(/\.png$/, '') ?? null
      : null;
    return {
      id: quiz.id,
      theme: quiz.theme,
      number: quiz.number,
      titleRu: quiz.titleRu,
      icon: quiz.icon,
      count: bank.length,
      hasDedicatedBank: !!SPECIAL_BANKS[quiz.id],
      backgroundUrl,
      backgroundFile,
    };
  });

  return NextResponse.json({ general, special });
}
