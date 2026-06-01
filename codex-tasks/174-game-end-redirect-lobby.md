# TASK-174: После завершения игры → лобби, не на страницу ввода имени

## Проблема
Все игры кроме квиза при `game:ended` отправляют игроков на `/join/[roomId]` — страницу ввода никнейма. Пользователи видят это как "вылет из аккаунта". Нужно редиректить в `/lobby/[roomId]`.

## Whitelist файлов
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/who-am-i/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/hundred-to-one/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`

## Фикс
В каждом из 6 файлов найти строку:
```ts
useNavigateOnGameEnd(roomId);
```
и заменить на:
```ts
useNavigateOnGameEnd(roomId, 'lobby');
```

Это единственное изменение — 6 файлов, 1 строка в каждом.

## Acceptance criteria
- [ ] Во всех 6 файлах `useNavigateOnGameEnd(roomId)` → `useNavigateOnGameEnd(roomId, 'lobby')`
- [ ] `npm run lint` проходит
- [ ] `npx tsc --noEmit` проходит

## Не трогать
- `src/app/game/[roomId]/quiz/page.tsx` — там уже `'lobby'`
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/174-game-end-redirect-lobby.md`
