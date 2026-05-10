# TASK-048: Подтверждение выхода из аккаунта + room:leave перед logout

## Цель

1. **Подтверждение выхода** — кнопка «Выйти» сначала показывает «Вы уверены? [Да, выйти] [Отмена]»,
   а не выходит сразу. Это нужно в двух местах: профиль-страница и AccountDropdown в лобби.

2. **Emit `room:leave` перед logout** — если пользователь состоит в комнате и нажимает выход
   из AccountDropdown в лобби, сначала эмитируем `room:leave`, и только потом `logout()`.
   Иначе сервер узнаёт об уходе только через disconnect (с 30с задержкой — TASK-047 частично
   решает это, но explicit leave правильнее).

## Файлы

**Whitelist:**
- `src/components/lobby/Lobby.tsx`
- `src/app/profile/page.tsx`

---

## Изменение 1: `src/app/profile/page.tsx`

### Добавить state

```tsx
const [confirmLogout, setConfirmLogout] = useState(false);
```

### Заменить кнопку «Выйти» (строки ~130-136)

Текущий код:
```tsx
<GlassButton
  variant="danger"
  className="w-full"
  onClick={() => { logout(); router.push('/'); }}
>
  {locale === 'ru' ? 'Выйти' : 'Log out'}
</GlassButton>
```

Новый код:
```tsx
{!confirmLogout ? (
  <GlassButton
    variant="danger"
    className="w-full"
    onClick={() => setConfirmLogout(true)}
  >
    {locale === 'ru' ? 'Выйти из аккаунта' : 'Log out'}
  </GlassButton>
) : (
  <div className="flex gap-3 w-full">
    <GlassButton
      variant="danger"
      className="flex-1"
      onClick={() => { logout(); router.push('/'); }}
    >
      {locale === 'ru' ? 'Да, выйти' : 'Yes, log out'}
    </GlassButton>
    <GlassButton
      variant="secondary"
      className="flex-1"
      onClick={() => setConfirmLogout(false)}
    >
      {locale === 'ru' ? 'Отмена' : 'Cancel'}
    </GlassButton>
  </div>
)}
```

---

## Изменение 2: `src/components/lobby/Lobby.tsx` — `handleLogout`

### Добавить `handleLogout` в основном `Lobby` компоненте

Рядом с `handleLeaveRoom` (~строка 438) добавить:

```ts
const handleLogout = useCallback(() => {
  if (roomCode) {
    emit('room:leave', {});
    setRoomCode(null);
    setRoomState(null);
    setRoomMenuOpen(false);
  }
  logout();
}, [roomCode, emit, logout]);
```

Нужно импортировать `logout` из `useAuth()` в Lobby (строка ~179).
Добавить `logout` в деструктуризацию: `const { user, isLoading } = useAuth();`
→ `const { user, isLoading, logout } = useAuth();`

### Добавить `onLogout` в пропы `TopBar`

Строка ~760-763 (тип) — добавить `onLogout: () => void;`  
Строка ~747 (деструктуризация TopBar) — добавить `onLogout,`  
Строка ~598 (вызов `<TopBar>`) — добавить `onLogout={handleLogout}`

### Передать `onLogout` в `AccountDropdown`

Строка ~834 (`<AccountDropdown>`) — добавить `onLogout={onLogout}`

### Изменить `AccountDropdown`

**Пропы** (добавить):
```ts
onLogout: () => void;
```

**Добавить state подтверждения:**
```ts
const [confirmLogout, setConfirmLogout] = useState(false);
```

**Заменить кнопку «Выход» (~строки 1494-1506):**

Текущий код:
```tsx
<button
  type="button"
  style={{ ...itemStyle, color: '#ff6b6b' }}
  onClick={() => {
    logout();
    onClose();
  }}
  onMouseEnter={...}
  onMouseLeave={...}
>
  <span aria-hidden="true">🚪</span>
  Выход
</button>
```

Новый код:
```tsx
{!confirmLogout ? (
  <button
    type="button"
    style={{ ...itemStyle, color: '#ff6b6b' }}
    onClick={() => setConfirmLogout(true)}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    <span aria-hidden="true">🚪</span>
    Выход
  </button>
) : (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '0 14px 4px' }}>
      Выйти из аккаунта?
    </div>
    <button
      type="button"
      style={{ ...itemStyle, color: '#ff6b6b', fontWeight: 700 }}
      onClick={() => { onLogout(); onClose(); }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,107,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      Да, выйти
    </button>
    <button
      type="button"
      style={itemStyle}
      onClick={() => setConfirmLogout(false)}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      Отмена
    </button>
  </div>
)}
```

Убрать из `AccountDropdown` деструктуризацию `logout` из `useAuth()` — теперь
вызов logout идёт через `onLogout` проп.

---

## Acceptance

- `npm run lint` и `npx tsc --noEmit` без новых ошибок
- В профиле: кнопка «Выйти» → появляется подтверждение → «Да, выйти» / «Отмена»
- В AccountDropdown лобби: кнопка «Выход» → подтверждение → «Да, выйти» / «Отмена»
- При выходе из лобби с активной комнатой — `room:leave` эмитится (виден в серверных логах)

## Не трогать

- Логику входа (AuthDropdown — другой компонент)
- RoomMenu (уже есть своё подтверждение из TASK-045)
- Игровую логику, socket-handlers, server.mts

## Отчёт

`codex-reports/048-logout-confirmation.md`
