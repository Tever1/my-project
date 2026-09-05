# REPORT TASK-311: Alias classic team-name step

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-30 01:20
> - **Финиш:** 2026-06-30 01:45
> - **Длительность:** 25 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлена classic-only фаза `teamName` после распределения команд в Alias. Первый подключённый игрок каждой команды вводит название, обе команды видят статусы, после двух подтверждений игра автоматически переходит в `waiting`; у хоста есть fallback-кнопка продолжения.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/alias/page.tsx` — добавлены `teamName` phase и `teamNameConfirmed`, host callbacks/actions для названий команд, мобильный UI ввода/статусов между `teamSelect` и `waiting`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — alias TV state расширен `teamNameConfirmed`, добавлен экран `teamName` с командами и статусом выбора имени.

### Новые файлы

- `codex-reports/311-alias-team-name-step.md` — отчёт по TASK-311.

### Удалённые файлы

- (нет)

---

## Diff stat

Общий `git diff --stat` на момент отчёта включает pre-existing dirty files, которые были до TASK-311:

```
 src/app/design-tokens/page.tsx          | 147 ++++++++++
 src/app/game/[roomId]/alias/page.tsx    | 462 ++++++++++++++++++++++----------
 src/app/globals.css                     |  24 ++
 src/app/join/[code]/page.tsx            |  53 +++-
 src/app/tv/[roomId]/[gameType]/page.tsx | 226 +++++++++++-----
 src/server/socket-handlers.mts          |   9 +
 6 files changed, 702 insertions(+), 219 deletions(-)
```

TASK-311 touched only whitelist files:

```
 src/app/game/[roomId]/alias/page.tsx    | 462 ++++++++++++++++++++++----------
 src/app/tv/[roomId]/[gameType]/page.tsx | 226 +++++++++++-----
 2 files changed, 475 insertions(+), 213 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run lint` | ✅ | чисто |
| `npm run build` | не запускал | по ТЗ не запускать |
| Acceptance: classic `teamSelect` → `teamName` → `waiting` | ✅ | реализовано через `finalizeTeams`, `setTeamName`, `continueFromTeamNames` |
| Acceptance: TV показывает команды и кто выбирает | ✅ | добавлен render `aliasState.phase === 'teamName'` |

---

## Отклонения от ТЗ

Нет отклонений по реализации. В рабочем дереве уже были изменения вне whitelist до старта; я их не редактировал и не откатывал.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь mobile `teamName` flow: первый подключённый игрок определяется по `players.find(...isConnected)`, fallback — первый id команды.
- Проверь host fallback: `continueFromTeamNames()` переводит в `waiting`, оставляя неподтверждённые команды с текущими дефолтными именами.
