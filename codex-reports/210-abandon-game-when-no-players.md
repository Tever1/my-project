# REPORT TASK-210: Прервать игру, когда вышли все игроки

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-04 20:40
> - **Финиш:** 2026-06-04 20:48
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен серверный abort для in-game комнаты, когда после удаления disconnect-записи не осталось ни одного `role: 'player'`. Хелпер сбрасывает игру теми же полями, что и `game:end`, рассылает `game:ended` и не срабатывает во время grace-периода.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен `abortGameIfNoPlayers`; explicit disconnect и grace-timeout вызывают его после удаления игрока и host reassignment, без изменения пути удаления пустой комнаты.

### Новые файлы

- `codex-reports/210-abandon-game-when-no-players.md` — отчёт по TASK-210.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/server/socket-handlers.mts | 166 ++++++++++++++++++++++++++++++++++++-----
 1 file changed, 147 insertions(+), 19 deletions(-)
```

Примечание: в `src/server/socket-handlers.mts` уже были незакоммиченные изменения до TASK-210; stat выше показывает общий текущий diff файла.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run lint` | ✅ | без ошибок |
| Acceptance #1 | ✅ | last `role:'player'` после удаления сбрасывает игру |
| Acceptance #2 | ✅ | обычный disconnect в grace не удаляет игрока и не abort'ит игру |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Посмотреть `src/server/socket-handlers.mts:185` — reset полей соответствует `game:end`.
- Посмотреть `src/server/socket-handlers.mts:570` и `src/server/socket-handlers.mts:598` — abort вызывается только после `room.players.delete(...)`, поэтому grace-период не прерывает игру преждевременно.
