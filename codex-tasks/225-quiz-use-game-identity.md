# TASK-225: Квиз — миграция на useGameIdentity (убрать инлайн-дубль)

> **Метаданные**
> - **Дата создания:** 2026-06-07
> - **Сложность:** complex
> - **Запуск:** auto by Claude (codex exec)
> - **Ожидаемое время Codex:** ~12 минут
> - **Зависит от тасков:** TASK-217 (хук useGameIdentity)

---

## Цель

Убрать из `quiz/page.tsx` инлайн-копию гостевой идентичности/реконнекта, которая
теперь живёт в хуке `useGameIdentity` (TASK-217). Это устранит дублирование
(~50 строк) без изменения поведения.

---

## Контекст

Хук `src/lib/use-game-identity.ts` отдаёт `{ user, effectivePlayerId,
isGameHost, gameHostPlayerId }` и сам делает: инициализацию guestPlayerId,
заполнение guestNickname из room:state, оба reconnect-эффекта (user + guest).

**ВАЖНО — узкий scope.** Квиз хранит `gameHostPlayerId` ВНУТРИ своего `gameState`
(с fallback-семантикой в `useRoomState`, строка 311) и завязывает на него флоу
спец-квиз-конфига (`applyPreconfiguredQuiz`, `isHostNow`). Этот флоу НЕ трогаем.
Из хука берём ТОЛЬКО `{ user, effectivePlayerId }`. `isGameHost`, `isHost` и
`gameState.gameHostPlayerId` в квизе ОСТАЮТСЯ как есть (вычисляются из gameState).

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/quiz/page.tsx` — единственный файл.

### НЕ ТРОГАТЬ

- `src/lib/use-game-identity.ts` — готов.
- сервер, другие игры, защищённые файлы.
- Флоу спец-квиз-конфига (`applyPreconfiguredQuiz`, `pendingQuizConfig`,
  `gameState.gameHostPlayerId`, `nextGameHostPlayerId`) — НЕ менять логику.

---

## Шаги реализации

1. Импорт: убрать `import { useAuth } ...`, добавить
   `import { useGameIdentity } from '@/lib/use-game-identity';`.
2. Строка 131: `const { user } = useAuth();` →
   `const { user, effectivePlayerId } = useGameIdentity(roomId);`.
3. Строка 132: убрать `isConnected` из деструктуризации useSocket →
   `const { emit, on } = useSocket();` (isConnected станет неиспользуемым).
4. Удалить инлайн guest-инфраструктуру (теперь в хуке):
   - `const GUEST_ID_KEY = ...` и функцию `getGuestPlayerId()` (строки ~65-70).
   - state `guestPlayerId`, `guestNickname` (138-139).
   - строку 154 `const effectivePlayerId = user?.id ?? guestPlayerId;`
     (теперь из хука).
   - эффект инициализации guestPlayerId (162-164).
   - эффект заполнения guestNickname (180-184).
   - user reconnect-эффект (187-200).
   - guest reconnect-эффект (202-214).
5. Строка 332: `const currentPlayerId = user?.id ?? getGuestPlayerId();` →
   `const currentPlayerId = effectivePlayerId;`.
6. ОСТАВИТЬ без изменений: `isHost` (155), `isGameHost` (156),
   `gameState.gameHostPlayerId` и весь useRoomState-callback логику (305-341),
   `isHostRef`/`isGameHostRef`, applyPreconfiguredQuiz.

> Если после удаления остаётся неиспользуемый импорт/переменная — убрать.
> Если что-то из «НЕ ТРОГАТЬ» ломается — стоп, в отчёт.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок (нет unused `isConnected`/`getGuestPlayerId`).
- [ ] `npx tsc --noEmit` чисто.
- [ ] Квиз использует `useGameIdentity` для `user` + `effectivePlayerId`.
- [ ] Удалены: GUEST_ID_KEY, getGuestPlayerId, guestPlayerId/guestNickname state,
      их эффекты, оба reconnect-эффекта, инлайн effectivePlayerId.
- [ ] Флоу спец-квиз-конфига и `gameState.gameHostPlayerId` НЕ изменены
      (diff в этих местах — нулевой, кроме замены `getGuestPlayerId()` →
      `effectivePlayerId` на 332).
- [ ] Поведение квиза не изменилось (старт, ответы, спец-квиз фон, реконнект).

---

## Ограничения и подводные камни

- **Не менять** семантику gameHostPlayerId в gameState (там fallback на
  предыдущее значение — это намеренно для конфиг-флоу).
- **i18n:** строки не трогать.
- **Host-authoritative** — сервер не трогать.
- **Комментарии** — английские.

---

## Контрольные точки самопроверки Codex

1. `git diff` — изменён только quiz/page.tsx; в зонах конфиг-флоу изменений нет.
2. `npm run lint` + `npx tsc --noEmit`.
3. Отчёт `codex-reports/225-quiz-use-game-identity.md`.
4. **Не коммитить.**

---

## Открытые вопросы для Codex

- Брать ли из хука `isGameHost`/`gameHostPlayerId`? — **нет**, квиз использует
  свои из gameState (конфиг-флоу). Из хука только `user` + `effectivePlayerId`.
- Менять сервер? — **нет**.
