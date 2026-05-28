# TASK-155 — `game:ended` → `/join/${roomId}` для остальных 6 игр

## Контекст

В TASK-153 у квиза заменили навигацию: при `game:ended` телефон уходит на
`/join/${roomId}` (а не `/lobby/${roomId}`), потому что у гостя на `/lobby`
нет авторизации и страница падает. TV (`src/app/tv/...`) уже уходит на
`/lobby/${roomId}` — это правильно.

Сейчас остальные 6 игр всё ещё ведут на `/lobby/${roomId}`. У части игр
вообще нет обработчика `game:ended` — нужно его добавить.

## Whitelist файлов

**Изменить:**
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`

**Создать:**
- `codex-reports/155-game-ended-phone-to-join-other-games.md`

**НЕЛЬЗЯ трогать:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
любые другие файлы.

## Что сделать

### 1. spy / alias / crocodile / hundred-to-one (4 файла)

В каждом файле найди строку с `router.push(\`/lobby/${roomId}\`)` внутри
обработчика `on('game:ended', ...)` и замени `/lobby/` на `/join/`.

Ориентир (точные строки на момент написания, могут сдвинуться):
- `spy/page.tsx:207` — `const u3 = on('game:ended', () => router.push(\`/lobby/${roomId}\`));`
- `alias/page.tsx:178` — `const unsub2 = on('game:ended', () => router.push(\`/lobby/${roomId}\`));`
- `crocodile/page.tsx:159` — `const unsub2 = on('game:ended', () => router.push(\`/lobby/${roomId}\`));`
- `hundred-to-one/page.tsx:158` — `const u3 = on('game:ended', () => router.push(\`/lobby/${roomId}\`));`

Замена: `\`/lobby/${roomId}\`` → `\`/join/${roomId}\``.

### 2. mafia / who-am-i (2 файла) — добавить обработчик

Сейчас они emit'ят `game:end`, но не подписаны на `game:ended`. Нужно
добавить обработчик, который уведёт телефон на `/join/${roomId}`.

Шаги для каждого:

a) В импортах из `next/navigation` добавить `useRouter`:
```ts
import { useParams, useRouter } from 'next/navigation';
```

b) Внутри компонента, рядом с существующим `useParams()`, добавить:
```ts
const router = useRouter();
```

c) В `useEffect`, который подписан на `game:action` (где есть `cleanup = on('game:action', ...)`), добавить вторую подписку и вернуть оба cleanup'а. Пример паттерна (используется в квизе, `src/app/game/[roomId]/quiz/page.tsx:318`):

```ts
const cleanup = on('game:action', (data: unknown) => { /* ... */ });

const unsubEnded = on('game:ended', () => {
  router.push(`/join/${roomId}`);
});

emit('room:get-state', { code: roomId });
return () => {
  cleanup();
  unsubEnded();
};
```

Сейчас в mafia это `useEffect` около строк `187-...`, в who-am-i — около `147-...`. Cleanup сейчас возвращается просто как `return cleanup;` — нужно превратить в комбинированную функцию очистки.

Не забудь добавить `router` в dep-array этого `useEffect`.

## Acceptance

- `npm run lint` ✅ (без новых предупреждений)
- `npm run tsc` или `npx tsc --noEmit` ✅
- Во всех 6 файлах `game:ended` теперь ведёт на `/join/${roomId}`.
- В mafia и who-am-i `useRouter` импортирован и используется.
- Existing `cleanup` для `game:action` listener'а вызывается корректно (не потерян).

## Отчёт

В `codex-reports/155-game-ended-phone-to-join-other-games.md`:
- Список изменённых файлов и строк
- Результат lint/tsc
- Заметки если что-то отличалось от описания

Не коммить, не пушить.
