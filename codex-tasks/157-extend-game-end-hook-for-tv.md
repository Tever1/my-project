# TASK-157 — Расширить `useNavigateOnGameEnd` для TV-страницы

## Контекст

После TASK-156 у нас есть хук `useNavigateOnGameEnd(roomId)`, который
подписывает **телефон** на `game:ended` и уводит на `/join/${roomId}`.
В TV-странице (`src/app/tv/[roomId]/[gameType]/page.tsx`) до сих пор
осталась inline-подписка с маршрутом `/lobby/${roomId}` — последняя
точка, где живёт post-game навигация. Уберём и её.

Решение — добавить опциональный параметр `target` в существующий хук
(`'phone' | 'tv'`, по умолчанию `'phone'`). Семь игровых страниц не
меняются (используют дефолт), TV получает `'tv'`.

## Whitelist файлов

**Изменить:**
- `src/lib/use-navigate-on-game-end.ts`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

**Создать:**
- `codex-reports/157-extend-game-end-hook-for-tv.md`

**НЕЛЬЗЯ трогать:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`src/app/game/**` (их вызов остаётся без изменений — проверяется только grep'ом),
любые другие файлы.

## Что сделать

### 1. Расширить хук

Текущий код:

```ts
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

Заменить на:

```ts
type NavigateTarget = 'phone' | 'tv';

const TARGET_PATHS: Record<NavigateTarget, (roomId: string) => string> = {
  phone: (roomId) => `/join/${roomId}`,
  tv: (roomId) => `/lobby/${roomId}`,
};

export function useNavigateOnGameEnd(
  roomId: string,
  target: NavigateTarget = 'phone',
) {
  const router = useRouter();
  const { on } = useSocket();
  useEffect(() => {
    const unsub = on('game:ended', () => {
      router.push(TARGET_PATHS[target](roomId));
    });
    return unsub;
  }, [on, router, roomId, target]);
}
```

Доктринальный комментарий в JSDoc можно оставить прежний или дополнить
парой строк про `target`.

### 2. TV-страница

В `src/app/tv/[roomId]/[gameType]/page.tsx`:

a) Добавить импорт рядом с другими `@/lib/...`:
```ts
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
```

b) Внутри компонента (после `useParams()`, рядом с другими хук-вызовами)
вызвать:
```ts
useNavigateOnGameEnd(roomId, 'tv');
```

c) Удалить inline-подписку — это строки ~390-392:
```ts
const unsub3 = on('game:ended', () => {
  router.push(`/lobby/${roomId}`);
});
```
И удалить `unsub3()` из cleanup-функции (строка ~401), и `unsub3` из
объявления.

d) Проверь grep'ом — если `router` больше нигде в файле не используется,
удали `const router = useRouter()` и импорт `useRouter` из `next/navigation`.
(Сейчас по grep'у `router.` встречается только в этой одной строке —
после удаления `router` станет неиспользуемым.)

e) Если в dep-array `useEffect`'а с подпиской на `game:action` остаётся
`router` — убери его тоже (вместе со всем что больше не используется
внутри этого `useEffect`).

### 3. 7 игровых страниц — НЕ трогать

Они вызывают `useNavigateOnGameEnd(roomId)` без второго аргумента →
получат дефолт `'phone'` → поведение идентично.

## Acceptance

- `grep -rn "game:ended" src/app/` → 0 совпадений (вся подписка только в хуке).
- `grep -n "game:ended" src/lib/use-navigate-on-game-end.ts` → 1 совпадение.
- `grep -rn "useNavigateOnGameEnd" src/app/` → 8 совпадений (7 игр + TV).
- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- Поведение TV не меняется: на `game:ended` уходит на `/lobby/${roomId}`.
- Поведение телефона не меняется: уходит на `/join/${roomId}`.

## Заметки

1. **Не вводи новые экспорты типов** в публичный API хука кроме того что
   нужно для вызова. `NavigateTarget` может остаться неэкспортируемым,
   если TS позволяет передавать литералы `'phone'`/`'tv'` без явного
   типа (а он позволяет).
2. **Дефолт `'phone'`** обязателен — иначе 7 файлов придётся править.
3. **`useRouter` в TV-странице** — после удаления подписки скорее всего
   станет полностью неиспользуемым. Линт ругнётся → удалить и его, и
   импорт.

## Отчёт

В `codex-reports/157-extend-game-end-hook-for-tv.md`:
- diff'ы хука и TV-страницы (или сводка изменений)
- Подтверждение всех 5 acceptance-grep'ов
- Результаты `npm run lint` и `npx tsc --noEmit`
- Был ли удалён `useRouter` из TV-страницы

Не коммить, не пушить.
