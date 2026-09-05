# TASK-066: Fix — verifyCode всегда очищает nickname при входе

## Файлы

**Whitelist:** только `src/lib/auth-context.tsx`

---

## Проблема

`verifyCode` загружает существующего пользователя из `party-hub-user-${phone}`
вместе с его nickname. После `saveUser(userData)` в Lobby срабатывает:

```ts
useEffect(() => {
  if (user?.nickname) queueMicrotask(() => setAuthMenuOpen(false));
}, [user?.nickname]);
```

AuthDropdown закрывается раньше, чем пользователь видит шаг 'nickname'.

## Изменение (~строка 76)

Найти в `src/lib/auth-context.tsx`:

```ts
  const verifyCode = useCallback(async (phone: string, code: string): Promise<boolean> => {
    // In production, verify against server
    const savedCode = localStorage.getItem('party-hub-sms-code');
    const savedPhone = localStorage.getItem('party-hub-sms-phone');

    if (code === savedCode && phone === savedPhone) {
      const existingData = localStorage.getItem(`party-hub-user-${phone}`);
      let userData: User;

      if (existingData) {
        userData = JSON.parse(existingData);
      } else {
        userData = {
          id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          phone,
          nickname: '',
          stats: { gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
          gameHistory: [],
        };
        localStorage.setItem(`party-hub-user-${phone}`, JSON.stringify(userData));
      }

      saveUser(userData);
      return true;
    }
    return false;
  }, [saveUser]);
```

Заменить на:

```ts
  const verifyCode = useCallback(async (phone: string, code: string): Promise<boolean> => {
    // In production, verify against server
    const savedCode = localStorage.getItem('party-hub-sms-code');
    const savedPhone = localStorage.getItem('party-hub-sms-phone');

    if (code === savedCode && phone === savedPhone) {
      const existingData = localStorage.getItem(`party-hub-user-${phone}`);
      let userData: User;

      if (existingData) {
        const existing = JSON.parse(existingData) as User;
        userData = { ...existing, nickname: '' };
      } else {
        userData = {
          id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          phone,
          nickname: '',
          stats: { gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
          gameHistory: [],
        };
        localStorage.setItem(`party-hub-user-${phone}`, JSON.stringify(userData));
      }

      saveUser(userData);
      return true;
    }
    return false;
  }, [saveUser]);
```

**Что изменилось:** `userData = JSON.parse(existingData)` →
`userData = { ...existing, nickname: '' }`.

Пользователь загружается с id/phone/stats/history из localStorage, но nickname
всегда сбрасывается в `''`. Lobby видит `user.nickname = ''` → не закрывает
AuthDropdown → пользователь видит шаг 'nickname' → вводит имя →
`updateNickname` устанавливает nickname → Lobby закрывает меню.

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- Второй вход без refresh: после ввода кода появляется шаг «Как вас зовут?»
- После ввода имени меню закрывается, имя отображается в AvatarPill

## Не трогать

- Всё остальное

## Отчёт

`codex-reports/066-verifycode-clear-nickname.md`
