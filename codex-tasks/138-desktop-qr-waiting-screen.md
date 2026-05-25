# TASK-138: QR-экран ожидания на десктопе

> **Метаданные**
> - **Дата создания:** 2026-05-24
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~30 минут
> - **Зависит от тасков:** 134, 136, 137
> - **Часть пивота:** TV-mode, шаг 7/8.

---

## Цель

Когда десктоп-хост нажимает «Начать партию»:
1. Автоматически создаётся комната (если ещё нет).
2. Отправляется `game:select` с выбранной игрой.
3. Лобби переходит в **режим ожидания**: большой QR-код + URL для подключения
   + список подключившихся игроков.
4. Десктоп остаётся на этом экране — ждёт пока кто-то нажмёт «НАЧАТЬ ИГРУ» с телефона.
5. При получении `game:started` — навигация на `/tv/${roomCode}/${gameType}` (TASK-136 уже это делает).

---

## Контекст

- `react-qrcode-logo` уже установлен и импортирован в `Lobby.tsx`.
- `handleStartGame` уже существует: делает `createRoom()` если нет комнаты,
  затем `emit('game:select')` + `emit('game:start')`.
  **Нужно изменить** — убрать `emit('game:start')` отсюда (его теперь шлёт телефон),
  оставить только `createRoom()` + `emit('game:select')` → переход в режим ожидания.
- `myRole === 'tv'` (десктоп) — только TV видит этот экран.
- `QRCode` из `react-qrcode-logo` — уже импортирован.

---

## Файлы к изменению (whitelist)

- `src/components/lobby/Lobby.tsx` — основной файл.
- `.env.local.example` — добавить переменную `NEXT_PUBLIC_SITE_URL`.

### НЕ ТРОГАТЬ

- `src/server/socket-handlers.mts` — сервер не трогаем в этом таске.
- Игровые страницы, TV-страницы.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Шаги реализации

### 1. Добавить state `isWaitingForPlayers`

```ts
const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(false);
```

### 2. Изменить `handleStartGame`

Убрать `emit('game:start')` — теперь старт приходит с телефона (TASK-139).
Оставить только создание комнаты + game:select + переход в режим ожидания:

```ts
const handleStartGame = useCallback(async () => {
  if (!isCurrentUserHost) return;

  const existingCode = roomCode;
  const code = existingCode ?? (await createRoom()).code;
  if (!code) return;

  // Select the game — phone will emit game:start when ready
  emit('game:select', { code, gameType: activeGame });
  setIsWaitingForPlayers(true);
}, [activeGame, createRoom, emit, isCurrentUserHost, roomCode]);
```

### 3. Добавить кнопку «Отмена» для выхода из режима ожидания

```ts
const handleCancelWaiting = useCallback(() => {
  setIsWaitingForPlayers(false);
  // Optionally: emit room:leave or just stay in the room but return to lobby view
}, []);
```

### 4. Рендер QR-экрана ожидания

В основном render Lobby, перед возвратом JSX:

```tsx
// QR waiting screen — shown on desktop after "Start game" is pressed
if (myRole === 'tv' && isWaitingForPlayers && roomCode) {
  // Use NEXT_PUBLIC_SITE_URL env var so swapping to a real domain
  // requires changing only one line in .env.local — no code changes.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const joinUrl = `${siteUrl}/join/${roomCode}`;

  const gamePlayers = roomState?.players.filter(p => p.role !== 'tv') ?? [];

  return (
    <main style={{
      minHeight: '100vh',
      background: '#08080d',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      padding: 32,
    }}>
      {/* Game name */}
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {games.find(g => g.id === activeGame)?.title ?? activeGame}
      </p>

      {/* QR code */}
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: 20,
        boxShadow: '0 0 60px rgba(255,255,255,0.08)',
      }}>
        <QRCode
          value={joinUrl}
          size={240}
          qrStyle="dots"
          eyeRadius={8}
          removeQrCodeBehindLogo={false}
        />
      </div>

      {/* Join URL */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 6 }}>
          Отсканируй QR или открой на телефоне:
        </p>
        <p style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: 'white',
          fontFamily: 'monospace',
        }}>
          {joinUrl}
        </p>
      </div>

      {/* Connected players */}
      <div style={{ textAlign: 'center', minHeight: 60 }}>
        {gamePlayers.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>
            Ожидание игроков...
          </p>
        ) : (
          <>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 12 }}>
              Подключились ({gamePlayers.length}):
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {gamePlayers.map(p => (
                <span key={p.id} style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  background: p.isConnected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  color: p.isConnected ? 'white' : 'rgba(255,255,255,0.3)',
                  fontSize: 15,
                  fontWeight: 600,
                }}>
                  {p.nickname}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Cancel button */}
      <button
        onClick={handleCancelWaiting}
        style={{
          padding: '10px 24px',
          borderRadius: 10,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        ← Назад к лобби
      </button>
    </main>
  );
}
```

Стили примерные — главное: читаемо, центрировано, QR крупный, URL виден с 2 метров.

### 5. Сбрасывать `isWaitingForPlayers` при получении `game:started`

Когда телефон отправит `game:start` и сервер ответит `game:started` — TASK-136
уже навигирует десктоп на `/tv/...`. Дополнительно сбросить флаг на случай
если навигация отменится:

```ts
useEffect(() => {
  return on('game:started', (payload: unknown) => {
    const data = payload as { gameType: string; roomCode: string };
    setIsWaitingForPlayers(false);
    if (myRole === 'tv') {
      router.push(`/tv/${data.roomCode}/${data.gameType}`);
    } else {
      router.push(`/game/${data.roomCode}/${data.gameType}`);
    }
  });
}, [on, myRole, router]);
```

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` чисто
- [ ] `handleStartGame` больше не шлёт `game:start` — только `game:select`
- [ ] После «Начать партию» десктоп показывает QR-экран с кодом подключения
- [ ] URL в QR ведёт на `localhost:3000/join/${roomCode}`
- [ ] По мере подключения игроков список на QR-экране обновляется (live, через `room:state`)
- [ ] Кнопка «← Назад к лобби» возвращает к лобби без создания новой комнаты
- [ ] Когда приходит `game:started` — `isWaitingForPlayers` сбрасывается, десктоп уходит на TV
- [ ] На мобильном/player этот экран не показывается

---

## Ограничения и подводные камни

- **`emit('game:start')` убираем из `handleStartGame`** — теперь старт исходит
  от телефона (TASK-139). Если оставить, игра стартует до того как кто-то подключился.
- **SSR безопасность для `window.location.origin`** — всегда проверяй
  `typeof window !== 'undefined'` перед использованием.
- **`games` массив** — он уже существует в файле, используй его для получения
  названия активной игры.
- **`roomState?.players`** — обновляется автоматически через `room:state` события,
  никаких дополнительных подписок не нужно.
- **Комментарии на английском.**

---

## Шаг: обновить `.env.local.example`

Добавить строку в `.env.local.example` (в конец или в логичное место):

```
# Public site URL — used for QR code links. Change to your real domain when ready.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только `Lobby.tsx` и `.env.local.example`.
2. `npm run lint` зелёный, `npx tsc --noEmit` чисто.
3. `grep "game:start" src/components/lobby/Lobby.tsx` — в `handleStartGame`
   должно быть только `game:select`, не `game:start`.
4. Заполнить отчёт `codex-reports/138-desktop-qr-waiting-screen.md`.
5. **Не коммитить.**
