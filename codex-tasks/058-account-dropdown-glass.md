# TASK-058: AccountDropdown — frosted glass фон как у RoomMenu

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение (~строка 1482)

Найти `panelStyle` в функции `AccountDropdown`:

```ts
const panelStyle: React.CSSProperties = {
  width: 220,
  background: 'rgba(18, 18, 28, 0.92)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: 8,
  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
};
```

Заменить на:

```ts
const panelStyle: React.CSSProperties = {
  width: 220,
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 8,
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
};
```

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- В diff только `panelStyle` в `AccountDropdown` — ровно 4 строки изменены

## Не трогать

- Всё кроме `panelStyle` в `AccountDropdown`
- `panelStyle` в `AuthDropdown` — не трогать (другая функция)

## Отчёт

`codex-reports/058-account-dropdown-glass.md`
