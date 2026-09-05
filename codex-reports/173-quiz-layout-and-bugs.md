# REPORT TASK-173: Quiz — Layout TV, UX мобилки, хост-бейдж, таймер

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-30 19:30 PDT
> - **Финиш:** 2026-05-30 19:41 PDT
> - **Длительность:** 11 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Выполнены все пункты TASK-173: host badge fallback, новый TV layout для question-фазы, перенос "Ответили X/Y" в top bar, удаление мобильного result-блока при сохранении host-кнопки, TV result box и blur для mid-leaderboard. Изменения ограничены whitelist-файлами и отчётом.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — host badge теперь использует `Boolean(player.isHost)` и защищённое сравнение `player.id !== "" && player.id === roomState?.hostId`; фильтр `connectedPlayers` оставлен без изменений.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — в top bar добавлен `Answered/Ответили`, question-фаза перестроена на scoreboard сверху и вопрос/таймер/варианты/result box снизу, удалён старый answer status, mid-leaderboard получил `backdrop-blur-xl` и стиль карточек как у вариантов.
- `src/app/game/[roomId]/quiz/page.tsx` — мобильный блок результата удалён, host-кнопка "Следующий вопрос/Показать результаты" сохранена отдельным блоком; удалён ставший неиспользуемым helper `getPlayerName`.

### Новые файлы

- `codex-reports/173-quiz-layout-and-bugs.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     |  45 ++--------
 src/app/tv/[roomId]/[gameType]/page.tsx | 155 ++++++++++++++++++--------------
 src/components/lobby/Lobby.tsx          |   2 +-
 3 files changed, 94 insertions(+), 108 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `npm run lint` | ✅ | Без warnings после удаления unused helper |
| `npm run build` | ❌ | Turbopack sandbox error: `creating new process`, `binding to a port`, `Operation not permitted` |
| `npx next build --webpack` | ✅ | Exit code 0; в логе есть существующий `ReferenceError: location is not defined` для `/profile`, но build завершился успешно |
| `git diff --check` | ✅ | Проблем whitespace нет |
| Acceptance #1 | ✅ | Host badge fallback обновлён |
| Acceptance #2 | ✅ | TV question phase: scoreboard сверху, quiz content снизу |
| Acceptance #3 | ✅ | `Ответили X/Y` в top bar |
| Acceptance #4 | ✅ | Мобильный result message удалён, host-кнопка оставлена |
| Acceptance #5 | ✅ | TV result message в glass box |
| Acceptance #6 | ✅ | Mid-leaderboard карточки с `backdrop-blur-xl` |

---

## Отклонения от ТЗ

Нет отклонений по production-коду. `npm run build` не прошёл из-за ограничения sandbox/Turbopack; для проверки сборки дополнительно запущен `npx next build --webpack`, он завершился успешно.

---

## Открытые вопросы для Claude

- `.codex/STATUS.md` всё ещё указывает активный TASK-171, а `CLAUDE.md` и `.codex/STATUS.md` уже были modified до старта работы. Я их не трогал.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Ничего.

---

## Подсказки для ревью

- Проверь визуально `src/app/tv/[roomId]/[gameType]/page.tsx` в question-фазе: scoreboard row сверху, свободное место фона в середине, вопрос/таймер/варианты/result box снизу.
- Проверь `src/app/game/[roomId]/quiz/page.tsx`: мобильный экран больше не показывает список правильно ответивших, но host всё ещё может перейти к следующему вопросу.
