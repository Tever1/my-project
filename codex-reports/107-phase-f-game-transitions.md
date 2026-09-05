# REPORT TASK-107: phase-f-game-transitions

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-19 21:01
> - **Финиш:** 2026-05-19 21:09
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `GameLayout` добавлен optional `phaseKey` и единая Framer Motion-анимация смены фаз через `AnimatePresence mode="wait"`. Все 8 игровых экранов теперь передают текущую фазу в `phaseKey`; игровая логика и внутренние `animate-fade-in` классы не менялись.

---

## Что сделано

### Изменённые файлы

- `src/components/games/GameLayout.tsx` — добавлен `phaseKey?: string`, импорт `motion`/`AnimatePresence`, children обёрнуты в `motion.div` с exit/enter transition.
- `src/app/game/[roomId]/spy/page.tsx` — добавлен `phaseKey={s.phase}`.
- `src/app/game/[roomId]/mafia/page.tsx` — добавлен `phaseKey={gs.phase}`.
- `src/app/game/[roomId]/quiz/page.tsx` — добавлен `phaseKey={gameState.phase}`.
- `src/app/game/[roomId]/crocodile/page.tsx` — добавлен `phaseKey={gameState?.phase ?? 'waiting'}`.
- `src/app/game/[roomId]/alias/page.tsx` — добавлен `phaseKey={gameState?.phase ?? 'modeSelect'}`.
- `src/app/game/[roomId]/who-am-i/page.tsx` — добавлен `phaseKey={gs.phase}`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx` — добавлен `phaseKey={s.phase}`.
- `src/app/game/[roomId]/truth-or-dare/page.tsx` — добавлен `phaseKey={gameState?.phase ?? 'choosing'}`.

### Новые файлы

- `codex-reports/107-phase-f-game-transitions.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/alias/page.tsx          |  1 +
src/app/game/[roomId]/crocodile/page.tsx      |  1 +
src/app/game/[roomId]/hundred-to-one/page.tsx |  3 ++-
src/app/game/[roomId]/mafia/page.tsx          |  1 +
src/app/game/[roomId]/quiz/page.tsx           |  1 +
src/app/game/[roomId]/spy/page.tsx            |  2 +-
src/app/game/[roomId]/truth-or-dare/page.tsx  |  1 +
src/app/game/[roomId]/who-am-i/page.tsx       |  1 +
src/components/games/GameLayout.tsx           | 18 +++++++++++++++---
9 files changed, 24 insertions(+), 5 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ✅ | Запущен вне sandbox из-за Turbopack port-binding ограничения; exit code 0. В логе остался существующий `ReferenceError: location is not defined` во время static generation, но build завершился успешно |
| Acceptance: `phaseKey?: string` в GameLayout | ✅ | `src/components/games/GameLayout.tsx:19` |
| Acceptance: `AnimatePresence mode="wait" initial={false}` | ✅ | `src/components/games/GameLayout.tsx:138` |
| Acceptance: exit/enter animation | ✅ | `src/components/games/GameLayout.tsx:142-145` |
| Acceptance: all 8 games pass phaseKey | ✅ | Проверено через `rg -n "phaseKey=" src/components/games/GameLayout.tsx 'src/app/game/[roomId]'` |

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

- Основной риск для визуального ревью — `GameLayout` теперь всегда оборачивает content в `AnimatePresence`, но при отсутствии `phaseKey` key остаётся `'static'`, поэтому callers без prop не должны получать phase-change анимации.
- В рабочем дереве уже был изменён `.codex/STATUS.md` и untracked task spec; я их не редактировал.
