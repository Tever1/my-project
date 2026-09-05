# REPORT TASK-147: room menu cleanup

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-25 20:58
> - **Финиш:** 2026-05-25 21:00
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В RoomMenu удалены QR-блок, кнопка «Пригласить игрока» и весь связанный код копирования ссылки. Фильтр списка игроков теперь оставляет всех с nickname, поэтому host с `role: "tv"` отображается в списке и получает существующий бейдж «хост».

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — очищен компонент `RoomMenu`: удалены QR/invite UI, `localIp`, `joinUrl`, `inviteUrl`, `inviteCopied`, clipboard handler и cleanup effect; фильтр `connectedPlayers` изменён на `(p) => p.nickname`.

### Новые файлы

- `codex-reports/147-room-menu-cleanup.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx |  67 ++++
 src/components/lobby/Lobby.tsx      | 635 +++++++++++++++++++++++++++++++-----
 2 files changed, 621 insertions(+), 81 deletions(-)
```

Примечание: общий stat включает незакоммиченные изменения предыдущих задач. В рамках TASK-147 редактировался только компонент `RoomMenu` в `src/components/lobby/Lobby.tsx`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ⚪ | Не запускался: в acceptance указан lint |
| Acceptance #1 | ✅ | В RoomMenu нет QR и кнопки «Пригласить игрока» |
| Acceptance #2 | ✅ | RoomMenu больше не исключает `role: "tv"` из списка |
| Acceptance #3 | ✅ | Кнопка «+ Добавить игрока» сохранена |

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

- `role !== "tv"` ещё встречается вне RoomMenu, в `PlayerJoinView`; по ТЗ этот участок не трогался.
