# REPORT TASK-003: TopBar nowrap

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 00:13
> - **Финиш:** 2026-05-03 00:16
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавил `whiteSpace: "nowrap"` в `FriendsOnlinePill` и `RoomButton` на `/lobby-preview`.
Изменение строго ограничено whitelisted production-файлом; build не запускался по ТЗ.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — добавлен `whiteSpace: "nowrap"` в style корневого `div` компонента `FriendsOnlinePill` и в style `motion.button` компонента `RoomButton`.

### Новые файлы

- `codex-reports/003-topbar-nowrap.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Целевой diff по whitelist:

```
 src/app/lobby-preview/page.tsx | 2 ++
 1 file changed, 2 insertions(+)
```

Общий `git diff --stat` также показывает существующее до моей правки изменение `.codex/STATUS.md`, которое я не редактировал:

```
 .codex/STATUS.md               | 7 ++++++-
 src/app/lobby-preview/page.tsx | 2 ++
 2 files changed, 8 insertions(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ❌ | Sandbox не разрешил запись в `.git/FETCH_HEAD`: `Operation not permitted`. |
| `npm run lint` | ⚠️ | Завершился с exit code 1: 73 existing problems (40 errors, 33 warnings), как указано в ТЗ. |
| `npm run build` | ⏭️ | Не запускался по ограничению задачи. |
| Acceptance #1 | ✅ | `FriendsOnlinePill` содержит `whiteSpace: "nowrap"`. |
| Acceptance #2 | ✅ | `RoomButton` содержит `whiteSpace: "nowrap"`. |
| Acceptance #3 | ⚠️ | `git diff --stat -- src/app/lobby-preview/page.tsx` показывает только whitelisted файл; общий `git diff --stat` включает pre-existing `.codex/STATUS.md`. |
| Acceptance #4 | ✅ | `git diff -- src/app/lobby-preview/page.tsx` показывает ровно 2 добавленные строки. |

---

## Отклонения от ТЗ

`git pull --ff-only` не выполнился из-за sandbox-ограничения на `.git/FETCH_HEAD`.
Общий `git diff --stat` включает pre-existing изменение `.codex/STATUS.md`, но я его не трогал.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/lobby-preview/page.tsx`: в diff должны быть только две строки `whiteSpace: "nowrap"` в `FriendsOnlinePill` и `RoomButton`.
