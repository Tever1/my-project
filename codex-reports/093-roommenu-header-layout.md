# REPORT TASK-093: RoomMenu header layout

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 22:43
> - **Финиш:** 2026-05-14 22:51
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-093 выполнен по ТЗ: `RoomMenu` panel получил `position: "relative"`, кнопка закрытия вынесена в absolute top-right, а зона `Выйти`/confirm получила фиксированную ширину `164px`. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — изменена структура header в `RoomMenu`: `×` больше не участвует во flex-потоке, wrapper получил `paddingRight: 44`, action-зона обёрнута в фиксированный контейнер.

### Новые файлы

- `codex-reports/093-roommenu-header-layout.md` — отчёт по TASK-093.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 215 ++++++++++++++++++++++-------------------
 1 file changed, 115 insertions(+), 100 deletions(-)
```

> Stat большой из-за переноса существующего JSX блока `×` и кнопок внутрь новой структуры; стили кнопок сохранены, кроме необходимых layout-полей для absolute close button.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npm run build` | ✅ | первый запуск упал из-за sandbox `binding to a port`; escalated-запуск прошёл с exit 0. В output остаётся существующий `ReferenceError: location is not defined`, сборку не валит |
| Acceptance #1 | ✅ | `×` имеет `position: "absolute"`, `top: 12`, `right: 12` |
| Acceptance #2 | ✅ | title и action-зона разделены фиксированной шириной |
| Acceptance #3 | ✅ | action-зона фиксирована, confirm не меняет flex space |
| Acceptance #4 | ✅ | action-зона: `width: 164`, `flexShrink: 0` |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Проверить `src/components/lobby/Lobby.tsx`:2062 — `GlassPanel` теперь relative.
- Проверить `src/components/lobby/Lobby.tsx`:2082 — close button вынесен в absolute.
- Проверить `src/components/lobby/Lobby.tsx`:2146 — фиксированная action-зона.
