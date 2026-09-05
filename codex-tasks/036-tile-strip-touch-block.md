# TASK-036 — Жёстко заблокировать вертикальный скролл в tile-strip

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблема

Несмотря на `touchAction: "pan-x"` на grid-контейнере и на `motion.button` тайла,
при свайпе по тайлам всё равно есть вертикальный дрейф — иконки двигаются
вверх/вниз вслед за пальцем.

Причина: `touch-action` не наследуется на детей (`<GameIcon>`/img внутри тайла),
а на ВНЕШНЕМ враппере TileStrip установлен `auto`. Браузер при touch смотрит
по цепочке вверх и разрешает вертикальный скролл страницы.

---

## Решение

Применить `touch-action: pan-x` агрессивно через CSS-класс, который покрывает
весь поддерев TileStrip (включая всех потомков), а не только три инлайн-стиля.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — два места
- `src/app/globals.css` — добавить новый CSS-класс

**Не трогать никакие другие файлы.**

---

## Что сделать

### Правка 1 — добавить CSS-класс в `src/app/globals.css`

В конец файла добавить:

```css
.tile-strip-mobile,
.tile-strip-mobile * {
  touch-action: pan-x !important;
}
```

`!important` нужен, чтобы перебить любые inline-стили или Framer Motion-overrides
у потомков. `*` гарантирует, что img/svg внутри `<GameIcon>` тоже получают
ограничение.

### Правка 2 — навесить класс на внешний враппер TileStrip

В компоненте `TileStrip` (около строки 2506) найти:

```tsx
<div style={{ position: "relative", zIndex: 1, paddingBottom: isMobile ? 20 : 32 }}>
```

Заменить на:

```tsx
<div
  className={isMobile ? "tile-strip-mobile" : undefined}
  style={{ position: "relative", zIndex: 1, paddingBottom: isMobile ? 20 : 32 }}
>
```

### Правка 3 — оставить inline `touchAction` как есть

Inline-`touchAction: isMobile ? "pan-x" : undefined` на grid и motion.button
**не удалять** — пусть страхует CSS-класс.

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- На мобильном при touch-drag по тайлам **никакого** вертикального дрейфа —
  тайлы не двигаются вверх/вниз, страница не прокручивается.
- Горизонтальный свайп тайлов работает.

---

## Не делать

- Не менять Framer Motion-логику (`pressed`, `hovered`, `tileAnimate`).
- Не трогать десктопный layout.
- Не коммитить.

---

## Отчёт

Создать `codex-reports/036-tile-strip-touch-block.md`.
