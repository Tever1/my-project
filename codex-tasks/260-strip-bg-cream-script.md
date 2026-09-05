# TASK-260 — Скрипт удаления светлого фона у кремовых иконок (region-grow)

## Контекст
Иконки Крокодила (`public/icons/crocodile/*.png`) пришли без альфы, на near-white
фоне, а сам объект кремовый/светлый. Существующий `scripts/strip-bg.mjs` (порог по
яркости `min(R,G,B)≥180`) тут НЕ годится — он съест светлый объект. Нужен новый
скрипт: flood-fill (region grow) от 4 углов по БЛИЗОСТИ ЦВЕТА к фону + фезеринг
краёв. Алгоритм уже провалидирован Claude на 4 иконках — результат чистый.

## Whitelist (ТОЛЬКО это)
- `scripts/strip-bg-cream.mjs` (создать)
- `package.json` (добавить npm-скрипт)

ЗАПРЕЩЕНО: всё остальное (включая `scripts/strip-bg.mjs` — не трогать; src/**;
сами PNG не трогать — их обработает запуск скрипта).

## Скрипт `scripts/strip-bg-cream.mjs`
ESM, использует `sharp` (уже в зависимостях). Поведение:
- Аргументы: список путей к PNG ИЛИ путь к директории (тогда обработать все
  `*.png` внутри). Пример запуска: `node scripts/strip-bg-cream.mjs public/icons/crocodile`.
- Опц. флаг `--tol <N>` (по умолчанию 36) — цветовой допуск region grow.
- Для каждого файла: in-place перезапись (RGBA PNG).

Алгоритм (точно как валидировано):
```js
import sharp from 'sharp';
const TOL = 36; // или из --tol

// для одного файла:
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, ch = info.channels; // ch=4 после ensureAlpha
const idx = (x, y) => (y * W + x) * ch;

// seed = среднее по 4 углам
const corners = [[1,1],[W-2,1],[1,H-2],[W-2,H-2]];
let sr=0,sg=0,sb=0; for (const [x,y] of corners){ const i=idx(x,y); sr+=data[i]; sg+=data[i+1]; sb+=data[i+2]; }
sr/=4; sg/=4; sb/=4;

const dist2 = (r,g,b) => { const dr=r-sr,dg=g-sg,db=b-sb; return dr*dr+dg*dg+db*db; };
const T2 = TOL*TOL;

// region grow от углов (4-связность), визитим по похожести к seed
const visited = new Uint8Array(W*H);
const stack = [];
for (const [x,y] of corners){ const k=y*W+x; if(!visited[k]){ visited[k]=1; stack.push(x,y); } }
while (stack.length){
  const y = stack.pop(), x = stack.pop();
  const i = idx(x,y);
  if (dist2(data[i],data[i+1],data[i+2]) > T2) continue; // не фон — стоп
  data[i+3] = 0; // прозрачный
  for (const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
    if (nx<0||ny<0||nx>=W||ny>=H) continue;
    const k = ny*W+nx; if(!visited[k]){ visited[k]=1; stack.push(nx,ny); }
  }
}

// фезеринг: непрозрачные пиксели, соседствующие с прозрачными, получают
// частичную альфу, если близки к seed (мягкая кромка)
const copy = Uint8Array.from(data);
for (let y=1; y<H-1; y++) for (let x=1; x<W-1; x++){
  const i = idx(x,y); if (copy[i+3]===0) continue;
  let near=false;
  for (const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) if (copy[idx(nx,ny)+3]===0){ near=true; break; }
  if (near){ const d = Math.sqrt(dist2(copy[i],copy[i+1],copy[i+2])); if (d < TOL*1.6) data[i+3] = Math.min(255, Math.round(255*(d/(TOL*1.6)))); }
}

await sharp(Buffer.from(data), { raw:{ width:W, height:H, channels:4 } }).png().toFile(file);
console.log(`${file}: done`);
```
- Размеры НЕ менять (только альфа). Не ресайзить.
- Лог по каждому файлу: имя + % прозрачных пикселей (опционально).

## package.json
Добавить в `scripts`:
```json
"strip-bg-cream": "node scripts/strip-bg-cream.mjs"
```

## Acceptance
- `node scripts/strip-bg-cream.mjs --help` или без аргументов — не падает (можно
  вывести подсказку). `npm run lint` не обязателен для .mjs, но `node -c` синтаксис ок.
- Скрипт создан, npm-скрипт добавлен. PNG НЕ трогать в рамках таска (запустит Claude).
- Изменения только в 2 whitelisted файлах.

## Отчёт
`codex-reports/260-strip-bg-cream-script.md` (писать разрешено). Не коммитить.
