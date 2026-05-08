# REPORT TASK-025: Lint cleanup Волна 2

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-07 19:25 PDT
> - **Финиш:** 2026-05-07 20:02 PDT
> - **Длительность:** 37 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Выполнены 8 точечных правок по `react-hooks/exhaustive-deps` и связанная перестановка `revealResults` в quiz. `npm run lint` снизился с 19 до 11 problems, без warnings; оставшиеся проблемы относятся к Wave 3.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/alias/page.tsx` — добавлен `emit` в deps socket effect.
- `src/app/game/[roomId]/crocodile/page.tsx` — добавлен `emit` в deps socket effect.
- `src/app/game/[roomId]/mafia/page.tsx` — `dayTimerValue > 0` вынесен в `isDayTimerActive`; deps теперь `[gs.phase, isDayTimerActive]`.
- `src/app/game/[roomId]/quiz/page.tsx` — из deps `revealResults` удалён `gameState.timeLeft`; callback поднят выше auto-reveal effect; auto-reveal deps дополнены `revealResults`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен `locale` в deps основного TV socket effect.

### Новые файлы

- `codex-reports/025-lint-cleanup-wave-2.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Scoped stat по 5 whitelist-файлам:

```text
 src/app/game/[roomId]/alias/page.tsx     |  2 +-
 src/app/game/[roomId]/crocodile/page.tsx |  2 +-
 src/app/game/[roomId]/mafia/page.tsx     |  5 ++-
 src/app/game/[roomId]/quiz/page.tsx      | 66 ++++++++++++++++----------------
 src/app/tv/[roomId]/[gameType]/page.tsx  |  2 +-
 5 files changed, 39 insertions(+), 38 deletions(-)
```

Полный `git status` также показывает pre-existing `.codex/STATUS.md` и untracked `codex-tasks/025-lint-cleanup-wave-2.md`; я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date` после sandbox escalation для `.git/FETCH_HEAD`. |
| Targeted lint: alias | ✅ | Без проблем. |
| Targeted lint: crocodile | ✅ | Без проблем. |
| Targeted lint: mafia | ✅ | Остались только 2 `react-hooks/refs` errors Wave 3. |
| Targeted lint: quiz | ✅ | Осталась только 1 `react-hooks/immutability` error Wave 3. |
| Targeted lint: tv | ✅ | Осталась только 1 `react-hooks/rules-of-hooks` error Wave 3. |
| `npm run lint 2>&1 \| tail -3` | ✅ | `✖ 11 problems (11 errors, 0 warnings)`. |
| `npx tsc --noEmit` | ✅ | Без ошибок. |
| `npm run build` | ✅ | В sandbox упал на Turbopack `Operation not permitted`; повтор вне sandbox успешен, exit code 0. Build печатает существующий `ReferenceError: location is not defined`, но завершается успешно. |

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

- В `src/app/game/[roomId]/mafia/page.tsx` проверь, что dep array day timer содержит `isDayTimerActive`, а не raw `dayTimerValue`.
- В `src/app/game/[roomId]/quiz/page.tsx` проверь порядок: `revealResults` объявлен до auto-reveal `useEffect`.
