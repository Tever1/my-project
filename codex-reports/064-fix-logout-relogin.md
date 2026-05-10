# REPORT TASK-064: Fix logout relogin

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 16:09 PDT
> - **Финиш:** 2026-05-10 16:10 PDT
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделаны два точечных изменения: logout из лобби теперь закрывает `AccountDropdown`, а общий `logout()` очищает SMS-ключи из `localStorage`. Это убирает конфликт дропдаунов и старый SMS-state при повторном входе без refresh.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в `handleLogout` добавлен `setAccountMenuOpen(false)` перед `logout()`.
- `src/lib/auth-context.tsx` — в `logout()` добавлена очистка `party-hub-sms-code` и `party-hub-sms-phone`.

### Новые файлы

- `codex-reports/064-fix-logout-relogin.md` — отчёт по TASK-064.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 1 +
 src/lib/auth-context.tsx       | 2 ++
 2 files changed, 3 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| AccountDropdown закрывается при logout | ✅ | `setAccountMenuOpen(false)` в `handleLogout` |
| SMS-state очищается при logout | ✅ | удаляются `party-hub-sms-code` и `party-hub-sms-phone` |

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

- Проверить logout flow: после выхода account menu должен закрыться до открытия auth dropdown.
- Проверить повторную авторизацию: старый SMS-код и телефон больше не остаются в `localStorage`.
