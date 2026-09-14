# TASK-513 — автоматическое продолжение Квиза после reveal

## Результат

После показа правильных ответов сервер удерживает экран результата ровно 5 секунд
и сам продолжает игру. Обычный следующий вопрос открывается сразу, без
дополнительного countdown; после вопроса 5 открывается `mid-leaderboard`, где
сохраняется существующая кнопка Continue ведущего; после последнего вопроса
открывается `final`.

## Изменённые файлы

- `src/server/socket-handlers.mts` — `syncDelayedTransition` распознаёт reveal
  Квиза по стабильному ключу `quiz:reveal:<questionIndex>`. Callback повторно
  проверяет комнату, ключ, игру, фазу, reveal и индекс. При отсутствии элемента
  закрытой `questionQueue` он очищает transition key и оставляет reveal-state
  неизменённым. На reveal отклоняются клиентские `quiz:start-question`,
  `quiz:final` и `quiz:sync`, поэтому покинуть экран результата может только
  серверный callback.
- `src/components/games/quiz-pulse/QuizPulse.tsx` — удалена только кнопка
  ведущего на reveal-экране вопроса; кнопка Continue промежуточной таблицы не
  менялась.
- `src/server/delayed-transitions.test.mts` — покрыты обычный переход через
  5000 мс, граница Q5 без нового автоперехода, финальный вопрос, inert stale
  callback и существующие задержки Mafia/H2O.
- `src/server/independent-clocks.integration.test.mts` — реальный Socket.io
  regression блокирует legacy host-переходы во время reveal и подтверждает, что
  `mid-leaderboard -> quiz:start-question` по-прежнему доступен ведущему.

## Проверки

- `node --import tsx --test src/server/delayed-transitions.test.mts` — 5/5 passed.
- `node --import tsx --test src/server/independent-clocks.test.mts` — 3/3 passed.
- `node --import tsx --test src/server/independent-clocks.integration.test.mts` — 5/5 passed,
  including the reveal-authorization regression and existing disconnected-host clocks.
- `npx eslint src/server/socket-handlers.mts src/components/games/quiz-pulse/QuizPulse.tsx src/server/delayed-transitions.test.mts src/server/independent-clocks.integration.test.mts` — passed.
- Scoped `git diff --check` — passed.

## Непроверенные границы

Browser/multiplayer QA phone + TV, restart dev-server, production build, commit
и push не выполнялись. Серверный callback и snapshots проверены детерминированно;
визуальная смена reveal/question и реальный socket-flow требуют отдельного
разрешённого device/browser QA.
