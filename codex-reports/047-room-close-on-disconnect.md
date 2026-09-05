# REPORT TASK-047: Room close on disconnect

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 11:22 PDT
> - **Финиш:** 2026-05-10 11:23 PDT
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

`room:leave` теперь вызывает disconnect-логику в explicit-режиме. Explicit leave и последний игрок удаляются сразу без 30-секундного таймаута; неожиданный disconnect при нескольких игроках сохраняет grace period.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен параметр `explicit` в `handleDisconnect`; `room:leave` передаёт `true`; immediate-delete ветка удаляет игрока/комнату без таймера.

### Новые файлы

- `codex-reports/047-room-close-on-disconnect.md` — отчёт по TASK-047.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/server/socket-handlers.mts | 17 ++++++++++++++---
 1 file changed, 14 insertions(+), 3 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | 0 problems |
| Explicit `room:leave` | ✅ | удаление без 30с задержки |
| Last player disconnect | ✅ | комната удаляется сразу |
| Unexpected disconnect with others | ✅ | 30с grace period сохранён |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- Проверить сценарий host explicit leave при нескольких игроках: host transfer происходит до immediate delete, затем `broadcastRoomState`.
