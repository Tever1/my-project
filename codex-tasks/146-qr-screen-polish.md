# TASK-146: QR-экран — убрать кнопку старта, разделить URL

## Whitelist файлов
- `src/components/lobby/Lobby.tsx`

---

## Изменение 1 — убрать кнопку «НАЧАТЬ ИГРУ» с QR-экрана

На QR waiting screen (блок `if (myRole === "tv" && isWaitingForPlayers && roomCode)`)
найти и **полностью удалить** кнопку:

```tsx
<button
  type="button"
  onClick={handleEmitStartGame}
  style={{
    padding: "16px 32px",
    ...
  }}
>
  {startGameLabel}
</button>
```

Кнопка «← Назад к лобби» (onClick={handleCancelWaiting}) остаётся.

---

## Изменение 2 — разделить URL под QR-кодом на две строки

Сейчас:
```tsx
<div>
  <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, margin: "0 0 8px" }}>
    Отсканируй QR или открой на телефоне:
  </p>
  <p style={{ fontSize: 22, fontWeight: 800, ... }}>
    {joinUrl}
  </p>
</div>
```

`joinUrl` = `${siteUrl}/join/${roomCode}` (например `http://192.168.0.91:3000/join/ABCD12`).

Заменить на два отдельных блока:

```tsx
<div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
  <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, margin: 0 }}>
    Отсканируй QR или открой на телефоне:
  </p>
  {/* Строка 1 — базовый URL (без кода комнаты) */}
  <p style={{
    fontSize: 15,
    fontWeight: 600,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "var(--font-mono)",
    margin: 0,
    letterSpacing: "0.02em",
  }}>
    {siteUrl}/join
  </p>
  {/* Строка 2 — только код комнаты, крупно */}
  <p style={{
    fontSize: 36,
    fontWeight: 900,
    color: "white",
    fontFamily: "var(--font-mono)",
    margin: 0,
    letterSpacing: "0.18em",
  }}>
    {roomCode}
  </p>
</div>
```

`siteUrl` уже вычислен выше в этом же блоке (строка ~643):
```ts
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");
```

---

## Acceptance
1. На QR-экране нет кнопки «НАЧАТЬ ИГРУ» / «START GAME»
2. Под QR отображаются две строки: маленький базовый URL + крупный код комнаты
3. Кнопка «← Назад к лобби» (handleCancelWaiting) остаётся без изменений
4. `npm run lint` без новых ошибок

## Не трогать
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/`, `.codex/`
- Всё кроме блока QR waiting screen в `Lobby.tsx`
