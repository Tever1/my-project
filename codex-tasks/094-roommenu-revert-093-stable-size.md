# TASK-094 — RoomMenu: revert TASK-093 + stable panel size

## Context

TASK-093 изменил структуру заголовка RoomMenu (× в absolute, action-зона fixed-width).
Визуально не устроило — откатываем полностью. Оставляем только одно изменение:
обёртка с `minWidth` вокруг зоны «Выйти/confirmRow», чтобы панель не меняла размер.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Step 1 — Restore original structure

Восстановить заголовок RoomMenu в точности до TASK-093:

### GlassPanel style — убрать `position: "relative"`:
```tsx
style={{
  // position: "relative" — убрать
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

### Header wrapper — вернуть оригинальный layout:
```jsx
<div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    // paddingRight: 44 — убрать
  }}
>
```

### × кнопка — вернуть в конец flex-потока (убрать position: absolute, убрать zIndex):
```jsx
<button
  type="button"
  onClick={handleClose}
  aria-label="Закрыть"
  style={{
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
```

---

## Step 2 — Wrap action zone with minWidth (единственное новое изменение)

Обернуть `{!confirmLeave ? ... : ...}` в div с `minWidth: 172` чтобы ширина
action-зоны не уменьшалась при переключении между «Выйти» и confirmRow.

```jsx
<div style={{ flexShrink: 0, minWidth: 172, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
  {!confirmLeave ? (
    <button ...>Выйти</button>
  ) : (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <span>Выйти?</span>
      <button>Да</button>
      <button>Отмена</button>
    </div>
  )}
</div>
```

Стили кнопок «Выйти», «Да», «Отмена» — без изменений.

---

## Итоговая структура заголовка:

```jsx
<div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
  {/* заголовок */}
  <div style={{ flex:1, minWidth:0 }}>
    <div>Комната · {roomCode}</div>
    <div>В комнате · N</div>
  </div>

  {/* action-зона — фиксированная ширина, кнопки в оригинальных стилях */}
  <div style={{ flexShrink:0, minWidth:172, display:"flex", justifyContent:"flex-end", alignItems:"center" }}>
    {!confirmLeave ? <button>Выйти</button> : <div>Выйти? Да Отмена</div>}
  </div>

  {/* × — в конце flex-потока, оригинальный стиль */}
  <button onClick={handleClose}>✕</button>
</div>
```

---

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. GlassPanel style НЕ содержит `position: "relative"`.
2. Header wrapper — оригинальный (`justifyContent: space-between`, без `paddingRight`).
3. × кнопка — в конце flex-потока, без `position: absolute`, стиль оригинальный.
4. Action-зона обёрнута в `div` с `minWidth: 172; flexShrink: 0`.
5. Стили кнопок «Выйти», «Да», «Отмена» — идентичны версии до TASK-093.
6. `npm run lint` + `npm run build` чистые.

## Report

`codex-reports/094-roommenu-revert-093-stable-size.md`
