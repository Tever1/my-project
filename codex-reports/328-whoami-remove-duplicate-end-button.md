# REPORT TASK-328: «Кто я?» — убрать дублирующую кнопку «Завершить игру» внизу

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-02 22:38
> - **Финиш:** 2026-07-02 22:40
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Удалён нижний дублирующий host-control блок с кнопкой «Завершить игру» в `renderPlaying()`. Верхний `GameLayout onEnd={isGameHost ? handleEndGame : undefined}` оставлен без изменений.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/who-am-i/page.tsx` — удалён условный рендер нижней кнопки `GlassButton variant="danger"` с текстом `Завершить игру` / `End Game`.

### Новые файлы

- `codex-reports/328-whoami-remove-duplicate-end-button.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
src/app/game/[roomId]/who-am-i/page.tsx | 93 ++++++++++++++++++++-------------
1 file changed, 56 insertions(+), 37 deletions(-)
```

Примечание: stat по файлу включает уже существовавшие незакоммиченные изменения предыдущих задач в этом же файле. Изменение TASK-328 — только удаление 6 строк нижнего блока `{/* Host controls */}`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| Acceptance #1 | ✅ | lint и TypeScript без ошибок |
| Acceptance #2 | ✅ | Внизу `renderPlaying()` больше нет кнопки «Завершить игру» |
| Acceptance #3 | ✅ | `GameLayout onEnd={isGameHost ? handleEndGame : undefined}` не изменялся |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить конец `renderPlaying()` в `src/app/game/[roomId]/who-am-i/page.tsx`: нижний host-control блок удалён, контейнер теперь сразу закрывается после карточек состояния игроков.
