import type { ContentQuiz } from './catalog';
export const HARRY_POTTER_FILMS_POLICY = 'harry-potter-films-v1';

export function quizContentPolicy(quiz?: Pick<ContentQuiz, 'theme' | 'titleRu' | 'titleEn'>) {
  if (quiz?.theme === 'harry-potter') return `КАНОН КВИЗА: только восемь основных фильмов Harry Potter (2001–2011), от «Философского камня» до «Даров Смерти: Часть 2».
Книги, игры, Fantastic Beasts, интервью и другие расширенные материалы не являются источником правильного ответа.
Проверяй, генерируй и исправляй вопросы только по тому, что показано или прямо сказано в этих фильмах.
Если фильм и книга противоречат друг другу, правильным считается вариант из фильма. Не помечай вопрос ошибочным только из-за расхождения с книгой.
Ссылки должны подтверждать именно киноверсию события или факта; источник только о книге недостаточен.`;
  return '';
}
export function quizPolicyId(quiz?: Pick<ContentQuiz, 'theme'>) { return quiz?.theme === 'harry-potter' ? HARRY_POTTER_FILMS_POLICY : undefined; }
