# TASK-100: Стабильная высота кнопок + мерцание dropdown на мобильном

## Файл для правки

`src/components/lobby/Lobby.tsx` — только этот файл.

---

## Правка 1: Одинаковая высота кнопок «Выйти» / «Да» / «Отмена»

### Проблема

Кнопка «Выйти» имеет `padding: "8px 14px"`, кнопки «Да» и «Отмена» — `padding: "6px 12px"`.
Разная высота → при переключении confirmLeave строка заголовка меняет высоту → панель прыгает.

### Что изменить

Найди кнопки «Да» и «Отмена» в блоке `confirmLeave === true`.
Измени их padding с `"6px 12px"` на `"8px 12px"` — выровнять по высоте с «Выйти».

Кнопка «Да»:
```js
padding: "8px 12px",   // было 6px 12px
```

Кнопка «Отмена»:
```js
padding: "8px 12px",   // было 6px 12px
```

---

## Правка 2: Отключить анимацию dropdown игрока на мобильном

### Проблема

`<motion.div key="player-action-menu">` имеет `initial={{ opacity:0, y:-4, scale:0.96 }}`
и `transition={{ duration: 0.13 }}`. На мобильном `backdropFilter: blur(16px)` +
Framer Motion анимация вызывают GPU-репейнт и мерцание.

### Что изменить

В `<motion.div key="player-action-menu">`:

Было:
```jsx
initial={{ opacity: 0, y: -4, scale: 0.96 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -4, scale: 0.96 }}
transition={{ duration: 0.13 }}
```

Стало:
```jsx
initial={isMobile ? false : { opacity: 0, y: -4, scale: 0.96 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={isMobile ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -4, scale: 0.96 }}
transition={isMobile ? { duration: 0 } : { duration: 0.13 }}
```

`isMobile` уже доступна в scope RoomMenu — использовать напрямую.

---

## Acceptance

1. Переключение «Выйти» ↔ «Да/Отмена» не меняет высоту строки и размер панели.
2. Dropdown меню игрока на мобильном появляется мгновенно, без мерцания.
3. На десктопе анимация dropdown работает как раньше (0.13s).

## Запрещено

- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/**, codex-reports/**
- Не трогать другие файлы кроме `src/components/lobby/Lobby.tsx`

## Отчёт

Создай `codex-reports/100-exit-height-stable-mobile-flicker.md`.
