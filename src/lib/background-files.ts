import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export async function saveBackgroundPair(root: string, group: string, name: string, png: Buffer) {
  if (!/^[a-z0-9-]{1,100}$/.test(group) || group === 'sources') throw new Error('Некорректная папка темы');
  if (typeof name !== 'string' || name.length > 200) throw new Error('Некорректное имя');
  const slug = name.toLowerCase().replace(/\.(png|webp)$/i, '').replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('Название файла должно содержать латинские буквы или цифры');
  if (png.length > 8_000_000 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Некорректный или слишком большой PNG');
  const image = sharp(png, { limitInputPixels: 4096 * 4096 });
  const metadata = await image.metadata();
  if (metadata.format !== 'png' || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 || (metadata.pages ?? 1) > 1) throw new Error('Фон должен быть статичным PNG до 4096×4096');
  const webp = await image.webp({ quality: 80 }).toBuffer();
  const sourceDir = path.join(root, 'public', 'backgrounds', 'sources', group);
  const runtimeDir = path.join(root, 'public', 'backgrounds', group);
  await mkdir(sourceDir, { recursive: true }); await mkdir(runtimeDir, { recursive: true });
  const created: string[] = [];
  try {
    for (const [filename, buffer] of [[path.join(sourceDir, `${slug}.png`), png], [path.join(runtimeDir, `${slug}.webp`), webp]] as const) {
      await writeFile(filename, buffer, { flag: 'wx' }); created.push(filename);
    }
  } catch (error) {
    for (const filename of created) await unlink(filename);
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('PNG или WebP с таким именем уже существует. Укажите другое имя.');
    throw error;
  }
  return { filename: `${slug}.webp`, path: `/backgrounds/${group}/${slug}.webp`, sourcePath: `/backgrounds/sources/${group}/${slug}.png` };
}
