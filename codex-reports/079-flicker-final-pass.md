# REPORT TASK-079: flicker final pass

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 21:20
> - **Финиш:** 2026-05-13 21:30
> - **Длительность:** 10 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-079 выполнен по ТЗ: HeroLeft получил exit-анимации через отдельные `AnimatePresence mode="popLayout"` для title/meta/description, а мобильный RoomMenu теперь открывается через единый overlay-wrapper. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — обёрнуты title/meta/description в HeroLeft в отдельные `AnimatePresence mode="popLayout"` с `exit`.
- `src/components/lobby/Lobby.tsx` — мобильный backdrop и panel RoomMenu объединены в один `AnimatePresence` с wrapper `motion.div`, plain backdrop и child motion panel.

### Новые файлы

- `codex-reports/079-flicker-final-pass.md` — отчёт по TASK-079.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 255 ++++++++++++++++++++++-------------------
 1 file changed, 136 insertions(+), 119 deletions(-)
```

> В stat выше попадают накопленные uncommitted изменения в `Lobby.tsx` из предыдущих задач этой серии; в рамках TASK-079 изменены только блок HeroLeft и мобильный overlay RoomMenu.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | завершился с exit 0 |
| Acceptance #1 | ✅ | lint проходит |
| Acceptance #2 | ✅ | title/meta/description имеют отдельный `AnimatePresence mode="popLayout"` и `exit` |
| Acceptance #3 | ✅ | мобильный RoomMenu: один wrapper `AnimatePresence`, backdrop plain div, panel child motion div |
| Acceptance #4 | ✅ | desktop overlay code path не менялся |
| Acceptance #5 | ✅ | сохранены `y: 40 -> 0`, opacity wrapper `0 -> 1`, duration `0.28` |

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

- Проверить `src/components/lobby/Lobby.tsx`:694 — мобильный overlay теперь единый wrapper, чтобы backdrop и panel не расходились по presence lifecycle.
- Проверить `src/components/lobby/Lobby.tsx`:1717 — три HeroLeft блока теперь выходят через `popLayout`, чтобы убрать gap при смене игры.
