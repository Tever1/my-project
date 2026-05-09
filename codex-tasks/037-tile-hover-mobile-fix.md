# TASK-037 — Отключить hover-анимацию тайлов на мобайле

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблема

При свайпе по тайлам на мобайле иконки «прыгают» вверх-вниз.

Причина: Framer Motion маппит `onHoverStart`/`onHoverEnd` на `pointerenter`/`pointerleave`.
При touch-движении пальца браузер генерирует эти события на каждом тайле, который
проходит под пальцем. Каждый тайл получает `hovered: true` → анимирует `y: -5` вверх,
затем `hovered: false` → возвращается `y: 0`. Получается волна прыжков.

`touch-action: pan-x` эту проблему не решает — она про scroll, не про hover-события.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — одно место в компоненте `Tile`

**Не трогать никакие другие файлы.**

---

## Что сделать

В компоненте `Tile` (около строки 2612) найти:

```tsx
onHoverStart={() => setHovered(true)}
onHoverEnd={() => setHovered(false)}
```

Заменить на:

```tsx
onHoverStart={isMobile ? undefined : () => setHovered(true)}
onHoverEnd={isMobile ? undefined : () => setHovered(false)}
```

Только это. На десктопе hover-анимация остаётся, на мобайле — нет.

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- На мобайле при свайпе по тайлам иконки не прыгают вверх-вниз.
- На десктопе hover-анимация (`y: -5, scale: 1.04`) работает как прежде.

---

## Не делать

- Не трогать `onPointerDown`/`onPointerUp` — tap-анимация (`y: -2, scale: 0.92`) нужна.
- Не трогать `isActive` — выбранный тайл должен оставаться приподнятым.
- Не коммитить.

---

## Отчёт

Создать `codex-reports/037-tile-hover-mobile-fix.md`.
