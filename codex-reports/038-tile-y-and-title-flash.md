# REPORT TASK-038: Tile y and title flash

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-08 22:16 PDT
> - **Финиш:** 2026-05-08 22:23 PDT
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На mobile `tileAnimate` больше не меняет `y` ни для tap, ни для active-состояния, оставлены только scale-анимации. В `HeroLeft` убраны три `AnimatePresence mode="wait"` вокруг title/meta/desc и их `exit` props, чтобы смена игры не ждала exit старого текста.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлена mobile-ветка `tileAnimate` с `y: 0` во всех состояниях; title/meta/desc в `HeroLeft` оставлены как `motion.*` с `key`, `initial`, `animate`, `transition`, без `AnimatePresence` и `exit`.

### Новые файлы

- `codex-reports/038-tile-y-and-title-flash.md` — отчёт по TASK-038.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 167 ++++++++++++++++++++---------------------
 1 file changed, 82 insertions(+), 85 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: mobile tile y locked | ✅ | mobile branch всегда возвращает `y: 0` |
| Acceptance: desktop tile motion untouched | ✅ | desktop branch сохранила `pressed`/`active`/`hovered` y-анимации |
| Acceptance: title/meta/desc no wait exit | ✅ | `AnimatePresence mode="wait"` и `exit` убраны только вокруг этих трёх блоков |

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

- Проверить визуально переключение игр: новый title/meta/desc должен входить сразу, без задержки на старый текст.
