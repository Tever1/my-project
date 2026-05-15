# TASK-088 — Extract mobile helpers: motionPropsInstant + glassMobileSolid

## Context

После TASK-082–086 в `Lobby.tsx` появились два повторяющихся паттерна:

**Паттерн A — instant motion на мобильном** (AuthDropdown ~line 1354, AccountDropdown ~line 1543):
```tsx
initial={isMobile ? false : { opacity: 0, ... }}
animate={isMobile ? { opacity: 1 } : { opacity: 1, ... }}
exit={isMobile ? { opacity: 1 } : { opacity: 0, ... }}
transition={isMobile ? { duration: 0 } : desktopTransition}
```

**Паттерн B — glass panel без blur на мобильном** (AuthDropdown ~line 1318, AccountDropdown ~line 1517, RoomMenu ~line 2063):
```ts
background: isMobile ? 'rgba(20, 18, 32, 0.96)' : desktopBg,
backdropFilter: isMobile ? undefined : 'blur(24px)',
WebkitBackdropFilter: isMobile ? undefined : 'blur(24px)',
```

Оба паттерна критичны для iOS Safari (убирают источник флика), и их нельзя
случайно сломать при будущих правках. Хелперы документируют намерение.

## Goal

1. Создать `src/lib/design/mobile-helpers.ts` с двумя helper'ами:
   - `motionPropsInstant(isMobile, desktopProps)` — возвращает motion props
   - `glassMobileSolid(isMobile, desktopBg)` — возвращает partial CSSProperties

2. Использовать эти helper'ы в `Lobby.tsx` в тех местах где паттерны сейчас
   инлайновые.

## Files

- `src/lib/design/mobile-helpers.ts` ← create new
- `src/components/lobby/Lobby.tsx` ← use helpers

---

## Fix 1 — Создать `src/lib/design/mobile-helpers.ts`

```ts
import type { TargetAndTransition, Transition, VariantLabels } from 'framer-motion';
import type { CSSProperties } from 'react';

interface DesktopMotionProps {
  initial?: TargetAndTransition | VariantLabels | boolean;
  animate?: TargetAndTransition | VariantLabels;
  exit?: TargetAndTransition | VariantLabels;
  transition?: Transition;
}

/**
 * Returns Framer Motion props that produce an instant (no-animation) mount/unmount
 * on mobile to prevent iOS Safari compositor glitches during parent re-renders.
 * Desktop gets the full animation.
 */
export function motionPropsInstant(
  isMobile: boolean,
  desktopProps: DesktopMotionProps
): DesktopMotionProps {
  if (!isMobile) return desktopProps;
  return {
    initial: false,
    animate: { opacity: 1 },
    exit: { opacity: 1 },
    transition: { duration: 0 },
  };
}

/**
 * Returns CSSProperties for a glass panel:
 * - mobile: solid dark background, no backdropFilter (A16 GPU relief)
 * - desktop: frosted glass with blur(24px)
 */
export function glassMobileSolid(
  isMobile: boolean,
  desktopBg: string
): Pick<CSSProperties, 'background' | 'backdropFilter' | 'WebkitBackdropFilter'> {
  if (isMobile) {
    return {
      background: 'rgba(20, 18, 32, 0.96)',
      backdropFilter: undefined,
      WebkitBackdropFilter: undefined,
    };
  }
  return {
    background: desktopBg,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  };
}
```

---

## Fix 2 — Использовать в `Lobby.tsx`

### Import (добавить в список импортов сверху):
```ts
import { motionPropsInstant, glassMobileSolid } from '@/lib/design/mobile-helpers';
```

### AuthDropdown — panelStyle (around line 1317):

Current:
```ts
background: isMobile ? 'rgba(20, 18, 32, 0.96)' : 'rgba(255,255,255,0.28)',
backdropFilter: isMobile ? undefined : 'blur(24px)',
WebkitBackdropFilter: isMobile ? undefined : 'blur(24px)',
```
Fix:
```ts
...glassMobileSolid(isMobile, 'rgba(255,255,255,0.28)'),
```

### AuthDropdown — motion.div (around line 1354):

Current:
```tsx
<motion.div
  initial={isMobile ? false : { opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={isMobile ? { opacity: 1 } : { opacity: 0 }}
  transition={isMobile ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }}
  style={containerStyle}
>
```
Fix:
```tsx
<motion.div
  {...motionPropsInstant(isMobile, {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15, ease: 'easeOut' },
  })}
  style={containerStyle}
>
```

### AccountDropdown — panelStyle (around line 1517):

Current:
```ts
background: isMobile ? 'rgba(20, 18, 32, 0.96)' : 'rgba(255,255,255,0.08)',
backdropFilter: isMobile ? undefined : 'blur(24px)',
WebkitBackdropFilter: isMobile ? undefined : 'blur(24px)',
```
Fix:
```ts
...glassMobileSolid(isMobile, 'rgba(255,255,255,0.08)'),
```

### AccountDropdown — motion.div (around line 1543):

Current:
```tsx
<motion.div
  initial={isMobile ? false : { opacity: 0, y: -8, scale: 0.97 }}
  animate={isMobile ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
  exit={isMobile ? { opacity: 1 } : { opacity: 0, y: -8, scale: 0.97 }}
  transition={isMobile ? { duration: 0 } : spring.snappy}
  style={containerStyle}
  onClick={isMobile ? onClose : undefined}
>
```
Fix:
```tsx
<motion.div
  {...motionPropsInstant(isMobile, {
    initial: { opacity: 0, y: -8, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.97 },
    transition: spring.snappy,
  })}
  style={containerStyle}
  onClick={isMobile ? onClose : undefined}
>
```

### RoomMenu GlassPanel — panelStyle (around line 2063):

Current:
```ts
background: isMobile ? "rgba(20, 18, 32, 0.92)" : "rgba(255,255,255,0.08)",
backdropFilter: isMobile ? undefined : "blur(24px)",
```

Примечание: `"rgba(20, 18, 32, 0.92)"` (0.92, не 0.96) — сохранить это значение
для RoomMenu, не менять на 0.96. `glassMobileSolid` использует 0.96. Поэтому
для RoomMenu инлайн остаётся как есть (разные opacity — разный дизайн).
Трогать эту строку не нужно.

---

## Whitelist

- `src/lib/design/mobile-helpers.ts` (создать)
- `src/components/lobby/Lobby.tsx` (только замены указанных выше блоков)

**Не трогать:**
- RoomMenu GlassPanel panelStyle (строки ~2063 — разные значения rgba, оставить инлайн)
- Любой другой код в Lobby.tsx вне указанных блоков

## Acceptance

1. Файл `src/lib/design/mobile-helpers.ts` создан с обеими функциями.
2. `AuthDropdown` panelStyle использует `glassMobileSolid`.
3. `AuthDropdown` motion.div использует `motionPropsInstant` через spread.
4. `AccountDropdown` panelStyle использует `glassMobileSolid`.
5. `AccountDropdown` motion.div использует `motionPropsInstant` через spread.
6. Behaviour не изменилось: на мобильном — instant, на десктопе — полная анимация.
7. `npm run lint` + `npm run build` чистые.
8. TypeScript errors = 0.

## Report

`codex-reports/088-mobile-helpers.md`
