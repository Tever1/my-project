# REPORT TASK-154: add player from room menu shows qr on tv

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-26 21:49
> - **Финиш:** 2026-05-26 21:57
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен socket-event `room:show-qr`: телефон game-host может нажать «+ Добавить игрока» в RoomMenu, сервер ретранслирует событие комнате, а desktop/TV lobby переключается на QR-экран. Права kick/transfer-host остались привязаны к настоящему host, для кнопки добавления введён отдельный `canAddPlayer`.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен handler `room:show-qr`, который broadcast'ит событие всем socket'ам комнаты.
- `src/components/lobby/Lobby.tsx` — добавлен listener `room:show-qr` для TV-режима, обновлён `handleAddPlayer`, вычислен `canAddPlayer = isCurrentUserHost || isGameHostPhone`, флаг передан в `RoomMenu`.

### Новые файлы

- `codex-reports/154-add-player-from-room-menu-shows-qr-on-tv.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 151 ++++++--
 src/app/join/[code]/page.tsx            |  14 +-
 src/app/tv/[roomId]/[gameType]/page.tsx |  71 +++-
 src/components/lobby/Lobby.tsx          | 650 ++++++++++++++++++++++++++++----
 src/server/socket-handlers.mts          |  35 +-
 5 files changed, 797 insertions(+), 124 deletions(-)
```

Примечание: общий `git diff --stat` включает незакоммиченные изменения предыдущих задач. В рамках TASK-154 кодовые правки внесены только в whitelist-файлы `src/server/socket-handlers.mts` и `src/components/lobby/Lobby.tsx`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit code 0 |
| `npx tsc --noEmit` | ✅ | exit code 0 |
| Серверный handler `room:show-qr` | ✅ | broadcast в `room:${room.code}` |
| Кнопка видна game-host телефону | ✅ | через `canAddPlayer = isCurrentUserHost || isGameHostPhone` |
| Телефон → TV QR-screen | ✅ | телефон emit'ит `room:show-qr`, TV listener ставит `isWaitingForPlayers=true` |
| Desktop поведение сохранено | ✅ | desktop тоже emit'ит событие, получает его обратно и открывает QR |
| Никаких изменений вне whitelist | ✅ | код менялся только в двух разрешённых файлах; отчёт добавлен отдельно |

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

- Flow тестирования: создать комнату на desktop/TV, подключить первый телефон как game-host, открыть RoomMenu на телефоне и нажать «+ Добавить игрока»; desktop должен перейти на QR waiting screen.
- `isCurrentUserHost` внутри `RoomMenu` оставлен для kick/transfer-host, новая видимость кнопки добавления идёт через отдельный `canAddPlayer`.
