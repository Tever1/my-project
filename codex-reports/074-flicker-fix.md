# REPORT TASK-074: Flicker fix

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 20:22 PDT
> - **Финиш:** 2026-05-13 20:25 PDT
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `src/components/lobby/Lobby.tsx` добавлены compositing hints против мерцания: `translateZ(0)` на animated background, отдельные `AnimatePresence` для mobile backdrop/panel, `willChange` для backdrop, mobile panel, `RoomMenu` и `TiltedPreview`. Значения `initial` / `animate` / `exit` / `transition` не менялись.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — точечные style/compositing правки против flicker.

### Новые файлы

- `codex-reports/074-flicker-fix.md` — отчёт по TASK-074.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 54 ++++++++++++++++++++++++------------------
 1 file changed, 31 insertions(+), 23 deletions(-)
```

Примечание: общий diff `Lobby.tsx` также включает незакоммиченную TASK-073. Собственно TASK-074 добавил `transform: "translateZ(0)"`, split mobile `AnimatePresence` и `willChange` hints.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| Animation values unchanged | ✅ | `initial` / `animate` / `exit` / `transition` оставлены прежними |
| Background `translateZ(0)` | ✅ | dynamic background style обновлён |
| Mobile split AnimatePresence | ✅ | backdrop и panel в отдельных `AnimatePresence`, без Fragment внутри одного |
| RoomMenu `willChange` | ✅ | `willChange: "opacity, transform"` |
| TiltedPreview `willChange` | ✅ | `willChange: "opacity, transform"` |

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

- Проверить mobile room menu open/close: backdrop и panel теперь независимые `AnimatePresence`, но animation params прежние.
- Проверить desktop preview transition: добавлен только `willChange`.
