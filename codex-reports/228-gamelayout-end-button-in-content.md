# REPORT TASK-228: ЗАВЕРШИТЬ кнопка в контентной области GameLayout

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-09 21:51
> - **Финиш:** 2026-06-09 21:53
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлена тихая кнопка завершения игры в нижнюю часть content area `GameLayout`, сразу после `AnimatePresence`. Кнопка показывается только при наличии `onEnd` и открывает существующую confirm-модалку через `setEndConfirmOpen(true)`.

---

## Что сделано

### Изменённые файлы

- `src/components/games/GameLayout.tsx` — добавлен второй `<button>` "Завершить игру" / "End game" после `{children}` внутри main content area.

### Новые файлы

- `codex-reports/228-gamelayout-end-button-in-content.md` — отчёт по TASK-228.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/games/GameLayout.tsx | 11 +++++++++++
1 file changed, 11 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 ошибок |
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| Acceptance #1 | ✅ | Кнопка добавлена после `</AnimatePresence>` внутри content area |
| Acceptance #2 | ✅ | Реиспользуется `setEndConfirmOpen(true)` и существующая модалка |

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

- В рабочем дереве до старта уже были незакоммиченные изменения от TASK-226/227/229 и protected-файлов; я их не трогал.
- Проверить только вставку в `src/components/games/GameLayout.tsx` после `AnimatePresence`.
