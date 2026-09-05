# TASK-087 — AuthProvider: memoize value + narrow selectors

## Context

`AuthContext.Provider` передаёт `value={{ user, isLoading, sendCode, ... }}` —
объектный литерал без мемоизации. Каждый ре-рендер `AuthProvider` (а он
случается при любом изменении `user` или `isLoading`) создаёт новый объект →
все consumer'ы `useAuth()` ре-рендерятся, даже если им нужен только `sendCode`.

Это root cause флика AuthDropdown на TASK-085: `handleSetNickname` менял `user`
→ AuthProvider ре-рендерился → AuthDropdown ре-рендерился за 120ms exit-анимации.
Баг закрыт убиранием exit-анимации (TASK-085), но источник шума остался.

## Goal

1. Обернуть `value` в `useMemo` — объект меняется только при реальном изменении
   `user` или `isLoading` (все функции уже `useCallback` со стабильными deps).
2. Добавить два narrow-selector'а:
   - `useAuthUser()` — возвращает `{ user, isLoading }` (подписывается на state)
   - `useAuthActions()` — возвращает `{ sendCode, verifyCode, updateNickname, logout }`
     (стабильные функции, не зависят от state)
3. Оставить `useAuth()` для обратной совместимости — не менять его поведение.

## File

`src/lib/auth-context.tsx` **only**

---

## Fix

### Current (line 122–126):
```tsx
return (
  <AuthContext.Provider value={{ user, isLoading, sendCode, verifyCode, updateNickname, logout }}>
    {children}
  </AuthContext.Provider>
);
```

### Fix:
```tsx
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

// ... existing code unchanged ...

export function useAuthUser() {
  const { user, isLoading } = useContext(AuthContext);
  return { user, isLoading };
}

export function useAuthActions() {
  const { sendCode, verifyCode, updateNickname, logout } = useContext(AuthContext);
  return { sendCode, verifyCode, updateNickname, logout };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // ... existing state and callbacks unchanged ...

  const value = useMemo(
    () => ({ user, isLoading, sendCode, verifyCode, updateNickname, logout }),
    [user, isLoading, sendCode, verifyCode, updateNickname, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

Важно: `updateNickname` зависит от `user` (через `useCallback([user, saveUser])`),
поэтому `useMemo` пересоздаёт объект при смене `user`. Это ожидаемое поведение —
`sendCode`/`verifyCode`/`logout` при этом не меняются (стабильные ref'ы), но
пакуются в тот же объект. В будущем можно разбить на два контекста, сейчас —
достаточно мемоизации.

---

## Whitelist

Только `src/lib/auth-context.tsx`.

## Acceptance

1. `value` обёрнут в `useMemo` с dep array `[user, isLoading, sendCode, verifyCode, updateNickname, logout]`.
2. Экспортированы `useAuthUser()` и `useAuthActions()`.
3. `useAuth()` не изменён, возвращает тот же тип.
4. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/087-auth-context-memo.md`
