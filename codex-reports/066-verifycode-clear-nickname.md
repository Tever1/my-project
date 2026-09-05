# REPORT TASK-066: verifyCode clears nickname on login

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 16:25
> - **Финиш:** 2026-05-10 16:29
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

`verifyCode` проверен: при входе существующего пользователя данные берутся из `party-hub-user-${phone}`, но `nickname` сбрасывается в пустую строку. Это оставляет AuthDropdown открытым на шаге ввода имени до вызова `updateNickname`.

---

## Что сделано

### Изменённые файлы

- `src/lib/auth-context.tsx` — в ветке `existingData` результат `JSON.parse` приведён к `User`, затем создаётся `userData` с сохранёнными данными и `nickname: ''`.

### Новые файлы

- `codex-reports/066-verifycode-clear-nickname.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
(пусто)
```

Примечание: `git diff --stat` не показывает untracked-файлы. `git status --short` показывает только новый отчёт:

```
?? codex-reports/066-verifycode-clear-nickname.md
```

Рабочий diff по `src/lib/auth-context.tsx` отсутствует, потому что текущий `HEAD` уже содержит ожидаемую правку (`9b439aa fix(auth): clear nickname on verifyCode so nickname step always shows (TASK-066)`).

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| `npm run build` | ❌ | Turbopack/PostCSS sandbox error: `creating new process`, `binding to a port`, `Operation not permitted` |
| Acceptance: второй вход без refresh показывает шаг nickname | ⚠️ | не проверял в браузере; кодовый путь соответствует ТЗ |
| Acceptance: после ввода имени меню закрывается и AvatarPill показывает имя | ⚠️ | не проверял в браузере; `updateNickname` не менялся |

---

## Отклонения от ТЗ

- `git pull` не выполнился: sandbox вернул `error: cannot open '.git/FETCH_HEAD': Operation not permitted`.
- Браузерный сценарий вручную не прогонялся.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

нет

---

## Подсказки для ревью

- Проверь `src/lib/auth-context.tsx:85`: существующий пользователь теперь сохраняет все поля, но `nickname` принудительно становится `''` перед `saveUser(userData)`.
