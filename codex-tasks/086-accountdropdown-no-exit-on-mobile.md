# TASK-086 — AccountDropdown: instant disappear on mobile (no exit animation)

## Context

После TASK-084 баг AccountDropdown «уходил» на одном тесте, но он intermittent —
вернулся. TASK-085 для AuthDropdown решился именно убиранием exit-анимации
(окно мгновенно исчезает). Применяем тот же паттерн к AccountDropdown.

Симптом: тап вне меню → меню закрывается → на миллисекунду возвращается → пропадает.

Root cause: за 120ms exit-анимации Lobby ре-рендерится из-за socket events
(presence:count, room:state), Framer Motion + iOS Safari моргает motion value.

## Goal

На мобильном AccountDropdown исчезает мгновенно, без fade-анимации → exit-окно
для глитча отсутствует.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Fix — AccountDropdown motion.div: instant on mobile

### Current (around line 1543):
```jsx
<motion.div
  initial={isMobile ? false : { opacity: 0, y: -8, scale: 0.97 }}
  animate={isMobile ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
  exit={isMobile ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
  transition={isMobile ? { duration: 0.12, ease: 'easeIn' } : spring.snappy}
  style={containerStyle}
  onClick={isMobile ? onClose : undefined}
>
```

### Fix:
То же что в TASK-085 для AuthDropdown: на мобильном `exit={{ opacity: 1 }}` +
`transition.duration: 0`. Десктоп нетронут.

```jsx
<motion.div
  initial={isMobile ? false : { opacity: 0, y: -8, scale: 0.97 }}
  animate={isMobile ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
  exit={isMobile ? { opacity: 1 } : { opacity: 0, y: -8, scale: 0.97 }}
  transition={isMobile ? { duration: 0 } : spring.snappy}
  style={containerStyle}
  onClick={isMobile ? onClose : undefined}
>
```

---

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. `AccountDropdown` на мобильном — `exit={{ opacity: 1 }}`, `transition.duration: 0`.
2. Тап вне меню → окно исчезает мгновенно, без миллисекундного возврата.
3. Десктоп — `exit={{ opacity: 0, y: -8, scale: 0.97 }}`, `spring.snappy` (не тронуто).
4. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/086-accountdropdown-no-exit-on-mobile.md`
