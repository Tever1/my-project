# TASK-012: Видимые focus-ring везде + рабочий press-effect на тайлах

> **Сложность:** simple
> **Запуск:** auto by Claude

## Проблемы

1. **Tile press-effect не виден.** Variants подход (`whileTap="tap"` →
   `tap: { scale: 0.95 }` в внутреннем motion.div) не срабатывает потому
   что `animate={isActive ? "active" : "rest"}` на parent перебивает
   tap-state почти моментально.
2. **«Начать партию» не показывает focus.** Когда после Enter на тайле
   фокус прыгает на эту кнопку, у неё **нет focus-стиля** — пользователь
   не видит куда ушёл фокус, кажется что рамка пропала.
3. **«Правила» — то же самое.**
4. **TopBar кнопки (NavButton) — то же.** Нет focus-стиля.

## Цель

- Tile: понятный визуальный «press» при mousedown/tap (scale ~0.94, виден).
- Все интерактивные кнопки навигации (start, rules, NavButton play/friends/history,
  RoomButton) — видимый focus-ring через React state + inline-стиль.

## Файлы

- `src/app/lobby-preview/page.tsx` — только.

## Шаги

### A. Tile press-effect (упрощение)

В `function Tile`:

1. Убрать `whileTap="tap"` с `motion.button` (parent).
2. Удалить `tap` из variants внутреннего motion.div (был `tap: { y: -1, scale: 0.95 }`).
3. На внутренний `motion.div` (тот что с aspectRatio: "1") добавить
   `whileTap={{ scale: 0.94 }}` напрямую — это применится поверх variants
   и даст явное сжатие. Использовать transition `spring.snappy` для
   быстрого возврата.

   Итого внутренний div:
   ```ts
   <motion.div
     variants={{
       rest: { y: 0, scale: 1 },
       hover: { y: -5, scale: 1.04 },
       active: { y: -3, scale: 1.02 },
     }}
     whileTap={{ scale: 0.94 }}
     transition={spring.soft}
     style={{ ... }}
   >
   ```

   Parent `motion.button` оставить с `whileHover="hover"`, `animate=...`,
   но **без** `whileTap` — он только мешает.

### B. Focus ring на «Начать партию» и «Правила»

В компоненте `HeroLeft` (или где определены эти две кнопки), добавить
для каждой кнопки локальный state `[focused, setFocused] = useState(false)`,
прокинуть `onFocus`/`onBlur` и стиль:

```ts
boxShadow: focused
  ? `0 0 0 3px ${accent}, ${baseShadow}` // явное кольцо в цвете игры
  : baseShadow,
```

где `baseShadow` это существующий box-shadow кнопки.

Сделать для:
- `<motion.button data-lobby-cta="start">` — accent color ring
- `<motion.button data-lobby-cta="rules">` — белое полупрозрачное кольцо
  `rgba(255,255,255,0.4)` (Правила вторичная кнопка)

### C. Focus ring на NavButton

В `function NavButton` (TopBar):

1. Добавить локальный state `focused`.
2. `onFocus`/`onBlur` обновляют его.
3. В стиле:
   ```ts
   boxShadow: focused ? `0 0 0 2px rgba(255,255,255,0.6)` : 'none',
   ```

### D. Focus ring на RoomButton

В `function RoomButton`:
- Добавить state `focused`.
- В стиле добавить `boxShadow` в зависимости от focused — соответствующий
  цвету: если roomCode установлен → accent ring, иначе белый.

## Acceptance criteria

- [ ] `npm run build` успешен.
- [ ] Mouse-клик на тайле → виден явный «press» (компрессия) на ~100ms.
- [ ] Tab/стрелки → focus ring виден на каждом интерактивном элементе:
  - тайлах (уже было)
  - «Начать партию» (новое)
  - «Правила» (новое)
  - NavButton (Играть/Друзья/История) (новое)
  - RoomButton (новое)
- [ ] После Enter на тайле — focus ring появляется на «Начать партию»
      (видно куда ушёл фокус).
- [ ] При click мышью focus-ring может не появляться (это OK — так работает
      :focus-visible heuristic браузера; но мы используем явный state, так
      что появится и на mouse-focus).

## Ограничения

- Никаких CSS-файлов. Только inline-стили + React state.
- Не трогать клавиатурный handler (он уже работает).
- Не менять размеры/цвета/расположение — только добавление focus-ring.

## Контрольные точки

1. `git diff --stat` — только `lobby-preview/page.tsx`.
2. `npm run build`.
3. Заполнить `codex-reports/012-fix-focus-rings-tile-press.md`.
4. Не коммитить.
