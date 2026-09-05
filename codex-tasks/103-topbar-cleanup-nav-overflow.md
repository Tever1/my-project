# TASK-103 — TopBar: убрать Друзья/FriendsOnline, починить overflow кнопки

## Цель

Три точечных правки в `src/components/lobby/Lobby.tsx`:

1. Кнопка "Играть" в nav-bar визуально выходит за верхнюю границу верхней панели
   при hover (scale-анимация 1.02 без clip). Починить: добавить `overflow: clip`
   на `<nav>` элемент внутри TopBar.

2. Убрать кнопку "Друзья" из nav (NavButton с `topbarId="friends-nav"`).

3. Убрать `<FriendsOnlinePill ...>` из правой части TopBar (вместе с
   оборачивающим `{!isMobile && (...)}` условием).

4. Почистить keyboard-nav массив `order`: убрать `"friends-nav"` и
   `"friends-online"` из массива, чтобы стрелки по TopBar работали корректно.

## Файлы для изменения (whitelist)

- `src/components/lobby/Lobby.tsx` — единственный файл

## Точные места изменений

### Изменение 1 — `overflow: clip` на `<nav>`

Найти `<nav style={{ display: isMobile ? "none" : "flex", gap: 4 }}>` (около
строки 790) и добавить `overflow: "clip"` в style-объект:

```jsx
// БЫЛО:
<nav style={{ display: isMobile ? "none" : "flex", gap: 4 }}>

// СТАЛО:
<nav style={{ display: isMobile ? "none" : "flex", gap: 4, overflow: "clip" }}>
```

### Изменение 2 — убрать NavButton "Друзья"

Найти и удалить целиком:
```jsx
<NavButton topbarId="friends-nav" isNarrowDesktop={compact}>Друзья</NavButton>
```

### Изменение 3 — убрать FriendsOnlinePill

Найти и удалить целиком (вместе с условием `!isMobile`):
```jsx
{!isMobile && (
  <FriendsOnlinePill count={presenceCount} isNarrowDesktop={compact} topbarId="friends-online" />
)}
```

### Изменение 4 — keyboard-nav order array

Найти:
```js
const order = ["play", "friends-nav", "tv", "friends-online", "room", "avatar"];
```
Заменить на:
```js
const order = ["play", "tv", "room", "avatar"];
```

## Acceptance criteria

- `npm run lint` — 0 новых ошибок (существующие проблемы не трогать)
- `npx tsc --noEmit` — 0 новых ошибок
- Файл `src/components/lobby/Lobby.tsx` изменён, больше никаких файлов не трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**` — НЕ ТРОГАТЬ

## Отчёт

Создать `codex-reports/103-topbar-cleanup-nav-overflow.md` с кратким списком
что сделано и результатами lint/tsc.
