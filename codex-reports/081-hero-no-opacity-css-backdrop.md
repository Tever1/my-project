# REPORT TASK-081: Hero no opacity + CSS backdrop

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-13 21:39
> - **Финиш:** 2026-05-13 21:45
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-081 выполнен по ТЗ: у HeroLeft убран fade-in для title, а meta/description переведены на plain элементы без Framer Motion. Мобильный backdrop вынесен из `AnimatePresence` и теперь анимируется CSS `opacity` transition; панель не менялась.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — title в HeroLeft теперь использует `initial={{ y: 30 }}` и `animate={{ y: 0 }}` без opacity fade.
- `src/components/lobby/Lobby.tsx` — meta pills и description в HeroLeft заменены на обычные `<div>` и `<p>` без `AnimatePresence`/`motion`.
- `src/components/lobby/Lobby.tsx` — mobile backdrop заменён на всегда отрендеренный plain `<div>` с `transition: "opacity 0.28s ease-out"` и переключением `pointerEvents`.

### Новые файлы

- `codex-reports/081-hero-no-opacity-css-backdrop.md` — отчёт по TASK-081.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 204 ++++++++++++++++++++---------------------
 1 file changed, 101 insertions(+), 103 deletions(-)
```

> В stat выше попадают накопленные uncommitted изменения в `Lobby.tsx` из предыдущих задач этой серии; в рамках TASK-081 изменены только HeroLeft и mobile backdrop.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | завершился с exit 0 |
| Acceptance #1 | ✅ | lint проходит |
| Acceptance #2 | ✅ | title: `initial={{ y: 30 }}`, без `opacity: 0` |
| Acceptance #3 | ✅ | meta pills: plain `<div>`, без motion/AnimatePresence |
| Acceptance #4 | ✅ | description: plain `<p>`, без motion/AnimatePresence |
| Acceptance #5 | ✅ | mobile backdrop: plain `<div>`, always rendered, CSS opacity transition |
| Acceptance #6 | ✅ | mobile panel оставлена как в TASK-080: AnimatePresence + y-slide duration 0.28 |

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

- Проверить `src/components/lobby/Lobby.tsx`:696 — backdrop больше не управляется Framer Motion.
- Проверить `src/components/lobby/Lobby.tsx`:1712 — title всё ещё slide-in, но без opacity fade.
- Проверить `src/components/lobby/Lobby.tsx`:1755 — meta/description стали plain DOM-элементами.
