# REPORT TASK-056: Auth phone validation + Назад dark bg

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 13:44
> - **Финиш:** 2026-05-10 13:47
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `AuthDropdown` исправлена валидация телефона на 11 цифр и обновлены secondary-стили кнопки «Назад» на тёмный мат с белым текстом. Production diff в `Lobby.tsx` содержит только целевые изменения из ТЗ.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — `handleSendCode` теперь требует 11 цифр; secondary-кнопка получила `rgba(0,0,0,0.32)`, более тонкий border и белый текст.

### Новые файлы

- `codex-reports/056-auth-phone-validation-back-dark.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 8 ++++----
1 file changed, 4 insertions(+), 4 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run lint` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack sandbox error: `creating new process`, `binding to a port`, `Operation not permitted` |
| Acceptance #1 | ✅ | `npx tsc --noEmit` прошёл |
| Acceptance #2 | ✅ | `npm run lint` прошёл |
| Acceptance #3 | ✅ | В `Lobby.tsx` diff только строка `< 10` → `< 11` и три строки `btnStyle` |

---

## Отклонения от ТЗ

`git pull` не выполнился из-за sandbox-ограничения: `cannot open '.git/FETCH_HEAD': Operation not permitted`. Работа выполнена по локальному состоянию.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

нет

---

## Подсказки для ревью

- Проверь только `src/components/lobby/Lobby.tsx:1242` и `src/components/lobby/Lobby.tsx:1326` — это два целевых места из ТЗ.
