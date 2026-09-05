# TASK-063: Fix — join input после logout + повторный вход без refresh

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение 1: showJoinRoom — реактивно от roomCode (~строка 668)

Найти:

```tsx
          showJoinRoom={!isRoomRoute}
```

Заменить на:

```tsx
          showJoinRoom={!roomCode}
```

**Почему:** `isRoomRoute` статично — вычисляется из URL-пропа и никогда не меняется
в рамках сессии. После logout `setRoomCode(null)` очищает `roomCode`, но `isRoomRoute`
остаётся `true`, поэтому строка ввода кода комнаты не появляется. `roomCode` —
реактивный state, меняется при logout/leave/not-found.

---

## Изменение 2: handleVerifyCode — пропустить шаг nickname для возвращающихся (~строка 1279-1286)

Найти в функции `handleVerifyCode` внутри `AuthDropdown`:

```ts
    const ok = await verifyCode(digits, code);
    setLoading(false);
    if (ok) {
      setStep('nickname');
      setError('');
    } else {
      setError('Неверный код');
    }
```

Заменить на:

```ts
    const ok = await verifyCode(digits, code);
    setLoading(false);
    if (ok) {
      const existingRaw = localStorage.getItem(`party-hub-user-${digits}`);
      const hasNickname = existingRaw
        ? ((JSON.parse(existingRaw) as { nickname?: string }).nickname?.length ?? 0) >= 2
        : false;
      if (hasNickname) {
        onClose();
      } else {
        setStep('nickname');
      }
      setError('');
    } else {
      setError('Неверный код');
    }
```

**Почему:** `verifyCode` в auth-context сохраняет пользователя из
`party-hub-user-${phone}` — там уже есть nickname для возвращающегося игрока.
Но UI всегда шёл на шаг 'nickname'. Теперь если nickname уже есть (≥2 символа) —
сразу закрываем дропдаун через `onClose()`. Для новых пользователей (нет данных или
пустой nickname) — шаг 'nickname' как прежде.

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- После logout на `/lobby/CODE`: строка ввода кода комнаты появляется сразу (без refresh)
- Возвращающийся пользователь (уже есть nickname): после ввода кода — меню закрывается, имя отображается
- Новый пользователь (первый вход): после ввода кода — появляется шаг ввода имени

## Не трогать

- Всё остальное, включая auth-context, socket-handlers, другие компоненты

## Отчёт

`codex-reports/063-fix-join-input-and-auth-relogin.md`
