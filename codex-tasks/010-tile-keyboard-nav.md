# TASK-010: Keyboard navigation для tile-strip в /lobby-preview

> **Метаданные**
> - **Дата:** 2026-05-03
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Время:** ~7 минут

---

## Цель

Добавить клавиатурную навигацию по нижнему tile-strip:
- **←/→** — переключают `activeGame` на соседний тайл (по порядку в массиве `games`).
- **Enter** — имитирует клик по «Начать партию» (вызывает `onStartGame()` или
  существующую CTA-функцию; если её нет — `console.log("start", activeGame)` как заглушка).
- **Escape** — снимает фокус с tile-strip (`document.activeElement.blur()` если он внутри tile-strip).
- **Tab/Shift+Tab** — стандартное поведение, не трогать.

Фокус-стиль:
- Активный тайл (тот что соответствует `activeGame`) уже визуально подсвечен через `isActive` prop.
- Дополнительно — добавить **видимый focus ring** на тайле при `:focus-visible`
  (не через `outline:none`-замену а через accent color border + box-shadow).
- Wrap-around: с последнего тайла → стрелка вправо → переход на первый. И наоборот.

---

## Файлы к изменению (whitelist)

- `src/app/lobby-preview/page.tsx` — только.

### НЕ ТРОГАТЬ

- Никакие другие файлы.
- Mobile-логику (`isMobile`) — keyboard nav актуален только на desktop, но не
  отключай его явно — на mobile клавы нет, code-path просто не сработает.

---

## Шаги реализации

1. В `DesignTokensPage` (или как там называется корневой компонент `/lobby-preview`)
   добавить `useEffect` на `keydown` с `window.addEventListener`:
   ```ts
   useEffect(() => {
     const onKey = (e: KeyboardEvent) => {
       // Игнорируем когда фокус в input/textarea/contenteditable
       const tag = (e.target as HTMLElement)?.tagName;
       const editable = (e.target as HTMLElement)?.isContentEditable;
       if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return;

       if (e.key === 'ArrowRight') {
         e.preventDefault();
         setActiveGame(prev => {
           const idx = games.findIndex(g => g.id === prev);
           const next = (idx + 1 + games.length) % games.length;
           return games[next].id;
         });
       } else if (e.key === 'ArrowLeft') {
         e.preventDefault();
         setActiveGame(prev => {
           const idx = games.findIndex(g => g.id === prev);
           const next = (idx - 1 + games.length) % games.length;
           return games[next].id;
         });
       } else if (e.key === 'Enter') {
         // Если фокус не на интерактивном элементе — триггерим главную CTA
         if (tag !== 'BUTTON' && tag !== 'A') {
           // Найди существующую функцию старта (handleStart, onStartGame и т.п.)
           // если её нет — console.log как заглушка
           console.log('keyboard: start game', activeGame);
         }
       } else if (e.key === 'Escape') {
         (document.activeElement as HTMLElement)?.blur?.();
       }
     };
     window.addEventListener('keydown', onKey);
     return () => window.removeEventListener('keydown', onKey);
   }, [activeGame /* + другие зависимости */]);
   ```
   - **Важно:** `e.preventDefault()` для стрелок чтобы не скроллить страницу.
   - В deps массиве — `[activeGame]` и любые функции которые читаются.

2. В компоненте `Tile` (motion.button) убедиться что есть нормальный
   focus-visible стиль. Достаточно добавить:
   ```ts
   onFocus={(e) => { /* можно ничего, но если хочется — обновлять activeGame на focused */ }}
   ```
   Опционально: при tab-навигации, если фокус приходит на тайл, **синхронизировать
   `activeGame` с фокусированным тайлом** — чтобы пользователь видел консистентный
   highlight. Реализуй через `onFocus={() => onSelect()}` — `onSelect`
   уже передаётся в `<Tile onClick={...} />`, можно прокинуть тот же handler как
   `onFocus`.

3. **Видимый focus ring через CSS-in-JS:** в стиле `<motion.button>` обёртки тайла
   (внутри `Tile`) добавить:
   ```ts
   outline: 'none', // убрать дефолтный
   // и добавить через :focus-visible через onFocus state — НЕ можем через style{}
   ```
   Либо использовать prop `whileFocus` в framer-motion (если поддерживается),
   либо использовать обычный `:focus-visible` в виде `<style jsx>` блока в начале
   компонента, либо просто прокинуть state `focused`.

   **Простейший вариант:**
   ```ts
   const [focused, setFocused] = useState(false);
   <motion.button
     onFocus={() => setFocused(true)}
     onBlur={() => setFocused(false)}
     style={{ outline: 'none' }}
   >
     <motion.div
       style={{
         ...,
         border: `1px solid ${(isActive || focused) ? accent : `${accent}40`}`,
         boxShadow: (isActive || focused)
           ? `0 12px 36px ${accent}55, 0 0 0 2px ${accent}80`
           : `0 10px 24px rgba(0,0,0,0.35), 0 0 0 1px ${accent}25`,
       }}
     />
   </motion.button>
   ```

4. Wrap-around обязателен. Без него на последнем тайле стрелка вправо ничего не делает.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npm run build` успешен.
- [ ] При фокусе на странице (любой элемент кроме input):
  - `→` переключает activeGame на следующий тайл (с wrap)
  - `←` на предыдущий (с wrap)
  - `Escape` снимает фокус
- [ ] При Tab фокус приходит на каждый тайл по очереди — focus ring виден.
- [ ] В input полях (если есть) стрелки работают как обычно (не перехватываем).
- [ ] Скролл страницы стрелками не происходит (preventDefault).

---

## Ограничения

- **Не использовать сторонние библиотеки** (react-aria и т.п.) — голый JS.
- **Не выносить хук в отдельный файл** — inline в page.tsx.
- **Не менять структуру массива `games`** — порядок остаётся как есть.
- **Не трогать существующие click handlers** на тайлах.

---

## Контрольные точки

1. `git diff --stat` — только `lobby-preview/page.tsx`.
2. `npm run lint`, `npm run build`.
3. Заполнить `codex-reports/010-tile-keyboard-nav.md`.
4. Не коммитить.
