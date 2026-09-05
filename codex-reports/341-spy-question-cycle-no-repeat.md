# REPORT TASK-341: Шпион (режим «Угадывай») — не повторять адресата вопроса в круге

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-12 01:45
> - **Финиш:** 2026-07-12 01:57
> - **Длительность:** 12 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен учёт адресатов текущего круга в guess-режиме Spy. Новый адресат выбирается из игроков, которые ещё не отвечали в текущем круге; когда кандидаты заканчиваются, круг сбрасывается и повторы снова разрешены.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — добавлено поле `guessCycleAnswered`, заменён случайный выбор адресата на `pickNextTarget`, обновлены `startPlaying()` и `passTurn()`, добавлены reset'ы нового поля рядом с reset'ами `guessAskerId`/`guessTargetId`.

### Новые файлы

- `codex-reports/341-spy-question-cycle-no-repeat.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/spy/page.tsx | 345 ++++++++++++++++++++++++++++++-------
1 file changed, 281 insertions(+), 64 deletions(-)
```

Примечание: рабочее дерево уже содержало незакоммиченные изменения TASK-337/338/340 в этом же файле до старта TASK-341, поэтому stat от `git diff` включает не только текущую правку.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ⚠️ | Turbopack упал из-за sandbox: `binding to a port / Operation not permitted` |
| `npx next build --webpack` | ✅ | exit code 0; в выводе есть существующий `ReferenceError: location is not defined` при prerender `/profile`, сборка не упала |
| Acceptance: без повторов в круге | ✅ | `pickNextTarget` исключает `guessCycleAnswered` до исчерпания кандидатов |
| Acceptance: новый круг после исчерпания | ✅ | при пустом списке кандидатов `cycleAnswered` сбрасывается в `[]` |
| Acceptance: draw-режим не затронут | ✅ | поведение draw не менялось; добавлены только reset'ы нового поля состояния |

---

## Отклонения от ТЗ

Нет отклонений по реализации. По проверкам: `npm run build` на Turbopack не прошёл из-за sandbox-ограничения окружения, выполнен fallback `npx next build --webpack`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Основная логика TASK-341: `src/app/game/[roomId]/spy/page.tsx:217`, `src/app/game/[roomId]/spy/page.tsx:301`, `src/app/game/[roomId]/spy/page.tsx:762`, `src/app/game/[roomId]/spy/page.tsx:784`.
- Reset'ы нового поля добавлены рядом с существующими reset'ами asker/target: startGame, replaceWord, nextRound, nextWord.
