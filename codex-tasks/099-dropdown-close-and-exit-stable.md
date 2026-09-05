# TASK-099: Dropdown закрывается по любому клику + стабильный header при confirmLeave

## Файл для правки

`src/components/lobby/Lobby.tsx` — только этот файл.

---

## Правка 1: Dropdown закрывается при клике ВЕЗДЕ, включая саму панель

### Проблема

Текущий `useEffect` (~line 2024) закрывает dropdown только при клике
**вне** `panelRef.current`. Клик внутри панели (но не на чипе игрока)
не закрывает меню.

### Что изменить

Найди `useEffect` с `if (panelRef.current?.contains(target)) return;`.
Убери строку `if (panelRef.current?.contains(target)) return;` целиком.

Итоговый useEffect:
```js
useEffect(() => {
  if (!selectedPlayerId) return;
  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // Если клик на кнопку самого чипа — не закрываем, она сама тоглит
    const chipBtn = (e.target as HTMLElement).closest('[data-player-chip]');
    if (chipBtn) return;
    setSelectedPlayerId(null);
  };
  window.addEventListener("pointerdown", onPointerDown);
  return () => window.removeEventListener("pointerdown", onPointerDown);
}, [selectedPlayerId]);
```

Также: найди кнопку чипа игрока (`<button type="button" onClick={() => { if (!canManagePlayer) return; setSelectedPlayerId(...) }}>`).
Добавь к ней атрибут `data-player-chip=""` — чтобы `closest('[data-player-chip]')` её нашёл.

---

## Правка 2: Правая часть header не меняет ширину при confirmLeave

### Проблема

Контейнер кнопок справа (`div` с `flexShrink:0, display:"flex", justifyContent:"flex-end"`)
не имеет фиксированной ширины. При переключении с «Выйти» на «Да / Отмена»
он меняет ширину → текст «В комнате · N» и весь header прыгают.

### Что изменить

Найди `<div style={{ flexShrink: 0, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>`.
Добавь к нему `minWidth: 172`.

```js
style={{
  flexShrink: 0,
  minWidth: 172,
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 8,
}}
```

---

## Acceptance

1. Клик в любое место экрана (в том числе внутри панели RoomMenu, на QR,
   на список игроков) закрывает dropdown меню игрока.
2. Повторный клик на чип открытого игрока — закрывает dropdown (уже работает,
   не ломать).
3. При нажатии «Выйти» → появляются «Да»/«Отмена», но ширина правой части
   и положение текста «В комнате · N» не меняются.

## Запрещено

- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/**, codex-reports/**
- Не трогать другие файлы кроме `src/components/lobby/Lobby.tsx`

## Отчёт

Создай `codex-reports/099-dropdown-close-and-exit-stable.md`.
