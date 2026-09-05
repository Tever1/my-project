# TASK-159 — Вынести `emit('game:action', ...)` в хук `useGameAction`

## Контекст

Аудит TASK-158 показал: каждая игра вручную собирает конверт
`{ code: roomId, action, payload }` для события `game:action`. Это
повторяется ~50+ раз по 8 файлам. Цель — единый хук, меняем в одном
месте если изменится envelope.

Два варианта использования:
- **Динамический action** (crocodile, alias): `broadcast(action, payload)`
- **Фиксированный action** (spy/h2o/mafia/who-am-i): `broadcast(payload)`,
  action захардкожен в `useCallback`

Экспортируем два хука из одного файла:
```ts
useGameAction(roomId)     // → (action, payload?) => void
useGameBroadcast(roomId, action)  // → (payload?) => void
```

## Whitelist файлов

**Создать:**
- `src/lib/use-game-action.ts`
- `codex-reports/159-use-game-action-hook.md`

**Изменить (8 файлов):**
- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

**НЕЛЬЗЯ трогать:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`src/server/**`, любые другие файлы.

---

## 1. Новый файл `src/lib/use-game-action.ts`

```ts
'use client';

import { useCallback } from 'react';
import { useSocket } from '@/lib/use-socket';

/**
 * Returns a callback that wraps `game:action` emit with the room envelope.
 * Use when the action name varies per call.
 */
export function useGameAction(roomId: string) {
  const { emit } = useSocket();
  return useCallback(
    (action: string, payload: unknown = {}) => {
      emit('game:action', { code: roomId, action, payload });
    },
    [emit, roomId],
  );
}

/**
 * Returns a callback that broadcasts a fixed-action game event.
 * Use when the action channel is constant for the whole game (e.g. 'mafia',
 * 'spy:sync'). Callers only pass the payload.
 */
export function useGameBroadcast(roomId: string, action: string) {
  const sendAction = useGameAction(roomId);
  return useCallback(
    (payload: unknown = {}) => sendAction(action, payload),
    [sendAction, action],
  );
}
```

---

## 2. Crocodile и Alias (динамический action)

Обе страницы имеют:
```ts
const broadcast = useCallback(
  (action: string, payload: unknown) => {
    emit('game:action', { code: roomId, action, payload });
  },
  [emit, roomId],
);
```

**Заменить на:**
```ts
const broadcast = useGameAction(roomId);
```

Добавить импорт:
```ts
import { useGameAction } from '@/lib/use-game-action';
```

Удалить `useCallback` из import-а React если он больше нигде не используется в файле (проверь grep'ом).

Внимание: в **crocodile** есть ещё прямой `emit('game:action', ...)` на строке ~154 и ~313 вне локального `broadcast`. Заменить их тоже:
- строка ~154: `emit('game:action', { code: roomId, action: 'croc:state', payload: gameStateRef.current })` → `broadcast('croc:state', gameStateRef.current)`
- строка ~313: `emit('game:action', { code: roomId, action, payload: {} })` → `broadcast(action, {})`

В **alias** аналогичная прямая строка ~174:
- `emit('game:action', { code: roomId, action: 'alias:state', payload: gameStateRef.current })` → `broadcast('alias:state', gameStateRef.current)`

---

## 3. Spy (фиксированный action `'spy:sync'`)

Текущий `broadcast`:
```ts
const broadcast = useCallback((payload: Partial<SpyGameState>) => {
  emit('game:action', { code: roomId, action: 'spy:sync', payload });
}, [emit, roomId]);
```

**Заменить на:**
```ts
const broadcast = useGameBroadcast(roomId, 'spy:sync') as (payload: Partial<SpyGameState>) => void;
```

Добавить импорт `useGameBroadcast`.

Ещё прямые emit'ы в spy (~231, ~253, ~257) — тоже заменить:
- `emit('game:action', { code: roomId, action: 'spy:sync', payload: patch })` → `broadcast(patch)`
- `emit('game:action', { code: roomId, action: 'spy:stroke', payload: stroke })` — это другой action, не `spy:sync`. Нужен второй helper или прямой вызов `useGameAction`. Вариант: добавить `const sendAction = useGameAction(roomId)` и использовать для этих двух нестандартных emit'ов; или вызвать `sendAction('spy:stroke', stroke)`. **Не меняй тип/логику spy:stroke и spy:clear — только форму вызова.**

---

## 4. Hundred-to-one (фиксированный action `'h2o:sync'`)

Текущий `broadcast`:
```ts
const broadcast = useCallback((payload: Partial<GState>) => {
  emit('game:action', { code: roomId, action: 'h2o:sync', payload });
}, [emit, roomId]);
```

**Заменить на:**
```ts
const broadcast = useGameBroadcast(roomId, 'h2o:sync') as (payload: Partial<GState>) => void;
```

Прямой emit на строке ~155:
```ts
emit('game:action', { code: roomId, action: 'h2o:sync', payload: cur })
```
→ `broadcast(cur)`

---

## 5. Mafia (фиксированный action `'mafia'`)

Текущий `broadcast`:
```ts
const broadcast = useCallback(
  (action: GameAction) => {
    emit('game:action', { code: roomId, action: 'mafia', payload: action });
  },
  [emit, roomId],
);
```

**Заменить на:**
```ts
const broadcast = useGameBroadcast(roomId, 'mafia') as (payload: GameAction) => void;
```

Добавить импорт `useGameBroadcast`. Все call-sites `broadcast({ type: ... })` остаются без изменений.

---

## 6. Who-am-i (фиксированный action `'who-am-i'`)

Текущий `broadcast`:
```ts
const broadcast = useCallback(
  (action: GameAction) => {
    emit('game:action', { code: roomId, action: 'who-am-i', payload: action });
  },
  [emit, roomId],
);
```

**Заменить на:**
```ts
const broadcast = useGameBroadcast(roomId, 'who-am-i') as (payload: GameAction) => void;
```

---

## 7. Quiz (нет локального `broadcast`, много прямых emit'ов)

**Добавить** в компонент (рядом с другими хуками):
```ts
const sendAction = useGameAction(roomId);
```

**Добавить** импорт `useGameAction`.

**Заменить каждый** `emit('game:action', { code: roomId, action: X, payload: Y })` на `sendAction(X, Y)`:
- `{ payload: {} }` → `sendAction(X)` (пустой payload — дефолт)
- `{ payload: someObject }` → `sendAction(X, someObject)`
- `payload: gameStateRef.current as unknown as Record<string, unknown>` → `sendAction(X, gameStateRef.current)`

`emit` остаётся в файле — он используется для других событий (`room:get-state`, `game:end`, `tv:join` и т.п.). Не удаляй `emit` из `useSocket()`.

Строк с `emit('game:action'` в quiz ориентировочно ~20 — замени все до единой.

---

## 8. TV-страница (несколько прямых emit'ов)

**Добавить** в компонент:
```ts
const sendAction = useGameAction(roomId);
```

**Добавить** импорт `useGameAction`.

**Заменить** все `emit('game:action', { code: roomId, action: X, payload: Y })`:
- строки ~191-197: request-state emit'ы → `sendAction('h2o:request-state')`, `sendAction('croc:request-state')` и т.д.
- строка ~456: ещё один прямой emit → `sendAction(action, payload)`

`emit` остаётся для `tv:join` и других событий.

---

## Общие правила для всех файлов

1. **Никогда не меняй payload** — меняется только форма вызова, данные
   передаются as-is.
2. **Сохрани типизацию** — если `broadcast` был типизирован
   `(payload: SomeType) => void`, cast через `as` при необходимости.
3. **`emit` из `useSocket()` остаётся** в деструктуризации пока он
   нужен для НЕ `game:action` событий. Удаляй только если стал неиспользуемым.
4. **`useCallback` из React** — удаляй импорт только если он больше
   нигде не используется в файле.

---

## Acceptance

```bash
# Ноль прямых emit('game:action') в игровых страницах и TV
grep -rn "emit('game:action'" src/app/game/ src/app/tv/
# → должно быть 0 совпадений

# Хук используется в 8 файлах
grep -rn "useGameAction\|useGameBroadcast" src/app/
# → должно быть ≥16 строк (импорт + вызов в каждом файле)

npm run lint   # ✅
npx tsc --noEmit  # ✅
```

## Отчёт

В `codex-reports/159-use-game-action-hook.md`:
- Список изменённых файлов с кратким описанием что поменялось
- Результат двух grep'ов из Acceptance
- `npm run lint` и `npx tsc --noEmit`
- Если где-то не удалось убрать inline emit полностью — объяснить почему

Не коммить, не пушить.
