# REPORT TASK-094: RoomMenu revert 093 stable size

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 22:55
> - **Финиш:** 2026-05-14 23:02
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-094 выполнен по ТЗ: структура заголовка `RoomMenu` сохранена в pre-093 виде, а зона `Выйти`/confirmRow обёрнута в фиксирующий контейнер с `minWidth: 172`. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлена action-обёртка вокруг `{!confirmLeave ? ... : ...}` с `flexShrink: 0`, `minWidth: 172`, `display: "flex"`, `justifyContent: "flex-end"`, `alignItems: "center"`.

### Новые файлы

- `codex-reports/094-roommenu-revert-093-stable-size.md` — отчёт по TASK-094.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 144 ++++++++++++++++++++++-------------------
 1 file changed, 77 insertions(+), 67 deletions(-)
```

> Diff большой из-за оборачивания существующего JSX блока; стили кнопок сохранены.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npm run build` | ✅ | первый запуск упал из-за sandbox `binding to a port`; escalated-запуск прошёл с exit 0. В output остаётся существующий `ReferenceError: location is not defined`, сборку не валит |
| Acceptance #1 | ✅ | `GlassPanel` style не содержит `position: "relative"` |
| Acceptance #2 | ✅ | header wrapper: `justifyContent: "space-between"`, без `paddingRight` |
| Acceptance #3 | ✅ | `×` в конце flex-потока, без absolute/zIndex |
| Acceptance #4 | ✅ | action-зона имеет `minWidth: 172` и `flexShrink: 0` |
| Acceptance #5 | ✅ | стили кнопок не менялись, только обёртка вокруг блока |

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

- Проверить `src/components/lobby/Lobby.tsx`:2109 — новая action-обёртка.
- Проверить `src/components/lobby/Lobby.tsx`:2199 — `×` остался в конце flex-потока.
