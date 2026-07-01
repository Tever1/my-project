# REPORT TASK-307: Alias classic modeSelect teams guard

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-30 00:50
> - **Финиш:** 2026-06-30 00:53
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлен крэш Alias classic mode на фазе `modeSelect`, когда `alias:state` приходит частичным payload без `teams`. Изменения ограничены четырьмя optional chaining guard'ами в derived-селекторах.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/alias/page.tsx` — добавлены guard'ы для `gameState.teams` в `activeTeam`, `explainerIndices`, `layoutScores`, `assignedPlayerIds`.

### Новые файлы

- `codex-reports/307-alias-classic-modeselect-crash.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/alias/page.tsx | 308 +++++++++++++++++++----------------
1 file changed, 169 insertions(+), 139 deletions(-)
```

Примечание: `src/app/game/[roomId]/alias/page.tsx` уже имел незакоммиченные изменения до старта TASK-307. Дельта TASK-307 — только 4 строки с optional chaining из ТЗ.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | — |
| `npm run lint` | ✅ | — |
| `npm run build` | не запускал | По ТЗ не запускать |
| Acceptance: modeSelect без `teams` | ✅ | Derived-селекторы больше не читают `teams` без guard'а |
| Acceptance: diff по TASK-307 | ✅ | Внесены ровно 4 указанные правки; общий git diff файла включает старые dirty-изменения |

---

## Отклонения от ТЗ

Нет отклонений по коду. Не менял broadcast, обработчики, фазы, логику команд или JSX-обращения к `teams`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Смотреть строки `src/app/game/[roomId]/alias/page.tsx:107`, `:108`, `:563`, `:571`.
- Учитывать, что файл был dirty до задачи; ревью TASK-307 лучше делать по этим четырём строкам.
