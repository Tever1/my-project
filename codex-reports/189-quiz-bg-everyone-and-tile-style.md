# REPORT TASK-189: Quiz — фон для всех клиентов + стиль плашек выбора квиза

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 20:45
> - **Финиш:** 2026-05-31 20:52
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Фон спец-квиза теперь применяется у всех клиентов сразу из `room.pendingQuizConfig`, без ожидания `quiz:config` от хоста. Плашки выбора квиза в лобби приведены к glass-стилю из ТЗ.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — в `useRoomState` добавлен `configPatch` из `pendingQuizConfig` для применения `specialQuizId`/`specialTheme` на всех клиентах.
- `src/components/lobby/Lobby.tsx` — обновлён inline-style `QuizSelectionTile`: радиус 8px, граница `rgba(255,255,255,0.10)`, blur 24px, padding 20px, fallback background `rgba(255,255,255,0.05)`.

### Новые файлы

- `codex-reports/189-quiz-bg-everyone-and-tile-style.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx | 25 ++++++++++++++++++++-----
 src/components/lobby/Lobby.tsx      | 10 ++++++----
 2 files changed, 26 insertions(+), 9 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `src/app/globals.css` |
| Acceptance #1 | ✅ | `useRoomState` применяет `configPatch` с `specialQuizId` для всех клиентов |
| Acceptance #2 | ✅ | `QuizSelectionTile` использует требуемые `borderRadius`, `border`, `backdropFilter`, `background` |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` был запущен по workflow, но заблокирован ограничениями окружения/Turbopack, не изменениями задачи.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/quiz/page.tsx:296` — `configPatch` применяется только если у клиента ещё нет `specialQuizId`, чтобы не перетирать уже синхронизированную конфигурацию.
- Проверь `src/components/lobby/Lobby.tsx:2933` — изменение касается только style объекта `QuizSelectionTile`.
