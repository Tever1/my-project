# TASK-264 — Крокодил: иконка из референса (line-art JPG → бежевая маска)

## Контекст

Нарисованная SVG-морда крокодила плохая. Юзер дал референс — чистый чёрный
line-art крокодила анфас на белом фоне: `public/icons/crocodile/croc-source.jpg`.

Нужно: срезать белый фон → альфа-маска по тёмным линиям → рендерить `croc` как
**CSS-маску, затинтованную бежевым** `#f5efe6` (как остальные line-иконки,
через `currentColor`). Растровый референс монохромный, поэтому тинт в один цвет
сохранит вид line-art.

**НЕ удалять и НЕ перезаписывать** существующие PNG (`croc.png` — старый маскот
и т.д.). Новый файл — `croc-face.png`.

## Whitelist файлов

- `scripts/icon-mask.mjs` — **создать** (jpg line-art → tinted-alpha PNG)
- `public/icons/crocodile/croc-face.png` — **создаётся запуском скрипта** (разрешено)
- `src/components/games/CrocIcon.tsx` — `croc` рендерить как CSS-маску
- `codex-reports/264-croc-face-mask-icon.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** `croc-source.jpg` и прочие `public/icons/**` файлы (кроме создания
`croc-face.png`), `design-tokens/page.tsx`, TV-файл напрямую, другие игры,
`package.json`, server.mts.

---

## Шаг 1 — `scripts/icon-mask.mjs`

Конвертирует `croc-source.jpg` (чёрные линии на белом) в `croc-face.png`:
альфа = «темнота» пикселя (чёрное → непрозрачное, белое → прозрачное), с
порогом против JPEG-шума; обрезка по bbox непрозрачных пикселей; центрирование
в квадрат 256×256 с паддингом. RGB заливается бежевым (на случай прямого `<img>`),
но реально цвет задаёт CSS-маска.

```js
import sharp from 'sharp';

const SRC = 'public/icons/crocodile/croc-source.jpg';
const OUT = 'public/icons/crocodile/croc-face.png';
const SIZE = 256;
const PAD = 14;      // паддинг внутри финального квадрата
const NOISE = 28;    // порог серого, чтобы убрать JPEG-гало у линий
const GAIN = 1.35;   // усиление контраста альфы

const { data, info } = await sharp(SRC)
  .toColourspace('b-w')
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info; // channels === 1

const alpha = Buffer.alloc(width * height);
for (let i = 0; i < width * height; i++) {
  let a = (255 - data[i] - NOISE) * GAIN;
  a = a < 0 ? 0 : a > 255 ? 255 : a;
  alpha[i] = a;
}

// bbox непрозрачных пикселей
let minX = width, minY = height, maxX = 0, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (alpha[y * width + x] > 20) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const bw = maxX - minX + 1;
const bh = maxY - minY + 1;

// кроп в RGBA (бежевый RGB + наша альфа)
const cropped = Buffer.alloc(bw * bh * 4);
for (let y = 0; y < bh; y++) {
  for (let x = 0; x < bw; x++) {
    const a = alpha[(minY + y) * width + (minX + x)];
    const o = (y * bw + x) * 4;
    cropped[o] = 245;
    cropped[o + 1] = 239;
    cropped[o + 2] = 230;
    cropped[o + 3] = a;
  }
}

const inner = SIZE - PAD * 2;
const resized = await sharp(cropped, { raw: { width: bw, height: bh, channels: 4 } })
  .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: resized, gravity: 'center' }])
  .png()
  .toFile(OUT);

console.log('wrote', OUT, `(source ${width}x${height}, bbox ${bw}x${bh})`);
```

**Запустить:** `node scripts/icon-mask.mjs` — должен создать
`public/icons/crocodile/croc-face.png`.

---

## Шаг 2 — `src/components/games/CrocIcon.tsx`: `croc` через CSS-маску

`croc` больше НЕ inline-SVG. Рендерим `<span>` с CSS-маской, залитой
`currentColor` (бежевый по умолчанию). Остальные иконки (`mic/talk/trophy/crown/
check/medal`) — без изменений (inline-SVG).

Изменения:
1. Убрать `croc` из объекта `RENDERERS` и сузить его тип до
   `Record<Exclude<CrocIconName, 'croc'>, { viewBox: string; content: ReactNode }>`.
   (Юнион `CrocIconName` оставить с `croc`.)
2. В `CrocIcon` добавить ранний возврат для `croc`:

```tsx
export function CrocIcon({
  name,
  className = '',
  style,
}: {
  name: CrocIconName;
  className?: string;
  style?: CSSProperties;
}) {
  if (name === 'croc') {
    return (
      <span
        aria-hidden
        className={className}
        style={{
          display: 'inline-block',
          backgroundColor: 'currentColor',
          color: '#f5efe6',
          WebkitMaskImage: 'url(/icons/crocodile/croc-face.png)',
          maskImage: 'url(/icons/crocodile/croc-face.png)',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          ...style,
        }}
      />
    );
  }

  const { viewBox, content } = RENDERERS[name];
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      aria-hidden
      className={className}
      style={{ color: '#f5efe6', ...style }}
    >
      {content}
    </svg>
  );
}
```

> Сайзинг идёт через `className` (`h-7 w-7`, `h-9 w-9`, `h-24 w-24` и т.п.) — он
> применяется и к `<span>`. Маска `contain` центрирует морду в квадрате.
> Изменение автоматически применяется и к моб-, и к TV-Крокодилу (оба импортят
> общий `CrocIcon`).

---

## Acceptance

- `node scripts/icon-mask.mjs` отработал, `public/icons/crocodile/croc-face.png`
  создан (256×256, прозрачный фон).
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- `CrocIcon name="croc"` рендерит `<span>` с CSS-маской `croc-face.png`,
  залитой бежевым; остальные иконки не изменены.
- `croc-source.jpg`, `croc.png` и прочие PNG — на месте, не изменены/не удалены.
- `design-tokens`, TV-файл, `package.json` — не тронуты.
- НЕ коммитить. Отчёт → `codex-reports/264-croc-face-mask-icon.md`.
