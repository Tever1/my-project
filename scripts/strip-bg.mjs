import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const FLOOD_LIGHT_THRESHOLD = 180;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const argDir = process.argv[2];
const iconsDir = argDir
  ? path.resolve(process.cwd(), argDir)
  : path.resolve(__dirname, '../public/icons/games');

function isTargetPng(filename) {
  return filename.toLowerCase().endsWith('.png') && !filename.toLowerCase().endsWith('.bak.png');
}

function floodFillFromCorners(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  let stripped = 0;

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue.push(x, y);
  };

  enqueue(0, 0);
  enqueue(width - 1, 0);
  enqueue(0, height - 1);
  enqueue(width - 1, height - 1);

  while (queue.length > 0) {
    const x = queue.shift();
    const y = queue.shift();
    const offset = (y * width + x) * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    const min = Math.min(r, g, b);

    const isTransparent = a === 0;
    const isLight = min >= FLOOD_LIGHT_THRESHOLD;

    if (!isTransparent && !isLight) continue;

    if (!isTransparent && isLight) {
      data[offset + 3] = 0;
      stripped += 1;
    }

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return stripped;
}

async function processIcon(filename) {
  const file = path.join(iconsDir, filename);
  const input = await readFile(file);
  const metadata = await sharp(input).metadata();
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const haloStripped = floodFillFromCorners(data, info.width, info.height);
  const output = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  await writeFile(file, output);

  const sourceSpace = metadata.channels === 4 ? 'RGBA' : 'RGB';
  console.log(`${filename}: ${info.width}x${info.height} ${sourceSpace} -> RGBA, ${haloStripped} pixels stripped`);
}

const entries = await readdir(iconsDir);
const pngFiles = entries.filter(isTargetPng).sort((a, b) => a.localeCompare(b));

for (const filename of pngFiles) {
  await processIcon(filename);
}

console.log(`Done. ${pngFiles.length} files processed.`);
