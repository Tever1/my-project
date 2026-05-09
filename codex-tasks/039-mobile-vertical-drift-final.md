# TASK-039 — Окончательно убить вертикальный дрейф тайлов на мобайле

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблема

После TASK-035..038 у тайлов в мобильной версии всё ещё ощущается вертикальное
движение при горизонтальном свайпе. Анимации `y` уже выставлены в 0 на всех
состояниях; `touch-action: pan-x` стоит на страйпе и его потомках через CSS-класс.

Остаются три источника вертикального ощущения:

1. **iOS rubber-band overscroll** на горизонтальном страйпе.
   `overflowY: "visible"` на grid-контейнере + `WebkitOverflowScrolling: "touch"`
   позволяют iOS показывать вертикальный bounce при диагональном свайпе.
   Нужно `overflow-y: hidden` (внутри ограничено padding-ом/gap-ом, не клипает
   тайлы) и `overscroll-behavior: contain`.

2. **Body может скроллиться вертикально.** `<main>` имеет `overflow: hidden`,
   но на `body` нет — если контент превышает 100dvh, body скроллится, и при
   свайпе пальцем по тайлам страница уезжает вверх/вниз.

3. **Scale-spring overshoot.** `pressed` использует
   `transition: { type: "spring", stiffness: 700, damping: 22 }` — при касании
   spring может физически перерегулировать. На мобайле scale-фидбек должен
   быть прямым `tween`, без spring, без отскока.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — два места в `TileStrip` и `Tile`
- `src/app/globals.css` — расширить класс `.tile-strip-mobile`

**Не трогать никакие другие файлы.**

---

## Что сделать

### Правка 1 — `globals.css`: расширить класс страйпа

Найти в конце файла (около строки 691):

```css
.tile-strip-mobile,
.tile-strip-mobile * {
  touch-action: pan-x !important;
}
```

Заменить блок на:

```css
.tile-strip-mobile,
.tile-strip-mobile * {
  touch-action: pan-x !important;
}

.tile-strip-mobile {
  overscroll-behavior: contain;
}

/* Lock body scroll when mobile lobby is mounted. The body class is toggled
   from Lobby.tsx via useEffect. */
body.lobby-mobile-locked {
  overflow: hidden;
  position: fixed;
  inset: 0;
  width: 100%;
}
```

### Правка 2 — `Lobby.tsx`: переключать класс на body на мобайле

В компоненте `Lobby` найти место где определяется `isMobile` (около строки 183).
Добавить эффект **сразу после** существующих useEffect-ов в начале компонента
(но до return). Найти подходящую точку — например, рядом с другими useEffect-ами,
которые работают с `isMobile`.

Добавить:

```tsx
useEffect(() => {
  if (!isMobile) return;
  document.body.classList.add("lobby-mobile-locked");
  return () => {
    document.body.classList.remove("lobby-mobile-locked");
  };
}, [isMobile]);
```

### Правка 3 — `Lobby.tsx`: `overflowY: "hidden"` на страйпе

В компоненте `TileStrip` (около строки 2517–2533) найти inline-стиль grid-контейнера.

Было:
```tsx
overflowX: isMobile ? "auto" : undefined,
overflowY: isMobile ? "visible" : undefined,
```

Стало:
```tsx
overflowX: isMobile ? "auto" : undefined,
overflowY: isMobile ? "hidden" : undefined,
```

### Правка 4 — `Lobby.tsx`: убрать spring при pressed на мобайле

В компоненте `Tile` (около строки 2627) найти:

```tsx
transition={pressed ? { type: "spring", stiffness: 700, damping: 22 } : spring.soft}
```

Заменить на:

```tsx
transition={
  isMobile
    ? { duration: 0.12, ease: [0.32, 0.72, 0, 1] }
    : pressed
      ? { type: "spring", stiffness: 700, damping: 22 }
      : spring.soft
}
```

На мобайле — короткий tween без spring/overshoot. На десктопе всё как было.

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- На мобайле при горизонтальном свайпе по тайлам **никакого** ощущения
  вертикального движения: ни pаge-scroll, ни rubber-band, ни overshoot
  spring-а.
- На десктопе hover/y-анимация и spring при tap — как были.
- Класс `lobby-mobile-locked` добавляется на body при монте Lobby на мобайле
  и снимается при размонте (проверь через devtools, что после ухода со страницы
  `body` не остался с `position: fixed`).

---

## Не делать

- Не трогать `tileAnimate` (он уже корректный — y:0 на мобайле).
- Не трогать `onHoverStart`/`onHoverEnd` (они уже отключены на мобайле).
- Не трогать класс `.tile-strip-mobile *` с `touch-action: pan-x !important`.
- Не коммитить.

---

## Отчёт

Создать `codex-reports/039-mobile-vertical-drift-final.md`.
