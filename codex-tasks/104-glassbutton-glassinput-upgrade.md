# TASK-104 — GlassButton upgrade + GlassInput focus animation

## Goal

Upgrade two existing UI components:
1. `GlassButton` — add `secondary` + `ghost` variants, add Framer Motion press-spring
2. `GlassInput` — add animated focus ring (glass border lights up on focus via CSS transition)

Do NOT change the existing `default`, `primary`, `danger` variants — only additive changes.
Do NOT touch any game files, server, or other components.

## Whitelist

- `src/components/ui/GlassButton.tsx`
- `src/components/ui/GlassInput.tsx`
- `src/app/globals.css` — add CSS for new variants only (`.glass-button-secondary`, `.glass-button-ghost`); do NOT remove existing rules

## Acceptance criteria

- `GlassButton` wraps its button in `motion.button` from `framer-motion`
- Press animation: `whileTap={{ scale: 0.96 }}` with `transition={{ type: 'spring', stiffness: 400, damping: 20 }}`
- New variants work:
  - `secondary` — semi-transparent white fill, white border, white text (subdued, not primary CTA)
  - `ghost` — no fill, no border, white/60 text, hover shows subtle bg
- `GlassInput` on focus: border transitions to `rgba(255,255,255,0.4)` with `box-shadow: 0 0 0 2px rgba(255,255,255,0.12)`. Transition duration ~200ms.
- All existing callers (`GlassButton variant="default"/"primary"/"danger"`) still compile and look unchanged
- `npm run lint` passes (no new errors)
- `npm run build` passes

## Implementation notes

### GlassButton changes

```tsx
// wrap in motion.button, keep all existing props spread
import { motion } from 'framer-motion';

// add variants to variantClasses:
secondary: 'glass-button-secondary',
ghost: 'glass-button-ghost',

// wrap:
<motion.button
  whileTap={{ scale: 0.96 }}
  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
  className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
  {...props}
>
  {children}
</motion.button>
```

Note: `motion.button` accepts all standard button props via `...props` spread.
Make sure `type`, `onClick`, `disabled` all still work.

### GlassInput focus ring (CSS only, no JS)

In `globals.css`, update the existing `.glass-input:focus` rule to add the glow:

```css
.glass-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
```

Also add `transition: border-color 0.2s ease, box-shadow 0.2s ease;` to the base `.glass-input` rule so the transition applies on blur too.

### New CSS variants (globals.css)

```css
.glass-button-secondary {
  /* inherits layout from .glass-button base styles if you use @apply or just duplicate */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.85);
}
.glass-button-secondary:hover { background: rgba(255, 255, 255, 0.14); }
.glass-button-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

.glass-button-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
}
.glass-button-ghost:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.9); }
.glass-button-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
```

## Report

Write report to `codex-reports/104-glassbutton-glassinput-upgrade.md`.
Include: what changed, any lint/build errors encountered and how resolved.
Do NOT commit.
