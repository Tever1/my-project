# REPORT TASK-190: Quiz — фикс фона и чистка бейджей ожидания

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 21:38
> - **Финиш:** 2026-05-31 21:45
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Фикс выполнен строго в рамках whitelist: `GameLayout` теперь создаёт stacking context через `isolate`, а waiting-бейдж спец-квиза на mobile и TV больше не показывает `QuizIcon` и использует `rounded-md` стиль answer tile. Логика конфига/сокетов и general-бейджи не тронуты.

---

## Что сделано

### Изменённые файлы

- `src/components/games/GameLayout.tsx` — добавлен `isolate` в root className рядом с `relative`.
- `src/app/game/[roomId]/quiz/page.tsx` — в waiting-ветке `specialQuizInfo` удалён `<QuizIcon>`, `glass-badge` заменён на `rounded-md border border-white/10 bg-white/5 backdrop-blur-xl`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — аналогично очищен TV waiting-бейдж `specialQuizInfo`.

### Новые файлы

- `codex-reports/190-quiz-bg-stacking-and-badge-cleanup.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 3 +--
 src/app/tv/[roomId]/[gameType]/page.tsx | 3 +--
 src/components/games/GameLayout.tsx     | 2 +-
 3 files changed, 3 insertions(+), 5 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Без ошибок, unused `QuizIcon` не появился |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `creating new process`, `binding to a port`, `Operation not permitted (os error 1)` при обработке `node_modules/geist/dist/geistmono_157ca88a.module.css` |
| Acceptance #1 | ✅ | `npm run lint` чистый |
| Acceptance #2 | ✅ | `GameLayout` root div содержит `relative isolate` |
| Acceptance #3 | ✅ | Waiting-бейджи `specialQuizInfo` без `<QuizIcon>` и с `rounded-md border border-white/10 bg-white/5 backdrop-blur-xl` |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` не прошёл из-за ограничения окружения/Turbopack, не из-за TypeScript или изменённых файлов.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить, что оставшиеся `<QuizIcon>` в обоих quiz-файлах находятся не в waiting-ветке `specialQuizInfo`, а в других UI-ветках, которые ТЗ просило не трогать.
- В worktree до старта уже были чужие изменения в `.claude/launch.json`, `.codex/STATUS.md`, `CLAUDE.md` и untracked `codex-tasks/*`/старые отчёты; они не изменялись в рамках TASK-190.
