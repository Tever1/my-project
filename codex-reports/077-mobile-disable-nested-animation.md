# REPORT TASK-077: Mobile disable nested animation

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 20:58 PDT
> - **Финиш:** 2026-05-13 21:00 PDT
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `src/components/lobby/Lobby.tsx` внутренняя анимация `RoomMenu` теперь отключается на mobile: `initial={false}`, `transition={{ duration: 0 }}`, exit/animate держат финальное состояние. На desktop значения анимации остались прежними.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — props `initial` / `animate` / `exit` / `transition` у `RoomMenu` `GlassPanel` стали зависеть от `isMobile`; `willChange` отключается на mobile и остаётся на desktop.

### Новые файлы

- `codex-reports/077-mobile-disable-nested-animation.md` — отчёт по TASK-077.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 89 +++++++++++++++++++++++-------------------
 1 file changed, 49 insertions(+), 40 deletions(-)
```

Примечание: общий diff `Lobby.tsx` включает незакоммиченные TASK-073/074/075/076. Собственно TASK-077 изменил только `GlassPanel` props/style внутри `RoomMenu`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| Desktop RoomMenu animation unchanged | ✅ | desktop false-ветки содержат прежние `initial` / `animate` / `exit` / `transition` |
| Mobile RoomMenu no inner animation | ✅ | `initial={false}`, `transition={{ duration: 0 }}` |
| Mobile `willChange` disabled | ✅ | `willChange: isMobile ? undefined : "opacity, transform"` |
| Outer mobile panel animation unchanged | ✅ | блок `room-menu-mobile` не менялся в TASK-077 |

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

- Проверить на mobile, что видимая slide-up анимация панели сохраняется, а внутренний `RoomMenu` больше не scale/fade-анимируется.
