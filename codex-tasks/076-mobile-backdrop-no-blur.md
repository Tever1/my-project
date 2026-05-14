# TASK-076: Remove backdrop-filter from mobile room menu backdrop

## Problem

On iPhone 15 and older (60Hz display, A16 GPU and earlier), the mobile room
menu backdrop's `backdrop-filter: blur(4px)` causes visible flickering when
the menu animates in/out. On iPhone 16 Pro Max (120Hz ProMotion, A18) the
same code runs smoothly.

Root cause: A16 GPU at 60Hz cannot composite `backdrop-filter` over the
animated radial-gradient background within one frame budget (16.67ms),
causing dropped frames visible as flicker.

## Fix

Remove `backdrop-filter` and `WebkitBackdropFilter` from the mobile backdrop.
Keep the dim via `rgba(0, 0, 0, 0.7)` (slightly stronger than before to
compensate for the lost blur). All animation values stay identical.

**File:** `src/components/lobby/Lobby.tsx`

Find the mobile backdrop motion.div (around the mobile room menu overlay,
look for `key="room-menu-backdrop"`):

```tsx
<motion.div
  key="room-menu-backdrop"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  onClick={() => setRoomMenuOpen(false)}
  style={{
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    zIndex: 40,
    willChange: "opacity",
  }}
/>
```

Replace its `style` prop with:
```tsx
style={{
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.7)",
  zIndex: 40,
  willChange: "opacity",
}}
```

Two changes:
- Removed `backdropFilter: "blur(4px)"` and `WebkitBackdropFilter: "blur(4px)"`
- Bumped dim from `0.6` to `0.7` alpha to compensate for the missing blur

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. Mobile backdrop has no `backdrop-filter` / `WebkitBackdropFilter`.
3. Background dim is `rgba(0, 0, 0, 0.7)`.
4. Animation values unchanged (`initial`, `animate`, `exit`, `transition`).

## Report

Write report to `codex-reports/076-mobile-backdrop-no-blur.md`.
Do NOT commit.
