# REPORT TASK-186: Quiz — удалить setup-экраны, включить фоны для спец-квизов

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 20:10
> - **Финиш:** 2026-05-31 20:15
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Setup-фазы в мобильной странице квиза удалены: начальная фаза теперь `waiting`, а setup-хендлеры и JSX больше не используются. Фоны для спец-квизов включены на мобильной и TV-странице через `specialQuizInfo` / `specialThemeInfo`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — удалены setup-фазы из `Phase`, setup-хендлеры, setup-JSX и кнопка возврата из `waiting`; `backgroundUrl` берётся из спец-квиза или спец-темы.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — `backgroundUrl` для quiz TV берётся из `specialQuizInfo`, затем `specialThemeInfo`, затем `topicInfo`.

### Новые файлы

- `codex-reports/186-quiz-cleanup-setup-screens.md` — отчёт по TASK-186.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 497 +++++---------------------------
 src/app/tv/[roomId]/[gameType]/page.tsx |   3 +-
 2 files changed, 78 insertions(+), 422 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Чисто |
| `npm run build` | ❌ | Turbopack упал из-за sandbox: `creating new process`, `binding to a port`, `Operation not permitted (os error 1)` |
| Acceptance #1 | ✅ | В `quiz/page.tsx` нет JSX для setup-фаз |
| Acceptance #2 | ✅ | Мобильный `backgroundUrl` больше не `undefined`, берётся из `specialQuizInfo` / `specialThemeInfo` |
| Acceptance #3 | ✅ | TV `backgroundUrl` берётся из `specialQuizInfo` / `specialThemeInfo` / `topicInfo` |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` не подтвердился из-за ограничения текущего sandbox-окружения, не из-за TypeScript/Next diagnostics.

---

## Открытые вопросы для Claude

Рабочее дерево до старта уже содержало изменения в запрещённых/чужих файлах (`CLAUDE.md`, `.codex/STATUS.md`, `.claude/launch.json`) и других production-файлах. Я их не трогал и не откатывал.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/quiz/page.tsx`: setup-флоу полностью удалён, но существующая логика применения preconfigured config через `game:started` / pending config оставлена.
- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx`: изменение только в вычислении `backgroundUrl`.
