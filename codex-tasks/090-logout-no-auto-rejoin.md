# TASK-090 — Fix logout: navigate to / to prevent auto-rejoin

## Context

Баг: пользователь на мобильном заходит в комнату через QR → URL становится
`/lobby/ABXY7K` → `initialCode = "ABXY7K"`. После выхода из аккаунта URL
не меняется. При повторном входе срабатывает `useEffect` (line ~273):

```tsx
useEffect(() => {
  if (!initialCode || !user || !user.nickname || !isConnected) return;
  emit('room:join', { code: initialCode, playerId: user.id, nickname: user.nickname }, ...);
}, [emit, initialCode, isConnected, router, user]);
```

`initialCode` всё ещё "ABXY7K" → пользователь автоматически заново присоединяется
к комнате. При этом старый сессионный слот ещё не исчез (30-секундный grace period
на сервере) → в комнате оказываются 3 игрока вместо 2.

## Root Cause

`handleLogout` не навигирует на `/`. После выхода URL остаётся `/lobby/CODE`,
`initialCode` остаётся CODE, и при следующем логине `useEffect` авто-присоединяет
пользователя обратно в комнату.

## Fix

В `handleLogout` добавить `router.push('/')` — уходим на корень, `initialCode`
становится null, автоматического re-join больше нет.

Также добавить `router` в массив зависимостей `useCallback`.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Current (around line 474):

```tsx
const handleLogout = useCallback(() => {
  if (roomCode) {
    emit('room:leave', {});
    setRoomCode(null);
    setRoomState(null);
    setRoomMenuOpen(false);
  }
  setAccountMenuOpen(false);
  logout();
}, [emit, logout, roomCode]);
```

## Fix:

```tsx
const handleLogout = useCallback(() => {
  if (roomCode) {
    emit('room:leave', {});
    setRoomCode(null);
    setRoomState(null);
    setRoomMenuOpen(false);
  }
  setAccountMenuOpen(false);
  logout();
  router.push('/');
}, [emit, logout, roomCode, router]);
```

---

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. `handleLogout` вызывает `router.push('/')` после `logout()`.
2. `router` добавлен в dep array `useCallback`.
3. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/090-logout-no-auto-rejoin.md`
