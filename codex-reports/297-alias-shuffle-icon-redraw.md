# REPORT TASK-297: Alias shuffle icon redraw

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-25 21:45
> - **Финиш:** 2026-06-25 21:51
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Иконка `shuffle` заменена на симметричный вариант из ТЗ в обоих местах: production-компоненте Alias и превью `/design-tokens`. Другие иконки, Alias game page, TV и стили не трогались.

---

## Что сделано

### Изменённые файлы

- `src/components/games/AliasIcon.tsx` — в записи `shuffle` заменены 3 старых SVG `path` на 5 новых.
- `src/app/design-tokens/page.tsx` — в `AlShuffle` заменены 3 старых SVG `path` на 5 новых.

### Новые файлы

- `codex-reports/297-alias-shuffle-icon-redraw.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/design-tokens/page.tsx | 147 +++++++++++++++++++++++++++++++++++++++++
 1 file changed, 147 insertions(+)
```

Примечание: stat выше включает уже существовавшие до TASK-297 незакоммиченные изменения в `src/app/design-tokens/page.tsx`. `src/components/games/AliasIcon.tsx` был untracked до начала задачи, поэтому обычный `git diff --stat` его не показывает.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| `npm run build` | ⏭️ | не запускался по ТЗ |
| Acceptance #1 | ✅ | новые shuffle path стоят в `/design-tokens` renderer |
| Acceptance #2 | ✅ | `npx tsc --noEmit` прошёл |
| Acceptance #3 | ✅ | `npm run lint` прошёл |

---

## Отклонения от ТЗ

Нет отклонений. Build не запускался согласно прямому указанию в задаче.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь только два SVG-блока: `shuffle` в `src/components/games/AliasIcon.tsx` и `AlShuffle` в `src/app/design-tokens/page.tsx`.
