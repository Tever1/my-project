# TASK-064: Fix — корректный повторный вход после logout без refresh

## Файлы

**Whitelist:** `src/components/lobby/Lobby.tsx`, `src/lib/auth-context.tsx`

---

## Изменение 1: handleLogout — закрывать AccountDropdown (~строка 477)

Найти в `Lobby.tsx` функцию `handleLogout`:

```ts
  const handleLogout = useCallback(() => {
    if (roomCode) {
      emit('room:leave', {});
      setRoomCode(null);
      setRoomState(null);
      setRoomMenuOpen(false);
    }
    logout();
  }, [emit, logout, roomCode]);
```

Заменить на:

```ts
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

**Почему:** после logout `accountMenuOpen` оставался `true` — AccountDropdown
продолжал висеть. Когда пользователь пытался открыть AuthDropdown, оба дропдауна
конфликтовали, вход работал некорректно.

---

## Изменение 2: logout() в auth-context — очищать SMS-данные (~строка 114)

Найти в `src/lib/auth-context.tsx`:

```ts
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('party-hub-user');
  }, []);
```

Заменить на:

```ts
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('party-hub-user');
    localStorage.removeItem('party-hub-sms-code');
    localStorage.removeItem('party-hub-sms-phone');
  }, []);
```

**Почему:** после logout старый SMS-код оставался в localStorage. При повторном
входе пользователь мог ввести старый код (или он мог применяться автоматически).
Очистка гарантирует чистый старт авторизации.

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- Войти → создать комнату → выйти из аккаунта → AccountDropdown закрывается сразу
- Нажать «Войти» (AvatarPill) → AuthDropdown открывается с шага «phone», без артефактов
- Пройти авторизацию заново (тот же или другой телефон) → имя отображается, комната не висит

## Не трогать

- Всё остальное кроме двух описанных мест

## Отчёт

`codex-reports/064-fix-logout-relogin.md`
