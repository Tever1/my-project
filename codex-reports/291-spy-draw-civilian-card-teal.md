# REPORT TASK-291: Шпион draw civilian card teal

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-25 20:36
> - **Финиш:** 2026-06-25 20:38
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Карточка слова для мирного жителя в draw-режиме мобильного Шпиона приведена к бирюзовому стилю guess-режима. Карточка шпиона `spy-card-red` не изменялась.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — в draw-режиме для НЕ-шпиона заменён `spy-card-purple` на `spy-card`, а цвет подписи `text-purple-200/70` на `text-teal-200/70`.

### Новые файлы

- `codex-reports/291-spy-draw-civilian-card-teal.md` — отчёт по TASK-291.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/spy/page.tsx | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| Acceptance #1 | ✅ | draw civilian card использует `spy-card` |
| Acceptance #2 | ✅ | подпись использует `text-teal-200/70` |

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

- Проверь `src/app/game/[roomId]/spy/page.tsx:1028`: изменён только civilian draw branch; `spy-card-red` для шпиона не тронут.
