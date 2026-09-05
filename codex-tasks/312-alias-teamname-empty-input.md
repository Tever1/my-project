# TASK-312 — Alias: поле ввода названия команды стартует пустым

## Контекст
В фазе `teamName` (TASK-311) поле ввода предзаполняется дефолтным именем команды
(«Команда 1/2») через `defaultValue={gameState.teams[myTeamIndex].name}`. Нужно,
чтобы поле было пустым (с placeholder «Название команды»).

## Whitelist файлов
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/312-alias-teamname-empty-input.md`

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, server.mts,
socket-handlers.mts, другие файлы.

## Изменение
В рендере фазы `teamName`, в `<TeamNameInput … />` (~стр.892):
- было: `defaultValue={gameState.teams[myTeamIndex].name}`
- стало: `defaultValue=""`

Больше ничего не менять. Фолбэк на дефолтное имя при пустом вводе уже есть в
`setTeamName` (`rawName.trim() || prev.teams[teamIndex]?.name || fallback`) — его
НЕ трогать.

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build`.
- Поле ввода названия команды при открытии пустое, показывает placeholder.
- diff — одна строка в пределах whitelist.

## Отчёт
`codex-reports/312-alias-teamname-empty-input.md`.
