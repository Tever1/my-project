# REPORT TASK-045: Leave room confirmation

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 00:20 PDT
> - **Финиш:** 2026-05-10 00:25 PDT
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `RoomMenu` добавлено двухшаговое подтверждение выхода: первый клик по «Выйти» показывает «Выйти? Да Отмена», и только «Да» вызывает существующий `onLeaveRoom`. «Отмена» возвращает исходную кнопку.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен локальный `confirmLeave` state в `RoomMenu`; кнопка «Выйти» заменена на confirm UI; крестик закрытия сбрасывает confirm state перед `onClose`.

### Новые файлы

- `codex-reports/045-leave-room-confirmation.md` — отчёт по TASK-045.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 131 ++++++++++++++++++++++++++++++-----------
 1 file changed, 96 insertions(+), 35 deletions(-)
```

Примечание: текущий unstaged diff файла также включает незакоммиченную правку TASK-044.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Acceptance: first click asks confirmation | ✅ | `setConfirmLeave(true)` |
| Acceptance: only yes leaves | ✅ | `onLeaveRoom` вызывается только кнопкой «Да» |
| Acceptance: cancel reverts | ✅ | «Отмена» сбрасывает `confirmLeave` |

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

- Проверить, что «Выйти» больше не вызывает leave напрямую, а крестик закрывает меню без выхода.
