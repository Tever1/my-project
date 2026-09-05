# TASK-147: Чистка меню комнаты — убрать QR, пригласить, показать хоста

## Whitelist файлов
- `src/components/lobby/Lobby.tsx`

---

## Изменение 1 — убрать QR-код и кнопку «Пригласить игрока»

В компоненте `RoomMenu` найти и **полностью удалить** блок (примерно строки 2700–2770):

```tsx
<div style={{ marginTop: "auto", ... }}>
  {/* QR-блок */}
  <div style={{ width: 206, height: 206, ... }}>
    {joinUrl && <QRCode ... />}
  </div>
  <div>Покажи QR друзьям для быстрого подключения</div>
  {/* Кнопка Пригласить */}
  {isCurrentUserHost && inviteUrl && (
    <button ...>
      {inviteCopied ? "Ссылка скопирована ✓" : "Пригласить игрока"}
    </button>
  )}
</div>
```

Весь этот `<div style={{ marginTop: "auto", ... }}>` удалить целиком.

После удаления также убрать неиспользуемые переменные и состояния внутри `RoomMenu`:
- `const [inviteCopied, setInviteCopied] = useState(false)`
- `const inviteCopiedTimeoutRef = useRef<...>(null)`
- `const inviteUrl = ...`
- `const handleCopyInvite = useCallback(...)`
- `useEffect` с cleanup для `inviteCopiedTimeoutRef`
- `const [localIp, setLocalIp] = useState<string | null>(null)` — только если
  `joinUrl` и `origin` теперь нигде не используются в RoomMenu

Проверь: если `joinUrl` и `origin` и `localIp` больше нигде в `RoomMenu` не нужны
— удали их тоже. Если где-то используются — оставь.

---

## Изменение 2 — показывать хоста в списке игроков

Найти в `RoomMenu`:
```tsx
const connectedPlayers = (roomState?.players ?? []).filter(
  (p) => p.nickname && p.role !== "tv"
);
```

Изменить: убрать условие `p.role !== "tv"` — хост (tv-роль) тоже должен
отображаться в списке:
```tsx
const connectedPlayers = (roomState?.players ?? []).filter(
  (p) => p.nickname
);
```

Бейдж хоста (`isHost && <Badge variant="game" gameColor={accent}>хост</Badge>`)
уже есть — он автоматически покажется на хосте.

---

## Acceptance
1. В меню комнаты нет QR-кода и нет кнопки «Пригласить игрока»
2. Хост виден в списке игроков с бейджем «хост»
3. Кнопка «+ Добавить игрока» (для хоста) остаётся
4. `npm run lint` без новых ошибок

## Не трогать
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/`, `.codex/`
- Всё вне компонента `RoomMenu` в `Lobby.tsx`
