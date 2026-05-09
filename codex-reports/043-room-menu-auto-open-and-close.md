# REPORT TASK-043: Room menu auto-open and close

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-09 00:33 PDT
> - **Финиш:** 2026-05-09 00:38 PDT
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

После успешного `room:create` меню комнаты теперь открывается автоматически. В `RoomMenu` добавлен компактный крестик закрытия справа от кнопки «Выйти», работает и в desktop, и в mobile рендере.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `setRoomMenuOpen(true)` после создания комнаты; в оба рендера `RoomMenu` проброшен `onClose`; в заголовок `RoomMenu` добавлена кнопка-крестик.

### Новые файлы

- `codex-reports/043-room-menu-auto-open-and-close.md` — отчёт по TASK-043.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 66 +++++++++++++++++++++++++++++++++++++++++-
 1 file changed, 65 insertions(+), 1 deletion(-)
```

Примечание: текущий unstaged diff файла также включает незакоммиченную правку TASK-042 в `RoomButton`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: auto-open after create | ✅ | `setRoomMenuOpen(true)` после `setRoomCode(res.code)` |
| Acceptance: close button | ✅ | 28×28 glass-крестик вызывает `onClose` |
| Acceptance: desktop/mobile | ✅ | `onClose` проброшен в оба `RoomMenu` |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- Проверить, что после создания комнаты popup открывается сам, а крестик закрывает только меню и не вызывает `room:leave`.
