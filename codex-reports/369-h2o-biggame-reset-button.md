# REPORT TASK-369: «100 к 1» Большая игра — кнопка сброса раунда

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 22:00
> - **Финиш:** 2026-07-20 22:07
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлена host-only кнопка «Сброс раунда» для Большой игры в мобильном UI. Кнопка появляется только при `bgPhase >= 1` и возвращает Большую игру к `bgPhase: 0`, очищая ответы, совпадения, фонд, выбранных игроков и таймер без изменения `winTeam` и обычных командных очков.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — добавлена функция `resetBigGame` рядом с `bg*`-функциями; добавлена условная кнопка сброса под заголовком «БОЛЬШАЯ ИГРА».

### Новые файлы

- `codex-reports/369-h2o-biggame-reset-button.md` — отчёт по TASK-369.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/hundred-to-one/page.tsx | task-relevant: +19 -0
codex-reports/369-h2o-biggame-reset-button.md | new report
```

Примечание: `git diff --stat -- src/app/game/[roomId]/hundred-to-one/page.tsx` сейчас показывает `550 insertions(+), 366 deletions(-)`, потому что в рабочем дереве уже были незакоммиченные изменения в этом файле до TASK-369.

---

## Diff по строкам

- `src/app/game/[roomId]/hundred-to-one/page.tsx:763` — добавлен `resetBigGame`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:765` — останавливается `bgTimerRef`, если таймер активен.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:766` — через `update()` broadcast-ится сброс Big Game state: `bgPhase: 0`, пустые ответы/совпадения, `bgFund: 0`, `bgCurQ: 0`, пустые `bgP1Id/bgP2Id`, сброшенный таймер.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:1430` — добавлена host-only кнопка, видимая только при `s.bgPhase >= 1`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:1432` — кнопка использует тот же стиль, что reset обычного раунда: `H2O_SECONDARY_BUTTON` + красные модификаторы.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| Acceptance: кнопки нет на `bgPhase === 0` | ✅ | условие `s.bgPhase >= 1` |
| Acceptance: host видит кнопку на `bgPhase >= 1` | ✅ | условие `isGameHost && s.bgPhase >= 1` |
| Acceptance: reset очищает Big Game state | ✅ | сбрасываются ответы, совпадения, фонд, игроки, таймер |
| Acceptance: `winTeam`, `t1s`, `t2s` не тронуты | ✅ | этих полей нет в patch для `update()` |
| Acceptance: не-хост кнопку не видит | ✅ | условие `isGameHost` |
| Acceptance: обычные раунды не затронуты | ✅ | `resetRound` и host controls обычных раундов не изменялись в рамках TASK-369 |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `src/app/game/[roomId]/hundred-to-one/page.tsx:763` — reset намеренно не включает `winTeam`, `t1s`, `t2s`.
- Проверить `src/app/game/[roomId]/hundred-to-one/page.tsx:1430` — кнопка скрыта на intro-фазе `bgPhase === 0`.
