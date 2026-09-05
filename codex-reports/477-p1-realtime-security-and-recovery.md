# REPORT TASK-477: P1 realtime security and recovery

> **Метаданные**
> - **Старт:** 2026-08-25
> - **Финиш:** 2026-08-26 08:05 PDT
> - **Длительность:** несколько рабочих проходов; точный тайминг не фиксировался
> - **Статус:** ⚠️ partial — реализация, независимый post-fix review и
>   автоматическая reconnect-матрица завершены; остаётся ручной phone/TV
>   regression

---

## Резюме (TL;DR)

Исправлены четыре P1 из read-only аудита: неавторизованные игровые действия,
потеря state при reload хоста, глобальная доставка приватных данных и
недостаточная серверная проверка Mafia. Сервер теперь хранит канонический
in-memory snapshot, проверяет actor/host/role/phase и выдаёт каждому socket
персонализированный state. После review также устранены утечки game-host / Big
Game, сохранён холст Spy, закрыты дополнительные phase validation и защищён
existing-player reconnect непрозрачным токеном. Socket reconnect game host,
обычного игрока и TV подтверждён для всех семи production-игр. Правило победы
Crocodile не менялось.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — permissions для room/game команд,
  server snapshots, адресная доставка приватных событий, server-first resync и
  ограничение legacy `game:state-update` только полями счёта Quiz / «100 к 1».
- `src/app/game/[roomId]/quiz/page.tsx` — host-only очередь вопросов и
  возобновляемый countdown после reload.
- `src/app/game/[roomId]/mafia/page.tsx` — синхронизация дневного таймера через
  серверный snapshot.
- `src/app/game/[roomId]/who-am-i/page.tsx` — точная догадка проверяется
  сервером без выдачи собственного персонажа браузеру игрока.
- `src/app/game/[roomId]/alias/page.tsx`, `spy/page.tsx`,
  `hundred-to-one/page.tsx` — resync при возврате вкладки,
  продолжение таймеров и восстановление локального UI из server snapshot.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — resync TV после reconnect/возврата
  вкладки и восстановление рисунка Spy.
- `src/lib/use-room-state.ts` — повторный `room:get-state` после соединения.
- `src/lib/room-reconnect-token.ts`, `src/lib/use-game-identity.ts`,
  `src/components/lobby/Lobby.tsx`, `src/app/join/[code]/page.tsx` — выдача,
  локальное хранение и предъявление reconnect-token без публикации в комнате.
- `PROJECT_CONTEXT.md`, `TASKS.md`, `codex-reports/CODEX-HANDOFF.md` —
  канонический статус и следующий шаг фазы J.
- `docs/decisions/001-room-state-and-game-host-authority.md` — ссылка на
  уточняющее архитектурное решение.

### Новые файлы

- `src/server/game-security.mts` — reducer-ы snapshot, recipient-specific
  sanitization и проверки Mafia/Who Am I.
- `src/server/game-security.test.mts` — 11 unit-тестов privacy, reducers,
  таймеров и Mafia actor/host rules.
- `src/server/reconnect.integration.test.mts` — реальный disconnect и join с
  новым socket для всех семи production-игр.
- `docs/decisions/006-server-game-snapshots-and-private-views.md` — ADR нового
  server snapshot/privacy слоя.

### Удалённые файлы

- Нет. Существующее пользовательское удаление
  `Картинки для игр/Мафия/Фон.jpg` сохранено без вмешательства.

---

## Diff stat

В scope TASK-477: 16 изменённых и 6 новых файлов. Пользовательское удаление
изображения Mafia в этот scope не входит.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| Unit + socket integration tests | ✅ | 19/19: 11 unit + 8 reconnect matrix; host/player/TV, timers, invalid token |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | 0 ошибок, 4 известных warning Mafia |
| `git diff --check` | ✅ | без whitespace-ошибок |
| Dev route smoke | ✅ | `/admin`, 7 mobile routes и TV отвечают `200` |
| Ручной browser/multiplayer flow | ⏸️ | автоматический Socket.io regression пройден; полный UI-flow ещё не выполнялся |
| Production build | ⏸️ | не было явного разрешения; dev-server не останавливался |

---

## Отклонения от scope/плана

В рамках reconnect сохранены и материализуются по серверному времени активные
таймеры Quiz, Crocodile, Alias, Spy, Mafia и «100 к 1», иначе восстановленный
экран мог продолжить устаревший отсчёт. Дизайн и игровые правила «100 к 1» не
менялись: ограниченный reconnect fix выполнен по явному запросу проверить все
игры, а продуктовая пауза сохраняется.

---

## Решения, требующие Анастасии

- Провести ручной phone/TV regression.
- Отдельно решить судьбу локально удалённого файла Mafia; TASK-477 его не трогал.

---

## Что НЕ сделано

- Не проводился полный ручной browser gameplay и production build.
- Не добавлялось постоянное хранение: рестарт Node-процесса по-прежнему
  уничтожает комнаты и snapshots.
- Не менялось правило победы Crocodile.

---

## Подсказки для ревью

- Проверить матрицу `isAuthorizedGameAction` для всех существующих событий.
- Проверить `sanitizeSnapshot` отдельно для host, active player, другого игрока
  и TV, особенно Quiz, Spy, Mafia, Who Am I и Big Game.
- Проверить reload ведущего в Quiz countdown/question и Mafia day/night.
- Проверить, что существующие клиентские reducer-ы принимают персональные
  snapshots без сброса публичного состояния.

---

## Передача контекста

- `/context-save`: ❌ не выполнялся в этой сессии
- Checkpoint: отсутствует
- Передача в `Party Games Hub — Общий прогресс`: текущий чат является общим
