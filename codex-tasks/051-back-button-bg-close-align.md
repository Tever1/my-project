# TASK-051: Кнопка назад — фон + выравнивание кнопки ✕

## Файлы

**Whitelist:** только
- `src/app/profile/page.tsx`
- `src/components/lobby/Lobby.tsx`

---

## Изменение 1: Фон кнопки «назад» в profile/page.tsx (~строка 36)

Текущий код:
```tsx
<button onClick={() => router.push('/')} className="text-white/50 hover:text-white transition-colors text-lg">
  ←
</button>
```

Заменить на (добавить фон и padding, убрать className, использовать style):
```tsx
<button
  onClick={() => router.push('/')}
  style={{
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 10,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 18,
    lineHeight: 1,
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'background 150ms ease, color 150ms ease',
    fontFamily: 'inherit',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
    e.currentTarget.style.color = 'rgba(255,255,255,1)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
    e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
  }}
>
  ←
</button>
```

---

## Изменение 2: Выравнивание ✕ по вертикали с «Выйти» в Lobby.tsx (~строка 2042)

Найти `div` с этими стилями (это верхняя строка RoomMenu):
```ts
style={{
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
}}
```

Изменить `alignItems: "flex-start"` → `alignItems: "center"`:
```ts
style={{
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
}}
```

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- Кнопка ← в profile/page.tsx стала заметной (полупрозрачный фон)
- Кнопка ✕ в меню комнаты вертикально выровнена с кнопкой «Выйти»

## Не трогать

- Всё остальное кроме двух описанных мест

## Отчёт

`codex-reports/051-back-button-bg-close-align.md`
