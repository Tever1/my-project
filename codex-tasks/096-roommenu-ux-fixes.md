# TASK-096: RoomMenu UX — три правки

## Файл для правки

`src/components/lobby/Lobby.tsx` — только этот файл.

---

## Правка 1: Новая структура заголовка RoomMenu

### Текущее состояние (~line 2073)

Заголовок: две колонки (flex row):
- Левая: «Комната · {roomCode}» (большой) + «В комнате · N» (маленький)
- Правая: minWidth 172, Выйти / confirm-row
- После правой: кнопка ✕

### Новая структура

Заголовочная зона — две строки:

**Строка 1 (полная ширина):**
```
Комната · {roomCode}
```
- Полная ширина (`width: "100%"`)
- fontSize: 22 (десктоп) / 20 (мобильный)
- fontWeight: 700, lineHeight: 1.1
- Тот же gradient-текст что сейчас (accent → white mix → deep)
- whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
- marginBottom: 10

**Строка 2 (flex row, space-between):**
- Слева: «В комнате · {connectedPlayers.length}» (тот же стиль: mono, uppercase, мутный)
- Справа: кнопки в ряд (gap: 8)
  - Если `!confirmLeave`: кнопка «Выйти» + кнопка ✕ (те же стили что сейчас)
  - Если `confirmLeave`: «Выйти?» + Да + Отмена + кнопка ✕

Кнопка ✕ всегда справа от всего, и в `confirmLeave` состоянии тоже.

Итого DOM-структура:
```
<div style={{ display:"flex", flexDirection:"column", gap: 0 }}>
  {/* Строка 1 */}
  <div style={{ width:"100%", ...gradientText, marginBottom:10 }}>
    Комната · {roomCode}
  </div>
  {/* Строка 2 */}
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
    <div style={{ ...monoStyle }}>В комнате · {connectedPlayers.length}</div>
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {/* Выйти / confirmRow */}
      {/* ✕ кнопка */}
    </div>
  </div>
</div>
```

---

## Правка 2: Закрытие RoomMenu ТОЛЬКО по кнопке ✕

### Текущее поведение — убрать:

1. **`onPointerDown` listener** (~line 318): весь блок `const onPointerDown = ...` + `window.addEventListener("pointerdown", onPointerDown)` + `removeEventListener` — удалить полностью.

2. **`Escape` key listener** (~line 314): блок `if (e.key === "Escape") { setRoomMenuOpen(false); }` — удалить (можно удалить весь `onKeyDown` listener если там только Escape).

3. **Mobile backdrop onClick** (~line 699): `<div onClick={() => setRoomMenuOpen(false)} ...>` — убрать `onClick` атрибут с этого элемента. Сам backdrop (затемнение) оставить, только убрать обработчик клика.

Все прочие `setRoomMenuOpen(false)` (kicked, not-found, logout, game-start) — **оставить**.

---

## Правка 3: Меню действий над игроком — floating overlay

### Текущее поведение (проблема)

Меню «Удалить / Передать хоста» рендерится ВНУТРИ flex-враппера игрового чипа:
```jsx
<div key={player.id} style={{ display:"flex", flexDirection:"column" }}>
  <button ...>{player.nickname}</button>
  <AnimatePresence>
    {isSelected && <motion.div style={{ marginTop:6, ... }}>...</motion.div>}
  </AnimatePresence>
</div>
```
Это растягивает контейнер игроков и смещает QR-код вниз.

### Новое поведение

Меню должно быть `position: "absolute"` поверх всего содержимого RoomMenu.

#### Шаг A: Добавить `position: "relative"` к контейнеру игроков

Найди `<div style={{ display:"flex", flexWrap:"wrap", gap:10, minHeight:70, alignContent:"flex-start" }}>`.
Добавь к нему `position: "relative"`.

#### Шаг B: Изменить рендер меню действий

Вместо рендера `<AnimatePresence>` внутри `<div key={player.id}>`,
рендери его СНАРУЖИ цикла map() — один раз, как overlay:

```jsx
{/* Player chips */}
<div style={{ display:"flex", flexWrap:"wrap", gap:10, minHeight:70, 
              alignContent:"flex-start", position:"relative" }}>
  {connectedPlayers.map((player) => {
    // ... рендер чипа без AnimatePresence внутри
  })}

  {/* Floating action menu — outside the map, inside the container */}
  <AnimatePresence>
    {selectedPlayerId && (() => {
      const player = connectedPlayers.find(p => p.id === selectedPlayerId);
      if (!player) return null;
      return (
        <motion.div
          key="player-action-menu"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.13 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(14, 14, 20, 0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 10,
          }}
        >
          {/* Имя игрока сверху */}
          <div style={{ 
            color: "rgba(255,255,255,0.55)", 
            fontSize: 12, 
            fontFamily: "var(--font-mono)",
            letterSpacing:"0.06em",
            textTransform:"uppercase",
            fontWeight:700,
            marginBottom: 4,
            paddingLeft: 4,
          }}>
            {player.nickname}
          </div>
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
      );
    })()}
  </AnimatePresence>
</div>
```

#### Шаг C: Убрать animate/exit/transition у чипа и inline AnimatePresence

Из `<div key={player.id}>` убрать `<AnimatePresence>` и вложенный `<motion.div>` с `isSelected && ...`.

---

## Acceptance

1. Заголовок «Комната · КОД» занимает полную ширину в одну строку.
2. «В комнате · N» и кнопки (Выйти, ✕) на одном уровне под заголовком.
3. Клик по затемнению (mobile) и клик вне панели (desktop) НЕ закрывают RoomMenu.
4. Escape НЕ закрывает RoomMenu.
5. Меню кика/передачи хоста появляется как glass-overlay поверх списка игроков,
   не растягивая панель.

## Запрещено

- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/**, codex-reports/**
- Не трогать другие файлы кроме `src/components/lobby/Lobby.tsx`

## Отчёт

Создай `codex-reports/096-roommenu-ux-fixes.md` с перечнем изменённых строк.
