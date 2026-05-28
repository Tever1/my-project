# TASK-165 — Кнопка «+ Добавить игрока» для гостя-game-host в Lobby

## Контекст

TV-pivot: первый телефон, зашедший через `/join/[code]`, становится
`gameHostPlayerId` (game-captain). Кнопка «+ Добавить игрока» в Lobby
показывается через `canAddPlayer`, который проверяет:

```ts
const isGameHostPhone = Boolean(
  user?.id && roomState?.gameHostPlayerId && user.id === roomState.gameHostPlayerId
);
const canAddPlayer = isCurrentUserHost || isGameHostPhone;
```

Если game-host — гость (зашёл через `/join` без аккаунта), у него `user === null`,
поэтому `isGameHostPhone = false` и кнопка не появляется.

В `src/app/join/[code]/page.tsx` и `src/app/game/[roomId]/quiz/page.tsx` уже
реализован паттерн `effectivePlayerId = user?.id ?? guestPlayerId` с
`getGuestPlayerId()` через `localStorage('party-hub-join-guest-id')`.

## Whitelist файлов

**Изменить:**
- `src/components/lobby/Lobby.tsx`

**Создать:**
- `codex-reports/165-lobby-guest-game-host.md`

**НЕЛЬЗЯ трогать:** всё остальное.

---

## Что сделать в `src/components/lobby/Lobby.tsx`

### 1. Добавить константу после импортов (рядом с другими `const` на уровне модуля)

```ts
const GUEST_ID_KEY = 'party-hub-join-guest-id';

function getGuestPlayerId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const next = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(GUEST_ID_KEY, next);
  return next;
}
```

### 2. Добавить state для guestPlayerId в компонент `Lobby`

Рядом с другими `useState` (~строки 183-195):
```ts
const [guestPlayerId, setGuestPlayerId] = useState('');
```

### 3. Добавить useEffect для инициализации guestPlayerId

Рядом с другими инициализирующими `useEffect`:
```ts
useEffect(() => {
  queueMicrotask(() => setGuestPlayerId(getGuestPlayerId()));
}, []);
```

### 4. Заменить проверку `isGameHostPhone`

Найти (~строки 427-430):
```ts
const isGameHostPhone = Boolean(
  user?.id && roomState?.gameHostPlayerId && user.id === roomState.gameHostPlayerId
);
const canAddPlayer = isCurrentUserHost || isGameHostPhone;
```

Заменить на:
```ts
const effectivePlayerId = user?.id ?? guestPlayerId;
const isGameHostPhone = Boolean(
  effectivePlayerId && roomState?.gameHostPlayerId &&
  effectivePlayerId === roomState.gameHostPlayerId
);
const canAddPlayer = isCurrentUserHost || isGameHostPhone;
```

Аналогично строка ~643 (отдельная переменная, если такая есть —
найти по `user?.id === roomState?.gameHostPlayerId` и заменить на
`effectivePlayerId === roomState?.gameHostPlayerId`).

---

## Acceptance

```bash
# Паттерн effectivePlayerId присутствует
grep -n "effectivePlayerId" src/components/lobby/Lobby.tsx
# → минимум 3 строки (объявление + два использования)

# Гостевой ключ присутствует
grep -n "party-hub-join-guest-id" src/components/lobby/Lobby.tsx
# → 1 строка (константа GUEST_ID_KEY)

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/165-lobby-guest-game-host.md`:
- Список изменённых строк
- Результаты grep + lint + tsc

Не коммить, не пушить.
