# REPORT TASK-061: Fix stale room on browser back

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 15:22
> - **Финиш:** 2026-05-10 15:32
> - **Длительность:** 10 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Auto-join эффект в `Lobby.tsx` теперь обрабатывает ответ `room:join`. Если сервер возвращает `success:false`, локальное состояние комнаты очищается и пользователь уводится на `/`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — callback `room:join` проверяет `success`; при неуспехе вызывает `setRoomCode(null)`, `setRoomState(null)` и `router.push('/')`. В dependency array этого же эффекта добавлен `router`, чтобы `react-hooks/exhaustive-deps` был чистым.

### Новые файлы

- `codex-reports/061-fix-stale-room-on-mount.md` — отчёт по TASK-061.

### Удалённые файлы

- (нет)

---

## Diff stat

```
git diff --stat:
 CLAUDE.md | 28 ++++++++++++++++++++++++++++
 1 file changed, 28 insertions(+)

Примечание: `CLAUDE.md` был изменён до моей работы и не относится к TASK-061.
`src/components/lobby/Lobby.tsx` в текущем HEAD уже содержит итоговый код, поэтому tracked diff по нему пустой.
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок и warnings после добавления `router` в deps |
| `npm run build` | ⚠️ | Turbopack internal error из-за sandbox: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `geist` CSS |
| Acceptance #1 | ✅ | `npx tsc --noEmit` прошёл |
| Acceptance #2 | ✅ | `npm run lint` прошёл |
| Acceptance #3 | ⚠️ | ручной браузерный сценарий не прогонялся; логика редиректа добавлена по ТЗ |
| Acceptance #4 | ✅ | успешный `room:join` не меняет поведение callback'а |

---

## Отклонения от ТЗ

- В dependency array эффекта добавлен `router`. Это минимальное отклонение от предоставленного сниппета, нужное для чистого `npm run lint`.
- `git pull` не выполнился: sandbox запретил запись/доступ к `.git/FETCH_HEAD` (`Operation not permitted`).

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Полный `npm run build` не удалось подтвердить из-за ограничения окружения, не из-за ошибки TypeScript/lint.
- Ручной browser-back QA сценарий не прогонялся.

---

## Подсказки для ревью

- Проверить `src/components/lobby/Lobby.tsx` около auto-join эффекта: важная часть — ветка `!response.success`, которая чистит state и делает `router.push('/')`.
