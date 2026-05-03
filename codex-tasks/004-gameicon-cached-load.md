# TASK-004: Fix GameIcon — cached image не показывается

> **Метаданные**
> - **Дата:** 2026-05-03
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Время:** ~3 минуты

---

## Цель

Если PNG для иконки уже в browser cache, `<img onLoad={...}>` срабатывает
синхронно ДО того как React навешивает listener → стейт `loaded` остаётся
`false` → `opacity: 0` навсегда → пользователь видит placeholder вместо
картинки.

Починить через ref-проверку `complete && naturalWidth > 0` в `useEffect`
сразу после mount.

---

## Воспроизведение

1. Положить валидный PNG в `public/icons/games/mafia.png`.
2. Открыть `/lobby-preview` — Mafia tile показывает SVG-placeholder с буквой "М".
3. DevTools: `<img>` элемент с `src="/icons/games/mafia.png"` имеет
   `naturalWidth: 1254`, но `opacity: 0`.

---

## Файлы к изменению (whitelist)

- `src/components/GameIcon.tsx` — единственный файл

### НЕ ТРОГАТЬ

- Никакие другие файлы.
- Не менять API компонента (props), не переименовывать.
- Не трогать SSR-defaults / SVG-placeholder логику.

---

## Шаги

В `src/components/GameIcon.tsx`:

### 1. Импорт `useRef`

В строке `import { useState } from "react";` добавить `useRef`:

```tsx
import { useRef, useState } from "react";
```

### 2. Ref на img + useEffect-проверка cache

В функции `GameIcon`, после объявления `useState`:

```tsx
const [loaded, setLoaded] = useState(false);
const [errored, setErrored] = useState(false);
const imgRef = useRef<HTMLImageElement>(null);

// Если картинка в browser cache — onLoad не сработает (срабатывает
// синхронно до навешивания listener'а). Проверяем complete вручную.
useEffect(() => {
  const img = imgRef.current;
  if (img && img.complete && img.naturalWidth > 0 && !errored) {
    setLoaded(true);
  }
}, [errored]);
```

И добавить импорт `useEffect`:

```tsx
import { useEffect, useRef, useState } from "react";
```

### 3. Привязать ref к `<img>`

В JSX найти `<img src={path} ...>` и добавить `ref={imgRef}`:

```tsx
<img
  ref={imgRef}
  src={path}
  alt={alt ?? ""}
  onLoad={() => setLoaded(true)}
  onError={() => setErrored(true)}
  ...
/>
```

---

## Acceptance criteria

- [ ] Импорт `import { useEffect, useRef, useState } from "react";`
- [ ] Объявлен `imgRef = useRef<HTMLImageElement>(null)`
- [ ] `useEffect` проверяет `complete && naturalWidth > 0`
- [ ] У `<img>` есть `ref={imgRef}`
- [ ] `git diff --stat` показывает только `src/components/GameIcon.tsx`
- [ ] `npm run lint` — 73 problems как было

---

## Ограничения

- Не удалять `onLoad` / `onError` — они нужны для случая когда картинка
  ещё НЕ в cache.
- `useEffect` deps оставить `[errored]` (если errored, не выставляем loaded).
- Build не запускать.

---

## Контрольные точки

1. `git diff src/components/GameIcon.tsx` — компактный diff (импорт + useRef +
   useEffect блок + ref на img).
2. Отчёт: `codex-reports/004-gameicon-cached-load.md`
3. Не коммитить.
