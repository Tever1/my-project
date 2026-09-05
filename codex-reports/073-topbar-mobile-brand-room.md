# REPORT TASK-073: TopBar mobile brand room

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 20:13 PDT
> - **Финиш:** 2026-05-13 20:15 PDT
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На мобильном TopBar теперь показывает только квадратный `P` без текста `Party Hub`. `RoomButton` на mobile получил меньший padding и `maxWidth: 200`, чтобы QR-иконка не обрезалась.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — `BrandMark` получил prop `isMobile` и скрывает текст бренда на mobile; `RoomButton` получил mobile padding `7px 12px` и mobile `maxWidth: 200`.

### Новые файлы

- `codex-reports/073-topbar-mobile-brand-room.md` — отчёт по TASK-073.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 30 ++++++++++++++++--------------
 1 file changed, 16 insertions(+), 14 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| Mobile brand text hidden | ✅ | `BrandMark isMobile={isMobile}`, текст рендерится только при `!isMobile` |
| Desktop brand text visible | ✅ | default `isMobile = false`, desktop без изменения |
| RoomButton QR not clipped | ✅ | mobile padding `7px 12px`, `maxWidth: 200` |

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

- Проверить mobile TopBar с активной комнатой: слева только `P`, справа room code + QR icon + avatar должны помещаться в viewport.
