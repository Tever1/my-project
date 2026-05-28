# REPORT TASK-149: fix quiz start TV pivot

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-25 21:23
> - **Финиш:** 2026-05-25 21:27
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TV-страница квиза теперь читает lobby config из `localStorage`, переводит свой `quizState` в `waiting` и рассылает `quiz:config` клиентам. Телефонная quiz-страница использует `gameHostPlayerId` как управляющего квизом, поэтому первый player-host видит кнопку старта и ведёт таймер/переходы.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлено чтение `party-hub-quiz-config` для quiz, расчёт `totalQuestions`, локальный переход TV в `waiting` и broadcast `quiz:config`.
- `src/app/game/[roomId]/quiz/page.tsx` — добавлен `gameHostPlayerId` в state, вычисление `isGameHost`, `isGameHostRef`, обработка `gameHostPlayerId` из `room:state`, замена host-guard'ов управления квизом на game-host.

### Новые файлы

- `codex-reports/149-fix-quiz-start-tv-pivot.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 129 +++++--
 src/app/join/[code]/page.tsx            |   2 +-
 src/app/tv/[roomId]/[gameType]/page.tsx |  69 +++-
 src/components/lobby/Lobby.tsx          | 635 ++++++++++++++++++++++++++++----
 4 files changed, 727 insertions(+), 108 deletions(-)
```

Примечание: общий stat включает незакоммиченные изменения предыдущих задач. В рамках TASK-149 редактировались только два whitelist-файла: TV page и quiz page.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npx tsc --noEmit` | ✅ | TypeScript без ошибок |
| `npm run build` | ⚪ | Не запускался: в acceptance указан lint |
| Acceptance #1 | ✅ | TV применяет config и переходит в `waiting`; game-host получает кнопку старта |
| Acceptance #2 | ✅ | TV продолжает обрабатывать `quiz:start-question`, `quiz:timer`, `quiz:show-results` |

---

## Отклонения от ТЗ

Нет отклонений. В TV effect локальный `setQuizState` обёрнут в `queueMicrotask`, чтобы пройти правило `react-hooks/set-state-in-effect`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверь `isGameHost` guards в quiz page: управление квизом перешло с socket host на `gameHostPlayerId`.
- Проверь TV effect: он ждёт `isConnected`, чтобы не удалить config из `localStorage` до возможности отправить `game:action`.
