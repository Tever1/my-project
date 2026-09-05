# TASK-107 — Phase F: Game flow transitions via GameLayout phaseKey

## Goal

Add smooth Framer Motion phase transitions to all 8 game screens.
When the game phase changes (setup → playing → results etc.), the content
fades out upward and new content fades in from below — like a native mobile app.

All animation logic lives in ONE place: `GameLayout`. Each game file only
needs to add one prop: `phaseKey`.

## Whitelist

- `src/components/games/GameLayout.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/game/[roomId]/truth-or-dare/page.tsx`

## Acceptance criteria

- `npm run lint` passes (no new errors)
- `npm run build` passes
- All 8 games compile without TypeScript errors
- `GameLayout` accepts optional `phaseKey?: string` prop
- When `phaseKey` changes, content animates: exit (opacity 1→0, y 0→-12) then
  enter (opacity 0→1, y 12→0), `mode="wait"` so exit completes before entry
- If `phaseKey` is not provided, children render without animation (no regression
  for any callers that don't pass the prop)
- Existing `animate-fade-in` CSS classes on inner divs inside games are NOT removed
  (they are harmless and can coexist)

---

## Part 1: GameLayout changes

### Add import

```tsx
import { motion, AnimatePresence } from 'framer-motion';
```

### Add prop

```tsx
interface GameLayoutProps {
  // ... existing props ...
  phaseKey?: string;
}
```

### Wrap children in AnimatePresence

Find the "Main content area" section:

```tsx
{/* Main content area — fills remaining viewport */}
<div className="flex-1 w-[92%] max-w-screen-2xl mx-auto px-4 py-4 flex flex-col">
  <div className="flex-1 flex flex-col justify-center">
    {children}
  </div>
</div>
```

Replace with:

```tsx
{/* Main content area — fills remaining viewport */}
<div className="flex-1 w-[92%] max-w-screen-2xl mx-auto px-4 py-4 flex flex-col">
  <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={phaseKey ?? 'static'}
      className="flex-1 flex flex-col justify-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
</div>
```

Note: `initial={false}` on AnimatePresence prevents animation on first mount
(page load). `key={phaseKey ?? 'static'}` means: if no phaseKey provided,
key never changes → no animation → backwards compatible.

---

## Part 2: Add phaseKey to each game

For each game, find the `<GameLayout` opening tag and add `phaseKey={...}`.

### spy/page.tsx

Phase variable: `s.phase`

```tsx
<GameLayout title="Шпион" icon="🕵️‍♂️" onEnd={isHost ? endGame : undefined} phaseKey={s.phase}>
```

### mafia/page.tsx

Phase variable: `gs.phase`

```tsx
<GameLayout
  title={l('Мафия', 'Mafia')}
  icon="🕵️"
  round={gs.round || undefined}
  onEnd={isHost ? handleEndGame : undefined}
  phaseKey={gs.phase}
>
```

### quiz/page.tsx

Phase variable: `gameState.phase`

Find the `<GameLayout` opening (around line 617) and add `phaseKey={gameState.phase}`.
The tag spans multiple lines — add the prop at the end of the existing props, before `>`.

### crocodile/page.tsx

Phase variable: `gameState?.phase ?? 'waiting'`

Add `phaseKey={gameState?.phase ?? 'waiting'}` to the `<GameLayout` tag.

### alias/page.tsx

Phase variable: `gameState?.phase ?? 'modeSelect'`

Add `phaseKey={gameState?.phase ?? 'modeSelect'}` to the `<GameLayout` tag.

### who-am-i/page.tsx

Phase variable: `gs.phase`

```tsx
<GameLayout
  title={l('Кто я?', 'Who Am I?')}
  icon="🤔"
  scores={gs.phase !== 'lobby' ? layoutScores : undefined}
  onEnd={isHost ? handleEndGame : undefined}
  showScoreboard={gs.phase === 'finished'}
  phaseKey={gs.phase}
>
```

### hundred-to-one/page.tsx

Phase variable: `s.phase`

Add `phaseKey={s.phase}` to the `<GameLayout` tag.

### truth-or-dare/page.tsx

Phase variable: `gameState?.phase ?? 'choosing'`

Add `phaseKey={gameState?.phase ?? 'choosing'}` to the `<GameLayout` tag.

---

## Notes

- Do NOT remove or change any game logic, socket handlers, or state.
- Do NOT remove existing `animate-fade-in` classes from inner elements.
- Do NOT change any other props on `<GameLayout>` — only add `phaseKey`.
- The `initial={false}` on `<AnimatePresence>` is important — without it, every
  game screen would animate in on first load which looks jarring.
- `mode="wait"` ensures the exit animation completes before the new phase enters.
  This prevents two phases being visible simultaneously.
- Duration 0.22s is intentionally short — game interactions need to feel snappy,
  not cinematic.

## Report

Write report to `codex-reports/107-phase-f-game-transitions.md`.
Include: files changed, any TypeScript issues encountered, lint/build status.
Do NOT commit.
