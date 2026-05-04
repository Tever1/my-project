# TASK-014: Sync DOM focus с activeGame при ←/→

> **Сложность:** simple
> **Запуск:** auto by Claude

## Проблемы

1. После mouse-клика на тайл, фокус остаётся на body (Mac browser
   behavior). Потом ←/→ меняют activeGame, но focus всё ещё на body.
   Enter попадает в `if (inTileStrip)` ветку через `focused?.dataset?.gameId`
   → false → обрабатывается как Enter не-на-тайле → нет press-effect и
   нет перехода на «Начать партию».

2. Если пользователь делает ↓ → активный тайл (фокус на нём, например spy),
   затем ← → activeGame становится mafia, но **focus остаётся на spy**
   (только React state поменялся, DOM focus нет). При Enter — press-effect
   фигурирует на spy (где DOM focus), а не на mafia (где activeGame).

## Решение

В `keydown` handler, в ветке `e.key === "ArrowRight" || e.key === "ArrowLeft"`,
**после** определения нового activeGame, явно фокусировать новый тайл,
если фокус сейчас в tile-strip ИЛИ на body.

## Файлы

- `src/app/lobby-preview/page.tsx` — только.

## Шаги

В `useEffect` с `keydown` listener, найти блок (после TopBar и CTA early-returns):

```ts
e.preventDefault();
setActiveGame((prev) => {
  const idx = games.findIndex((g) => g.id === prev);
  const direction = e.key === "ArrowRight" ? 1 : -1;
  const next = (idx + direction + games.length) % games.length;
  return games[next].id;
});
```

Заменить на:

```ts
e.preventDefault();
const inTileStrip = focused?.dataset?.gameId !== undefined;
const focusedTag = focused?.tagName;
const isOnBody = !focused || focusedTag === "BODY" || focusedTag === "HTML";
// Compute next id synchronously
const curId = inTileStrip ? focused.dataset.gameId! : activeGame;
const idx = games.findIndex((g) => g.id === curId);
const direction = e.key === "ArrowRight" ? 1 : -1;
const nextIdx = (idx + direction + games.length) % games.length;
const nextId = games[nextIdx].id;
setActiveGame(nextId);
// Sync DOM focus if user is navigating with arrows from tile-strip OR body
if (inTileStrip || isOnBody) {
  // Focus on next frame so React has time to re-render (но querySelector работает и сейчас, тайл уже в DOM)
  document.querySelector<HTMLElement>(`[data-game-id="${nextId}"]`)?.focus();
}
```

**Важно:**
- Использовать `curId` который берётся из focused tile dataset (если focus в strip) или из activeGame (если на body). Это чинит issue #2 — после ↓ фокус на spy, активная mafia. Стрелка влево теперь идёт от spy (focused) → next влево, не от mafia.
- Запоминать что `setActiveGame` асинхронный — сразу фокусировать `nextId` через querySelector. React re-render не нужен для фокуса (тайл уже существует с data-game-id).
- Не трогай ветку для CTA или TopBar.

## Acceptance criteria

- [ ] После mouse-click на любом тайле, ←/→ перемещает фокус на следующий тайл
      (видно по focus ring + press-effect появляется при Enter).
- [ ] После ↓ на активный тайл, затем ← → фокус (и activeGame) переходит на
      следующий тайл слева ОТНОСИТЕЛЬНО ФОКУСИРОВАННОГО, а не activeGame.
- [ ] Enter всегда срабатывает на том тайле, где сейчас focus ring.
- [ ] `npm run build` ОК.

## QA через preview MCP

Claude проверит:
1. Mouse click → активный тайл меняется → ← → следующий focused/active тайл.
   Затем Enter → focus на «Начать партию», press был на правильном тайле.
2. ↓ from CTA → ← (несколько раз) → Enter → press на финальном тайле,
   не на промежуточных.

## Контрольные точки

1. Diff в keydown handler.
2. `npm run build`.
3. Заполнить `codex-reports/014-tile-arrow-sync-focus.md`.
4. Не коммитить.
