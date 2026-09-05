# REPORT TASK-076: Mobile backdrop no blur

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 20:52 PDT
> - **Финиш:** 2026-05-13 20:54 PDT
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `src/components/lobby/Lobby.tsx` у mobile room menu backdrop убран `backdropFilter` / `WebkitBackdropFilter`, а затемнение поднято с `rgba(0, 0, 0, 0.6)` до `rgba(0, 0, 0, 0.7)`. Анимационные значения не менялись.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — обновлён style `motion.div` с `key="room-menu-backdrop"`.

### Новые файлы

- `codex-reports/076-mobile-backdrop-no-blur.md` — отчёт по TASK-076.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 81 +++++++++++++++++++++++-------------------
 1 file changed, 45 insertions(+), 36 deletions(-)
```

Примечание: общий diff `Lobby.tsx` включает незакоммиченные TASK-073/074/075. Собственно TASK-076 изменил только backdrop style: удалил blur-поля и заменил alpha `0.6 → 0.7`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| Mobile backdrop no blur | ✅ | в `room-menu-backdrop` нет `backdropFilter` / `WebkitBackdropFilter` |
| Dim alpha 0.7 | ✅ | `background: "rgba(0, 0, 0, 0.7)"` |
| Animation values unchanged | ✅ | `initial` / `animate` / `exit` / `transition` не менялись |

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

- Проверить mobile room menu на старых iPhone: фон должен затемняться без blur-композитинга.
