# REPORT TASK-134: player-role-tv-player

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-24 21:15
> - **Финиш:** 2026-05-24 21:37
> - **Длительность:** ~22 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлено поле `role: 'tv' | 'player'` для серверного `Player`, payload'ы `room:create`/`room:join` принимают опциональную роль, а `room:state` отдаёт `tvConnected`. В `Lobby.tsx` роль вычисляется через `usePlayMode()`, передаётся при create/join/reconnect, а TV-экран скрывается из списка игроков комнаты.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен `Player.role`, fallback `data.role ?? 'player'` в create/new join, `tvConnected` в `room:state` broadcast и direct `room:get-state`.
- `src/components/lobby/Lobby.tsx` — добавлен `usePlayMode`, `myRole`, передача `role: myRole` в `room:create` и оба `room:join`; `RoomMenu` фильтрует `role !== "tv"` для видимого списка участников.

### Новые файлы

- `codex-reports/134-player-role-tv-player.md` — отчёт по TASK-134.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/components/lobby/Lobby.tsx | 21 ++++++++++++++-------
 src/server/socket-handlers.mts |  9 +++++++--
 2 files changed, 21 insertions(+), 9 deletions(-)
```

Примечание: stat выше ограничен whitelist-файлами TASK-134. В рабочем дереве до старта уже были несвязанные изменения: `.codex/STATUS.md`, task/report файлы TASK-133 и task-файл TASK-134. Я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `npm run build` | ✅ | exit 0 после запуска вне sandbox |
| Acceptance: `Player.role` | ✅ | `role: 'tv' | 'player'` добавлен |
| Acceptance: create/join payload role | ✅ | `role?: 'tv' | 'player'` в обоих handlers |
| Acceptance: `room:state.tvConnected` | ✅ | добавлен в broadcast и direct state |
| Acceptance: Lobby create/join role | ✅ | `role: myRole` в create, reconnect join и manual join |
| Acceptance: TV скрыт из UI игроков | ✅ | `RoomMenu` фильтрует `p.role !== "tv"` |
| Acceptance: reconnect не сбрасывает role | ✅ | existingPlayer-ветка не меняет `role` |

Примечание по build: внутри sandbox Turbopack снова упал на `binding to a port / Operation not permitted`; вне sandbox сборка прошла. Во время успешной сборки Next по-прежнему выводит `ReferenceError: location is not defined`, но команда завершается с кодом 0.

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить, что desktop lobby с `mode === "desktop"` создаёт/джойнится как `role: "tv"`, но сохраняет hostId и может управлять комнатой.
- Проверить, что мобильный join с `mode !== "desktop"` виден в `RoomMenu`.
- Проверить, что reconnect existing player не меняет ранее сохранённую роль.
