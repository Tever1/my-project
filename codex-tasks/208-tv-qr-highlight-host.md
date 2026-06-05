# TASK-208 — Подсветить хоста на QR-экране сбора комнаты (TV)

## Контекст

Экран сбора комнаты на телевизоре (QR waiting screen) — `src/components/lobby/Lobby.tsx`,
ветка `if (myRole === "tv" && isWaitingForPlayers && roomCode)` (около строк
861-1020). Список подключившихся игроков рендерится в `gamePlayers.map(...)`
(около строк 971-994) — все чипы выглядят одинаково.

ID телефона-хоста (тот, кто жмёт «НАЧАТЬ ИГРУ») лежит в
`gameHostPlayerId = roomState?.gameHostPlayerId ?? null` (объявлен около
строки 652).

## Требование (от пользователя)

На QR-экране игрок, который является **хостом** (`gameHostPlayerId`), должен
визуально выделяться среди остальных подключившихся — иконка-корона у его имени.

## Что сделать

Файл: `src/components/lobby/Lobby.tsx`. Менять ТОЛЬКО его.

В блоке `gamePlayers.map((player) => (...))` (около строк 971-994) для чипа,
у которого `player.id === gameHostPlayerId`, добавить:

1. **Inline SVG-корону** перед/после имени (НЕ эмодзи 👑 — правило проекта №1
   запрещает стандартные эмодзи в финальном UI). Корона — маленькая (~14-16px),
   `fill` в акцентный цвет игры (`accent`, уже доступен в области видимости).
   Пример простой короны:
   ```tsx
   <svg width="15" height="15" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
     <path d="M3 7l4 4 5-7 5 7 4-4v10H3V7z" />
   </svg>
   ```
2. **Акцентную рамку/фон** на чипе хоста, чтобы он выделялся: например
   `border: 1px solid ${accent}` (вместо `rgba(255,255,255,0.12)`) и/или
   `background: ${accent}1f`. Не ломать существующий layout чипа.

Реализация — через тернарник по `player.id === gameHostPlayerId` внутри
существующего `<span key={player.id} style={...}>`. Корону вставить как
дополнительный inline-элемент рядом с `<PlayerAvatar>` / именем.

Подсказка по стилю (адаптируй под существующий код, не выдумывай новый язык):
```tsx
{gamePlayers.map((player) => {
  const isHost = player.id === gameHostPlayerId;
  return (
    <span
      key={player.id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 14px 7px 8px",
        borderRadius: radius.full,
        background: isHost
          ? `${accent}24`
          : player.isConnected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
        border: isHost ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.12)",
        color: player.isConnected ? "white" : "rgba(255,255,255,0.35)",
        fontSize: 15,
        fontWeight: 650,
      }}
    >
      <PlayerAvatar nickname={player.nickname} size="xs" away={!player.isConnected || player.isAway} />
      {player.nickname}
      {isHost && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
          <path d="M3 7l4 4 5-7 5 7 4-4v10H3V7z" />
        </svg>
      )}
    </span>
  );
})}
```

## Чего НЕ трогать

- Серверный код, `/tv`, `/join`, игровые страницы.
- Логику `gameHostPlayerId`, `isWaitingForPlayers`, QR, остальной layout экрана.
- Другие места рендера игроков (mobile bottom-sheet, основной desktop-список) —
  только QR waiting screen.

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/components/lobby/Lobby.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика: на QR-экране чип игрока с `id === gameHostPlayerId` имеет акцентную
  рамку/фон + SVG-корону; остальные игроки — как раньше. Если хоста пока нет
  (`gameHostPlayerId === null`) — короны нет ни у кого.

## Отчёт

`codex-reports/208-tv-qr-highlight-host.md`. Не коммить.
