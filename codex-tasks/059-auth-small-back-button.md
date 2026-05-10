# TASK-059: Auth modal — маленькая круглая кнопка «назад» в хедере

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение 1: Хедер модала (~строка 1346)

Заменить хедер-строку целиком:

```tsx
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
            {step === 'phone' && 'Вход'}
            {step === 'code' && 'Введите код'}
            {step === 'nickname' && 'Как вас зовут?'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
```

На:

```tsx
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(step === 'code' || step === 'nickname') && (
              <button
                onClick={() => {
                  if (step === 'code') { setStep('phone'); setCode(''); setError(''); }
                  if (step === 'nickname') { setStep('code'); setNickname(''); setError(''); }
                }}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.20)',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 14, lineHeight: 1,
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                ‹
              </button>
            )}
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
              {step === 'phone' && 'Вход'}
              {step === 'code' && 'Введите код'}
              {step === 'nickname' && 'Как вас зовут?'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
```

---

## Изменение 2: Удалить большую кнопку «Назад» из шага code (~строка 1399)

Найти в блоке `{step === 'code' && (` и удалить:

```tsx
            <button style={btnStyle(false)} onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
              Назад
            </button>
```

---

## Изменение 3: Удалить большую кнопку «Назад» из шага nickname (~строка 1424)

Найти в блоке `{step === 'nickname' && (` и удалить:

```tsx
            <button style={btnStyle(false)} onClick={() => { setStep('code'); setNickname(''); setError(''); }}>
              Назад
            </button>
```

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- В шагах code и nickname в левом верхнем углу хедера — маленькая круглая кнопка ‹
- Большие кнопки «Назад» внизу удалены из обоих шагов
- В шаге phone маленькая кнопка не показывается

## Не трогать

- Кнопку × (закрыть) — не трогать
- Всё остальное кроме трёх описанных мест

## Отчёт

`codex-reports/059-auth-small-back-button.md`
