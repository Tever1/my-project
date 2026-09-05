# REPORT TASK-222: Шпион — двуязычность + убрать двойной confirm

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-07 22:45
> - **Финиш:** 2026-06-07 22:48
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Экран Spy переведён через локальный `l(ru, en)` helper и `useTranslation`, без изменения identity/server/game logic. Нативный `confirm()` из `endGame` удалён, теперь подтверждение остаётся за `GameLayout`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — добавлен `useTranslation`, переведены видимые строки основного экрана Spy, `title` стал локализованным, `endGame` теперь сразу отправляет `game:end` и навигирует.

### Новые файлы

- `codex-reports/222-spy-i18n-and-confirm.md` — отчёт по TASK-222.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/spy/page.tsx | 78 ++++++++++++++++++++------------------
1 file changed, 41 insertions(+), 37 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npm run build` | ❌ | Штатный Turbopack build упал из-за sandbox: `creating new process`, `binding to a port`, `Operation not permitted`. |
| `npx next build --webpack` | ✅ | Exit code 0. В выводе есть существующий `ReferenceError: location is not defined` при prerender `/profile`, но сборка завершилась route summary. |
| `grep -nE "confirm\\(" src/app/game/[roomId]/spy/page.tsx` | ✅ | Совпадений нет. |
| `grep -nE "[А-Яа-яЁё]" src/app/game/[roomId]/spy/page.tsx` | ✅ | Кириллица осталась только в первых аргументах `l(...)` и в `DrawCanvas` строке `Очистить`, которую ТЗ явно выводит вне scope. |

---

## Отклонения от ТЗ

Нет отклонений по whitelist и основной логике. `DrawCanvas` не трогал по прямому ограничению ТЗ; поэтому его строка `Очистить` осталась как есть.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/spy/page.tsx`: локализация добавлена только в основной компонент, `DrawCanvas` оставлен без изменений по scope.
- В рабочем дереве до моей работы уже были изменения в `codex-tasks/_DONE.md` и untracked `codex-tasks/222-spy-i18n-and-confirm.md`; я их не трогал.
