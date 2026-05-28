# TASK-143: Редизайн панели комнаты — кнопка в топ-баре для всех ролей

## Цель
Сделать так, чтобы кнопка комнаты была доступна для ВСЕХ ролей (tv и player),
находилась в топ-баре слева от аватара, и открывала упрощённую панель:
игроки + кнопка «Добавить игрока».

## Whitelist файлов
- `src/components/lobby/Lobby.tsx` — единственный файл

---

## Изменения

### 1. Топ-бар — добавить кнопку комнаты

Компонент `TopBar` (строка ~967) получает новые props:
```ts
roomCode?: string | null;
onOpenRoomMenu?: () => void;
```

В `TopBar`, в правый блок (перед `<AvatarPill>`), добавить:
```tsx
{roomCode && onOpenRoomMenu && (
  <button onClick={onOpenRoomMenu} style={{
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.09)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "white",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "0.08em",
    cursor: "pointer",
    fontFamily: "inherit",
  }}>
    {roomCode}
  </button>
)}
```

Вызов `TopBar` в основном рендере Lobby (строка ~775) дополнить:
```tsx
roomCode={roomCode}
onOpenRoomMenu={() => setRoomMenuOpen(true)}
```

### 2. Убрать ограничение myRole === "tv" для показа RoomMenu на десктопе

Найти блок (строка ~834):
```tsx
{myRole === "tv" && !isMobile && (
  <div style={{ display: "flex", justifyContent: "flex-end" }}>
    <AnimatePresence mode="wait">
      {roomMenuOpen && roomCode ? (
        <RoomMenu .../>
      ) : (
        <TiltedPreview .../>
      )}
    </AnimatePresence>
  </div>
)}
```

Изменить условие — TiltedPreview показывать всегда когда нет roomMenu,
RoomMenu показывать когда `roomMenuOpen && roomCode` для ЛЮБОЙ роли:
```tsx
<div style={{ display: isMobile ? "none" : "flex", justifyContent: "flex-end" }}>
  <AnimatePresence mode="wait">
    {roomMenuOpen && roomCode ? (
      <RoomMenu key="room-menu" ref={roomMenuRef} ... />
    ) : (
      <TiltedPreview key="tilted-preview" gameId={active.id} />
    )}
  </AnimatePresence>
</div>
```

Мобильный bottom-sheet уже не имеет условия `myRole === "tv"` — проверить, если есть — убрать.

### 3. Добавить кнопку «Добавить игрока» в RoomMenu

В компоненте `RoomMenu` (строка ~2116), добавить новый prop:
```ts
onAddPlayer: () => void;
```

В нижней части рендера `RoomMenu` (после списка игроков, перед или вместо
секции с QR-кодом) добавить кнопку:
```tsx
{isCurrentUserHost && (
  <button
    type="button"
    onClick={() => { onAddPlayer(); onClose(); }}
    style={{
      width: "100%",
      padding: "14px 20px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "white",
      fontWeight: 800,
      fontSize: 16,
      cursor: "pointer",
      fontFamily: "inherit",
    }}
  >
    + Добавить игрока
  </button>
)}
```

### 4. Передать `onAddPlayer` из Lobby в RoomMenu

Создать в Lobby новый callback `handleAddPlayer`:
```ts
const handleAddPlayer = useCallback(() => {
  if (!roomCode) return;
  // Если игра уже выбрана — просто показываем QR-экран
  // Если не выбрана — выбираем текущую activeGame
  if (!roomState?.currentGame) {
    emit('game:select', { code: roomCode, gameType: activeGame });
  }
  setIsWaitingForPlayers(true);
}, [activeGame, emit, roomCode, roomState?.currentGame]);
```

Передать `onAddPlayer={handleAddPlayer}` в оба места рендера `RoomMenu` (десктоп и мобайл).

Обновить TypeScript-тип props `RoomMenu`, добавив `onAddPlayer: () => void`.

## Acceptance
- Кнопка с кодом комнаты видна в топ-баре для ОБЕИХ ролей (tv и player) когда `roomCode` задан
- Клик на кнопку открывает RoomMenu
- В RoomMenu снизу есть кнопка «+ Добавить игрока» (только для хоста)
- Клик на «+ Добавить игрока»: закрывает RoomMenu, открывает QR-экран ожидания
- TiltedPreview по-прежнему показывается на десктопе когда RoomMenu закрыт
- `npm run lint` без новых ошибок

## Не трогать
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/`, `.codex/`
- Файлы вне `src/components/lobby/Lobby.tsx`
- Логику `RoomMenu` кроме добавления `onAddPlayer`
