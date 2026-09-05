# TASK-061: Fix — стейл-комната при монте после возврата браузером

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Проблема

При возврате на `/lobby/CODE` через кнопку «Назад» браузера после того как комната
уже была удалена, Lobby монтируется с `initialCode = "CODE"` → `roomCode = "CODE"`.
Авто-join эффект отправляет `room:join`, но колбэк `() => {}` игнорирует ответ.
Сервер говорит `{ success: false }`, клиент не реагирует и показывает несуществующую комнату.

## Изменение (~строка 276)

Найти useEffect с авто-join при монте:

```ts
  useEffect(() => {
    if (!initialCode || !user || !isConnected) return;
    emit('room:join', { code: initialCode, playerId: user.id, nickname: user.nickname }, () => {});
  }, [emit, initialCode, isConnected, user]);
```

Заменить на:

```ts
  useEffect(() => {
    if (!initialCode || !user || !isConnected) return;
    emit('room:join', { code: initialCode, playerId: user.id, nickname: user.nickname }, (res: unknown) => {
      const response = res as { success: boolean };
      if (!response.success) {
        setRoomCode(null);
        setRoomState(null);
        router.push('/');
      }
    });
  }, [emit, initialCode, isConnected, user]);
```

**Что изменилось:**
- Если `room:join` возвращает `{ success: false }` (комната не найдена/удалена):
  - `setRoomCode(null)` — очищаем локальный state
  - `setRoomState(null)` — очищаем state комнаты
  - `router.push('/')` — редиректим на главную

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- После удаления комнаты и возврата через «Назад» браузера → пользователь перенаправляется на `/`
- При нормальном реконнекте (комната жива) всё работает как прежде

## Не трогать

- Весь остальной код кроме одного useEffect

## Отчёт

`codex-reports/061-fix-stale-room-on-mount.md`
