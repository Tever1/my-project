# REPORT TASK-200: Жизненный цикл комнаты — убрать «Выйти», таймер всех-неактивных

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-02 21:36
> - **Финиш:** 2026-06-02 21:53
> - **Длительность:** 17 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Кнопка «Выйти» и подтверждение выхода удалены из `RoomMenu`. Сервер больше не закрывает комнату при explicit leave хоста: выходит только сам игрок, а комната удаляется при `players.size === 0`. Добавлен room-level таймер: если все игроки неактивны 5 минут, сервер шлёт `room:closed`, чистит room/player timers и удаляет комнату.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — удалены `handleLeaveRoom`, prop `onLeaveRoom`, `confirmLeave` state и весь UI кнопки «Выйти»/подтверждения; listener `room:closed` оставлен.
- `src/server/socket-handlers.mts` — добавлен `Room.inactivityTimer`, `scheduleRoomInactivityCheck()`, cleanup закрытия неактивной комнаты; host-destroy ветка из explicit `handleDisconnect` удалена.

### Новые файлы

- `codex-reports/200-room-lifecycle-rework.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Task-relevant diff:

```
 src/components/lobby/Lobby.tsx | 134 +++++++++++------------------------------
 src/server/socket-handlers.mts |  58 ++++++++++++++++++
 2 files changed, 93 insertions(+), 99 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Без ошибок |
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run build` | ⚠️ | Не стартовал: `.next/lock` уже занят другим Next build/dev процессом; `ps` в sandbox запрещён |
| Acceptance #1 | ✅ | `lint` зелёный, dead-code от кнопки не осталось |
| Acceptance #2 | ✅ | `tsc --noEmit` зелёный |
| Acceptance #3 | ✅ | Кнопка «Выйти» удалена из `RoomMenu` |
| Acceptance #4 | ✅ | Explicit leave удаляет только игрока; комната удаляется при `players.size === 0` |
| Acceptance #5 | ✅ | Таймер 300000 мс шлёт `room:closed` и удаляет комнату, если все всё ещё неактивны |
| Acceptance #6 | ✅ | `room:join` / `player:back` вызывают check и очищают room timer при активном игроке |

---

## Отклонения от ТЗ

Нет отклонений по production-файлам. Отчёт добавлен в `codex-reports/` по workflow, хотя production whitelist был ограничен двумя файлами.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Полный `npm run build` не удалось выполнить из-за существующего `.next/lock`. Я не удалял lock и не останавливал процессы, чтобы не трогать чужой запущенный dev/build.

---

## Подсказки для ревью

- В `src/server/socket-handlers.mts` стоит проверить `scheduleRoomInactivityCheck()`: условие неактивности ровно `!p.isConnected || p.isAway`, таймер 300000 мс.
- В `handleDisconnect(explicit=true)` host больше не особый случай: удаляется только вышедший player.
- В worktree до задачи уже были dirty/forbidden files (`CLAUDE.md`, `.codex/STATUS.md`, `codex-tasks/**` и другие). Я их не редактировал и не откатывал.
