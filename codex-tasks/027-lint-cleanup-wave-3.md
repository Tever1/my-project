# TASK-027: Lint cleanup Wave 3 — react-hooks/* (11 errors → 0)

> **Метаданные**
> - **Дата создания:** 2026-05-07
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~20 минут
> - **Зависит от тасков:** TASK-024 ✅, TASK-025 ✅, TASK-026 ✅

---

## Цель

Убрать все оставшиеся 11 ошибок ESLint (`react-hooks/set-state-in-effect`,
`react-hooks/refs`, `react-hooks/rules-of-hooks`, `react-hooks/immutability`)
так, чтобы `npm run lint` выдавал 0 problems, `npm run build` и
`npx tsc --noEmit` оставались чистыми.

---

## Контекст

После Волны 1 (TASK-024, 73→19) и Волны 2 (TASK-025, 19→11) остались 11
ошибок — все react-hooks/*. QA-прогон (TASK-026) прошёл чисто, сервер и
все 16 маршрутов в порядке. Теперь закрываем Wave 3.

Текущий `npm run lint` (11 errors, 0 warnings):
```
src/app/admin/page.tsx           131:21  set-state-in-effect
src/app/admin/page.tsx           979:21  set-state-in-effect
src/app/admin/page.tsx          1341:5   set-state-in-effect
src/app/game/[roomId]/mafia/page.tsx  1005:9  refs (×2)
src/app/game/[roomId]/quiz/page.tsx    424:9  immutability
src/app/tv/[roomId]/[gameType]/page.tsx 896:27  rules-of-hooks
src/lib/auth-context.tsx          54:9   set-state-in-effect
src/lib/i18n-provider.tsx         12:7   set-state-in-effect
src/lib/use-socket.ts             52:10  refs
src/lib/use-socket.ts             52:20  refs
```

---

## Файлы к изменению (whitelist)

Codex имеет право редактировать **только** эти файлы:

1. `src/lib/i18n-provider.tsx`
2. `src/lib/auth-context.tsx`
3. `src/lib/use-socket.ts`
4. `src/app/admin/page.tsx`
5. `src/app/game/[roomId]/mafia/page.tsx`
6. `src/app/game/[roomId]/quiz/page.tsx`
7. `src/app/tv/[roomId]/[gameType]/page.tsx`

---

## Задачи по файлам

### 1. `src/lib/i18n-provider.tsx:12` — set-state-in-effect

**Проблема:** `setLocaleState(saved)` вызывается синхронно в теле `useEffect`.

**Исправление:** обернуть setState-вызов в `queueMicrotask`:
```ts
useEffect(() => {
  const saved = localStorage.getItem('locale') as Locale;
  if (saved && (saved === 'ru' || saved === 'en')) {
    queueMicrotask(() => setLocaleState(saved));
  }
}, []);
```

**Риск:** низкий. Эффект запускается один раз при монте, задержка на один
микротаск не меняет UX (locale устанавливается до первого paint).

---

### 2. `src/lib/auth-context.tsx:54` — set-state-in-effect

**Проблема:** `setUser(JSON.parse(savedUser))` и `setIsLoading(false)`
вызываются синхронно в теле `useEffect`.

**Исправление:** обернуть все setState в единый `queueMicrotask`:
```ts
useEffect(() => {
  const savedUser = localStorage.getItem('party-hub-user');
  queueMicrotask(() => {
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }
    setIsLoading(false);
  });
}, []);
```

**Риск:** низкий. Инициализационный эффект, один раз при монте. Оба вызова
setState в одном queueMicrotask — они сбатчатся React'ом.

---

### 3. `src/app/admin/page.tsx:131,979,1341` — set-state-in-effect (×3)

Три разных `useEffect`, в каждом setState вызывается синхронно.

#### 3а. Строка ~131 (`setLightbox(null)` внутри keydown-хендлера)

Посмотри, что именно флагирует линтер вокруг строки 131. Если setState вызывается
внутри event listener (а не напрямую в теле эффекта) — это false positive правила.
В таком случае: добавить `// eslint-disable-next-line react-hooks/set-state-in-effect`
**строго над строкой с setState** внутри callback.

Если setState действительно синхронный в теле эффекта — обернуть в `queueMicrotask`.

#### 3б. Строка ~979 (autoRefresh effect)

По контексту:
```ts
useEffect(() => {
  if (!autoRefresh) return;
  const id = setInterval(fetchRooms, 5000);
  return () => clearInterval(id);
}, [autoRefresh, fetchRooms]);
```
setState здесь нет — это `fetchRooms`, который внутри может вызывать setState.
Линтер трекует цепочку. Смотри точную строку 979 в файле и оберни конкретный
setState в `queueMicrotask`, либо добавь `// eslint-disable-next-line` если
вызов внутри callback (не в теле эффекта).

#### 3в. Строка ~1341 (`setData(null)`, `setFilter('all')`)

```ts
useEffect(() => {
  if (!game) return;
  setLoading(true);
  setData(null);
  setFilter('all');
  fetch(...)
    .then(r => r.json())
    .then(d => { setData(d); setLoading(false); });
}, [game, refreshKey]);
```

Обернуть синхронные вызовы в queueMicrotask:
```ts
useEffect(() => {
  if (!game) return;
  queueMicrotask(() => {
    setLoading(true);
    setData(null);
    setFilter('all');
  });
  fetch(...)
    .then(r => r.json())
    .then(d => { setData(d); setLoading(false); });
}, [game, refreshKey]);
```

**Риск:** средний. admin-страница не задействована в QA игрового флоу, но
убедись что визуально ничего не сломалось (панели tabs, lightbox, rooms-list).

---

### 4. `src/lib/use-socket.ts:52` — refs during render (×2)

**Проблема:** `socketRef.current` читается в `return` — то есть во время рендера
хука.

**Строка 52:**
```ts
return { socket: socketRef.current, isConnected, emit, on, off };
```

**Исправление:** добавить `useState` для хранения socket-инстанса рядом с ref,
и возвращать state-значение вместо `ref.current`:

```ts
const socketRef = useRef<Socket | null>(null);
const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

// В useEffect где создаётся socket:
const socket = io(...);
socketRef.current = socket;
setSocketInstance(socket);

// В cleanup:
socketRef.current = null;
setSocketInstance(null);

// Return:
return { socket: socketInstance, isConnected, emit, on, off };
```

**ВНИМАНИЕ:** это изменение меняет поведение — `socket` теперь будет `null`
на первом рендере (до того как useEffect запустится). Все потребители уже
должны это обрабатывать (socket?.emit и т.п.), но проверь. Если везде уже
идёт `socket?.xxx` — всё ок.

**Альтернатива (если рискованно):** добавить eslint-disable только на строку 52:
```ts
// eslint-disable-next-line react-hooks/refs
return { socket: socketRef.current, isConnected, emit, on, off };
```

Выбор между вариантами — на усмотрение Codex, исходя из того как `socket`
используется в потребителях. Если потребители уже defensive (`socket?.emit`),
предпочесть полный фикс с useState. Если есть `socket!.emit` — лучше disable.

---

### 5. `src/app/game/[roomId]/mafia/page.tsx:1005` — refs during render (×2)

**Проблема:** два обращения к `.current` внутри JSX/render. Строка 1005 —
это `{(phaseRenderers[gs.phase] ?? renderLobby)()}`.

Посмотри внутри `phaseRenderers` и `renderLobby`: если там идёт
`someRef.current.something` прямо в JSX (а не в обработчике) — перенести
в `useCallback` или вычислить значение снаружи JSX, присвоить переменной,
и уже переменную использовать в JSX.

Если это `nicknameCacheRef.current[id]` внутри helper-функции, которая
вызывается в JSX — оберни helper в `useCallback` и вынеси из render-пути, или
используй `// eslint-disable-next-line react-hooks/refs` над строкой доступа.

**Риск:** средний. Mafia — сложная игра. Не меняй логику, только устрани
direct ref.current access из render-пути. QA после: убедись что mafia lobby
рендерится корректно.

---

### 6. `src/app/game/[roomId]/quiz/page.tsx:424` — immutability

**Проблема:** `count -= 1;` внутри `setInterval` callback. Линтер флагирует
модификацию переменной, захваченной из внешнего scope.

**Строка ~418-430:**
```ts
// Вероятно:
let count = N;
emit({ action: 'quiz:countdown', payload: { value: count } });

const interval = setInterval(() => {
  count -= 1;   // ← строка 424, flagged
  if (count <= 0) { ... }
}, 1000);
```

**Исправление:** заменить `let count` на `useRef`:
```ts
const countRef = useRef(N);

const interval = setInterval(() => {
  countRef.current -= 1;
  if (countRef.current <= 0) { ... }
}, 1000);
```

И обновить все остальные обращения к `count` в том же scope на `countRef.current`.

**Риск:** средний. Quiz countdown — игровая логика. Убедись что таймер
по-прежнему отображается корректно и `quiz:countdown` события отправляются.

---

### 7. `src/app/tv/[roomId]/[gameType]/page.tsx:896` — rules-of-hooks

**Проблема:** `useCallback` объявлен внутри условного блока (внутри функции
или блока, который выполняется не всегда). Это нарушение правил хуков.

**Строка 896:**
```ts
const initSpyCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;
  spyCanvasRef.current = canvas;
  ...
}, []);
```

Этот `useCallback` объявлен внутри spy-рендер-блока (вероятно, внутри
`if (gameType === 'spy')` или внутри функции `renderSpy`).

**Исправление:** вынести `initSpyCanvas` наверх компонента, на уровень
где объявлены все остальные хуки (безусловно):
```ts
// Вверху компонента, вместе с другими useCallback:
const initSpyCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;
  spyCanvasRef.current = canvas;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(2, 2);
  spyCanvasSizeRef.current = { w: rect.width, h: rect.height };
}, []);
```

Убедиться что `spyCanvasRef` и `spyCanvasSizeRef` тоже объявлены безусловно
вверху (скорее всего уже есть).

**Риск:** ВЫСОКИЙ. rules-of-hooks — реальный баг, а не стилистика.
Неправильная реструктуризация может сломать spy TV-режим. После исправления
обязательно запустить `npm run build` и проверить что build чистый.

---

## Acceptance criteria

1. `npm run lint` → **0 problems**
2. `npm run build` → **exit 0**, без новых ошибок
3. `npx tsc --noEmit` → **0 errors**

---

## Что НЕ делать

- Не трогать `mobile/`, `.agents/`, `server.mts`.
- Не менять игровую логику — только структуру хуков.
- Не вводить новые зависимости.
- Не добавлять глобальные eslint-disable-file директивы. Точечные
  `// eslint-disable-next-line` допустимы только там, где fix невозможен
  без изменения публичного API (например use-socket.ts если потребители не defensive).
- Не коммитить — только изменения файлов. Отчёт в `codex-reports/027-lint-cleanup-wave-3.md`.

---

## Отчёт

По завершении создать `codex-reports/027-lint-cleanup-wave-3.md` со списком:
- что поправлено в каждом файле (строки до/после)
- какие eslint-disable использованы и почему
- результат `npm run lint` (должно быть 0 problems)
- результат `npm run build`
