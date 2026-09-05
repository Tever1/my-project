# REPORT TASK-187: Quiz — fix background timing + make quiz badge 3x bigger

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 20:24 PDT
> - **Финиш:** 2026-05-31 20:26 PDT
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлен timing bug спец-квиза: pending config теперь применяется через `isGameHostRef.current`, без зависимости от ещё не проставленного `guestPlayerId`. Плашка спец-квиза в waiting-фазе увеличена до заданных размеров.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — условие применения `pendingQuizConfig` переведено на `isGameHostRef.current`; waiting badge спец-квиза увеличен до `px-10 py-6 text-4xl`, иконка до `size={56}`.

### Новые файлы

- `codex-reports/187-quiz-bg-fix-and-badge-bigger.md` — отчёт по TASK-187.

### Удалённые файлы

- (нет)

---

## Diff stat

Task diff:

```text
 src/app/game/[roomId]/quiz/page.tsx | 6 +++---
 1 file changed, 3 insertions(+), 3 deletions(-)
```

В рабочем дереве также есть уже существующие изменения вне TASK-187:
`.claude/launch.json`, `.codex/STATUS.md`, `CLAUDE.md`. Я их не редактировал и не откатывал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Чисто |
| `npm run build` | ❌ | Turbopack internal error: `creating new process` / `binding to a port` / `Operation not permitted (os error 1)` при обработке `src/app/globals.css`; похоже на sandbox/runtime limitation, не на diff TASK-187 |
| Acceptance #1 | ✅ | Условие в `useRoomState` использует `isGameHostRef.current` |
| Acceptance #2 | ✅ | Badge использует `text-4xl px-10 py-6`, `gap-4`, icon `size={56}` |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` был запущен, но завершился ошибкой окружения/Turbopack.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/quiz/page.tsx`: условие `room.pendingQuizConfig && isGameHostRef.current` намеренно больше не зависит от `effectivePlayerId`.
- В waiting-фазе изменён только special quiz badge; обычные difficulty/topic badges не тронуты.
