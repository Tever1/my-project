# REPORT TASK-027: Lint cleanup Wave 3

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-07 20:18 PDT
> - **Финиш:** 2026-05-07 20:45 PDT
> - **Длительность:** 27 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Закрыл все оставшиеся 11 `react-hooks/*` lint errors без глобальных disable. `npm run lint` теперь exit 0, `npx tsc --noEmit` exit 0, `npm run build` exit 0 после запуска вне sandbox.

---

## Что сделано

### Изменённые файлы

- `src/lib/i18n-provider.tsx` — `setLocaleState(saved)` перенесён в `queueMicrotask`.
- `src/lib/auth-context.tsx` — initial `setUser` и `setIsLoading(false)` сгруппированы в один `queueMicrotask`.
- `src/lib/use-socket.ts` — добавлен `socketInstance` state; hook больше не читает `socketRef.current` в render return.
- `src/app/admin/page.tsx` — initial `fetchFiles`/`fetchRooms` запускаются через `queueMicrotask`; sync loading/data/filter reset в game data viewer перенесён в `queueMicrotask`.
- `src/app/game/[roomId]/mafia/page.tsx` — nickname cache переведён с render-time `ref.current` read на state-cache с grow-only merge.
- `src/app/game/[roomId]/quiz/page.tsx` — render-time ref writes перенесены в effects; countdown mutable counter переведён в ref; auto-reveal отложен через `queueMicrotask`; ref-heavy action callbacks больше не memoized.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — `initSpyCanvas` вынесен из conditional spy render block на верхний уровень компонента.

### Новые файлы

- `codex-reports/027-lint-cleanup-wave-3.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/app/admin/page.tsx                  |  12 +--
 src/app/game/[roomId]/mafia/page.tsx    |  12 ++-
 src/app/game/[roomId]/quiz/page.tsx     | 132 ++++++++++++++++----------------
 src/app/tv/[roomId]/[gameType]/page.tsx |  23 +++---
 src/lib/auth-context.tsx                |  14 ++--
 src/lib/i18n-provider.tsx               |   2 +-
 src/lib/use-socket.ts                   |  12 ++-
 7 files changed, 112 insertions(+), 95 deletions(-)
```

Полный `git diff --stat` также показывает pre-existing `.codex/STATUS.md`; я его не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date` после sandbox escalation для `.git/FETCH_HEAD`. |
| `npm run lint` | ✅ | Exit 0, `eslint` без problems. |
| `npx tsc --noEmit` | ✅ | Exit 0, без вывода ошибок. |
| `npm run build` | ✅ | В sandbox Turbopack упал на `Operation not permitted`; повтор вне sandbox успешен, exit 0. Known `ReferenceError: location is not defined` во время SSG остался без изменения. |
| Acceptance #1 | ✅ | `npm run lint` → 0 problems. |
| Acceptance #2 | ✅ | `npm run build` → exit 0. |
| Acceptance #3 | ✅ | `npx tsc --noEmit` → 0 errors. |

---

## ESLint-disable

Не использовал.

---

## Отклонения от ТЗ

Нет отклонений по коду. Build пришлось повторить вне sandbox из-за известного Turbopack ограничения на создание процесса/bind port.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- `src/app/game/[roomId]/mafia/page.tsx`: nickname cache теперь state-based, чтобы не читать ref в render path; логика grow-only сохранена.
- `src/app/game/[roomId]/quiz/page.tsx`: `runCountdown` и `startQuestionImmediate` стали обычными local action functions, потому что React Compiler не сохранял memoization при ref reads/writes внутри callbacks.
- `src/lib/use-socket.ts`: публичный `socket` в return теперь приходит из state и будет `null` до первого effect tick; текущие потребители не destructure `socket`, используют `emit/on/isConnected`.
