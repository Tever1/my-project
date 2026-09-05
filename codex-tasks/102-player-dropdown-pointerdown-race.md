# TASK-102: Фикс race condition — dropdown закрывается до onClick кнопок

## Файл для правки

`src/components/lobby/Lobby.tsx` — только этот файл.

## Причина бага

В `useEffect` (~line 2024) есть listener:
```js
window.addEventListener("pointerdown", onPointerDown)
```
Когда хост нажимает «Передать роль хоста» или «Удалить из комнаты»:
1. `pointerdown` срабатывает на кнопке
2. Window listener: target НЕ является `[data-player-chip]` → вызывает `setSelectedPlayerId(null)`
3. Dropdown размонтируется (на мобильном — мгновенно, duration:0)
4. `onClick` кнопки не успевает сработать → действие не выполняется

## Что изменить

### Шаг A: добавить атрибут на dropdown

Найди `<motion.div key="player-action-menu" ...>`.
Добавь к нему атрибут `data-player-action-menu=""`:
```jsx
<motion.div
  key="player-action-menu"
  data-player-action-menu=""
  ...
>
```

### Шаг B: обновить pointerdown listener

Найди `useEffect` с window pointerdown listener (~line 2024).
Добавь проверку — если клик внутри dropdown, не закрывать:

```js
useEffect(() => {
  if (!selectedPlayerId) return;
  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // Клик на сам чип — тогл обрабатывает сама кнопка
    if (target.closest('[data-player-chip]')) return;
    // Клик внутри dropdown (на кнопки действий) — не закрывать, дать onClick сработать
    if (target.closest('[data-player-action-menu]')) return;
    setSelectedPlayerId(null);
  };
  window.addEventListener("pointerdown", onPointerDown);
  return () => window.removeEventListener("pointerdown", onPointerDown);
}, [selectedPlayerId]);
```

### Шаг C: убрать onClick с motion.div overlay

Найди `<motion.div key="player-action-menu" onClick={() => setSelectedPlayerId(null)} ...>`.
Убери `onClick={() => setSelectedPlayerId(null)}` с этого motion.div — он теперь не нужен
(закрытие по клику вне dropdown уже обеспечено window listener'ом через Шаг B).

Если есть `<div onClick={(e) => e.stopPropagation()}>` внутри dropdown — тоже убрать
`onClick={(e) => e.stopPropagation()}` с него, он больше не нужен.

## Acceptance

1. «Передать роль хоста» и «Удалить из комнаты» работают и на десктопе, и на мобильном.
2. Клик вне dropdown (на фон панели, QR, список) — закрывает dropdown.
3. Клик на чип игрока — тогл (открыть/закрыть).

## Запрещено

- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/**, codex-reports/**
- Только `src/components/lobby/Lobby.tsx`

## Отчёт

Создай `codex-reports/102-player-dropdown-pointerdown-race.md`.
