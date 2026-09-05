# REPORT TASK-033: Tile strip mobile label overlap

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-08 21:36 PDT
> - **Финиш:** 2026-05-08 21:43 PDT
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлен мобильный отступ подписи «Все игры» в `TileStrip`. На desktop значение осталось прежним, на mobile `marginBottom` увеличен до 20.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в `<p>` с текстом «Все игры» заменено `marginBottom: 12` на `marginBottom: isMobile ? 20 : 12`.

### Новые файлы

- `codex-reports/033-tile-strip-mobile-label-overlap.md` — отчёт по TASK-033.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: mobile label spacing | ✅ | `isMobile === true` даёт `marginBottom: 20` |
| Acceptance: desktop layout untouched | ✅ | `isMobile === false` оставляет `marginBottom: 12` |

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

- Diff production-кода должен быть ровно одна строка в `TileStrip`.
