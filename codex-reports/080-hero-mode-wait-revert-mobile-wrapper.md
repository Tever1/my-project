# REPORT TASK-080: Hero mode wait + revert mobile wrapper

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 21:31
> - **Финиш:** 2026-05-13 21:36
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-080 выполнен по ТЗ: HeroLeft переведён с `popLayout` на `wait` с мгновенным exit, а мобильный RoomMenu overlay возвращён к структуре TASK-078 с двумя отдельными `AnimatePresence`. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в HeroLeft для title/meta/description заменён `mode="popLayout"` на `mode="wait"` и добавлен мгновенный `exit={{ opacity: 0, transition: { duration: 0 } }}`.
- `src/components/lobby/Lobby.tsx` — мобильный overlay RoomMenu откатан на два отдельных `AnimatePresence`: backdrop с opacity-анимацией и panel только с y-анимацией.

### Новые файлы

- `codex-reports/080-hero-mode-wait-revert-mobile-wrapper.md` — отчёт по TASK-080.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 244 ++++++++++++++++++++++-------------------
 1 file changed, 131 insertions(+), 113 deletions(-)
```

> В stat выше попадают накопленные uncommitted изменения в `Lobby.tsx` из предыдущих задач этой серии; в рамках TASK-080 изменены только HeroLeft AnimatePresence и мобильный overlay RoomMenu.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | завершился с exit 0 |
| Acceptance #1 | ✅ | lint проходит |
| Acceptance #2 | ✅ | HeroLeft title/meta/description используют `AnimatePresence mode="wait"` и мгновенный exit |
| Acceptance #3 | ✅ | mobile menu overlay снова использует два отдельных `AnimatePresence` |
| Acceptance #4 | ✅ | panel без opacity-анимации, только `y: 40 -> 0` |
| Acceptance #5 | ✅ | backdrop opacity `0 -> 1`, duration `0.28` |
| Acceptance #6 | ✅ | desktop code paths не менялись |

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

- Проверить `src/components/lobby/Lobby.tsx`:694 — мобильный overlay снова разделён на backdrop и panel.
- Проверить `src/components/lobby/Lobby.tsx`:1718 — HeroLeft теперь ждёт мгновенный exit старого текста перед входом нового.
