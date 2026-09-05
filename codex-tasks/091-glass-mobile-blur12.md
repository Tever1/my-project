# TASK-091 — glassMobileSolid: lighter blur(12px) on mobile

## Context

Сейчас на мобильном панели AccountDropdown и AuthDropdown используют
`rgba(20,18,32,0.96)` без blur — solid dark фон. На десктопе — полупрозрачный
фон + `blur(24px)`. Визуально выглядят по-разному.

Решение: на мобильном использовать тот же фон что на десктопе, но `blur(12px)`
вместо `blur(24px)` — вдвое легче для GPU, визуально близко к десктопу.

## File

`src/lib/design/mobile-helpers.ts` **only**

---

## Current:

```ts
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

## Fix:

```ts
export function glassMobileSolid(
  isMobile: boolean,
  desktopBg: string
): Pick<CSSProperties, 'background' | 'backdropFilter' | 'WebkitBackdropFilter'> {
  const blur = isMobile ? 'blur(12px)' : 'blur(24px)';
  return {
    background: desktopBg,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
  };
}
```

---

## Whitelist

Только `src/lib/design/mobile-helpers.ts`.

## Acceptance

1. Мобильный получает `background: desktopBg` (не solid dark) и `blur(12px)`.
2. Десктоп получает `background: desktopBg` и `blur(24px)` — без изменений.
3. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/091-glass-mobile-blur12.md`
