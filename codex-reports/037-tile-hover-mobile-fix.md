# REPORT TASK-037: Tile hover mobile fix

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-08 22:10 PDT
> - **Финиш:** 2026-05-08 22:14 PDT
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `Tile` отключены Framer Motion hover handlers на mobile. На desktop hover-анимация осталась прежней, pointer/tap и active-анимации не трогались.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — `onHoverStart` и `onHoverEnd` теперь передаются только когда `!isMobile`.

### Новые файлы

- `codex-reports/037-tile-hover-mobile-fix.md` — отчёт по TASK-037.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: mobile hover disabled | ✅ | handlers становятся `undefined` при `isMobile` |
| Acceptance: desktop hover unchanged | ✅ | handlers остаются на desktop |

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

- Production diff должен быть только заменой двух hover handler props в `Tile`.
