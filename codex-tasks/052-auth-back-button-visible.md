# TASK-052: Auth modal — кнопка «Назад» более заметная

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Проблема

Кнопка «Назад» в шаге ввода кода (`step === 'code'`) использует `btnStyle(false)`:
- `background: 'transparent'`
- `border: '1px solid rgba(255,255,255,0.15)'`
- `color: 'rgba(255,255,255,0.5)'`

На полупрозрачной стеклянной панели кнопка почти невидима.

## Изменение (~строка 1322)

Найти функцию `btnStyle` в `AuthDropdown`:

```ts
const btnStyle = (primary = true): React.CSSProperties => ({
  width: '100%',
  padding: '12px 20px',
  borderRadius: 12,
  background: primary ? 'rgba(255,255,255,0.9)' : 'transparent',
  border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
  color: primary ? '#06060c' : 'rgba(255,255,255,0.5)',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 600,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.6 : 1,
  letterSpacing: '-0.01em',
});
```

Заменить secondary-значения (только строки с тернарным `false`-ветвлением):

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

**Что изменилось:**
- `transparent` → `rgba(255,255,255,0.12)` — полупрозрачный фон, кнопка различима
- `rgba(255,255,255,0.15)` → `rgba(255,255,255,0.25)` — чуть более заметная рамка
- `rgba(255,255,255,0.5)` → `rgba(255,255,255,0.75)` — текст лучше читается

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- Кнопка «Назад» в auth modal видна как отдельная кнопка с фоном

## Не трогать

- Стиль primary-кнопки (`btnStyle()` / `btnStyle(true)`) — не менять
- Всё остальное кроме трёх строк в `btnStyle`

## Отчёт

`codex-reports/052-auth-back-button-visible.md`
