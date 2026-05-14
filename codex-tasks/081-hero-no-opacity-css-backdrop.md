# TASK-081: Remove opacity from HeroLeft initial + replace mobile backdrop with CSS-only

## Problem 1: Game text still flickers on switch

Even with `mode="wait"` + instant exit, the new element mounts at
`initial: { opacity: 0 }` — there's a frame where the new element is in
DOM but invisible. That frame gap is the perceived flicker.

## Problem 2: Mobile backdrop dim oscillates

AnimatePresence reacts to Lobby's re-renders (socket events, presence
updates, room:state). Framer Motion's animation engine can briefly desync
during these re-renders. Switching to a CSS-only transition takes the
backdrop out of Framer Motion entirely — pure browser-native opacity
animation, no JS-driven animation framework involvement.

---

## Fix 1: HeroLeft — remove `opacity: 0` from `initial`, keep slide-in

**File:** `src/components/lobby/Lobby.tsx`

### Title

Replace:
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

with:
```tsx
<AnimatePresence mode="wait">
  <motion.h1
    key={game.id}
    initial={{ y: 30 }}
    animate={{ y: 0 }}
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

with (remove AnimatePresence + initial fade entirely — meta pills appear
instantly when game changes):
```tsx
<div style={{...}}>
  ...
</div>
```

(Replace `motion.div` with plain `div` — no animation. The pills are small
and switching them instantly without fade is fine.)

For the meta pills, also delete the `key={`meta-${game.id}`}` and
`transition` props since they're no longer needed on a plain div.

### Description

Replace:
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

with (same approach as meta pills — plain p, no animation):
```tsx
<p style={{...}}>
  {game.description}
</p>
```

Result: Title still slide-in from below (no fade flicker since opacity stays
at 1). Meta + description switch instantly with no animation — no flicker
because nothing is unmounting/mounting via Framer Motion.

---

## Fix 2: Replace mobile backdrop with CSS-only transition

In the mobile menu section, take the backdrop OUT of AnimatePresence.
Render it as a regular `<div>` always present in DOM, toggle opacity via
inline style + CSS transition. GPU layer stays allocated, browser handles
opacity natively.

**KEEP THE PANEL AS-IS** — only the backdrop changes. Panel still uses its
own AnimatePresence with y-slide.

Find the current mobile section (after TASK-080 revert):

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
          style={{...}}
        >
          <RoomMenu ... />
        </motion.div>
      )}
    </AnimatePresence>
  </>
)}
```

Replace with:

```tsx
{isMobile && (
  <>
    {/* Backdrop — always rendered, opacity controlled via CSS */}
    <div
      onClick={() => setRoomMenuOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 40,
        opacity: roomMenuOpen && roomCode ? 1 : 0,
        pointerEvents: roomMenuOpen && roomCode ? "auto" : "none",
        transition: "opacity 0.28s ease-out",
        willChange: "opacity",
      }}
    />
    {/* Panel — unchanged */}
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

Key changes:
- Backdrop is now a plain `<div>` (NOT motion.div, NOT inside AnimatePresence).
- Always rendered in DOM. GPU layer persistent.
- `opacity` controlled by inline style based on `roomMenuOpen && roomCode`.
- CSS `transition: opacity 0.28s ease-out` handles the animation natively.
- `pointer-events` toggles so backdrop doesn't intercept clicks when invisible.
- Panel block is unchanged — still uses AnimatePresence with y-slide.

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. HeroLeft title: `initial={{ y: 30 }}` (no `opacity: 0`).
3. HeroLeft meta pills: plain `<div>`, no motion, no AnimatePresence.
4. HeroLeft description: plain `<p>`, no motion, no AnimatePresence.
5. Mobile backdrop: plain `<div>` with CSS `transition: opacity 0.28s ease-out`,
   always rendered.
6. Mobile panel: unchanged from TASK-080 (AnimatePresence + motion.div with
   y-slide, duration 0.28).

## Report

Write report to `codex-reports/081-hero-no-opacity-css-backdrop.md`.
Do NOT commit.
