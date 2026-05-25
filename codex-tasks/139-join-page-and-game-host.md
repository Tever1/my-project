# TASK-139: Страница /join/[code] + gameHostPlayerId на сервере

> **Метаданные**
> - **Дата создания:** 2026-05-24
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~40 минут
> - **Зависит от тасков:** 134, 138
> - **Часть пивота:** TV-mode, шаг 8/8.

---

## Цель

1. **Сервер:** добавить `gameHostPlayerId` в Room — первый `role:'player'` кто
   присоединился к комнате. Включить в `room:state` broadcast.

2. **Клиент:** новая страница `src/app/join/[code]/page.tsx` — телефонный интерфейс
   подключения к игре. Узкий (как экран телефона), работает на любом устройстве.

---

## Контекст

- Сервер уже принимает `game:start` от любого клиента без проверки хоста.
  `gameHostPlayerId` нужен только чтобы показать кнопку «НАЧАТЬ ИГРУ» нужному
  телефону — первому кто присоединился.
- `useSocket` хук уже существует в `src/lib/use-socket.ts` — использовать его.
- `useAuth` хук уже существует в `src/lib/use-auth.ts` — для получения/создания userId.
- Страница должна работать без Splash/ModeGate — это отдельный entry-point.

---

## Файлы к изменению (whitelist)

- `src/server/socket-handlers.mts` — добавить `gameHostPlayerId`.
- `src/app/join/[code]/page.tsx` — **создать новый файл**.

### НЕ ТРОГАТЬ

- `src/components/lobby/Lobby.tsx`
- Игровые страницы, TV-страницы.
- `src/types/game.ts`
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Шаги реализации

### ЧАСТЬ 1: Сервер

#### 1.1. Добавить `gameHostPlayerId` в интерфейс `Room`

```ts
interface Room {
  // ...existing fields
  gameHostPlayerId: string | null;  // first 'player' role to join
}
```

#### 1.2. Инициализировать в `room:create`

```ts
const room: Room = {
  // ...existing fields
  gameHostPlayerId: null,
};
```

#### 1.3. Установить в `room:join` — первый `role:'player'`

В ветке создания нового игрока (else-ветка, когда `!existingPlayer`):

```ts
const player: Player = {
  // ...existing fields
  role: data.role ?? 'player',
};
room.players.set(data.playerId, player);

// First player (role='player') to join becomes the game host on phone
if (player.role === 'player' && room.gameHostPlayerId === null) {
  room.gameHostPlayerId = player.id;
}
```

#### 1.4. Включить `gameHostPlayerId` в `broadcastRoomState`

```ts
const state = {
  // ...existing fields
  tvConnected: players.some((p) => p.role === 'tv' && p.isConnected),
  gameHostPlayerId: room.gameHostPlayerId,  // <-- добавить
};
```

То же самое — в `room:get-state` (direct emit, строка ~225).

---

### ЧАСТЬ 2: Клиент — страница /join/[code]

#### 2.1. Создать файл `src/app/join/[code]/page.tsx`

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/lib/use-socket";
import { useAuth } from "@/lib/use-auth";

// Phone-proportioned join page.
// Narrow centered layout (max 430px) regardless of device — works on both phone and desktop.
export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();
  const { emit, on, isConnected } = useSocket();
  const { user } = useAuth();

  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<{
    players: { id: string; nickname: string; isConnected: boolean; role?: string }[];
    currentGame: string | null;
    gameHostPlayerId: string | null;
    status: string;
  } | null>(null);

  // Pre-fill nickname from auth if available
  useEffect(() => {
    if (user?.nickname && !nickname) {
      setNickname(user.nickname);
    }
  }, [user, nickname]);

  // Subscribe to room:state updates
  useEffect(() => {
    return on('room:state', (data: unknown) => {
      const payload = data as typeof roomState;
      setRoomState(payload);
    });
  }, [on]);

  // Navigate when game starts
  useEffect(() => {
    return on('game:started', (payload: unknown) => {
      const data = payload as { gameType: string; roomCode: string };
      router.push(`/game/${data.roomCode}/${data.gameType}`);
    });
  }, [on, router]);

  const handleJoin = useCallback(() => {
    if (!nickname.trim() || !code || !isConnected) return;
    setIsJoining(true);
    setError(null);

    // Generate or reuse userId from auth
    const playerId = user?.id ?? `user_${Math.random().toString(36).slice(2, 10)}`;

    emit('room:join', {
      code,
      playerId,
      nickname: nickname.trim(),
      isReconnect: false,
      role: 'player',
    }, (res: unknown) => {
      const result = res as { success: boolean; error?: string };
      setIsJoining(false);
      if (result.success) {
        setJoined(true);
      } else {
        setError(result.error ?? "Не удалось подключиться");
      }
    });
  }, [nickname, code, isConnected, user, emit]);

  const handleStartGame = useCallback(() => {
    if (!code) return;
    emit('game:start', { code });
  }, [code, emit]);

  const isGameHost = joined && roomState?.gameHostPlayerId === user?.id;
  // Fallback: if no user?.id, compare by nickname (less reliable but works for guests)
  const isGameHostByNickname =
    joined &&
    roomState?.gameHostPlayerId !== null &&
    roomState?.players.find(p => p.id === roomState.gameHostPlayerId)?.nickname === nickname.trim();
  const canStartGame = isGameHost || isGameHostByNickname;

  const visiblePlayers = roomState?.players.filter(p => p.role !== 'tv') ?? [];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      {/* Phone-proportioned container */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '32px 24px',
        borderRadius: 24,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'white',
      }}>

        {!joined ? (
          // --- State 1: Enter nickname ---
          <>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Код комнаты
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.15em' }}>
                {code}
              </p>
            </div>

            <div style={{ width: '100%' }}>
              <input
                autoFocus
                value={nickname}
                onChange={e => setNickname(e.target.value.slice(0, 20))}
                onKeyDown={e => e.key === 'Enter' && nickname.trim() && handleJoin()}
                placeholder="Твоё имя"
                maxLength={20}
                style={{
                  width: '100%',
                  fontSize: 20,
                  fontWeight: 600,
                  padding: '14px 18px',
                  borderRadius: 14,
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white',
                  outline: 'none',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={!nickname.trim() || isJoining || !isConnected}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 14,
                background: nickname.trim() ? 'white' : 'rgba(255,255,255,0.1)',
                color: nickname.trim() ? '#08080d' : 'rgba(255,255,255,0.3)',
                fontWeight: 800,
                fontSize: 18,
                border: 'none',
                cursor: nickname.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {isJoining ? 'Подключение...' : 'Войти в игру'}
            </button>
          </>
        ) : (
          // --- State 2/3: Waiting / Game host ---
          <>
            {roomState?.currentGame && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {roomState.currentGame}
              </p>
            )}

            {/* Player list */}
            {visiblePlayers.length > 0 && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visiblePlayers.map(p => (
                  <div key={p.id} style={{
                    padding: '10px 16px',
                    borderRadius: 12,
                    background: p.isConnected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    color: p.isConnected ? 'white' : 'rgba(255,255,255,0.3)',
                    fontWeight: 600,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: p.isConnected ? '#22c55e' : 'rgba(255,255,255,0.2)',
                      flexShrink: 0,
                    }} />
                    {p.nickname}
                    {roomState.gameHostPlayerId === p.id && (
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        ведущий
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canStartGame ? (
              // Host phone — НАЧАТЬ ИГРУ button
              <button
                onClick={handleStartGame}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  borderRadius: 16,
                  background: 'white',
                  color: '#08080d',
                  fontWeight: 900,
                  fontSize: 20,
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  boxShadow: '0 0 40px rgba(255,255,255,0.15)',
                }}
              >
                НАЧАТЬ ИГРУ
              </button>
            ) : (
              // Regular player — waiting
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, textAlign: 'center' }}>
                Ожидание ведущего...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` чисто
- [ ] `Room.gameHostPlayerId` на сервере: `null` при создании, устанавливается первым `role:'player'`
- [ ] `gameHostPlayerId` включён в `room:state` broadcast
- [ ] `localhost:3000/join/ABC123` открывается без ошибок
- [ ] На 375px (мобильный) — вёрстка не сломана
- [ ] На десктопном браузере — узкий телефонный блок по центру
- [ ] Ввод никнейма → «Войти» → подключение к комнате
- [ ] Первый зашедший видит «НАЧАТЬ ИГРУ», остальные — «Ожидание ведущего...»
- [ ] Нажатие «НАЧАТЬ ИГРУ» → `game:start` → все переходят на `/game/...`
- [ ] Десктоп (получивший `game:started`) уходит на `/tv/...` (TASK-136 уже сделал это)
- [ ] Список игроков обновляется в реальном времени

---

## Ограничения и подводные камни

- **`gameHostPlayerId` устанавливается один раз** — при первом join с `role:'player'`.
  Не сбрасывать при disconnect/reconnect.
- **Fallback для userId гостей** — на join-странице нет Splash/Auth, поэтому
  `user?.id` может быть null. Генерировать случайный `playerId` для гостей.
  Но тогда `isGameHost = user?.id === gameHostPlayerId` не сработает.
  Поэтому добавлен `isGameHostByNickname` как fallback — менее надёжно, но
  работает для простого party-game сценария. **Или:** всегда читать userId из
  localStorage напрямую: `localStorage.getItem('party-hub-user')` → parse → `.id`.
  Это надёжнее. Codex может выбрать лучший вариант.
- **`"use client"` обязателен** — страница использует hooks и socket.
- **Нет i18n** — эта страница внутренняя, только русский (как `/design-tokens`).
- **Не нужен `ModeGate`** — эта страница всегда для игроков, не оборачивать.
- **`game:started`** — сервер его шлёт всем в socket.io room. Игроки с join-страницы
  попадают в room через `room:join` → `socket.join(\`room:${code}\`)` → получат broadcast.
- **Комментарии на английском.**

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только `src/server/socket-handlers.mts` и
   `src/app/join/[code]/page.tsx`.
2. `npm run lint` зелёный, `npx tsc --noEmit` чисто.
3. `grep "gameHostPlayerId" src/server/socket-handlers.mts` — должно встречаться
   в interface Room, в room:create (null), в room:join (set logic), в broadcastRoomState.
4. Открыть `localhost:3000/join/TEST` в браузере — страница рендерится.
5. Заполнить отчёт `codex-reports/139-join-page-and-game-host.md`.
6. **Не коммитить.**
