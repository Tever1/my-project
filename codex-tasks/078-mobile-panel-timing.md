# TASK-078: Fix mobile menu see-through on open + QR flash on close

## Problems

1. **See-through on open**: Mobile panel animates `opacity: 0 → 1` while
   sliding `y: 40 → 0`. During the first ~100ms the panel is partially
   transparent, allowing the lobby behind to show through — visible as a flash.

2. **QR flash on close**: Backdrop exits in 200ms but the panel takes 280ms.
   During the 80ms gap, the panel (with QR code) is visible without the dim
   backdrop behind it — looks like the QR briefly appears on the lobby.

## Fix

**File:** `src/components/lobby/Lobby.tsx`

### Change 1: Panel — animate only `y`, not opacity

Find the mobile panel motion.div (the one with `key="room-menu-mobile"`).

Replace:
```tsx
<motion.div
  key="room-menu-mobile"
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 40 }}
  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
```

with:
```tsx
<motion.div
  key="room-menu-mobile"
  initial={{ y: 40 }}
  animate={{ y: 0 }}
  exit={{ y: 40 }}
  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
```

Panel is now fully opaque the entire time — slides up from below, slides
down on exit. No transparent frames.

### Change 2: Backdrop — match panel exit duration

Find the mobile backdrop motion.div (the one with `key="room-menu-backdrop"`).

Replace:
```tsx
<motion.div
  key="room-menu-backdrop"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
```

with:
```tsx
<motion.div
  key="room-menu-backdrop"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.28 }}
```

Backdrop now fades out over 280ms instead of 200ms — synchronized with the
panel exit. No gap where panel is visible without backdrop.

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. Mobile panel: `initial`, `animate`, `exit` contain only `y`, no `opacity`.
3. Mobile backdrop: transition duration 0.28 (was 0.2).
4. Desktop code paths untouched.

## Report

Write report to `codex-reports/078-mobile-panel-timing.md`.
Do NOT commit.
