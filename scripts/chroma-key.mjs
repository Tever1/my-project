import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DEFAULT_LOW = 40;
const DEFAULT_HIGH = 120;

const usage = `Usage:
  node scripts/chroma-key.mjs [--low N] [--high N] <file-or-directory> [...]

Options:
  --low N     Greenness threshold for opaque pixels (default: ${DEFAULT_LOW})
  --high N    Greenness threshold for transparent pixels (default: ${DEFAULT_HIGH})
  --help      Show this help

Examples:
  node scripts/chroma-key.mjs public/icons/crocodile
  node scripts/chroma-key.mjs --low 35 --high 110 public/icons/crocodile/talk.png
`;

function parseNumberFlag(name, value) {
  if (!value) {
    throw new Error(`Missing value for ${name}`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }

  return parsed;
}

function parseArgs(argv) {
  const paths = [];
  let low = DEFAULT_LOW;
  let high = DEFAULT_HIGH;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      return { help: true, paths, low, high };
    }

    if (arg === '--low') {
      low = parseNumberFlag('--low', argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--high') {
      high = parseNumberFlag('--high', argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    paths.push(arg);
  }

  if (high <= low) {
    throw new Error('--high must be greater than --low');
  }

  return { help: false, paths, low, high };
}

async function collectPngFiles(inputPaths) {
  const files = [];

  for (const inputPath of inputPaths) {
    const entryStat = await stat(inputPath);

    if (entryStat.isDirectory()) {
      const entries = await readdir(inputPath);
      const pngs = entries
        .filter((entry) => entry.toLowerCase().endsWith('.png'))
        .sort((a, b) => a.localeCompare(b))
        .map((entry) => path.join(inputPath, entry));

      files.push(...pngs);
      continue;
    }

    if (!inputPath.toLowerCase().endsWith('.png')) {
      throw new Error(`${inputPath} is not a PNG file`);
    }

    files.push(inputPath);
  }

  return files;
}

async function chromaKeyFile(file, low, high) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;
  const ch = info.channels;
  let transparent = 0;

  for (let p = 0; p < W * H; p += 1) {
    const i = p * ch;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const greenness = g - Math.max(r, b);
    let a;

    if (greenness <= low) {
      a = 255;
    } else if (greenness >= high) {
      a = 0;
    } else {
      a = Math.round(255 * (1 - (greenness - low) / (high - low)));
    }

    data[i + 3] = a;
    if (a === 0) {
      transparent += 1;
    }

    const cap = Math.max(r, b);
    if (g > cap) {
      data[i + 1] = cap;
    }
  }

  await sharp(Buffer.from(data), {
    raw: { width: W, height: H, channels: 4 },
  })
    .png()
    .toFile(file);

  const transparentPct = ((transparent / (W * H)) * 100).toFixed(1);
  console.log(`${file}: ${transparentPct}% transparent`);
}

async function main() {
  const { help, paths, low, high } = parseArgs(process.argv.slice(2));

  if (help || paths.length === 0) {
    console.log(usage);
    return;
  }

  const files = await collectPngFiles(paths);
  if (files.length === 0) {
    console.log('No PNG files found.');
    return;
  }

  for (const file of files) {
    await chromaKeyFile(file, low, high);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
