# TASK-307 — Alias: фикс крэша classic mode при выборе режима (teams undefined)

## Контекст / корень бага
На `/game/[roomId]/alias` при запуске classic-правил падает:
`TypeError: Cannot read properties of undefined (reading 'undefined')` на стр.107.

Причина: host при `alias:select-mode` шлёт ЧАСТИЧНОЕ состояние
`broadcast('alias:state', { phase: 'modeSelect', mode } as unknown as AliasGameState)`
(стр.534) — без `teams`. Приёмник `setGameState(payload)` (стр.161) ПОЛНОСТЬЮ
заменяет состояние этим частичным объектом. После чего derived-селекторы, которые
выполняются на КАЖДЫЙ рендер, обращаются к `gameState.teams` (которого нет) → крэш.

Фаза `modeSelect` — легитимная фаза без команд (тип `phase` включает `'modeSelect'`),
поэтому derived-селекторы обязаны переживать отсутствие `teams`. Чиним guard'ами.
(Баг был латентным; TASK-295 включил распознавание гостя-хоста, и host-only ветка
`alias:select-mode` теперь реально срабатывает у гостя-ведущего → баг проявился.)

## Whitelist файлов
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/307-alias-classic-modeselect-crash.md`

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, server.mts,
socket-handlers.mts, любые другие файлы.

## Изменения (только 4 derived-строки, optional chaining)

1. Стр.107:
   - было: `const activeTeam = gameState?.teams[gameState.activeTeamIndex];`
   - стало: `const activeTeam = gameState?.teams?.[gameState.activeTeamIndex];`

2. Стр.108:
   - было: `const explainerIndices = gameState?.explainerIndices ?? gameState?.teams.map(() => 0) ?? [];`
   - стало: `const explainerIndices = gameState?.explainerIndices ?? gameState?.teams?.map(() => 0) ?? [];`

3. Стр.~563-565 (`layoutScores`):
   - было:
     ```
     const layoutScores = gameState
       ? gameState.teams.map((t) => ({ name: t.name, score: t.score }))
       : [];
     ```
   - стало:
     ```
     const layoutScores = gameState?.teams
       ? gameState.teams.map((t) => ({ name: t.name, score: t.score }))
       : [];
     ```

4. Стр.~571 (`assignedPlayerIds`):
   - было: `const assignedPlayerIds = gameState?.teams.flatMap((t) => t.playerIds) ?? [];`
   - стало: `const assignedPlayerIds = gameState?.teams?.flatMap((t) => t.playerIds) ?? [];`

## Чего НЕ делать
- НЕ менять broadcast на стр.534, обработчики, фазы, логику команд.
- НЕ трогать classic/letter игровую логику (immutable-правило №3).
- НЕ трогать JSX-обращения к `teams` (они под фазовыми guard'ами).

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build`.
- Запуск classic-правил (фаза modeSelect) больше не крэшит; teamSelect/explaining/
  finished работают как прежде.
- diff — ровно эти 4 правки в пределах whitelist.

## Отчёт
`codex-reports/307-alias-classic-modeselect-crash.md`.
