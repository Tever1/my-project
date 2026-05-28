# TASK-162 — Применить `useRoomState` к quiz и TV-странице

## Контекст

TASK-161 применил `useRoomState` к 6 игровым страницам, но намеренно
пропустил quiz и TV — у них `room:state` был в одном `useEffect` с
`game:action`. Та же процедура сплита, что была сделана для spy и
hundred-to-one в TASK-161.

После этого таска combined cleanup'ы `return () => { unsub1(); unsub2(); }`
исчезнут и кандидат 4 из аудита (cleanupAll) становится нерелевантным.

## Whitelist файлов

**Изменить:**
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

**Создать:**
- `codex-reports/162-use-room-state-quiz-and-tv.md`

**НЕЛЬЗЯ трогать:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`src/lib/**` (хук уже готов), любые другие файлы.

---

## 1. quiz (`src/app/game/[roomId]/quiz/page.tsx`)

Текущий большой `useEffect` (~строки 214-320) содержит:
- `const unsub1 = on('room:state', ...)` — устанавливает players + gameHostPlayerId
- `const unsub2 = on('game:action', ...)` — большой switch по quiz-фазам
- `emit('room:get-state', { code: roomId })`
- `return () => { unsub1(); unsub2(); }`
- deps: `[on, emit, roomId, sendAction]`

**Шаги:**

a) Добавить импорт (рядом с другими `@/lib/...`):
```ts
import { useRoomState } from '@/lib/use-room-state';
```

b) Добавить вызов хука **перед** существующим `useEffect` (рядом с
другими хуками вверху компонента):
```ts
useRoomState(roomId, (data) => {
  const room = data as {
    players: { id: string; nickname: string; isHost: boolean }[];
    gameHostPlayerId?: string | null;
  };
  setGameState((prev) => ({
    ...prev,
    players: room.players,
    gameHostPlayerId: room.gameHostPlayerId ?? prev.gameHostPlayerId,
  }));
});
```

c) В оставшемся `useEffect` (он теперь только для `game:action`):
- Удали строки с `unsub1` (объявление + вызов в cleanup)
- Удали `emit('room:get-state', { code: roomId })` (~строка 314)
- Замени `return () => { unsub1(); unsub2(); }` на просто `return unsub2;`
- Убери `emit` и `roomId` из dep-array если они больше не используются
  внутри этого `useEffect` (после удаления они там не нужны)
- Итоговый dep-array: `[on, sendAction]`

---

## 2. TV (`src/app/tv/[roomId]/[gameType]/page.tsx`)

Аналогичный `useEffect` (~строки 204-401):
- `const unsub1 = on('room:state', ...)` — `setPlayers(room.players)`
- `const unsub2 = on('game:action', ...)` — большой if-else по gameType
- `emit('room:get-state', { code: roomId })`
- `return () => { unsub1(); unsub2(); }`
- deps: `[on, emit, roomId, gameType, locale]`

**Шаги:**

a) Добавить импорт `useRoomState`.

b) Добавить вызов хука перед этим `useEffect`:
```ts
useRoomState(roomId, (data) => {
  const room = data as { players: PlayerInfo[]; status: string };
  setPlayers(room.players);
});
```

c) В оставшемся `useEffect`:
- Удали `unsub1` и его cleanup
- Удали `emit('room:get-state', { code: roomId })`
- Замени cleanup на `return unsub2;`
- Убери `emit` и `roomId` из dep-array
- Итоговый dep-array: `[on, gameType, locale]`

---

## Проверки

```bash
# Ноль room:state + room:get-state в quiz и TV
grep -n "on('room:state'\|emit('room:get-state'" \
  src/app/game/[roomId]/quiz/page.tsx \
  src/app/tv/[roomId]/[gameType]/page.tsx
# → 0 совпадений

# Ноль combined socket cleanups во всех игровых файлах
grep -rn "unsub1();\|u1();" \
  src/app/game/ src/app/tv/[roomId]/[gameType]/page.tsx
# → 0 совпадений (все cleanups теперь return unsub; или return () => clearInterval)

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/162-use-room-state-quiz-and-tv.md`:
- Что изменилось в каждом файле
- Итоговые dep-array обоих оставшихся `useEffect`'ов
- Результаты всех grep'ов и lint/tsc

Не коммить, не пушить.
