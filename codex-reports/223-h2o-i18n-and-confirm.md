# REPORT TASK-223: 100 к 1 — двуязычность + убрать двойной confirm

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-07 22:40
> - **Финиш:** 2026-06-07 23:05
> - **Длительность:** 25 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Экран `100 к 1` переведён на локальный ru/en helper `l(...)` по конвенции соседних игр. Нативный `confirm()` из `endGame` удалён: завершение теперь сразу делает `game:end` и навигацию, а подтверждение остаётся за `GameLayout`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — добавлен `useTranslation`, helper `l`, локализованы видимые UI-строки страницы, локальные labels тем и раундов, убран `confirm()` из `endGame`.

### Новые файлы

- `codex-reports/223-h2o-i18n-and-confirm.md` — отчёт по TASK-223.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/hundred-to-one/page.tsx | 265 ++++++++++++++------------
 1 file changed, 140 insertions(+), 125 deletions(-)
```

Примечание: в worktree уже был изменён `codex-tasks/_DONE.md`; я его не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint чисто |
| `npx tsc --noEmit` | ✅ | TypeScript чисто |
| `npm run build` | ⚠️ | Упал из-за Turbopack sandbox: `creating new process` / `binding to a port` / `Operation not permitted` на `geistmono_157ca88a.module.css` |
| `grep -nE "[А-Яа-яЁё]\|confirm\\(" src/app/game/[roomId]/hundred-to-one/page.tsx` | ✅ | Кириллица осталась как первый аргумент `l(...)`, дефолтные team-name данные `Команда 1/2`, либо комментарии; `confirm(` отсутствует |
| Locale labels | ✅ | UI-строки страницы переключаются через `l(ru, en)` |

---

## Отклонения от ТЗ

Сохраняемые дефолты `Команда 1` / `Команда 2` оставлены русскими как данные в `mkInitial()` и `confirmMyTeamName()` по ТЗ.

Банк вопросов/ответов остаётся русским, потому что он приходит из `src/lib/hundred-to-one/questions.ts`, а whitelist TASK-223 разрешает менять только страницу. На самой странице добавлены локальные английские labels для тем и раундов.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `endGame`: подтверждение теперь полностью делегировано `GameLayout`.
- Проверь локальные `topicName` и `roundNames`: они заменяют русские labels из внешнего question bank без изменения whitelist-файлов.
