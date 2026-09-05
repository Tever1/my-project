# REPORT TASK-198: Кнопка «Добавить игрока» + QR на TV и в лобби

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-02 20:28
> - **Финиш:** 2026-06-02 20:53
> - **Длительность:** 25 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Кнопка «+ Добавить игрока» теперь определяется по настоящему локальному id game-host телефона: Lobby сравнивает `gameHostPlayerId` с обоими возможными id текущего браузера (`user.id` и `party-hub-join-guest-id`). TV-lobby больше не игнорирует `room:show-qr`, а TV-game показывает QR-оверлей поверх игрового поля по тому же событию.

---

## Диагностика id

- `src/app/join/[code]/page.tsx` заводит/читает `party-hub-join-guest-id`, затем отправляет `room:join` с `playerId = user?.id ?? guestPlayerId`.
- `src/server/socket-handlers.mts` выставляет `room.gameHostPlayerId` при первом новом `room:join` с `role: 'player'`.
- `src/components/lobby/Lobby.tsx` раньше вычислял `effectivePlayerId = user?.id ?? guestPlayerId`, поэтому авторизованный браузер всегда предпочитал `user.id` и мог не совпасть с `gameHostPlayerId`, если первый join телефона был сделан как guest.
- Исправление: Lobby считает локальными оба id (`user.id`, `guestPlayerId`) и дает права game-host phone только если `gameHostPlayerId` входит в этот набор. Обычным игрокам это право не расширяется.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — `canAddPlayer` и game-host banner теперь проверяют `gameHostPlayerId` против обоих локальных id; TV-клиент в лобби реагирует на `room:show-qr` и показывает QR waiting screen.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен listener `room:show-qr`, `/api/local-ip` join URL, QR-оверлей поверх всех TV-game render branches; закрытие по тапу, повторному событию или таймеру 30 секунд.

### Новые файлы

- `codex-reports/198-add-player-qr-fix.md` — этот отчёт.

### Удалённые файлы

- (нет)

---

## Diff stat

Полный `git diff --stat` включает pre-existing изменения TASK-197/Claude в рабочем дереве:

```
 .claude/hooks/post-commit.sh            | 13 ++++++
 .codex/STATUS.md                        | 13 ++++--
 CLAUDE.md                               | 33 +++++++++++++++
 src/app/game/[roomId]/quiz/page.tsx     | 16 ++++++++
 src/app/tv/[roomId]/[gameType]/page.tsx | 73 ++++++++++++++++++++++++++++++++-
 src/components/lobby/Lobby.tsx          | 48 +++++++++++++++++-----
 src/server/socket-handlers.mts          | 13 ++++++
 7 files changed, 193 insertions(+), 16 deletions(-)
```

TASK-198 touched only:

```
 src/app/tv/[roomId]/[gameType]/page.tsx | 73 ++++++++++++++++++++++++++++++++-
 src/components/lobby/Lobby.tsx          | 48 +++++++++++++++++-----
 2 files changed, 109 insertions(+), 12 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `npm run lint` | ✅ | без ошибок/предупреждений после фикса |
| `npx tsc --noEmit` | ✅ | зелёный |
| `npm run build` | ⚠️ | Turbopack internal error: `creating new process` / `binding to a port` / `Operation not permitted`; похоже на sandbox/permissions, не на TS/lint |
| Acceptance: game-host phone button | ✅ code | сравнение id исправлено; реальный телефон проверит пользователь |
| Acceptance: QR на TV во время игры | ✅ code | `room:show-qr` listener + overlay во всех TV-game branches |
| Acceptance: QR на TV lobby | ✅ code | TV lobby больше не делает ранний return по `room:show-qr` |
| Acceptance: сетевой IP | ✅ code | TV-game использует `/api/local-ip` и `/join/<roomId>` |
| Acceptance: обычные игроки без кнопки | ✅ code | право только `isCurrentUserHost` или match с `gameHostPlayerId` |

---

## Отклонения от ТЗ

- Сервер не менял: `room:show-qr` уже broadcast-ится в `room:<code>`, а TV-game socket уже присоединяется через `tv:join`.
- `npm run build` не прошёл из-за Turbopack sandbox error, при этом `lint` и `tsc` зелёные.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

нет

---

## Подсказки для ревью

- Проверь `src/components/lobby/Lobby.tsx`: `localPlayerIds` намеренно содержит оба id, потому что `gameHostPlayerId` мог быть создан guest join-ом, а Lobby позже предпочитал `user.id`.
- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx`: QR-оверлей добавлен поверх render branches без изменения игровой логики.
