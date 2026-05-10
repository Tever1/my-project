# TASK-060: Auth back button — без круга, иконка x2

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение (~строка 1356)

Найти стиль маленькой кнопки «назад» в хедере `AuthDropdown`:

```tsx
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
```

Заменить на (без фона, без рамки, иконка вдвое крупнее — как кнопка ×):

```tsx
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 28, lineHeight: 1,
                  cursor: 'pointer',
                  padding: '0 4px 0 0',
                  fontFamily: 'inherit', flexShrink: 0,
                }}
```

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- Кнопка ‹ без фона и рамки, крупная, как стилистически соответствует кнопке ×

## Не трогать

- Кнопку × и всё остальное

## Отчёт

`codex-reports/060-auth-back-btn-no-circle.md`
