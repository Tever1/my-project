# REPORT TASK-159: useGameAction hook

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 20:30
> - **Финиш:** 2026-05-27 20:43
> - **Длительность:** 13 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен общий `useGameAction(roomId)` / `useGameBroadcast(roomId, action)` для envelope события `game:action`.
Во всех 8 whitelist-файлах прямые `emit('game:action', ...)` заменены на новый helper без изменения payload/action-логики.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/crocodile/page.tsx` — локальный dynamic `broadcast` заменён на `useGameAction`; прямые `croc:state` / action emit заменены на `broadcast`.
- `src/app/game/[roomId]/alias/page.tsx` — локальный dynamic `broadcast` заменён на `useGameAction`; прямые `alias:state`, `alias:select-mode`, `alias:join-team` заменены на `broadcast`.
- `src/app/game/[roomId]/spy/page.tsx` — `spy:sync` переведён на `useGameBroadcast`; `spy:stroke` и `spy:clear` переведены на `useGameAction`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx` — `h2o:sync` переведён на `useGameBroadcast`.
- `src/app/game/[roomId]/mafia/page.tsx` — fixed-action `mafia` broadcast переведён на `useGameBroadcast`.
- `src/app/game/[roomId]/who-am-i/page.tsx` — fixed-action `who-am-i` broadcast переведён на `useGameBroadcast`.
- `src/app/game/[roomId]/quiz/page.tsx` — все `quiz:*` game action emits переведены на `sendAction`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — request-state emits и TV quiz config emit переведены на `sendAction`.

### Новые файлы

- `src/lib/use-game-action.ts` — общий hook для dynamic/fixed `game:action` envelope.
- `codex-reports/159-use-game-action-hook.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/alias/page.tsx          |  22 ++---
src/app/game/[roomId]/crocodile/page.tsx      |  16 ++--
src/app/game/[roomId]/hundred-to-one/page.tsx |  10 +--
src/app/game/[roomId]/mafia/page.tsx          |   8 +-
src/app/game/[roomId]/quiz/page.tsx           | 118 ++++++--------------------
src/app/game/[roomId]/spy/page.tsx            |  17 ++--
src/app/game/[roomId]/who-am-i/page.tsx       |   8 +-
src/app/tv/[roomId]/[gameType]/page.tsx       |  20 ++---
src/lib/use-game-action.ts                    |  31 +++++++
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | `eslint` без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Acceptance #1 | ⚠️ | В 8 whitelist-файлах 0 совпадений. Команда по всему `src/app/game src/app/tv` показывает только `truth-or-dare`, который не входит в whitelist. |
| Acceptance #2 | ✅ | 16 строк: импорт + вызов в каждом из 8 файлов |

### Acceptance #1

Whitelist-файлы:

```
grep -RIn "emit('game:action'" 'src/app/game/[roomId]/crocodile/page.tsx' 'src/app/game/[roomId]/alias/page.tsx' 'src/app/game/[roomId]/spy/page.tsx' 'src/app/game/[roomId]/hundred-to-one/page.tsx' 'src/app/game/[roomId]/mafia/page.tsx' 'src/app/game/[roomId]/who-am-i/page.tsx' 'src/app/game/[roomId]/quiz/page.tsx' 'src/app/tv/[roomId]/[gameType]/page.tsx'
# exit 1, no matches
```

Полная команда из ТЗ:

```
grep -RIn "emit('game:action'" src/app/game src/app/tv
src/app/game/[roomId]/truth-or-dare/page.tsx:104:      emit('game:action', { code: roomId, action, payload });
src/app/game/[roomId]/truth-or-dare/page.tsx:180:        emit('game:action', {
src/app/game/[roomId]/truth-or-dare/page.tsx:238:      emit('game:action', {
src/app/game/[roomId]/truth-or-dare/page.tsx:266:      emit('game:action', {
```

### Acceptance #2

```
grep -RInE "useGameAction|useGameBroadcast" src/app
# 16 строк: imports + hook usage in crocodile, alias, spy, hundred-to-one, mafia, who-am-i, quiz, tv
```

---

## Отклонения от ТЗ

Прямая команда Acceptance #1 по всему `src/app/game` не даёт 0 совпадений из-за `src/app/game/[roomId]/truth-or-dare/page.tsx`. Этот файл не входит в whitelist TASK-159, поэтому я его не менял.

---

## Открытые вопросы для Claude

Стоит ли отдельным TASK вынести `truth-or-dare` на `useGameAction`, чтобы глобальная acceptance-команда действительно возвращала 0?

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверить `src/app/game/[roomId]/quiz/page.tsx`: это самый большой механический diff, все payload перенесены as-is в `sendAction`.
- Проверить `truth-or-dare` как отдельный follow-up, если цель — полное отсутствие inline `game:action` во всём `src/app/game`.
