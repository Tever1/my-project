# TASK-176: После завершения игры — гость в /join (комната), хост в /lobby

## Проблема
После завершения игры все клиенты уходят на `/lobby/[roomId]`. Для гостя (без аккаунта) /lobby показывает меню входа в аккаунт. Гость должен возвращаться в комнату ожидания `/join/[code]`, а авторизованный пользователь — в `/lobby/[code]`.

Дополнительно: страница `/join/[code]` сейчас НЕ делает авто-переподключение — при возврате с игры новый сокет не подписан на комнату, поэтому показывается экран ввода имени вместо комнаты ожидания.

## Whitelist файлов
- `src/app/join/[code]/page.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`

---

## Часть 1: `/join/[code]` — авто-переподключение

### Файл `src/app/join/[code]/page.tsx`

#### 1a. Запрос состояния комнаты при монтировании/реконнекте
После useEffect с подпиской на `room:state` (заканчивается на строке ~71, `}, [on]);`), добавить новый useEffect:
```tsx
// Request a room-state snapshot on connect so a player returning from a
// finished game is recognized as an existing member (auto-rejoin below).
useEffect(() => {
  if (!isConnected || !code || !playerId) return;
  emit("room:get-state", { code });
}, [isConnected, code, playerId, emit]);
```

#### 1b. Авто-rejoin при обнаружении себя в комнате
Изменить существующий useEffect (строки ~77-87). Сейчас он только ставит `joined`. Добавить `emit('room:join', ... isReconnect: true)` чтобы новый сокет подписался на канал комнаты и получал live-обновления:
```tsx
useEffect(() => {
  if (!roomState || !playerId || joined) return;
  const existingPlayer = roomState.players.find((player) => player.id === playerId);
  if (!existingPlayer) return;
  queueMicrotask(() => {
    setJoined(true);
    if (!nickname && existingPlayer.nickname) {
      setNickname(existingPlayer.nickname);
    }
    // Re-subscribe this socket to the room channel for live updates
    // (new players, game start). isReconnect=true reuses the existing player.
    emit("room:join", {
      code,
      playerId,
      nickname: existingPlayer.nickname,
      isReconnect: true,
      role: "player",
    });
  });
}, [roomState, playerId, joined, nickname, emit, code]);
```

ВАЖНО: `room:get-state` НЕ создаёт игрока на сервере (только снапшот), поэтому новый игрок без аккаунта не будет случайно добавлен с пустым именем — авто-rejoin срабатывает ТОЛЬКО если игрок уже найден в roomState.

---

## Часть 2: Игровые страницы — user-aware редирект

Для каждой игровой страницы: target должен зависеть от наличия аккаунта.
Авторизованный (`user`) → `'lobby'` (/lobby/[code]). Гость → `'phone'` (/join/[code]).

### 2a. `src/app/game/[roomId]/quiz/page.tsx`
Строка ~96: `useNavigateOnGameEnd(roomId, 'lobby');` →
```tsx
useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');
```
(`user` уже объявлен на строке ~92, выше.)

Строка ~652 в `confirmEndGame`: `router.push('/lobby/${roomId}')` →
```tsx
router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
```

Строка ~689 (кнопка на финальном экране): `onClick={() => router.push('/lobby/${roomId}')}` →
```tsx
onClick={() => router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`)}
```

### 2b. Остальные 6 игр
В каждой из: spy, alias, who-am-i, mafia, hundred-to-one, crocodile —
сейчас `useNavigateOnGameEnd(roomId, 'lobby');` стоит ВЫШЕ `const { user } = useAuth();`.
Нужно: убрать вызов с текущего места и поставить СРАЗУ ПОСЛЕ `const { user } = useAuth();`, с user-aware target.

Конкретно в каждом файле:
1. Удалить строку `useNavigateOnGameEnd(roomId, 'lobby');`
2. Сразу после строки `const { user } = useAuth();` добавить:
   ```tsx
   useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');
   ```

Файлы и текущие позиции (ориентир):
- spy: вызов на ~166, `const { user }` на ~167 → переставить после 167
- alias: вызов на ~86, `const { user }` на ~88 → после 88
- who-am-i: вызов на ~89, `const { user }` на ~92 → после 92
- mafia: вызов на ~135, `const { user }` на ~138 → после 138
- hundred-to-one: вызов на ~99, `const { user }` на ~100 → после 100
- crocodile: вызов на ~66, `const { user }` на ~68 → после 68

(Перестановка двух безусловных хуков безопасна — порядок хуков остаётся стабильным между рендерами.)

---

## Acceptance criteria
- [ ] Гость после завершения игры попадает в `/join/[code]` и сразу видит комнату ожидания (НЕ экран ввода имени)
- [ ] Авторизованный пользователь после завершения игры попадает в `/lobby/[code]`
- [ ] `/join/[code]` при возврате с игры авто-переподключается (room:get-state → авто-joined → room:join isReconnect)
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- TV-страницу (она использует target 'tv' — это правильно)
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/176-game-end-routing-guests.md`
