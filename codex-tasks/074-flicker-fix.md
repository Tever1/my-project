# TASK-074: Fix flickering/flashing during animations (mobile + desktop)

## Problem

Three sources of visual flickering. Fix all three WITHOUT changing any animation
values (initial/animate/exit/transition/ease/duration stay identical).

---

## Fix 1: Background gradient — isolate repaints with translateZ(0)

`motion.div` at ~line 608 animates `background: radial-gradient(...)`.
Gradient animation is not GPU-compositable, causing full-page repaints that
bleed visually into overlays appearing on the same frame.

**Change:** add `transform: "translateZ(0)"` to its existing `style` prop.

Before:
```tsx
style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
```

After:
```tsx
style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", transform: "translateZ(0)" }}
```

This promotes the element to its own GPU compositing layer so its repaint is
isolated and does not cause the rest of the page to flash.

---

## Fix 2: Mobile room menu — split AnimatePresence + add will-change

Currently a single `AnimatePresence` wraps a React Fragment (`<>`) containing
two motion elements. AnimatePresence cannot track exit animations through a
Fragment — it sees one child (the Fragment) not two motion elements.

**Change:** split into two separate `AnimatePresence` instances, one per element.
Add `will-change` to each element. Keep all animation values identical.

Before (~lines 694–748):
```tsx
{isMobile && (
  <AnimatePresence>
    {roomMenuOpen && roomCode && (
      <>
        {/* Dim backdrop */}
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
          }}
        />
        {/* Scrollable panel */}
        <motion.div
          key="room-menu-mobile"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 41,
            maxHeight: "88dvh",
            overflowY: "auto",
            padding: "0 12px 24px",
          }}
        >
          <RoomMenu ... />
        </motion.div>
      </>
    )}
  </AnimatePresence>
)}
```

After:
```tsx
{isMobile && (
  <>
    <AnimatePresence>
      {roomMenuOpen && roomCode && (
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
      )}
    </AnimatePresence>
    <AnimatePresence>
      {roomMenuOpen && roomCode && (
        <motion.div
          key="room-menu-mobile"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 41,
            maxHeight: "88dvh",
            overflowY: "auto",
            padding: "0 12px 24px",
            willChange: "transform, opacity",
          }}
        >
          <RoomMenu
            ref={roomMenuRef}
            roomCode={roomCode}
            roomState={roomState}
            accent={accent}
            deep={deep}
            currentUserId={user?.id ?? ""}
            onKick={handleKick}
            onTransferHost={handleTransferHost}
            onLeaveRoom={handleLeaveRoom}
            onClose={() => setRoomMenuOpen(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </>
)}
```

---

## Fix 3: RoomMenu + TiltedPreview — add will-change for GPU promotion

**RoomMenu** has `backdropFilter: blur(24px)` which forces a compositing layer
when it appears. Pre-promote it with `will-change` so the layer exists before
the animation starts.

In `RoomMenu`'s return statement, find the `GlassPanel` style prop and add
`willChange: "opacity, transform"`:

```tsx
style={{
  width: "100%",
  maxWidth: 460,
  minHeight: 480,
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.12)",
  display: "flex",
  flexDirection: "column",
  gap: 26,
  willChange: "opacity, transform",   // ← add this line
}}
```

**TiltedPreview** inner `motion.div` (the card with `key={gameId}`): add
`willChange: "opacity, transform"` to its existing `style` prop.

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. No animation values changed — same initial/animate/exit/transition everywhere.
3. Mobile: backdrop and panel each have their own `AnimatePresence` (no Fragment wrapper).
4. Background gradient div has `transform: "translateZ(0)"` in style.
5. RoomMenu GlassPanel has `willChange: "opacity, transform"`.
6. TiltedPreview inner motion.div has `willChange: "opacity, transform"`.

## Report

Write report to `codex-reports/074-flicker-fix.md`.
Do NOT commit.
