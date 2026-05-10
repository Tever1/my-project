# REPORT TASK-052: Auth back button visible

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 13:13 PDT
> - **Финиш:** 2026-05-10 13:14 PDT
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Кнопка «Назад» в auth modal стала заметнее: secondary-состояние `btnStyle(false)` теперь имеет полупрозрачный фон, более видимую рамку и более контрастный текст. Изменение выполнено строго в `src/components/lobby/Lobby.tsx`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — обновлены три secondary-значения в `btnStyle`: `background`, `border`, `color`.

### Новые файлы

- `codex-reports/052-auth-back-button-visible.md` — отчёт по TASK-052.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 6 +++---
 1 file changed, 3 insertions(+), 3 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Кнопка «Назад» видна с фоном | ✅ | `background: rgba(255,255,255,0.12)` |
| Primary-кнопка не изменена | ✅ | ветка `primary ? ...` сохранена |

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

- Проверить только `btnStyle(false)` в `AuthDropdown`: изменены ровно три значения из ТЗ.
