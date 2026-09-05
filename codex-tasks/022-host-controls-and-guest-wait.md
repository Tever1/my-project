# TASK-022: Управление игроками хостом + гость остаётся в лобби

> **Сложность:** medium
> **Запуск:** auto by Claude

## Файлы (whitelist)

- `src/app/lobby-preview/page.tsx`

## Контекст

Серверные события уже реализованы в `src/server/socket-handlers.mts`:
- `room:kick` — принимает `{ code, playerId }`, высылает игрока и рассылает обновлённый `room:state`
- `room:transfer-host` — принимает `{ code, newHostId }`, меняет хоста и рассылает обновлённый `room:state`
- `room:kicked` — событие, которое сервер отправляет высланному игроку

`user.id` доступен через `useAuth()` как `user?.id`.
`roomState.hostId` хранит id текущего хоста.
`roomCode` хранит код комнаты (не null когда хост создал или гость подключился — после этого таска).

---

## Цели

### A. Управление игроками (хост-only): клик по игроку → мини-меню

В компоненте `RoomMenu`:

1. Добавить пропы: `currentUserId: string`, `onKick: (playerId: string) => void`,
   `onTransferHost: (playerId: string) => void`.

2. Добавить state `selectedPlayerId: string | null` (какой пилл сейчас открыт).

3. Клик по пиллу игрока:
   - Если `currentUserId !== roomState?.hostId` → клики игнорируются (не хост, нет меню).
   - Если кликнули на свой пилл (`player.id === currentUserId`) → игнорировать.
   - Иначе: `selectedPlayerId = player.id` (toggle: если уже открыт — закрыть).

4. Под пиллом выбранного игрока рендерить мини-меню (inline, не absolute popup):
   - Обёртка: `AnimatePresence`, появление через `opacity 0→1, y -4→0`, duration 0.15s.
   - Стиль: `background: rgba(20,20,24,0.92)`, `backdropFilter: blur(12px)`,
     `border: 1px solid rgba(255,255,255,0.12)`, `borderRadius: radius.md`,
     `padding: 6px`, `marginTop: 6px`, `display: flex`, `flexDirection: column`, `gap: 2px`.
   - Две кнопки:
     - «Удалить из комнаты» — иконка 🚫 (или SVG крест), цвет `#ef4444` при hover.
       onClick: `onKick(player.id); setSelectedPlayerId(null)`.
     - «Передать роль хоста» — иконка 👑 (или SVG корона), цвет accent при hover.
       onClick: `onTransferHost(player.id); setSelectedPlayerId(null)`.
   - Стиль кнопок: `width: 100%`, `textAlign: left`, `padding: 8px 12px`,
     `borderRadius: radius.sm`, `fontSize: 13`, `fontWeight: 600`,
     `color: rgba(255,255,255,0.85)`, `background: transparent`,
     `border: none`, `cursor: pointer`.
     При hover: background `rgba(255,255,255,0.07)`.
   - Закрытие: клик вне `RoomMenu` уже закрывает само меню (существующий outside-click
     handler) — достаточно. Дополнительно: при закрытии `RoomMenu` сбросить
     `selectedPlayerId = null`.

5. Курсор на пиллах: если хост и не свой игрок — `cursor: pointer`.

### B. Подключение к комнате без редиректа (гость остаётся в лобби)

В функции `handleJoinRoom` (примерно строка 328):
- Вместо `router.push('/lobby/${res.code}')` при успехе:
  - `setRoomCode(res.code)` — сохранить код (как при создании комнаты).
  - `setJoinCode("")` — очистить инпут.
  - Не делать `router.push` — пользователь остаётся на `/lobby-preview`.

Подписаться на `room:kicked` (в новом useEffect):
```ts
const unsubscribe = on('room:kicked', () => {
  setRoomCode(null);
  setRoomState(null);
  setRoomMenuOpen(false);
  toast.error("Вас удалили из комнаты");
});
return unsubscribe;
```

### C. Кнопка «Начать партию» / «Ожидание хоста»

Определить `isCurrentUserHost`:
```ts
const isCurrentUserHost =
  !roomCode ||                        // не в комнате → показываем "Начать" (создаст комнату)
  roomState?.hostId === user?.id ||   // я хост
  roomState == null;                  // state ещё не пришёл — не блокируем
```

Кнопка «Начать партию»:
- Если `isCurrentUserHost` → поведение как сейчас (gradient, активная).
- Если `!isCurrentUserHost` (гость в комнате):
  - Текст: «Ожидание хоста» (без иконки PlayIcon).
  - Стиль: `background: rgba(255,255,255,0.06)`, `color: rgba(255,255,255,0.45)`,
    `border: 1px solid rgba(255,255,255,0.10)`, `cursor: not-allowed`.
  - `disabled={true}` / `onClick` не вызывается.
  - Убрать `whileHover` / `whileTap` scale если `!isCurrentUserHost`.

### D. Передать handleKick и handleTransferHost в RoomMenu

В основном компоненте страницы добавить:

```ts
const handleKick = useCallback((playerId: string) => {
  if (!roomCode) return;
  emit('room:kick', { code: roomCode, playerId });
}, [emit, roomCode]);

const handleTransferHost = useCallback((playerId: string) => {
  if (!roomCode) return;
  emit('room:transfer-host', { code: roomCode, newHostId: playerId });
}, [emit, roomCode]);
```

Передать в `<RoomMenu>`:
- `currentUserId={user?.id ?? ""}`
- `onKick={handleKick}`
- `onTransferHost={handleTransferHost}`

---

## Acceptance

- [ ] `npx tsc --noEmit` — без новых ошибок.
- [ ] `npx eslint src/app/lobby-preview/page.tsx` — без новых ошибок.
- [ ] `npx next build --webpack` — exit code 0.
- [ ] Хост кликает на игрока → появляется мини-меню с двумя кнопками.
- [ ] Хост кликает на свой пилл → меню не появляется.
- [ ] Гость кликает на пилл → ничего не происходит (нет меню).
- [ ] «Удалить» → `room:kick` отправлен, меню закрыто.
- [ ] «Передать роль» → `room:transfer-host` отправлен, меню закрыто.
- [ ] После `room:join` success → пользователь остаётся на `/lobby-preview`, `roomCode` сохранён.
- [ ] Гость видит «Ожидание хоста» (серый, disabled).
- [ ] Если гость получает `room:kicked` → `roomCode` сбрасывается, toast «Вас удалили».

## Контрольные точки

1. `npx tsc --noEmit` OK.
2. `npx eslint src/app/lobby-preview/page.tsx` OK.
3. `npx next build --webpack` exit code 0.
4. Заполнить отчёт в `codex-reports/022-host-controls-and-guest-wait.md`.
5. Не коммитить.
