# REPORT TASK-026: Smoke QA после Волн 1 и 2

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-07 20:05 PDT
> - **Финиш:** 2026-05-07 20:15 PDT
> - **Длительность:** 10 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Код не правил. `tsc`, build, dev-server startup, non-localized game/TV/lobby routes и фактический Socket.IO endpoint `/api/socketio` прошли smoke QA без 500/crash. Acceptance по routes частично не совпал с текущей маршрутизацией проекта: `/ru/...` routes дают 404, а указанный в ТЗ `/socket.io/...` редиректит на 404, потому что сервер настроен на `/api/socketio`.

---

## Что сделано

### Изменённые файлы

- (нет)

### Новые файлы

- `codex-reports/026-smoke-qa-wave2.md` — отчёт smoke QA.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 .codex/STATUS.md | 8 +++++++-
 1 file changed, 7 insertions(+), 1 deletion(-)
```

`git diff --stat` до создания отчёта показывал только pre-existing `.codex/STATUS.md`. Кодовые файлы не изменялись.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date` после sandbox escalation для `.git/FETCH_HEAD`. |
| `npx tsc --noEmit 2>&1 \| tail -5` | ✅ | Пустой вывод, exit 0. |
| `npm run build` | ✅ | В sandbox Turbopack упал на `Operation not permitted`; повтор вне sandbox успешен, exit 0. Known `ReferenceError: location is not defined` напечатан во время SSG. |
| Dev server startup | ✅ | `Party Games Hub running on http://localhost:3000`, `Network: http://192.168.0.82:3000`. |
| Server logs | ⚠️ | Нет `Error:`, `Cannot find module`, `SyntaxError`, crash/fatal. Есть `DEP0169 DeprecationWarning` и 404 по `/ru/...`/`/socket.io`. |
| `npm run lint 2>&1 \| tail -3` | ✅ | `✖ 11 problems (11 errors, 0 warnings)`. |
| Server stopped | ✅ | Ctrl-C, последующий curl на `/` вернул `000`. |

---

## HTTP Smoke Statuses

### Routes из ТЗ

| Route | Status | Комментарий |
|---|---:|---|
| `/ru` | 404 | Не 500; текущий build listing показывает routes без locale-префикса. |
| `/en` | 404 | Не 500; текущий build listing показывает routes без locale-префикса. |
| `/ru/design-tokens` | 404 | Non-localized `/design-tokens` даёт 200. |
| `/socket.io/?EIO=4&transport=polling` | 308 | Redirect на `/socket.io?EIO=4&transport=polling`; после `-L` даёт 404. |
| `/ru/game/testroom/alias` | 404 | Non-localized route даёт 200. |
| `/ru/game/testroom/crocodile` | 404 | Non-localized route даёт 200. |
| `/ru/game/testroom/mafia` | 404 | Non-localized route даёт 200. |
| `/ru/game/testroom/quiz` | 404 | Non-localized route даёт 200. |
| `/ru/game/testroom/hundred-to-one` | 404 | Non-localized route даёт 200. |
| `/ru/game/testroom/spy` | 404 | Non-localized route даёт 200. |
| `/ru/game/testroom/who-am-i` | 404 | Non-localized route даёт 200. |
| `/ru/tv/testroom/alias` | 404 | Non-localized route даёт 200. |
| `/ru/tv/testroom/crocodile` | 404 | Non-localized route даёт 200. |
| `/ru/tv/testroom/mafia` | 404 | Non-localized route даёт 200. |
| `/ru/tv/testroom/quiz` | 404 | Non-localized route даёт 200. |
| `/ru/tv/testroom/hundred-to-one` | 404 | Non-localized route даёт 200. |
| `/ru/tv/testroom/spy` | 404 | Non-localized route даёт 200. |
| `/ru/tv/testroom/who-am-i` | 404 | Non-localized route даёт 200. |
| `/ru/lobby/testroom` | 404 | Non-localized route даёт 200. |

### Дополнительная проверка фактических routes

| Route | Status |
|---|---:|
| `/` | 200 |
| `/design-tokens` | 200 |
| `/game/testroom/alias` | 200 |
| `/game/testroom/crocodile` | 200 |
| `/game/testroom/mafia` | 200 |
| `/game/testroom/quiz` | 200 |
| `/game/testroom/hundred-to-one` | 200 |
| `/game/testroom/spy` | 200 |
| `/game/testroom/who-am-i` | 200 |
| `/tv/testroom/alias` | 200 |
| `/tv/testroom/crocodile` | 200 |
| `/tv/testroom/mafia` | 200 |
| `/tv/testroom/quiz` | 200 |
| `/tv/testroom/hundred-to-one` | 200 |
| `/tv/testroom/spy` | 200 |
| `/tv/testroom/who-am-i` | 200 |
| `/lobby/testroom` | 200 |
| `/api/socketio/?EIO=4&transport=polling` | 200 |

Фактический Socket.IO path подтверждён в `server.mts`: `path: '/api/socketio'`. Ответ handshake:

```text
HTTP/1.1 200 OK
0{"sid":"...","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}
```

---

## Логи сервера

Стартовые строки:

```text
> my-project@0.1.0 dev
> tsx server.mts
> Party Games Hub running on http://localhost:3000
> Network: http://192.168.0.82:3000
```

После запросов:

```text
(node:8773) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications.
GET /ru 404
GET /en 404
GET /socket.io?EIO=4&transport=polling 404
GET /game/testroom/alias 200
GET /game/testroom/crocodile 200
GET /game/testroom/mafia 200
GET /game/testroom/quiz 200
GET /game/testroom/hundred-to-one 200
GET /game/testroom/spy 200
GET /game/testroom/who-am-i 200
GET /tv/testroom/alias 200
GET /tv/testroom/crocodile 200
GET /tv/testroom/mafia 200
GET /tv/testroom/quiz 200
GET /tv/testroom/hundred-to-one 200
GET /tv/testroom/spy 200
GET /tv/testroom/who-am-i 200
GET /lobby/testroom 200
```

---

## Отклонения от ТЗ

Есть расхождение между ТЗ и текущей маршрутизацией:

- ТЗ ожидает `/ru` и `/ru/...`, но текущий Next build/dev server обслуживает routes без locale-префикса.
- ТЗ ожидает Socket.IO на `/socket.io`, но сервер настроен на `/api/socketio`.
- Из-за этого acceptance по указанным literal routes не выполнен, хотя фактические routes приложения и socket handshake проходят.

---

## Открытые вопросы для Claude

- Нужно ли обновить smoke spec на non-localized routes и `/api/socketio`, или это регрессия маршрутизации относительно ожидаемого `/ru`/`/en`?

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не исправлял routing/socket path mismatch, потому что TASK-026 запрещает править код.

---

## Подсказки для ревью

- Сравнить TASK-026 route expectations с `npm run build` route listing: build выводит `/game/[roomId]/...`, `/tv/[roomId]/...`, `/lobby/[roomId]`, но не `/ru/...`.
- Socket.IO endpoint в `server.mts` настроен как `/api/socketio`, поэтому `/socket.io` не является рабочим handshake path в текущем коде.
