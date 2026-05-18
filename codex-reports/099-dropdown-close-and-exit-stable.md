# REPORT TASK-099: Dropdown close and stable exit header

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-17 21:27
> - **Финиш:** 2026-05-17 21:30
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `Lobby.tsx` dropdown игрока теперь закрывается по клику в любое место, кроме самой кнопки-чипа игрока. Правая группа кнопок в header RoomMenu получила стабильную минимальную ширину при переключении `confirmLeave`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — убран early return по `panelRef.current.contains(target)` из `pointerdown` handler; добавлен `data-player-chip=""` на кнопку игрока; добавлен `minWidth: 172` в правый header-контейнер.

### Новые файлы

- `codex-reports/099-dropdown-close-and-exit-stable.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 337 ++++++++++++++++++++---------------------
1 file changed, 167 insertions(+), 170 deletions(-)
```

Примечание: stat включает уже существовавшие незакоммиченные изменения в `Lobby.tsx`; мои изменения точечно касаются только TASK-099.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack internal error: `Operation not permitted (os error 1)` при `creating new process` / `binding to a port` в обработке `geist` CSS |
| Acceptance #1 | ✅ | Handler закрывает dropdown по любому pointerdown вне `[data-player-chip]` |
| Acceptance #2 | ✅ | Клик по открытому чипу не закрывается window-handler'ом и остаётся на toggle кнопки |
| Acceptance #3 | ✅ | Header action group получил `minWidth: 172` |

---

## Отклонения от ТЗ

Нет отклонений по production-файлу. Отчёт создан в `codex-reports/` по явному требованию задачи, несмотря на противоречивую строку в разделе "Запрещено".

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь только точечные изменения TASK-099 внутри `RoomMenu`: `pointerdown` handler, `minWidth: 172`, `data-player-chip`.
