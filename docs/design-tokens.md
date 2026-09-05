# Design Tokens — Phase A Reference

> Source of truth: `src/app/globals.css` (CSS vars + Tailwind theme) and
> `src/lib/design/tokens.ts` (TypeScript). This doc is human-readable summary.

## Typography

**Font family:** [Geist](https://vercel.com/font) (Sans + Mono) via `next/font`.

| Token | Use for |
|---|---|
| `var(--font-sans)` / `font-sans` | All UI text |
| `var(--font-mono)` / `.font-mono` | Numbers, timers, scoreboard, code |

Mono auto-applies `font-variant-numeric: tabular-nums` so digits don't jiggle.

## Color: Per-game accents

Each game has its own visual world. Use these in components scoped to a single game.

| Game | Accent | Deep | Mood |
|---|---|---|---|
| Quiz | `#06b6d4` cyan | `#0e7490` | focused, clean |
| Mafia | `#8b5cf6` violet | `#4c1d95` | mystic, dark |
| Crocodile | `#f97316` orange | `#c2410c` | playful, warm |
| Spy | `#14b8a6` teal | `#0f766e` | intrigue |
| Alias | `#ec4899` pink | `#be185d` | energetic |
| Who Am I? | `#a78bfa` pastel violet | `#7c3aed` | curious |
| 100 to 1 | `#f59e0b` amber | `#b45309` | premium TV-show |

**Access:**
- CSS: `var(--color-game-mafia)` / `var(--color-game-mafia-deep)`
- TS: `import { gameColors } from "@/lib/design/tokens"`

## Color: Universal accent (lobby, nav, app-level)

Purple → blue gradient, kept from existing system.
- `--color-accent-purple` `#a855f7`
- `--color-accent-blue` `#6366f1`
- Gradient: `linear-gradient(135deg, #a855f7, #6366f1)`

## Radius (iOS-26 generous rounding)

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 6px | inline chips, tight pills |
| `--radius-sm` | 10px | small buttons, badges |
| `--radius-md` | 16px | inputs, default buttons |
| `--radius-lg` | 24px | cards, modals |
| `--radius-xl` | 32px | large cards, hero panels |
| `--radius-2xl` | 40px | TV-mode panels |
| `--radius-full` | 9999px | pills, circular avatars |

## Motion: Durations

| Token | Value | Use |
|---|---|---|
| `--duration-micro` | 120ms | focus rings, subtle feedback |
| `--duration-fast` | 200ms | hover, tap |
| `--duration-base` | 350ms | most transitions |
| `--duration-slow` | 550ms | cards, sheets, page sections |
| `--duration-cinema` | 800ms | TV transitions, dramatic moments |

TS equivalent (in seconds): `duration.fast`, `duration.base`, etc. from `tokens.ts`.

## Motion: Easings

| Token | Curve | Best for |
|---|---|---|
| `--ease-ios` | `cubic-bezier(0.32, 0.72, 0, 1)` | **Default — Apple signature** |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | smooth deceleration |
| `--ease-out-back` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | gentle overshoot |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | symmetric entry/exit |

## Motion: Spring presets (Framer Motion)

```ts
import { spring } from "@/lib/design/tokens";

<motion.div transition={spring.soft} ... />
```

| Preset | Stiffness / Damping | Use |
|---|---|---|
| `spring.soft` | 200 / 30 | luxurious, premium feel **(default)** |
| `spring.medium` | 280 / 28 | most UI elements |
| `spring.snappy` | 400 / 30 | quick feedback (buttons, toggles) |
| `spring.bouncy` | 350 / 18 | celebrations (overshoot) |
| `spring.stiff` | 500 / 35 | near-instant (focus rings) |

## Motion: Pre-built variants

Import from `@/lib/design/motion`:

- `fadeIn`, `fadeInUp`, `fadeInDown` — basic enters
- `scaleIn`, `pop` — modals, celebrations
- `slideInRight`, `slideInLeft` — phase transitions
- `stagger`, `staggerSlow` — list containers
- `hover.lift / glow / zoom`, `tap.press / pressDeep` — interaction
- `bgCrossfade` — PS5-style background swap

## Accessibility

`@media (prefers-reduced-motion: reduce)` automatically disables all animations
to ~0ms. No extra work needed in components.

## Dark mode

- **Auto** (existing): follows `prefers-color-scheme: dark`.
- **Force-dark** (new): add `class="dark"` on `<html>` for permanent dark mode.
  Used by lobby + TV pages where premium-dark is the only correct aesthetic.

---

# Phase B — Liquid Glass System

## Depth layers (z-index)

| Token | Value | Use |
|---|---|---|
| `z.base` / `--z-base` | 1 | default content |
| `z.elevated` / `--z-elevated` | 10 | sticky nav, headers |
| `z.floating` / `--z-floating` | 40 | popovers, dropdowns, tooltips |
| `z.overlay` / `--z-overlay` | 50 | sheets, drawers, modals |
| `z.toast` / `--z-toast` | 60 | toasts (above all overlays) |

## Blur scale

| Token | Value |
|---|---|
| `blur.subtle` | 8px |
| `blur.default` | 16px |
| `blur.strong` | 24px |
| `blur.intense` | 40px |

## Shadow scale

| Token | Value |
|---|---|
| `shadow.xs` | `0 2px 8px rgba(0,0,0,0.08)` |
| `shadow.sm` | `0 4px 16px rgba(0,0,0,0.12)` |
| `shadow.md` | `0 8px 32px rgba(0,0,0,0.18)` |
| `shadow.lg` | `0 16px 48px rgba(0,0,0,0.28)` |
| `shadow.xl` | `0 24px 64px rgba(0,0,0,0.4)` |

## Components

```tsx
import { GlassPanel, GlassSheet, GlassToaster } from "@/components/glass";
import { toast } from "sonner";
```

### `<GlassPanel>` — frosted surface

5 variants: `subtle` / `card` / `floating` / `hero` / `elevated`.

```tsx
<GlassPanel variant="card">Default content panel</GlassPanel>
<GlassPanel variant="hero" radius="xl" padding={48}>Big info card</GlassPanel>
<GlassPanel interactive accentColor={gameColors.mafia.accent}>
  Per-game accent glow on border + hover lift
</GlassPanel>
```

Props:
- `variant?: GlassVariant` — defaults to `"card"`
- `radius?: GlassRadius` — defaults to `"lg"`
- `interactive?: boolean` — adds hover.lift + tap.press
- `accentColor?: string` — adds colored glow on border (use per-game accent)
- `padding?: number | string` — overrides variant default
- `as?: ...` — render as different element (motion.div by default)

### `<GlassSheet>` — drag-to-dismiss drawer

Built on `vaul`. Bottom sheet (iOS default) + side drawers (left / right / top).

```tsx
const [open, setOpen] = useState(false);

<GlassSheet open={open} onOpenChange={setOpen} title="Settings">
  <p>Sheet content here</p>
</GlassSheet>

<GlassSheet open={open} onOpenChange={setOpen} direction="right" title="Чат">
  <ChatPanel />
</GlassSheet>
```

### `<GlassToaster>` — toast notifications

Built on `sonner`. Mount once at root level.

```tsx
// In providers.tsx or layout.tsx
<GlassToaster accentColor={gameColors.mafia.accent} />

// Trigger from anywhere
import { toast } from "sonner";
toast("Игрок присоединился");
toast.success("Победа!");
toast.error("Соединение потеряно");
toast("Твой ход!", { description: "30 секунд", duration: 5000 });
```
