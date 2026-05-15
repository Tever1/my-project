# REPORT TASK-089: AuthDropdown useAuthActions

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 21:34
> - **Финиш:** 2026-05-14 21:39
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-089 выполнен по ТЗ: `AuthDropdown` в `Lobby.tsx` теперь берёт auth-actions через `useAuthActions()`, а основной `Lobby` продолжает использовать `useAuth()`. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `useAuthActions` в импорт из `@/lib/auth-context`.
- `src/components/lobby/Lobby.tsx` — внутри `AuthDropdown` заменён `useAuth()` на `useAuthActions()`.

### Новые файлы

- `codex-reports/089-authdropdown-use-auth-actions.md` — отчёт по TASK-089.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npm run build` | ✅ | первый запуск упал из-за sandbox `binding to a port`; escalated-запуск прошёл с exit 0. В output остаётся существующий `ReferenceError: location is not defined`, сборку не валит |
| Acceptance #1 | ✅ | `useAuthActions` добавлен в import |
| Acceptance #2 | ✅ | `AuthDropdown` вызывает `useAuthActions()` |
| Acceptance #3 | ✅ | основной `Lobby` по-прежнему использует `useAuth()` |

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

- Проверить `src/components/lobby/Lobby.tsx`:22 — импорт.
- Проверить `src/components/lobby/Lobby.tsx`:180 и `src/components/lobby/Lobby.tsx`:1219 — основной `Lobby` не изменён, `AuthDropdown` перешёл на actions-only hook.
