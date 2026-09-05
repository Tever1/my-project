# REPORT TASK-309: Alias classic join-team socket-id bug

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-30 01:05
> - **Финиш:** 2026-06-30 01:07
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлен classic teamSelect в Alias: non-host теперь отправляет свой `playerId` при вступлении в команду, а host использует этот id вместо socket.io `from`. Сервер и остальная игровая логика не тронуты.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/alias/page.tsx` — `alias:join-team` payload теперь содержит `playerId`, host-handler вызывает `handleJoinTeam()` с `payload.playerId ?? from`.

### Новые файлы

- `codex-reports/309-alias-jointeam-socketid-bug.md` — отчёт по TASK-309.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/alias/page.tsx | 313 +++++++++++++++++++----------------
1 file changed, 172 insertions(+), 141 deletions(-)
```

Примечание: `alias/page.tsx` уже содержал незакоммиченные изменения до старта TASK-309, поэтому общий `git diff --stat` от HEAD включает более ранние правки. В рамках TASK-309 внесены только 2 целевых изменения в whitelist-файле.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run lint` | ✅ | чисто |
| `npm run build` | ⏭️ | не запускался по ТЗ |
| Classic teamSelect playerId payload | ✅ | non-host отправляет `{ teamIndex, playerId: myId }` |
| Host handler uses playerId | ✅ | `handleJoinTeam((payload.playerId as string) ?? from, teamIndex)` |

---

## Отклонения от ТЗ

Нет отклонений. Build не запускался согласно acceptance.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь две строки в `src/app/game/[roomId]/alias/page.tsx`: host-handler `alias:join-team` и non-host `broadcast('alias:join-team', ...)` в teamSelect.
