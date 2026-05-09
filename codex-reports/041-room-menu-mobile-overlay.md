# REPORT TASK-041: Room menu mobile overlay

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-09 00:18 PDT
> - **Финиш:** 2026-05-09 00:21 PDT
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На mobile добавлен отдельный `RoomMenu` bottom sheet overlay с dim-backdrop. Desktop-рендер `RoomMenu` не изменялся.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — после hero section добавлен mobile overlay: backdrop закрывает меню по клику, panel выезжает снизу и переиспользует текущий `RoomMenu` со всеми action props.

### Новые файлы

- `codex-reports/041-room-menu-mobile-overlay.md` — отчёт по TASK-041.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 57 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 57 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: mobile bottom sheet | ✅ | `RoomMenu` рендерится при `isMobile && roomMenuOpen && roomCode` |
| Acceptance: backdrop close | ✅ | backdrop `onClick` закрывает popup |
| Acceptance: desktop untouched | ✅ | существующий `{!isMobile && ...}` блок не изменён |

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

- Проверить mobile viewport: sheet должен помещаться в `88dvh`, а QR/players/actions должны скроллиться внутри панели.
