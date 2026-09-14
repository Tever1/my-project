# TASK-518 — Итог хода Крокодила

## Результат

Вместо мгновенного перехода к следующему игроку сервер при истечении времени
создаёт фазу `turnResult`. Объясняющий видит число `wordsGuessed` за этот ход
и нижнюю кнопку «Продолжить». Другие телефоны и TV показывают результат и
ожидание; секретное слово по-прежнему доступно только объясняющему.

`croc:continue` разрешена только текущему объясняющему в turnResult с актуальным
turnNumber. Сервер выбирает следующего игрока/слово, сбрасывает счётчики хода
или завершает финальный круг. Общий счёт не начисляется повторно. Даже последний
ход показывает личный итог до финала. Старые host snapshots не могут заменить
итог или пропустить его. Итог сохраняется без таймера и после reconnect.

Если объясняющий отключился, игра ждёт его возврата и подтверждения; новая
возможность пропустить его решение для хоста не добавлялась.

## Файлы

- `src/server/game-security.mts`: expiry, continuation reducer, phase guard.
- `src/server/socket-handlers.mts`: actor/phase/turn validation и broadcast.
- `src/app/game/[roomId]/crocodile/page.tsx`: ru/en результат и кнопка.
- `src/app/tv/[roomId]/[gameType]/page.tsx`: ru/en результат и ожидание.
- `src/server/crocodile-timer.integration.test.mts`: новые ожидания и регрессии.
- PROJECT_CONTEXT.md, TASKS.md, CODEX-HANDOFF.md: правило и pending-проверки.

Все предшествующие dirty-изменения сохранены. Другие игры не изменялись.

## Проверки

- Security unit tests: 17/17 passed.
- Crocodile tests: 3/3 passed. Покрыты остановка в результате, финальный ход,
  отсутствие повторного начисления, неверный actor/номер хода, legacy sync,
  независимые ticks, TV privacy, реальный socket reconnect в turnResult и
  продолжение восстановившимся игроком.
- Общая reconnect-матрица и сопутствующие protocol tests: 13/13 passed
  (в совместном запуске с Crocodile 16/16).
- TypeScript и scoped ESLint изменённых production-файлов — passed.
- `git diff --check` — passed.
- Первый запуск socket tests был заблокирован sandbox listen EPERM;
  после разрешённого запуска на временном локальном порту тесты прошли.

Browser/device QA, production build, restart, commit/push не выполнялись.
Для активации нужен разрешённый restart, который уничтожит текущие комнаты.
Нужны отдельный свежий review серверного/TV-контура перед публикацией и ручная
проверка phone/TV, включая ноль угаданных слов и последний ход финального круга.
