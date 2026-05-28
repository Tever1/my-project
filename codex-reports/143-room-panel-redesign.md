# REPORT TASK-143: room panel redesign

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-25 20:17
> - **Финиш:** 2026-05-25 20:19
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Кнопка комнаты с кодом теперь показывается в TopBar для обеих ролей и открывает RoomMenu. Десктопный RoomMenu больше не ограничен TV-ролью, а для хоста добавлена кнопка «+ Добавить игрока», которая закрывает панель и включает QR waiting screen.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлены props `roomCode`/`onOpenRoomMenu` в `TopBar`, общий десктопный рендер RoomMenu/TiltedPreview, callback `handleAddPlayer`, prop `onAddPlayer` и кнопка «+ Добавить игрока» в RoomMenu.

### Новые файлы

- `codex-reports/143-room-panel-redesign.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 230 ++++++++++++++++++++++++++++++++++++-----
 1 file changed, 207 insertions(+), 23 deletions(-)
```

Примечание: stat включает незакоммиченные изменения TASK-141 и TASK-142 в этом же файле.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ⚪ | Не запускался: в acceptance указан lint |
| Acceptance: кнопка комнаты для tv/player | ✅ | TopBar получает `roomCode` независимо от роли |
| Acceptance: клик открывает RoomMenu | ✅ | `onOpenRoomMenu={() => setRoomMenuOpen(true)}` |
| Acceptance: «+ Добавить игрока» только host | ✅ | Рендер под `isCurrentUserHost` |
| Acceptance: RoomMenu закрывается и включается waiting | ✅ | Кнопка вызывает `onAddPlayer()` и `onClose()` |
| Acceptance: TiltedPreview остаётся на десктопе | ✅ | Ветка fallback сохранена в общем desktop-блоке |

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

- Проверь общий desktop-блок RoomMenu/TiltedPreview: он намеренно больше не зависит от `myRole === "tv"`.
- Проверь `handleAddPlayer`: если `currentGame` ещё не задана, он сначала эмитит `game:select`, затем включает waiting screen.
