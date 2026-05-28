# REPORT TASK-150: fix quiz guest host and TV in join list

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-26 20:49
> - **Финиш:** 2026-05-26 20:54
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Квиз теперь использует guest id из `party-hub-join-guest-id` как fallback для player identity, поэтому гость может быть `gameHostPlayerId`, видеть старт и отвечать. На `/join/[code]` TV-role снова скрыт из списка игроков.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — добавлены `GUEST_ID_KEY`, `guestPlayerId`, `effectivePlayerId`; player-identity операции переведены на `effectivePlayerId`.
- `src/app/join/[code]/page.tsx` — `visiblePlayers` снова фильтрует `role !== "tv"`.

### Новые файлы

- `codex-reports/150-fix-quiz-guest-host-and-tv-in-join-list.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 149 ++++++--
 src/app/join/[code]/page.tsx            |   2 +-
 src/app/tv/[roomId]/[gameType]/page.tsx |  69 +++-
 src/components/lobby/Lobby.tsx          | 635 ++++++++++++++++++++++++++++----
 4 files changed, 743 insertions(+), 112 deletions(-)
```

Примечание: общий stat включает незакоммиченные изменения предыдущих задач. В рамках TASK-150 редактировались только два whitelist-файла.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npx tsc --noEmit` | ✅ | TypeScript без ошибок |
| `npm run build` | ✅ | В sandbox упал на Turbopack `Operation not permitted`; повтор вне sandbox прошёл с exit 0. В выводе остался существующий `ReferenceError: location is not defined` |
| Acceptance: guest game-host | ✅ | `isGameHost` использует `effectivePlayerId` |
| Acceptance: guest answers | ✅ | `myAnswer`, `quiz:answer.playerId`, локальный `answers` key используют `effectivePlayerId` |
| Acceptance: `isHost` | ✅ | `isHost` оставлен через `user?.id` |
| Acceptance: join list | ✅ | `visiblePlayers` фильтрует `role !== "tv"` |

---

## Места `user.id` → `effectivePlayerId`

- `src/app/game/[roomId]/quiz/page.tsx:109` — добавлен `effectivePlayerId = user?.id ?? guestPlayerId`.
- `src/app/game/[roomId]/quiz/page.tsx:111` — `isGameHost` сравнивает `effectivePlayerId` с `gameHostPlayerId`.
- `src/app/game/[roomId]/quiz/page.tsx:112` — `myAnswer` читает `gameState.answers[effectivePlayerId]`.
- `src/app/game/[roomId]/quiz/page.tsx:668` — submit guard проверяет `effectivePlayerId`.
- `src/app/game/[roomId]/quiz/page.tsx:673` — `quiz:answer` отправляет `playerId: effectivePlayerId`.
- `src/app/game/[roomId]/quiz/page.tsx:677` — локальный `answers` state пишет по ключу `effectivePlayerId`.

Оставлено как `user.id`: auto-reconnect использует `user.id` + `user.nickname`, это auth/reconnect-сценарий для залогиненного пользователя, не guest identity.

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверить guest flow на `/game/[roomId]/quiz`: `effectivePlayerId` должен совпадать с id, созданным на `/join/[code]`.
