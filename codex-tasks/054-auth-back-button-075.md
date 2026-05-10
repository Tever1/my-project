# TASK-054: Auth modal — кнопка «Назад» фон 0.75

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение (~строка 1322)

В функции `btnStyle` в `AuthDropdown` изменить одно значение:

```ts
background: primary ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.20)',
```

→

```ts
background: primary ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.75)',
```

Больше ничего не трогать.

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- В diff только одна строка: `0.20` → `0.75` в secondary-ветви `background`

## Отчёт

`codex-reports/054-auth-back-button-075.md`
