# REPORT TASK-345: «Кто я?» — ask-question шлёт абсолютные значения вместо дельт

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-13 21:25 PDT
> - **Финиш:** 2026-07-13 21:33 PDT
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

`ask-question` в «Кто я?» переведён с дельт на абсолютные значения счётчика вопросов и серии «Да». Повторная доставка того же payload теперь повторно присваивает те же значения, а не увеличивает счётчики.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/who-am-i/page.tsx` — расширен локальный тип `ask-question`; отправитель считает `playerId`, `questionsAsked`, `consecutiveYesAnswers` и шлёт абсолютные значения; приёмник присваивает payload без вычисления активного игрока и без `+1`; `handleYesAnswer` использует тот же `nextStreak`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — расширен локальный TV-тип `ask-question`; TV-приёмник присваивает абсолютные значения из payload без дельта-логики.

### Новые файлы

- `codex-reports/345-whoami-ask-question-absolute-values.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Только whitelist-файлы TASK-345:

```
 src/app/game/[roomId]/who-am-i/page.tsx | 78 +++++++++++++--------------------
 src/app/tv/[roomId]/[gameType]/page.tsx | 28 ++++--------
 2 files changed, 39 insertions(+), 67 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npx next build --webpack` | ✅ | Команда завершилась с code 0; в логе есть существующий `ReferenceError: location is not defined` для `/profile/page.js` при генерации static pages. |
| Acceptance: идемпотентный `ask-question` | ✅ | Приёмники больше не инкрементят локально, а присваивают `payload.questionsAsked` и `payload.consecutiveYesAnswers`. |
| Acceptance: очки от `calculateScore` | ✅ | `questionsAsked[playerId]` сохраняет прежнюю структуру, меняется только способ обновления значения. |

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

- Проверь `src/app/game/[roomId]/who-am-i/page.tsx:391` — `handleQuestionAsked` теперь возвращает `nextStreak | false`, чтобы `handleYesAnswer` проверял ровно то значение, которое ушло в broadcast.
- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx:667` — TV больше не вычисляет текущего игрока из `turnOrder`, а доверяет абсолютному `playerId` из payload.
