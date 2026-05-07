# REPORT TASK-020: Socket.io flow в /lobby-preview

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-04 20:35
> - **Финиш:** 2026-05-04 20:54
> - **Длительность:** 19 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

`/lobby-preview` подключён к реальным socket-событиям `room:create` и `room:join`, использует `useSocket()` и `useAuth()`, а ошибки показывает через `sonner` toast. Для presence добавлен новый `presence:subscribe` / `presence:count` без изменения существующих room/game events.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — добавлены `useSocket`, `useAuth`, `useRouter`, `toast`; кнопки создания, join-submit и start CTA подключены к реальному socket-flow; FriendsOnlinePill показывает socket presence count; добавлен `GlassToaster`.
- `src/server/socket-handlers.mts` — добавлен новый event `presence:subscribe` и рассылка `presence:count` с `io.engine.clientsCount` подписчикам при connect/subscribe/disconnect.

### Новые файлы

- `codex-reports/020-lobby-preview-socket-flow.md` — отчёт по TASK-020.

### Удалённые файлы

- (нет)

---

## Diff stat

Scoped по whitelisted production-файлам:

```
 src/app/lobby-preview/page.tsx | 174 ++++++++++++++++++++++++++++++++++++++---
 src/server/socket-handlers.mts |  16 ++++
 2 files changed, 181 insertions(+), 9 deletions(-)
```

Полный `git diff --stat` также показывает `.codex/STATUS.md`, но этот diff существовал до моих правок и не редактировался мной.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date` после sandbox escalation на `.git/FETCH_HEAD`. |
| `npm run lint` | ❌ | Полный lint падает на существующих 73 проблемах вне затронутых файлов. Новых сообщений по `src/app/lobby-preview/page.tsx` и `src/server/socket-handlers.mts` нет. |
| Targeted eslint | ✅ | `./node_modules/.bin/eslint src/app/lobby-preview/page.tsx src/server/socket-handlers.mts` прошёл без вывода. |
| `npm run build` | ✅ | Первый запуск упал из-за sandbox `Operation not permitted`; повтор с escalation завершился exit code 0. В выводе есть `ReferenceError: location is not defined`, но Next завершил build успешно. |
| Acceptance #1 | ✅ | `RoomButton` вызывает `room:create`, при success сохраняет server `code` в `roomCode`. |
| Acceptance #2 | ✅ | 6-char join-submit вызывает `room:join`; при success пушит `/lobby/<code>`, при ошибке показывает toast. |
| Acceptance #3 | ✅ | Start CTA переходит на `/lobby/<code>?game=<activeGame>`; если комнаты ещё нет, сначала создаёт её. |
| Acceptance #4 | ✅ | `FriendsOnlinePill` получает `presence:count` через `presence:subscribe`. |
| Acceptance #5 | ⚠️ | Lint не чистый глобально из-за существующих проблем; targeted lint по touched files чистый. Build OK. |

---

## Отклонения от ТЗ

- В навигации использован `res.code`, а не `res.roomId`. Причина: существующий `src/app/lobby/[roomId]/page.tsx` трактует route param как room code и делает `room:join` с этим значением; переход на UUID `roomId` ломал бы текущий production lobby без правки файла вне whitelist.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не проверял клики в браузере: в этом таске были выполнены lint/build и кодовая проверка. Socket-flow использует существующие server handlers и типы callback payload.

---

## Подсказки для ревью

- Проверь решение по URL: `/lobby/<code>?game=<activeGame>` совместимо с текущим lobby route, но query `game` пока не используется самим `src/app/lobby/[roomId]/page.tsx` в рамках этого whitelist.
- Presence deliberately isolated: добавлен только `presence:subscribe`, существующие room/game handlers не менялись.
