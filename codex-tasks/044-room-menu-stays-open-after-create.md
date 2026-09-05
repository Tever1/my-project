# TASK-044: Room menu stays open after room creation

## Problem

After `room:create` succeeds, `setRoomMenuOpen(true)` is called and then
`router.push('/lobby/CODE')` navigates to the new URL. The navigation unmounts
the current Lobby instance and mounts a fresh one — fresh state means
`roomMenuOpen = false`. The menu flashes for one frame, then disappears.

File: `src/components/lobby/Lobby.tsx`

## Root cause

Lines ~340–342:
```js
setRoomCode(res.code);
setRoomMenuOpen(true);       // set on OLD instance
router.push(`/lobby/${res.code}`); // NEW instance mounts with roomMenuOpen=false
```

## Fix

### 1. Navigate with a flag param

In the `room:create` callback (around line 341), change:
```js
router.push(`/lobby/${res.code}`);
```
to:
```js
router.push(`/lobby/${res.code}?m=1`);
```

Remove the `setRoomMenuOpen(true)` line here — the new instance will handle it.

### 2. Read the param on mount in the new Lobby instance

At the top of the Lobby component, add `useSearchParams` import from `next/navigation`
(it's already importing `useRouter` from there).

Add a `useEffect` that runs once on mount (empty dep array):
- Get `searchParams` via `useSearchParams()`
- If `searchParams.get('m') === '1'`, call `setRoomMenuOpen(true)`
- Then call `router.replace(pathname)` to strip the `?m=1` from the URL
  (use `usePathname()` from `next/navigation` for the current path)

### 3. Import additions

Add to the existing import from `next/navigation`:
```js
import { useRouter, useSearchParams, usePathname } from "next/navigation";
```

## Whitelist

- `src/components/lobby/Lobby.tsx` — only file to change

## Acceptance

1. Create a room → room menu opens and stays open
2. Refreshing the page at `/lobby/CODE` does NOT open the menu (the `?m=1` param
   is gone after the replace)
3. Manually clicking the room button still toggles the menu normally
4. No TypeScript errors (`npm run build` or `npx tsc --noEmit` passes)

## Do NOT

- Touch any other files
- Change the socket logic or room flow
- Add sessionStorage or cookies — URL param only
