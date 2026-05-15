# TASK-089 — AuthDropdown: switch to useAuthActions()

## Context

После TASK-087 в `auth-context.tsx` есть узкий хук `useAuthActions()`, который
возвращает только стабильные функции: `{ sendCode, verifyCode, updateNickname, logout }`.

`AuthDropdown` (around line 1219 in `Lobby.tsx`) сейчас вызывает `useAuth()` и
деструктурирует только `{ sendCode, verifyCode, updateNickname }` — state (`user`,
`isLoading`) ему не нужен. Из-за этого `AuthDropdown` ре-рендерится каждый раз,
когда меняется `user` в AuthProvider — хотя ничего из зависящего от `user` он
не рендерит.

Переключение на `useAuthActions()` устраняет эти лишние ре-рендеры полностью.

## Goal

Заменить `useAuth()` → `useAuthActions()` внутри `AuthDropdown` в `Lobby.tsx`.
Импорт обновить соответственно.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Fix

### Import (around line 22):

Current:
```ts
import { useAuth, type User } from "@/lib/auth-context";
```

Fix:
```ts
import { useAuth, useAuthActions, type User } from "@/lib/auth-context";
```

### AuthDropdown hook call (around line 1219):

Current:
```ts
const { sendCode, verifyCode, updateNickname } = useAuth();
```

Fix:
```ts
const { sendCode, verifyCode, updateNickname } = useAuthActions();
```

**Больше ничего не трогать.** Основной `Lobby` на строке ~180 по-прежнему
использует `useAuth()` — не менять.

---

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. `useAuthActions` добавлен в import из `@/lib/auth-context`.
2. `AuthDropdown` вызывает `useAuthActions()` вместо `useAuth()`.
3. Основной Lobby (line ~180) по-прежнему использует `useAuth()` — не тронут.
4. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/089-authdropdown-use-auth-actions.md`
