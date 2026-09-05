# REPORT TASK-090: Logout no auto-rejoin

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 22:03
> - **Финиш:** 2026-05-14 22:08
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-090 выполнен по ТЗ: после `logout()` теперь вызывается `router.push('/')`, чтобы URL уходил с `/lobby/CODE` и повторный логин не запускал auto-rejoin. `router` добавлен в зависимости `handleLogout`. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в `handleLogout` добавлен `router.push('/')` после `logout()`, dep array расширен до `[emit, logout, roomCode, router]`.

### Новые файлы

- `codex-reports/090-logout-no-auto-rejoin.md` — отчёт по TASK-090.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 3 ++-
 1 file changed, 2 insertions(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npm run build` | ✅ | первый запуск упал из-за sandbox `binding to a port`; escalated-запуск прошёл с exit 0. В output остаётся существующий `ReferenceError: location is not defined`, сборку не валит |
| Acceptance #1 | ✅ | `handleLogout` вызывает `router.push('/')` после `logout()` |
| Acceptance #2 | ✅ | `router` добавлен в dep array |

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

- Проверить `src/components/lobby/Lobby.tsx`:474 — `handleLogout` теперь уводит на `/` после выхода из аккаунта.
