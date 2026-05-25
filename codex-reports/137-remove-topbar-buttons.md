# REPORT TASK-137: remove-topbar-buttons

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-24 22:42
> - **Финиш:** 2026-05-24 22:54
> - **Длительность:** ~12 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Из TopBar удалены кнопки «ТВ-режим» и отдельная «Создать комнату». `createRoom` оставлен в коде и по-прежнему используется через `handleStartGame`; кнопка «Начать партию» осталась.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — удалён `NavButton` с `window.open('/tv/...')`, удалён `RoomButton` и связанные props/callbacks прямого создания комнаты.

### Новые файлы

- `codex-reports/137-remove-topbar-buttons.md` — отчёт по TASK-137.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/components/lobby/Lobby.tsx | 425 ++++++++++++++++++++++++-----------------
 1 file changed, 252 insertions(+), 173 deletions(-)
```

Примечание: stat по `Lobby.tsx` включает уже лежащие незакоммиченные изменения TASK-134/135/136. Собственная правка TASK-137 — удаление TopBar TV/create кнопок и связанных уже неиспользуемых элементов.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `npm run build` | ✅ | exit 0 после запуска вне sandbox |
| Acceptance: no TV open button | ✅ | `window.open`, «ТВ-режим», «Открыть ТВ» не найдены |
| Acceptance: no separate create button | ✅ | `RoomButton`, `handleCreateRoom`, «Создать комнату» не найдены |
| Acceptance: start button remains | ✅ | «Начать партию» на месте |
| Acceptance: `createRoom` remains | ✅ | `createRoom` используется в `handleStartGame` |

Примечание по build: внутри sandbox Turbopack снова упал на `binding to a port / Operation not permitted`; вне sandbox сборка прошла. Во время успешной сборки Next по-прежнему выводит `ReferenceError: location is not defined`, но команда завершается с кодом 0.

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

- Проверить TopBar: должен остаться nav «Играть» и Avatar, без «ТВ-режим» и без кнопки комнаты/create.
- Проверить `handleStartGame`: он всё ещё вызывает `createRoom()` при отсутствии `roomCode`.
