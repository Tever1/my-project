# REPORT TASK-206: Вынести предикат isHostEligible(player)

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-03 21:16 PDT
> - **Финиш:** 2026-06-03 21:19 PDT
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен module-level предикат `isHostEligible(player)` в `src/server/socket-handlers.mts`.
Три host-проверки роли переведены на этот предикат без изменения контекстных условий.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен `isHostEligible(player)` рядом с `reassignHostOnLeave`; заменены проверки роли в `reassignHostOnLeave`, join-логике первого phone-host и `room:transfer-host`.

### Новые файлы

- `codex-reports/206-host-eligible-predicate.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/server/socket-handlers.mts | 131 +++++++++++++++++++++++++++++++++++------
1 file changed, 114 insertions(+), 17 deletions(-)
```

Примечание: stat включает уже существующие незакоммиченные изменения в этом файле до TASK-206. Изменение TASK-206 состоит только из helper и трёх замен role-check.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run lint` | ✅ | ESLint без ошибок |
| `npm run build` | ⚠️ | Turbopack internal error: sandbox запрещает creating new process / binding to a port при обработке `src/app/globals.css` |
| Acceptance: один `function isHostEligible` | ✅ | `grep -c "function isHostEligible"` → 1 |
| Acceptance: 3 использования | ✅ | `grep -c "isHostEligible("` → 4 вместе с объявлением, то есть 3 вызова |
| Acceptance: host role-check DRY | ✅ | Осталась только проверка внутри helper; ещё одно `role === 'player'` относится к `playerCount` перед `game:start`, не к host eligibility |
| `git diff --check -- src/server/socket-handlers.mts` | ✅ | Без whitespace-проблем |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` не прошёл из-за ошибки окружения/Turbopack, не из-за TypeScript или изменённого server handler.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверь только три замены на `isHostEligible(...)`: логика `isConnected`, `gameHostPlayerId === null` и guard `!newHost` оставлены на местах.
