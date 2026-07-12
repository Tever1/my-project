# REPORT TASK-337: Шпион — 4 live-QA фикса

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-12 00:21
> - **Финиш:** 2026-07-12 00:40
> - **Длительность:** 19 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Все 4 live-QA фикса для Spy выполнены в двух whitelist-файлах. Слово теперь скрывается после «Понятно, спрятать», в draw mode добавлен undo последнего мазка с синхронизацией через существующие `spy:clear`/`spy:stroke`, TV больше не раскрывает voters во время живого голосования.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — заменена подпись хода, добавлен hidden-placeholder после готовности в dealing, добавлена история мазков и кнопка «Отменить» в `DrawCanvas`, подключён `handleUndo`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — заменена TV-подпись хода, в `phase === 'voting'` убраны аватарки проголосовавших и переменная `voters`.

### Новые файлы

- `codex-reports/337-spy-live-qa-fixes.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/spy/page.tsx      | 170 ++++++++++++++++++++++----------
 src/app/tv/[roomId]/[gameType]/page.tsx |  12 +--
 2 files changed, 118 insertions(+), 64 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npm run build` | ❌ | Turbopack sandbox panic: `creating new process`, `binding to a port`, `Operation not permitted` |
| `npx next build --webpack` | ✅ | Сборка завершилась с code 0; во время prerender `/profile` был существующий лог `ReferenceError: location is not defined` |
| Acceptance #1 | ✅ | `grep` не нашёл `Сейчас отвечает` / `Now speaking` в spy mobile + TV |
| Acceptance #2 | ✅ | `myReadyInDealing` теперь показывает placeholder «Слово спрятано» |
| Acceptance #3 | ✅ | Draw mode получил кнопку «Отменить» и синхронизацию оставшихся strokes |
| Acceptance #4 | ✅ | TV voting показывает только bar/counter/leader, без voters |
| Acceptance #5 | ✅ | Production diff только в двух whitelist-файлах |

---

## Отклонения от ТЗ

Нет отклонений по функционалу. Для undo дополнительно добавлен `suppressNextClearRef`, потому что `game:action` эхоится отправителю; без этого собственный `spy:clear` мог сбросить локальную историю undo у рисующего.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Посмотреть `DrawCanvas`: история undo локальная, сбрасывается при полной очистке и внешнем `spy:clear`, но сохраняется после собственного undo.
- В `phase === 'voting'` на TV намеренно оставлены только `votesFor`, progress bar и «лидер».
