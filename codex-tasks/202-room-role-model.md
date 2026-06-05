# TASK-202: Ролевая модель комнаты — создатель ≠ хост ≠ игрок

> **Метаданные**
> - **Дата создания:** 2026-06-02
> - **Сложность:** complex
> - **Запуск:** auto by Claude
> - **Зависит от тасков:** 200

---

## Цель

Развести три роли на сервере:
- **Создатель/TV** (`role: 'tv'`, десктоп) — создаёт комнату, НЕ хост, НЕ считается
  игроком.
- **Хост** — ПЕРВЫЙ телефон-игрок (`role: 'player'`), зашедший в комнату. Получает
  права: старт игры, кик, передача хоста, приглашение.
- **Игроки** — остальные телефоны.

Плюс:
- Старт игры при 0 игроках (`role: 'player'`) → ошибка «В комнате нет игроков».
- Кикать и передавать хост может ТОЛЬКО хост (серверная проверка).

---

## Контекст

Багрепорт 2026-06-02 (третья итерация). Решения пользователя: вход свободный
(хост только кикает, без одобрения), хост = первый зашедший телефон.

Текущее (`src/server/socket-handlers.mts`):
- `room:create` добавляет создателя как `isHost: true`, `hostId = creator`.
- `room:join` (строки 253-256): первый `role:'player'` → `gameHostPlayerId`, но
  `isHost` остаётся false и `hostId` не меняется.
- `room:kick` / `room:transfer-host` — БЕЗ проверки прав (любой может).
- `game:start` (329) — без проверки числа игроков.

Клиент уже фильтрует `role==='tv'` из списка игроков (`room:get-state` стр. 290,
`/join` visiblePlayers). Хост на клиенте определяется через `gameHostPlayerId`.

---

## Файлы к изменению (whitelist)

- `src/server/socket-handlers.mts`:
  1. **`room:create`**: создатель — `isHost: false`. `hostId` инициализировать
     пустым (`''`), т.к. хоста ещё нет (первый телефон станет хостом). Роль
     создателя остаётся как пришла (`data.role`, для десктопа `'tv'`).
  2. **`room:join`**: когда первый `role:'player'` входит и `gameHostPlayerId === null`
     → назначить его хостом: `gameHostPlayerId = player.id`, `room.hostId = player.id`,
     `player.isHost = true`. (Если хост вышел и зашёл новый игрок — хостом он НЕ
     становится автоматически; назначение только когда `gameHostPlayerId === null`.
     Поведение при выходе хоста — см. существующий grace host-transfer, не трогать.)
  3. **`game:start`**: перед стартом посчитать игроков `role==='player'`. Если 0 →
     НЕ стартовать, отправить инициатору `socket.emit('game:error', { messageRu:
     'В комнате нет игроков', messageEn: 'No players in the room' })`. (Добавить
     минимальный эвент `game:error`.)
  4. **`room:kick`**: проверить, что отправитель — хост. Найти игрока-отправителя
     по `socket.id`; если `!sender || !sender.isHost` → return (игнор). Иначе кик
     как сейчас.
  5. **`room:transfer-host`**: проверить, что отправитель — хост (как в #4). При
     передаче: снять `isHost` со старого хоста, поставить новому, обновить
     `room.hostId = newHostId` И `room.gameHostPlayerId = newHostId`.

### НЕ ТРОГАТЬ

- Per-player reconnect/grace (TASK-111…119), room-level inactivity (TASK-200),
  host-transfer при grace-таймауте — не ломать. Назначение хоста в `room:join`
  только для `gameHostPlayerId === null`.
- `broadcastRoomState` / `room:get-state` структуру не менять (они уже шлют
  `isHost`, `role`, `gameHostPlayerId`).
- никакие файлы вне whitelist
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/**`, `.codex/**`

---

## Шаги реализации

1. `room:create`: `isHost: false`, `hostId: ''`.
2. `room:join`: в ветке назначения `gameHostPlayerId` добавить `room.hostId = player.id`
   и `player.isHost = true`.
3. `game:start`: guard на 0 игроков `role:'player'` + эмит `game:error`.
4. `room:kick`: host-only проверка по сокету отправителя.
5. `room:transfer-host`: host-only + перенос флага `isHost` + `hostId`.

> Если выяснится, что какой-то клиент полагается на `hostId === creator` — описать
> в отчёте, не менять клиент в этом таске (клиентский UX — TASK-203).

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` зелёный
- [ ] Создатель-TV не помечен хостом; `hostId` пуст пока не зашёл телефон
- [ ] Первый телефон-игрок становится хостом (`isHost`, `hostId`, `gameHostPlayerId`)
- [ ] Старт при 0 игроках → `game:error` «В комнате нет игроков», игра не стартует
- [ ] Кик/передача-хоста срабатывают только от хоста (от не-хоста игнор)
- [ ] Передача хоста переносит `isHost` и обновляет `hostId`+`gameHostPlayerId`

---

## Ограничения и подводные камни

- **Host-authoritative:** все проверки прав — на сервере. Клиент скрывает кнопки,
  но сервер — источник правды.
- Идентификация отправителя — по `socket.id` → игрок в `room.players`.
- i18n: `game:error` несёт обе строки (`messageRu`/`messageEn`).
- Комментарии — английский.

---

## Контрольные точки для самопроверки Codex

1. `git diff src/server/socket-handlers.mts`.
2. Reconnect/grace/inactivity не сломаны.
3. `npm run lint` + `npx tsc --noEmit`.
4. Заполнить `codex-reports/202-room-role-model.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Что если хост вышел и `gameHostPlayerId` стал null — назначать ли нового? —
  **только существующий grace host-transfer (TASK-111…119), новый таск это не меняет.**
- `hostId` пустой — строка `''` или поле опциональным? — **пустая строка `''`**
  (тип `hostId: string` не менять).
