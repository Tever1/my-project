# REPORT TASK-205: Авто-передача хоста случайному игроку при выходе хоста

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-03 21:08
> - **Финиш:** 2026-06-03 21:13
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен общий helper для авто-передачи хоста при выходе текущего хоста. Явный `room:leave` и удаление после grace-периода теперь выбирают случайного подключённого `role: 'player'`, обновляют `hostId` и `gameHostPlayerId`, либо сбрасывают хоста при отсутствии подходящих игроков.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен `reassignHostOnLeave`; explicit leave и grace-timeout disconnect используют его вместо отсутствующей/inline логики.

### Новые файлы

- `codex-reports/205-auto-transfer-host-on-leave.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Текущий cumulative diff whitelist-файла относительно HEAD включает изменения, которые уже были в рабочем дереве до TASK-205:

```text
 src/server/socket-handlers.mts | 123 +++++++++++++++++++++++++++++++++++------
 1 file changed, 107 insertions(+), 16 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run lint` | ✅ | 0 ошибок |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `binding to a port` / `Operation not permitted` при обработке `geist` CSS |
| `npm run build -- --webpack` | ✅ | exit code 0; в логе есть существующий prerender warning `ReferenceError: location is not defined` для `/profile` |
| Acceptance: host leave with eligible players | ✅ | Helper выбирает случайного connected `role:'player'`, ставит `isHost`, `hostId`, `gameHostPlayerId` |
| Acceptance: host leave with only TV/no eligible players | ✅ | Helper сбрасывает `hostId=''`, `gameHostPlayerId=null`, комнату не закрывает если в ней кто-то остался |
| Acceptance: non-host leaves | ✅ | Helper вызывается только если `wasHost === true` |

---

## Отклонения от ТЗ

Нет отклонений по production-коду. Дополнительно запускал `npm run build` по общему workflow; обычный Turbopack build не прошёл из-за ограничения sandbox, webpack fallback прошёл.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/server/socket-handlers.mts:156` — helper сбрасывает `isHost` у всех и синхронно обновляет оба host-id поля.
- Проверь `src/server/socket-handlers.mts:528` и `src/server/socket-handlers.mts:552` — `wasHost` захватывается до удаления, а reassignment происходит после удаления игрока и до единственного broadcast в соответствующей ветке.
- В рабочем дереве до старта уже были изменения в запрещённых для Codex файлах (`CLAUDE.md`, `.codex/STATUS.md`, `codex-tasks/**` и др.); я их не редактировал и не откатывал.
