# REPORT TASK-110: away-state-visibility

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-19 21:50
> - **Финиш:** 2026-05-19 21:57
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен visibility-based away/back flow: клиент шлёт `player:away` / `player:back`, сервер хранит `isAway` и обновляет `room:state`, а аватар игрока в чипах лобби становится grayscale для away/disconnected. Собственный `AvatarPill` пользователя оставлен цветным.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — `Player.isAway`, инициализация `false`, reset на reconnect, `isAway` в admin snapshot, handlers `player:away` / `player:back`.
- `src/lib/use-socket.ts` — добавлен `visibilitychange` listener с emit `player:away` / `player:back`.
- `src/components/ui/PlayerAvatar.tsx` — добавлен prop `away?: boolean`, grayscale/opacity transition.
- `src/components/lobby/Lobby.tsx` — `RoomPlayer.isAway` и `away={!player.isConnected || player.isAway}` в RoomMenu player chip.

### Новые файлы

- `codex-reports/110-away-state-visibility.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx     | 12 +++++++++++-
src/components/ui/PlayerAvatar.tsx |  5 +++++
src/lib/use-socket.ts              | 17 +++++++++++++++++
src/server/socket-handlers.mts     | 37 +++++++++++++++++++++++++++++++++++++
4 files changed, 70 insertions(+), 1 deletion(-)
```

Примечание: в stat по `Lobby.tsx` также попадает уже существующая вставка TASK-109, потому что она была в рабочем дереве до TASK-110. В рамках TASK-110 в `Lobby.tsx` изменены только `RoomPlayer.isAway` и prop `away` у `PlayerAvatar` в RoomMenu.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ✅ | Запущен вне sandbox из-за Turbopack port-binding ограничения; exit code 0. В логе остался существующий `ReferenceError: location is not defined` во время static generation, но build завершился успешно |
| Server `Player.isAway` + init false | ✅ | `src/server/socket-handlers.mts:10`, `:121`, `:164` |
| Server `player:away` / `player:back` | ✅ | `src/server/socket-handlers.mts:309-338` |
| Visibility listener | ✅ | `src/lib/use-socket.ts:36-51` |
| PlayerAvatar `away` visual | ✅ | `src/components/ui/PlayerAvatar.tsx:54-56` |
| RoomMenu chip `away` prop | ✅ | `src/components/lobby/Lobby.tsx:2194-2198` |
| AvatarPill stays colored | ✅ | `src/components/lobby/Lobby.tsx:1103` has no `away` prop |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- `broadcastRoomState` и `room:get-state` уже используют spread без `socketId`, поэтому `isAway` попадает в обычный room state автоматически.
- Disconnect grace period не менялся: disconnected визуально grayscale через `!player.isConnected`, away визуально grayscale через `player.isAway`.
