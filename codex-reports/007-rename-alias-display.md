# REPORT TASK-007: Переименовать UI-надпись Alias -> Угадай слово

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 16:39
> - **Финиш:** 2026-05-03 16:44
> - **Длительность:** 5 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Заменил отображаемое русское имя Alias на `Угадай слово` в четырёх точках из whitelist. Внутренние id `alias`, маршруты, socket-события и папку `src/app/game/[roomId]/alias/` не трогал.

Проверки не стали зелёными в текущей среде: `npm run lint` падает на существующих ошибках вне этой правки, `npm run build` падает на Turbopack/sandbox `Operation not permitted`.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — `name: "Alias"` заменено на `name: "Угадай слово"`.
- `src/app/admin/page.tsx` — лейбл кнопки `'🗣 Alias'` заменён на `'🗣 Угадай слово'`.
- `src/app/design-tokens/page.tsx` — `{ id: "alias", ru: "Alias" }` заменено на `{ id: "alias", ru: "Угадай слово" }`.
- `src/app/api/admin/game-stats/route.ts` — `titleRu: 'Alias'` заменено на `titleRu: 'Угадай слово'`.

### Новые файлы

- `codex-reports/007-rename-alias-display.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 .codex/STATUS.md                      |   7 +-
 package-lock.json                     |   7 +-
 package.json                          |   4 +-
 public/icons/games/mafia.png          | Bin 1736803 -> 2764210 bytes
 public/icons/games/quiz.png           | Bin 1234034 -> 1820948 bytes
 src/app/admin/page.tsx                |   2 +-
 src/app/api/admin/game-stats/route.ts |   2 +-
 src/app/design-tokens/page.tsx        | 134 +++++++++++++++++++++++++++++++++-
 src/app/lobby-preview/page.tsx        |   2 +-
 9 files changed, 149 insertions(+), 9 deletions(-)
```

Примечание: в рабочем дереве уже были чужие изменения до TASK-007, включая `.codex/STATUS.md`, `package*.json`, PNG и большую часть diff в `src/app/design-tokens/page.tsx`. Моя правка в `design-tokens` — только одна строка с `ru`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | `error: cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npm run lint` | ❌ | 73 существующие проблемы; среди них `.agents`, `mobile`, старые React lint issues в `src`. Целевые текстовые замены не добавляют новых lint-сценариев. |
| `npm run build` | ❌ | Turbopack internal error: `creating new process`, `binding to a port`, `Operation not permitted (os error 1)` при обработке `src/app/globals.css`. |
| Acceptance #1: lint без новых ошибок | ⚠️ | Общий lint не проходит до задачи; новых ошибок от замен строк не ожидается. |
| Acceptance #2: build успешен | ❌ | Заблокировано sandbox/Turbopack permission error. |
| Acceptance #3: 4 строки изменены точно | ✅ | Подтверждено `git diff` по whitelist. |
| Acceptance #4: никакие другие файлы Codex не тронул | ✅ | Редактировал только 4 whitelist-файла и отчёт. В worktree есть существующие чужие изменения. |
| Acceptance #5: внутренний id `alias` не изменён | ✅ | `id: 'alias'` / `id: "alias"` сохранены. |
| Acceptance #6: папка alias существует | ✅ | `src/app/game/[roomId]/alias/` существует. |

Дополнительно:
- `grep -rn '"Alias"' src || true` после правок ничего не нашёл.
- `grep -c "titleRu: 'Угадай слово'" src/lib/games-config.ts` вернул `1`.
- `grep -rn "Alias" ...` по проверенным файлам оставляет только `src/app/admin/page.tsx:77` (`alias: 'Alias'`, не whitelist-строка для изменения) и комментарий `src/app/admin/page.tsx:1074`, который ТЗ прямо запрещает трогать.

---

## Отклонения от ТЗ

- `git pull` не выполнен из-за sandbox permission на `.git/FETCH_HEAD`.
- `npm run lint` и `npm run build` не прошли, причины выше.
- `git diff --stat` не равен строго четырём файлам из-за существующих изменений в worktree до начала TASK-007.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не исправлял существующие lint/build проблемы, потому что они вне whitelist и не связаны с переименованием.
- Не трогал `src/app/admin/page.tsx:77` (`alias: 'Alias'`), потому что ТЗ разрешало в admin менять только лейбл вкладки `🗣 Alias`.

---

## Подсказки для ревью

- Проверь четыре целевые строки в diff.
- Обрати внимание, что большой diff в `src/app/design-tokens/page.tsx` был уже в рабочем дереве; изменение TASK-007 там только `ru: "Alias"` -> `ru: "Угадай слово"`.
