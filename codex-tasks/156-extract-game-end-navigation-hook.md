# TASK-156 — Вынести post-game навигацию в общий хук

## Контекст

В TASK-153/155 мы шесть раз правили строку `router.push(\`/lobby/${roomId}\`)`
на `\`/join/${roomId}\`` в семи разных файлах. Если завтра решим, что
телефон уходит, скажем, на `/?return=${roomId}` или добавим тост — снова
семь правок и большой risk пропустить файл.

Цель — единая точка ответственности за то, куда уходит **телефон** после
`game:ended`. TV-страница (`src/app/tv/[roomId]/[gameType]/page.tsx`)
имеет другую цель навигации (`/lobby/${roomId}`), и она там в одном
месте — её НЕ трогаем.

## Whitelist файлов

**Создать:**
- `src/lib/use-navigate-on-game-end.ts`
- `codex-reports/156-extract-game-end-navigation-hook.md`

**Изменить (7 файлов — все игровые страницы):**
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`

**НЕЛЬЗЯ трогать:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`src/app/tv/**`, любые другие файлы.

## Что сделать

### 1. Новый хук `src/lib/use-navigate-on-game-end.ts`

```ts
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';

/**
 * Subscribes to the `game:ended` socket event and routes the phone client
 * away from the game page. Single source of truth — change the destination
 * here, not in every game page.
 */
export function useNavigateOnGameEnd(roomId: string) {
  const router = useRouter();
  const { on } = useSocket();

  useEffect(() => {
    const unsub = on('game:ended', () => {
      router.push(`/join/${roomId}`);
    });
    return unsub;
  }, [on, router, roomId]);
}
```

### 2. Подключить хук в каждую из 7 игровых страниц

Для каждой страницы:

a) Добавить импорт рядом с другими импортами из `@/lib/...`:
```ts
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
```

b) Вызвать хук внутри компонента (после `useParams()`/`useRouter()`,
до основных `useEffect`'ов):
```ts
useNavigateOnGameEnd(roomId);
```

c) Удалить старую inline-подписку на `game:ended`:
- **quiz** — строки ~318-320: убрать `const unsub3 = on('game:ended', ...)` и `unsub3()` из cleanup. Если cleanup потерял смысл — упростить.
- **spy** — строка ~207: убрать `const u3 = on('game:ended', ...)` и `u3()` из cleanup.
- **alias** — строка ~178: убрать `const unsub2 = on('game:ended', ...)`. Аккуратно с нумерацией остальных unsub'ов.
- **crocodile** — строка ~159: то же.
- **hundred-to-one** — строка ~158: то же.
- **mafia** — добавленные в TASK-155 строки (`const unsubEnded = on('game:ended', ...)` и комбинированный cleanup): откатить к простому `return cleanup;`. Убрать из dep-array `router` и `roomId`, если они туда добавлялись только ради этой подписки. **`useRouter` импорт оставить только если используется ещё где-то — в mafia после удаления он не нужен, импорт и `const router = useRouter()` удалить.**
- **who-am-i** — то же что mafia: откатить добавленный cleanup и импорт `useRouter`.

d) Если в результате у `useRouter` не остаётся других применений в файле — **удалить** и сам импорт, и `const router = useRouter()`. Проверь grep'ом по файлу.

### 3. Не дублировать подписки

После замены — **только хук** подписывается на `game:ended`. Никаких
inline-`on('game:ended', ...)` в игровых файлах остаться не должно.

## Acceptance

- `grep -rn "game:ended" src/app/game/` показывает 0 совпадений (вся подписка ушла в хук).
- `grep -n "game:ended" src/lib/use-navigate-on-game-end.ts` — 1 совпадение.
- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- Поведение не изменилось: на `game:ended` телефон во всех 7 играх уходит на `/join/${roomId}`.

## Заметки про возможные грабли

1. **`useSocket().on`** возвращает функцию `unsubscribe`. Хук возвращает
   её напрямую из `useEffect` cleanup — это норма.
2. **Race с unmount:** хук безопасен, потому что подписка живёт ровно
   столько же сколько игровая страница смонтирована, как и раньше.
3. **TV-страница не использует хук** — у неё своя навигация на `/lobby`,
   её эта задача не трогает.
4. **`useParams` возвращает `{ roomId: string }` или `string | string[]`?**
   В существующих игровых страницах оно типизировано как
   `useParams<{ roomId: string }>()` — этот же тип у `roomId`. Хук
   принимает `string`, всё совпадает.
5. Если линтер ругается на `react-hooks/exhaustive-deps` для какого-то
   из 7 файлов из-за неиспользуемой переменной (например `router`) —
   удали её вместе с импортом.

## Отчёт

В `codex-reports/156-extract-game-end-navigation-hook.md`:
- Какие файлы изменены и какие строки удалены/добавлены
- Подтверждение `grep -rn "game:ended" src/app/game/` = 0 совпадений
- Результаты `npm run lint` и `npx tsc --noEmit`
- Если в каком-то файле `useRouter` оставлен — указать почему (есть другое применение)

Не коммить, не пушить.
