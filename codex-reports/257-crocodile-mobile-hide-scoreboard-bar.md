# REPORT TASK-257: Крокодил (мобильный): убрать верхнюю полосу игроков/очков на итогах

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-17 20:28
> - **Финиш:** 2026-06-17 20:29
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В мобильном Крокодиле `GameLayout` больше не показывает верхний scoreboard: `showScoreboard` установлен в `false`. Больше production-код не менялся в рамках TASK-257.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/crocodile/page.tsx` — заменён `showScoreboard={gameState?.phase === 'finished'}` на `showScoreboard={false}`.

### Новые файлы

- `codex-reports/257-crocodile-mobile-hide-scoreboard-bar.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Current diff stat for the whitelisted production file:

```
src/app/game/[roomId]/crocodile/page.tsx | 354 ++++++++++++++++++-------------
1 file changed, 206 insertions(+), 148 deletions(-)
```

Примечание: в `src/app/game/[roomId]/crocodile/page.tsx` уже были незакоммиченные изменения до старта TASK-257, поэтому stat выше не отражает только эту задачу. Изменение TASK-257 — только строка `showScoreboard={false}`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npm run build` | не запускался | По ТЗ build не запускать |
| Acceptance: только `crocodile/page.tsx` для production-кода | ✅ | Отчёт добавлен в `codex-reports/` |
| Acceptance: scoreboard скрыт на mobile finished | ✅ | `showScoreboard={false}` |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/crocodile/page.tsx`: у `<GameLayout>` теперь `showScoreboard={false}`.
- В рабочем дереве есть незакоммиченные изменения предыдущих задач; TASK-257 намеренно не трогал их.
