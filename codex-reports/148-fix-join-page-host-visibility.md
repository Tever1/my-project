# REPORT TASK-148: fix join page host visibility

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-25 21:21
> - **Финиш:** 2026-05-25 21:22
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На странице `/join/[code]` хост больше не скрывается из списка игроков. `visiblePlayers` теперь берёт всех игроков из `roomState`.

---

## Что сделано

### Изменённые файлы

- `src/app/join/[code]/page.tsx` — удалён фильтр `player.role !== "tv"` из `visiblePlayers`.

### Новые файлы

- `codex-reports/148-fix-join-page-host-visibility.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx |  67 ++++
 src/app/join/[code]/page.tsx        |   2 +-
 src/components/lobby/Lobby.tsx      | 635 +++++++++++++++++++++++++++++++-----
 3 files changed, 622 insertions(+), 82 deletions(-)
```

Примечание: общий stat включает незакоммиченные изменения предыдущих задач. В рамках TASK-148 редактировался только `src/app/join/[code]/page.tsx`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| Acceptance #1 | ✅ | Host с `role: "tv"` больше не отфильтровывается |
| Acceptance #2 | ✅ | Логика бейджа «ведущий» продолжает использовать `visiblePlayers` |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверить единственную строку `visiblePlayers`: теперь это `roomState?.players ?? []`.
