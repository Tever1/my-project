# REPORT TASK-197: Выход хоста закрывает комнату для всех

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-02 20:15
> - **Финиш:** 2026-06-02 20:45
> - **Длительность:** 30 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сервер теперь считает явный выход хоста закрытием комнаты: рассылает `room:closed`, чистит socket→room привязки и удаляет room. Lobby, quiz phone page и TV page подписаны на `room:closed` и уводят пользователей на главную, чтобы закрытая комната не продолжала игру и не воскресала.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — в explicit-ветке `handleDisconnect` добавлена отдельная ветка для `player.isHost`: `room:closed` broadcast, очистка reconnect timers/playerRooms, удаление комнаты.
- `src/components/lobby/Lobby.tsx` — добавлена реакция на `room:closed`: очистка локального room state, закрытие меню/ожиданий, toast, redirect на `/`; `handleLeaveRoom` теперь использует `router.push('/')` после локального сброса.
- `src/app/game/[roomId]/quiz/page.tsx` — добавлена подписка на `room:closed`: остановка quiz timer/sound, notice для Lobby, redirect на `/`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлена подписка на `room:closed`: notice для Lobby и redirect на `/`.

### Новые файлы

- `codex-reports/197-host-leave-destroys-room.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 16 ++++++++++++++++
 src/app/tv/[roomId]/[gameType]/page.tsx | 14 +++++++++++++-
 src/components/lobby/Lobby.tsx          | 33 +++++++++++++++++++++++++++++++--
 src/server/socket-handlers.mts          | 13 +++++++++++++
 4 files changed, 73 insertions(+), 3 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ❌ | Turbopack panic в sandbox: `Operation not permitted (os error 1)` при `binding to a port` во время обработки `src/app/globals.css`; не выглядит связанным с diff |
| `git diff --check` | ✅ | только по whitelist-файлам TASK-197 |
| Host leave closes room | ✅ | серверная ветка `player.isHost` удаляет всю комнату |
| Non-host leave keeps room | ✅ | не-хост explicit leave оставлен на прежнем пути |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Дополнительно выполнен `npm run build` по project workflow, но он упал на Turbopack/sandbox restriction.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Ручной browser QA не выполнялся: acceptance про реальные телефоны оставлен на проверку пользователя.

---

## Подсказки для ревью

- Проверь `src/server/socket-handlers.mts`: ветка `player.isHost` срабатывает только для explicit leave, обычный disconnect/grace logic не менялся.
- В рабочем дереве уже были изменения вне whitelist/protected files (`CLAUDE.md`, `.codex/STATUS.md`, `.claude/hooks/post-commit.sh`). Я их не редактировал и не откатывал.
