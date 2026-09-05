# REPORT TASK-042: Room button QR hint

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-09 00:25 PDT
> - **Финиш:** 2026-05-09 00:28 PDT
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `RoomButton` добавлена маленькая inline QR-иконка справа от текста `Комната · CODE`. Состояния без комнаты и создания комнаты оставлены прежними.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — содержимое `RoomButton` при `roomCode` заменено на flex-строку с текстом комнаты и SVG QR-иконкой 14×14.

### Новые файлы

- `codex-reports/042-room-button-qr-hint.md` — отчёт по TASK-042.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 29 ++++++++++++++++++++++++++++-
 1 file changed, 28 insertions(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: QR icon with room code | ✅ | SVG 14×14 рендерится справа от кода |
| Acceptance: no-room state unchanged | ✅ | ветка без `roomCode` не менялась |

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

- Проверить визуально на mobile и desktop, что QR-иконка не ломает nowrap в TopBar.
