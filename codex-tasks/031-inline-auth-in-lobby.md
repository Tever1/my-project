# TASK-031 — Встроить авторизацию в лобби, удалить /auth страницы

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex
**Сложность:** complex → запускать в Codex Desktop

---

## Цель

Убрать отдельные страницы `/auth` и `/auth/verify`. Логин встраивается прямо
в TopBar лобби: кнопка «Вход» → выпадающий popup с тремя шагами (телефон → код
→ никнейм). После логина popup закрывается, юзер остаётся на той же странице.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — основные изменения (новый `AuthDropdown`,
  рефактор `AvatarPill`, `TopBar`, `Lobby` state)
- `src/app/auth/page.tsx` — **удалить**
- `src/app/auth/verify/page.tsx` — **удалить** (и пустую директорию если останется)
- `src/app/profile/page.tsx` — убрать 2 redirect'а на `/auth`

**Не трогать:** `src/lib/auth-context.tsx`, любые игровые страницы, server.mts.

---

## Детали реализации

### 1. Новый state в `Lobby` (строки ~175+)

Добавить в `Lobby` component:
```ts
const [authMenuOpen, setAuthMenuOpen] = useState(false);
const openAuth = useCallback(() => setAuthMenuOpen(true), []);
const closeAuth = useCallback(() => setAuthMenuOpen(false), []);
```

После успешного auth (определить через `useEffect` на `user`) — закрывать popup:
```ts
useEffect(() => {
  if (user?.nickname) setAuthMenuOpen(false);
}, [user?.nickname]);
```

### 2. Заменить redirect'ы на `/auth` в `Lobby` (строки 207-209, 289-291)

**Было** (строка 207-209):
```ts
if (!isRoomRoute || isLoading || user) return;
router.push(`/auth?redirect=/lobby/${initialCode}`);
```
**Стало:**
```ts
if (!isRoomRoute || isLoading || user) return;
setAuthMenuOpen(true);
```

**Было** (строка 289-291):
```ts
if (!user?.id || !user.nickname) {
  router.push("/auth?redirect=/");
  return ...
}
```
**Стало:**
```ts
if (!user?.id || !user.nickname) {
  setAuthMenuOpen(true);
  return { playerId: '', nickname: '' };
}
```

### 3. Пробросить в `TopBar` (строка ~544)

Добавить пропы при вызове `<TopBar ...>`:
```tsx
<TopBar
  ...
  user={user}
  authMenuOpen={authMenuOpen}
  onOpenAuth={openAuth}
  onCloseAuth={closeAuth}
/>
```

### 4. Обновить `TopBar` — добавить пропы + передать в `AvatarPill` (строки 627-699)

Добавить в props типа `TopBar`:
```ts
user: User | null;
authMenuOpen: boolean;
onOpenAuth: () => void;
onCloseAuth: () => void;
```

Render (строка ~696) — обернуть AvatarPill в `relative`-контейнер:
```tsx
<div style={{ position: 'relative' }}>
  <AvatarPill
    user={user}
    isMobile={isMobile}
    isNarrowDesktop={compact}
    topbarId="avatar"
    onLoginClick={onOpenAuth}
  />
  <AnimatePresence>
    {authMenuOpen && (
      <AuthDropdown
        isMobile={isMobile}
        onClose={onCloseAuth}
      />
    )}
  </AnimatePresence>
</div>
```

### 5. Рефактор `AvatarPill` (строки 899-955)

Заменить проп `name: string` на `user: User | null` и добавить `onLoginClick`.

**Если `user !== null`** → текущий рендер (буква + имя), `onClick → console.log("account panel")`.

**Если `user === null`** → кнопка «Вход»:
```tsx
<motion.button
  data-topbar={topbarId}
  onClick={onLoginClick}
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  transition={spring.snappy}
  style={{
    padding: isNarrowDesktop ? "8px 14px" : "8px 20px",
    borderRadius: radius.full,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.9)",
    fontFamily: "inherit",
    fontSize: isNarrowDesktop ? 13 : 14,
    fontWeight: 600,
    cursor: "pointer",
    outline: "none",
    letterSpacing: "-0.01em",
  }}
>
  Вход
</motion.button>
```

### 6. Новый компонент `AuthDropdown` (добавить после `AvatarPill`)

Разместить между `AvatarPill` и `// ============================================================ Hero left` (строка ~957).

```tsx
function AuthDropdown({
  isMobile,
  onClose,
}: {
  isMobile: boolean;
  onClose: () => void;
}) {
  const { sendCode, verifyCode, updateNickname } = useAuth();
  const [step, setStep] = useState<'phone' | 'code' | 'nickname'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Закрыть по клику вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Закрыть по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 1) return '+' + digits;
    if (digits.length <= 4) return `+${digits.slice(0,1)} (${digits.slice(1)}`;
    if (digits.length <= 7) return `+${digits.slice(0,1)} (${digits.slice(1,4)}) ${digits.slice(4)}`;
    if (digits.length <= 9) return `+${digits.slice(0,1)} (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
    return `+${digits.slice(0,1)} (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7,9)}-${digits.slice(9,11)}`;
  };

  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('Введите корректный номер'); return; }
    setLoading(true);
    await sendCode(digits);
    setLoading(false);
    setStep('code');
    setError('');
  };

  const handleVerifyCode = async () => {
    if (code.length < 4) { setError('Введите 4-значный код'); return; }
    setLoading(true);
    const digits = phone.replace(/\D/g, '');
    const ok = await verifyCode(digits, code);
    setLoading(false);
    if (ok) {
      setStep('nickname');
      setError('');
    } else {
      setError('Неверный код');
    }
  };

  const handleSetNickname = () => {
    if (nickname.trim().length < 2) { setError('Минимум 2 символа'); return; }
    updateNickname(nickname.trim());
    // onClose вызовется из Lobby useEffect когда user.nickname появится
  };

  // Позиционирование: desktop — absolute под кнопкой, mobile — fixed по центру
  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        padding: 24,
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 100,
      };

  const panelStyle: React.CSSProperties = {
    width: isMobile ? '100%' : 320,
    maxWidth: isMobile ? 400 : undefined,
    background: 'rgba(18, 18, 28, 0.92)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'white',
    fontFamily: 'inherit',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle = (primary = true): React.CSSProperties => ({
    width: '100%',
    padding: '12px 20px',
    borderRadius: 12,
    background: primary ? 'rgba(255,255,255,0.9)' : 'transparent',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
    color: primary ? '#06060c' : 'rgba(255,255,255,0.5)',
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    letterSpacing: '-0.01em',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={spring.snappy}
      style={containerStyle}
    >
      <div ref={ref} style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
            {step === 'phone' && 'Вход'}
            {step === 'code' && 'Введите код'}
            {step === 'nickname' && 'Как вас зовут?'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {step === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Номер телефона</div>
              <input
                style={inputStyle}
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={e => { setPhone(formatPhone(e.target.value)); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSendCode(); }}
                autoFocus
              />
            </div>
            {error && <p style={{ fontSize: 13, color: '#ff453a', margin: 0 }}>{error}</p>}
            <button style={btnStyle()} onClick={handleSendCode} disabled={loading}>
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
              Demo: код подтверждения — 1234
            </p>
          </div>
        )}

        {step === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: 0 }}>
              Код отправлен на <span style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)' }}>{phone}</span>
            </p>
            <input
              style={{ ...inputStyle, textAlign: 'center', fontSize: 24, letterSpacing: '0.5em', fontFamily: 'var(--font-mono)' }}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g,'').slice(0,4)); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleVerifyCode(); }}
              autoFocus
            />
            {error && <p style={{ fontSize: 13, color: '#ff453a', margin: 0 }}>{error}</p>}
            <button style={btnStyle()} onClick={handleVerifyCode} disabled={loading}>
              {loading ? 'Проверка...' : 'Войти'}
            </button>
            <button style={btnStyle(false)} onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
              Назад
            </button>
          </div>
        )}

        {step === 'nickname' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Ваше имя в игре</div>
              <input
                style={inputStyle}
                type="text"
                placeholder="Введите никнейм"
                value={nickname}
                maxLength={20}
                onChange={e => { setNickname(e.target.value); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSetNickname(); }}
                autoFocus
              />
            </div>
            {error && <p style={{ fontSize: 13, color: '#ff453a', margin: 0 }}>{error}</p>}
            <button style={btnStyle()} onClick={handleSetNickname} disabled={loading || nickname.trim().length < 2}>
              Готово
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

### 7. Удалить страницы авторизации

```bash
rm src/app/auth/page.tsx
rm src/app/auth/verify/page.tsx
rmdir src/app/auth/verify 2>/dev/null || true
rmdir src/app/auth 2>/dev/null || true
```

Если в `src/app/auth/` есть другие файлы (layout, loading и т.п.) — **не удалять их**, удалить только `page.tsx` и `verify/page.tsx`.

### 8. Обновить `src/app/profile/page.tsx`

**Строка ~20** — redirect при отсутствии юзера:
```ts
// Было:
router.push('/auth');
// Стало:
router.push('/');
```

**Строка ~133** — logout с redirect:
```ts
// Было:
onClick={() => { logout(); router.push('/auth'); }}
// Стало:
onClick={() => { logout(); router.push('/'); }}
```

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- На `/`:
  - Незалогиненный: в TopBar справа кнопка «Вход» (вместо аватара).
  - Клик «Вход» → dropdown с полем телефона.
  - Ввести телефон → «Получить код» → поле ввода 4-значного кода.
  - Ввести `1234` → «Войти» → поле никнейма.
  - Ввести никнейм → «Готово» → dropdown закрывается, в TopBar появляется аватар с буквой.
- Клик вне dropdown → закрывает.
- Escape → закрывает.
- На `/lobby/CODE` (гость без авторизации):
  - Вместо redirect на `/auth` — открывается тот же dropdown прямо на странице.
  - После успешного логина → `room:join` происходит автоматически (через существующий useEffect, строка 243).
- `GET /auth` → **404** (страница удалена).
- `src/app/profile/page.tsx`: logout → redirect на `/`, не на `/auth`.

## Не делать

- Не изменять `src/lib/auth-context.tsx`.
- Не добавлять i18n/переводы — весь текст в dropdown только русский.
- Не менять игровые страницы.
- Не коммитить.

## Отчёт

Создать `codex-reports/031-inline-auth-in-lobby.md` с:
- Список изменённых/удалённых файлов.
- Результаты `npm run lint` и `npx tsc --noEmit`.
- Любые отклонения от ТЗ.
