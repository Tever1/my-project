# REPORT TASK-050: Сохранять выбранную игру при создании комнаты

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 12:46
> - **Финиш:** 2026-05-10 12:51
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Выбранная игра теперь передаётся в URL при создании комнаты через `game=<activeGame>`.
При маунте lobby читает `game` из query string и восстанавливает `activeGame`, если id есть в реестре игр.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен mount-only `useEffect` для восстановления `activeGame` из `searchParams.get("game")`; `createRoom` теперь делает `router.push(/lobby/CODE?m=1&game=${activeGame})`; `activeGame` добавлен в deps callback.

### Новые файлы

- `codex-reports/050-preserve-active-game-on-room-create.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 .codex/STATUS.md               |   8 +--
 CLAUDE.md                      |  16 +++++-
 src/app/profile/page.tsx       |  34 +++++++++---
 src/components/lobby/Lobby.tsx | 116 +++++++++++++++++++++++++++++++----------
 src/server/socket-handlers.mts |  17 ++++--
 5 files changed, 148 insertions(+), 43 deletions(-)
```

Примечание: часть изменений в working tree уже существовала до TASK-050. В рамках TASK-050 я редактировал только `src/components/lobby/Lobby.tsx` и этот отчёт.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ❌ | Sandbox: `error: cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| Acceptance #1: URL содержит `?m=1&game=<activeGame>` | ✅ | `createRoom` пушит `/lobby/${res.code}?m=1&game=${activeGame}` |
| Acceptance #2: активная игра восстанавливается из URL | ✅ | mount-only effect валидирует `game` через `games.some(...)` и вызывает `setActiveGame` |

---

## Отклонения от ТЗ

Нет отклонений по коду. Обязательный `git pull` не удалось выполнить из-за sandbox-ограничения на `.git/FETCH_HEAD`.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Посмотреть порядок эффектов рядом с логикой `?m=1`: восстановление `activeGame` идёт mount-only и не меняет существующее авто-открытие меню.
- В `createRoom` проверить, что замыкание теперь берёт актуальный `activeGame`, а deps array обновлён.
