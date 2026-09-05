# TASK-050: Сохранять выбранную игру при создании комнаты

## Проблема

При нажатии «Создать комнату» вызывается `router.push('/lobby/CODE?m=1')`.
Lobby ремаунтится и `activeGame` сбрасывается в `"quiz"` (значение по умолчанию,
строка ~183). Пользователь видит что интерфейс переключился на Квиз.

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

## Изменения

### 1. Передавать `game=` при создании комнаты (~строка 349)

```ts
// было:
router.push(`/lobby/${res.code}?m=1`);

// стало:
router.push(`/lobby/${res.code}?m=1&game=${activeGame}`);
```

Для этого `activeGame` должен быть доступен в замыкании. Он уже есть в `Lobby`
компоненте, нужно убедиться что колбэк `createRoom` его использует.
Если `createRoom` — это отдельный `useCallback`, добавить `activeGame` в его
deps array и использовать его внутри.

### 2. Читать `game=` из searchParams при монте и восстанавливать `activeGame`

Рядом с существующим useEffect для `?m=1` (~строка 208) добавить:

```ts
useEffect(() => {
  const gameParam = searchParams.get('game') as GameId | null;
  if (gameParam && games.some((g) => g.id === gameParam)) {
    setActiveGame(gameParam);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // только при монте
```

`games` — это массив конфигов игр, доступен в Lobby. `GameId` — тип из imports.

### 3. Убедиться что `activeGame` в deps у createRoom callback

Найти useCallback где вызывается `emit('room:create', ...)` и `router.push(...)`.
Если `activeGame` не в deps — добавить.

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- После создания комнаты URL содержит `?m=1&game=<activeGame>`
- При возврате на страницу комнаты активная игра сохраняется

## Не трогать

- `handleStartGame` — там уже правильно передаётся `game=`
- Логику `?m=1` для авто-открытия меню — не трогать
- Всё остальное кроме: router.push при создании комнаты + useEffect для восстановления activeGame

## Отчёт

`codex-reports/050-preserve-active-game-on-room-create.md`
