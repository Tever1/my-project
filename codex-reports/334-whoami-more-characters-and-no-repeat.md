# REPORT TASK-334: «Кто я?» — добавить 100 персонажей в пул + не повторять недавних

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-11 23:45
> - **Финиш:** 2026-07-11 23:51
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Пул `WHO_AM_I_CHARACTERS` расширен с 30 до 130 персонажей, дубликатов по `en` нет. В `who-am-i/page.tsx` добавлена память последнего раунда через `useRef<Set<string>>`, и новый раунд по возможности выбирает персонажей вне этого набора.

---

## Что сделано

### Изменённые файлы

- `src/lib/game-data.ts` — добавлены 100 новых персонажей в конец `WHO_AM_I_CHARACTERS` после `Cheburashka`.
- `src/app/game/[roomId]/who-am-i/page.tsx` — `assignCharacters` принимает `excludeKeys`, выбирает preferred pool без персонажей прошлого раунда и fallback'ится на полный пул; `handleStart` передаёт и заменяет `recentlyUsedRef.current`.

### Новые файлы

- `codex-reports/334-whoami-more-characters-and-no-repeat.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Full working tree уже содержал изменения предыдущих задач до старта TASK-334. Focused stat по файлам TASK-334:

```text
 src/app/game/[roomId]/who-am-i/page.tsx | 722 +++++++++++++++++++++++++-------
 src/lib/game-data.ts                    | 100 +++++
 2 files changed, 666 insertions(+), 156 deletions(-)
```

`who-am-i/page.tsx` stat включает незакоммиченные изменения прошлых задач, которые уже были в файле до старта; изменения TASK-334 в этом файле ограничены `assignCharacters`, `recentlyUsedRef` и `handleStart`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npm run build` | ❌ | Turbopack panic: `creating new process` / `binding to a port` / `Operation not permitted` |
| `npx next build --webpack` | ✅ | Сборка завершилась с exit code 0; во время prerender остался существующий `ReferenceError: location is not defined` на `/profile` |
| `WHO_AM_I_CHARACTERS.length === 130` | ✅ | Проверено node-скриптом |
| Дубликаты персонажей | ✅ | Дубликатов по `en` нет |
| Анти-повтор прошлого раунда | ✅ | `preferred` исключает `recentlyUsedRef.current`, fallback на полный пул при нехватке |
| Малый пул не ломается | ✅ | При `preferred.length < playerIds.length` используется полный пул |

---

## Отклонения от ТЗ

`npm run build` не прошёл из-за sandbox/Turbopack internal error, не из-за кода задачи. Для проверки production build дополнительно запущен `npx next build --webpack`, он завершился успешно.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

нет.

---

## Подсказки для ревью

- Посмотреть `assignCharacters` и `handleStart`: анти-повтор хранит только последний раунд и не попадает в socket/game state.
- Full `git diff --name-only` содержит старые изменения вне whitelist (`.codex/STATUS.md`, `codex-tasks/_DONE.md`, `docs/...`, TV page и др.), они были до старта TASK-334 и не редактировались в рамках этой задачи.
