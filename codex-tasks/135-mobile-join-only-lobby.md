# TASK-135: Мобильный лобби — только join, без create

> **Метаданные**
> - **Дата создания:** 2026-05-24
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~25 минут
> - **Зависит от тасков:** 132, 132.1, 132.2, 134
> - **Часть пивота:** TV-mode (132…136), шаг 4/5.

---

## Цель

Когда `mode === 'mobile'` (`myRole === 'player'`), лобби показывает упрощённый
join-only UI: большое поле ввода кода + состояние ожидания после вступления.
Кнопки «Создать комнату» и «Начать партию», тайл-стрип игр — скрыты.

---

## Контекст

После TASK-134 лобби знает роль через `myRole: 'tv' | 'player'`.
- `'tv'` (desktop) = хост-экран: создаёт комнату, выбирает игру, запускает.
- `'player'` (mobile) = гость: вводит код, ждёт пока хост запустит игру.

Мобильный игрок физически держит телефон и не может выбирать игру — это делает
десктоп на большом экране. Поэтому для `myRole === 'player'` весь game-selection
UI убирается, остаётся только join + ожидание.

**Важно:** `isMobile` (размер экрана < 1024px) и `myRole === 'player'` (mode из
localStorage) — разные вещи. Гейтировать нужно на `myRole`, а не на `isMobile`.

---

## Файлы к изменению (whitelist)

- `src/components/lobby/Lobby.tsx` — единственный файл.

### НЕ ТРОГАТЬ

- `src/lib/use-play-mode.ts`, `src/components/ModeGate.tsx`, `src/components/Splash.tsx`
- `src/server/socket-handlers.mts`, `server.mts`
- Игровые страницы, TV-страницы
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`

---

## Что нужно показывать

### Когда `myRole === 'player'` и НЕ в комнате (`!roomCode`)

Вместо полного PS5-лобби — экран «Войти в комнату»:

```
[Большой текст] Введи код комнаты

[Поле ввода кода, 6 символов — уже есть в Lobby.tsx как joinCode/setJoinCode]
[Кнопка «Войти»]

[Маленький текст] Попроси хоста показать код на экране
```

Скрыть:
- Tile-strip игр внизу
- Hero-секцию с выбором игры (заголовок игры, meta-pills, описание, CTA «Начать партию»)
- TiltedPreview карточку
- Кнопку «Создать комнату» в TopBar

### Когда `myRole === 'player'` и В комнате (`roomCode && roomState`)

Экран ожидания:

```
[Название выбранной игры, если есть]

[Список игроков в комнате (без TV-игрока)] — аватары + ники

[Текст] Ожидание хоста...
```

Скрыть:
- Tile-strip
- Hero с game-selection
- «Начать партию»

---

## Шаги реализации

### 1. Добавить проверку роли

`myRole` уже объявлен в компоненте после TASK-134:
```ts
const { mode } = usePlayMode();
const myRole: "tv" | "player" = mode === "desktop" ? "tv" : "player";
```

### 2. Скрыть «Создать комнату» для player

Найти в TopBar кнопку/элемент отвечающий за `room:create` / `roomCode` display
(это `RoomButton` или аналог). Завернуть в условие:

```tsx
{myRole === 'tv' && (
  <RoomButton ... />
)}
```

### 3. Скрыть tile-strip для player

Найти нижний `tile-strip` (секция с 7 тайлами игр). Завернуть:

```tsx
{myRole === 'tv' && (
  <div> {/* tile-strip */} </div>
)}
```

### 4. Скрыть hero game-selection для player

Найти левую колонку hero с заголовком, meta-pills, описанием и CTA.
Вместо полного hero — для `myRole === 'player'` рендерить join-экран.

**Логика рендера главной области:**

```tsx
{myRole === 'player' ? (
  <PlayerJoinView
    roomCode={roomCode}
    roomState={roomState}
    joinCode={joinCode}
    setJoinCode={setJoinCode}
    onJoin={handleJoinRoom}
    isJoiningRoom={isJoiningRoom}
  />
) : (
  // существующий TV/desktop hero
  <DesktopHero ... />
)}
```

**`PlayerJoinView`** — inline-компонент (не выносить в отдельный файл),
определить в том же `Lobby.tsx`:

```tsx
// Inline component — join screen for mobile players
function PlayerJoinView({
  roomCode,
  roomState,
  joinCode,
  setJoinCode,
  onJoin,
  isJoiningRoom,
}: {
  roomCode: string | null;
  roomState: RoomState | null;
  joinCode: string;
  setJoinCode: (v: string) => void;
  onJoin: () => void;
  isJoiningRoom: boolean;
}) {
  // Если уже в комнате — экран ожидания
  if (roomCode && roomState) {
    const gamePlayers = roomState.players.filter(p => p.role !== 'tv');
    const selectedGame = roomState.currentGame;

    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        {selectedGame && (
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            Игра: {selectedGame}
          </p>
        )}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          Ожидание хоста...
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {gamePlayers.map(p => (
            <span key={p.id} style={{
              padding: '6px 12px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.08)',
              color: p.isConnected ? 'white' : 'rgba(255,255,255,0.3)',
              fontSize: 14,
            }}>
              {p.nickname}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Иначе — экран ввода кода
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Введи код комнаты
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24, fontSize: 14 }}>
        Попроси хоста показать код на экране
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <input
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && joinCode.length === 6 && onJoin()}
          placeholder="ABCD12"
          maxLength={6}
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textAlign: 'center',
            width: 160,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1.5px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)',
            color: 'white',
            outline: 'none',
          }}
        />
        <button
          onClick={onJoin}
          disabled={joinCode.length !== 6 || isJoiningRoom}
          style={{
            padding: '12px 24px',
            borderRadius: 12,
            background: joinCode.length === 6 ? 'white' : 'rgba(255,255,255,0.15)',
            color: joinCode.length === 6 ? '#08080d' : 'rgba(255,255,255,0.4)',
            fontWeight: 700,
            fontSize: 16,
            border: 'none',
            cursor: joinCode.length === 6 ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {isJoiningRoom ? '...' : 'Войти'}
        </button>
      </div>
    </div>
  );
}
```

Стили примерные — главное: читаемо, центрировано, работает на 375px.

### 5. Скрыть TiltedPreview для player

TiltedPreview рендерится только для `!isMobile` (уже скрыт по ширине экрана),
но для надёжности добавить и `myRole === 'tv'`:
```tsx
{myRole === 'tv' && !isMobile && (
  <TiltedPreview ... />
)}
```

### 6. «Начать партию» — только для `myRole === 'tv'`

Кнопка «Начать партию» (`handleStartGame`) уже завёрнута в `isCurrentUserHost`.
Но для `myRole === 'player'` она должна быть полностью скрыта, не просто задизейблена.
Добавить дополнительное условие:

```tsx
{myRole === 'tv' && isCurrentUserHost && (
  <StartButton onClick={handleStartGame} ... />
)}
```

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` чисто
- [ ] При `mode === 'mobile'`: кнопка «Создать комнату» в TopBar не рендерится
- [ ] При `mode === 'mobile'`: tile-strip внизу не рендерится
- [ ] При `mode === 'mobile'` и без комнаты: виден экран «Введи код комнаты» с полем ввода
- [ ] При `mode === 'mobile'` и в комнате: виден экран «Ожидание хоста» со списком игроков
- [ ] При `mode === 'desktop'`: всё работает как прежде
- [ ] На 375px экране join-экран не сломан (текст не вылезает, кнопка кликабельна)
- [ ] `myRole === 'player'` фильтрует по `mode`, НЕ по `isMobile`

---

## Ограничения и подводные камни

- **`isMobile` vs `myRole`** — не путать. `isMobile` = ширина экрана. `myRole` = режим из localStorage. Можно быть на мобильном экране но с `mode === 'desktop'` (тестирование).
- **`handleJoinRoom` уже существует** — использовать его, не создавать новый.
- **`isJoiningRoom` state уже существует** — использовать.
- **TopBar** — скорее всего это отдельный компонент внутри Lobby.tsx. Найти где рендерится кнопка комнаты и добавить условие.
- **Не ломать desktop flow** — все изменения за условием `myRole === 'player'`.
- **Комментарии на английском.**

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только `src/components/lobby/Lobby.tsx`.
2. `npm run lint` зелёный.
3. `npx tsc --noEmit` чисто.
4. Поискать все места где рендерится tile-strip, TiltedPreview, RoomButton/CreateRoom — убедиться что завёрнуты в `myRole === 'tv'`.
5. Заполнить отчёт `codex-reports/135-mobile-join-only-lobby.md`.
6. **Не коммитить.**
