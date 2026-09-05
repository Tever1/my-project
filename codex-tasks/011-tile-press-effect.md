# TASK-011: Press-effect на тайлах игр (как у CTA)

> **Сложность:** simple, ~1 минута
> **Запуск:** auto by Claude

## Цель

В `<Tile>` (`src/app/lobby-preview/page.tsx`) добавить эффект нажатия —
такой же как у CTA «Начать партию» и других кнопок: `whileTap={{ scale: 0.97 }}`.

## Контекст

Все основные кнопки в файле уже имеют `whileTap={{ scale: 0.97 }}` (5 точек:
строки 435, 510, 708, 737 и `RoomButton`). Тайлы в tile-strip — нет.

В функции `Tile` (примерно строка 1243), на корневом `motion.button`,
сейчас есть `whileHover="hover"` и `animate={isActive ? "active" : "rest"}`.
Нужно добавить ещё `whileTap`. Используй scale: 0.97 — для консистентности.

## Файлы

- `src/app/lobby-preview/page.tsx` — только. Один атрибут добавить.

## Шаги

1. В `motion.button` внутри `function Tile` добавить:
   ```ts
   whileTap={{ scale: 0.97 }}
   ```
   рядом с существующим `whileHover="hover"`.

2. Если конфликтует с `variants` (whileTap может затереть variant-логику) —
   можно вместо строки выше использовать вариант через variants:
   ```ts
   variants={{
     rest: { ... },
     hover: { ... },
     active: { ... },
     tap: { scale: 0.97 },
   }}
   whileTap="tap"
   ```
   Но сейчас `Tile` сам не определяет `variants` на корневой кнопке —
   `whileHover="hover"` ссылается на дочерние motion-divs которые имеют
   варианты. Поэтому **простой `whileTap={{ scale: 0.97 }}` достаточен**
   и не сломает существующее поведение.

## Acceptance criteria

- [ ] `npm run build` успешен.
- [ ] Клик мышью / тап на тайле даёт визуальное «pressed» (легкая компрессия).
- [ ] Hover/active/focus поведение не сломано.
- [ ] Эффект совпадает по силе с CTA «Начать партию».

## Контрольные точки

1. Diff = 1 строка добавлена.
2. `npm run build`.
3. Заполнить `codex-reports/011-tile-press-effect.md`.
4. Не коммитить.
