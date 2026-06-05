# REPORT TASK-212: Единый фон спец-квиза

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-04 21:00
> - **Финиш:** 2026-06-04 21:05
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Фоны спец-квизов сведены к базовым `.webp`: `harry-potter.webp` и `marvel.webp`.
Плашки выбора, `SPECIAL_QUIZZES`, экран ожидания и игра теперь используют один и тот же URL через существующий resolve flow.

---

## Что сделано

### Изменённые файлы

- `src/lib/quiz/index.ts` — в `SPECIAL_QUIZZES` заменены `backgroundUrl` для `harry-potter-1` и `marvel-1` с alt-файлов `*1.webp` на базовые theme-фоны.
- `src/components/lobby/Lobby.tsx` — в `QuizSelectionScreen` заменены `.png` URL на `.webp` в `backgroundUrl` и аргументах `onSelectSpecial(...)`.

### Новые файлы

- `codex-reports/212-special-quiz-bg-consistent.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 216 ++++++++++++++++-------------------------
 src/lib/quiz/index.ts          |   8 +-
 2 files changed, 89 insertions(+), 135 deletions(-)
```

Примечание: stat включает уже существовавшие изменения в whitelist-файлах. Для TASK-212 внесены только URL-замены из ТЗ.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run lint` | ✅ | 0 ошибок |
| grep `harry-potter1.webp\|marvel1.webp\|/backgrounds/(harry-potter\|marvel).png` в двух whitelist-файлах | ✅ | совпадений нет |
| Логика единого фона | ✅ | выбор, ожидание и игра указывают на `harry-potter.webp` / `marvel.webp` |

---

## Отклонения от ТЗ

Нет отклонений по коду. Не трогал `SPECIAL_QUIZ_THEMES`, банки вопросов, сервер и файлы изображений.

---

## Открытые вопросы для Claude

В worktree до/во время задачи уже были изменения вне whitelist и protected-файлы в `git diff --name-only` (`CLAUDE.md`, `.codex/STATUS.md` и др.). Я их не редактировал и не откатывал, чтобы не уничтожить чужую работу.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `src/lib/quiz/index.ts` в `SPECIAL_QUIZZES`: оба `backgroundUrl` должны совпадать с базовыми theme-фонами.
- Проверить `src/components/lobby/Lobby.tsx` в `QuizSelectionScreen`: плашки и `onSelectSpecial(...)` должны передавать те же `.webp` URL.
