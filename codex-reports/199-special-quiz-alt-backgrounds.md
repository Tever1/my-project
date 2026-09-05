# REPORT TASK-199: Альтернативные фоны для спец-квизов

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-02 21:15
> - **Финиш:** 2026-06-02 21:18
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Спец-квизы `harry-potter-1` и `marvel-1` теперь ссылаются на альтернативные фоны `harry-potter1.webp` и `marvel1.webp`. `SPECIAL_QUIZ_THEMES` не редактировались в рамках TASK-199 и остаются на базовых `.webp`.

---

## Что сделано

### Изменённые файлы

- `src/lib/quiz/index.ts` — в `SPECIAL_QUIZZES` заменены `backgroundUrl` для `harry-potter-1` и `marvel-1` на `*1.webp`.

### Новые файлы

- `codex-reports/199-special-quiz-alt-backgrounds.md` — отчёт по TASK-199.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/lib/quiz/index.ts | 8 ++++----
 1 file changed, 4 insertions(+), 4 deletions(-)
```

Примечание: stat по файлу также включает уже существовавшие до TASK-199 изменения `SPECIAL_QUIZ_THEMES`/`SPECIAL_QUIZZES` с `.png` на базовые `.webp`; моя правка в TASK-199 — только две строки `SPECIAL_QUIZZES` на `*1.webp`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Acceptance #1 | ✅ | `harry-potter-1` → `/backgrounds/harry-potter1.webp` |
| Acceptance #2 | ✅ | `marvel-1` → `/backgrounds/marvel1.webp` |
| Acceptance #3 | ✅ | `SPECIAL_QUIZ_THEMES` остаются на базовых `/backgrounds/harry-potter.webp` и `/backgrounds/marvel.webp` |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Проверь `src/lib/quiz/index.ts:36` и `src/lib/quiz/index.ts:37` — это единственные production-строки, изменённые для TASK-199.
