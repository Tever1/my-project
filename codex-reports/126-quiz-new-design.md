# REPORT TASK-126: quiz-new-design

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-21 21:05
> - **Финиш:** 2026-05-21 21:05
> - **Длительность:** ~25 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `src/app/game/[roomId]/quiz/page.tsx` применён выбранный дизайн квиза: кнопки ответов переведены на numbered-вариант с левой полоской, countdown заменён на Framer Motion scale+glow, reveal получил scale/shake и SVG checkmark/крестик. Логику `submitAnswer`, reveal, timer и socket events не менял.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — добавлен `motion`/`AnimatePresence`, удалены `OPTION_COLORS` и `OPTION_LABELS`, заменены countdown и answer option UI.

### Новые файлы

- `codex-reports/126-quiz-new-design.md` — отчёт по TASK-126.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/quiz/page.tsx | 132 +++++++++++++++++++++++++++---------
1 file changed, 99 insertions(+), 33 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git diff --name-only -- src/app/game/[roomId]/quiz/page.tsx` | ✅ | только `src/app/game/[roomId]/quiz/page.tsx` для TASK-126 |
| `rg "OPTION_COLORS\|OPTION_LABELS\|animate-bounce" src/app/game/[roomId]/quiz/page.tsx` | ✅ | целевые старые конструкции удалены |
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ✅ | exit 0 после запуска вне sandbox |

Примечание по build: внутри sandbox Turbopack снова упал на `binding to a port / Operation not permitted`; вне sandbox сборка прошла. Во время успешной сборки Next по-прежнему выводит `ReferenceError: location is not defined`, но команда завершается с кодом 0.

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить phase `countdown`: цифра должна быть жёлтой, с glow и scale-анимацией через `AnimatePresence`.
- Проверить phase `question`: answer options больше не используют градиентные кнопки, а выбранный ответ подсвечивает жёлтую левую полоску и бейдж.
- Проверить reveal: правильный ответ scale-up + зелёный checkmark, неверно выбранный ответ shake + красный крестик.
