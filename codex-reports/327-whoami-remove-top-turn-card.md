# REPORT TASK-327: «Кто я?» — убрать верхнюю карточку «Сейчас ходит» на мобильном

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-02 22:33
> - **Финиш:** 2026-07-02 22:37
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `renderPlaying` удалена верхняя карточка текущего хода с текстом «Сейчас ходит» / «Ваш ход!». Подсказка активному игроку про вопрос вслух сохранена без `GlassCard` и показывается перед списком персонажей по прежнему условию `isMyTurn && !haveIGuessed`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/who-am-i/page.tsx` — удалён `GlassCard` блока Current turn indicator; подсказка вынесена в отдельный `<p className="text-white/50 text-sm text-center">` перед `renderPlayerCharacters()`.

### Новые файлы

- `codex-reports/327-whoami-remove-top-turn-card.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/who-am-i/page.tsx | 87 +++++++++++++++++++++------------
1 file changed, 56 insertions(+), 31 deletions(-)
```

Примечание: diff stat включает уже существующие незакоммиченные изменения в этом файле от предыдущей задачи. Изменение TASK-327 ограничено блоком `renderPlaying`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npm run build` | ⚠️ | Turbopack internal error в sandbox: `creating new process`, `binding to a port`, `Operation not permitted (os error 1)` |
| Acceptance #1 | ✅ | Верхний `GlassCard` current turn indicator удалён |
| Acceptance #2 | ✅ | Подсказка сохранена перед списком персонажей |
| Acceptance #3 | ✅ | `renderPlayerCharacters()` и блоки управления не менялись в рамках TASK-327 |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Дополнительно запускался `npm run build` по общему workflow; он упал из-за ограничения окружения, не из-за ошибки TypeScript или lint.

---

## Открытые вопросы для Claude

В `.codex/STATUS.md` на момент старта всё ещё указан active TASK-323 на тот же файл. Работу продолжил, потому что TASK-327 был явно передан пользователем в текущем запросе.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверить участок `src/app/game/[roomId]/who-am-i/page.tsx` в `renderPlaying`: после изменения первым элементом перед списком персонажей является только условный `<p>` с подсказкой.
