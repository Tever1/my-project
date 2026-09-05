# REPORT TASK-040: Leave room button

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-09 00:08 PDT
> - **Финиш:** 2026-05-09 00:15 PDT
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В popup меню комнаты добавлена компактная красная кнопка «Выйти» справа от заголовка «Комната · CODE». Клик эмитит `room:leave`, закрывает popup и либо возвращает с `/lobby/[roomId]` на `/`, либо локально очищает room state на главной.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `handleLeaveRoom`, проброшен `onLeaveRoom` в `RoomMenu`, заголовок popup-а комнаты перевёрстан в flex-row с кнопкой «Выйти» справа.

### Новые файлы

- `codex-reports/040-leave-room-button.md` — отчёт по TASK-040.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 101 +++++++++++++++++++++++++++++++----------
 1 file changed, 78 insertions(+), 23 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: кнопка в header popup-а | ✅ | кнопка справа от блока «Комната · CODE» |
| Acceptance: leave flow | ✅ | `room:leave`, закрытие popup, redirect или reset local state |

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

- Проверить поведение на `/` и `/lobby/[roomId]`: route-ветка навигирует на `/`, главная очищает `roomCode` и `roomState`.
