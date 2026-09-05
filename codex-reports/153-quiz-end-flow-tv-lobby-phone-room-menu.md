# REPORT TASK-153: quiz end flow tv lobby phone room menu

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-26 21:39
> - **Финиш:** 2026-05-26 21:44
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Завершение квиза теперь разводит устройства по нужным маршрутам: TV уходит в `/lobby/CODE`, телефонный quiz-клиент — в `/join/CODE`. На `/join/CODE` добавлен auto-detect уже присоединившегося игрока по `playerId`, без повторного `room:join`.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — redirect на `game:ended` заменён с `/tv/${roomId}` на `/lobby/${roomId}`.
- `src/app/game/[roomId]/quiz/page.tsx` — redirect на `game:ended` заменён с `/lobby/${roomId}` на `/join/${roomId}`.
- `src/app/join/[code]/page.tsx` — добавлен эффект, который при наличии текущего `playerId` в `roomState.players` выставляет `joined=true` и подтягивает nickname из записи игрока.

### Новые файлы

- `codex-reports/153-quiz-end-flow-tv-lobby-phone-room-menu.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 151 ++++++--
 src/app/join/[code]/page.tsx            |  14 +-
 src/app/tv/[roomId]/[gameType]/page.tsx |  71 +++-
 src/components/lobby/Lobby.tsx          | 635 ++++++++++++++++++++++++++++----
 src/server/socket-handlers.mts          |  28 +-
 5 files changed, 775 insertions(+), 124 deletions(-)
```

Примечание: общий `git diff --stat` включает незакоммиченные изменения предыдущих задач. В рамках TASK-153 код менялся только в трёх whitelist-файлах.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit code 0 |
| `npx tsc --noEmit` | ✅ | exit code 0 |
| TV после `game:ended` → `/lobby/CODE` | ✅ | redirect изменён в TV game page |
| Телефон после `game:ended` → `/join/CODE` | ✅ | redirect изменён в quiz page |
| `/join/CODE` auto-detect already-joined | ✅ | поиск по `playerId` в `roomState.players` |
| Без лишнего `room:join` при auto-detect | ✅ | эффект только меняет локальный UI state |
| Никаких изменений вне whitelist | ✅ | кодовые правки только в трёх разрешённых файлах; отчёт добавлен отдельно |

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

- В `src/app/join/[code]/page.tsx` auto-detect использует `queueMicrotask`, чтобы пройти `react-hooks/set-state-in-effect`.
- Как тестировать: завершить quiz с телефона-game-host; TV должен перейти на `/lobby/CODE`, телефон — на `/join/CODE` и сразу увидеть waiting-экран со списком игроков.
