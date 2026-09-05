# REPORT TASK-078: Mobile panel timing

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 21:08 PDT
> - **Финиш:** 2026-05-13 21:10 PDT
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `src/components/lobby/Lobby.tsx` mobile room menu panel теперь анимирует только `y`, без `opacity`. Backdrop transition duration синхронизирован с панелью: `0.2 → 0.28`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в mobile overlay у `room-menu-mobile` удалён `opacity` из `initial` / `animate` / `exit`; у `room-menu-backdrop` duration изменён на `0.28`.

### Новые файлы

- `codex-reports/078-mobile-panel-timing.md` — отчёт по TASK-078.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 97 +++++++++++++++++++++++-------------------
 1 file changed, 53 insertions(+), 44 deletions(-)
```

Примечание: общий diff `Lobby.tsx` включает незакоммиченные TASK-073/074/075/076/077. Собственно TASK-078 изменил только mobile backdrop `transition` и mobile panel `initial` / `animate` / `exit`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| Panel y-only animation | ✅ | `initial={{ y: 40 }}`, `animate={{ y: 0 }}`, `exit={{ y: 40 }}` |
| Backdrop duration 0.28 | ✅ | `transition={{ duration: 0.28 }}` |
| Desktop paths untouched | ✅ | изменения только в mobile room menu overlay |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- Проверить mobile open/close: panel всегда opaque, backdrop и panel завершают exit одновременно.
