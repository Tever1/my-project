# TASK-098: Меню игрока — маленький dropdown под чипом

## Файл для правки

`src/components/lobby/Lobby.tsx` — только этот файл.

---

## Контекст

В TASK-096 и TASK-097 меню игрока было переделано в full-panel overlay.
Это неверно — пользователь хочет маленький dropdown под именем игрока.

## Что нужно сделать

### Шаг A: Убрать `overflow: "hidden"` с GlassPanel

Найди `<GlassPanel ... style={{ ..., position: "relative", overflow: "hidden", ... }}>`.
Убери `overflow: "hidden"` из style — оно обрезало бы выпадающее меню.
`position: "relative"` тоже убери — он больше не нужен на GlassPanel.

### Шаг B: Убрать AnimatePresence из GlassPanel

Найди `<AnimatePresence>` который стоит последним child внутри `</GlassPanel>`
(перед `</GlassPanel>`). Удали весь этот блок — он больше не нужен там.

### Шаг C: Вернуть dropdown ВНУТРЬ chip-враппера

В цикле `connectedPlayers.map((player) => { ... })` сейчас рендерится
только `<button>` без враппера. Нужно вернуть враппер и dropdown.

Замени:
```jsx
return (
  <button key={player.id} ...>...</button>
);
```

На:
```jsx
return (
  <div key={player.id} style={{ position: "relative", display: "inline-flex" }}>
    <button ...>...</button>
    <AnimatePresence>
      {selectedPlayerId === player.id && (
        <motion.div
          key="player-action-menu"
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ duration: 0.13 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            background: "rgba(14, 14, 20, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 210,
            boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6)",
          }}
        >
          <RoomMenuActionButton
            icon={<KickPlayerIcon />}
            label="Удалить из комнаты"
            hoverColor="#ef4444"
            onClick={() => { onKick(player.id); setSelectedPlayerId(null); }}
          />
          <RoomMenuActionButton
            icon={<HostCrownIcon />}
            label="Передать роль хоста"
            hoverColor={accent}
            onClick={() => { onTransferHost(player.id); setSelectedPlayerId(null); }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
```

Кнопка `<button>` внутри враппера:
- Убери `key={player.id}` с кнопки (он теперь на враппере `<div>`)
- Сохрани все остальные стили и onClick без изменений

### Шаг D: Chips-контейнер — убрать `position: "relative"` если он там остался

Найди div с `flexWrap: "wrap", minHeight: 70`.
Убери `position: "relative"` если оно там есть — теперь не нужно.

### Шаг E: Закрытие по клику снаружи

В chips-контейнере (div с `flexWrap:"wrap", minHeight:70`) добавить:
```jsx
onClick={() => setSelectedPlayerId(null)}
```
Это позволит закрыть меню кликом в любое место вне чипов.

Также найди `useEffect` с `return () => setSelectedPlayerId(null)` (~line 2022).
Рядом или вместо него добавь глобальный pointerdown listener который
вызывает `setSelectedPlayerId(null)` при клике вне `roomMenuRef.current`:

```js
useEffect(() => {
  if (!selectedPlayerId) return;
  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (roomMenuRef.current?.contains(target)) return;
    setSelectedPlayerId(null);
  };
  window.addEventListener("pointerdown", onPointerDown);
  return () => window.removeEventListener("pointerdown", onPointerDown);
}, [selectedPlayerId]);
```

Заменяет или дополняет существующий useEffect с `return () => setSelectedPlayerId(null)`.

---

## Acceptance

1. При клике на имя игрока появляется маленькое меню (~210px) прямо под его чипом.
2. Меню НЕ растягивает панель — QR-код и другие элементы не смещаются.
3. Клик в любое место вне чипа (в том числе вне RoomMenu) закрывает меню.
4. Кнопки «Удалить из комнаты» и «Передать роль хоста» работают как раньше.

## Запрещено

- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/**, codex-reports/**
- Не трогать другие файлы кроме `src/components/lobby/Lobby.tsx`

## Отчёт

Создай `codex-reports/098-player-dropdown-chip-relative.md`.
