# TASK-062: Fix — комната не найдена при room:get-state

## Файлы

**Whitelist:**
- `src/server/socket-handlers.mts`
- `src/components/lobby/Lobby.tsx`

---

## Изменение 1: сервер (~строка 185-187)

Найти в `socket-handlers.mts`:

```ts
    socket.on('room:get-state', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
```

Заменить на:

```ts
    socket.on('room:get-state', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) {
        socket.emit('room:not-found', { code: data.code });
        return;
      }
```

---

## Изменение 2: клиент (~строка 281, рядом с useEffect для room:kicked)

В `src/components/lobby/Lobby.tsx` добавить новый useEffect для `room:not-found`
рядом с существующим useEffect для `room:kicked` (~строка 281):

```ts
  useEffect(() => {
    const unsubscribe = on('room:not-found', () => {
      setRoomCode(null);
      setRoomState(null);
      setRoomMenuOpen(false);
      if (isRoomRoute) {
        router.push('/');
      }
    });
    return unsubscribe;
  }, [isRoomRoute, on, router]);
```

Добавить после блока `room:kicked` useEffect (не заменять его, а добавить новый рядом).

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- После логаута и обновления `/lobby/CODE` → редирект на `/`
- При нормальной работе (комната жива) ничего не меняется

## Не трогать

- Всё остальное кроме двух описанных мест

## Отчёт

`codex-reports/062-fix-stale-room-not-found.md`
