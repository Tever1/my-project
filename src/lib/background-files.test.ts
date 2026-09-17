import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, access, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { saveBackgroundPair } from './background-files';

async function fixture(run: (root: string, png: Buffer) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'background-pair-'));
  try {
    const png = await sharp({ create: { width: 64, height: 36, channels: 3, background: '#123456' } }).png().toBuffer();
    await run(root, png);
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('save produces byte-identical PNG source and same-size WebP runtime file', () => fixture(async (root, png) => {
  const saved = await saveBackgroundPair(root, 'marvel', 'test.png', png);
  assert.equal(saved.path, '/backgrounds/marvel/test.webp');
  assert.equal(saved.sourcePath, '/backgrounds/sources/marvel/test.png');
  assert.deepEqual(await readFile(path.join(root, 'public', saved.sourcePath)), png);
  const metadata = await sharp(await readFile(path.join(root, 'public', saved.path))).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 64); assert.equal(metadata.height, 36);
}));
test('existing source is preserved on duplicate save', () => fixture(async (root, png) => {
  const saved = await saveBackgroundPair(root, 'marvel', 'test', png);
  const before = await readFile(path.join(root, 'public', saved.path));
  await assert.rejects(saveBackgroundPair(root, 'marvel', 'test.webp', png), /уже существует/);
  assert.deepEqual(await readFile(path.join(root, 'public', saved.path)), before);
}));
test('WebP collision rolls back only the new PNG and preserves old WebP', () => fixture(async (root, png) => {
  const runtime = path.join(root, 'public', 'backgrounds', 'marvel');
  await mkdir(runtime, { recursive: true }); await writeFile(path.join(runtime, 'test.webp'), 'existing');
  await assert.rejects(saveBackgroundPair(root, 'marvel', 'test', png), /уже существует/);
  await assert.rejects(access(path.join(root, 'public', 'backgrounds', 'sources', 'marvel', 'test.png')));
  assert.equal(await readFile(path.join(runtime, 'test.webp'), 'utf8'), 'existing');
}));
test('invalid folder, invalid image and oversized dimensions fail before writes', () => fixture(async (root, png) => {
  await assert.rejects(saveBackgroundPair(root, '../escape', 'test', png));
  await assert.rejects(saveBackgroundPair(root, 'sources', 'test', png));
  await assert.rejects(saveBackgroundPair(root, 'marvel', 'test', Buffer.from('not PNG')));
  const large = await sharp({ create: { width: 4097, height: 1, channels: 3, background: '#123456' } }).png().toBuffer();
  await assert.rejects(saveBackgroundPair(root, 'marvel', 'test', large));
  await assert.rejects(access(path.join(root, 'public')));
}));
