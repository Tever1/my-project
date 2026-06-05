# TASK-211 — Подсветка away-игрока в верхнем баре TV (свернул/заблокировал телефон)

## Контекст / требование (от пользователя)

Когда во время игры игрок сворачивает приложение или блокирует телефон, в
верхнем баре (HUD со счётом) на TV-дисплее этот игрок должен выделяться как
«отошёл» — так же, как в лобби (приглушённый/серый), а не выглядеть активным.

В лобби это уже сделано: `PlayerAvatar` получает
`away={!player.isConnected || player.isAway}` (см. `Lobby.tsx`).

## Корень

Файл: `src/app/tv/[roomId]/[gameType]/page.tsx`.
- `interface PlayerInfo` (около строк 63-68) объявляет `isConnected`, но НЕ
  `isAway` — хотя `room:state` шлёт `isAway` (сервер не вырезает это поле).
- `scoreboard` (около строки 534) собирается из `players` и **теряет**
  `isConnected`/`isAway`:
  ```ts
  const scoreboard = players
    .map((p) => ({ id: p.id, name: p.nickname, score: quizState.scores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);
  ```
- Чипы в верхнем баре (около строк 586-600, `scoreboard.map`) рендерятся без
  учёта away-состояния.

## Что сделать

Файл: `src/app/tv/[roomId]/[gameType]/page.tsx`. Менять ТОЛЬКО его.

1. **`PlayerInfo`** (строки 63-68): добавить опциональное поле
   ```ts
   isAway?: boolean;
   ```

2. **`scoreboard`** (строка 534): пробросить флаг away в записи:
   ```ts
   const scoreboard = players
     .map((p) => ({
       id: p.id,
       name: p.nickname,
       score: quizState.scores[p.id] || 0,
       away: !p.isConnected || Boolean(p.isAway),
     }))
     .sort((a, b) => b.score - a.score);
   ```

3. **Чип в верхнем баре** (`scoreboard.map`, около строк 586-600): когда
   `entry.away === true`, приглушить чип — например добавить классы
   `opacity-40 grayscale` (или `opacity-50`) к контейнеру чипа, не ломая
   текущие `chipClass` (green/red/neutral). Достаточно дописать модификатор
   в className контейнера:
   ```tsx
   <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors duration-300 ${chipClass} ${entry.away ? 'opacity-40 grayscale' : ''}`}>
   ```

Этого достаточно — верхний бар квиза. Другие игровые HUD-бары в этом файле
НЕ трогать (вне запроса).

## Чего НЕ трогать

- Серверный код, `Lobby.tsx`, `/join`, мобильные игровые страницы.
- Логику счёта, `correctPlayers`, фон, остальной layout.
- Другие `players.map` в файле (mafia/alias/spy/h2o списки) — только quiz
  scoreboard в верхнем баре.

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/app/tv/[roomId]/[gameType]/page.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика: игрок с `isConnected === false` или `isAway === true` отображается в
  верхнем баре квиза приглушённым (opacity/grayscale); активные — без изменений.

## Отчёт

`codex-reports/211-tv-hud-away-state.md`. Не коммить.
