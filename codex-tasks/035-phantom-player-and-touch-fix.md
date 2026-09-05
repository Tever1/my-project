# TASK-035 — Фантом-игрок и вертикальный дрейф тайлов

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблемы

1. **Фантом-овал в списке игроков** (RoomMenu): игрок с пустым `nickname`
   рендерит видимую кнопку без текста. Выглядит как серый пустой овал между именами.

2. **Вертикальный дрейф при свайпе** (TileStrip): `touchAction: "pan-x"` стоит
   на grid-контейнере, но Framer Motion перехватывает touch-события на самих
   `motion.button` раньше — браузер не успевает применить `pan-x`. Нужно добавить
   `touchAction` и на кнопку-тайл.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — два места

**Не трогать никакие другие файлы.**

---

## Что сделать

### Правка 1 — фильтровать игроков без никнейма

Найти строку (около 1825):
```ts
const connectedPlayers = (roomState?.players ?? []).filter((p) => p.isConnected !== false);
```

Заменить на:
```ts
const connectedPlayers = (roomState?.players ?? []).filter(
  (p) => p.isConnected !== false && p.nickname
);
```

### Правка 2 — touchAction на motion.button в Tile

В компоненте `Tile` найти `<motion.button` (около строки 2598).
В его `style` добавить `touchAction: isMobile ? "pan-x" : undefined`:

**Было:**
```tsx
style={{
  position: "relative",
  cursor: "pointer",
  background: "transparent",
  border: "none",
  outline: "none",
  padding: 0,
  fontFamily: "inherit",
  color: "inherit",
  scrollSnapAlign: isMobile ? "start" : undefined,
}}
```

**Стало:**
```tsx
style={{
  position: "relative",
  cursor: "pointer",
  background: "transparent",
  border: "none",
  outline: "none",
  padding: 0,
  fontFamily: "inherit",
  color: "inherit",
  scrollSnapAlign: isMobile ? "start" : undefined,
  touchAction: isMobile ? "pan-x" : undefined,
}}
```

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- В списке игроков нет пустых овалов — игроки без никнейма не рендерятся.
- При свайпе по тайлам на мобайле нет вертикального смещения страницы.

---

## Не делать

- Не трогать десктопный layout.
- Не менять логику `isConnected`.
- Не коммитить.

---

## Отчёт

Создать `codex-reports/035-phantom-player-and-touch-fix.md`.
