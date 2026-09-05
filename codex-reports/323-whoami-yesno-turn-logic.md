# REPORT TASK-323: «Кто я?» — новая механика передачи хода через «Да»/«Нет»

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-02 21:40
> - **Финиш:** 2026-07-02 21:47
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `who-am-i` заменена кнопка «Дальше» на «Нет»/«Да» с новой логикой передачи хода. Счётчик серии «Да» хранится в game state, синхронизируется через существующий `game:action` broadcast и сбрасывается при передаче хода или успешном угадывании.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/who-am-i/page.tsx` — добавлено поле `consecutiveYesAnswers`, расширен `ask-question` payload, реализованы обработчики «Нет»/«Да», сброс серии при `next-turn` и correct `guess`, добавлен минимальный текстовый индикатор `Да подряд: N/3`.

### Новые файлы

- `codex-reports/323-whoami-yesno-turn-logic.md` — отчёт по TASK-323.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 .codex/STATUS.md                        |  13 +++-
 codex-tasks/_DONE.md                    |   2 +-
 docs/who-am-i-design-brief.md           | 110 ++++++++++++++------------------
 src/app/game/[roomId]/who-am-i/page.tsx |  58 ++++++++++++++---
 4 files changed, 109 insertions(+), 74 deletions(-)
```

Примечание: `.codex/STATUS.md`, `codex-tasks/_DONE.md` и `docs/who-am-i-design-brief.md` уже были изменены до моей правки; я их не редактировал. Мой production-diff ограничен `src/app/game/[roomId]/who-am-i/page.tsx`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npm exec tsc -- --noEmit` | ✅ | без ошибок |
| Кнопки «Да»/«Нет» вместо «Дальше» | ✅ | текущий игрок видит две default-кнопки рядом с «Я знаю!» |
| «Нет» передаёт ход сразу | ✅ | `ask-question` + `next-turn` |
| «Да» оставляет ход и считает серию | ✅ | `ask-question` с `answer: 'yes'` инкрементирует `consecutiveYesAnswers` |
| 3-й «Да» передаёт ход и сбрасывает счётчик | ✅ | после 3-го «Да» вызывается `next-turn`, который сбрасывает серию |
| Счётчик синхронизирован через socket action | ✅ | поле обновляется в общем reducer `game:action` |
| Correct guess сбрасывает серию | ✅ | ветка `payload.correct` ставит `consecutiveYesAnswers: 0` |

---

## Отклонения от ТЗ

Нет отклонений по production-коду. `src/types/game.ts`, TV-файл и серверные файлы не трогались.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/who-am-i/page.tsx`: ветки `ask-question`, `next-turn`, correct `guess` и обработчик `handleYesAnswer`.
- TV-файл проверен: у `who-am-i` используется generic fallback, новое поле state не требует отдельного отображения.
