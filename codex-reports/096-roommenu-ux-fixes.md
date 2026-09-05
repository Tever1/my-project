# REPORT TASK-096: RoomMenu UX fixes

> **Метаданные**
> - **Старт:** 2026-05-17 20:50 PDT
> - **Финиш:** 2026-05-17 21:07 PDT
> - **Длительность:** 17 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделаны три UX-правки RoomMenu в `src/components/lobby/Lobby.tsx`: новый двухстрочный заголовок, закрытие только через кнопку ✕, меню действий игрока как floating glass-overlay поверх списка игроков.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx`
  - lines 312-315: удалён отдельный `useEffect`, который закрывал RoomMenu по Escape и клику вне панели.
  - lines 673-684: с mobile backdrop убран `onClick`, затемнение оставлено.
  - lines 2047-2215: заголовок RoomMenu перестроен в две строки: полный заголовок комнаты сверху, счётчик игроков и кнопки снизу.
  - lines 2217-2349: контейнер игроков получил `position: "relative"`, action menu вынесен из `map()` в один absolute overlay.

### Новые файлы

- `codex-reports/096-roommenu-ux-fixes.md` — отчёт по TASK-096.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
src/components/lobby/Lobby.tsx | 489 +++++++++++++++++++++--------------------
1 file changed, 247 insertions(+), 242 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ✅ | Already up to date |
| `npm run lint` | ✅ | eslint без ошибок |
| `npm run build` | ❌ | Turbopack упал из-за sandbox: `creating new process`, `binding to a port`, `Operation not permitted` |
| `npm run build -- --webpack` | ✅ | Build успешен; во время prerender `/profile` выводится существующий `ReferenceError: location is not defined`, exit code 0 |

---

## Acceptance

| Критерий | Статус | Где |
|---|---|---|
| Заголовок «Комната · КОД» занимает полную ширину в одну строку | ✅ | `Lobby.tsx:2054` |
| «В комнате · N» и кнопки на одном уровне под заголовком | ✅ | `Lobby.tsx:2072` |
| Клик по затемнению и вне панели не закрывают RoomMenu | ✅ | `Lobby.tsx:312`, `Lobby.tsx:673` |
| Escape не закрывает RoomMenu | ✅ | `Lobby.tsx:312` |
| Меню кика/передачи хоста glass-overlay, не растягивает список | ✅ | `Lobby.tsx:2217`, `Lobby.tsx:2283` |

---

## Отклонения от ТЗ

В ТЗ одновременно указано «Не трогать `codex-reports/**`» и «Создай `codex-reports/096-roommenu-ux-fixes.md`». Отчёт создан, потому что это явное требование раздела «Отчёт» и стандартный workflow проекта.

---

## Открытые вопросы для Claude

- В рабочей копии до старта уже были untracked `codex-tasks/095-roommenu-title-nowrap.md`, `codex-tasks/096-roommenu-ux-fixes.md`, `codex-reports/095-roommenu-title-nowrap.md` и изменение `RoomButton` в `Lobby.tsx`; я их не откатывал.

---

## Подсказки для ревью

- Проверить mobile confirm-row визуально на очень узком экране: структура соответствует ТЗ, но ряд `Выйти? / Да / Отмена / ✕` плотный.
