# TASK-105 — New UI components: PlayerAvatar, Badge, Chip, Skeleton

## Goal

Create four new reusable components in `src/components/ui/`.
Also add a demo section for all four in `src/app/design-tokens/page.tsx`.

Do NOT touch any game files, lobby files, server, or other components outside the whitelist.

## Whitelist

- `src/components/ui/PlayerAvatar.tsx` — create new
- `src/components/ui/Badge.tsx` — create new
- `src/components/ui/Chip.tsx` — create new
- `src/components/ui/Skeleton.tsx` — create new
- `src/components/ui/index.ts` — create new (barrel export for all ui components)
- `src/app/design-tokens/page.tsx` — add demo section at the bottom, before the closing `</main>` tag

## Acceptance criteria

- All four components compile cleanly
- `npm run lint` passes (no new errors)
- `npm run build` passes
- Demo section visible on `/design-tokens` page (no server needed to verify — just lint+build)

---

## Component specs

### 1. PlayerAvatar (`src/components/ui/PlayerAvatar.tsx`)

A circular avatar showing a player's initial with a deterministic gradient background based on nickname.

```tsx
'use client';

interface PlayerAvatarProps {
  nickname: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}
```

- **Sizes:** `xs`=24px, `sm`=32px, `md`=40px, `lg`=56px
- **Background:** deterministic gradient from nickname — use `charCodeAt(0) % GRADIENTS.length` to pick from a fixed array of 6 gradients:
  ```ts
  const GRADIENTS = [
    'linear-gradient(135deg, #ff9f0a, #ff375f)',   // orange-red
    'linear-gradient(135deg, #8b5cf6, #ec4899)',   // purple-pink
    'linear-gradient(135deg, #14b8a6, #3b82f6)',   // teal-blue
    'linear-gradient(135deg, #facc15, #f59e0b)',   // yellow-amber
    'linear-gradient(135deg, #ef4444, #f97316)',   // red-orange
    'linear-gradient(135deg, #38bdf8, #818cf8)',   // sky-indigo
  ];
  ```
- **Initial:** `nickname.charAt(0).toUpperCase()`
- **Font size:** 40% of size (e.g. md=40px → font 16px)
- **Font weight:** 700, color white
- No border, borderRadius 50%

---

### 2. Badge (`src/components/ui/Badge.tsx`)

Small inline status/info tag. Not interactive.

```tsx
'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'game';
  gameColor?: string; // CSS color, used when variant='game'
  className?: string;
}
```

Styles (inline or CSS class — your choice, keep it simple):
- Base: `display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap;`
- `default`: `background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.15)`
- `success`: `background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.25)`
- `warning`: `background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25)`
- `danger`: `background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.25)`
- `game`: `background: ${gameColor}20; color: ${gameColor}; border: 1px solid ${gameColor}40` (use gameColor with opacity)

---

### 3. Chip (`src/components/ui/Chip.tsx`)

Selectable/removable tag. Interactive — used for player selections, categories, tags.

```tsx
'use client';

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}
```

- Base style: `display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7);`
- `selected=true`: `background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.4); color: white;`
- `disabled=true`: `opacity: 0.4; cursor: not-allowed;`
- If `onRemove` provided: show `×` button (small, 14px) after children
- Wrap in `motion.div` with `whileTap={{ scale: 0.95 }}` (only when not disabled and onSelect provided)
- `onClick` calls `onSelect` if provided

---

### 4. Skeleton (`src/components/ui/Skeleton.tsx`)

Loading placeholder with shimmer animation.

```tsx
'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}
```

- Default: `width: 100%`, `height: 16px`, `borderRadius: 6px`
- Background: `rgba(255,255,255,0.06)`
- Shimmer: CSS animation `@keyframes skeleton-shimmer` — `background-position` shifts from `-200%` to `200%` using a linear-gradient mask:
  ```css
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.1) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite linear;
  ```
- Define keyframes in the component via a `<style>` tag or inline using a `@keyframes` rule injected once, or just add to `globals.css`.

**Easiest approach:** add the keyframes to `globals.css` and use className in the component.

In `globals.css` add:
```css
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite linear;
}
```

Whitelist for globals.css — **add ONLY** the keyframes + `.skeleton-shimmer` class. Do not modify any existing rules.

Additional whitelist entry: `src/app/globals.css` (append only)

---

### 5. Barrel export (`src/components/ui/index.ts`)

```ts
export { GlassButton } from './GlassButton';
export { GlassInput } from './GlassInput';
export { GlassCard } from './GlassCard';
export { LanguageToggle } from './LanguageToggle';
export { QRCode } from './QRCode';
export { PlayerAvatar } from './PlayerAvatar';
export { Badge } from './Badge';
export { Chip } from './Chip';
export { Skeleton } from './Skeleton';
```

---

### 6. Demo section in design-tokens page

In `src/app/design-tokens/page.tsx`, import the four new components at the top:

```tsx
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
```

Find the closing `</main>` tag and insert a new section before it:

```tsx
{/* Phase E — New UI Components */}
<section style={{ marginBottom: 48 }}>
  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'rgba(255,255,255,0.9)' }}>
    Фаза E — UI Компоненты
  </h2>

  {/* PlayerAvatar */}
  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PlayerAvatar</h3>
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
    <PlayerAvatar nickname="Аня" size="xs" />
    <PlayerAvatar nickname="Боря" size="sm" />
    <PlayerAvatar nickname="Вера" size="md" />
    <PlayerAvatar nickname="Гена" size="lg" />
    <PlayerAvatar nickname="Дима" size="lg" />
    <PlayerAvatar nickname="Женя" size="lg" />
  </div>

  {/* Badge */}
  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Badge</h3>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
    <Badge>По умолчанию</Badge>
    <Badge variant="success">Хост</Badge>
    <Badge variant="warning">8 онлайн</Badge>
    <Badge variant="danger">Выбыл</Badge>
    <Badge variant="game" gameColor="#8b5cf6">Мафия</Badge>
    <Badge variant="game" gameColor="#facc15">Квиз</Badge>
    <Badge variant="game" gameColor="#ef4444">Крокодил</Badge>
  </div>

  {/* Chip */}
  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Chip</h3>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
    <Chip>Обычный</Chip>
    <Chip selected>Выбран</Chip>
    <Chip onRemove={() => {}}>С крестиком</Chip>
    <Chip disabled>Disabled</Chip>
  </div>

  {/* Skeleton */}
  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Skeleton</h3>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}>
    <Skeleton height={16} borderRadius={4} />
    <Skeleton height={16} width="60%" borderRadius={4} />
    <Skeleton height={40} borderRadius={8} />
    <div style={{ display: 'flex', gap: 10 }}>
      <Skeleton width={40} height={40} borderRadius="50%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
        <Skeleton height={12} width="70%" borderRadius={4} />
        <Skeleton height={12} width="40%" borderRadius={4} />
      </div>
    </div>
  </div>
</section>
```

## Report

Write report to `codex-reports/105-new-ui-components.md`.
Include: files created, any issues, lint/build status.
Do NOT commit.
