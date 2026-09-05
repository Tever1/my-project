# TASK-079: Fix HeroLeft description flicker + backdrop dim oscillation

## Problem 1: Description flickers when switching games (mobile)

In `HeroLeft` (around lines 1718–1794), three motion elements have
`key={game.id}` but no `<AnimatePresence>` wrapper:
- `motion.h1` (title)
- `motion.div` (meta pills)
- `motion.p` (description)

When `game.id` changes, React unmounts old element immediately and mounts
new one at `initial` state (`opacity: 0`). There is no exit animation —
the gap between unmount and mount is the visible flicker.

## Problem 2: Backdrop dim briefly disappears and returns

Mobile backdrop and panel are wrapped in two separate `<AnimatePresence>`
instances. During interim re-renders (presence updates, room:state events,
etc.), React 18 can desync the two animations, causing backdrop to briefly
exit and re-enter — visible as the dim un-dimming for a frame.

---

## Fix 1: Wrap HeroLeft motion elements in AnimatePresence

**File:** `src/components/lobby/Lobby.tsx`

Find the `HeroLeft` JSX block (around line 1715):

```tsx
return (
  <div style={{ position: "relative" }}>
    {/* Title — animates between games */}
    <motion.h1
      key={game.id}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      style={{...}}
    >
      ...
    </motion.h1>

    {/* Meta pills */}
    <motion.div
      key={`meta-${game.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{...}}
    >
      ...
    </motion.div>

    {/* Description */}
    <motion.p
      key={`desc-${game.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{...}}
    >
      {game.description}
    </motion.p>
    ...
  </div>
);
```

Wrap **each** of the three motion elements (title, meta, description) in its
own `<AnimatePresence mode="popLayout">`, and add an `exit` prop so the old
element animates out while the new one animates in (no flicker gap).

For the **title** (`motion.h1`):
```tsx
<AnimatePresence mode="popLayout">
  <motion.h1
    key={game.id}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -30 }}
    transition={spring.soft}
    style={{...}}
  >
    ...
  </motion.h1>
</AnimatePresence>
```

For the **meta pills** (`motion.div`):
```tsx
<AnimatePresence mode="popLayout">
  <motion.div
    key={`meta-${game.id}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    style={{...}}
  >
    ...
  </motion.div>
</AnimatePresence>
```

For the **description** (`motion.p`):
```tsx
<AnimatePresence mode="popLayout">
  <motion.p
    key={`desc-${game.id}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    style={{...}}
  >
    {game.description}
  </motion.p>
</AnimatePresence>
```

Each AnimatePresence ensures the old element fades out while the new one
fades in — no instant gap.

---

## Fix 2: Combine mobile backdrop + panel into a single AnimatePresence

In the mobile room menu overlay block (around lines 694–750), replace the
two separate `<AnimatePresence>` instances with one wrapper motion.div that
contains both backdrop and panel. This guarantees they enter/exit in lockstep.

Replace this entire block:

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
          transition={{ duration: 0.28 }}
          onClick={() => setRoomMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
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
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
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
            isMobile={true}
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

with this combined version:

```tsx
{isMobile && (
  <AnimatePresence>
    {roomMenuOpen && roomCode && (
      <motion.div
        key="room-menu-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          willChange: "opacity",
        }}
      >
        {/* Backdrop — solid dim, absolute inside wrapper */}
        <div
          onClick={() => setRoomMenuOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
          }}
        />
        {/* Panel — slides up, also absolute inside wrapper */}
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "88dvh",
            overflowY: "auto",
            padding: "0 12px 24px",
            willChange: "transform",
          }}
        >
          <RoomMenu
            ref={roomMenuRef}
            roomCode={roomCode}
            roomState={roomState}
            accent={accent}
            deep={deep}
            currentUserId={user?.id ?? ""}
            isMobile={true}
            onKick={handleKick}
            onTransferHost={handleTransferHost}
            onLeaveRoom={handleLeaveRoom}
            onClose={() => setRoomMenuOpen(false)}
          />
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)}
```

Key differences:
- ONE AnimatePresence with ONE motion.div wrapper that fades opacity (0↔1)
- Backdrop is a plain `<div>` (no animation, no key) — its visibility follows
  the wrapper's opacity
- Panel is a child motion.div with its own `y` animation
- No risk of desync between backdrop and panel

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. HeroLeft: title, meta pills, description each wrapped in own
   `<AnimatePresence mode="popLayout">` with `exit` prop.
3. Mobile room menu overlay: single AnimatePresence with wrapper motion.div
   containing plain backdrop div + child motion panel.
4. Desktop code paths unchanged.
5. Animation values stay equivalent: panel `y: 40 → 0`, fade opacity 0 → 1,
   duration 0.28.

## Report

Write report to `codex-reports/079-flicker-final-pass.md`.
Do NOT commit.
