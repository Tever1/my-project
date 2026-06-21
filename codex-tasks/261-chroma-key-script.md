# TASK-261 — Скрипт chroma-key (убрать зелёный #00FF00 фон у иконок)

## Контекст
Иконки Крокодила перегенерированы на сплошном зелёном фоне (#00FF00, проверено:
углы = [0,255,0]), объекты — кремовые/металлик без зелёного. Нужен скрипт
chroma-key: убрать зелёный в альфу + despill (нейтрализация зелёной каймы).
Алгоритм провалидирован Claude (talk и crown выходят идеально).

## Whitelist (ТОЛЬКО это)
- `scripts/chroma-key.mjs` (создать)
- `package.json` (добавить npm-скрипт)

ЗАПРЕЩЕНО: всё остальное (strip-bg*.mjs не трогать; src/**; PNG не трогать —
их обработает запуск скрипта Claude'ом).

## Скрипт `scripts/chroma-key.mjs`
ESM, `sharp`. Аргументы: список PNG или директория (обработать все `*.png`).
Опц. флаги: `--low <N>` (по умолч. 40), `--high <N>` (по умолч. 120). In-place RGBA.
Запуск: `node scripts/chroma-key.mjs public/icons/crocodile`.

Алгоритм (точно как валидировано), на каждый файл:
```js
import sharp from 'sharp';
const LOW = 40, HIGH = 120; // или из флагов

const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, ch = info.channels; // ch=4

for (let p = 0; p < W * H; p++) {
  const i = p * ch;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const greenness = g - Math.max(r, b);       // высокий = зелёный фон
  let a;
  if (greenness <= LOW) a = 255;               // объект — непрозрачный
  else if (greenness >= HIGH) a = 0;           // фон — прозрачный
  else a = Math.round(255 * (1 - (greenness - LOW) / (HIGH - LOW))); // мягкая кромка
  data[i + 3] = a;
  // despill: зажать зелёный канал до max(r,b) — убирает зелёную кайму на краях,
  // на объекте (где g уже <= max(r,b)) ничего не меняет
  const cap = Math.max(r, b);
  if (g > cap) data[i + 1] = cap;
}

await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } }).png().toFile(file);
```
- Размеры НЕ менять. Лог: имя + % прозрачных пикселей.

## package.json
В `scripts`: `"chroma-key": "node scripts/chroma-key.mjs"`.

## Acceptance
- `node -c scripts/chroma-key.mjs` ок; `node scripts/chroma-key.mjs --help` или без
  аргументов не падает (подсказка). `npm run lint` ✅.
- Скрипт создан, npm-скрипт добавлен. PNG не трогать в рамках таска.
- Только 2 whitelisted файла.

## Отчёт
`codex-reports/261-chroma-key-script.md` (писать разрешено). Не коммитить.
