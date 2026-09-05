# REPORT TASK-340: Шпион — адресат вопроса и цепочка хода

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-12 01:17
> - **Финиш:** 2026-07-12 01:34
> - **Длительность:** 17 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В режиме «Угадывай» добавлены `guessAskerId` и `guessTargetId`: первый спрашивающий и первый адресат инициализируются при старте раунда, а после передачи хода адресат предыдущего вопроса становится новым спрашивающим. Mobile и TV теперь показывают и того, кто задаёт вопрос, и того, кому он адресован; draw-режим оставлен на прежнем круговом `playerOrderIdx`/`drawerId`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — добавлены поля `guessAskerId`/`guessTargetId`, случайный выбор адресата, цепочная передача хода для `guess`, сброс новых полей на новый раунд/игру, mobile UI с адресатом вопроса.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлены поля в локальный spy-state, TV отображает адресата вопроса, нижний порядок хода в `guess` подсвечивает активного по id, убрано слово «вслух» в обсуждении.

### Новые файлы

- `codex-reports/340-spy-question-target-chain.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
src/app/game/[roomId]/spy/page.tsx      | 319 +++++++++++++++++++++++++-------
src/app/tv/[roomId]/[gameType]/page.tsx |  50 +++--
2 files changed, 291 insertions(+), 78 deletions(-)
```

Примечание: stat выше по двум whitelist-файлам включает незакоммиченные изменения предыдущих TASK-337/338/339, уже присутствовавшие до старта TASK-340.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | первый запуск упал из-за отсутствующих `.next/types`; после `next build --webpack` прошёл |
| `npm run build` | ⚠️ | Turbopack упал на sandbox `binding to a port` |
| `npx next build --webpack` | ✅ | exit code 0; в выводе есть существующий `ReferenceError: location is not defined` на `/profile/page`, сборку не роняет |
| Acceptance #1 | ✅ | lint без новых ошибок |
| Acceptance #2 | ✅ | tsc без ошибок после генерации `.next/types` |
| Acceptance #3 | ✅ | mobile и TV показывают спрашивающего и адресата |
| Acceptance #4 | ✅ | в `guess` новый спрашивающий = предыдущий адресат |
| Acceptance #5 | ✅ | `draw` продолжает использовать `playerOrderIdx` + `drawerId` |
| Acceptance #6 | ✅ | на TV фраза «вслух» убрана |
| Acceptance #7 | ✅ | другие игры не редактировались |

---

## Отклонения от ТЗ

Нет отклонений по реализации. По проверкам: `npm run build` на Turbopack не проходит из-за sandbox-ограничения окружения, поэтому выполнен fallback `npx next build --webpack`, как указано в task.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- В `src/app/game/[roomId]/spy/page.tsx` стоит проверить `startPlaying()` и `passTurn()`: ветка `guess` теперь работает через `guessAskerId/guessTargetId`, ветка `draw` оставлена круговой.
- В `src/app/tv/[roomId]/[gameType]/page.tsx` стоит проверить footer «Порядок хода»: для `guess` больше нет `isDone`, подсвечивается только текущий спрашивающий.
