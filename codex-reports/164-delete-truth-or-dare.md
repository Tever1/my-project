# REPORT TASK-164: Удалить ghost-страницу truth-or-dare

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 21:10 PDT
> - **Финиш:** 2026-05-27 21:12 PDT
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Удалена ghost-страница `truth-or-dare` и пустая директория route'а. Acceptance-проверки пройдены: route отсутствует, `truth-or-dare` в `src/` больше не находится, lint и TypeScript check зелёные.

---

## Что сделано

### Изменённые файлы

- (нет)

### Новые файлы

- `codex-reports/164-delete-truth-or-dare.md` — отчёт по TASK-164.

### Удалённые файлы

- `src/app/game/[roomId]/truth-or-dare/page.tsx` — удалена мёртвая страница прототипа.
- `src/app/game/[roomId]/truth-or-dare/` — удалена, так как после удаления `page.tsx` директория была пустой.

---

## Diff stat

```text
 src/app/game/[roomId]/truth-or-dare/page.tsx | 721 ---------------------------
 1 file changed, 721 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date. |
| `ls src/app/game/\[roomId\]/truth-or-dare/ 2>/dev/null || echo "✅ deleted"` | ✅ | `✅ deleted` |
| `grep -rn "truth-or-dare" src/` | ✅ | Нет совпадений, команда завершилась с кодом 1 из-за отсутствия matches. |
| `npm run lint` | ✅ | Без ошибок. |
| `npx tsc --noEmit` | ✅ | Первый запуск упал на stale `.next/types/validator.ts`; после `npx next typegen` повторный запуск прошёл. |

---

## Отклонения от ТЗ

Нет отклонений в tracked-файлах. Для прохождения `npx tsc --noEmit` потребовалось обновить generated route types командой `npx next typegen`, потому что локальный `.next/types/validator.ts` ещё ссылался на удалённую страницу.

---

## Открытые вопросы для Claude

- В `.codex/STATUS.md` есть старая активная запись TASK-107, где `src/app/game/[roomId]/truth-or-dare/page.tsx` указан как locked-файл. TASK-164 был выполнен по прямому ТЗ пользователя; STATUS, вероятно, стоит синхронизировать.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить, что в diff есть только удаление `src/app/game/[roomId]/truth-or-dare/page.tsx` и новый отчёт `codex-reports/164-delete-truth-or-dare.md`.
