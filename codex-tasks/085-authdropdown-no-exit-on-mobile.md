# TASK-085 — AuthDropdown: instant disappear on mobile (no exit animation)

## Context

После TASK-084 баг на AccountDropdown починен, но на AuthDropdown остался.
Симптом: после ввода никнейма окно исчезает, но на миллисекунду возвращается.

**Root cause:** `handleSetNickname` делает два state-update одновременно:
1. `updateNickname(...)` → `setUser(...)` в AuthProvider
2. `onClose()` → `setAuthMenuOpen(false)` в Lobby

AuthProvider's `value={{ ... }}` создаёт новый объект на каждом рендере. Когда
user меняется → AuthProvider ре-рендерится → ВСЕ consumer'ы `useAuth()`
ре-рендерятся, включая сам AuthDropdown (который использует
`const { sendCode, verifyCode, updateNickname } = useAuth();`).

Этот ре-рендер происходит ВО ВРЕМЯ exit-анимации (120ms), и на iOS Safari это
вызывает визуальный glitch — motion value моргает.

У AccountDropdown такого нет потому что при его закрытии меняется только
`accountMenuOpen`, контекст не трогается.

## Goal

Убрать exit-анимацию AuthDropdown на мобильном. Окно появляется и исчезает
мгновенно. Никакой fade — никакого моргания.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Fix — AuthDropdown motion.div: instant on mobile

### Current (around line 1354):
```jsx
<motion.div
  initial={isMobile ? false : { opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={isMobile ? { duration: 0.12, ease: 'easeIn' } : { duration: 0.15, ease: 'easeOut' }}
  style={containerStyle}
>
```

### Fix:
На мобильном — `exit` без opacity-изменения + `transition.duration: 0` → мгновенное исчезновение, никакой анимации. На десктопе оставить как было.

```jsx
<motion.div
  initial={isMobile ? false : { opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={isMobile ? { opacity: 1 } : { opacity: 0 }}
  transition={isMobile ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }}
  style={containerStyle}
>
```

Логика: на мобильном `exit={{ opacity: 1 }}` означает «не меняй opacity на выходе» (остаётся 1, но AnimatePresence всё равно размонтирует компонент после `duration: 0`). На десктопе fade-out 0→0.15s сохраняется.

---

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. `AuthDropdown` на мобильном — `exit={{ opacity: 1 }}`, `transition.duration: 0`.
2. После ввода никнейма окно исчезает мгновенно, без миллисекундного возврата.
3. Десктоп — `exit={{ opacity: 0 }}`, `duration: 0.15s` (не тронуто).
4. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/085-authdropdown-no-exit-on-mobile.md`
