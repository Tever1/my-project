# TASK-374: Мобильный экран `/join/[code]` — кнопка «Вернуться в лобби» после «+ Добавить игрока»

## Контекст

Файл `src/app/join/[code]/page.tsx` — мобильный экран игрока в лобби комнаты
(до старта игры). Кнопка «+ Добавить игрока» (строка ~561-578) вызывает
`handleAddPlayer` (строка ~207-210):

```tsx
const handleAddPlayer = useCallback(() => {
  if (!code) return;
  emit("room:show-qr", { code });
}, [code, emit]);
```

Это событие `room:show-qr` — на TV (`src/app/tv/[roomId]/[gameType]/page.tsx`,
строка ~460) слушается как ПЕРЕКЛЮЧАТЕЛЬ (toggle):

```tsx
const unsubscribe = on('room:show-qr', () => {
  setShowQrOverlay((visible) => !visible);
});
```

То есть каждый раз, когда КТО-ТО эмитит `room:show-qr`, TV включает/выключает
полноэкранный QR-код для добавления нового игрока. Сейчас, после того как
игрок нажал «+ Добавить игрока» на своём телефоне, на его экране НИЧЕГО не
меняется — если он хочет закрыть QR на телевизоре, ему нужно физически подойти
к TV и найти там кнопку «Отмена» (в отдельном другом сценарии — предгейм
Lobby.tsx). У этой конкретной страницы (`/join/[code]`, реальный мобильный
join-экран игрока) такой возможности нет вовсе.

## Что сделать

1. Добавить локальное состояние `const [qrShown, setQrShown] = useState(false);`
   рядом с остальными `useState` в компоненте.

2. В `handleAddPlayer` после `emit(...)` установить `setQrShown(true)`:

```tsx
const handleAddPlayer = useCallback(() => {
  if (!code) return;
  emit("room:show-qr", { code });
  setQrShown(true);
}, [code, emit]);
```

3. Добавить новый обработчик, использующий тот же toggle-эффект, чтобы вернуть
   TV обратно в обычный вид (второй emit того же события переключает
   `showQrOverlay` на TV обратно в `false`):

```tsx
const handleCloseAddPlayerQr = useCallback(() => {
  if (!code) return;
  emit("room:show-qr", { code });
  setQrShown(false);
}, [code, emit]);
```

4. Заменить рендер кнопки «+ Добавить игрока» (строки ~561-578) на условный —
   пока `qrShown === false`, показывать текущую кнопку «+ Добавить игрока»
   (без изменений стиля/поведения); когда `qrShown === true`, на ЕЁ МЕСТЕ
   показывать кнопку «Вернуться в лобби» с тем же стилем (тот же набор
   inline-стилей — просто другой `onClick` и текст), вызывающую
   `handleCloseAddPlayerQr`:

```tsx
{qrShown ? (
  <button
    type="button"
    onClick={handleCloseAddPlayerQr}
    style={{
      width: "100%",
      padding: "14px 20px",
      borderRadius: 14,
      background: "transparent",
      color: "rgba(255,255,255,0.86)",
      fontWeight: 800,
      fontSize: 16,
      border: "1.5px solid rgba(255,255,255,0.22)",
      cursor: "pointer",
      fontFamily: "inherit",
    }}
  >
    {t.backToLobby[locale]}
  </button>
) : (
  <button
    type="button"
    onClick={handleAddPlayer}
    style={{ /* существующие стили без изменений */ }}
  >
    {t.addPlayer[locale]}
  </button>
)}
```

5. Добавить новую строку перевода в объект `t` (строка ~26-46, рядом с
   `addPlayer`):

```tsx
backToLobby: { ru: "Вернуться в лобби", en: "Back to lobby" },
```

## Whitelist файлов

- `src/app/join/[code]/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

Не трогать `src/app/tv/[roomId]/[gameType]/page.tsx`, `src/components/lobby/Lobby.tsx`,
`server.mts` / `src/server/socket-handlers.mts` — существующий toggle-механизм
`room:show-qr` на сервере/TV уже готов и не требует изменений, эта задача
только добавляет UI-обвязку на мобильной странице `/join/[code]`.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- До клика — кнопка «+ Добавить игрока» видна и работает как раньше.
- После клика — на её месте появляется «Вернуться в лобби» (тот же визуальный
  стиль/позиция).
- Клик на «Вернуться в лобби» — эмитит `room:show-qr` повторно (закрывая QR
  на TV за счёт существующей toggle-логики) и возвращает кнопку обратно к
  «+ Добавить игрока».
- Остальной экран (`Выйти`, старт игры, статусы) не затронут.

## Отчёт

Записать в `codex-reports/374-join-page-add-player-return-to-lobby-button.md`:
что изменено, diff по строкам, результат tsc/lint.
