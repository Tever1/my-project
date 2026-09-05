# TASK-206 — Вынести предикат `isHostEligible(player)` (DRY host-роль)

## Контекст

Правило «кто может быть хостом» — `role === 'player'` (TV/экран хостом быть не
может) — продублировано в трёх местах `src/server/socket-handlers.mts`. Легко
разойтись при будущих правках. Вынести в один предикат.

**Важно:** в предикат уходит ТОЛЬКО проверка роли. Контекстные условия
(`isConnected`, `gameHostPlayerId === null`) остаются на местах — они не про
«может ли игрок в принципе быть хостом», а про конкретную ситуацию.

## Что сделать

Файл: `src/server/socket-handlers.mts`.

### 1. Добавить предикат на module-level

Рядом с `reassignHostOnLeave` (перед ним), добавить:

```ts
// A player is eligible to be host only if they joined as a 'player' (phone),
// never the TV/creator screen. Single source of truth for the role-model rule.
function isHostEligible(player: Player): boolean {
  return player.role === 'player';
}
```

(Тип `Player` уже есть в файле — использовать его, не дублировать.)

### 2. Переиспользовать в трёх местах

**a) `reassignHostOnLeave`** (фильтр eligible, строка ~161):
```ts
// было:
(p) => p.id !== departingPlayerId && p.role === 'player' && p.isConnected,
// стало:
(p) => p.id !== departingPlayerId && isHostEligible(p) && p.isConnected,
```

**b) `room:transfer-host`** (строка ~419):
```ts
// было:
if (!newHost || newHost.role !== 'player') return;
// стало:
if (!newHost || !isHostEligible(newHost)) return;
```

**c) join-логик «первый телефон становится хостом»** (строка ~254):
```ts
// было:
if (player.role === 'player' && room.gameHostPlayerId === null) {
// стало:
if (isHostEligible(player) && room.gameHostPlayerId === null) {
```

## Чего НЕ трогать

- Никакой логики не менять — это чистый рефактор, поведение идентично.
- `isConnected`, `gameHostPlayerId === null`, grace-период — остаются как есть.
- Клиентский код.

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/server/socket-handlers.mts`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
любые другие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- В файле ровно один `function isHostEligible`, использован в 3 местах;
  строк `role !== 'player'` / `role === 'player'` для host-проверок больше
  не осталось (кроме как внутри предиката).

## Отчёт

`codex-reports/206-host-eligible-predicate.md`. Не коммить.
