# REPORT TASK-202: Ролевая модель комнаты

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-02 22:27
> - **Финиш:** 2026-06-02 22:30
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Серверная модель ролей разведена по ТЗ: создатель комнаты больше не становится
хостом, первый телефон-игрок получает `isHost`, `hostId` и `gameHostPlayerId`.
Добавлен guard старта без игроков и серверные проверки прав для kick/transfer.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — изменены `room:create`, `room:join`,
  `game:start`, `room:kick`, `room:transfer-host` под новую роль хоста.

### Новые файлы

- `codex-reports/202-room-role-model.md` — отчёт по TASK-202.

### Удалённые файлы

- (нет)

---

## Diff stat

Релевантный diff по whitelisted файлу:

```
 src/server/socket-handlers.mts | 83 ++++++++++++++++++++++++++++++++++++++++--
 1 file changed, 80 insertions(+), 3 deletions(-)
```

Примечание: рабочее дерево уже содержало незакоммиченные изменения в других
файлах до старта TASK-202, включая запрещённые для Codex файлы. Я их не трогал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ❌ | Turbopack internal error из-за sandbox: `Operation not permitted` при creating new process / binding to a port |
| `git diff --check -- src/server/socket-handlers.mts` | ✅ | без whitespace-ошибок |
| Acceptance #1 | ✅ | lint зелёный |
| Acceptance #2 | ✅ | TypeScript зелёный |
| Acceptance #3 | ✅ | `room:create`: `isHost: false`, `hostId: ''` |
| Acceptance #4 | ✅ | первый `role:'player'` получает `isHost`, `hostId`, `gameHostPlayerId` |
| Acceptance #5 | ✅ | при 0 player отправляется `game:error`, старт не выполняется |
| Acceptance #6 | ✅ | `room:kick` и `room:transfer-host` игнорируют не-хоста |
| Acceptance #7 | ✅ | transfer снимает старые `isHost`, ставит новому, обновляет `hostId` и `gameHostPlayerId` |

---

## Отклонения от ТЗ

Нет отклонений. Дополнительно в `room:transfer-host` добавлен guard
`newHost.role === 'player'`, чтобы TV/создатель не мог стать хостом через
серверный event.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Посмотреть `src/server/socket-handlers.mts:167` — создатель комнаты теперь
  сохраняется без host-прав.
- Посмотреть `src/server/socket-handlers.mts:253` — первый новый phone-player
  назначается хостом только при `gameHostPlayerId === null`.
- Посмотреть `src/server/socket-handlers.mts:331` — guard старта без player-ролей.
- Посмотреть `src/server/socket-handlers.mts:399` и `src/server/socket-handlers.mts:413`
  — серверная проверка отправителя для kick/transfer.
