import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { withCodexAdmin } from '@/lib/admin-codex';
import { contentStore } from '@/lib/content/server';
import { createHash } from 'node:crypto';

const BG_DIR = path.join(process.cwd(), 'public', 'backgrounds');

/** GET /api/admin/backgrounds — list all background images */
export async function GET() {
  if (!fs.existsSync(BG_DIR)) return NextResponse.json({ files: [] });
  const paths: string[] = [];
  function scan(directory: string, prefix = '', depth = 0) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory() && entry.name !== 'sources' && depth < 3) scan(path.join(directory, entry.name), `${relative}/`, depth + 1);
      else if (entry.isFile() && /\.webp$/i.test(entry.name)) paths.push(relative);
    }
  }
  scan(BG_DIR);
  const files = paths.filter(f => f.includes('/') || !paths.some(other => other.includes('/') && other.split('/').pop() === f))
    .map((f) => {
      const stat = fs.statSync(path.join(BG_DIR, f));
      return {
        name: f,
        filename: f,
        url: `/backgrounds/${f}`,
        sha256: createHash('sha256').update(fs.readFileSync(path.join(BG_DIR, f))).digest('hex'),
        group: f.includes('/') ? f.split('/')[0] : f.startsWith('marvel') ? 'marvel' : f.startsWith('harry-potter') ? 'harry-potter' : 'other',
        sizeKb: Math.round(stat.size / 1024),
        createdAt: stat.birthtimeMs,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ files });
}

/** POST /api/admin/backgrounds  { action: 'delete', name: '...' } */
export const POST = withCodexAdmin(async (req: NextRequest) => {
  const { action, name } = await req.json() as { action: string; name: string };

  if (action !== 'delete') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  if (typeof name !== 'string' || name.includes('..') || !/^[a-zA-Z0-9_/-]+(?:\.(?:png|webp|jpg|jpeg))?$/.test(name)) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  const filename = /\.(png|webp|jpe?g)$/i.test(name) ? name : `${name}.png`;
  const filePath = path.join(BG_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  if (!fs.realpathSync(filePath).startsWith(`${fs.realpathSync(BG_DIR)}${path.sep}`)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  const published = await contentStore.published(); const draft = await contentStore.draft();
  if ([...published.catalog.quizzes, ...draft.catalog.quizzes].some(quiz => quiz.backgroundUrl === `/backgrounds/${filename}`)) return NextResponse.json({ error: 'Этот фон выбран в квизе. Сначала смените фон и сохраните изменения.' }, { status: 409 });

  fs.unlinkSync(filePath);
  return NextResponse.json({ success: true });
});
