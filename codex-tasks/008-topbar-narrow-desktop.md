# TASK-008: TopBar polish для узкого десктопа (1025-1100px)

> **Метаданные**
> - **Дата создания:** 2026-05-03
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Ожидаемое время Codex:** ~5 минут
> - **Зависит от тасков:** —

---

## Цель

Сжать TopBar в `/lobby-preview` так, чтобы в диапазоне 1025-1100px все
элементы (BrandMark + 3 nav-кнопки + FriendsOnlinePill + RoomButton +
AvatarPill) выглядели свободно, а не «прижатыми».

После 1100px (стандартный широкий десктоп) — оставить текущие комфортные
размеры.

До 1024px — mobile layout уже скрывает nav и FriendsOnlinePill, его не
трогаем.

---

## Контекст

При breakpoint=1024 TopBar помещается в одну строку, но на 1025-1100px
элементы выглядят cramped. Глобальный padding `20px 32px` + gap 24 между
группами + по 16px padding внутри каждой pill + 3 nav-кнопки по 20px
горизонтального padding съедают слишком много места.

Live preview: http://localhost:3000/lobby-preview, ресайз окна на 1080px.

---

## Файлы к изменению (whitelist)

- `src/app/lobby-preview/page.tsx` — только TopBar и его подкомпоненты
  (`TopBar`, `NavButton`, `FriendsOnlinePill`, `RoomButton`, `AvatarPill`).

### НЕ ТРОГАТЬ

- Никакие другие секции (Hero, TiltedPreview, TileStrip).
- `BrandMark` — оставить как есть (38px логотип + текст уже компактен).
- Никакие глобальные токены / `tokens.ts`.
- Mobile-логику (`isMobile` ветки) — не трогать.

---

## Шаги реализации

В компоненте — добавить новый prop `isNarrowDesktop: boolean` (true когда
ширина 1025-1100px, false выше 1100px и ниже 1024px). На основе этого
prop'а заменить захардкоженные значения на «компактные» в узком диапазоне.

1. **В корне страницы** (где определяется `isMobile`) добавить аналогичный
   хук `useIsNarrowDesktop()`:
   - SSR-safe (initial=false)
   - matchMedia `(min-width: 1025px) and (max-width: 1100px)`
   - cleanup в useEffect

   Можно положить хук inline рядом с `useIsMobile`, или дублировать паттерн.
   **Не выносить в отдельный файл.**

2. **Передать `isNarrowDesktop` в TopBar**, и через TopBar — в `NavButton`,
   `FriendsOnlinePill`, `RoomButton`, `AvatarPill` (каждому опционально через
   prop или через global ranged-context — но проще через props).

3. **Сжатие значений в узком десктопе** (`isNarrowDesktop && !isMobile`):
   - `<header>` `padding: "20px 32px"` → `"20px 20px"`.
   - `<header>` `gap: 24` → `gap: 12`.
   - `<nav>` `gap: 4` → можно оставить `4`.
   - **`NavButton`** `padding: "10px 20px"` → `"10px 14px"`,
     `fontSize: 15` → `14`.
   - **`FriendsOnlinePill`** `padding: "8px 16px"` → `"8px 12px"`,
     `fontSize: 14` → `13`. Точку (зелёный кружок) оставить 8x8.
   - **`RoomButton`** `padding: "8px 18px"` → `"8px 14px"`,
     `fontSize: 14` (или `13` если roomCode установлен — оставить как было)
     → `13` для текста «Создать комнату» в обоих случаях.
   - **`AvatarPill`** `padding: "5px 16px 5px 5px"` → `"5px 12px 5px 5px"`,
     gap (между avatar и name) `10` → `8`. Размер аватара 32x32 не менять.
   - Внутренний gap у Right-группы `gap: 12` → `gap: 8`.

4. **Когда ширина > 1100** — все значения остаются как сейчас (текущие).
5. **Mobile (`isMobile=true`) — не трогать**, текущая логика сохраняется.

---

## Хук — пример реализации

Аналогично существующему `useIsMobile`. Можно так:

```ts
function useIsNarrowDesktop() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1025px) and (max-width: 1100px)');
    const update = () => setNarrow(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return narrow;
}
```

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npm run build` успешен.
- [ ] Resize окна до 1080px — TopBar выглядит свободнее, никакого
      переноса/обрезки.
- [ ] Resize окна до 1200px — выглядит как сейчас (без изменений).
- [ ] Resize окна до 800px — mobile layout без изменений.
- [ ] При плавном ресайзе из 1100→1101 нет «прыжка» — переход компактный.

---

## Ограничения и подводные камни

- **SSR-safe:** initial=false для хука, иначе при SSR будет mismatch.
- **Не вводить отдельный CSS-файл.** Стили остаются inline.
- **Не использовать глобальные CSS-классы** через `globals.css`.
- **Не выносить компоненты в отдельные файлы.** Всё в `lobby-preview/page.tsx`.
- **Не пересобирать визуальную идентичность** — только compress существующее.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — должен быть только `src/app/lobby-preview/page.tsx`.
2. `git diff src/app/lobby-preview/page.tsx` — посмотреть что добавлено.
3. `npm run lint` без новых ошибок.
4. `npm run build` (ожидаемо упадёт в sandbox на bind-port — указать в отчёте).
5. Заполнить `codex-reports/008-topbar-narrow-desktop.md`.
6. Не коммитить.

---

## Открытые вопросы для Codex

- Нижняя граница диапазона — `min-width: 1025px`. Это выше mobile breakpoint
  (1024). Между 1024 и 1025 нет gap'а? — **корректно, mobile = `<= 1024`,
  narrow desktop = `1025-1100`, wide desktop = `> 1100`. Дискретные 1px
  переходы — браузер обработает корректно.**
- Прокидывать `isNarrowDesktop` через props или сделать context? — **через
  props, без context. Это локальный prop одной страницы.**
- Можно ли использовать CSS clamp() вместо JS-хука? — **нет, оставляем
  JS-хук как в TASK-002 для `isMobile`. Единообразие.**
