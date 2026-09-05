# REPORT TASK-086: AccountDropdown no exit on mobile

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 21:11
> - **Финиш:** 2026-05-14 21:17
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-086 выполнен по ТЗ: у `AccountDropdown` на мобильном отключена exit-анимация по тому же паттерну, что в TASK-085 для `AuthDropdown`. Десктопное поведение оставлено прежним. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в `AccountDropdown` mobile `exit` изменён на `{ opacity: 1 }`, mobile `transition` на `{ duration: 0 }`; desktop `exit={{ opacity: 0, y: -8, scale: 0.97 }}` и `spring.snappy` сохранены.

### Новые файлы

- `codex-reports/086-accountdropdown-no-exit-on-mobile.md` — отчёт по TASK-086.

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
| `npm run lint` | ✅ | exit 0 |
| `npm run build` | ✅ | первый запуск упал из-за sandbox `binding to a port`; escalated-запуск прошёл с exit 0. В output остаётся существующий `ReferenceError: location is not defined`, сборку не валит |
| Acceptance #1 | ✅ | mobile `AccountDropdown`: `exit={isMobile ? { opacity: 1 } : ...}` и `duration: 0` |
| Acceptance #2 | ✅ | реализация убирает mobile exit fade |
| Acceptance #3 | ✅ | desktop exit/spring сохранены |

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

- Проверить `src/components/lobby/Lobby.tsx`:1544 — единственная правка TASK-086 в `AccountDropdown` motion container.
