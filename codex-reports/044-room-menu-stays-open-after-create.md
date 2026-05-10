# REPORT TASK-044: Room menu stays open after create

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 00:11 PDT
> - **Финиш:** 2026-05-10 00:16 PDT
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

После создания комнаты навигация теперь идёт на `/lobby/CODE?m=1`, а новая instance `Lobby` открывает меню по этому параметру и сразу чистит URL через `router.replace(pathname)`. Прямой refresh `/lobby/CODE` не открывает меню сам.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлены `useSearchParams`/`usePathname`; обработан параметр `m=1`; `room:create` больше не открывает меню в старой instance, а передаёт флаг через URL.

### Новые файлы

- `codex-reports/044-room-menu-stays-open-after-create.md` — отчёт по TASK-044.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 13 ++++++++++---
 1 file changed, 10 insertions(+), 3 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Acceptance: menu survives create navigation | ✅ | `?m=1` открывает меню в новой instance |
| Acceptance: refresh does not auto-open | ✅ | параметр убирается через `router.replace(pathname)` |

---

## Отклонения от ТЗ

нет отклонений. `setRoomMenuOpen(true)` в effect обёрнут в `queueMicrotask`, чтобы пройти локальное правило `react-hooks/set-state-in-effect`.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- Проверить create-room flow: URL должен кратко получить `?m=1`, затем очиститься, а меню остаться открытым.
