# TASK-034 — Мобильный tile-strip: фикс overlap и вертикального дрейфа

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблемы

1. **Надпись «Все игры» всё ещё налезает на иконки.** Причина: Framer Motion
   анимирует `Tile` с `y: -5, scale: 1.04` при hover/active, а grid-контейнер
   имеет `overflowY: "visible"` — плитки физически вылезают вверх в область лейбла.

2. **При свайпе влево/вправо иконки дрейфуют по вертикали.** Причина: у
   scrollable-div нет `touchAction: "pan-x"` — браузер разрешает оба направления.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — только два места в `TileStrip`

**Не трогать никакие другие файлы.**

---

## Что сделать

Оба изменения — в компоненте `TileStrip` (около строки 2506).

### Правка 1 — увеличить `marginBottom` лейбла на мобайле

Найти (около строки 2513):
```tsx
marginBottom: isMobile ? 20 : 12,
```

Заменить на:
```tsx
marginBottom: isMobile ? 32 : 12,
```

### Правка 2 — заблокировать вертикальный скролл в grid-контейнере

Найти `<div` с `overflowX: isMobile ? "auto" : undefined` (около строки 2521).
Добавить свойство `touchAction`:

**Было:**
```tsx
style={{
  display: "grid",
  gridTemplateColumns: isMobile ? undefined : `repeat(${games.length}, 1fr)`,
  gridAutoFlow: isMobile ? "column" : undefined,
  gridAutoColumns: isMobile ? 110 : undefined,
  gap: isMobile ? 12 : 28,
  maxWidth: 1280,
  margin: "0 auto",
  padding: isMobile ? "0 16px 10px" : "0 48px",
  overflowX: isMobile ? "auto" : undefined,
  overflowY: isMobile ? "visible" : undefined,
  scrollSnapType: isMobile ? "x mandatory" : undefined,
  WebkitOverflowScrolling: isMobile ? "touch" : undefined,
}}
```

**Стало** (добавить `touchAction` и `paddingTop`):
```tsx
style={{
  display: "grid",
  gridTemplateColumns: isMobile ? undefined : `repeat(${games.length}, 1fr)`,
  gridAutoFlow: isMobile ? "column" : undefined,
  gridAutoColumns: isMobile ? 110 : undefined,
  gap: isMobile ? 12 : 28,
  maxWidth: 1280,
  margin: "0 auto",
  padding: isMobile ? "8px 16px 10px" : "0 48px",
  overflowX: isMobile ? "auto" : undefined,
  overflowY: isMobile ? "visible" : undefined,
  scrollSnapType: isMobile ? "x mandatory" : undefined,
  WebkitOverflowScrolling: isMobile ? "touch" : undefined,
  touchAction: isMobile ? "pan-x" : undefined,
}}
```

Изменения:
- `padding: isMobile ? "0 16px 10px"` → `"8px 16px 10px"` (добавлен `paddingTop: 8px` — даёт плиткам пространство для анимации `y: -5` без выхода за пределы)
- добавлен `touchAction: isMobile ? "pan-x" : undefined` — блокирует вертикальный дрейф

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- На мобильном надпись «Все игры» не перекрывается иконками ни в каком состоянии (включая активную/hover плитку).
- Горизонтальный свайп работает только горизонтально, вертикальный дрейф отсутствует.

---

## Не делать

- Не трогать десктопный layout.
- Не менять анимации Tile.
- Не коммитить.

---

## Отчёт

Создать `codex-reports/034-tile-strip-mobile-fixes.md`.
