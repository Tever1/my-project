# TASK-167 — Квиз: кнопка ЗАВЕРШИТЬ не работает

## Контекст

Кнопка «Завершить» в заголовке квиза (GameLayout header) нажимается,
но квиз не завершается. Найдено два реальных бага:

**Баг A: Сервер — `game:end` без `.toUpperCase()`**

В `src/server/socket-handlers.mts` хендлер `game:end` (~строка 294):
```ts
socket.on('game:end', (data: { code: string }) => {
  const room = getRoomByCode(data.code);  // ← нет .toUpperCase()!
```

Все остальные хендлеры (`room:join`, `room:get-state`, `game:action`,
`game:start`) вызывают `getRoomByCode(data.code.toUpperCase())`. `game:end` —
единственное исключение. Если `data.code` в нижнем регистре (или смешанном),
`getRoomByCode` вернёт `undefined` и хендлер тихо завершится без эффекта.

**Баг B: Гость-game-host не делает auto-reconnect**

В `src/app/game/[roomId]/quiz/page.tsx` авто-reconnect (~строки 126-140):
```ts
useEffect(() => {
  if (!user || !isConnected || !roomId) return;  // ← гость пропускается!
  emit('room:join', { ..., isReconnect: true });
}, [isConnected, ...]);
```

Если гость (game-host через `/join/CODE`) теряет соединение (мобильный браузер
в фоне) и переподключается, его сокет не re-join'ит socket.io room на сервере.
Сервер бродкастит `game:ended` в `room:${code}`, но гостевой сокет не в комнате
→ не получает событие → `useNavigateOnGameEnd` не срабатывает → страница не
перенаправляет.

**Также:** `confirmEndGame` не использует router для прямой навигации как
запасной вариант — полностью зависит от `game:ended`. Добавить прямую навигацию.

## Whitelist файлов

**Изменить:**
- `src/server/socket-handlers.mts`
- `src/app/game/[roomId]/quiz/page.tsx`

**Создать:**
- `codex-reports/167-quiz-end-button-fix.md`

**НЕЛЬЗЯ трогать:** всё остальное.

---

## Что сделать

### 1. Сервер: добавить `.toUpperCase()` в `game:end` хендлер

В `src/server/socket-handlers.mts`, найти (~строка 294):
```ts
socket.on('game:end', (data: { code: string }) => {
  const room = getRoomByCode(data.code);
```

Заменить на:
```ts
socket.on('game:end', (data: { code: string }) => {
  const room = getRoomByCode(data.code.toUpperCase());
```

---

### 2. Quiz page: auto-reconnect для гостей

В `src/app/game/[roomId]/quiz/page.tsx`:

**2a.** Добавить state для имени гостя:
```ts
const [guestNickname, setGuestNickname] = useState('');
```

**2b.** Добавить useEffect, который запоминает nickname гостя из playerlist
когда он появится (ставить рядом с другими инициализирующими useEffect):
```ts
useEffect(() => {
  if (user || !guestPlayerId || guestNickname) return;
  const player = gameState.players.find((p) => p.id === guestPlayerId);
  if (player) setGuestNickname(player.nickname);
}, [user, guestPlayerId, guestNickname, gameState.players]);
```

**2c.** Добавить guest auto-reconnect useEffect (рядом с существующим
reconnect для аутентифицированных, строки 126-140):
```ts
useEffect(() => {
  if (user || !isConnected || !roomId || !guestPlayerId || !guestNickname) return;
  emit(
    'room:join',
    { code: roomId, playerId: guestPlayerId, nickname: guestNickname, isReconnect: true },
    (res: unknown) => {
      const response = res as { success: boolean; error?: string };
      if (!response.success) {
        router.push('/');
      }
    }
  );
}, [isConnected, emit, user, roomId, guestPlayerId, guestNickname, router]);
```

---

### 3. Quiz page: `confirmEndGame` — прямая навигация как fallback

В `src/app/game/[roomId]/quiz/page.tsx` найти `confirmEndGame` (~строки 628-632):
```ts
const confirmEndGame = () => {
  setShowEndConfirm(false);
  stopTimerSound();
  emit('game:end', { code: roomId });
};
```

Заменить на:
```ts
const confirmEndGame = () => {
  setShowEndConfirm(false);
  stopTimerSound();
  emit('game:end', { code: roomId });
  router.push(`/join/${roomId}`);
};
```

`useNavigateOnGameEnd` уже делает навигацию через `game:ended` событие для
всех клиентов. Прямой `router.push` здесь — только для самого game-host как
надёжный fallback (если `game:ended` не придёт).

Убедиться что `router` используется в компоненте. Если `useRouter()` ещё не
вызывается — добавить рядом с другими хуками. Если уже есть — не дублировать.

---

## Acceptance

```bash
# Сервер: toUpperCase присутствует
grep -n "game:end\b" src/server/socket-handlers.mts
# → строка с getRoomByCode(data.code.toUpperCase())

# Quiz: guest reconnect
grep -n "guestNickname\|guestPlayerId.*isConnected" src/app/game/\[roomId\]/quiz/page.tsx
# → минимум 3 строки

# Quiz: прямая навигация в confirmEndGame
grep -n "confirmEndGame\|router\.push.*join" src/app/game/\[roomId\]/quiz/page.tsx
# → router.push внутри confirmEndGame

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/167-quiz-end-button-fix.md`:
- Какие строки изменены в каждом файле
- Результаты grep + lint/tsc

Не коммить, не пушить.
