# TASK-038 — Убрать y-движение тайлов на мобайле + фикс мерцания заголовка

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблемы

### 1. Тайлы всё ещё дышат вверх-вниз на мобайле

Несмотря на отключённый hover, остаётся анимация `pressed` (`y: -2`) и
spring-обратка к `y: 0`, плюс `isActive` (`y: -3`). Хочется на мобайле гарантированно
никаких вертикальных движений тайлов — только `scale`.

### 2. Мерцание заголовка при переключении игр

При смене активной игры на миллисекунду виден заголовок предыдущей игры,
потом подгружается новый. Причина: в `HeroLeft` стоит `<AnimatePresence mode="wait">`
вокруг title/meta/desc — старый элемент полностью завершает exit-анимацию
(spring.soft, ~600мс) прежде чем появляется новый.

---

## Whitelist файлов

- `src/components/lobby/Lobby.tsx` — два места

**Не трогать никакие другие файлы.**

---

## Что сделать

### Правка 1 — `tileAnimate` на мобайле без `y`

В компоненте `Tile` найти (около строки 2595):

```tsx
const tileAnimate = pressed
  ? { y: -2, scale: 0.92 }
  : isActive
    ? { y: -3, scale: 1.02 }
    : hovered
      ? { y: -5, scale: 1.04 }
      : { y: 0, scale: 1 };
```

Заменить на:

```tsx
const tileAnimate = isMobile
  ? (pressed
      ? { y: 0, scale: 0.92 }
      : isActive
        ? { y: 0, scale: 1.02 }
        : { y: 0, scale: 1 })
  : (pressed
      ? { y: -2, scale: 0.92 }
      : isActive
        ? { y: -3, scale: 1.02 }
        : hovered
          ? { y: -5, scale: 1.04 }
          : { y: 0, scale: 1 });
```

На мобайле все состояния имеют `y: 0`. Hover-кейс убран (он и так выключен).

### Правка 2 — убрать `AnimatePresence mode="wait"` вокруг title/meta/desc

В `HeroLeft` (около строк 1497–1582) найти **три** блока `<AnimatePresence mode="wait">`:

1. Title (`motion.h1` с `key={game.id}`)
2. Meta pills (`motion.div` с `key={`meta-${game.id}`}`)
3. Description (`motion.p` с `key={`desc-${game.id}`}`)

Для каждого:
- Убрать обёртку `<AnimatePresence mode="wait"> ... </AnimatePresence>`.
- Оставить сам `motion.*` элемент с `key`, `initial`, `animate`, `transition`.
- **Убрать** проп `exit` (он не нужен без AnimatePresence).

При смене `key` React будет ремаунтить элемент, заново проигрывая `initial → animate`,
без задержки на exit предыдущего.

**Пример для title — было:**
```tsx
<AnimatePresence mode="wait">
  <motion.h1
    key={game.id}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={spring.soft}
    style={{...}}
  >
    ...
  </motion.h1>
</AnimatePresence>
```

**Стало:**
```tsx
<motion.h1
  key={game.id}
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={spring.soft}
  style={{...}}
>
  ...
</motion.h1>
```

Аналогично для meta и desc — убираем AnimatePresence-обёртку и проп `exit`.

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- На мобайле тайлы не двигаются по вертикали ни в каком состоянии (tap, активный, swipe).
- При переключении игр старый заголовок не виден — новый появляется сразу
  (с анимацией входа, но без задержки на старый).

---

## Не делать

- Не трогать `scale`-анимации на мобайле (они нужны для feedback).
- Не трогать TiltedPreview AnimatePresence (другая логика).
- Не трогать десктопную hover/y-анимацию тайлов.
- Не коммитить.

---

## Отчёт

Создать `codex-reports/038-tile-y-and-title-flash.md`.
