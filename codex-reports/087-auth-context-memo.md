# REPORT TASK-087: Auth context memo

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 21:22
> - **Финиш:** 2026-05-14 21:29
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-087 выполнен по ТЗ: `AuthContext.Provider` теперь получает memoized `value`, добавлены selector-хуки `useAuthUser()` и `useAuthActions()`. Поведение существующего `useAuth()` не изменялось. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/lib/auth-context.tsx` — добавлен импорт `useMemo`, provider value обёрнут в `useMemo` с требуемым dep array.
- `src/lib/auth-context.tsx` — экспортированы `useAuthUser()` и `useAuthActions()` поверх существующего `AuthContext`.

### Новые файлы

- `codex-reports/087-auth-context-memo.md` — отчёт по TASK-087.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/lib/auth-context.tsx | 19 +++++++++++++++++--
 1 file changed, 17 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npm run build` | ✅ | первый запуск упал из-за sandbox `binding to a port`; escalated-запуск прошёл с exit 0. В output остаётся существующий `ReferenceError: location is not defined`, сборку не валит |
| Acceptance #1 | ✅ | `value` обёрнут в `useMemo` с `[user, isLoading, sendCode, verifyCode, updateNickname, logout]` |
| Acceptance #2 | ✅ | экспортированы `useAuthUser()` и `useAuthActions()` |
| Acceptance #3 | ✅ | `useAuth()` оставлен без изменения поведения |

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

- Проверить `src/lib/auth-context.tsx`:46 — новые selector-хуки.
- Проверить `src/lib/auth-context.tsx`:132 — memoized provider value и dep array.
