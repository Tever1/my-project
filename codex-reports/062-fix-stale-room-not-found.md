# REPORT TASK-062: Fix stale room not found on get-state

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 15:34
> - **Финиш:** 2026-05-10 15:39
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделан точечный фикс для stale `/lobby/CODE`: сервер теперь отвечает `room:not-found` на `room:get-state`, если комнаты нет, а Lobby очищает локальное состояние и редиректит room-route на `/`. Нормальный happy path живой комнаты не менялся.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — при отсутствующей комнате в `room:get-state` отправляется `room:not-found` с кодом комнаты.
- `src/components/lobby/Lobby.tsx` — добавлен соседний с `room:kicked` обработчик `room:not-found`, который сбрасывает room state/menu и редиректит `/lobby/CODE` на `/`.

### Новые файлы

- `codex-reports/062-fix-stale-room-not-found.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Только файлы TASK-062:

```text
 src/components/lobby/Lobby.tsx | 12 ++++++++++++
 src/server/socket-handlers.mts |  5 ++++-
 2 files changed, 16 insertions(+), 1 deletion(-)
```

В рабочей копии также уже были изменения вне whitelist (`.codex/STATUS.md`, `CLAUDE.md`, старые `codex-reports/*`, `codex-tasks/062-*`). Я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| `npm run build` | ❌ | Turbopack упал из-за sandbox: `creating new process`, `binding to a port`, `Operation not permitted (os error 1)` |
| Acceptance #1 | ✅ | `npx tsc --noEmit` без ошибок |
| Acceptance #2 | ✅ | `npm run lint` без ошибок |
| Acceptance #3 | ✅ | логика добавлена: stale room получает `room:not-found`, `/lobby/CODE` редиректит на `/` |
| Acceptance #4 | ✅ | для живой комнаты `room:state` path не изменён |

---

## Отклонения от ТЗ

`git pull` перед стартом не смог выполниться из-за sandbox-ограничения: `error: cannot open '.git/FETCH_HEAD': Operation not permitted`.

`npm run build` не прошёл по инфраструктурной причине Turbopack/sandbox, не по TypeScript/lint ошибке изменения.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не выполнялась ручная браузерная проверка сценария логаута и refresh `/lobby/CODE`; acceptance покрыт кодовым изменением и автоматическими проверками `tsc`/`lint`.

---

## Подсказки для ревью

- Проверь `src/server/socket-handlers.mts:186` — отсутствующая комната теперь явно сообщает клиенту `room:not-found`.
- Проверь `src/components/lobby/Lobby.tsx:303` — новый effect добавлен после `room:kicked` и не меняет существующую обработку kick.
