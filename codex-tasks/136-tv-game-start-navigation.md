# TASK-136: TV навигация при старте игры

> **Метаданные**
> - **Дата создания:** 2026-05-24
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~10 минут
> - **Зависит от тасков:** 132, 134, 135
> - **Часть пивота:** TV-mode (132…136), шаг 5/5.

---

## Цель

Когда хост запускает игру:
- **TV-экран** (desktop, `myRole === 'tv'`) → переходит на `/tv/${roomCode}/${gameType}`
- **Мобильный игрок** (`myRole === 'player'`) → переходит на `/game/${roomCode}/${gameType}`

Сейчас оба идут на `/game/...`. Нужно разветвить навигацию по роли.

---

## Контекст

В `Lobby.tsx` есть два места где происходит навигация при старте игры:

**1. `game:started` event listener** (строка ~307):
```ts
useEffect(() => {
  return on('game:started', (payload: unknown) => {
    const data = payload as { gameType: string; roomCode: string };
    router.push(`/game/${data.roomCode}/${data.gameType}`);  // ← изменить
  });
}, [on, router]);
```

**2. Кнопка «Открыть ТВ»** (строка ~800) — `window.open('/tv/${roomCode}', '_blank')`.
Это вспомогательная кнопка, её **не трогать**.

---

## Файлы к изменению (whitelist)

- `src/components/lobby/Lobby.tsx` — единственный файл.

### НЕ ТРОГАТЬ

- `src/server/socket-handlers.mts`, `server.mts`
- `src/app/tv/**` — TV-страницы игр
- `src/app/game/**` — игровые страницы
- `src/components/Splash.tsx`, `src/components/ModeGate.tsx`
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`

---

## Шаги реализации

### 1. Разветвить навигацию в `game:started` listener

Найти useEffect с `on('game:started', ...)` и изменить:

```ts
useEffect(() => {
  return on('game:started', (payload: unknown) => {
    const data = payload as { gameType: string; roomCode: string };
    // TV screen goes to the TV view; mobile players go to the player game view
    if (myRole === 'tv') {
      router.push(`/tv/${data.roomCode}/${data.gameType}`);
    } else {
      router.push(`/game/${data.roomCode}/${data.gameType}`);
    }
  });
}, [on, myRole, router]);
```

Добавить `myRole` в dependency array.

### 2. `handleStartGame` — убедиться что TV тоже получает `game:started`

`handleStartGame` вызывает `emit('game:start', { code })`. Сервер в ответ
рассылает `game:started` **всем клиентам в комнате** (включая TV-клиента,
который join'ился через `room:create`/`room:join` с `role: 'tv'`).

Проверить: TV-клиент находится в socket.io room `room:${code}` → получит broadcast.
Если сервер шлёт `game:started` только игрокам — нужно убедиться что TV в той же
socket.io room. Это должно быть так после TASK-134 (TV join'ился через `room:join`,
который делает `socket.join(\`room:${room.code}\`)`).

Дополнительных изменений сервера **не нужно**.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` чисто
- [ ] `myRole` добавлен в deps array `game:started` useEffect
- [ ] При `myRole === 'tv'`: навигация идёт на `/tv/${roomCode}/${gameType}`
- [ ] При `myRole === 'player'`: навигация идёт на `/game/${roomCode}/${gameType}`
- [ ] Кнопка «Открыть ТВ» (`window.open`) — не тронута

---

## Ограничения и подводные камни

- **Только один `game:started` listener** — найти его, не создавать второй.
- **`myRole` уже объявлен** в компоненте — просто добавить в deps и использовать.
- **Stale closure:** именно поэтому `myRole` нужен в dep array — иначе useEffect
  захватит старый `myRole` и навигация пойдёт не туда.
- **Не менять URL `/tv/${roomCode}`** на `/tv/${roomCode}/${gameType}` — этот формат
  уже используется в существующих TV-страницах (`src/app/tv/[roomId]/[gameType]/page.tsx`).

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только `src/components/lobby/Lobby.tsx`.
2. `npm run lint` зелёный.
3. `npx tsc --noEmit` чисто.
4. `git diff src/components/lobby/Lobby.tsx | grep "game:started" -A 10` —
   убедиться что там `if (myRole === 'tv')` и оба роутера.
5. Заполнить отчёт `codex-reports/136-tv-game-start-navigation.md`.
6. **Не коммитить.**
