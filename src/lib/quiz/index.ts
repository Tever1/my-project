import { QuizQuestion, QuizDifficulty, QuizTopic, QuizTopicInfo, SpecialQuizInfo, SpecialQuizThemeInfo } from '@/types/game';
import { SCIENCE_QUESTIONS } from './science';
import { HISTORY_QUESTIONS } from './history';
import { POP_CULTURE_QUESTIONS } from './pop-culture';
import { HARRY_POTTER_1_QUESTIONS } from './themed/harry-potter';

// All general quiz questions combined
export const ALL_QUIZ_QUESTIONS: QuizQuestion[] = [
  ...SCIENCE_QUESTIONS,
  ...HISTORY_QUESTIONS,
  ...POP_CULTURE_QUESTIONS,
];

// Topic metadata (general quizzes — split by difficulty)
export const QUIZ_TOPICS: QuizTopicInfo[] = [
  { id: 'random', titleRu: 'Случайные вопросы', titleEn: 'Random Questions', icon: '🎲' },
  { id: 'science', titleRu: 'Наука', titleEn: 'Science', icon: '🔬' },
  { id: 'history', titleRu: 'История', titleEn: 'History', icon: '📜' },
  { id: 'pop-culture', titleRu: 'Поп-культура', titleEn: 'Pop Culture', icon: '🎬' },
];

// Special quiz theme groups. Each theme contains one or more numbered quizzes (#1, #2, ...).
export const SPECIAL_QUIZ_THEMES: SpecialQuizThemeInfo[] = [
  { id: 'harry-potter', titleRu: 'Гарри Поттер', titleEn: 'Harry Potter', icon: '⚡', backgroundUrl: '/backgrounds/harry-potter.png' },
  { id: 'marvel',       titleRu: 'Marvel',        titleEn: 'Marvel',       icon: '🦸', backgroundUrl: '/backgrounds/marvel.png' },
];

// Special quizzes — themed, no difficulty levels.
// Each theme can have multiple quizzes differentiated by #number.
export const SPECIAL_QUIZZES: SpecialQuizInfo[] = [
  { id: 'harry-potter-1', theme: 'harry-potter', number: 1, titleRu: 'Гарри Поттер #1', titleEn: 'Harry Potter #1', icon: '⚡', backgroundUrl: '/backgrounds/harry-potter.png' },
  { id: 'marvel-1',       theme: 'marvel',       number: 1, titleRu: 'Marvel #1',        titleEn: 'Marvel #1',       icon: '🦸', backgroundUrl: '/backgrounds/marvel.png' },
];

/** Return all special quizzes belonging to a theme, sorted by number. */
export function getSpecialQuizzesByTheme(themeId: string): SpecialQuizInfo[] {
  return SPECIAL_QUIZZES
    .filter((q) => q.theme === themeId)
    .sort((a, b) => a.number - b.number);
}

// Default time-per-question for special quizzes (no difficulty to derive from).
export const SPECIAL_QUIZ_TIME_LIMIT = 20;

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
  let questions = topic === 'random'
    ? ALL_QUIZ_QUESTIONS.filter((q) => q.difficulty === difficulty)
    : ALL_QUIZ_QUESTIONS.filter((q) => q.topic === topic && q.difficulty === difficulty);

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
  return topic === 'random'
    ? ALL_QUIZ_QUESTIONS.filter((q) => q.difficulty === difficulty).length
    : ALL_QUIZ_QUESTIONS.filter((q) => q.topic === topic && q.difficulty === difficulty).length;
}

/** Per-quiz question banks. Key = quiz id from SPECIAL_QUIZZES. */
const SPECIAL_QUIZ_BANKS: Record<string, QuizQuestion[]> = {
  'harry-potter-1': HARRY_POTTER_1_QUESTIONS,
};

/**
 * Get questions for a special quiz.
 * Uses the dedicated question bank if available, otherwise falls back to
 * a shuffled pool of medium-difficulty general questions.
 */
export function getSpecialQuizQuestions(
  quizId: string,
  excludeIds?: Set<string>,
): QuizQuestion[] {
  let questions = SPECIAL_QUIZ_BANKS[quizId]
    ?? ALL_QUIZ_QUESTIONS.filter((q) => q.difficulty === 'medium');

  if (excludeIds && excludeIds.size > 0) {
    const filtered = questions.filter((q) => !excludeIds.has(q.id));
    if (filtered.length > 0) questions = filtered;
  }

  // Shuffle
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((q) => ({ ...q, timeLimit: SPECIAL_QUIZ_TIME_LIMIT }));
}
