# REPORT TASK-213: Кнопка «Добавить игрока» в меню пустой комнаты

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-04 21:04
> - **Финиш:** 2026-06-04 21:06
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `Lobby.tsx` добавлен `myRole === "tv"` в предикат `canAddPlayer`. Теперь TV/десктоп-создатель видит кнопку «+ Добавить игрока» в меню комнаты даже когда игроков и текущего хоста уже нет.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — `canAddPlayer` теперь разрешает кнопку для роли `tv`.

### Новые файлы

- `codex-reports/213-room-menu-add-player-empty-room.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Task-scoped change:

```diff
-  const canAddPlayer = isCurrentUserHost || isGameHostPhone;
+  const canAddPlayer = myRole === "tv" || isCurrentUserHost || isGameHostPhone;
```

Текущий `git diff --stat -- src/components/lobby/Lobby.tsx` включает ранее существовавшие несвязанные изменения в этом файле:

```text
 src/components/lobby/Lobby.tsx | 218 ++++++++++++++++-------------------------
 1 file changed, 86 insertions(+), 132 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run lint` | ✅ | без ошибок |
| Acceptance: TV видит кнопку в пустой комнате | ✅ | предикат теперь включает `myRole === "tv"` |

---

## Отклонения от ТЗ

Нет отклонений по production-коду: изменён только `canAddPlayer` в `src/components/lobby/Lobby.tsx`.

Примечание: до начала работы в worktree уже были изменения в `CLAUDE.md`, `.codex/STATUS.md`, `codex-tasks/**` и других файлах. Я их не редактировал и не откатывал.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить строку с `canAddPlayer`: изменение должно быть ровно добавлением `myRole === "tv"` в существующий predicate.
