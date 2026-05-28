# TASK-158 — Аудит socket-listener'ов

## Сводная таблица кандидатов

| # | Паттерн | Файлы (кол-во) | Текущее место | Предлагаемая абстракция | Приоритет | Риск | Оценка работы |
|---|---------|----------------|---------------|--------------------------|-----------|------|----------------|
| 1 | `*:request-state` / `*:sync` late-TV state handshake | 4 game pages + TV | TV sends `xxx:request-state`; host page answers with full `xxx:sync/state` | `useGameStateSync(gameType, roomId, stateRef, canRespondRef, events)` | High | Medium | 1 codex task |
| 2 | `room:state` + `room:get-state` room snapshot bootstrap | 7 game pages + TV + Lobby | `useEffect` subscribes to `room:state`, then emits `room:get-state` | `useRoomState(roomId, onRoomState, options)` | High | Low | 1 codex task |
| 3 | `emit('game:action', { code, action, payload })` helpers | 8 game pages + TV | Inline emits and local `broadcast` callbacks | `useGameAction(roomId)` returning `sendAction` / `makeBroadcast` | High | Low | 1 codex task |
| 4 | Paired `room:state` + `game:action` subscriptions in one effect | 4 game pages + TV | `const u1 = on(...); const u2 = on(...); return () => { u1(); u2(); }` | `useSocketListeners([[event, handler], ...])` cleanup combinator | Medium | Low | 1 codex task |
| 5 | `game:started` navigation from room surfaces | Lobby + `/join/[code]` | Two page-local listeners navigate to game/TV route | `useNavigateOnGameStart(targetResolver)` | Medium | Low | 1 codex task |
| 6 | `room:kicked` + `room:not-found` room teardown | Lobby only now | Separate Lobby listeners clear room state and route away | `useRoomLifecycleEvents(...)` after Lobby split | Low | Low | 1 codex task |

**Приоритет:** High = >3 файлов дублируют 5+ строк; Medium = 2-3 файла; Low = <2 файлов или сложная вариативность.  
**Риск:** Low = механический; Medium = меняется shape данных; High = трогает server.mts.

Примечание по зоне аудита: в `src/app/game/[roomId]/*/page.tsx` фактически 8 страниц, не 7: дополнительно есть `truth-or-dare`. Я включил её в инвентаризацию, потому что она содержит socket-listener'ы.

## Инвентаризация найденных listener'ов

| Event | Места | Кандидат? | Комментарий |
|---|---|---|---|
| `room:state` | `spy:189`, `alias:126`, `who-am-i:138`, `mafia:170`, `crocodile:103`, `quiz:221`, `truth-or-dare:90`, `hundred-to-one:143`, `tv:204`, `join/[code]:62`, `Lobby:245` | Да | Повторяется широко; handler shape отличается, но подписка + cleanup + часто `room:get-state` механические. |
| `game:action` | `spy:193`, `alias:151`, `alias:523`, `who-am-i:150`, `mafia:190`, `crocodile:128`, `crocodile:321`, `quiz:233`, `truth-or-dare:114`, `truth-or-dare:323`, `hundred-to-one:147`, `tv:209` | Частично | Сам listener общий, но основная логика игроспецифична. Выносить можно только shell/cleanup, не switch bodies. |
| `game:started` | `join/[code]:74`, `Lobby:316` | Да | Одинаковый event и близкая навигация; отличается target: join всегда phone game, Lobby зависит от `myRole`. |
| `room:show-qr` | `Lobby:329` | Нет сейчас | Клиентский listener найден только в Lobby. Можно оставить локально до дальнейшего split Lobby. |
| `room:kicked` | `Lobby:289` | Low | Единственное место; логика связана с Lobby state/toast/router. |
| `room:not-found` | `Lobby:304` | Low | Единственное client-listener место в зоне аудита; полезно объединять только с room lifecycle в Lobby. |
| `connect` / `disconnect` | `use-socket.ts:30`, `use-socket.ts:31` | Нет | Низкоуровневый transport state, уже централизован в `useSocket`. |
| `visibilitychange` -> `player:away/back` | `use-socket.ts:52` | Нет | Page Visibility не дублируется в страницах; уже централизовано. |

## Детально по кандидатам

### Кандидат 1: `*:request-state` / `*:sync` late-TV state handshake

**Текущие места**:
- `src/app/tv/[roomId]/[gameType]/page.tsx:187` — после `tv:join` TV отправляет `h2o/croc/alias/quiz:request-state`.
- `src/app/game/[roomId]/quiz/page.tsx:311` — game host отвечает `quiz:sync` текущим `gameStateRef`.
- `src/app/game/[roomId]/crocodile/page.tsx:151` — host отвечает `croc:state`.
- `src/app/game/[roomId]/alias/page.tsx:171` — host отвечает `alias:state`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:150` — game host отвечает `h2o:sync`.

**Что общее, что разное:**
- Общее: TV запрашивает полный state после join; host/game-host проверяет право отвечать и re-broadcast'ит текущий ref через `game:action`.
- Разное: event names (`state` vs `sync`), guard (`isHostRef` vs `isGameHostRef` vs `roles[myId] === 'host'`), тип state.

**Предлагаемая абстракция:**
```ts
// src/lib/use-game-state-sync.ts
export function useGameStateSync<T>(args: {
  roomId: string;
  requestAction: string;
  responseAction: string;
  stateRef: React.RefObject<T | null>;
  canRespondRef: React.RefObject<boolean>;
}) { ... }

export function requestTvStateAfterJoin(gameType: string): string | null { ... }
```

Практичнее разделить на две части: helper mapping для TV request action и hook для host response. Тогда server API не меняется.

**Что НЕ вошло и почему:** `spy:sync` и `mafia` TV updates не имеют `request-state` контракта сейчас; добавлять его было бы новым поведением, не рефакторингом.

**Acceptance для будущего таска:** `grep -R "request-state" src/app/game src/app/tv` оставляет только mapping/helper; lint+tsc OK; mid-game TV reconnect вручную проверен для quiz/crocodile/alias/hundred-to-one.

### Кандидат 2: `room:state` + `room:get-state` room snapshot bootstrap

**Текущие места**:
- `src/app/game/[roomId]/spy/page.tsx:189` / `:208` — players from room state, initial state request.
- `src/app/game/[roomId]/alias/page.tsx:126` / `:131` — players + hostId, initial request.
- `src/app/game/[roomId]/who-am-i/page.tsx:138` / `:142` — players, initial request.
- `src/app/game/[roomId]/mafia/page.tsx:170` / `:182` — players + nickname cache, initial request.
- `src/app/game/[roomId]/crocodile/page.tsx:103` / `:108` — players + hostId, initial request.
- `src/app/game/[roomId]/quiz/page.tsx:221` / `:320` — players + gameHostPlayerId, initial request.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:143` / `:159` — players, initial request.
- `src/app/tv/[roomId]/[gameType]/page.tsx:204` / `:391` — players, initial request.
- `src/components/lobby/Lobby.tsx:245` / `:260` — normalized room state; emits when `roomCode && isConnected`.

**Что общее, что разное:**
- Общее: subscribe to `room:state`, parse `players`/host fields, emit `room:get-state` with `{ code }`.
- Разное: target state update differs; Lobby waits for `isConnected` and `roomCode`; `truth-or-dare` subscribes but does not call `room:get-state`.

**Предлагаемая абстракция:**
```ts
// src/lib/use-room-state.ts
export function useRoomState<T>(
  roomId: string | null,
  onState: (room: T) => void,
  options?: { requestOnMount?: boolean; enabled?: boolean }
) { ... }
```

Hook should own the subscription and optional `room:get-state` emit, while callers keep typed parsing inside `onState`.

**Что НЕ вошло и почему:** `/join/[code]` listens to `room:state` but does not request state before join; pulling it in may change join-page semantics. Treat it as a second pass.

**Acceptance для будущего таска:** game pages no longer contain direct `on('room:state'` boilerplate unless they intentionally skip `room:get-state`; `room:get-state` grep in game/TV pages reduced to hook usage; lint+tsc OK.

### Кандидат 3: `game:action` emit helper

**Текущие места**:
- `src/app/game/[roomId]/crocodile/page.tsx:116` — local `broadcast(action, payload)`.
- `src/app/game/[roomId]/alias/page.tsx:139` — local `broadcast(action, payload)`.
- `src/app/game/[roomId]/who-am-i/page.tsx:127` — local `broadcast(GameAction)` with fixed action `'who-am-i'`.
- `src/app/game/[roomId]/mafia/page.tsx:159` — local `broadcast(GameAction)` with fixed action `'mafia'`.
- `src/app/game/[roomId]/spy/page.tsx:242` — local `broadcast(patch)` with fixed action `'spy:sync'`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:163` — local `broadcast(patch)` with fixed action `'h2o:sync'`.
- `src/app/game/[roomId]/truth-or-dare/page.tsx:102` — local `broadcast(action, payload)`.
- `src/app/game/[roomId]/quiz/page.tsx:183` and many below — many direct emits of same envelope.
- `src/app/tv/[roomId]/[gameType]/page.tsx:191` — request-state emits use same envelope.

**Что общее, что разное:**
- Общее: every emit envelope is `{ code: roomId, action, payload }` on event `game:action`.
- Разное: some games use fixed action channel with typed payload (`mafia`, `who-am-i`), some use many action names, some require empty payload.

**Предлагаемая абстракция:**
```ts
// src/lib/use-game-action.ts
export function useGameAction(roomId: string) {
  const { emit } = useSocket();
  return useCallback((action: string, payload: unknown = {}) => {
    return emit('game:action', { code: roomId, action, payload });
  }, [emit, roomId]);
}
```

Optionally add `useGameBroadcast<T>(roomId, action)` for fixed-action games, but keep it thin.

**Что НЕ вошло и почему:** Do not wrap `game:end`, `game:start`, `game:state-update`; they are separate server events with different contracts.

**Acceptance для будущего таска:** new helper used in at least 3 simplest pages first (`crocodile`, `alias`, `hundred-to-one`); no change to emitted payload shape; lint+tsc OK.

### Кандидат 4: Socket listener cleanup combinator

**Текущие места**:
- `src/app/game/[roomId]/spy/page.tsx:188` — subscribes to `room:state` + `game:action`, returns `u1(); u2();`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:142` — same two-listener shape.
- `src/app/game/[roomId]/quiz/page.tsx:220` — same two-listener shape with expanded handlers.
- `src/app/tv/[roomId]/[gameType]/page.tsx:203` — same two-listener shape.
- `src/app/game/[roomId]/alias/page.tsx:150` and `crocodile:127` currently only one unsub in separate effect, but same cleanup idiom.

**Что общее, что разное:**
- Общее: multiple `on()` calls in one effect, manual unsubscribe fan-out.
- Разное: dependencies and handlers stay local.

**Предлагаемая абстракция:**
```ts
// src/lib/use-socket-listeners.ts
export function useSocketListeners(
  listeners: Array<[event: string, handler: (...args: unknown[]) => void]>,
  deps: React.DependencyList
) { ... }
```

Safer alternative: simple `cleanupAll(...unsubs)` helper to avoid hook dependency pitfalls.

**Что НЕ вошло и почему:** Effects with interval cleanup are not socket-listener cleanup and should remain local.

**Acceptance для будущего таска:** manual `return () => { u1(); u2(); }` socket-only cleanups replaced by helper in 3-4 files; no handler bodies moved; lint+tsc OK.

### Кандидат 5: `game:started` navigation

**Текущие места**:
- `src/components/lobby/Lobby.tsx:316` — routes TV to `/tv/{roomCode}/{gameType}`, phone to `/game/{roomCode}/{gameType}`.
- `src/app/join/[code]/page.tsx:74` — routes player to `/game/{roomCode}/{gameType}`.

**Что общее, что разное:**
- Общее: listens to `game:started`, extracts `{ gameType, roomCode }`, pushes a route.
- Разное: Lobby has `myRole` branch; join page is always player route.

**Предлагаемая абстракция:**
```ts
// src/lib/use-navigate-on-game-start.ts
export function useNavigateOnGameStart(
  resolvePath: (payload: { roomCode: string; gameType: string }) => string
) { ... }
```

This mirrors existing `useNavigateOnGameEnd` without changing server behavior.

**Что НЕ вошло и почему:** `game:start` emits from Lobby/join are command actions, not listener navigation.

**Acceptance для будущего таска:** no direct `on('game:started'` in Lobby or `/join/[code]`; existing route targets unchanged; lint+tsc OK.

### Кандидат 6: Lobby room lifecycle listeners

**Текущие места**:
- `src/components/lobby/Lobby.tsx:289` — `room:kicked` clears room state, closes menu, toast/routes.
- `src/components/lobby/Lobby.tsx:304` — `room:not-found` clears room state, closes menu, routes.
- `src/components/lobby/Lobby.tsx:329` — `room:show-qr` toggles TV waiting screen.

**Что общее, что разное:**
- Общее: room-level events mutate Lobby state.
- Разное: each event is currently single-use, so extracting now mostly helps only if Lobby is split into hooks/components.

**Предлагаемая абстракция:**
```ts
// src/components/lobby/use-lobby-room-events.ts
export function useLobbyRoomEvents(args: { ...callbacks }) { ... }
```

Keep it component-local under `components/lobby` if done; this is not a generic socket abstraction.

**Что НЕ вошло и почему:** `room:show-qr` is intentionally only in Lobby per grep; not enough duplication for a shared lib hook.

**Acceptance для будущего таска:** only if Lobby is being decomposed anyway; no standalone refactor task needed before that.

## Anti-recommendations (паттерны, которые НЕ стоит выносить)

- **`on('game:action', ...)` handler bodies** — formally repeated across all games, but each switch encodes game rules and local state transitions. A generic handler would become either a giant registry or callback plumbing with little value. Extract only the subscription shell or emit helper.
- **`room:show-qr`** — client listener exists only in `Lobby.tsx:329`. It is a good Lobby-local concern, not a shared hook yet.
- **Page Visibility / `player:away` / `player:back`** — already centralized in `src/lib/use-socket.ts:22` and `:41`; no duplicates in game pages, TV, join, or Lobby.
- **`connect` / `disconnect` socket listeners** — low-level connection state belongs inside `useSocket`; moving it out would make consumers more fragile.
- **`game:end` emits** — repeated as an end-game command, but behavior is simple and not a listener. Existing `useNavigateOnGameEnd` already covers the receive side.
- **`truth-or-dare` room bootstrap as-is** — it listens to `room:state` but does not emit `room:get-state`; changing that may be correct, but it is behavior work, not audit/refactor.

## Предлагаемая очерёдность

1. **`useGameAction(roomId)`** — lowest-risk value: changes only client envelope duplication, no server API, easy to verify by grep and TypeScript.
2. **`useRoomState(roomId, onState)`** — removes the most repeated listener+request boilerplate. Keep parsing callbacks local to avoid over-generalizing room state.
3. **`useGameStateSync` for late-TV request-state** — high product value because it protects a historically fragile TV reconnect path. Do after `useGameAction`, since it can reuse that helper.

`useNavigateOnGameStart` is clean and small, but only touches 2 files, so I would schedule it after the broader socket cleanup unless a nearby join/lobby task already has those files open.

## Заметки про серверную сторону

- `src/server/socket-handlers.mts:273` broadcasts every `game:action` unchanged as `{ action, payload, from }`. Client abstractions must preserve this envelope; no server API change is needed for candidates 1-5.
- `room:get-state` at `src/server/socket-handlers.mts:222` sends `room:not-found` directly to the requester when missing. A `useRoomState` hook should either expose an error callback or leave `room:not-found` handling in Lobby.
- `tv:join` joins the socket room before its callback at `src/server/socket-handlers.mts:210`; TV correctly sends `request-state` inside that callback. Any refactor must preserve this ordering.
- `player:away/back` relies on `playerRooms` being populated by room join/TV join. Since `useSocket` emits `player:back` on connect globally, it is harmless when no room is mapped; the server no-ops.

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ✅ | Already up to date. |
| Grep `on(...)` / `emit(...)` по зоне аудита | ✅ | `rg` недоступен, использован `grep -RInE`. |
| Production-code edits | ✅ | Не выполнялись. |
| Acceptance: минимум 3 кандидата | ✅ | 6 кандидатов. |

## Отклонения от ТЗ

Нет отклонений. Единственное уточнение: фактическая зона `src/app/game/[roomId]/*/page.tsx` содержит 8 игровых страниц, поэтому `truth-or-dare` включена в аудит сверх формулировки "7 игр".

## Открытые вопросы для Claude

- Нужно ли включать `truth-or-dare` в будущие socket-refactor таски как полноценную поддерживаемую игру, или это legacy/experimental страница?
- Стоит ли в отдельном таске проверить, почему `truth-or-dare` не делает `room:get-state` при mount, в отличие от остальных игровых страниц?
