# REPORT TASK-184: Fix QR code URL — always use server's local network IP

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 19:06
> - **Финиш:** 2026-05-31 19:15
> - **Длительность:** 9 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Добавлен/приведён к ТЗ endpoint `GET /api/local-ip`, который возвращает первый non-loopback IPv4 адрес. В `Lobby.tsx` QR URL теперь использует IP из `/api/local-ip` с текущим портом страницы, а при ошибке fetch остаётся fallback на `window.location.origin`.

Статус partial только из-за ограничений sandbox: `npm run build`, `npm run dev` и `curl http://localhost:3000/api/local-ip` не удалось выполнить до конца, потому что окружение запрещает `listen`/binding.

---

## Что сделано

### Изменённые файлы

- `src/app/api/local-ip/route.ts` — endpoint теперь возвращает `{ ip: localIp }` без fallback на `localhost`, выбирая первый внешний IPv4 через `os.networkInterfaces()`.
- `src/components/lobby/Lobby.tsx` — добавлен `localIp` state, fetch `/api/local-ip` при mount, QR `joinUrl` строится через `http://<localIp>:<port>/join/<roomCode>`.

### Новые файлы

- (нет)

### Удалённые файлы

- (нет)

---

## Diff stat

Task-only diff:

```
 src/app/api/local-ip/route.ts  | 21 +++++++++------------
 src/components/lobby/Lobby.tsx | 17 ++++++++++++++---
 2 files changed, 23 insertions(+), 15 deletions(-)
```

Full `git diff --stat` also includes pre-existing changes in forbidden files that were already present before TASK-184 and were not touched by Codex:

```
 .codex/STATUS.md               | 386 +----------------------------------------
 CLAUDE.md                      |  31 +++-
 src/app/api/local-ip/route.ts  |  21 +--
 src/components/lobby/Lobby.tsx |  17 +-
 4 files changed, 62 insertions(+), 393 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ✅ | Already up to date |
| `npm run lint` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack internal error: sandbox запрещает `binding to a port` / `Operation not permitted` при обработке CSS |
| `npm run dev` | ❌ | `tsx` не смог создать IPC pipe: `listen EPERM` |
| `curl http://localhost:3000/api/local-ip` | ❌ | Сервер не запущен из-за `listen EPERM` |
| Algorithm check via `node -e` | ✅ | Вернул `{"ip":"192.168.0.94"}` |
| `git diff --check -- src/app/api/local-ip/route.ts src/components/lobby/Lobby.tsx` | ✅ | Без whitespace errors |

---

## Отклонения от ТЗ

- `src/app/api/local-ip/route.ts` уже существовал в репозитории, поэтому файл не создан с нуля, а приведён к указанной реализации.
- `curl` acceptance не проверен через Next endpoint из-за sandbox-ограничения на запуск сервера.

---

## Открытые вопросы для Claude

- В `.codex/STATUS.md` активным указан TASK-171, но пользователь запустил TASK-184. Файлы TASK-184 не пересекаются с TASK-171.
- Перед началом уже были изменения в `CLAUDE.md` и `.codex/STATUS.md`. Я их не трогал и не откатывал.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не подтверждён реальный `curl http://localhost:3000/api/local-ip`, потому что локальный dev server не стартует в текущем sandbox.
- Не проверен QR в браузере по той же причине.

---

## Подсказки для ревью

- Посмотреть `src/components/lobby/Lobby.tsx` около вычисления `siteUrl`: `NEXT_PUBLIC_SITE_URL` больше не имеет приоритета для QR, чтобы `localIp` всегда заменял `localhost`.
