# TASK-214 — «ВЫЙТИ» на экране комнаты ведёт на /join, а не на /

## Контекст / баг (от пользователя)

На экране комнаты телефона (`src/app/join/[code]/page.tsx`) кнопка «Выйти»
(после подтверждения) уводит игрока на `/` (`router.push("/")`). На телефоне
`/` рендерит лобби-меню (топбар с кнопкой входа + иконка игры) — это не то.
Игрок должен попадать на `/join` — чистый экран ввода кода комнаты.

## Корень

`src/app/join/[code]/page.tsx`, `handleLeaveRoom` (около строк 168-172):
```ts
const handleLeaveRoom = useCallback(() => {
  emit("room:leave", {});
  setConfirmLeave(false);
  router.push("/");
}, [emit, router]);
```

## Что сделать

Файл: `src/app/join/[code]/page.tsx`. Менять ТОЛЬКО его.

В `handleLeaveRoom` заменить `router.push("/")` на `router.push("/join")`.
Больше ничего не трогать (emit room:leave и закрытие модалки оставить).

## Чего НЕ трогать

- Серверный код, `Lobby.tsx`, `/tv`, `/join/page.tsx` (целевая страница уже ок).
- Прочую логику join/reconnect/кнопок.

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/app/join/[code]/page.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика: «Выйти» → `room:leave` + переход на `/join` (экран ввода кода).

## Отчёт

`codex-reports/214-leave-redirect-to-join.md`. Не коммить.
