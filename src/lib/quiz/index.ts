import { QuizQuestion, QuizDifficulty, QuizTopic, QuizTopicInfo } from '@/types/game';
import { SCIENCE_QUESTIONS } from './science';
import { HISTORY_QUESTIONS } from './history';
import { POP_CULTURE_QUESTIONS } from './pop-culture';

// All general quiz questions combined
export const ALL_QUIZ_QUESTIONS: QuizQuestion[] = [
  ...SCIENCE_QUESTIONS,
  ...HISTORY_QUESTIONS,
  ...POP_CULTURE_QUESTIONS,
];

// Topic metadata
export const QUIZ_TOPICS: QuizTopicInfo[] = [
  { id: 'science', titleRu: 'Наука', titleEn: 'Science', icon: '🔬' },
  { id: 'history', titleRu: 'История', titleEn: 'History', icon: '📜' },
  { id: 'pop-culture', titleRu: 'Поп-культура', titleEn: 'Pop Culture', icon: '🎬' },
];

// Difficulty metadata
export const QUIZ_DIFFICULTIES: { id: QuizDifficulty; titleRu: string; titleEn: string; icon: string; color: string }[] = [
  { id: 'easy', titleRu: 'Лёгкий', titleEn: 'Easy', icon: '🟢', color: 'from-green-600/20 to-green-500/5 border-green-500/30' },
  { id: 'medium', titleRu: 'Средний', titleEn: 'Medium', icon: '🟡', color: 'from-yellow-600/20 to-yellow-500/5 border-yellow-500/30' },
  { id: 'hard', titleRu: 'Сложный', titleEn: 'Hard', icon: '🔴', color: 'from-red-600/20 to-red-500/5 border-red-500/30' },
];

/**
 * Get questions filtered by topic and difficulty.
 * Returns a new shuffled array each time.
 */
export function getQuizQuestions(
  topic: QuizTopic,
  difficulty: QuizDifficulty,
  excludeIds?: Set<string>,
): QuizQuestion[] {
  let questions = ALL_QUIZ_QUESTIONS.filter(
    (q) => q.topic === topic && q.difficulty === difficulty,
  );

  // Exclude already-shown questions (if any remain)
  if (excludeIds && excludeIds.size > 0) {
    const filtered = questions.filter((q) => !excludeIds.has(q.id));
    // If all questions were shown, reset and use full pool
    if (filtered.length === 0) {
      // All exhausted — return full pool shuffled
    } else {
      questions = filtered;
    }
  }

  // Shuffle (Fisher-Yates)
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Get count of available questions for a topic+difficulty combo.
 */
export function getQuestionCount(topic: QuizTopic, difficulty: QuizDifficulty): number {
  return ALL_QUIZ_QUESTIONS.filter(
    (q) => q.topic === topic && q.difficulty === difficulty,
  ).length;
}
