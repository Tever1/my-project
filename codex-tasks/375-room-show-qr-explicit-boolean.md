# TASK-375: `room:show-qr` — сделать явным boolean вместо неявного toggle/always-true

## Контекст

TASK-374 добавил на мобильном экране `/join/[code]` кнопку «Вернуться в
лобби», которая повторно эмитит `room:show-qr`, предполагая, что на стороне
получателя это ПЕРЕКЛЮЧАТЕЛЬ (toggle). Пользователь подтвердил живым тестом:
кнопка не закрывает QR на игровом поле (TV) и не возвращает его к экрану
лобби.

**Реальная причина** — событие `room:show-qr` обрабатывается ПО-РАЗНОМУ в
разных местах, и ни разу не как надёжный boolean:

1. **Сервер** (`src/server/socket-handlers.mts`, строки ~494-498) —
   ретранслирует событие БЕЗ ПОЛЕЗНОЙ НАГРУЗКИ вообще:
   ```ts
   socket.on('room:show-qr', (data: { code: string }) => {
     const room = getRoomByCode(data.code);
     if (!room) return;
     io.to(`room:${room.code}`).emit('room:show-qr'); // ← без payload!
   });
   ```
   Даже если клиент пришлёт доп. данные, они теряются — все получатели видят
   голое `room:show-qr` без информации «показать» или «скрыть».

2. **`src/components/lobby/Lobby.tsx`** (строка ~546-549) — обрабатывает как
   «всегда включить», НЕ toggle:
   ```tsx
   useEffect(() => {
     return on('room:show-qr', () => {
       setIsWaitingForPlayers(true);
     });
   }, [on]);
   ```
   Это тот код, который реально показывает QR на TV, ПОКА ИГРА ЕЩЁ НЕ
   НАЧАТА (TV в этот момент рендерит `Lobby.tsx`, а не файл
   `/tv/[roomId]/[gameType]/page.tsx`). Повторный emit того же голого события
   здесь просто ещё раз ставит `true` — ничего не закрывает.

3. **`src/app/tv/[roomId]/[gameType]/page.tsx`** (строка ~460-463) —
   обрабатывает как TOGGLE:
   ```tsx
   const unsubscribe = on('room:show-qr', () => {
     setShowQrOverlay((visible) => !visible);
   });
   ```
   Это применимо только КОГДА ИГРА УЖЕ ИДЁТ (TV на игровом маршруте). Toggle
   здесь работает случайно правильно только если ровно один clients кликнул
   ровно один раз — ненадёжно при гонках/повторных кликах.

4. **`src/app/join/[code]/page.tsx`** (TASK-374) и
   **`src/components/lobby/Lobby.tsx`** (`handleAddPlayer`, строка ~706-712,
   и `handleCancelWaiting`, строка ~699-704) — эмитят/обрабатывают `room:show-qr`
   без явного намерения show/hide.

## Что сделать

Провести явный boolean через всю цепочку: сервер должен пересылать флаг
`show: boolean`, и ВСЕ получатели должны ставить своё локальное состояние
РОВНО в это значение (никакого toggle, никакого «всегда true»).

### 1. `src/server/socket-handlers.mts` (~строка 494-498)

```ts
socket.on('room:show-qr', (data: { code: string; show?: boolean }) => {
  const room = getRoomByCode(data.code);
  if (!room) return;
  io.to(`room:${room.code}`).emit('room:show-qr', { show: data.show !== false });
});
```

(Если `show` не передан явно — считать `true`, для обратной совместимости с
любыми старыми вызовами без payload.)

### 2. `src/components/lobby/Lobby.tsx`

- Обработчик (~строка 546-549):
  ```tsx
  useEffect(() => {
    return on('room:show-qr', (data: unknown) => {
      const show = (data as { show?: boolean } | undefined)?.show !== false;
      setIsWaitingForPlayers(show);
    });
  }, [on]);
  ```
- `handleAddPlayer` (~строка 706-712) — эмитить явно `show: true`:
  ```tsx
  emit('room:show-qr', { code: roomCode, show: true });
  ```
- `handleCancelWaiting` (~строка 699-704) — сейчас только эмитит
  `game:deselect` и локально сбрасывает `isWaitingForPlayers`. Добавить туда
  ЖЕ emit `room:show-qr` с `show: false`, чтобы ВСЕ клиенты (включая другие
  телефоны на `/join/[code]`, если они там есть) тоже узнали о закрытии:
  ```tsx
  const handleCancelWaiting = useCallback(() => {
    if (roomCode) {
      emit('game:deselect', { code: roomCode });
      emit('room:show-qr', { code: roomCode, show: false });
    }
    setIsWaitingForPlayers(false);
  }, [emit, roomCode]);
  ```

### 3. `src/app/tv/[roomId]/[gameType]/page.tsx` (~строка 460-463)

Заменить toggle на явную установку из payload:

```tsx
const unsubscribe = on('room:show-qr', (data: unknown) => {
  const show = (data as { show?: boolean } | undefined)?.show !== false;
  setShowQrOverlay(show);
});
```

### 4. `src/app/join/[code]/page.tsx` (TASK-374, уже добавленные хендлеры)

Обновить оба emit, добавив явный `show`:

```tsx
const handleAddPlayer = useCallback(() => {
  if (!code) return;
  emit("room:show-qr", { code, show: true });
  setQrShown(true);
}, [code, emit]);

const handleCloseAddPlayerQr = useCallback(() => {
  if (!code) return;
  emit("room:show-qr", { code, show: false });
  setQrShown(false);
}, [code, emit]);
```

## Whitelist файлов

- `src/server/socket-handlers.mts`
- `src/components/lobby/Lobby.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/app/join/[code]/page.tsx`

Больше никаких файлов не трогать.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- Сценарий A (игра ещё не началась, TV на Lobby.tsx): клик «+ Добавить
  игрока» на `/join/[code]` показывает QR на TV; клик «Вернуться в лобби» на
  том же телефоне закрывает QR на TV, возвращая обычный вид лобби.
- Сценарий B (игра уже идёт, TV на `/tv/[roomId]/[gameType]`): тот же цикл
  показать/скрыть работает так же надёжно (явный `show`, а не toggle).
- Кнопка «Отмена» в TV-режиме Lobby.tsx (`handleCancelWaiting`, вызывается
  прямо на TV) продолжает работать как раньше, и ДОПОЛНИТЕЛЬНО теперь
  синхронизирует остальные устройства (`show:false` доходит до
  `/join/[code]`, сбрасывая там `qrShown` — если понадобится, добавь такой же
  слушатель `room:show-qr` в `/join/[code]/page.tsx` для актуализации
  `qrShown`, если такого слушателя там ещё нет; если этот пункт выходит за
  scope — опиши в отчёте отдельно, не делай лишних правок без необходимости).

## Отчёт

Записать в `codex-reports/375-room-show-qr-explicit-boolean.md`:
что изменено по каждому файлу, diff по строкам, результат tsc/lint.
