# TASK-021: Enter для join + popup меню комнаты с QR

> **Сложность:** medium
> **Запуск:** auto by Claude

## Файлы (whitelist)

- `src/app/lobby-preview/page.tsx`

## Цели

### A. Enter в input при 6 chars → присоединиться

В input `data-lobby-cta="join-code-input"`, в существующем onKeyDown:
если `e.key === "Enter"` и `value.length === 6` → вызвать
`onJoinRoom()` (уже передаётся как prop). preventDefault.

### B. Popup-меню комнаты с QR

Когда `roomCode` установлен (хост создал комнату), `RoomButton` уже
показывает `КОМНАТА · 6L4S6Z`. Сейчас клик по нему ничего не делает
(второй раз). Сделать: клик → toggle popup `roomMenuOpen`.

**Popup-меню:**
- Позиционирование: занимает правую колонку hero (там где
  TiltedPreview). При открытии TiltedPreview скрывается, на её месте
  показывается popup.
- Стилизация: `<GlassPanel variant="floating">` или похожий glass-look
  (frosted glass — `background: rgba(255,255,255,0.08)`,
  `backdrop-filter: blur(24px)`, border `1px solid rgba(255,255,255,0.12)`,
  rounded radius.lg, padding 32).
- Содержимое:
  - **Заголовок** «Комната · {roomCode}», fontSize 24, fontWeight 700,
    с акцентом (gradient в цвет игры).
  - **Список игроков** — подзаголовок «В комнате · N», ниже список
    pills с nickname'ом каждого игрока (player.nickname). Хост
    помечен иконкой/пометкой «хост».
  - **QR код** внизу — использовать `react-qrcode-logo` (уже в deps).
    URL: `${window.location.origin}/lobby/${roomCode}`. Размер 180px.
    Под QR — мелкий текст «Покажи QR друзьям для быстрого подключения».
- Закрытие: клик повторно по RoomButton, или клавиша Escape, или клик
  вне popup'а.

**Состояние и подписка:**
- Подписаться на event `room:state` через `useSocket().on('room:state', ...)`.
  Сохранять в state `roomState: { players: Player[]; hostId: string } | null`.
- Player из server payload имеет: `id`, `nickname`, `isHost`,
  `isConnected`. Использовать только подключённых
  (`p.isConnected !== false`).

**Интеграция в layout:**
- В hero правой колонке добавить условный рендер: если
  `roomMenuOpen && roomCode`, показать `<RoomMenu>` вместо
  `<TiltedPreview>`.
- Компонент `<RoomMenu>` определить inline в этом же файле.
- AnimatePresence на toggle для плавного перехода
  (opacity + scale 0.95 → 1, duration 0.3s).

### C. ArrowDown / ArrowUp в меню

Не делать в этом таске — отдельная фича если понадобится.

## Acceptance

- [ ] `npm run build` ОК.
- [ ] В input с 6 chars Enter → toast или переход (uses existing
      onJoinRoom path).
- [ ] Клик на кнопку «КОМНАТА · ABC123» → открывается popup на
      месте TiltedPreview.
- [ ] Popup показывает заголовок, список игроков (с пометкой хоста),
      QR код.
- [ ] Клик повторно / Escape / клик вне → popup закрывается.

## Контрольные точки

1. `npm run build` ОК.
2. Заполнить отчёт.
3. Не коммитить.
