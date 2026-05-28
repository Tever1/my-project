# TASK-153: завершение квиза — TV → `/lobby/CODE`, телефон → `/join/CODE` waiting

> **Метаданные**
> - **Дата создания:** 2026-05-26
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~7 минут
> - **Зависит от тасков:** TASK-149, TASK-150, TASK-151

---

## Цель

Когда game-host жмёт «ЗАВЕРШИТЬ» в квизе:
- **TV (десктоп)** возвращается в десктоп-лобби `/lobby/CODE` (PS5-UI с выбором игр).
- **Все телефоны** возвращаются в waiting-экран комнаты `/join/CODE` со списком игроков, **без повторного ввода никнейма**.

---

## Контекст

Текущее поведение на `game:ended`:
- `src/app/tv/[roomId]/[gameType]/page.tsx:391` → `router.push('/tv/${roomId}')` (старая TV-лобби).
- `src/app/game/[roomId]/quiz/page.tsx:319` → `router.push('/lobby/${roomId}')`. Для гостя (без `user`) `/lobby/CODE` открывает auth-меню — UX сломан.

Сервер на `game:end` (`src/server/socket-handlers.mts:294`) уже корректно сбрасывает `room.status='lobby'`, `currentGame=null`, и игроки остаются в `room.players` Map. Так что после редиректа игроки технически всё ещё в комнате — нужно только не просить их пересоздать identity.

`/join/[code]/page.tsx` сейчас всегда стартует с `joined=false` — показывает поле ввода никнейма даже если игрок уже в `roomState.players`. Нужно добавить детект «уже в комнате» по `playerId` (`user?.id ?? guestPlayerId`) и в этом случае сразу `setJoined(true)` без повторного `room:join`.

---

## Файлы к изменению (whitelist)

- `src/app/tv/[roomId]/[gameType]/page.tsx` — поменять редирект на `game:ended` с `/tv/${roomId}` на `/lobby/${roomId}`.
- `src/app/game/[roomId]/quiz/page.tsx` — поменять редирект на `game:ended` с `/lobby/${roomId}` на `/join/${roomId}`.
- `src/app/join/[code]/page.tsx` — добавить auto-detect: если `playerId` уже в `roomState.players`, выставить `joined=true` (без повторного emit `room:join`).

### НЕ ТРОГАТЬ

- Серверный код (`src/server/socket-handlers.mts`) — он работает корректно.
- Другие игры (crocodile, alias, mafia, spy, who-am-i, hundred-to-one) — отдельный таск, сейчас фокус на квизе.
- `src/app/tv/[roomId]/page.tsx` — старая TV-лобби, не трогаем.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Шаги реализации

### Шаг 1: `src/app/tv/[roomId]/[gameType]/page.tsx`

На line 391 заменить:
```ts
router.push(`/tv/${roomId}`);
```
на:
```ts
router.push(`/lobby/${roomId}`);
```

### Шаг 2: `src/app/game/[roomId]/quiz/page.tsx`

На line 319 заменить:
```ts
router.push(`/lobby/${roomId}`);
```
на:
```ts
router.push(`/join/${roomId}`);
```

### Шаг 3: `src/app/join/[code]/page.tsx` — auto-detect already-joined

В текущем коде:
- `playerId = user?.id ?? guestPlayerId` (line 49)
- `roomState` обновляется через socket listener (line 61-71)
- `joined` — local state, начинается с `false`

Добавить `useEffect`, который при изменении `roomState` или `playerId` проверяет: если `playerId` непустой И находится в `roomState.players.find(p => p.id === playerId)` И ещё не `joined` → `setJoined(true)`. Это автоматически переключит UI в waiting-экран без повторного `room:join` emit.

Также нужно подтянуть `nickname` из существующего player record, чтобы `gameHostPlayer?.nickname === nickname.trim()` сравнение в `canStartGame` работало правильно. Конкретно:
- Если игрок найден в `roomState.players` И `nickname` пуст → `setNickname(existingPlayer.nickname)`.

Пример нового useEffect (вставить после useEffect-а на line 73-78):
```ts
useEffect(() => {
  if (!roomState || !playerId || joined) return;
  const existing = roomState.players.find((p) => p.id === playerId);
  if (!existing) return;
  setJoined(true);
  if (!nickname && existing.nickname) {
    setNickname(existing.nickname);
  }
}, [roomState, playerId, joined, nickname]);
```

**Важно:** этот эффект не делает `emit('room:join', ...)` — игрок уже в `room.players` на сервере (после game:end сервер не удаляет игроков). Просто обновляем локальный UI state.

### Шаг 4: проверки

- `npm run lint` без новых ошибок.
- `npx tsc --noEmit` успешен.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` успешен
- [ ] TV после `game:ended` → `/lobby/CODE`
- [ ] Телефон после `game:ended` → `/join/CODE`
- [ ] `/join/CODE` детектит уже-присоединившегося игрока (по `playerId` в `roomState.players`) и сразу показывает waiting-экран без поля ввода никнейма
- [ ] Никаких лишних `room:join` emits при auto-detect
- [ ] Никаких изменений вне whitelist

---

## Открытые вопросы

Если в `/join/[code]/page.tsx` обнаружится, что `roomState` не приходит сразу после маунта (race на socket connection) — это нормально, эффект сработает когда `room:state` придёт. Дополнительной логики ждать не нужно.

---

## Отчёт

Codex пишет отчёт в `codex-reports/153-quiz-end-flow-tv-lobby-phone-room-menu.md`:
- diff-сводка
- результаты lint/tsc
- описание как тестировать
