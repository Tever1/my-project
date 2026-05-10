# TASK-053: Auth modal — кнопки чуть прозрачнее

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение (~строка 1322)

Найти функцию `btnStyle` в `AuthDropdown`:

```ts
const btnStyle = (primary = true): React.CSSProperties => ({
  width: '100%',
  padding: '12px 20px',
  borderRadius: 12,
  background: primary ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)',
  border: primary ? 'none' : '1px solid rgba(255,255,255,0.25)',
  color: primary ? '#06060c' : 'rgba(255,255,255,0.75)',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 600,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.6 : 1,
  letterSpacing: '-0.01em',
});
```

Заменить на:

```ts
const btnStyle = (primary = true): React.CSSProperties => ({
  width: '100%',
  padding: '12px 20px',
  borderRadius: 12,
  background: primary ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.20)',
  border: primary ? 'none' : '1px solid rgba(255,255,255,0.25)',
  color: primary ? '#06060c' : 'rgba(255,255,255,0.75)',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 600,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.6 : 1,
  letterSpacing: '-0.01em',
});
```

**Что изменилось:**
- «Войти» (primary): `rgba(255,255,255,0.9)` → `rgba(255,255,255,0.75)` — белая, но чуть прозрачнее. Тёмный текст `#06060c` не трогать.
- «Назад» (secondary): `rgba(255,255,255,0.12)` → `rgba(255,255,255,0.20)` — чуть заметнее.

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- «Войти» — белая с тёмным текстом, чуть прозрачнее чем была
- «Назад» — полупрозрачная, заметнее чем раньше

## Не трогать

- Цвет текста primary кнопки (`#06060c`) — не менять
- Всё кроме двух строк `background` в `btnStyle`

## Отчёт

`codex-reports/053-auth-buttons-glass.md`
