# TASK-317: Alias mobile "Игра окончена" — добавить ссылку "← К выбору режима" как в Шпионе

## Контекст

В Шпионе (`src/app/game/[roomId]/spy/page.tsx`) есть текстовая ссылка-кнопка
`← К выбору режима` (`renderBackButton`, строки ~874–921) — видна только
хосту, по клику переводит игру в фазу `modeSelect`. Юзер попросил такую же
строку добавить в Alias на экране `finished` ("Игра окончена!").

В Alias фаза `modeSelect` уже существует и рендерится как обычно
(`!gameState || gameState.phase === 'modeSelect'`, строки ~669+ в
`alias/page.tsx`) — это тот же экран выбора режима (classic/letter), что и в
самом начале игры. На него и нужно переключать.

**Важно, чем Alias отличается от Spy:** в Alias `broadcast('alias:state', X)`
ВСЕГДА отправляет ПОЛНЫЙ объект состояния (клиент делает `setGameState(payload)` —
жёсткая замена, не merge). В Spy `update()` — наоборот, мёрджит patch. Поэтому
**нельзя** copy-paste-нуть паттерн Spy с partial `{ phase: 'modeSelect' }` —
именно такой partial-баг уже один раз сломал Alias (TASK-307, было
`broadcast('alias:state', { phase: 'modeSelect', mode })` без `teams`, ловили
краш). Здесь нужно отправлять **полный** текущий `gameState` с переопределённым
`phase`.

## Файл (whitelist — только один)

- `src/app/game/[roomId]/alias/page.tsx`

## Что сделать

1. Добавить колбэк (рядом с другими host-колбэками вроде `startGame`/`nextTurn`,
   например через `useCallback`):

   ```ts
   const backToModeSelect = useCallback(() => {
     if (!isHost || !gameState) return;
     const next: AliasGameState = { ...gameState, phase: 'modeSelect' };
     setGameState(next);
     broadcast('alias:state', next);
   }, [isHost, gameState, broadcast]);
   ```

   (Подставь под существующий стиль файла — если рядом используется
   `gameState` напрямую, а не через ref, ориентируйся на соседние функции
   типа `nextTurn`/`startGame` для консистентности.)

2. В блоке `FINISHED` (фаза `gameState?.phase === 'finished'`, см. ~строки
   1217–1250, ниже кнопки "Играть снова") добавить, **только если `isHost`**,
   текстовую ссылку в том же стиле, что в Spy (`renderBackButton`, не-confirm
   ветка):

   ```tsx
   {isHost && (
     <button
       type="button"
       onClick={backToModeSelect}
       className="text-sm text-white/50 hover:text-white/80"
     >
       {locale === 'ru' ? '← К выбору режима' : '← Back to mode select'}
     </button>
   )}
   ```

   Разместить под кнопкой "Играть снова" (или рядом — на усмотрение, главное
   чтобы не сливалась визуально с primary-кнопкой, можно обернуть обе в
   `flex flex-col items-center gap-2`).

3. На экране `finished` подтверждение (confirm ✓/✗) не нужно — раунд уже
   закончен, риска прервать активный ход нет. Confirm-механику из Spy
   копировать НЕ нужно, только саму ссылку.

## Запрещено трогать

- Любую другую фазу/блок (`modeSelect`, `teamSelect`, `teamName`, `waiting`,
  `explaining`, `turnResult`).
- `src/app/game/[roomId]/spy/page.tsx` и любые другие файлы.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**` (кроме этого файла).

## Acceptance

- `npx tsc --noEmit` чисто.
- `npm run lint` чисто.
- На экране "Игра окончена" у хоста под кнопкой "Играть снова" видна ссылка
  "← К выбору режима"; у не-хоста ссылки нет.
- Клик хостом по ссылке переводит ВСЕХ игроков (mobile + TV) на экран выбора
  режима (`modeSelect`) без краша — проверь, что отправляется полный
  `gameState`, а не partial-объект (см. урок TASK-307 выше).

Отчёт — `codex-reports/317-alias-finished-back-to-modeselect.md`. Не коммитить.
