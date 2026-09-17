import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ALL_QUIZ_QUESTIONS, SPECIAL_QUIZZES } from '@/lib/quiz';
import { HARRY_POTTER_1_QUESTIONS } from '@/lib/quiz/themed/harry-potter';
import { MARVEL_1_QUESTIONS } from '@/lib/quiz/themed/marvel';
import { WHO_AM_I_CHARACTERS, ALIAS_WORDS, CROCODILE_WORDS, SPY_WORDS, SPY_LOCATIONS } from '@/lib/game-data';
import { ContentStore } from './store';
import type { ContentQuestion, GameCatalog } from './catalog';
import type { QuestionReview } from '@/lib/quiz-review';

async function readOptional<T>(filename: string): Promise<T | null> {
  try { return JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
function baseline(): GameCatalog {
  const banks: Record<string, ContentQuestion[]> = { 'harry-potter-1': HARRY_POTTER_1_QUESTIONS, 'marvel-1': MARVEL_1_QUESTIONS };
  return structuredClone({ general: ALL_QUIZ_QUESTIONS,
    quizzes: SPECIAL_QUIZZES.map(quiz => ({ ...quiz, questions: banks[quiz.id] ?? [] })),
    characters: WHO_AM_I_CHARACTERS.map((character, i) => ({ id: `character-${i + 1}`, ...character })),
    words: {
      alias: ALIAS_WORDS.map((word, i) => ({ id: `alias-${i + 1}`, ...word })),
      crocodile: CROCODILE_WORDS.map((word, i) => ({ id: `crocodile-${i + 1}`, ...word })),
      spy: [...SPY_WORDS.map((ru, i) => ({ id: `spy-${i + 1}`, ru })),
        ...SPY_LOCATIONS.map((loc, i) => ({ id: `spy-location-${i + 1}`, ru: loc.word }))],
    } });
}
async function migrate(catalog: GameCatalog) {
  const old = await readOptional<{ general?: { deleted?: string[] }; special?: Record<string, { deleted?: string[]; replaced?: { replacement: ContentQuestion }[] }> }>(path.join(process.cwd(), 'data', 'quiz-overrides.json'));
  if (old) {
    catalog.general = catalog.general.filter(q => !old.general?.deleted?.includes(q.id));
    for (const quiz of catalog.quizzes) {
      const overrides = old.special?.[quiz.id];
      quiz.questions = quiz.questions.filter(q => !overrides?.deleted?.includes(q.id));
      for (const item of overrides?.replaced ?? []) {
        if (!overrides?.deleted?.includes(item.replacement.id) && !quiz.questions.some(q => q.id === item.replacement.id)) quiz.questions.push(item.replacement);
      }
    }
  }
  const directory = path.join(process.cwd(), 'data', 'quiz-reviews');
  let files: string[];
  try { files = await readdir(directory); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return catalog; throw error; }
  const reviews: QuestionReview[] = [];
  for (const filename of files.filter(file => /^[a-f0-9]{64}\.json$/.test(file))) {
    const entries = await readOptional<Record<string, QuestionReview>>(path.join(directory, filename));
    reviews.push(...Object.values(entries ?? {}));
  }
  for (const review of reviews.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))) {
    const q = [...catalog.general, ...catalog.quizzes.flatMap(quiz => quiz.questions)].find(q => q.id === review.question.id);
    if (q) Object.assign(q, { questionRu: review.question.questionRu, questionEn: review.question.questionEn,
      options: review.question.options, correctIndex: review.question.correctIndex });
  }
  return catalog;
}
export const contentStore = new ContentStore(process.cwd(), async () => baseline(), migrate);
