# TASK-221: 100 к 1 — гостевая идентичность (роли/команды/капитаны)

> **Метаданные**
> - **Дата создания:** 2026-06-07
> - **Сложность:** complex
> - **Запуск:** auto by Claude (codex exec)
> - **Ожидаемое время Codex:** ~12 минут
> - **Зависит от тасков:** TASK-217 (хук `useGameIdentity`)

---

## Цель

Перевести экран «100 к 1» на хук `useGameIdentity`, чтобы гость (без аккаунта)
мог выбирать роль (в т.ч. роль ведущего), быть капитаном, голосовать и играть в
большой игре. Сейчас вся идентичность через `user?.id`, гость заблокирован
(`if (!user?.id) return` в выборе роли).

---

## Контекст

Особенность «100 к 1»: ведущий определяется **ролью** (`isGameHost = myRole ===
'host'`), а не `gameHostPlayerId`. Поэтому хук используем ТОЛЬКО ради `{ user,
effectivePlayerId }` (и его встроенного гостевого реконнекта) — ролевой
`isGameHost` и room-host `isHost` остаются как есть, но должны вычисляться через
`effectivePlayerId`, а не `user?.id`.

Хук `src/lib/use-game-identity.ts` создан в TASK-217. Пример — `crocodile/page.tsx`.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — единственный файл.

### НЕ ТРОГАТЬ

- `src/lib/use-game-identity.ts` — готов.
- сервер, другие игры, защищённые файлы.
- **i18n (у игры ноль двуязычности), confirm(), raw `<button>`** — НЕ в этом
  таске, отдельные задачи.

---

## Шаги реализации

1. Импорт хука вместо `useAuth` (строки 5, 99):
   `const { user, effectivePlayerId } = useGameIdentity(roomId);`
   Добавить `useRouter` (`next/navigation`): `const router = useRouter();`.
   Оставить `useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone')` (100).
2. **Заменить ВСЕ вхождения идентичности на `effectivePlayerId`:**
   - `user?.id` → `effectivePlayerId`
   - `user.id` → `effectivePlayerId`
   - `if (!user?.id) return;` (124) → `if (!effectivePlayerId) return;`
   Затронутые строки (проверить grep'ом, не пропустить): 113, 114, 124, 125,
   157, 164 (deps), 641, 642, 659, 693, 763, 826, 849, 859, 1258, 1324, 1351.
   После замены `user` остаётся нужен ТОЛЬКО в `useNavigateOnGameEnd` и в
   end-game навигации (шаг 4) — больше нигде.
3. `isHost` (113) и `myRole`/`isGameHost` (114-115) — оставить логику, просто
   через `effectivePlayerId`. Ролевой `isGameHost = myRole === 'host'` НЕ менять
   на хуковый.
4. End-game навигация: в обработчике с `emit('game:end', {code})` (~408) после
   emit добавить `router.push(user ? \`/lobby/${roomId}\` : \`/join/${roomId}\`)`.
5. Поле типа `GamePlayer.isHost` (18) и `p.isHost` из серверных данных — НЕ
   трогать (это серверный флаг, не локальная идентичность).

> Если нужен ещё файл/сервер — стоп, в отчёт, сервер не менять.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npx tsc --noEmit` чисто.
- [ ] В файле НЕ осталось `user?.id` / `user.id` / `!user?.id` (кроме `user` в
      `useNavigateOnGameEnd` и end-game `router.push`).
- [ ] Выбор роли, капитанство, голосование, большая игра работают через
      `effectivePlayerId` (т.е. для гостя).
- [ ] Ролевой `isGameHost = myRole === 'host'` сохранён.
- [ ] i18n / confirm() / raw-кнопки не изменены (вне scope).

---

## Ограничения и подводные камни

- **Scope:** только идентичность. НЕ добавлять i18n, НЕ менять confirm, НЕ
  трогать raw-кнопки.
- **deps:** строка 164 — обновить `user?.id` → `effectivePlayerId` в массиве
  зависимостей слушателя.
- **Host-authoritative:** только клиентская идентичность. Сервер не трогать.
- **Комментарии** — английские.

---

## Контрольные точки самопроверки Codex

1. `git diff --stat` — изменён только hundred-to-one/page.tsx.
2. Сервер/другие игры/защищённые файлы не тронуты.
3. `npm run lint` + `npx tsc --noEmit`.
4. `grep -n "user?.id\|user\.id" hundred-to-one/page.tsx` — пусто (кроме
   допустимых мест из acceptance).
5. Отчёт `codex-reports/221-hundred-to-one-guest-identity.md`.
6. **Не коммитить.**

---

## Открытые вопросы для Codex

- Менять сервер? — **нет**.
- Менять ролевой `isGameHost` на хуковый? — **нет**, оставить `myRole === 'host'`.
- Добавлять i18n/менять confirm? — **нет**, отдельные таски.
