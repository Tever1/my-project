# TASK-295 — Угадай слово (Alias): фикс зависания на выборе режима у гостя-хоста

## Контекст
Игра «Угадай слово» (`alias`) зависает на экране выбора режима: ВСЕ, включая
ведущего, видят «Хост выбирает режим…», и старт недоступен. Причина — Alias
единственная из 7 игр не переведена на `useGameIdentity`: ведущесть считается как
`const isHost = user?.id === hostId` (`src/app/game/[roomId]/alias/page.tsx:101`).
Если комнату создал ГОСТЬ (без аккаунта), `user?.id` пустой и не совпадает с
`hostId` → host не распознаётся.

Фикс — как в остальных 6 играх: брать ведущесть из `useGameIdentity`
(`effectivePlayerId = user?.id ?? guestPlayerId`, `isGameHost` по
`gameHostPlayerId` из `room:state`). Меняем ТОЛЬКО источник идентичности; имена
`isHost` / `isHostRef` / `myId` ниже по коду оставляем, чтобы не плодить правки.

## Что сделать — файл `src/app/game/[roomId]/alias/page.tsx`

### 1) Импорты (около стр. 13)
- Удалить: `import { useAuth } from '@/lib/auth-context';`
- Добавить (рядом с другими `@/lib` импортами): `import { useGameIdentity } from '@/lib/use-game-identity';`

### 2) Стр. 88
```
  const { user } = useAuth();
```
→
```
  const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);
```

### 3) Стр. 93 — удалить полностью
```
  const [hostId, setHostId] = useState<string>('');
```

### 4) Стр. 101–103
```
  const isHost = user?.id === hostId;
  isHostRef.current = isHost;
  const myId = user?.id ?? '';
```
→
```
  const isHost = isGameHost;
  isHostRef.current = isHost;
  const myId = effectivePlayerId;
```

### 5) `useRoomState` (стр. 128–132)
```
  useRoomState(roomId, (data) => {
    const d = data as { players: Player[]; hostId: string };
    if (d.players) setPlayers(d.players);
    if (d.hostId) setHostId(d.hostId);
  });
```
→
```
  useRoomState(roomId, (data) => {
    const d = data as { players: Player[] };
    if (d.players) setPlayers(d.players);
  });
```

Больше НИЧЕГО не менять: `isHostRef`, `myId`, вся игровая логика, рендер,
classic/letter режимы — без изменений. `useGameIdentity` сам ведёт guest/user
reconnect, отдельные reconnect-эффекты добавлять НЕ нужно.

## Whitelist (только эти файлы)
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`src/lib/use-game-identity.ts`, server, globals.css, TV, другие игры.

## Acceptance
- Гость-ведущий видит карточки выбора режима и кнопку «Начать игру», игра не виснет.
- Classic mode не затронут по логике (immutable-правило №3).
- `npx tsc --noEmit` — без новых ошибок (проверь, что `useAuth` больше нигде в
  файле не используется, иначе будет unused/undefined).
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/295-alias-game-identity-host-fix.md`. Не коммитить.
