# TASK-032 — Выпадающее меню аккаунта в TopBar

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Задача

Когда пользователь залогинен и нажимает на таблетку с именем (`AvatarPill`) в TopBar,
должно открываться выпадающее меню с двумя кнопками: **«Настройки»** и **«Выход»**.

- **Настройки** — кнопка есть, но пока ничего не делает (placeholder).
- **Выход** — вызывает `logout()` из `useAuth()`, закрывает меню.

Визуальный стиль — аналогичен `AuthDropdown` (тот же glass-look).

---

## Whitelist файлов

Менять только **один файл**:

- `src/components/lobby/Lobby.tsx`

**Не трогать никакие другие файлы.**

---

## Что сделать

### 1. Добавить state `accountMenuOpen` в компонент `Lobby`

Найти строку с `const [authMenuOpen, setAuthMenuOpen] = useState(false);` и рядом добавить:

```ts
const [accountMenuOpen, setAccountMenuOpen] = useState(false);
```

### 2. Добавить handlers в `Lobby`

```ts
const openAccountMenu = useCallback(() => setAccountMenuOpen(true), []);
const closeAccountMenu = useCallback(() => setAccountMenuOpen(false), []);
```

### 3. Передать props в `TopBar`

Найти вызов `<TopBar` в JSX и добавить два новых пропа:

```tsx
accountMenuOpen={accountMenuOpen}
onOpenAccountMenu={openAccountMenu}
onCloseAccountMenu={closeAccountMenu}
```

### 4. Обновить интерфейс `TopBar`

В пропсах функции `TopBar` добавить:

```ts
accountMenuOpen: boolean;
onOpenAccountMenu: () => void;
onCloseAccountMenu: () => void;
```

### 5. Передать props в `AvatarPill` внутри `TopBar`

Найти `<AvatarPill` в теле `TopBar` и добавить проп:

```tsx
onAccountClick={onOpenAccountMenu}
```

### 6. Добавить `AccountDropdown` рядом с `AuthDropdown` в `TopBar`

В том месте, где сейчас:

```tsx
<AnimatePresence>
  {authMenuOpen && (
    <AuthDropdown
      isMobile={isMobile}
      onClose={onCloseAuth}
    />
  )}
</AnimatePresence>
```

Добавить **второй** `AnimatePresence` блок ниже:

```tsx
<AnimatePresence>
  {accountMenuOpen && (
    <AccountDropdown
      isMobile={isMobile}
      onClose={onCloseAccountMenu}
    />
  )}
</AnimatePresence>
```

### 7. Обновить `AvatarPill`

Добавить проп `onAccountClick: () => void` в интерфейс.
Заменить `onClick={() => console.log("account panel — TODO")}` на `onClick={onAccountClick}`.

### 8. Создать компонент `AccountDropdown`

Добавить новую функцию после `AuthDropdown`. Структура полностью аналогична
`AuthDropdown`, но без шагов — только два пункта меню.

```tsx
function AccountDropdown({
  isMobile,
  onClose,
}: {
  isMobile: boolean;
  onClose: () => void;
}) {
  const { logout } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside закрывает меню (скопировать из AuthDropdown)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Escape закрывает меню (скопировать из AuthDropdown)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Позиционирование: desktop — absolute под кнопкой (top: calc(100%+8px), right: 0),
  // mobile — fixed с overlay (как в AuthDropdown)
  const dropdownStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }
    : { position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200 };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={spring.snappy}
      style={dropdownStyle}
    >
      {/* Mobile: полупрозрачный overlay-фон */}
      {isMobile && (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}
      {/* Само меню */}
      <div
        style={{
          position: isMobile ? 'relative' : undefined,
          background: 'rgba(30,30,35,0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: isMobile ? '20px 20px 0 0' : 16,
          padding: '8px',
          minWidth: 180,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Настройки */}
        <button
          onClick={() => { /* placeholder — functionality TBD */ }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          ⚙️ Настройки
        </button>

        {/* Разделитель */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 8px' }} />

        {/* Выход */}
        <button
          onClick={() => { logout(); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'transparent',
            border: 'none',
            color: '#ff453a',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Выход
        </button>
      </div>
    </motion.div>
  );
}
```

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- Клик на `AvatarPill` (залогиненный пользователь) → открывается `AccountDropdown`.
- `AccountDropdown` содержит кнопки «Настройки» и «Выход».
- Кнопка «Выход» вызывает `logout()` и закрывает меню. Пользователь становится
  незалогиненным, в TopBar снова показывается «Вход».
- Кнопка «Настройки» ничего не делает (placeholder).
- Клик вне меню и Escape закрывают меню.
- `AuthDropdown` (вход) не сломан.

---

## Не делать

- Не трогать `src/app/profile/page.tsx`.
- Не добавлять роутинг в «Настройки» — просто пустая кнопка.
- Не коммитить.

---

## Отчёт

После выполнения создать `codex-reports/032-account-dropdown.md` с:
- Список изменений.
- Результаты `npm run lint` и `npx tsc --noEmit`.
- Любые отклонения от ТЗ.
