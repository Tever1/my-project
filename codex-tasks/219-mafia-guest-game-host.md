# TASK-219: Мафия — гость как game-host + гостевая идентичность

> **Метаданные**
> - **Дата создания:** 2026-06-07
> - **Сложность:** complex
> - **Запуск:** auto by Claude (codex exec)
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** TASK-217 (хук `useGameIdentity`)

---

## Цель

Перевести экран Мафии на хук `useGameIdentity`, чтобы гость (без аккаунта) мог
быть ведущим И полноценным игроком (голосовать как мафия, проверять как
детектив, лечить как доктор, голосовать днём). Сейчас всё на `user?.id`, гость
заблокирован (`if (!user) return` в обработчиках действий).

---

## Контекст

Мафия — самая чувствительная к идентичности игра: роли, ночные действия,
дневное голосование. Хук `src/lib/use-game-identity.ts` (TASK-217) отдаёт
`{ user, effectivePlayerId, isGameHost, gameHostPlayerId }`. Пример применения —
`crocodile/page.tsx`, `who-am-i/page.tsx`.

**Граблю помнить:** слушатель `game:action` (строки ~200-311) имеет в deps
`[on, isHost, user]` — это фикс stale-closure из QA (TASK-0c2fb54, см. CLAUDE.md:
handler захватывал устаревший `isHost`). При замене сохранить тот же механизм:
deps `[on, isGameHost, effectivePlayerId]` (re-subscribe при смене).

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/mafia/page.tsx` — единственный файл.

### НЕ ТРОГАТЬ

- `src/lib/use-game-identity.ts` — готов, только импортировать.
- сервер, другие игры, защищённые файлы (`CLAUDE.md`, `AGENTS.md`, `.codex/**`,
  `codex-tasks/**`).

---

## Шаги реализации

1. Импорт хука вместо `useAuth` (строки 10, 137):
   `const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);`
   Добавить `useRouter` (`next/navigation`), `const router = useRouter();`.
   Оставить `useNavigateOnGameEnd(..., user ? 'lobby' : 'phone')`.
2. Идентичность (148-150):
   - 148 `isHost = ...` → удалить, использовать `isGameHost`.
   - 149 `myRole = user ? gs.roles[user.id] : undefined` →
     `effectivePlayerId ? gs.roles[effectivePlayerId] : undefined`.
   - 150 `amAlive = user ? gs.alive.includes(user.id) : false` →
     через `effectivePlayerId`.
3. Слушатель `game:action`:
   - 222, 238 `if (isHost)` → `if (isGameHost)`.
   - 253 `if (user?.id === payload.detectiveId)` → `effectivePlayerId ===`.
   - 311 deps `[on, isHost, user]` → `[on, isGameHost, effectivePlayerId]`.
4. Обработчики действий — заменить guard и идентичность (353-435):
   - во всех: `if (!user || !isConnected) return;` →
     `if (!effectivePlayerId || !isConnected) return;`
   - `voterId/detectiveId/doctorId: user.id` → `effectivePlayerId`
   - `[user.id]` в `setGs` (359, 433) → `[effectivePlayerId]`.
   Касается `handleMafiaVote`, `handleDetectiveCheck`, `handleDoctorSave`,
   `handleDayVote`.
5. Прочая идентичность игрока:
   - 477 `id !== user?.id` → `!== effectivePlayerId`
   - 480 `id !== user?.id && ...` → `effectivePlayerId`
   - 684 `id === user?.id ? l('(Себя)','(Self)')` → `effectivePlayerId`
   - 787 `id === user?.id ? ' (👈)'` → `effectivePlayerId`
   - 805 `myVote = user ? gs.votes[user.id]` → `effectivePlayerId`.
6. Все host-контролы `isHost ?` / `isHost &&` → `isGameHost`:
   строки 511, 526, 603, 721, 793, 887, 892, 941, 969, 1002.
7. **НЕ трогать** косметический `{p.isHost && ' ⭐'}` (507) — отображение
   room-host в списке игроков.
8. End-game навигация: `handleEndGame` (около 470) — после `emit('game:end',
   {code})` добавить `router.push(user ? \`/lobby/${roomId}\` :
   \`/join/${roomId}\`)`.

> Если нужен ещё файл/сервер — стоп, в отчёт, сервер не менять.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npx tsc --noEmit` чисто (`npm run build` падает на Turbopack в sandbox —
      не показатель).
- [ ] Все игровые/идентичностные `user?.id`/`user.id` заменены на
      `effectivePlayerId`; единственное оставшееся `p.isHost` — косметика (507).
- [ ] Ночные действия и дневное голосование работают для гостя (нет `!user`
      guard'ов в обработчиках).
- [ ] deps слушателя `game:action` обновлены (нет stale `isHost`).
- [ ] Поведение залогиненных игроков/ведущего не изменилось.

---

## Ограничения и подводные камни

- **i18n:** строки двуязычны через `l(ru,en)` — не трогать.
- **Stale-closure:** соблюсти deps слушателя (см. Контекст). Это уже однажды
  ломало мафию в QA.
- **Host-authoritative:** только клиентская идентичность. Сервер не трогать.
- **Комментарии** — английские.

---

## Контрольные точки самопроверки Codex

1. `git diff --stat` — изменён только mafia/page.tsx.
2. Сервер/другие игры/защищённые файлы не тронуты.
3. `npm run lint` + `npx tsc --noEmit`.
4. Отчёт `codex-reports/219-mafia-guest-game-host.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Менять сервер? — **нет**.
- Трогать ⭐ (507)? — **нет**.
- Менять deps-механизм слушателя на ref вместо re-subscribe? — **нет**, сохранить
  существующий подход (host/identity в deps), просто обновить имена.
