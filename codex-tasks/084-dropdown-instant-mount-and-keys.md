# TASK-084 — Instant mount + AnimatePresence keys for Auth/AccountDropdown

## Context

После TASK-082/083 на мобильном остались два визуальных бага дропдаунов
(в `Lobby.tsx`):

1. **Мерцание при открытии**: тап по иконке аккаунта → меню «просвечивает»
   ~150ms (видно что за ним). Причина — Framer Motion fade-in `opacity 0→1`
   за 0.15s. Пока opacity не достигла 1, панель полупрозрачна.

2. **«Появляется обратно» при закрытии**: тап вне меню → меню закрывается,
   но на 1 frame вновь становится видимым, потом пропадает. Причина — у
   `<AccountDropdown>` и `<AuthDropdown>` внутри `<AnimatePresence>` нет
   `key`. Lobby часто ре-рендерится (socket events, presence count, room
   state). Без `key` AnimatePresence теряет соответствие instance во время
   exit-анимации и переключается обратно на `animate` состояние на кадр.

## Goal

- Меню появляется мгновенно (без fade-in) на мобильном.
- Меню закрывается чисто без «возврата на миллисекунду».
- Десктоп — без изменений.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Fix 1 — Добавить `key` обоим дропдаунам в местах рендера

### Current (around line 862-880):
```jsx
<AnimatePresence>
  {authMenuOpen && (
    <AuthDropdown
      isMobile={isMobile}
      accent={accent}
      deep={deep}
      onClose={onCloseAuth}
    />
  )}
</AnimatePresence>
<AnimatePresence>
  {accountMenuOpen && (
    <AccountDropdown
      isMobile={isMobile}
      onClose={onCloseAccountMenu}
      onLogout={onLogout}
    />
  )}
</AnimatePresence>
```

### Fix:
Добавить `key` каждому компоненту:

```jsx
<AnimatePresence>
  {authMenuOpen && (
    <AuthDropdown
      key="auth-dropdown"
      isMobile={isMobile}
      accent={accent}
      deep={deep}
      onClose={onCloseAuth}
    />
  )}
</AnimatePresence>
<AnimatePresence>
  {accountMenuOpen && (
    <AccountDropdown
      key="account-dropdown"
      isMobile={isMobile}
      onClose={onCloseAccountMenu}
      onLogout={onLogout}
    />
  )}
</AnimatePresence>
```

---

## Fix 2 — Мгновенное появление на мобильном

### Current (AuthDropdown, around line 1352):
```jsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.15, ease: 'easeOut' }}
  style={containerStyle}
>
```

### Fix:
На мобильном `initial={false}` — Framer Motion пропускает enter-анимацию,
панель появляется сразу при opacity 1. Exit быстрее (0.12s easeIn — snappy close).
Десктоп оставить как было.

```jsx
<motion.div
  initial={isMobile ? false : { opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={isMobile ? { duration: 0.12, ease: 'easeIn' } : { duration: 0.15, ease: 'easeOut' }}
  style={containerStyle}
>
```

---

### Current (AccountDropdown, around line 1543):
```jsx
<motion.div
  initial={isMobile ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
  animate={isMobile ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
  exit={isMobile ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
  transition={isMobile ? { duration: 0.15, ease: 'easeOut' } : spring.snappy}
  style={containerStyle}
  onClick={isMobile ? onClose : undefined}
>
```

### Fix:
Та же логика — мгновенное появление на мобильном:

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

---

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. `<AuthDropdown>` и `<AccountDropdown>` имеют `key` атрибут в AnimatePresence.
2. На мобильном — `initial={false}`, появление мгновенное.
3. На мобильном — exit `0.12s ease-in` (snappy).
4. Десктоп — без изменений.
5. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/084-dropdown-instant-mount-and-keys.md`
