# REPORT TASK-116: mobile-menu-pointer-and-reconnect

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-20 21:29
> - **Финиш:** 2026-05-20 21:33
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `Lobby.tsx` исправлены три мобильных edge-case: закрытый bottom sheet больше не перехватывает taps, reconnect повторно делает `room:join` по `initialCode || roomCode`, а auto-leave очищает локальный room state.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — три точечных изменения по ТЗ.

### Новые файлы

- `codex-reports/116-mobile-menu-pointer-and-reconnect.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Before/After Diffs

### Change 1 — bottom sheet pointer events

Before:

```tsx
willChange: "transform",
```

After:

```tsx
willChange: "transform",
pointerEvents: roomMenuOpen ? "auto" : "none",
```

### Change 2 — reconnect uses `initialCode || roomCode`

Before:

```tsx
useEffect(() => {
  if (!initialCode || !user || !user.nickname || !isConnected) return;
  emit('room:join', { code: initialCode, playerId: user.id, nickname: user.nickname }, (res: unknown) => {
    const response = res as { success: boolean };
    if (!response.success) {
      setRoomCode(null);
      setRoomState(null);
      router.push('/');
    }
  });
}, [emit, initialCode, isConnected, router, user]);
```

After:

```tsx
useEffect(() => {
  const code = initialCode || roomCode;
  if (!code || !user || !user.nickname || !isConnected) return;
  emit('room:join', { code, playerId: user.id, nickname: user.nickname }, (res: unknown) => {
    const response = res as { success: boolean };
    if (!response.success) {
      setRoomCode(null);
      setRoomState(null);
      if (isRoomRoute) router.push('/');
    }
  });
}, [emit, initialCode, roomCode, isConnected, isRoomRoute, router, user]);
```

### Change 3 — auto-leave clears state

Before:

```tsx
useEffect(() => {
  if (isRoomRoute || !isConnected) return;
  emit('room:leave', {});
}, [isRoomRoute, emit]);
```

After:

```tsx
useEffect(() => {
  if (isRoomRoute || !isConnected) return;
  emit('room:leave', {});
  setRoomCode(null);
  setRoomState(null);
}, [isRoomRoute, emit]);
```

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 12 ++++++++----
1 file changed, 8 insertions(+), 4 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | TypeScript прошёл без ошибок |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- `src/components/lobby/Lobby.tsx:262-272` — reconnect join теперь работает и для `/`.
- `src/components/lobby/Lobby.tsx:277-282` — leave effect очищает state.
- `src/components/lobby/Lobby.tsx:706` — bottom sheet pointer events.
