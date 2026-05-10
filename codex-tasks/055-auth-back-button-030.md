# TASK-055: Auth modal — кнопка «Назад» фон 0.30

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение (~строка 1322)

В функции `btnStyle` в `AuthDropdown` изменить одно значение:

```ts
background: primary ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.75)',
```

→

```ts
background: primary ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.30)',
```

Больше ничего не трогать.

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- В diff только одна строка: secondary `0.75` → `0.30`

## Отчёт

`codex-reports/055-auth-back-button-030.md`
