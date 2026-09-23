import type { ContentQuiz } from './catalog';
export const HARRY_POTTER_FILMS_POLICY = 'harry-potter-films-v1';
export const MARVEL_MCU_POLICY = 'marvel-mcu-v1';

export function quizContentPolicy(quiz?: Pick<ContentQuiz, 'theme' | 'titleRu' | 'titleEn' | 'verificationPolicy'>) {
  const base = quiz?.theme === 'harry-potter' ? `КАНОН КВИЗА: только восемь основных фильмов Harry Potter (2001–2011), от «Философского камня» до «Даров Смерти: Часть 2».
Книги, игры, Fantastic Beasts, интервью и другие расширенные материалы не являются источником правильного ответа.
Проверяй, генерируй и исправляй вопросы только по тому, что показано или прямо сказано в этих фильмах.
Если фильм и книга противоречат друг другу, правильным считается вариант из фильма. Не помечай вопрос ошибочным только из-за расхождения с книгой.
Ссылки должны подтверждать именно киноверсию события или факта; источник только о книге недостаточен.`
    : quiz?.theme === 'marvel' ? `КАНОН КВИЗА: только фильмы и сериалы киновселенной Marvel (MCU) от Marvel Studios.
Проверяй, генерируй и исправляй вопросы по событиям и персонажам MCU. Если вопрос не уточняет вселенную, трактуй его в рамках MCU; при неоднозначности уточни MCU в формулировке.
Комиксы Marvel, игры и другие экранизации вне MCU не являются источником правильного ответа. При расхождении с комиксами правильным считается вариант из MCU; не помечай его ошибочным из-за комиксной версии. Дополнительный профиль может сузить тему или период MCU, но не расширить канон за его пределы.
Ссылки должны подтверждать именно версию MCU; страницы о комиксах не подтверждают факты MCU.` : '';
  const custom = quiz?.verificationPolicy?.trim();
  return [base, custom ? `ПРОФИЛЬ ПРОВЕРКИ ТЕМАТИЧЕСКОГО КВИЗА:\n${custom}` : ''].filter(Boolean).join('\n\n');
}
export function quizPolicyId(quiz?: Pick<ContentQuiz, 'theme' | 'verificationPolicy'>) {
  const base = quiz?.theme === 'harry-potter' ? HARRY_POTTER_FILMS_POLICY : quiz?.theme === 'marvel' ? MARVEL_MCU_POLICY : '';
  const custom = quiz?.verificationPolicy?.trim() ? `custom:${quiz.verificationPolicy.trim()}` : '';
  return [base, custom].filter(Boolean).join('+') || undefined;
}
