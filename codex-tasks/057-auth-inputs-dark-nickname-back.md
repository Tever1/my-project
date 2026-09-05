# TASK-057: Auth modal — тёмный мат для полей ввода + кнопка «Назад» в шаге никнейма

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение 1: inputStyle (~строка 1309)

Найти:

```ts
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'white',
  fontFamily: 'inherit',
  fontSize: 16,
  outline: 'none',
  boxSizing: 'border-box',
};
```

Заменить на:

```ts
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  background: 'rgba(0,0,0,0.32)',
  border: '1px solid rgba(255,255,255,0.22)',
  color: 'white',
  fontFamily: 'inherit',
  fontSize: 16,
  outline: 'none',
  boxSizing: 'border-box',
};
```

Это затронет все три поля ввода (телефон, код, никнейм) — они все используют `inputStyle`.

---

## Изменение 2: кнопка «Назад» в шаге nickname (~строка 1421)

Найти в блоке `{step === 'nickname' && (`:

```tsx
            <button style={btnStyle()} onClick={handleSetNickname} disabled={loading || nickname.trim().length < 2}>
              Готово
            </button>
          </div>
        )}
```

Заменить на:

```tsx
            <button style={btnStyle()} onClick={handleSetNickname} disabled={loading || nickname.trim().length < 2}>
              Готово
            </button>
            <button style={btnStyle(false)} onClick={() => { setStep('code'); setNickname(''); setError(''); }}>
              Назад
            </button>
          </div>
        )}
```

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- В diff: `inputStyle.background` изменён + добавлена кнопка «Назад» в nickname-шаге

## Не трогать

- Всё остальное кроме двух описанных мест

## Отчёт

`codex-reports/057-auth-inputs-dark-nickname-back.md`
