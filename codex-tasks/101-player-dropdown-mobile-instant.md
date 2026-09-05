# TASK-101: Dropdown игрока — мгновенное открытие на мобильном (убрать blur)

## Файл для правки

`src/components/lobby/Lobby.tsx` — только этот файл.

## Проблема

`<motion.div key="player-action-menu">` имеет `backdropFilter: "blur(16px)"`.
На iOS/Android первое появление элемента с blur вызывает задержку ~1 секунда
пока GPU создаёт blur-слой. Именно это пользователь видит как «открывается с задержкой».

## Что изменить

Найди `<motion.div key="player-action-menu">` и его `style={{ ... }}`.

Замени строки:
```js
background: "rgba(14, 14, 20, 0.92)",
backdropFilter: "blur(16px)",
WebkitBackdropFilter: "blur(16px)",
```

На:
```js
background: isMobile ? "rgba(10, 10, 16, 0.97)" : "rgba(14, 14, 20, 0.92)",
backdropFilter: isMobile ? undefined : "blur(16px)",
WebkitBackdropFilter: isMobile ? undefined : "blur(16px)",
```

На мобильном: непрозрачный тёмный фон без blur — появляется мгновенно.
На десктопе: blur остаётся.

`isMobile` доступна в scope RoomMenu.

## Acceptance

- На мобильном: dropdown открывается мгновенно при тапе.
- На десктопе: dropdown по-прежнему с blur(16px).

## Запрещено

- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/**, codex-reports/**
- Только `src/components/lobby/Lobby.tsx`

## Отчёт

Создай `codex-reports/101-player-dropdown-mobile-instant.md`.
