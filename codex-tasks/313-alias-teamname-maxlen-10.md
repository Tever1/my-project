# TASK-313 — Alias: лимит названия команды 10 символов

## Контекст
В компоненте `TeamNameInput` (фаза `teamName`) у `<input>` стоит `maxLength={20}`.
Уменьшить лимит до 10 символов.

## Whitelist файлов
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/313-alias-teamname-maxlen-10.md`

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, server.mts,
socket-handlers.mts, другие файлы.

## Изменение
В `TeamNameInput` (`<input … maxLength={20} …>`):
- было: `maxLength={20}`
- стало: `maxLength={10}`

Больше ничего не менять.

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build`.
- В поле названия команды нельзя ввести больше 10 символов.
- diff — одна строка в пределах whitelist.

## Отчёт
`codex-reports/313-alias-teamname-maxlen-10.md`.
