import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const backgroundsDir = path.join(rootDir, 'public', 'backgrounds');
const lqipPath = path.join(backgroundsDir, 'lqip.json');

const WEBP_QUALITY = 80;
const LQIP_WIDTH = 16;

async function main() {
  const entries = await fs.readdir(backgroundsDir);
  const pngFiles = entries
    .filter((entry) => entry.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b));

  if (pngFiles.length === 0) {
    console.log('No PNG backgrounds found.');
    return;
  }

  const lqip = {};

  for (const fileName of pngFiles) {
    const inputPath = path.join(backgroundsDir, fileName);
    const slug = path.basename(fileName, '.png');
    const outputPath = path.join(backgroundsDir, `${slug}.webp`);

    await sharp(inputPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);

    const placeholderBuffer = await sharp(inputPath)
      .resize({ width: LQIP_WIDTH, withoutEnlargement: true })
      .blur()
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    lqip[slug] = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`;

    const [inputStat, outputStat] = await Promise.all([
      fs.stat(inputPath),
      fs.stat(outputPath),
    ]);

    const inputKb = Math.round(inputStat.size / 1024);
    const outputKb = Math.round(outputStat.size / 1024);
    console.log(`${fileName} -> ${slug}.webp (${inputKb} KB -> ${outputKb} KB)`);
  }

  await fs.writeFile(lqipPath, `${JSON.stringify(lqip, null, 2)}\n`);
  console.log(`Wrote ${path.relative(rootDir, lqipPath)} with ${pngFiles.length} placeholders.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
