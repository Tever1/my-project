# TASK-269 — Шпион: адаптировать маску из референса + показать в превью

## Цель

1. Обобщить `scripts/icon-mask.mjs` — принимать аргументы `src out [size] [pad]`
   (с дефолтами на croc, чтобы `npm run icon-mask` работал как раньше).
2. Сгенерировать бежевую/тинтуемую альфа-маску из
   `public/icons/spy/mask-source.jpg` → `public/icons/spy/mask-face.png`.
3. В превью `/design-tokens` иконку `SpMask` рендерить как CSS-маску
   (`mask-face.png`, цвет через `currentColor`) вместо нарисованного SVG.

PNG-иконки Шпиона (старые) НЕ трогать. `mask-source.jpg` НЕ трогать.

## Whitelist файлов

- `scripts/icon-mask.mjs` — обобщить под argv
- `public/icons/spy/mask-face.png` — создаётся запуском скрипта (разрешено)
- `src/app/design-tokens/page.tsx` — только тело функции `SpMask`
- `codex-reports/269-spy-mask-adapt.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** другие `public/icons/**`, файлы Шпиона (`spy/page.tsx`, TV),
server.mts, package.json (npm-скрипт icon-mask уже есть и продолжит работать).

---

## Шаг 1 — `scripts/icon-mask.mjs` под argv

Сейчас `SRC`/`OUT`/`SIZE`/`PAD` захардкожены на croc. Сделать так, чтобы можно
было передать аргументы, сохранив дефолты:

```js
const [, , argSrc, argOut, argSize, argPad] = process.argv;
const SRC = argSrc || 'public/icons/crocodile/croc-source.jpg';
const OUT = argOut || 'public/icons/crocodile/croc-face.png';
const SIZE = argSize ? Number(argSize) : 256;
const PAD = argPad ? Number(argPad) : 14;
```

Остальной алгоритм (alpha из темноты, bbox-кроп, центр в квадрат) — без изменений.
`NOISE`/`GAIN` оставить как есть.

## Шаг 2 — запустить для маски

```
node scripts/icon-mask.mjs public/icons/spy/mask-source.jpg public/icons/spy/mask-face.png
```

Должен создать `public/icons/spy/mask-face.png` (256×256, прозрачный фон, силуэт
шпиона в альфе).

## Шаг 3 — превью `SpMask` через CSS-маску

В `src/app/design-tokens/page.tsx` заменить тело `SpMask` на span с CSS-маской
(цвет берётся из `currentColor` панели — бирюзовый на тёмной, кремовый на карточке):

```tsx
const SpMask: IconRenderer = (s = 28) => (
  <span
    aria-hidden
    style={{
      display: 'inline-block',
      width: s,
      height: s,
      backgroundColor: 'currentColor',
      WebkitMaskImage: 'url(/icons/spy/mask-face.png)',
      maskImage: 'url(/icons/spy/mask-face.png)',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
    }}
  />
);
```

---

## Acceptance

- `node scripts/icon-mask.mjs public/icons/spy/mask-source.jpg public/icons/spy/mask-face.png`
  отработал, файл создан.
- `npm run icon-mask` (без аргументов) всё ещё генерит croc-face (дефолты).
- `npx tsc --noEmit` / `npm run lint` — без новых ошибок.
- В превью `/design-tokens` иконка «Маска» = силуэт шпиона из референса,
  тинтуется цветом панели.
- Старые PNG Шпиона и `mask-source.jpg` не изменены.
- НЕ коммитить. Отчёт → `codex-reports/269-spy-mask-adapt.md`.
