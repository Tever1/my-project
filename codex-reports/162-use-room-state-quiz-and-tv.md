# REPORT TASK-162: useRoomState для quiz и TV

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 21:00
> - **Финиш:** 2026-05-27 21:02
> - **Длительность:** 2 минуты
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

`quiz/page.tsx` и TV-страница переведены с локального `room:state` listener на `useRoomState`. Оставшиеся socket effects теперь слушают только `game:action` и возвращают один cleanup (`return unsub2;`).

Статус partial из-за acceptance grep по всем игровым файлам: он всё ещё находит два старых `unsub1();` в Alias и Crocodile, но эти файлы вне whitelist TASK-162.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — добавлен `useRoomState`; удалены локальный `on('room:state')`, `emit('room:get-state')` и combined cleanup из socket effect.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен `useRoomState`; удалены локальный `on('room:state')`, `emit('room:get-state')` и combined cleanup из socket effect.

### Новые файлы

- `codex-reports/162-use-room-state-quiz-and-tv.md` — отчёт по TASK-162.

### Удалённые файлы

- (нет)

---

## Итоговые dep-array

- `src/app/game/[roomId]/quiz/page.tsx`: `[on, sendAction]`
- `src/app/tv/[roomId]/[gameType]/page.tsx`: `[on, gameType, locale]`

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 34 +++++++++++++++------------------
 src/app/tv/[roomId]/[gameType]/page.tsx | 19 ++++++++----------
 2 files changed, 23 insertions(+), 30 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -n "on('room:state'\|emit('room:get-state'" src/app/game/[roomId]/quiz/page.tsx src/app/tv/[roomId]/[gameType]/page.tsx` | ✅ | 0 совпадений |
| `grep -rn "unsub1();\|u1();" src/app/game/ src/app/tv/[roomId]/[gameType]/page.tsx` | ⚠️ | 2 совпадения вне whitelist: `alias/page.tsx:172`, `crocodile/page.tsx:153` |
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |

---

## Отклонения от ТЗ

Whitelist-изменения выполнены по ТЗ. Общий grep на `unsub1();` не стал нулевым из-за существующих совпадений в `src/app/game/[roomId]/alias/page.tsx` и `src/app/game/[roomId]/crocodile/page.tsx`; эти файлы нельзя было менять в TASK-162.

---

## Открытые вопросы для Claude

- Нужно ли отдельным micro-task заменить одиночные cleanup wrappers в Alias и Crocodile на `return unsub1;`, чтобы общий grep стал зелёным?

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не трогал `alias/page.tsx` и `crocodile/page.tsx`, потому что они вне whitelist.

---

## Подсказки для ревью

- Проверь, что `useRoomState` callbacks в quiz и TV сохраняют прежнюю логику `room:state`.
- Проверь, что socket effects больше не зависят от `emit`/`roomId` и не делают `room:get-state`.
