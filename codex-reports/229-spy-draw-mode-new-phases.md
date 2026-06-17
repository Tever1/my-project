# REPORT TASK-229: Spy draw mode — dealing/voting/roundResult фазы

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-09 21:50
> - **Финиш:** 2026-06-09 21:58
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Draw mode в Spy теперь стартует через `dealing`, показывает отдельные карточки для шпиона и мирных, затем переходит в `playing` с назначением первого рисующего. В draw playing добавлена кнопка голосования, а `nextRound()` для draw берёт новое слово из `SPY_WORDS`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — draw mode переведён на flow `dealing → playing → voting → roundResult`; добавлен draw-specific dealing UI; `startPlaying()` и авто-ready переход назначают `drawerId`; `nextRound()` для draw выбирает новое слово из `SPY_WORDS`.

### Новые файлы

- `codex-reports/229-spy-draw-mode-new-phases.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/spy/page.tsx | 1194 ++++++++++++++++++++++++++----------
1 file changed, 868 insertions(+), 326 deletions(-)
```

Примечание: `src/app/game/[roomId]/spy/page.tsx` уже содержал большой незакоммиченный diff от TASK-226/227, поэтому stat относительно HEAD включает существующие изменения, не только TASK-229.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 ошибок |
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run build` | ❌ | Turbopack internal error: `creating new process` / `binding to a port` → `Operation not permitted (os error 1)` при обработке `geist` CSS |
| Draw стартует с `phase: 'dealing'` | ✅ | `startGame('draw')` больше не ставит `playing` сразу |
| Draw dealing UI | ✅ | шпион видит "слова нет", мирный видит `s.word` |
| Draw voting | ✅ | у хоста добавлена кнопка `🗳 Начать голосование` |
| Draw next round | ✅ | новая фаза `dealing`, новое слово из `SPY_WORDS` |

---

## Отклонения от ТЗ

Нет отклонений. Дополнительно обработан существующий авто-переход по `spy:ready`: если все игроки посмотрели карточки в draw mode, `drawerId` тоже выставляется в первого игрока из `playerOrder`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Ничего.

---

## Подсказки для ревью

- Проверь `startPlaying()` и обработчик `spy:ready`: оба пути перехода из `dealing` в `playing` теперь выставляют `drawerId` для draw mode.
- В рабочем дереве до TASK-229 уже были незакоммиченные изменения вне whitelist (`CLAUDE.md`, `.codex/STATUS.md`, TV, GameLayout, game-data). Я их не редактировал.
