# TASK-218: Кто я? — гость как game-host + гостевая идентичность

> **Метаданные**
> - **Дата создания:** 2026-06-07
> - **Сложность:** complex
> - **Запуск:** auto by Claude (codex exec)
> - **Ожидаемое время Codex:** ~10 минут
> - **Зависит от тасков:** TASK-217 (хук `useGameIdentity` уже создан)

---

## Цель

Перевести экран «Кто я?» на хук `useGameIdentity` (создан в TASK-217), чтобы
ведущим И обычным игроком мог быть **гость** (без аккаунта). Сейчас всё
завязано на `user?.id`, поэтому гость не отгадывает своего персонажа и
гость-ведущий не управляет игрой.

---

## Контекст

В «Кто я?» каждый игрок отгадывает СВОЕГО персонажа — идентичность игрока
критична для всех, не только для хоста. `handleGuess` (строки 263-279) читает
`user.id` напрямую → гость (`user === null`) не может играть.

Хук `src/lib/use-game-identity.ts` уже существует и отдаёт
`{ user, effectivePlayerId, isGameHost, gameHostPlayerId }` (см. как применён в
`src/app/game/[roomId]/crocodile/page.tsx`).

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/who-am-i/page.tsx` — единственный файл.

### НЕ ТРОГАТЬ

- `src/lib/use-game-identity.ts` — готов, только импортировать.
- сервер, `quiz/page.tsx`, `crocodile/page.tsx` — не трогать.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Шаги реализации

1. Импорт и вызов хука вместо `useAuth`:
   `const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);`
   (оставить `useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone')`).
   Импортировать `useRouter` из `next/navigation`, получить `const router =
   useRouter();`.
2. Заменить определение хоста (строка 104):
   `const isHost = players.find((p) => p.isHost)?.id === user?.id;`
   → удалить, использовать `isGameHost` из хука.
3. Заменить ВСЕ управляющие/идентичностные `user?.id` и `isHost`:
   - 124 `isMyTurn = currentPlayerId === user?.id` → `=== effectivePlayerId`
   - 318, 556, 633 `isHost ?` / `isHost &&` → `isGameHost`
   - 349 `const isMe = id === user?.id;` → `=== effectivePlayerId`
   - 411 `currentPlayerId === user?.id` → `=== effectivePlayerId`
   - 662 `onEnd={isHost ? handleEndGame : undefined}` → `isGameHost`
4. **`handleGuess` (263-279)** — заменить идентичность гесера на гостевую:
   - guard: `if (!effectivePlayerId || !guessInput.trim()) return;`
   - `const myChar = gs.characters[effectivePlayerId];`
   - `playerId: effectivePlayerId` в broadcast.
   (Убрать зависимость от `user` тут целиком.)
5. **НЕ трогать** строку 314 `{p.isHost && ' ⭐'}` — это отображение флага
   room-host в списке игроков (косметика), не управление игрой.
6. End-game навигация: в `handleEndGame` (281-285) после `emit('game:end',
   {code})` добавить `router.push(user ? \`/lobby/${roomId}\` :
   \`/join/${roomId}\`)`.

> Если нужен ещё файл/серверная правка — стоп, описать в отчёте, сервер не менять.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npx tsc --noEmit` чисто.
- [ ] В файле нет управляющих/идентичностных гейтов по `user?.id` — всё через
      `effectivePlayerId` / `isGameHost` (исключение — косметический ⭐ на 314).
- [ ] `handleGuess` работает для гостя (не зависит от `user`).
- [ ] Поведение залогиненного игрока/ведущего не изменилось.

---

## Ограничения и подводные камни

- **i18n:** строки уже двуязычны (через `l(ru,en)`) — не трогать.
- **Listener stale-closure:** слушатель `game:action` (142-234) использует
  `currentPlayerId` через deps — не ломать deps-массив.
- **Host-authoritative:** менять только клиентскую идентичность. Сервер не трогать.
- **Комментарии** — английские.

---

## Контрольные точки самопроверки Codex

1. `git diff --stat` — изменён только who-am-i/page.tsx.
2. Не тронуты сервер / другие игры / защищённые файлы.
3. `npm run lint` + `npx tsc --noEmit`.
4. Отчёт `codex-reports/218-who-am-i-guest-game-host.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Менять сервер? — **нет**.
- Трогать ⭐ room-host в списке (314)? — **нет**, оставить как есть.
