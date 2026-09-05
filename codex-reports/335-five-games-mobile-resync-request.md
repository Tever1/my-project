# REPORT TASK-335: Квиз/Крокодил/Alias/Шпион/100 к 1 — mobile request-state ресинк

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-12 00:05
> - **Финиш:** 2026-07-12 00:14
> - **Длительность:** 9 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен мобильный request-state ресинк для пяти игр: Квиз, Крокодил, Alias, Шпион, 100 к 1. Каждый экран теперь запрашивает состояние при монтировании и при возврате `document.visibilitychange`; существующие host-ответчики не менялись.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — добавлен `useEffect` с `sendAction('quiz:request-state')` на mount и при возврате видимости.
- `src/app/game/[roomId]/crocodile/page.tsx` — добавлен `useEffect` с `broadcast('croc:request-state')` на mount и при возврате видимости.
- `src/app/game/[roomId]/alias/page.tsx` — добавлен `useEffect` с `broadcast('alias:request-state')` на mount и при возврате видимости.
- `src/app/game/[roomId]/spy/page.tsx` — добавлен `useEffect` с `sendAction('spy:request-state')` на mount и при возврате видимости.
- `src/app/game/[roomId]/hundred-to-one/page.tsx` — добавлен `useGameAction`, `sendAction`, и `useEffect` с `sendAction('h2o:request-state')` на mount и при возврате видимости.

### Новые файлы

- `codex-reports/335-five-games-mobile-resync-request.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Scoped diff TASK-335:

```text
 src/app/game/[roomId]/alias/page.tsx          | 13 +++++++++++++
 src/app/game/[roomId]/crocodile/page.tsx      | 13 +++++++++++++
 src/app/game/[roomId]/hundred-to-one/page.tsx | 16 +++++++++++++++-
 src/app/game/[roomId]/quiz/page.tsx           | 13 +++++++++++++
 src/app/game/[roomId]/spy/page.tsx            | 13 +++++++++++++
 5 files changed, 67 insertions(+), 1 deletion(-)
```

В рабочем дереве есть ранее существующие изменения вне whitelist (`.codex/STATUS.md`, who-am-i, TV, старые codex reports/tasks, design-ref и др.). Я их не трогал; общий `git diff --stat` поэтому шире scoped diff.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | `eslint` без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ❌ | Turbopack panic: `Failed to write app endpoint /page`; причина sandbox: `creating new process`, `binding to a port`, `Operation not permitted` |
| `npx next build --webpack` | ✅ | exit code 0; в выводе есть существующий `ReferenceError: location is not defined` при prerender `/profile`, но build завершился успешно |
| Acceptance #1 | ✅ | lint чистый |
| Acceptance #2 | ✅ | tsc чистый |
| Acceptance #3 | ✅ | во всех 5 файлах есть mount + `visibilitychange` request-state |
| Acceptance #4 | ✅ | существующие host-ответчики `*:request-state` не изменены |
| Acceptance #5 | ✅ | TV, who-am-i, mafia и другие production-файлы в рамках TASK-335 не изменялись |

---

## Отклонения от ТЗ

Нет отклонений по реализации. По проверкам: `npm run build` на Turbopack падает из-за sandbox-ограничения окружения, поэтому выполнен fallback `npx next build --webpack`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь, что в пяти целевых файлах добавлен только инициатор request-state, а `case '*:request-state'` остались без изменений.
- В `src/app/game/[roomId]/hundred-to-one/page.tsx` единственное отличие от остальных игр: добавлен generic `useGameAction` рядом с существующим fixed `useGameBroadcast`.
