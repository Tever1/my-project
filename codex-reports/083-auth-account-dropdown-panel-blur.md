# REPORT TASK-083: Auth/Account dropdown panel blur

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 20:30
> - **Финиш:** 2026-05-14 20:35
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-083 выполнен по ТЗ: на мобильном у панелей `AuthDropdown` и `AccountDropdown` убран `backdropFilter`/`WebkitBackdropFilter`, вместо frosted-glass поставлен solid background `rgba(20, 18, 32, 0.96)`. Десктопные значения оставлены прежними. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в `AuthDropdown` mobile panel теперь без blur и с solid background; desktop frosted-glass сохранён.
- `src/components/lobby/Lobby.tsx` — в `AccountDropdown` mobile panel теперь без blur и с solid background; desktop frosted-glass сохранён.

### Новые файлы

- `codex-reports/083-auth-account-dropdown-panel-blur.md` — отчёт по TASK-083.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 12 ++++++------
 1 file changed, 6 insertions(+), 6 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npm run build` | ✅ | первый запуск упал из-за sandbox `binding to a port`; escalated-запуск прошёл с exit 0. В build output остаётся существующий `ReferenceError: location is not defined`, сборку не валит |
| Acceptance #1 | ✅ | `AuthDropdown` mobile: `background: rgba(20, 18, 32, 0.96)`, blur undefined |
| Acceptance #2 | ✅ | `AccountDropdown` mobile: `background: rgba(20, 18, 32, 0.96)`, blur undefined |
| Acceptance #3 | ✅ | desktop значения остались `rgba(255,255,255,...)` + `blur(24px)` |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Проверить `src/components/lobby/Lobby.tsx`:1313 — `AuthDropdown` panelStyle.
- Проверить `src/components/lobby/Lobby.tsx`:1513 — `AccountDropdown` panelStyle.
