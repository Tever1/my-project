# REPORT TASK-329: «Кто я?» — счётчик «Да» и оспаривание ответа

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-09 21:20 PDT
> - **Финиш:** 2026-07-09 21:57 PDT
> - **Длительность:** 37 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправил путь «Да/Нет» через локальный guard от двойного touch/click-срабатывания на `GlassButton` (`motion.button` + `whileTap`): один пользовательский тап теперь может отправить только один `ask-question`. Добавил флоу оспаривания неверного автосравнения персонажа: игрок подтверждает спорный ответ, случайный другой игрок получает карточку судьи, а итог уходит через существующий `guess`.

Root cause по Части 1: статически в reducer/listener не было второго инкремента; дубль происходит до socket layer, на стороне UI-события кнопки на touch/эмулированных устройствах. Поэтому фикс стоит в отправке ответа, а не в сервере или reducer.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/who-am-i/page.tsx` — добавлены поля pending-оспаривания, actions `guess-try`/`guess-confirm`, UI подтверждения для угадывающего, UI судьи, финальный verdict через существующий `guess`; добавлен guard `QUESTION_ANSWER_GUARD_MS` для «Да/Нет».
- `src/app/tv/[roomId]/[gameType]/page.tsx` — синхронизированы типы/initial state/reducer Who Am I с новыми полями; добавлен нейтральный TV-баннер «Игрок оспаривает ответ...».

### Новые файлы

- `codex-reports/329-whoami-yes-counter-bug-and-dispute-guess.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
src/app/game/[roomId]/who-am-i/page.tsx | 297 +++++++++++++++++++++----
src/app/tv/[roomId]/[gameType]/page.tsx | 378 ++++++++++++++++++++++++++++++++
2 files changed, 632 insertions(+), 43 deletions(-)
```

Примечание: в рабочем дереве до TASK-329 уже были незакоммиченные изменения в `.codex/STATUS.md`, `codex-tasks/_DONE.md`, `docs/who-am-i-design-brief.md` и этих же Who Am I/TV файлах из TASK-323...328. Я их не откатывал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | чисто |
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run build` | ⚠️ | Turbopack internal error в sandbox: `creating new process` / `binding to a port` / `Operation not permitted` при `src/app/globals.css`; не похоже на TS/код TASK-329 |
| Acceptance #1 | ✅ | один `handleYesAnswer` теперь не может отправить второй `ask-question` в guard-window |
| Acceptance #2 | ✅ | mismatch не отправляет `guess:false` сразу, а создаёт dispute-flow |
| Acceptance #3 | ✅ | судья подтверждает/отклоняет, итог применяется через существующий action `guess` |

---

## Отклонения от ТЗ

Нет отклонений по whitelist production-файлов. Дополнительно запущен `npm run build` по workflow; он упал из-за sandbox/Turbopack, а не из-за lint/tsc ошибок.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не проводил live-QA на физических/эмулированных телефонах в этом окружении. Проверки кода: `lint` и `tsc` чистые.

---

## Подсказки для ревью

- Проверь `handleQuestionAsked` / `handleYesAnswer`: guard специально стоит до `broadcast`, чтобы блокировать именно двойной UI-event, а не вторую доставку socket-события.
- Проверь dispute-state cleanup в `next-turn`, `guess`, `end-game`, `start-game`: pending-оспаривание не должно переживать смену хода или завершение.
