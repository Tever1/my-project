# REPORT TASK-191: Обычные квизы — бейджи сложности и темы как в спец-квизах

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 21:50 PDT
> - **Финиш:** 2026-05-31 21:55 PDT
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

General waiting-бейджи обычного квиза приведены к стилю спец-квиза: без иконок, `rounded-md`, с `border border-white/10 bg-white/5 backdrop-blur-xl` и `font-semibold`. Изменения ограничены mobile waiting и TV waiting ветками `diffInfo/topicInfo`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — в mobile waiting general-ветке удалены `DifficultyIcon`/`QuizIcon` из бейджей сложности и темы, заменён `glass-badge` на rounded-md стиль.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — в TV waiting general-ветке удалены `DifficultyIcon`/`QuizIcon` из бейджей сложности и темы, заменён `glass-badge` на rounded-md стиль.

### Новые файлы

- `codex-reports/191-general-quiz-badges-cleanup.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 6 ++----
 src/app/tv/[roomId]/[gameType]/page.tsx | 6 ++----
 2 files changed, 4 insertions(+), 8 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint завершился без ошибок |
| `npm run build` | ❌ | Turbopack internal error из-за sandbox: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `geist` CSS |
| Acceptance #1 | ✅ | В waiting general-бейджах нет `<DifficultyIcon>` / `<QuizIcon>` |
| Acceptance #2 | ✅ | Используется класс `rounded-md border border-white/10 bg-white/5 backdrop-blur-xl` |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` не прошёл из-за ограничения среды, не из-за TypeScript/React ошибки в изменённых файлах.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить только waiting general-ветки в `quiz/page.tsx` и TV `page.tsx`; final-фаза и `specialThemeInfo` оставлены без изменений.
