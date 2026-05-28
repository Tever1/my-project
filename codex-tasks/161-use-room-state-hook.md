# TASK-161 — Вынести `room:state` + `room:get-state` в хук `useRoomState`

## Контекст

Аудит TASK-158 (кандидат 2). В 9 файлах повторяется одинаковый паттерн:
1. `on('room:state', handler)` — подписка
2. `emit('room:get-state', { code: roomId })` — запрос на маунте

Создаём `useRoomState(roomId, onState)`, который инкапсулирует оба шага.
Используем ref-паттерн (как в `useNavigateOnGameStart`) — подписка стабильна,
`onState` не попадает в deps и не вызывает повторной подписки.

**Scope этого таска:** 6 игровых страниц, где `room:state` либо уже отдельный
эффект (alias, who-am-i, mafia, crocodile), либо совмещён с `game:action`
в одном `useEffect` (spy, hundred-to-one) и требует сплита.

**Не трогаем:** quiz, TV (`src/app/tv/[roomId]/[gameType]/page.tsx`), Lobby —
у них сложная зависимость эффектов, отдельный таск.

## Whitelist файлов

**Создать:**
- `src/lib/use-room-state.ts`
- `codex-reports/161-use-room-state-hook.md`

**Изменить (6 файлов):**
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`

**НЕЛЬЗЯ трогать:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`src/app/game/[roomId]/quiz/**`, `src/app/tv/**`, `src/components/lobby/**`,
любые другие файлы.

---

## 1. Новый файл `src/lib/use-room-state.ts`

```ts
'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/lib/use-socket';

/**
 * Subscribes to `room:state` and requests the current state on mount.
 * Uses a ref so the subscription is stable and `onState` never stales.
 *
 * @param roomId   Room code to request state for.
 * @param onState  Called with raw event payload each time room state updates.
 */
export function useRoomState(roomId: string, onState: (data: unknown) => void) {
  const { on, emit } = useSocket();

  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  });

  useEffect(() => {
    const unsub = on('room:state', (data: unknown) => {
      onStateRef.current(data);
    });
    emit('room:get-state', { code: roomId });
    return unsub;
  }, [on, emit, roomId]);
}
```

---

## 2. alias и crocodile (standalone effect, одинаковый паттерн)

Текущий код в каждом файле (пример alias ~127-133):
```ts
useEffect(() => {
  const cleanup = on('room:state', (data: unknown) => {
    const d = data as { players: Player[]; hostId: string };
    if (d.players) setPlayers(d.players);
    if (d.hostId) setHostId(d.hostId);
  });
  emit('room:get-state', { code: roomId });
  return cleanup;
}, [on, emit, roomId]);
```

**Заменить на:**
```ts
useRoomState(roomId, (data) => {
  const d = data as { players: Player[]; hostId: string };
  if (d.players) setPlayers(d.players);
  if (d.hostId) setHostId(d.hostId);
});
```

Добавить импорт:
```ts
import { useRoomState } from '@/lib/use-room-state';
```

Если `emit` больше нигде в файле не используется — удалить из деструктуризации
`useSocket()`. Если используется — оставить. Аналогично с `on` (вряд ли
не нужен — у каждой игры есть `game:action` listener).

---

## 3. who-am-i (standalone effect)

Текущий код (~134-141):
```ts
useEffect(() => {
  const cleanup = on('room:state', (data: unknown) => {
    const room = data as { players?: Player[] };
    if (room.players) setPlayers(room.players);
  });
  emit('room:get-state', { code: roomId });
  return cleanup;
}, [on, emit, roomId]);
```

**Заменить на:**
```ts
useRoomState(roomId, (data) => {
  const room = data as { players?: Player[] };
  if (room.players) setPlayers(room.players);
});
```

---

## 4. mafia (standalone effect с nickname cache)

Текущий код (~166-183):
```ts
useEffect(() => {
  const cleanup = on('room:state', (data: unknown) => {
    const room = data as { players?: Player[] };
    if (room.players) {
      setNicknameCache((prev) => {
        const next = { ...prev };
        room.players!.forEach(p => { next[p.id] = p.nickname; });
        return next;
      });
      setPlayers(room.players);
    }
  });
  emit('room:get-state', { code: roomId });
  return cleanup;
}, [on, emit, roomId]);
```

**Заменить на:**
```ts
useRoomState(roomId, (data) => {
  const room = data as { players?: Player[] };
  if (room.players) {
    setNicknameCache((prev) => {
      const next = { ...prev };
      room.players!.forEach(p => { next[p.id] = p.nickname; });
      return next;
    });
    setPlayers(room.players);
  }
});
```

---

## 5. spy (СПЛИТ — room:state совмещён с game:action)

Текущий код (~188-214) — один большой `useEffect` с двумя слушателями:
```ts
useEffect(() => {
  const u1 = on('room:state', (data: unknown) => {
    const room = data as { players: GamePlayer[] };
    setS(prev => ({ ...prev, players: room.players }));
  });
  const u2 = on('game:action', (data: unknown) => {
    // ... spy logic
  });
  // ... timer setup (~232-248)
  emit('room:get-state', { code: roomId });
  return () => { u1(); u2(); /* + clearInterval */ };
}, [on, emit, roomId, ...]);
```

**Внимание:** в том же `useEffect` может быть setInterval/timer setup — 
**не перемещай его**. Если таймер есть — оставь `game:action` + таймер
в оригинальном `useEffect`, а `room:state` только вынеси.

**Шаги:**
1. Убери из исходного `useEffect`:
   - `const u1 = on('room:state', ...)` и соответствующий `u1()` из cleanup
   - `emit('room:get-state', { code: roomId })`
   - `emit` из dep-array если больше не нужен в этом эффекте
2. Добавь перед оставшимся `useEffect`:
   ```ts
   useRoomState(roomId, (data) => {
     const room = data as { players: GamePlayer[] };
     setS(prev => ({ ...prev, players: room.players }));
   });
   ```

---

## 6. hundred-to-one (СПЛИТ — аналогично spy)

Текущий код (~142-163) — `u1 = on('room:state', ...)` + `u2 = on('game:action', ...)`:

```ts
useEffect(() => {
  const u1 = on('room:state', (data: unknown) => {
    const room = data as { players: GamePlayer[] };
    setS(prev => ({ ...prev, players: room.players }));
  });
  const u2 = on('game:action', (data: unknown) => {
    // ... h2o logic including request-state handling
  });
  emit('room:get-state', { code: roomId });
  return () => { u1(); u2(); };
}, [on, emit, roomId, user, broadcast]);
```

**Шаги (аналогично spy):**
1. Убери `u1 = on('room:state', ...)` и `u1()` из cleanup, убери
   `emit('room:get-state', ...)` из эффекта.
2. Убери `emit` из deps если он больше не используется внутри этого `useEffect`
   (у h2o внутри `game:action` handler есть `broadcast(cur)` — это `useGameBroadcast`,
   не сам `emit`; так что `emit` из deps можно убрать).
3. Добавь перед оставшимся `useEffect`:
   ```ts
   useRoomState(roomId, (data) => {
     const room = data as { players: GamePlayer[] };
     setS(prev => ({ ...prev, players: room.players }));
   });
   ```

---

## Общие правила

1. **Не трогай `on` и `emit` в `useSocket()`** если они используются в
   других эффектах того же файла — убирай только из конкретного деструктурированного
   места если там больше нет других использований.
2. **Ref-паттерн** уже внутри хука — не нужно `useCallback` для `onState` в caller'е.
3. **Тип `data: unknown`** — парсинг оставить в caller'е, хук универсальный.
4. **`emit` из `useSocket()`** нужен для `room:get-state` — после выноса в хук
   убедись что `emit` в деструктуризации файла ещё нужен. Если нет — удали.

---

## Acceptance

```bash
# Ноль прямых on('room:state') + emit('room:get-state') в 6 whitelist-файлах
grep -n "on('room:state'\|emit('room:get-state'" \
  src/app/game/[roomId]/alias/page.tsx \
  src/app/game/[roomId]/who-am-i/page.tsx \
  src/app/game/[roomId]/mafia/page.tsx \
  src/app/game/[roomId]/crocodile/page.tsx \
  src/app/game/[roomId]/spy/page.tsx \
  src/app/game/[roomId]/hundred-to-one/page.tsx
# → 0 совпадений

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/161-use-room-state-hook.md`:
- По каждому файлу: было/стало (кол-во строк до/после эффекта)
- Был ли `emit` удалён из деструктуризации `useSocket()` в каком-то файле
- Результаты grep + lint + tsc

Не коммить, не пушить.
