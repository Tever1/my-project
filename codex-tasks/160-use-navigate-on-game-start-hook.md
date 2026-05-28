# TASK-160 — Вынести `game:started` навигацию в хук `useNavigateOnGameStart`

## Контекст

Аудит TASK-158 (кандидат 5). Два места подписываются на `game:started` и
навигируют к игровому маршруту:

- `src/app/join/[code]/page.tsx:74` — всегда `/game/${roomCode}/${gameType}`
- `src/components/lobby/Lobby.tsx:316` — `/tv/...` или `/game/...` в
  зависимости от `myRole`; плюс вызывает `setIsWaitingForPlayers(false)`
  перед навигацией

Хук принимает `resolvePath` (функция маршрута) и опциональный `onNavigate`
(side-effect до навигации — нужен Lobby). Внутри использует ref-паттерн,
чтобы подписка оставалась стабильной и не пересоздавалась при каждом
ре-рендере caller'а.

## Whitelist файлов

**Создать:**
- `src/lib/use-navigate-on-game-start.ts`
- `codex-reports/160-use-navigate-on-game-start-hook.md`

**Изменить:**
- `src/app/join/[code]/page.tsx`
- `src/components/lobby/Lobby.tsx`

**НЕЛЬЗЯ трогать:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
любые другие файлы.

---

## 1. Новый файл `src/lib/use-navigate-on-game-start.ts`

```ts
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';

type GameStartPayload = { roomCode: string; gameType: string };

/**
 * Subscribes to `game:started` and navigates to the resolved path.
 * Uses refs so the subscription is stable regardless of how often the
 * caller re-renders or the callbacks change.
 *
 * @param resolvePath  Maps the event payload to the target URL.
 * @param onNavigate   Optional side-effect called just before navigation
 *                     (e.g. closing a waiting-for-players overlay).
 */
export function useNavigateOnGameStart(
  resolvePath: (payload: GameStartPayload) => string,
  onNavigate?: () => void,
) {
  const router = useRouter();
  const { on } = useSocket();

  // Keep latest callbacks in refs so the effect closure never goes stale.
  const resolveRef = useRef(resolvePath);
  const onNavigateRef = useRef(onNavigate);
  useEffect(() => {
    resolveRef.current = resolvePath;
    onNavigateRef.current = onNavigate;
  });

  useEffect(() => {
    return on('game:started', (payload: unknown) => {
      const data = payload as GameStartPayload;
      onNavigateRef.current?.();
      router.push(resolveRef.current(data));
    });
  }, [on, router]);
}
```

---

## 2. `src/app/join/[code]/page.tsx`

Текущий код (~строки 73-78):
```ts
useEffect(() => {
  return on("game:started", (payload: unknown) => {
    const data = payload as { gameType: string; roomCode: string };
    router.push(`/game/${data.roomCode}/${data.gameType}`);
  });
}, [on, router]);
```

**Заменить на вызов хука** (убрать весь `useEffect` выше):
```ts
useNavigateOnGameStart(
  ({ roomCode, gameType }) => `/game/${roomCode}/${gameType}`,
);
```

Добавить импорт:
```ts
import { useNavigateOnGameStart } from '@/lib/use-navigate-on-game-start';
```

Если после удаления `useEffect` `router` больше нигде в файле не
используется — удали `const router = useRouter()` и импорт `useRouter`.
Если используется — оставь.

---

## 3. `src/components/lobby/Lobby.tsx`

Текущий код (~строки 315-326):
```ts
useEffect(() => {
  return on('game:started', (payload: unknown) => {
    const data = payload as { gameType: string; roomCode: string };
    setIsWaitingForPlayers(false);
    if (myRole === "tv") {
      router.push(`/tv/${data.roomCode}/${data.gameType}`);
    } else {
      router.push(`/game/${data.roomCode}/${data.gameType}`);
    }
  });
}, [myRole, on, router]);
```

**Заменить на:**
```ts
useNavigateOnGameStart(
  ({ roomCode, gameType }) =>
    myRole === 'tv'
      ? `/tv/${roomCode}/${gameType}`
      : `/game/${roomCode}/${gameType}`,
  () => setIsWaitingForPlayers(false),
);
```

Добавить импорт `useNavigateOnGameStart` рядом с другими `@/lib/...`.

`router` в Lobby используется в других местах — **не удалять**.

---

## Acceptance

```bash
# Ноль прямых on('game:started') вне хука
grep -rn "game:started" src/app/ src/components/
# → должно быть 0 совпадений (всё внутри хука)

grep -n "game:started" src/lib/use-navigate-on-game-start.ts
# → 1 совпадение

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/160-use-navigate-on-game-start-hook.md`:
- Список изменений по файлам
- Был ли удалён `useRouter` из join/[code]/page.tsx (да/нет и почему)
- Результаты grep'ов и lint/tsc

Не коммить, не пушить.
