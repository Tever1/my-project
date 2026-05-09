# TASK-043 — Авто-открытие меню комнаты + кнопка-крестик закрытия

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Два изменения

### 1. Авто-открытие меню после создания комнаты

Сейчас после `room:create` устанавливается `setRoomCode(res.code)` и делается
`router.push(...)`, но меню не открывается — игрок должен кликнуть на кнопку
ещё раз. Нужно сразу открыть меню.

В функции `createRoom` (около строки 335–341) найти:

```tsx
const sent = emit('room:create', player, (response: unknown) => {
  clearTimeout(timeout);
  setIsCreatingRoom(false);
  const res = response as RoomCreateResponse;
  if (res.success && res.code) {
    setRoomCode(res.code);
    router.push(`/lobby/${res.code}`);
  } else {
```

Добавить `setRoomMenuOpen(true)` сразу после `setRoomCode(res.code)`:

```tsx
  if (res.success && res.code) {
    setRoomCode(res.code);
    setRoomMenuOpen(true);
    router.push(`/lobby/${res.code}`);
  } else {
```

### 2. Кнопка-крестик в заголовке `RoomMenu`

В `RoomMenu` (около строки 1898) добавить проп `onClose`:

```ts
onClose: () => void;
```

В деструктуризации параметров добавить `onClose`.

В заголовочном flex-row (который добавлен в TASK-040, строки ~1975–1985 — там
уже есть кнопка «Выйти» справа от заголовка):

Сейчас в flex-row есть:
```
[левая колонка: заголовок + подзаголовок] [кнопка «Выйти»]
```

Нужно добавить ещё один элемент после кнопки «Выйти» — компактный крестик:

```tsx
<button
  type="button"
  onClick={onClose}
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

В обоих местах где рендерится `RoomMenu` (десктоп ~строки 628–640 и мобайл
~строки 686–698) добавить проп `onClose={() => setRoomMenuOpen(false)}`.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — несколько мест

**Не трогать никакие другие файлы.**

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- После клика «Создать комнату» → меню комнаты открывается автоматически.
- В заголовке `RoomMenu` справа от кнопки «Выйти» есть компактный крестик
  (28×28px, glass-стиль).
- Клик на крестик закрывает меню.
- На десктопе и мобайле работает одинаково.

---

## Не делать

- Не трогать логику `router.push`.
- Не трогать backdrop-закрытие на мобайле (оно уже есть).
- Не коммитить.

---

## Отчёт

Создать `codex-reports/043-room-menu-auto-open-and-close.md`.
