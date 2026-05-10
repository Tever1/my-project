# REPORT TASK-051: Кнопка назад — фон + выравнивание кнопки ✕

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 13:01
> - **Финиш:** 2026-05-10 13:08
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Внесены две точечные UI-правки по ТЗ: кнопка назад на странице профиля получила полупрозрачный фон, а крестик в RoomMenu выровнен по центру с кнопкой «Выйти». `npx tsc --noEmit` и `npm run lint` прошли без ошибок.

---

## Что сделано

### Изменённые файлы

- `src/app/profile/page.tsx` — заменён Tailwind-класс кнопки «←» на inline style с полупрозрачным фоном, border, padding и hover handlers.
- `src/components/lobby/Lobby.tsx` — в верхней строке RoomMenu `alignItems` изменён с `"flex-start"` на `"center"`.

### Новые файлы

- `codex-reports/051-back-button-bg-close-align.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/profile/page.tsx       | 24 +++++++++++++++++++++++-
src/components/lobby/Lobby.tsx |  2 +-
2 files changed, 24 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| `npm run build` | ⚠️ | Turbopack упал из-за sandbox: `creating new process`, `binding to a port`, `Operation not permitted` |
| Acceptance #1 | ✅ | `npx tsc --noEmit` без ошибок |
| Acceptance #2 | ✅ | `npm run lint` без ошибок |
| Acceptance #3 | ✅ | кнопка «←» получила полупрозрачный фон |
| Acceptance #4 | ✅ | `alignItems: "center"` для строки RoomMenu |

---

## Отклонения от ТЗ

Нет отклонений по коду. `git pull` не выполнился из-за sandbox-ограничения: Git не смог открыть `.git/FETCH_HEAD` (`Operation not permitted`).

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Ничего.

---

## Подсказки для ревью

- Проверить только две механические правки: стиль кнопки в `src/app/profile/page.tsx` и `alignItems` в `src/components/lobby/Lobby.tsx`.
