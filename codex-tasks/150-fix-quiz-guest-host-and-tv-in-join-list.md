# TASK-150: фикс — квиз не запускается у гостя + десктоп виден в списке игроков на join-странице

> **Метаданные**
> - **Дата создания:** 2026-05-26
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~5 минут
> - **Зависит от тасков:** TASK-148, TASK-149

---

## Цель

Исправить два бага, обнаруженных при тестировании TV-pivot режима после TASK-149:

1. **Квиз не запускается**, когда телефон входит как гость (без авторизации) — телефон не видит кнопку «Начать игру», застревает в фазе ожидания.
2. **Десктоп (role='tv') отображается в списке игроков** на телефонной join-странице, хотя должен быть невидим для гостя.

---

## Контекст

В TV-pivot архитектуре:
- Десктоп подключается с `role='tv'` и виден как player в `room.players` на сервере.
- Телефон подключается через `/join/CODE` либо как залогиненный user (`user.id`), либо как гость с `guestPlayerId` из localStorage (`party-hub-join-guest-id`).
- Сервер ставит `gameHostPlayerId` = id первого player'а с `role='player'`.

После старта игры:
- TV navigate'ит на `/tv/CODE/quiz`.
- Телефон navigate'ит на `/game/CODE/quiz`.

**Баг #1:** на `/game/[roomId]/quiz/page.tsx` `isGameHost` вычисляется так:
```ts
const isGameHost = Boolean(user?.id && gameState.gameHostPlayerId && user.id === gameState.gameHostPlayerId);
```
Используется только `useAuth().user.id`. Для гостя `user` = null → `isGameHost` всегда false → телефон не видит кнопку «Начать игру» в фазе `waiting` → квиз никогда не стартует.

На join-странице есть правильный фолбэк:
```ts
const playerId = user?.id ?? guestPlayerId;
```
Нужно перенести ту же логику на quiz/page.tsx, плюс на все остальные game-страницы для консистентности (но в этом таске трогаем только quiz — остальные оставим как есть, чтобы минимизировать blast radius).

**Баг #2:** на `/join/[code]/page.tsx:113`:
```ts
const visiblePlayers = roomState?.players ?? [];
```
Не фильтрует TV-роль. В лобби (`Lobby.tsx:644, :1720`) и на QR-экране фильтр уже стоит: `player.role !== "tv"`. На join-странице его забыли.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/quiz/page.tsx` — добавить guest-фолбэк к получению effective player id, использовать его в `isGameHost` (и нигде больше — `isHost` оставить как было).
- `src/app/join/[code]/page.tsx` — отфильтровать `visiblePlayers` по `role !== "tv"`.

### НЕ ТРОГАТЬ

- `src/server/socket-handlers.mts` — сервер уже работает правильно.
- `src/components/lobby/Lobby.tsx` — там фильтры уже на месте.
- Другие игры (`/game/[roomId]/crocodile`, `alias`, `mafia`, `spy`, `who-am-i`, `hundred-to-one`) — отдельный таск.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**` — только Claude.

---

## Шаги реализации

### Шаг 1: `src/app/game/[roomId]/quiz/page.tsx`

1. Добавить константу `GUEST_ID_KEY = "party-hub-join-guest-id"` (то же значение, что в `join/[code]/page.tsx`).
2. Добавить state `guestPlayerId` и `useEffect`, который читает его из `localStorage` на маунте (по образцу join-страницы, lines 22-31, 42, 51-53). Аналогичный `queueMicrotask` паттерн.
3. Вычислить `effectivePlayerId = user?.id ?? guestPlayerId` (мемоизировать через `useMemo` или просто константу в теле компонента).
4. В `isGameHost` заменить `user?.id` на `effectivePlayerId`:
   ```ts
   const isGameHost = Boolean(effectivePlayerId && gameState.gameHostPlayerId && effectivePlayerId === gameState.gameHostPlayerId);
   ```
5. **`isHost` (room host) НЕ ТРОГАТЬ** — он остаётся через `user?.id`. У гостя `isHost` всегда false, это правильно: гость не может быть владельцем комнаты.
6. Проверить, что `myAnswer` и подобные lookups, использующие `user?.id` как ключ в `gameState.answers`, остаются работоспособны (если `user` null, гость не сможет участвовать в opveтах) — **ВАЖНО**: чтобы гость мог отвечать на вопросы, ВСЕ места, где `user?.id` используется как player id (отправка ответа, чтение скорборда, лукап ответа), нужно заменить на `effectivePlayerId`. Сделать grep по `user?.id` в файле и подменить там, где речь про player identity (не auth-метаданные типа nickname).

   Конкретные места для замены (по grep):
   - `myAnswer` lookup — `gameState.answers[user.id]` → `gameState.answers[effectivePlayerId]`
   - emit `quiz:answer` payload — `playerId: user.id` → `playerId: effectivePlayerId`
   - scoreboard lookup — `gameState.scores[user.id]` → `gameState.scores[effectivePlayerId]`
   - проверка `correctPlayers.includes(user.id)` → `correctPlayers.includes(effectivePlayerId)`

   Сделать поиск `user?.id` и `user.id` в файле, оценить каждое использование: identity → `effectivePlayerId`, auth-метаданные (типа `user.nickname`) → оставить как есть.

### Шаг 2: `src/app/join/[code]/page.tsx`

1. На line ~113 заменить:
   ```ts
   const visiblePlayers = roomState?.players ?? [];
   ```
   на:
   ```ts
   const visiblePlayers = (roomState?.players ?? []).filter((p) => p.role !== "tv");
   ```

2. Тип `JoinRoomPlayer` уже содержит `role?: string` (line 12), фильтр сработает корректно.

### Шаг 3: проверки

- `npm run lint` — без новых ошибок.
- `npm run build` — успешен.
- `tsc` (если есть отдельный тайп-чек) — без ошибок.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npm run build` успешен
- [ ] В `quiz/page.tsx` все player-identity лукапы используют `effectivePlayerId`, а не `user?.id`
- [ ] `isHost` (room host) остаётся через `user?.id` — гость не может быть владельцем комнаты
- [ ] В `join/[code]/page.tsx` `visiblePlayers` отфильтрован по `role !== "tv"`
- [ ] Никаких изменений в файлах вне whitelist

---

## Открытые вопросы

Если в `quiz/page.tsx` обнаружится use case, где нужен именно `user?.id` (а не `effectivePlayerId`) — оставить как есть и явно отметить в отчёте.

Если grep по `user?.id` покажет больше 8 мест с неоднозначной семантикой — остановиться и вернуть управление Claude с перечислением.

---

## Отчёт

Codex пишет отчёт в `codex-reports/150-fix-quiz-guest-host-and-tv-in-join-list.md` с:
- diff-сводкой (что точно поменялось)
- результатами lint/build
- списком всех мест где `user?.id` → `effectivePlayerId` (с line numbers)
- любыми отклонениями от ТЗ
