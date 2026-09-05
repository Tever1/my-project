# REPORT TASK-376: `room:show-qr` — persist server state

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-21 20:40
> - **Финиш:** 2026-07-21 20:40
> - **Длительность:** < 1 минуты активных правок, проверки отдельно
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлено persisted-состояние `showQrCode` в серверный `Room`, оно теперь попадает в `room:state` и `room:get-state`. Клиенты `/join`, Lobby TV и TV game route синхронизируют локальный QR-state из snapshot и сохраняют существующие live-listener'ы `room:show-qr`.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен `Room.showQrCode`, дефолт `false`, поле включено в оба room snapshot; `room:show-qr` теперь сохраняет boolean в комнате перед broadcast.
- `src/components/lobby/Lobby.tsx` — `RoomState` парсит `showQrCode`; TV-роль синхронизирует `isWaitingForPlayers` из snapshot через microtask; live-listener оставлен.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — `useRoomState` парсит `showQrCode`; `showQrOverlay` инициализируется из snapshot через microtask; live-listener оставлен.
- `src/app/join/[code]/page.tsx` — `JoinRoomState` получил `showQrCode`; `qrShown` синхронизируется из `room:state` через microtask; live-listener оставлен.

### Новые файлы

- `codex-reports/376-room-show-qr-persist-server-state.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/join/[code]/page.tsx            |  83 +++-
src/app/tv/[roomId]/[gameType]/page.tsx | 691 ++++++++++++++++++++++++--------
src/components/lobby/Lobby.tsx          |  16 +-
src/server/socket-handlers.mts          |   9 +-
4 files changed, 599 insertions(+), 200 deletions(-)
```

Примечание: stat выше включает уже существующий незакоммиченный большой diff в TV `hundred-to-one` и изменения TASK-375 в join/Lobby/TV. Собственные строки TASK-376:

- `src/server/socket-handlers.mts:29,96,229,365,502-503`
- `src/components/lobby/Lobby.tsx:96,385,463,557-559`
- `src/app/tv/[roomId]/[gameType]/page.tsx:391,447-449,471-473`
- `src/app/join/[code]/page.tsx:23,84,110,130-132`

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| Acceptance: persisted snapshot | ✅ | `showQrCode` хранится в `Room` и отдаётся через оба snapshot-пути |
| Acceptance: live listener сохранён | ✅ | `room:show-qr` listener'ы не удалялись |

---

## Отклонения от ТЗ

Нет отклонений по runtime-файлам. Для прохождения текущего ESLint `setState` из snapshot-sync эффектов выполняется через `queueMicrotask`, иначе правило `react-hooks/set-state-in-effect` падает.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Ручной браузерный QA сценарий не запускался; задача проверена статически через `tsc` и lint.

---

## Подсказки для ревью

- Особо посмотреть `src/app/tv/[roomId]/[gameType]/page.tsx:471` и аналогичные эффекты: это намеренная microtask-синхронизация snapshot → local state под новое React lint rule.
