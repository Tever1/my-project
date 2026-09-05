import { stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DEFAULT_TOL = 36;

const usage = `Usage:
  node scripts/strip-bg-cream.mjs [--tol N] <file-or-directory> [...]

Options:
  --tol N    Color tolerance for region grow (default: ${DEFAULT_TOL})
  --help     Show this help

Examples:
  node scripts/strip-bg-cream.mjs public/icons/crocodile
  node scripts/strip-bg-cream.mjs --tol 42 public/icons/crocodile/icon.png
`;

function parseArgs(argv) {
  const paths = [];
  let tol = DEFAULT_TOL;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      return { help: true, paths, tol };
    }

    if (arg === '--tol') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --tol');
      }

      tol = Number(value);
      if (!Number.isFinite(tol) || tol <= 0) {
        throw new Error('--tol must be a positive number');
      }

      i += 1;
      continue;
    }

    paths.push(arg);
  }

  return { help: false, paths, tol };
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

async function stripCreamBackground(file, tol) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;
  const ch = info.channels;
  const idx = (x, y) => (y * W + x) * ch;

  const corners = [
    [1, 1],
    [W - 2, 1],
    [1, H - 2],
    [W - 2, H - 2],
  ];

  let sr = 0;
  let sg = 0;
  let sb = 0;

  for (const [x, y] of corners) {
    const i = idx(x, y);
    sr += data[i];
    sg += data[i + 1];
    sb += data[i + 2];
  }

  sr /= 4;
  sg /= 4;
  sb /= 4;

  const dist2 = (r, g, b) => {
    const dr = r - sr;
    const dg = g - sg;
    const db = b - sb;
    return dr * dr + dg * dg + db * db;
  };
  const T2 = tol * tol;

  const visited = new Uint8Array(W * H);
  const stack = [];

  for (const [x, y] of corners) {
    const k = y * W + x;
    if (!visited[k]) {
      visited[k] = 1;
      stack.push(x, y);
    }
  }

  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    const i = idx(x, y);

    if (dist2(data[i], data[i + 1], data[i + 2]) > T2) {
      continue;
    }

    data[i + 3] = 0;

    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) {
        continue;
      }

      const k = ny * W + nx;
      if (!visited[k]) {
        visited[k] = 1;
        stack.push(nx, ny);
      }
    }
  }

  const copy = Uint8Array.from(data);

  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = idx(x, y);
      if (copy[i + 3] === 0) {
        continue;
      }

      let near = false;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (copy[idx(nx, ny) + 3] === 0) {
          near = true;
          break;
        }
      }

      if (near) {
        const d = Math.sqrt(dist2(copy[i], copy[i + 1], copy[i + 2]));
        if (d < tol * 1.6) {
          data[i + 3] = Math.min(255, Math.round(255 * (d / (tol * 1.6))));
        }
      }
    }
  }

  let transparent = 0;
  for (let i = 3; i < data.length; i += ch) {
    if (data[i] === 0) {
      transparent += 1;
    }
  }

  await sharp(Buffer.from(data), {
    raw: { width: W, height: H, channels: 4 },
  })
    .png()
    .toFile(file);

  const transparentPct = ((transparent / (W * H)) * 100).toFixed(1);
  console.log(`${file}: done (${transparentPct}% transparent)`);
}

async function main() {
  const { help, paths, tol } = parseArgs(process.argv.slice(2));

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
    await stripCreamBackground(file, tol);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
