# REPORT TASK-129: Quiz scoreboard strip + smaller button radius

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-22 20:50
> - **Финиш:** 2026-05-22 21:02
> - **Длительность:** 12 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Панель игроков в `GameLayout` заменена на горизонтальную полосу с `PlayerAvatar`, очками и статусом ответа. В квизе `scoreboard` больше не сортируется, получает `hasAnswered`/`isCorrect`, а кнопки ответов переведены с `rounded-xl` на `rounded`.

Статус partial только из-за проверки: `npm run build` упал на Turbopack internal error из-за sandbox `Operation not permitted`; webpack fallback `npx next build --webpack` завершился успешно.

---

## Что сделано

### Изменённые файлы

- `src/components/games/GameLayout.tsx` — расширен тип `scores`; удалены старые inline бейджи и мобильный dropdown; добавлена горизонтальная полоса игроков с аватаром, ником, зелёными очками, статусом ответа и зелёным highlight для верного ответа.
- `src/app/game/[roomId]/quiz/page.tsx` — `scoreboard` теперь строится в стабильном порядке игроков и включает `hasAnswered`/`isCorrect`; radius кнопок ответов уменьшен до `rounded`.
- `src/app/globals.css` — добавлен utility `.scrollbar-none` для скрытия скроллбара у горизонтальной полосы.

### Новые файлы

- `codex-reports/129-quiz-scoreboard-strip.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/quiz/page.tsx |  11 ++--
src/app/globals.css                 |   9 +++
src/components/games/GameLayout.tsx | 107 +++++++++++++++---------------------
3 files changed, 60 insertions(+), 67 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack internal error: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `src/app/globals.css` |
| `npx next build --webpack` | ✅ | Exit 0; в выводе есть существующий `ReferenceError: location is not defined` для `/profile`, сборку не ломает |
| `git diff --check` | ✅ | Без whitespace errors |
| Acceptance #1 | ⚠️ | Exact `npm run build` заблокирован sandbox/Turbopack, webpack build успешен |
| Acceptance #2 | ✅ | Старые бейджи справа и mobile dropdown удалены |
| Acceptance #3 | ✅ | Новая полоса игроков рендерится под title-строкой внутри `header` |
| Acceptance #4 | ✅ | Карточка игрока: `PlayerAvatar size="xs"`, ник, зелёные очки, `✓`/`…` |
| Acceptance #5 | ✅ | `hasAnswered=true` даёт зелёную `✓`; `isCorrect=true` даёт зелёную рамку |
| Acceptance #6 | ✅ | Кнопки ответов используют `rounded` |
| Acceptance #7 | ✅ | `scoreboard` в quiz не сортируется |
| Acceptance #8 | ✅ | `hasAnswered` и `isCorrect` вычисляются из `gameState.answers`, `showCorrect`, `correctPlayers` |

---

## Отклонения от ТЗ

- Добавлен `src/app/globals.css` для `.scrollbar-none`, как разрешено в контрольных вопросах ТЗ.
- Exact `npm run build` не удалось подтвердить из-за Turbopack/sandbox error; проверен webpack fallback.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не подтверждён exact `npm run build` в текущем sandbox из-за Turbopack internal error `Operation not permitted`.

---

## Подсказки для ревью

- Проверь `src/components/games/GameLayout.tsx`: новая полоса намеренно использует исходный порядок `scores`, без сортировки.
- Проверь `src/app/game/[roomId]/quiz/page.tsx`: `hasAnswered` основан на наличии id в `gameState.answers`, а зелёная рамка появляется только после `gameState.showCorrect`.
