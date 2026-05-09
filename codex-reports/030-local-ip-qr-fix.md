# REPORT TASK-030: Local IP QR fix

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-08 20:38 PDT
> - **Финиш:** 2026-05-08 20:44 PDT
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен `GET /api/local-ip`, который возвращает первый non-internal IPv4 адрес машины. `RoomMenu` теперь строит QR join URL через этот IP, с graceful fallback на `window.location.origin`, пока IP не загружен или fetch упал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в `RoomMenu` добавлены `localIp` state, fetch `/api/local-ip` при монте и построение `joinUrl` через `http://<ip>:<port>/lobby/<roomCode>`.

### Новые файлы

- `src/app/api/local-ip/route.ts` — новый API route для определения локального IPv4 через `os.networkInterfaces()`.
- `codex-reports/030-local-ip-qr-fix.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/components/lobby/Lobby.tsx | 42 +++++++++++++++++++++++++++++++++++-------
 1 file changed, 35 insertions(+), 7 deletions(-)
```

Примечание: stat по `Lobby.tsx` включает уже существующие незакоммиченные изменения TASK-029 в этом же файле. В рамках TASK-030 добавлены только изменения в `RoomMenu` и новый untracked файл `src/app/api/local-ip/route.ts`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date` после sandbox escalation. |
| `npm run lint` | ✅ | Exit 0. |
| `npx tsc --noEmit` | ✅ | Exit 0. |
| `GET /api/local-ip` | ✅ | `{"ip":"192.168.0.81"}` на тестовой машине. |

---

## Реальный вывод API

```text
HTTP/1.1 200 OK
content-type: application/json

{"ip":"192.168.0.81"}
```

---

## Отклонения от ТЗ

Нет. Build не запускал: TASK-030 acceptance требует lint, `tsc --noEmit` и реальный вывод `/api/local-ip`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `src/components/lobby/Lobby.tsx` в `RoomMenu`: до ответа API QR остаётся на `window.location.origin`, после ответа меняется на `http://192.168.0.81:<port>/lobby/<code>`.
