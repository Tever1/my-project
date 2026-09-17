import { NextRequest, NextResponse } from 'next/server';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { withCodexAdmin } from '@/lib/admin-codex';
import { saveBackgroundPair } from '@/lib/background-files';

export const POST = withCodexAdmin(async (req: NextRequest) => {
  const { dataUrl, name, group = 'other' } = await req.json();
  if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(dataUrl)) return NextResponse.json({ error: 'Требуется PNG от генератора' }, { status: 400 });
  try {
    const saved = await saveBackgroundPair(process.cwd(), group, name, Buffer.from(dataUrl.split(',')[1], 'base64'));
    const log = { timestamp: new Date().toISOString(), file: saved.path, source: saved.sourcePath, savedVia: 'admin-dashboard' };
    let warning;
    try { await appendFile(path.join(process.cwd(), 'public', 'backgrounds', group, '.generation-log.jsonl'), `${JSON.stringify(log)}\n`); }
    catch { warning = 'Оба изображения сохранены, но журнал генерации не записан.'; }
    return NextResponse.json({ success: true, ...saved, warning });
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
}, 12_000_000);
