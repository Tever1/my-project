import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const BG_DIR = path.join(process.cwd(), 'public', 'backgrounds');

/** GET /api/admin/backgrounds — list all background images */
export async function GET() {
  if (!fs.existsSync(BG_DIR)) return NextResponse.json({ files: [] });

  const files = fs.readdirSync(BG_DIR)
    .filter((f) => f.endsWith('.png'))
    .map((f) => {
      const stat = fs.statSync(path.join(BG_DIR, f));
      return {
        name: f.replace(/\.png$/, ''),
        filename: f,
        url: `/backgrounds/${f}`,
        sizeKb: Math.round(stat.size / 1024),
        createdAt: stat.birthtimeMs,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ files });
}

/** POST /api/admin/backgrounds  { action: 'delete', name: '...' } */
export async function POST(req: NextRequest) {
  const { action, name } = await req.json() as { action: string; name: string };

  if (action !== 'delete') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const filename = name.endsWith('.png') ? name : `${name}.png`;
  const filePath = path.join(BG_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  fs.unlinkSync(filePath);
  return NextResponse.json({ success: true });
}
