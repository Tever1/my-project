# TASK-092 — RoomMenu panel: use glassMobileSolid on mobile

## Context

После TASK-091 AccountDropdown и AuthDropdown на мобильном теперь используют
`glassMobileSolid` → frosted glass с `blur(12px)`. Но панель RoomMenu
(`~line 2065`) осталась с инлайновым solid dark фоном и без blur на мобильном:

```ts
background: isMobile ? "rgba(20, 18, 32, 0.92)" : "rgba(255,255,255,0.08)",
backdropFilter: isMobile ? undefined : "blur(24px)",
WebkitBackdropFilter: isMobile ? undefined : "blur(24px)",
```

## Fix

Заменить три строки на вызов `glassMobileSolid`.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Current (lines ~2065–2067):

```ts
background: isMobile ? "rgba(20, 18, 32, 0.92)" : "rgba(255,255,255,0.08)",
backdropFilter: isMobile ? undefined : "blur(24px)",
WebkitBackdropFilter: isMobile ? undefined : "blur(24px)",
```

## Fix:

```ts
...glassMobileSolid(isMobile, "rgba(255,255,255,0.08)"),
```

`glassMobileSolid` уже импортирован из `@/lib/design/mobile-helpers` (добавлен в TASK-088).

---

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. Строки 2065–2067 заменены на `...glassMobileSolid(isMobile, "rgba(255,255,255,0.08)")`.
2. Мобильный RoomMenu получает `blur(12px)` и полупрозрачный фон вместо solid dark.
3. Десктоп — без изменений (`blur(24px)`).
4. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/092-roommenu-glass-mobile.md`
