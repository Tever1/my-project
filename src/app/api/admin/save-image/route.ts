import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function POST(req: NextRequest) {
  const { dataUrl, name } = await req.json() as { dataUrl: string; name: string };

  if (!name || !dataUrl) {
    return NextResponse.json({ error: 'name and dataUrl are required' }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-|-$/g, '');
  const filename = slug.endsWith('.png') ? slug : `${slug}.png`;
  const outputDir = path.join(process.cwd(), 'public', 'backgrounds');
  const outputPath = path.join(outputDir, filename);

  if (fs.existsSync(outputPath)) {
    return NextResponse.json({ error: `Файл уже существует: ${filename}. Укажи другое имя.` }, { status: 400 });
  }

  const base64 = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  // Append to generation log
  const logEntry = {
    timestamp: new Date().toISOString(),
    name: slug,
    file: `public/backgrounds/${filename}`,
    savedVia: 'admin-dashboard',
  };
  const logPath = path.join(outputDir, '.generation-log.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');

  return NextResponse.json({ success: true, path: `/backgrounds/${filename}`, filename });
}
