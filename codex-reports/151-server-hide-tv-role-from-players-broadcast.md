# REPORT TASK-151: server hide tv role from players broadcast

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-26 21:10
> - **Финиш:** 2026-05-26 21:16
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TV-role больше не попадает в broadcasted `players` в `room:state`. `tvConnected` сохраняется и считается до фильтрации, а `room.players` Map не меняется.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — в `broadcastRoomState` и `room:get-state` добавлен `allPlayers`, `tvConnected` считается до фильтра, а `players` отдаётся без `role === 'tv'`.

### Новые файлы

- `codex-reports/151-server-hide-tv-role-from-players-broadcast.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 149 ++++++--
 src/app/join/[code]/page.tsx            |   2 +-
 src/app/tv/[roomId]/[gameType]/page.tsx |  69 +++-
 src/components/lobby/Lobby.tsx          | 635 ++++++++++++++++++++++++++++----
 src/server/socket-handlers.mts          |  28 +-
 5 files changed, 761 insertions(+), 122 deletions(-)
```

Примечание: общий `git diff --stat` включает незакоммиченные изменения предыдущих задач. В рамках TASK-151 изменён только whitelist-файл `src/server/socket-handlers.mts` и создан этот отчёт.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit code 0 |
| `npx tsc --noEmit` | ✅ | exit code 0 |
| Acceptance: `broadcastRoomState` фильтрует TV из `players`, но сохраняет `tvConnected` | ✅ | `tvConnected` считается из `allPlayers` до фильтра |
| Acceptance: `room:get-state` фильтрует TV из `players`, но сохраняет `tvConnected` | ✅ | аналогичная структура ответа |
| Acceptance: `room.players` Map остаётся нетронут | ✅ | меняется только сериализация state |
| Acceptance: никаких изменений вне whitelist | ✅ | код менялся только в `src/server/socket-handlers.mts`; отчёт добавлен отдельно |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить две точки сериализации `room:state`: `broadcastRoomState` и `room:get-state`.
- Убедиться, что `hostId` и `gameHostPlayerId` остаются без изменений, даже если `hostId` указывает на TV-создателя комнаты.
