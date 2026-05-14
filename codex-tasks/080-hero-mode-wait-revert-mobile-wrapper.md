# TASK-080: HeroLeft mode="wait" + revert mobile menu structure to TASK-078 state

## Problem 1: Old game text lingers visibly during switch

In TASK-079 we wrapped HeroLeft motion elements (title/meta/description) in
`<AnimatePresence mode="popLayout">`. This caused the OLD text to remain
visible during the NEW text's fade-in, creating a "ghost" effect.

## Problem 2: Mobile room menu flickering returned

In TASK-079 we combined backdrop + panel into a single AnimatePresence with
a wrapper motion.div that animates opacity. The wrapper's opacity affects
its children (panel inherits the fade), changing the panel's appearance.
TASK-078 had the menu working correctly with two separate AnimatePresence —
revert to that structure.

---

## Fix 1: Change HeroLeft AnimatePresence mode and exit timing

**File:** `src/components/lobby/Lobby.tsx`

For all three HeroLeft AnimatePresence blocks (title, meta pills, description):

- Change `mode="popLayout"` to `mode="wait"`.
- Make exit instant by adding `transition: { duration: 0 }` to the `exit` prop.

### Title

Replace:
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

with:
```tsx
<AnimatePresence mode="wait">
  <motion.h1
    key={game.id}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, transition: { duration: 0 } }}
    transition={spring.soft}
    style={{...}}
  >
    ...
  </motion.h1>
</AnimatePresence>
```

### Meta pills

Replace:
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

with:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={`meta-${game.id}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0 } }}
    transition={{ duration: 0.3 }}
    style={{...}}
  >
    ...
  </motion.div>
</AnimatePresence>
```

### Description

Replace:
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

with:
```tsx
<AnimatePresence mode="wait">
  <motion.p
    key={`desc-${game.id}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0 } }}
    transition={{ duration: 0.3 }}
    style={{...}}
  >
    {game.description}
  </motion.p>
</AnimatePresence>
```

Behavior with these settings:
- mode="wait": AnimatePresence waits for old to exit before new enters.
- exit transition duration: 0 → old element disappears instantly (0ms).
- New element then enters with normal spring/duration animation.

Visually: old text vanishes immediately on game switch, new text fades in
smoothly. No ghost, no lingering.

---

## Fix 2: Revert mobile room menu overlay to TASK-078 structure

In the mobile room menu overlay block, replace the single AnimatePresence
with wrapper that was introduced in TASK-079 — go back to two separate
AnimatePresence instances (one for backdrop, one for panel).

Find this block (the combined version from TASK-079):

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
        <div
          onClick={() => setRoomMenuOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
          }}
        />
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

Replace it with this (two separate AnimatePresence — backdrop fades opacity
independently, panel slides y independently):

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
      )}
    </AnimatePresence>
  </>
)}
```

This restores TASK-078 state: backdrop animates opacity 0↔1, panel animates
y only (no opacity), both durations 0.28 (synced).

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. HeroLeft title/meta/description each use `<AnimatePresence mode="wait">`
   with `exit: { opacity: 0, transition: { duration: 0 } }`.
3. Mobile menu overlay uses TWO separate `<AnimatePresence>` (one for
   backdrop, one for panel) — no shared wrapper motion.div.
4. Panel has no opacity animation, only `y: 40 → 0`.
5. Backdrop has opacity 0 → 1 with duration 0.28.
6. Desktop code paths unchanged.

## Report

Write report to `codex-reports/080-hero-mode-wait-revert-mobile-wrapper.md`.
Do NOT commit.
