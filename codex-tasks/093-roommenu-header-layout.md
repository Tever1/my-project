# TASK-093 — RoomMenu header layout: stable title + repositioned buttons

## Context

Три визуальных бага в заголовке `RoomMenu` (around line 2073–2221):

1. **× в неправильном месте** — кнопка закрытия находится в обычном flex-потоке
   рядом с «Выйти», а должна быть в верхнем правом углу панели (абсолютно).

2. **Заголовок скукоживается** при нажатии «Выйти» — confirmRow («Выйти? Да Отмена»)
   шире одной кнопки «Выйти», и `flex: 1` заголовка теряет пространство → текст
   «Комната · YX82R7» переносится.

3. **Панель меняет высоту** при появлении confirmRow — confirm-блок имеет другую
   высоту, что двигает весь layout вниз.

## Root Cause

Заголовок — один `<div display:flex>`: `[заголовок flex:1] [Выйти/confirm] [×]`.
Размер средней колонки непостоянен → заголовок и высота панели скачут.

## Fix

1. × вынести из flex-потока: `position: absolute; top: 12px; right: 12px`.
   Панель (GlassPanel style) получает `position: "relative"`.
   Header-div получает `paddingRight: 44` чтобы заголовок не заходил под ×.

2. Action-зона (Выйти / confirmRow) оборачивается в div с `flexShrink: 0;
   width: 164px; display: flex; justifyContent: flex-end; alignItems: center`.
   Фиксированная ширина = заголовок всегда имеет одинаковое пространство.

3. confirm-блок и кнопка «Выйти» рендерятся внутри этой фиксированной зоны —
   высота строки не меняется.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Current header structure (lines ~2073–2221):

```jsx
{/* wrapper */}
<div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>

  {/* title */}
  <div style={{ flex:1, minWidth:0 }}>
    <div>Комната · {roomCode}</div>
    <div>В комнате · {N}</div>
  </div>

  {/* Выйти OR confirmRow — непостоянная ширина */}
  {!confirmLeave ? (
    <button>Выйти</button>
  ) : (
    <div style={{ display:"flex", gap:6 }}>
      <span>Выйти?</span><button>Да</button><button>Отмена</button>
    </div>
  )}

  {/* × — в потоке */}
  <button onClick={handleClose}>✕</button>

</div>
```

## Fix — новая структура:

```jsx
{/* панель получает position: "relative" в style */}

{/* wrapper */}
<div style={{ display:"flex", alignItems:"center", gap:12, paddingRight: 44 }}>

  {/* × — absolute top-right */}
  <button
    type="button"
    onClick={handleClose}
    aria-label="Закрыть"
    style={{
      position: "absolute",
      top: 12,
      right: 12,
      flexShrink: 0,
      width: 28,
      height: 28,
      borderRadius: radius.full,
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "rgba(255,255,255,0.55)",
      fontSize: 16,
      lineHeight: 1,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "inherit",
      transition: "background 150ms ease, color 150ms ease",
      zIndex: 1,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(255,255,255,0.14)";
      e.currentTarget.style.color = "rgba(255,255,255,0.9)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(255,255,255,0.07)";
      e.currentTarget.style.color = "rgba(255,255,255,0.55)";
    }}
  >
    ✕
  </button>

  {/* title — flex:1, не уменьшается */}
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize:24, fontWeight:700, lineHeight:1.1, ... }}>
      Комната · {roomCode}
    </div>
    <div style={{ ... }}>В комнате · {N}</div>
  </div>

  {/* action-зона — фиксированная ширина */}
  <div style={{ flexShrink: 0, width: 164, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
    {!confirmLeave ? (
      <button onClick={() => setConfirmLeave(true)}>Выйти</button>
    ) : (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:12, color:"#fca5a5", fontWeight:600, whiteSpace:"nowrap" }}>Выйти?</span>
        <button onClick={onLeaveRoom}>Да</button>
        <button onClick={() => setConfirmLeave(false)}>Отмена</button>
      </div>
    )}
  </div>

</div>
```

### GlassPanel style — добавить `position: "relative"`:

```tsx
style={{
  position: "relative",   // ← добавить
  width: "100%",
  maxWidth: 460,
  minHeight: 480,
  ...glassMobileSolid(isMobile, "rgba(255,255,255,0.08)"),
  border: "1px solid rgba(255,255,255,0.12)",
  display: "flex",
  flexDirection: "column",
  gap: 26,
  willChange: isMobile ? undefined : "opacity, transform",
}}
```

---

## Важные детали

- Все существующие стили кнопок («Выйти», «Да», «Отмена», ×) сохранить без
  изменений — только переместить по структуре.
- `justifyContent: "space-between"` убрать из wrapper'а (он теперь не нужен —
  заменяется `flex:1` на заголовке и `flexShrink:0` на action-зоне).
- × убрать из конца flex-потока и вставить как `position: absolute` ДО заголовка
  в JSX (порядок в DOM не важен, он absolute).

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. × находится в `position: absolute; top: 12px; right: 12px` — не в flex-потоке.
2. Заголовок «Комната · CODE» не меняется при нажатии «Выйти».
3. Высота панели не меняется при нажатии «Выйти».
4. Action-зона имеет `width: 164px; flexShrink: 0`.
5. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/093-roommenu-header-layout.md`
