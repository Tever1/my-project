# TASK-220: Шпион — гость как game-host + гостевая идентичность (ТОЛЬКО identity)

> **Метаданные**
> - **Дата создания:** 2026-06-07
> - **Сложность:** complex
> - **Запуск:** auto by Claude (codex exec)
> - **Ожидаемое время Codex:** ~12 минут
> - **Зависит от тасков:** TASK-217 (хук `useGameIdentity`)

---

## Цель

Перевести экран Шпиона на хук `useGameIdentity`, чтобы гость мог быть ведущим
(таймер, смена слова) и активным игроком/шпионом. Сейчас всё на `user?.id`.

**ВАЖНО — узкий scope:** в этом таске меняем ТОЛЬКО идентичность. i18n (у
Шпиона ноль двуязычности), нативный `confirm()` и raw `<button>` — НЕ трогаем,
для них будут отдельные таски.

---

## Контекст

Хук `src/lib/use-game-identity.ts` (TASK-217) отдаёт
`{ user, effectivePlayerId, isGameHost, gameHostPlayerId }`. Пример —
`crocodile/page.tsx`. Таймер Шпиона host-authoritative (гейт `isHost`) — он
должен стать `isGameHost` (ведущий-гость ведёт таймер, как в квизе/крокодиле).

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/spy/page.tsx` — единственный файл.

### НЕ ТРОГАТЬ

- `src/lib/use-game-identity.ts` — готов.
- сервер, другие игры, защищённые файлы.
- **i18n / confirm() / raw buttons** — НЕ в этом таске.

---

## Шаги реализации

1. Импорт хука вместо `useAuth` (строки 5, 166):
   `const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);`
   Добавить `useRouter` (`next/navigation`): `const router = useRouter();`.
   Оставить `useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone')` (167).
2. Идентичность (178-185):
   - 178 `isHost = s.players.find(...)?.isHost` → удалить, использовать
     `isGameHost`.
   - 179 `isSpy = user?.id === s.spyId` → `effectivePlayerId === s.spyId`.
   - 185 `isActivePlayer = user?.id === activePlayerId` →
     `effectivePlayerId === activePlayerId`.
3. Заменить ВСЕ управляющие `isHost` → `isGameHost`:
   строки 218 (таймер-эффект), 243 (deps `[s.timerRunning, isGameHost]`),
   286, 306, 326 (`!isActivePlayer && !isGameHost`), 337, 346, 356
   (`onEnd={isGameHost ? endGame}`), 393, 441, 508 (`isActivePlayer ||
   isGameHost`), 515, 547 (`!isGameHost && !isActivePlayer`).
4. End-game навигация: `endGame` (350-352) — добавить навигацию ПОСЛЕ
   `emit('game:end', {code})`:
   ```ts
   const endGame = () => {
     if (confirm('Завершить игру?')) {
       emit('game:end', { code: roomId });
       router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
     }
   };
   ```
   (`confirm()` ОСТАВИТЬ как есть — заменим в отдельном таске.)

> Если нужен ещё файл/сервер — стоп, в отчёт, сервер не менять.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npx tsc --noEmit` чисто.
- [ ] Нет управляющих/идентичностных `user?.id` для логики — всё через
      `effectivePlayerId` / `isGameHost`. (Тип `GamePlayer.isHost` на 20 и
      `?.isHost` в данных оставить — это серверное поле, не клиентский гейт.)
- [ ] Таймер ведёт `isGameHost`.
- [ ] `confirm()`, i18n-строки, raw `<button>` НЕ изменены (вне scope).

---

## Ограничения и подводные камни

- **Scope:** только идентичность. НЕ добавлять i18n, НЕ менять confirm на
  модалку, НЕ трогать raw-кнопки — это отдельные таски.
- **Host-authoritative:** только клиентская идентичность. Сервер не трогать.
- **Комментарии** — английские.

---

## Контрольные точки самопроверки Codex

1. `git diff --stat` — изменён только spy/page.tsx.
2. Сервер/другие игры/защищённые файлы не тронуты.
3. `npm run lint` + `npx tsc --noEmit`.
4. Отчёт `codex-reports/220-spy-guest-game-host.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Менять сервер? — **нет**.
- Заменять confirm()/добавлять i18n? — **нет**, отдельные таски.
