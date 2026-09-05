# TASK-217: useGameIdentity хук + Крокодил — гость как game-host

> **Метаданные**
> - **Дата создания:** 2026-06-07
> - **Сложность:** complex
> - **Запуск:** auto by Claude (codex exec)
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** — (пилот серии P0; за ним 218..221 для остальных игр)

---

## Цель

1. Создать переиспользуемый хук `useGameIdentity(roomId)`, инкапсулирующий
   гибридную идентичность игрока (аккаунт ИЛИ гость) и роль ведущего игры.
2. Перевести экран Крокодила на этот хук, чтобы ведущим мог быть **гость**.

Сейчас Крокодил гейтит управление по `isHost = user?.id === hostId`, поэтому
гость-ведущий не видит кнопок и не может вести игру. Квиз уже работает правильно
(но через инлайн-копипасту) — выносим общий паттерн в хук.

---

## Контекст

После TV-pivot создатель комнаты часто играет с телефона **как гость**. Сервер
уже отдаёт `gameHostPlayerId` в каждом `room:state`
(`src/server/socket-handlers.mts:94`) — **серверных правок НЕ требуется**.

Эталон инлайн-реализации (откуда брать поведение) —
`src/app/game/[roomId]/quiz/page.tsx`:
- guest infra: строки 64-70
- effectivePlayerId / isGameHost: 154-156
- guest reconnect (user + guest): 162-214
- чтение gameHostPlayerId из room:state: 305-341
- guestNickname из players: 180-184

---

## Файлы к изменению (whitelist)

- `src/lib/use-game-identity.ts` — **создать** новый хук.
- `src/app/game/[roomId]/crocodile/page.tsx` — перевести на хук.

### НЕ ТРОГАТЬ

- `src/server/socket-handlers.mts` — сервер уже всё отдаёт.
- `src/app/game/[roomId]/quiz/page.tsx` — только читать как эталон (НЕ
  рефакторить квиз в этом таске).
- любые файлы вне whitelist
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Часть 1 — Хук `src/lib/use-game-identity.ts`

Сигнатура:

```ts
import type { User } from '@/lib/auth-context';

export interface GameIdentity {
  user: User | null;
  effectivePlayerId: string;      // user?.id ?? guestPlayerId
  isGameHost: boolean;            // effectivePlayerId === gameHostPlayerId
  gameHostPlayerId: string | null;
}

export function useGameIdentity(roomId: string): GameIdentity;
```

Поведение (скопировать из квиза, обобщив):

1. `const GUEST_ID_KEY = 'party-hub-join-guest-id';` + `getGuestPlayerId()`
   (SSR-safe, как в квизе 64-70).
2. State: `guestPlayerId`, `guestNickname`, `gameHostPlayerId`. `guestPlayerId`
   инициализировать через `queueMicrotask(() => setGuestPlayerId(getGuestPlayerId()))`.
3. Подписаться на `room:state` ВНУТРИ хука через существующий
   `useRoomState(roomId, cb)` (`@/lib/use-room-state`). В колбэке:
   - `setGameHostPlayerId(room.gameHostPlayerId ?? null)` (читать как
     `gameHostPlayerId?: string | null`);
   - если ещё нет `guestNickname` и есть `guestPlayerId` — найти игрока в
     `room.players` и заполнить `guestNickname` (как квиз 180-184).
   Тип room: `{ players: { id: string; nickname: string; isHost: boolean }[];
   gameHostPlayerId?: string | null }`.
4. Reconnect-эффекты — ДВА, ровно как в квизе (162-214):
   - для `user`: при `user && isConnected && roomId` → `emit('room:join', {code,
     playerId: user.id, nickname: user.nickname, isReconnect: true}, cb)`;
     при `!res.success` → `router.push('/')`.
   - для гостя: при `!user && isConnected && roomId && guestPlayerId &&
     guestNickname` → то же с гостевыми id/nickname.
   Брать `isConnected, emit` из `useSocket()`, `router` из `useRouter()`
   (`next/navigation`), `user` из `useAuth()`.
5. Вернуть `{ user, effectivePlayerId, isGameHost, gameHostPlayerId }`, где
   `effectivePlayerId = user?.id ?? guestPlayerId` и
   `isGameHost = Boolean(effectivePlayerId && gameHostPlayerId &&
   effectivePlayerId === gameHostPlayerId)`.

> ВАЖНО: убедись, что `User` экспортируется из `@/lib/auth-context`
> (там `export interface User` — строка 5). Если не экспортируется как нужно —
> отметь в отчёте, не выдумывай тип.

---

## Часть 2 — Крокодил `crocodile/page.tsx`

1. Импортировать и вызвать хук:
   `const { user, effectivePlayerId, isGameHost, gameHostPlayerId } =
   useGameIdentity(roomId);`
   (оставить существующий `useNavigateOnGameEnd(roomId, user ? 'lobby' :
   'phone')` — `user` теперь берётся из хука; убрать дублирующий `useAuth()`
   если он только для user).
2. Удалить старую guest-логику и `isHost`/`myId`:
   - убрать `const isHost = user?.id === hostId;` и `myId`;
   - `isHostRef` → `isGameHostRef`, писать `isGameHost`;
   - `hostId` state в `useRoomState` больше не нужен (Крокодил использовал его
     только для isHost) — убрать `setHostId`/`hostId`, оставить только
     `setPlayers`. (gameHostPlayerId теперь даёт хук.)
3. Заменить ВСЕ игровые гейты `isHost` → `isGameHost`: таймер-эффект,
   `startGame` (+deps), `advanceToNextExplainer`/`handleGuessed`/`handleSkip`
   guard'ы, эффект «Non-host explainer actions» (`if (!isHost) return`),
   `endGame`, и в JSX (`onEnd=`, waiting `isHost ?`, `isHost && !isExplainer`,
   finished `isHost &&`).
4. Идентичность explainer'а: `isExplainer = effectivePlayerId ===
   gameState?.explainerId`.
5. End-game навигация для гостя: в `endGame` после `emit('game:end', {code})`
   добавить `router.push(user ? \`/lobby/${roomId}\` : \`/join/${roomId}\`)`.
   Импортировать `useRouter`.

> Если выяснится, что нужен ещё файл или серверная правка — остановиться,
> описать в отчёте, НЕ менять сервер.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npx tsc --noEmit` чисто (`npm run build` падает на Turbopack в sandbox —
      это известная среда, НЕ показатель; валидировать tsc + lint).
- [ ] Создан `src/lib/use-game-identity.ts` с описанной сигнатурой.
- [ ] В `crocodile/page.tsx` нет гейтов `user?.id === hostId` / `isHost` для
      игровых действий — всё через `isGameHost` из хука.
- [ ] Explainer определяется через `effectivePlayerId`.
- [ ] Поведение залогиненного ведущего не изменилось.

---

## Ограничения и подводные камни

- **i18n:** строки уже двуязычны — НЕ трогать, ничего не хардкодить.
- **Stale closures:** `isGameHostRef.current = isGameHost` обновлять каждый
  рендер (грабли мафии — stale `isHost` в слушателе `game:action`, см. CLAUDE.md).
- **Host-authoritative:** менять только КЛИЕНТСКОЕ определение ведущего. Сервер
  не трогать. Логику игры не переносить.
- **Комментарии** — английские.

---

## Контрольные точки самопроверки Codex

1. `git diff --stat` + `git diff` — изменены только 2 файла из whitelist.
2. НЕ тронут `server/socket-handlers.mts` и `quiz/page.tsx`.
3. `npm run lint` + `npx tsc --noEmit`.
4. Отчёт `codex-reports/217-crocodile-guest-game-host.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Менять сервер? — **нет**.
- Рефакторить квиз на новый хук? — **нет, не в этом таске** (только Крокодил).
- Оставлять `isHost` (room-host)? — **нет**, в Крокодиле он не нужен; если
  найдёшь реальную нужду — отметь в отчёте.
