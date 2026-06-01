# REPORT TASK-182: Скругления кнопок + ширина кнопки спец-квиза

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-30 22:40
> - **Финиш:** 2026-05-30 22:45
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Кнопка выбора спец-квиза в Quiz теперь занимает всю ширину, а номер и название стоят в одной строке по центру. Найденные standalone-кнопки действий/выбора с `rounded-lg` в Spy и 100 к 1 переведены на `rounded-md`; остальные совпадения `rounded-xl/lg` в whitelist относятся не к кнопкам-опциям.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — центрировал контент кнопки спец-квиза, убрал `min-w-0`, `flex-shrink-0`, `break-words`.
- `src/app/game/[roomId]/spy/page.tsx` — заменил `rounded-lg` на `rounded-md` у кнопок очистки canvas и управления таймером.
- `src/app/game/[roomId]/hundred-to-one/page.tsx` — заменил `rounded-lg` на `rounded-md` у кнопок выбора игроков в Большой игре.

### Новые файлы

- `codex-reports/182-button-radius-and-width.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/hundred-to-one/page.tsx | 4 ++--
 src/app/game/[roomId]/quiz/page.tsx           | 8 ++++----
 src/app/game/[roomId]/spy/page.tsx            | 6 +++---
 3 files changed, 9 insertions(+), 9 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| Acceptance #1 | ✅ | Кнопка спец-квиза `w-full`, `text-center`, внутренний flex `justify-center gap-3`. |
| Acceptance #2 | ✅ | В кнопках-опциях whitelist не осталось `rounded-2xl`/`rounded-xl`; найденные оставшиеся совпадения относятся к canvas, бейджам, инпутам, статусным карточкам/таблицам. |

---

## Отклонения от ТЗ

Нет отклонений. `git pull` выполнен, удалённая ветка была up to date.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Перед стартом в рабочем дереве уже были изменения в запрещённых для Codex файлах `.codex/STATUS.md` и `CLAUDE.md`; я их не трогал.
- `grep` всё ещё находит `rounded-xl/lg` в whitelist, но это не option buttons: canvas, badges, inputs, scoreboard/status rows и informational panels.
