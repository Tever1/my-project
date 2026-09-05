# TASK-040 — Кнопка «Выйти из комнаты» в popup-меню комнаты

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Контекст

В popup-меню комнаты (`RoomMenu`) нет способа выйти из комнаты. Хост создал
комнату — и застрял в ней, пока не закроет вкладку. Нужно добавить кнопку
«Выйти из комнаты» внизу popup-а, под подписью «Покажи QR друзьям для быстрого
подключения».

Серверный обработчик `room:leave` уже существует
(`src/server/socket-handlers.mts:297`) и просто вызывает `handleDisconnect` —
помечает игрока disconnected и при необходимости переназначает host'а. Никаких
изменений на сервере не нужно.

Кнопка должна работать **и для хоста, и для гостя** одинаково: emit
`room:leave`, локально сбросить `roomCode`/`roomState`, закрыть popup.
Если страница — `/lobby/[roomId]` (`isRoomRoute = true`), то после leave
сделать `router.push("/")`. Если страница — `/` (`isRoomRoute = false`),
то остаёмся на `/`, просто очищаем стейт.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx`

**Не трогать никакие другие файлы.** Сервер не трогать.

---

## Что сделать

### Правка 1 — `handleLeaveRoom` в `Lobby`

Рядом с `handleKick` / `handleTransferHost` (около строк 420–428) добавить
новый callback:

```tsx
const handleLeaveRoom = useCallback(() => {
  if (!roomCode) return;
  emit('room:leave', {});
  setRoomMenuOpen(false);
  if (isRoomRoute) {
    router.push("/");
    return;
  }
  setRoomCode(null);
  setRoomState(null);
}, [emit, isRoomRoute, roomCode, router]);
```

(Логика отзеркаливает `room:kicked`-обработчик строки 266–275, минус toast.)

### Правка 2 — пробросить проп в `RoomMenu`

В JSX где рендерится `RoomMenu` (около строк 615–626) добавить проп
`onLeaveRoom={handleLeaveRoom}`.

В типе `RoomMenu` (около строк 1801–1808) добавить поле:

```ts
onLeaveRoom: () => void;
```

В деструктуризации параметров (строки 1809–1817) добавить `onLeaveRoom`.

### Правка 3 — кнопка в правом верхнем углу popup-а

В компоненте `RoomMenu` есть заголовочный блок с «Комната · CODE» и
«В комнате · N» (около строк 1863–1890). Сейчас это просто `<div>` без
flex-row — заголовок занимает всю ширину.

Нужно обернуть этот заголовочный блок в flex-row контейнер, чтобы кнопка
«Выйти» встала справа от номера комнаты, на одной линии с заголовком,
прижатая к правому краю popup-а.

**Было** (около строк 1863–1890):

```tsx
<div>
  <div style={{ fontSize: 24, fontWeight: 700, ... /* «Комната · CODE» */ }}>
    Комната · {roomCode}
  </div>
  <div style={{ /* «В комнате · N» */ }}>
    В комнате · {connectedPlayers.length}
  </div>
</div>
```

**Стало** — обернуть в flex-row, кнопку поставить как сиблинг внутреннего div-а:

```tsx
<div
  style={{
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  }}
>
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 24, fontWeight: 700, ... /* «Комната · CODE» */ }}>
      Комната · {roomCode}
    </div>
    <div style={{ /* «В комнате · N» */ }}>
      В комнате · {connectedPlayers.length}
    </div>
  </div>
  <button
    type="button"
    onClick={onLeaveRoom}
    aria-label="Выйти из комнаты"
    style={{
      flexShrink: 0,
      padding: "8px 14px",
      borderRadius: radius.full,
      background: "rgba(239, 68, 68, 0.12)",
      border: "1px solid rgba(239, 68, 68, 0.35)",
      color: "#fca5a5",
      fontSize: 12,
      fontWeight: 650,
      fontFamily: "inherit",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
      e.currentTarget.style.color = "#fee2e2";
      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.6)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
      e.currentTarget.style.color = "#fca5a5";
      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
    }}
  >
    Выйти
  </button>
</div>
```

**Важно:**
- Внутренние стили заголовков (fontSize, gradient, marginBottom и т.д.)
  **сохранить как есть** — менять только обёртку и добавить кнопку.
- `flex: 1, minWidth: 0` на левой колонке нужен, чтобы длинный gradient-текст
  не выталкивал кнопку.
- Текст на кнопке — **«Выйти»** (короткий, чтобы не занимать много места
  в углу).
- Цвет — приглушённый красный, hover чуть ярче.

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- В popup-меню комнаты в правом верхнем углу, на одной линии с заголовком
  «Комната · CODE», появилась небольшая красная кнопка «Выйти».
- Клик на кнопку:
  - emit `room:leave`,
  - закрывает popup,
  - на `/lobby/[roomId]` — навигирует на `/`,
  - на `/` — просто сбрасывает `roomCode`/`roomState` (комната пропадает,
    остаётся стартовый экран).
- Хост и гость — оба могут выйти. Если хост вышел — сервер сам переназначит
  host'а на оставшегося игрока (это уже работает).
- На любом размере экрана кнопка остаётся в углу, не наезжает на gradient-заголовок.

---

## Не делать

- Не трогать сервер.
- Не добавлять confirm-диалог («вы уверены?»).
- Не добавлять отдельный `RoomMenuActionButton` — кнопка визуально другая
  (большая, центрированная, danger-цвет).
- Не коммитить.

---

## Отчёт

Создать `codex-reports/040-leave-room-button.md`.
